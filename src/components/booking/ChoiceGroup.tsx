'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';

/**
 * Radix supplies the radiogroup semantics and roving tabindex for the two
 * "pick one" steps. The slot grid rolls its own because it also has to keep
 * unavailable options on screen.
 */
export function ChoiceGroup({
  label,
  value,
  onValueChange,
  className = 'grid gap-3',
  orientation,
  children,
}: {
  label: string;
  value: string | null;
  onValueChange: (value: string) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  children: React.ReactNode;
}) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value ?? ''}
      onValueChange={onValueChange}
      orientation={orientation}
      className={className}
    >
      {children}
    </RadioGroup.Root>
  );
}

export function ChoiceTile({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <RadioGroup.Item
      value={value}
      aria-label={label}
      className="w-[74px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3 text-center transition-colors hover:border-white/25 data-[state=checked]:border-gold data-[state=checked]:bg-gold/[0.07]"
    >
      {children}
    </RadioGroup.Item>
  );
}

export function ChoiceCard({
  value,
  eyebrow,
  title,
  meta,
  description,
  accent = false,
}: {
  value: string;
  eyebrow?: string;
  title: string;
  meta?: string;
  description?: string | null;
  /** The middle service card carries the gold hairline. */
  accent?: boolean;
}) {
  return (
    <RadioGroup.Item
      value={value}
      className={[
        'group relative w-full rounded-[24px] border p-5 text-left transition-[transform,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-1',
        accent ? 'border-gold/45' : 'border-white/10',
        'bg-white/[0.02] hover:bg-white/[0.04]',
        'data-[state=checked]:border-gold data-[state=checked]:bg-gold/[0.07]',
      ].join(' ')}
    >
      <span className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          {eyebrow ? (
            <span className="mb-2 block text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38">
              {eyebrow}
            </span>
          ) : null}
          <span className="block text-[1.375rem] tracking-[-0.02em] text-porcelain">{title}</span>
          {description ? (
            <span className="mt-2 block text-sm leading-6 text-porcelain/55">{description}</span>
          ) : null}
        </span>

        <span className="flex shrink-0 items-center gap-4">
          {meta ? (
            <span data-numeric className="text-right text-sm text-gold">
              {meta}
            </span>
          ) : null}
          <span
            aria-hidden
            className="mt-1 grid size-5 shrink-0 place-items-center rounded-full border border-white/20 transition-colors group-data-[state=checked]:border-gold"
          >
            <RadioGroup.Indicator className="block size-2.5 rounded-full bg-gold" />
          </span>
        </span>
      </span>
    </RadioGroup.Item>
  );
}
