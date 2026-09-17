import { formatDateLong, formatSlotLong, formatTime } from '@/lib/format';
import { MAX_ADVANCE_DAYS, addShopDays, earliestBookable, shopNoon, todayAtShop } from '@/lib/shop';

/**
 * Every failure `POST /api/appointments` can produce, translated into copy a
 * person can act on.
 *
 * "Something went wrong" is banned here. A booking error must always say what
 * happened, whether the chair was reserved, and what to do next — the three
 * things someone standing on a sidewalk with a phone actually needs.
 */

export type FieldKey = 'firstName' | 'lastName' | 'phone' | 'email' | 'notes' | 'smsOptIn';

export type BookingFailure = {
  code: string;
  title: string;
  detail: string;
  /** The step the person has to return to in order to fix it. */
  step: 1 | 2 | 3 | 4;
  fieldErrors?: Partial<Record<FieldKey, string>>;
  /** ISO start times returned by a 409 SLOT_TAKEN, offered as one-tap swaps. */
  alternatives?: string[];
  /** True when pressing Confirm again is a sensible next move. */
  retryable: boolean;
  /** True when the day's slot grid is now known to be stale. */
  refreshSlots: boolean;
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    issues?: Record<string, string[] | undefined>;
    alternatives?: string[];
  };
};

export type FailureContext = {
  barberName: string;
  serviceName: string;
  /** The instant the person tried to book, if one was selected. */
  startsAt: Date | null;
};

const ZOD_FIELD_TO_STEP: Record<string, 1 | 2 | 3 | 4> = {
  serviceId: 1,
  barberId: 2,
  startsAt: 3,
  client: 4,
  smsOptIn: 4,
  notes: 4,
  idempotencyKey: 4,
};

function invalidInput(body: ApiErrorBody): BookingFailure {
  const issues = body.error?.issues ?? {};
  const keys = Object.keys(issues).filter((k) => (issues[k] ?? []).length > 0);
  const step = keys.map((k) => ZOD_FIELD_TO_STEP[k]).find(Boolean) ?? 4;

  const fieldErrors: Partial<Record<FieldKey, string>> = {};
  if (issues.smsOptIn?.length) fieldErrors.smsOptIn = 'We need your permission before we can text you.';
  if (issues.notes?.length) fieldErrors.notes = 'Keep the note under 500 characters.';
  // Zod flattens nested paths onto their first segment, so everything about the
  // person lands under `client`. Surface those messages verbatim rather than
  // guessing which input they belong to.
  const clientIssues = issues.client ?? [];

  return {
    code: 'INVALID_INPUT',
    title: 'A couple of details need a second look',
    detail: clientIssues.length
      ? `The shop's system rejected: ${clientIssues.join('; ')}. Nothing was booked.`
      : 'The booking form was rejected before it reached the schedule. Nothing was booked — correct the highlighted fields and press Confirm again.',
    step,
    fieldErrors,
    retryable: true,
    refreshSlots: false,
  };
}

