import Link from 'next/link';
import { CHAIRS } from '@/lib/menu';

/**
 * Two panels on a horizontal snap track. The portraits are placeholders — the
 * real photography does not exist yet, so the panels carry a lit gradient and
 * the barber's initial rather than a broken image or a stock photo.
 */
export default function Barbers() {
  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:mx-0 md:grid md:grid-cols-2 md:px-0">
      {CHAIRS.map((barber) => (
        <article
          key={barber.slug}
          className="group relative w-[82vw] shrink-0 snap-center overflow-hidden rounded-[24px] border border-white/10 bg-charcoal md:w-auto"
        >
          <div
            aria-hidden
            className="relative grid aspect-[4/5] place-items-center bg-[radial-gradient(70%_60%_at_50%_30%,rgba(201,162,39,0.10),transparent_70%)]"
          >
            <span className="text-[26vh] leading-none tracking-[-0.06em] text-white/[0.04]">
              {barber.displayName.charAt(0)}
            </span>
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-charcoal to-transparent" />
          </div>

          <div className="relative -mt-24 p-7">
            <p className="text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38">
              {barber.title}
            </p>
            <h3 className="mt-3 text-[2.5rem] leading-none tracking-[-0.035em] text-porcelain">
              {barber.displayName}
            </h3>
            <p className="mt-4 text-base leading-7 text-porcelain/55">{barber.craft}</p>

            <Link
              href={`/book?barber=${barber.slug}`}
              className="mt-7 inline-flex items-center gap-2 text-sm text-porcelain/75 transition-colors hover:text-gold"
            >
              Book with {barber.displayName}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
