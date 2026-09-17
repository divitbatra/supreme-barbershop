'use client';

import { useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatTime } from '@/lib/format';

export type SlotState = 'open' | 'taken';

export type SlotCell = {
  iso: string;
  date: Date;
  state: SlotState;
};

/**
 * A `radiogroup` of start times with roving tabindex.
 *
 * One tab stop for the whole grid; arrows move between times and select as they
 * go, which is the WAI-ARIA radio pattern. Taken slots keep their place — seeing
 * that 2:30 is gone is what makes the rest of the grid credible — but they are
 * skipped by the arrows and cannot be focused or chosen.
 */
export default function SlotGrid({
  cells,
  value,
  onChange,
  labelledBy,
  reduceMotion,
}: {
  cells: SlotCell[];
  value: string | null;
  onChange: (iso: string) => void;
  labelledBy: string;
  reduceMotion: boolean;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const openIndexes = useMemo(() => {
    const open: number[] = [];
    cells.forEach((cell, index) => {
      if (cell.state === 'open') open.push(index);
    });
    return open;
  }, [cells]);

  // The single tab stop: the chosen time if it is still open, otherwise the
  // first open time. Selection and tabbability stay in lockstep, which is what
  // keeps the roving index correct after the grid refetches. When nothing is
  // open, the first taken slot takes the tab stop so a keyboard user can still
  // reach the group and hear that the day is full.
  const tabbable = useMemo(() => {
    const chosen = cells.findIndex((c) => c.iso === value && c.state === 'open');
    if (chosen >= 0) return chosen;
    if (openIndexes.length > 0) return openIndexes[0];
    return cells.length > 0 ? 0 : -1;
  }, [cells, value, openIndexes]);

  const moveTo = useCallback(
    (index: number) => {
      const cell = cells[index];
      if (!cell || cell.state === 'taken') return;
      onChange(cell.iso);
      buttons.current[index]?.focus();
    },
    [cells, onChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (openIndexes.length === 0) return;
      const position = openIndexes.indexOf(index);
      const wrapped = position < 0 ? 0 : position;

      let next: number | undefined;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = openIndexes[(wrapped + 1) % openIndexes.length];
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = openIndexes[(wrapped - 1 + openIndexes.length) % openIndexes.length];
          break;
        case 'Home':
          next = openIndexes[0];
          break;
        case 'End':
          next = openIndexes[openIndexes.length - 1];
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          moveTo(index);
          return;
        default:
          return;
      }

      event.preventDefault();
      if (next !== undefined) moveTo(next);
    },
    [openIndexes, moveTo],
  );

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
    >
      {cells.map((cell, index) => {
        const taken = cell.state === 'taken';
        const selected = !taken && cell.iso === value;
        const label = formatTime(cell.date);

        return (
          <button
            key={cell.iso}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={taken || undefined}
            aria-label={taken ? `${label} — already booked` : label}
            tabIndex={index === tabbable ? 0 : -1}
            data-numeric
            onClick={() => !taken && onChange(cell.iso)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              'relative rounded-full border px-3 py-3 text-sm transition-colors duration-200',
              taken
                ? 'cursor-not-allowed border-graphite bg-transparent text-porcelain/25 line-through'
                : selected
                  ? 'border-gold bg-gold/10 text-porcelain'
                  : 'border-white/10 bg-white/[0.03] text-porcelain/75 hover:border-white/25 hover:text-porcelain',
            ].join(' ')}
          >
            {selected && !reduceMotion ? (
              <motion.span
                layoutId="slot-selection"
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-gold"
              />
            ) : null}
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