export function interpretFailure(
  status: number,
  body: ApiErrorBody | null,
  ctx: FailureContext,
): BookingFailure {
  const code = body?.error?.code ?? `HTTP_${status}`;
  const when = ctx.startsAt ? formatSlotLong(ctx.startsAt) : 'that time';
  const clock = ctx.startsAt ? formatTime(ctx.startsAt) : 'that time';

  switch (code) {
    case 'RATE_LIMITED':
      return {
        code,
        title: 'Too many booking attempts from this connection',
        detail:
          'We cap this at eight tries every five minutes to keep the schedule honest. Nothing was booked and none of your details were lost — wait about five minutes and press Confirm again.',
        step: 4,
        retryable: true,
        refreshSlots: false,
      };

    case 'INVALID_INPUT':
      return invalidInput(body ?? {});

    case 'INVALID_PHONE':
      return {
        code,
        title: 'That phone number will not reach you',
        detail:
          'We text the confirmation and the day-before reminder, so the number has to be a real Canadian mobile. Ten digits is all we need.',
        step: 4,
        fieldErrors: { phone: 'Enter a 10-digit Canadian mobile number, like 780 555 1234.' },
        retryable: true,
        refreshSlots: false,
      };

    case 'SLOT_TAKEN':
      return {
        code,
        title: 'That chair was just booked',
        detail: `Someone confirmed ${clock} with ${ctx.barberName} moments before you did, so the chair is gone. Nothing was booked under your name. The closest open times are below — one tap moves you.`,
        step: 3,
        alternatives: body?.error?.alternatives ?? [],
        retryable: false,
        refreshSlots: true,
      };

    case 'OUTSIDE_HOURS':
      return {
        code,
        title: `${ctx.barberName} is not working then`,
        detail: `${ctx.barberName}'s chair is not open for ${when}. The grid has been refreshed with the times that are actually on the books.`,
        step: 3,
        retryable: false,
        refreshSlots: true,
      };

    case 'TIME_OFF':
      return {
        code,
        title: `${ctx.barberName} is away then`,
        detail: `${ctx.barberName} has time off covering ${when}. Pick another time below, or step back and book with the other barber.`,
        step: 3,
        retryable: false,
        refreshSlots: true,
      };

    case 'TOO_SOON':
      return {
        code,
        title: 'That is too close to now',
        detail: `We need an hour's notice to have the chair, the towels and the barber ready. The earliest we can take you is ${formatTime(earliestBookable())}.`,
        step: 3,
        retryable: false,
        refreshSlots: true,
      };

    case 'TOO_FAR':
      return {
        code,
        title: 'The calendar does not reach that far',
        detail: `We open bookings ${MAX_ADVANCE_DAYS} days ahead, so the last date you can pick right now is ${formatDateLong(
          shopNoon(addShopDays(todayAtShop(), MAX_ADVANCE_DAYS)),
        )}.`,
        step: 3,
        retryable: false,
        refreshSlots: false,
      };

    case 'PAST':
      return {
        code,
        title: 'That time has already passed',
        detail: `${when} is behind us now — the page had been open a while. The grid below has been refreshed with current times.`,
        step: 3,
        retryable: false,
        refreshSlots: true,
      };

    case 'BAD_GRANULARITY':
      return {
        code,
        title: 'Appointments start on the quarter hour',
        detail: `${clock} is not on the 15-minute grid the shop runs on. Pick a time from the grid below.`,
        step: 3,
        retryable: false,
        refreshSlots: true,
      };

    case 'SERVICE_NOT_OFFERED':
      return {
        code,
        title: `${ctx.barberName} does not do ${ctx.serviceName}`,
        detail: `The pairing you picked is not on the menu. Step back and choose the other barber, or change the service.`,
        step: 2,
        retryable: false,
        refreshSlots: false,
      };

    case 'SERVICE_NOT_FOUND':
      return {
        code,
        title: `${ctx.serviceName} is no longer on the menu`,
        detail:
          'It was retired while this page was open. Reload to pull the current menu — nothing was booked.',
        step: 1,
        retryable: false,
        refreshSlots: false,
      };

    case 'BARBER_NOT_FOUND':
      return {
        code,
        title: `${ctx.barberName} is not taking bookings`,
        detail:
          'That chair came off the schedule while this page was open. Reload to see who is available — nothing was booked.',
        step: 2,
        retryable: false,
        refreshSlots: false,
      };

    case 'BOOKING_FAILED':
      return {
        code,
        title: 'The booking did not go through on our end',
        detail:
          'The shop\u2019s system failed while writing the appointment, so the chair was not reserved. Your details are still here — press Confirm to try again.',
        step: 4,
        retryable: true,
        refreshSlots: true,
      };

    case 'NETWORK':
      return {
        code,
        title: 'We could not reach the booking system',
        detail:
          'The request never left your device, so nothing was booked. Check your connection and press Confirm again.',
        step: 4,
        retryable: true,
        refreshSlots: false,
      };

    default:
      return {
        code,
        title: 'The booking system answered in a way we did not expect',
        detail: `It returned HTTP ${status}${
          body?.error?.code ? ` (${body.error.code})` : ''
        }. Nothing was booked. Press Confirm to try again — if it happens twice, the schedule is safest confirmed in person at the shop.`,
        step: 4,
        retryable: true,
        refreshSlots: true,
      };
  }
}

/** The `GET` side has exactly one failure the UI can explain. */
export function describeSlotLoadFailure(status: number | null, code?: string): string {
  if (status === null) {
    return 'We could not reach the schedule — that request never left your device. Check your connection and try again.';
  }
  if (code === 'INVALID_QUERY') {
    return 'The schedule rejected that combination of barber, service and date. Step back and reselect the service.';
  }
  return `The schedule answered with HTTP ${status}, so we cannot show live times for this day. Try again in a moment.`;
}
