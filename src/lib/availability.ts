import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { AppointmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const SHOP_TZ = 'America/Edmonton';
export const SLOT_GRANULARITY_MIN = 15;
export const MIN_LEAD_MINUTES = 60;
export const MAX_ADVANCE_DAYS = 90;

const MIN = 60 * 1000;

export type Slot = { startsAt: Date; endsAt: Date };

/** Minutes past shop-local midnight for an instant. */
function localMinutes(date: Date): number {
  const local = toZonedTime(date, SHOP_TZ);
  return local.getHours() * 60 + local.getMinutes();
}

function localWeekday(date: Date): number {
  return toZonedTime(date, SHOP_TZ).getDay();
}

/** Shop-local midnight for the calendar day containing `date`, as UTC. */
function startOfShopDay(date: Date): Date {
  const local = toZonedTime(date, SHOP_TZ);
  local.setHours(0, 0, 0, 0);
  return fromZonedTime(local, SHOP_TZ);
}

const overlaps = (a: Slot, b: Slot) => a.startsAt < b.endsAt && a.endsAt > b.startsAt;

/**
 * Every open start time for one barber on one day.
 *
 * A slot survives only if it fits inside a shift, clears the clean-down
 * buffer on both sides of every existing booking, dodges time off, and
 * respects the minimum lead time.
 */
export async function getAvailableSlots(params: {
  barberId: string;
  serviceId: string;
  day: Date;
}): Promise<Slot[]> {
  const { barberId, serviceId, day } = params;

  const [service, override, shifts] = await Promise.all([
    prisma.service.findUniqueOrThrow({ where: { id: serviceId } }),
    prisma.barberService.findUnique({
      where: { barberId_serviceId: { barberId, serviceId } },
    }),
    prisma.workingHours.findMany({ where: { barberId, weekday: localWeekday(day) } }),
  ]);

  const durationMin = override?.durationMin ?? service.durationMin;
  const bufferMin = service.bufferMin;
  if (shifts.length === 0) return [];

  const dayStart = startOfShopDay(day);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * MIN);

  const [booked, off] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: { barberId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  // Pad each booking by the buffer so back-to-back chairs stay realistic.
  const blocked: Slot[] = [
    ...booked.map((b) => ({
      startsAt: new Date(b.startsAt.getTime() - bufferMin * MIN),
      endsAt: new Date(b.endsAt.getTime() + bufferMin * MIN),
    })),
    ...off,
  ];

  const earliest = new Date(Date.now() + MIN_LEAD_MINUTES * MIN);
  const slots: Slot[] = [];

  for (const shift of shifts) {
    for (
      let m = shift.openMinute;
      m + durationMin <= shift.closeMinute;
      m += SLOT_GRANULARITY_MIN
    ) {
      const startsAt = new Date(dayStart.getTime() + m * MIN);
      const candidate = { startsAt, endsAt: new Date(startsAt.getTime() + durationMin * MIN) };
      if (startsAt < earliest) continue;
      if (blocked.some((b) => overlaps(candidate, b))) continue;
      slots.push(candidate);
    }
  }

  return slots;
}

export type SlotRejection =
  | 'PAST'
  | 'TOO_SOON'
  | 'TOO_FAR'
  | 'BAD_GRANULARITY'
  | 'OUTSIDE_HOURS'
  | 'TIME_OFF';

/**
 * Server-side re-validation of a requested time. The client UI only ever
 * offers legal slots, but the API must assume the client is hostile.
 */
export async function validateSlot(params: {
  barberId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<SlotRejection | null> {
  const { barberId, startsAt, endsAt } = params;
  const now = Date.now();

  if (startsAt.getTime() <= now) return 'PAST';
  if (startsAt.getTime() < now + MIN_LEAD_MINUTES * MIN) return 'TOO_SOON';
  if (startsAt.getTime() > now + MAX_ADVANCE_DAYS * 24 * 60 * MIN) return 'TOO_FAR';
  if (localMinutes(startsAt) % SLOT_GRANULARITY_MIN !== 0) return 'BAD_GRANULARITY';

  const shifts = await prisma.workingHours.findMany({
    where: { barberId, weekday: localWeekday(startsAt) },
  });
  const open = localMinutes(startsAt);
  const close = open + Math.round((endsAt.getTime() - startsAt.getTime()) / MIN);
  if (!shifts.some((s) => open >= s.openMinute && close <= s.closeMinute)) {
    return 'OUTSIDE_HOURS';
  }

  const conflict = await prisma.timeOff.findFirst({
    where: { barberId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  });
  return conflict ? 'TIME_OFF' : null;
}

const ALPHABET = '23456789ACDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I — read aloud over the phone

/** Short, unambiguous code the client can quote at the chair. */
export function generateConfirmationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `SB-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}
