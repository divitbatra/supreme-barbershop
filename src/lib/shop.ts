import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * Shop facts the browser is allowed to know.
 *
 * `src/lib/availability.ts` remains the authority on what is bookable, but it
 * imports Prisma and can therefore never reach the client. The constants below
 * mirror it exactly. The client uses them only to *draw* a grid — every slot is
 * still re-validated server-side, so a stale copy here can never create a
 * booking that should not exist.
 */

export const SHOP_TZ = 'America/Edmonton';
export const SLOT_GRANULARITY_MIN = 15;
export const MIN_LEAD_MINUTES = 60;
export const MAX_ADVANCE_DAYS = 90;

export const SHOP_NAME = 'Supreme Barbershop';
export const SHOP_STREET = '7906A 104 Street NW';
export const SHOP_CITY = 'Edmonton, Alberta';

/** Minutes past shop-local midnight. `weekday` 0 = Sunday, matching Date#getDay. */
export const SHOP_HOURS = [
  { weekday: 0, label: 'Sunday', openMinute: 11 * 60, closeMinute: 17 * 60 },
  { weekday: 1, label: 'Monday', openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 2, label: 'Tuesday', openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 3, label: 'Wednesday', openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 4, label: 'Thursday', openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 5, label: 'Friday', openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 6, label: 'Saturday', openMinute: 9 * 60, closeMinute: 19 * 60 },
] as const;

/** A calendar date in the shop's timezone, `YYYY-MM-DD`. Never an instant. */
export type ShopDay = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's calendar date at the shop, whatever timezone the visitor is in. */
export function todayAtShop(now: Date = new Date()): ShopDay {
  return formatInTimeZone(now, SHOP_TZ, 'yyyy-MM-dd');
}

/**
 * Weekday for a shop day. Read through UTC so the visitor's own offset can
 * never shift the answer across a date boundary.
 */
export function weekdayOf(day: ShopDay): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addShopDays(day: ShopDay, amount: number): ShopDay {
  const [y, m, d] = day.split('-').map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d + amount));
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
}

/** The instant at which `minute` past shop-local midnight on `day` occurs. */
export function shopInstant(day: ShopDay, minute: number): Date {
  return fromZonedTime(`${day}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00`, SHOP_TZ);
}

/** Midday on a shop day — the safe instant to format a date label from. */
export function shopNoon(day: ShopDay): Date {
  return shopInstant(day, 12 * 60);
}

export function upcomingShopDays(count: number, now: Date = new Date()): ShopDay[] {
  const first = todayAtShop(now);
  return Array.from({ length: count }, (_, i) => addShopDays(first, i));
}

export const hoursFor = (weekday: number) => SHOP_HOURS.find((h) => h.weekday === weekday);

/**
 * Every start time the shift could theoretically hold for a service of this
 * length — the same walk `getAvailableSlots` does, minus the database. What the
 * API omits from this list is what is unavailable.
 */
export function buildDayGrid(day: ShopDay, durationMin: number): Date[] {
  const shift = hoursFor(weekdayOf(day));
  if (!shift) return [];

  const grid: Date[] = [];
  for (
    let minute = shift.openMinute;
    minute + durationMin <= shift.closeMinute;
    minute += SLOT_GRANULARITY_MIN
  ) {
    grid.push(shopInstant(day, minute));
  }
  return grid;
}

/** The earliest instant the shop will accept a booking for. */
export const earliestBookable = (now: Date = new Date()) =>
  new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000);
