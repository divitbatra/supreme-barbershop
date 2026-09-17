'use client';

import { motion } from 'framer-motion';
import { formatDateLong, formatPrice, formatTime } from '@/lib/format';
import { SHOP_CITY, SHOP_STREET } from '@/lib/shop';
import type { AppointmentDTO } from '@/lib/booking-types';

/**
 * The chosen slot pill morphs into this card — same `layoutId`, so Framer
 * carries the gold ring across the step change instead of cutting to a new
 * screen. Skipped entirely under `prefers-reduced-motion`.
 */
export default function Confirmation({
  appointment,
  reduceMotion,
  onBookAnother,
}: {
  appointment: AppointmentDTO;
  reduceMotion: boolean;
  onBookAnother: () => void;
}) {
  const starts = new Date(appointment.startsAt);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[24px] border border-gold/40 bg-charcoal p-8"
    >
      {!reduceMotion ? (
        <motion.span
          layoutId="slot-selection"
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-gold"
        />
      ) : null}

      <div className="relative">
        <p className="mb-5 flex items-center gap-3 text-[0.625rem] uppercase tracking-[0.38em] text-[#4ade80]">
          <span aria-hidden className="size-1.5 rounded-full bg-[#4ade80]" />
          Chair booked
        </p>

        <h3 className="text-[2rem] leading-tight tracking-[-0.035em] text-porcelain">
          {formatDateLong(starts)}
          <span className="block text-gold" data-numeric>
            {formatTime(starts)}
          </span>
        </h3>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {[
            { term: 'Service', value: appointment.service.name },
            { term: 'Barber', value: appointment.barber.displayName },
            { term: 'Price', value: formatPrice(appointment.priceCents), numeric: true },
            { term: 'Confirmation code', value: appointment.confirmationCode, numeric: true },
          ].map((row) => (
            <div key={row.term} className="bg-charcoal px-5 py-4">
              <dt className="text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38">
                {row.term}
              </dt>
              <dd
                className="mt-2 text-base text-porcelain"
                {...(row.numeric ? { 'data-numeric': '' } : {})}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-sm leading-6 text-porcelain/55">
          A confirmation text is on its way, and we will remind you the day before. Quote{' '}
          <span className="text-porcelain">{appointment.confirmationCode}</span> at the chair.
        </p>
        <p className="mt-2 text-sm leading-6 text-porcelain/38">
          {SHOP_STREET} · {SHOP_CITY}
        </p>

        <button
          type="button"
          onClick={onBookAnother}
          className="mt-8 rounded-full border border-white/15 px-6 py-3 text-sm text-porcelain transition-colors hover:border-gold/60"
        >
          Book another chair
        </button>
      </div>
    </motion.div>
  );
}
