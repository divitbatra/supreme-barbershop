import 'server-only';
import twilio from 'twilio';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { NotificationKind, NotificationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const SHOP_TZ = 'America/Edmonton';
const SHOP_NAME = 'Supreme Barbershop';
const SHOP_ADDRESS = '7906A 104 St NW';

/** Twilio only accepts scheduled sends between 15 minutes and 35 days out. */
const SCHEDULE_MIN_MS = 15 * 60 * 1000;
const SCHEDULE_MAX_MS = 35 * 24 * 60 * 60 * 1000;

/** CRTC/CASL courtesy window — no commercial SMS outside 08:00–21:00 local. */
const QUIET_START_HOUR = 21;
const QUIET_END_HOUR = 8;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let cached: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (cached) return cached;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not configured');
  }
  cached = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return cached;
}

function messagingServiceSid(): string {
  const sid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  // Scheduled sends REQUIRE a Messaging Service; a bare `from` number cannot
  // schedule. This is the single most common integration mistake.
  if (!sid) throw new Error('TWILIO_MESSAGING_SERVICE_SID is required');
  return sid;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Normalise Canadian input to E.164. Accepts "780 555 1234",
 * "(780) 555-1234", "1-780-555-1234", "+17805551234".
 */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.startsWith('+') && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** "Thu, Sep 24 at 2:30 PM" in shop-local time, regardless of server TZ. */
export function formatSlot(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(',', '')
    .replace(/(\d{1,2}:\d{2})/, 'at $1');
}

function shopHour(date: Date): number {
  return toZonedTime(date, SHOP_TZ).getHours();
}

/** Nudge a send time out of the overnight quiet window to 09:00 local. */
function respectQuietHours(sendAt: Date): Date {
  const hour = shopHour(sendAt);
  if (hour < QUIET_START_HOUR && hour >= QUIET_END_HOUR) return sendAt;

  const local = toZonedTime(sendAt, SHOP_TZ);
  if (hour >= QUIET_START_HOUR) local.setDate(local.getDate() + 1);
  local.setHours(9, 0, 0, 0);
  return fromZonedTime(local, SHOP_TZ);
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

type SendArgs = {
  appointmentId: string;
  kind: NotificationKind;
  to: string;
  body: string;
  /** Omit to send immediately. */
  sendAt?: Date;
};

/**
 * Writes an audit row FIRST, then hands off to Twilio. The
 * `@@unique([appointmentId, kind])` index means a retry (or a double-fired
 * webhook) can never produce a second text to the client.
 */
async function send({ appointmentId, kind, to, body, sendAt }: SendArgs) {
  const existing = await prisma.notification.findUnique({
    where: { appointmentId_kind: { appointmentId, kind } },
  });
  if (existing && existing.status !== NotificationStatus.FAILED) return existing;

  const record = await prisma.notification.upsert({
    where: { appointmentId_kind: { appointmentId, kind } },
    create: { appointmentId, kind, toPhone: to, body, scheduledAt: sendAt ?? null },
    update: { toPhone: to, body, scheduledAt: sendAt ?? null, error: null },
  });

  try {
    const message = await getClient().messages.create({
      messagingServiceSid: messagingServiceSid(),
      to,
      body,
      ...(sendAt ? { scheduleType: 'fixed' as const, sendAt } : {}),
      statusCallback: process.env.TWILIO_STATUS_WEBHOOK_URL,
    });

    return await prisma.notification.update({
      where: { id: record.id },
      data: {
        providerSid: message.sid,
        status: sendAt ? NotificationStatus.SCHEDULED : NotificationStatus.SENT,
        sentAt: sendAt ? null : new Date(),
      },
    });
  } catch (error) {
    // A failed text must never orphan or roll back a real booking.
    await prisma.notification.update({
      where: { id: record.id },
      data: {
        status: NotificationStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    console.error(`[sms] ${kind} failed for appointment ${appointmentId}`, error);
    return null;
  }
}

async function loadAppointment(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { client: true, service: true, barber: true },
  });
}

/** Consent gate. No opt-in, no message — full stop. */
function canText(client: { smsOptIn: boolean; smsOptOutAt: Date | null }): boolean {
  return client.smsOptIn && client.smsOptOutAt === null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendBookingConfirmation(appointmentId: string) {
  const appt = await loadAppointment(appointmentId);
  if (!appt || !canText(appt.client)) return null;

  const body =
    `${SHOP_NAME}: You're booked, ${appt.client.firstName}. ` +
    `${appt.service.name} with ${appt.barber.displayName} ` +
    `${formatSlot(appt.startsAt)}. ${SHOP_ADDRESS}. ` +
    `Code ${appt.confirmationCode}. ` +
    `Need to change it? ${process.env.NEXT_PUBLIC_SITE_URL}/a/${appt.confirmationCode} ` +
    `Reply STOP to opt out.`;

  return send({
    appointmentId,
    kind: NotificationKind.CONFIRMATION,
    to: appt.client.phone,
    body,
  });
}

/**
 * Hands the 24-hour reminder to Twilio's scheduler at booking time, so there
 * is no cron job, no queue, and no worker to keep alive. Bookings made more
 * than 35 days out fall back to the nightly sweeper (see /api/cron/reminders).
 */
export async function scheduleReminder24h(appointmentId: string) {
  const appt = await loadAppointment(appointmentId);
  if (!appt || !canText(appt.client)) return null;

  const sendAt = respectQuietHours(new Date(appt.startsAt.getTime() - 24 * 60 * 60 * 1000));
  const lead = sendAt.getTime() - Date.now();

  // Booked inside 24h: the confirmation already served as the reminder.
  if (lead < SCHEDULE_MIN_MS) return null;
  if (lead > SCHEDULE_MAX_MS) return null;

  const body =
    `${SHOP_NAME}: Reminder — ${appt.service.name} with ${appt.barber.displayName} ` +
    `tomorrow ${formatSlot(appt.startsAt)}. ${SHOP_ADDRESS}. ` +
    `Reply C to cancel. Reply STOP to opt out.`;

  return send({
    appointmentId,
    kind: NotificationKind.REMINDER_24H,
    to: appt.client.phone,
    body,
    sendAt,
  });
}

/**
 * Cancelling or rescheduling must also cancel the queued reminder, otherwise
 * the client gets a text about an appointment that no longer exists.
 */
export async function cancelScheduledReminder(appointmentId: string) {
  const record = await prisma.notification.findUnique({
    where: {
      appointmentId_kind: { appointmentId, kind: NotificationKind.REMINDER_24H },
    },
  });
  if (!record?.providerSid || record.status !== NotificationStatus.SCHEDULED) return;

  try {
    await getClient().messages(record.providerSid).update({ status: 'canceled' });
  } catch (error) {
    console.error('[sms] failed to cancel scheduled reminder', error);
  }

  await prisma.notification.update({
    where: { id: record.id },
    data: { status: NotificationStatus.CANCELED },
  });
}

/** Called from the inbound webhook when a client replies STOP/UNSTOP. */
export async function recordOptOut(phone: string, optedOut: boolean) {
  const e164 = toE164(phone);
  if (!e164) return;
  await prisma.user.update({
    where: { phone: e164 },
    data: optedOut
      ? { smsOptOutAt: new Date(), smsOptIn: false }
      : { smsOptOutAt: null, smsOptIn: true, smsOptInAt: new Date() },
  });
}
