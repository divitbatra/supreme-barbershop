'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { formatDuration, formatPrice } from '@/lib/format';
import { MENU } from '@/lib/menu';

/** Three cards, staggered in at 20% of the viewport. The middle one carries the gold hairline. */
export default function Services() {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {MENU.map((service, index) => (
        <motion.article
          key={service.slug}
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={[
            'group relative flex flex-col rounded-[24px] border bg-white/[0.02] p-7 transition-[transform,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:bg-white/[0.04]',
            index === 1 ? 'border-gold/45' : 'border-white/10 hover:border-white/25',
          ].join(' ')}
        >
          <h3 className="text-[1.75rem] leading-tight tracking-[-0.025em] text-porcelain">
            {service.name}
          </h3>

          <p className="mt-4 flex items-baseline gap-3" data-numeric>
            <span className="text-2xl text-gold">{formatPrice(service.priceCents)}</span>
            <span className="text-sm text-porcelain/38">{formatDuration(service.durationMin)}</span>
          </p>

          <p className="mt-5 flex-1 text-base leading-7 text-porcelain/55">{service.description}</p>

          <Link
            href={`/book?service=${service.slug}`}
            className="mt-8 inline-flex w-fit items-center gap-2 text-sm text-porcelain/75 transition-colors hover:text-gold"
          >
            Book this
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </motion.article>
      ))}
    </div>
  );
}
