import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import { prisma, isOverlapViolation } from '@/lib/prisma';
import {
  getAvailableSlots,
  validateSlot,
  generateConfirmationCode,
} from '@/lib/availability';
import { toE164, sendBookingConfirmation, scheduleReminder24h } from '@/lib/sms';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BookingInput = z.object({
  serviceId: z.string().cuid(),
  barberId: z.string().cuid(),
  startsAt: z.string().datetime({ offset: true }),
  client: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().max(60).optional(),
    phone: z.string().trim().min(10).max(20),
    email: z.string().email().optional(),
  }),
  // Consent must be an affirmative, explicit act. A default-true checkbox is
  // not consent under CASL.
  smsOptIn: z.literal(true, {
    errorMap: () => ({ message: 'SMS consent is required to book' }),
  }),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

const REJECTION_COPY: Record<string, string> = {
  PAST: 'That time has already passed.',
  TOO_SOON: 'Please book at least an hour ahead.',
  TOO_FAR: 'We only take bookings 90 days out.',
  BAD_GRANULARITY: 'Appointments start on the quarter hour.',
  OUTSIDE_HOURS: 'That barber is not working then.',
  TIME_OFF: 'That barber is away then.',
};

function fail(status: number, code: string, message: string, extra?: object) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

const publicShape = {
  id: true,
  confirmationCode: true,
  startsAt: true,
  endsAt: true,
  status: true,
  priceCents: true,
  barber: { select: { displayName: true, slug: true } },
  service: { select: { name: true, slug: true } },
} as const;

export async function POST(request: Request) {
  // 1 — Throttle before touching the database.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!(await rateLimit(`book:${ip}`, { limit: 8, windowSec: 300 }))) {
    return fail(429, 'RATE_LIMITED', 'Too many booking attempts. Try again shortly.');
  }

  const parsed = BookingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail(422, 'INVALID_INPUT', 'Check the highlighted fields.', {
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const input = parsed.data;

  const phone = toE164(input.client.phone);
  if (!phone) return fail(422, 'INVALID_PHONE', 'Enter a valid Canadian mobile number.');

  // 2 — Replay protection. A double-tapped Confirm returns the original booking.
  if (input.idempotencyKey) {
    const replay = await prisma.appointment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: publicShape,
    });
    if (replay) return NextResponse.json({ appointment: replay }, { status: 200 });
  }

  // 3 — Resolve the catalogue server-side. Price and duration NEVER come from
  //     the client payload.
  const [service, barber] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.serviceId, isActive: true } }),
    prisma.barber.findFirst({
      where: { id: input.barberId, isActive: true },
      include: { services: { where: { serviceId: input.serviceId } } },
    }),
  ]);
  if (!service) return fail(404, 'SERVICE_NOT_FOUND', 'That service is unavailable.');
  if (!barber) return fail(404, 'BARBER_NOT_FOUND', 'That barber is unavailable.');

  const offering = barber.services[0];
  if (!offering) {
    return fail(409, 'SERVICE_NOT_OFFERED', `${barber.displayName} does not offer that service.`);
  }

  const durationMin = offering.durationMin ?? service.durationMin;
  const priceCents = offering.priceCents ?? service.priceCents;
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

  // 4 — Business-rule validation (hours, lead time, time off).
  const rejection = await validateSlot({ barberId: barber.id, startsAt, endsAt });
  if (rejection) {
    return fail(409, rejection, REJECTION_COPY[rejection] ?? 'That slot is not bookable.');
  }

  // 5 — Commit. The client record and the appointment move together, so a
  //     rejected booking never leaves an orphaned contact behind.
  let appointment;
  try {
    appointment = await prisma.$transaction(async (tx) => {
      const client = await tx.user.upsert({
        where: { phone },
        create: {
          phone,
          firstName: input.client.firstName,
          lastName: input.client.lastName,
          email: input.client.email,
          smsOptIn: true,
          smsOptInAt: new Date(),
        },
        update: {
          firstName: input.client.firstName,
          lastName: input.client.lastName ?? undefined,
          email: input.client.email ?? undefined,
          smsOptIn: true,
          smsOptInAt: new Date(),
          smsOptOutAt: null,
        },
      });

      return tx.appointment.create({
        data: {
          clientId: client.id,
          barberId: barber.id,
          serviceId: service.id,
          startsAt,
          endsAt,
          durationMin,
          priceCents,
          notes: input.notes,
          status: AppointmentStatus.CONFIRMED,
          confirmationCode: generateConfirmationCode(),
          idempotencyKey: input.idempotencyKey,
        },
        select: publicShape,
      });
    });
  } catch (error) {
    // 6 — The race we cannot win in JavaScript, won in Postgres. Two requests
    //     for the same chair at the same second: one commits, one lands here.
    if (isOverlapViolation(error)) {
      const alternatives = await getAvailableSlots({
        barberId: barber.id,
        serviceId: service.id,
        day: startsAt,
      });
      return fail(409, 'SLOT_TAKEN', 'That chair was just booked. Here are the closest times.', {
        alternatives: alternatives.slice(0, 6).map((s) => s.startsAt.toISOString()),
      });
    }
    console.error('[appointments] create failed', error);
    return fail(500, 'BOOKING_FAILED', 'We could not complete that booking.');
  }

  // 7 — Messaging runs AFTER the response flushes. A Twilio outage must never
  //     cost the shop a booking, and the client must never wait on it.
  after(async () => {
    await sendBookingConfirmation(appointment.id);
    await scheduleReminder24h(appointment.id);
  });

  return NextResponse.json({ appointment }, { status: 201 });
}

/** GET /api/appointments?barberId=…&serviceId=…&day=2026-09-24 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = z
    .object({
      barberId: z.string().cuid(),
      serviceId: z.string().cuid(),
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse(Object.fromEntries(params));

  if (!query.success) return fail(422, 'INVALID_QUERY', 'barberId, serviceId and day are required.');

  const slots = await getAvailableSlots({
    barberId: query.data.barberId,
    serviceId: query.data.serviceId,
    day: new Date(`${query.data.day}T12:00:00-06:00`),
  });

  return NextResponse.json(
    { slots: slots.map((s) => s.startsAt.toISOString()) },
    { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } },
  );
}
