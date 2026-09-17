'use client';

const STEPS = ['Service', 'Barber', 'Date + time', 'Details'] as const;

/**
 * Four hairlines; the active one fills gold. Completed steps stay reachable so
 * the whole flow is navigable without ever losing what has been entered.
 */
export default function StepRail({
  current,
  furthest,
  onJump,
}: {
  current: number;
  furthest: number;
  onJump: (step: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <nav aria-label="Booking steps">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4;
          const isCurrent = step === current;
          const reachable = step <= furthest;

          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => reachable && onJump(step)}
                disabled={!reachable}
                aria-current={isCurrent ? 'step' : undefined}
                className="group w-full text-left disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden
                  className={[
                    'block h-px w-full origin-left transition-colors duration-500',
                    isCurrent ? 'bg-gold' : reachable ? 'bg-gold/35' : 'bg-white/12',
                  ].join(' ')}
                />
                <span
                  className={[
                    'mt-3 block text-[0.625rem] uppercase tracking-[0.28em] transition-colors',
                    isCurrent
                      ? 'text-porcelain'
                      : reachable
                        ? 'text-porcelain/45 group-hover:text-porcelain/75'
                        : 'text-porcelain/25',
                  ].join(' ')}
                >
                  <span data-numeric>{`0${step}`}</span>
                  <span className="ml-2 hidden sm:inline">{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
