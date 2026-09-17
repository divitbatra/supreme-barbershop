'use client';

import { useEffect, useState } from 'react';
import { formatShopMinute } from '@/lib/format';
import { SHOP_HOURS, todayAtShop, weekdayOf } from '@/lib/shop';

/** Monday first — how anyone actually reads a week. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function HoursTable() {
  // Resolved after mount: the server renders at build/request time and the
  // visitor may be a day ahead of it, so marking "today" during SSR would
  // guarantee an occasional hydration mismatch.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(weekdayOf(todayAtShop())), []);

  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">Opening hours for Supreme Barbershop</caption>
      <tbody>
        {ORDER.map((weekday) => {
          const row = SHOP_HOURS[weekday];
          if (!row) return null;
          const isToday = today === weekday;

          return (
            <tr key={weekday} className="border-b border-graphite last:border-0">
              <th
                scope="row"
                className={[
                  'py-4 pr-4 text-left text-base font-normal',
                  isToday ? 'text-porcelain' : 'text-porcelain/55',
                ].join(' ')}
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={[
                      'size-1.5 rounded-full',
                      isToday ? 'bg-gold' : 'bg-transparent',
                    ].join(' ')}
                  />
                  {row.label}
                  {isToday ? <span className="sr-only">(today)</span> : null}
                </span>
              </th>
              <td
                data-numeric
                className={[
                  'py-4 text-right text-base',
                  isToday ? 'text-porcelain' : 'text-porcelain/55',
                ].join(' ')}
              >
                {formatShopMinute(row.openMinute)} — {formatShopMinute(row.closeMinute)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
