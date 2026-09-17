import Link from 'next/link';
import HeroMount from '@/components/hero/HeroMount';
import Barbers from '@/components/marketing/Barbers';
import Gallery from '@/components/marketing/Gallery';
import Section from '@/components/marketing/Section';
import Services from '@/components/marketing/Services';
import Visit from '@/components/marketing/Visit';
import { SHOP_CITY, SHOP_STREET } from '@/lib/shop';

export default function Page() {
  return (
    <>
      <a
        href="#services"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-sm focus:text-obsidian"
      >
        Skip to content
      </a>

      <main>
        <HeroMount />

        <Section id="services" index="01" eyebrow="The menu">
          <Services />
        </Section>

        <Section id="barbers" index="02" eyebrow="The barbers">
          <Barbers />
        </Section>

        <Section id="work" index="03" eyebrow="The work">
          <Gallery />
        </Section>

        <Section id="visit" index="04" eyebrow="Visit">
          <Visit />
        </Section>

        {/* The hero's CTA anchors here, so the anchor has to exist on this page. */}
        <Section id="book" index="05" eyebrow="Book">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h2 className="max-w-xl text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.035em]">
                Sixty seconds to book.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-porcelain/55">
                Pick a service, a barber and a time. We text the confirmation, and again the day
                before.
              </p>
            </div>
            <Link
              href="/book"
              className="shrink-0 rounded-full bg-gold px-9 py-4 text-sm font-medium text-obsidian transition-colors hover:bg-gold-deep hover:text-porcelain"
            >
              Book a chair
            </Link>
          </div>
        </Section>
      </main>

      <footer className="border-t border-graphite px-6 py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-porcelain/38 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Supreme Barbershop · {SHOP_STREET} · {SHOP_CITY}
          </p>
          <p data-numeric>Mon–Fri 10–8 · Sat 9–7 · Sun 11–5</p>
        </div>
      </footer>
    </>
  );
}
