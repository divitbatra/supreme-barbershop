import { SHOP_TZ, shopNoon, type ShopDay } from '@/lib/shop';

/**
 * Every formatter is constructed once. `Intl` objects are expensive to build
 * and the slot grid renders dozens of times per session.
 *
 * Times are pinned to `America/Edmonton` on purpose: a client in Toronto must
 * read the same 2:30 PM the barber has written in the book.
 */

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

/**
 * Money is integer cents everywhere else in this codebase — schema, API,
 * snapshots. This division is the single display-time conversion. 2150 -> "$21.50".
 */
export function formatPrice(cents: number): string {
  return CAD.format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

const TIME = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const WEEKDAY_SHORT = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ, weekday: 'short' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ, month: 'short' });
const DAY_NUMBER = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ, day: 'numeric' });

const DATE_LONG = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_TZ,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** "2:30 p.m." — shop-local, always. */
export const formatTime = (date: Date) => TIME.format(date);

/** "Thursday, September 24" — shop-local, always. */
export const formatDateLong = (date: Date) => DATE_LONG.format(date);

/** "Thursday, September 24 at 2:30 p.m." */
export const formatSlotLong = (date: Date) => `${DATE_LONG.format(date)} at ${TIME.format(date)}`;

export function formatDayPill(day: ShopDay) {
  const noon = shopNoon(day);
  return {
    weekday: WEEKDAY_SHORT.format(noon),
    dayNumber: DAY_NUMBER.format(noon),
    month: MONTH_SHORT.format(noon),
    long: DATE_LONG.format(noon),
  };
}

/** "10:00 a.m." from minutes past shop-local midnight — for the hours table. */
export function formatShopMinute(minute: number): string {
  const base = new Date(Date.UTC(2024, 0, 1, Math.floor(minute / 60), minute % 60));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(base);
}
