import HoursTable from './HoursTable';
import { SHOP_CITY, SHOP_STREET } from '@/lib/shop';

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `Supreme Barbershop, ${SHOP_STREET}, ${SHOP_CITY}`,
)}`;

export default function Visit() {
  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-12">
      {/*
        Dark-styled map stands in for the real embed. A live Google/Mapbox tile
        layer needs an API key and a third-party request on the critical path,
        so until that is configured this links out rather than pretending.
      */}
      <a
        href={MAPS_URL}
        target="_blank"
        rel="noreferrer"
        className="group relative block aspect-[4/3] overflow-hidden rounded-[24px] border border-white/10 bg-charcoal transition-colors hover:border-gold/45"
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,#C6CAD1_1px,transparent_1px),linear-gradient(to_bottom,#C6CAD1_1px,transparent_1px)] [background-size:64px_64px]"
        />
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,#C6CAD1_1px,transparent_1px),linear-gradient(to_bottom,#C6CAD1_1px,transparent_1px)] [background-size:16px_16px]"
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_0_8px_rgba(201,162,39,0.16)]"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-charcoal via-charcoal/85 to-transparent p-6">
          <span>
            <span className="block text-base text-porcelain">{SHOP_STREET}</span>
            <span className="mt-1 block text-sm text-porcelain/55">{SHOP_CITY}</span>
          </span>
          <span className="shrink-0 text-sm text-porcelain/55 transition-colors group-hover:text-gold">
            Open in Maps →
          </span>
        </span>
      </a>

      <div>
        <h2 className="text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.035em]">
          Open seven days.
        </h2>
        <p className="mt-4 max-w-sm text-base leading-7 text-porcelain/55">
          Walk in if a chair is free. Book ahead if it matters — evenings and Saturdays go first.
        </p>
        <div className="mt-9">
          <HoursTable />
        </div>
      </div>
    </div>
  );
}
