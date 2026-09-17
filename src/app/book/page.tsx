import Link from 'next/link';
import type { Metadata } from 'next';
import BookingFlow from '@/components/booking/BookingFlow';
import { prisma } from '@/lib/prisma';
import type { BarberDTO, ServiceDTO } from '@/lib/booking-types';
import { SHOP_CITY, SHOP_STREET, todayAtShop } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Book a chair',
  description:
    'Pick a service, a barber and a time at Supreme Barbershop, 7906A 104 Street NW, Edmonton.',
};

// The catalogue and the live schedule both come from the database, so this page
// is never prerendered. It also means the build does not need a database.
export const dynamic = 'force-dynamic';

async function loadCatalogue() {
  const [services, barbers] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        priceCents: true,
        durationMin: true,
      },
    }),
    prisma.barber.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        displayName: true,
        title: true,
        bio: true,
        services: { select: { serviceId: true, priceCents: true, durationMin: true } },
      },
    }),
  ]);

  return {
    services: services satisfies ServiceDTO[],
    barbers: barbers.map(({ services: offerings, ...barber }) => ({
      ...barber,
      offerings,
    })) satisfies BarberDTO[],
  };
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  let catalogue: Awaited<ReturnType<typeof loadCatalogue>> | null = null;
  let loadError: string | null = null;

  try {
    catalogue = await loadCatalogue();
  } catch (error) {
    console.error('[book] could not load the catalogue', error);
    loadError =
      'We cannot reach the schedule right now, so online booking is off for a moment. The shop is still open — walk in, or try this page again shortly.';
  }

  if (!catalogue || catalogue.services.length === 0 || catalogue.barbers.length === 0) {
    return (
      <Shell>
        <div className="rounded-[24px] border border-[#f87171]/45 bg-[#f87171]/[0.06] p-6">
          <p className="text-base text-porcelain">
            {loadError ? 'Online booking is temporarily unavailable' : 'The chair book is empty'}
          </p>
          <p className="mt-2 text-sm leading-6 text-porcelain/55">
            {loadError ??
              'No services or barbers are published yet, so there is nothing to book. Run `npm run db:seed` to load the menu and the weekly hours.'}
          </p>
          <p className="mt-4 text-sm text-porcelain/38">
            {SHOP_STREET} · {SHOP_CITY}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <BookingFlow
        services={catalogue.services}
        barbers={catalogue.barbers}
        today={todayAtShop()}
        initialServiceSlug={pick('service')}
        initialBarberSlug={pick('barber')}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="book" className="mx-auto min-h-svh w-full max-w-5xl px-6 py-14 md:py-20">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38 transition-colors hover:text-porcelain"
        >
          ← Supreme Barbershop
        </Link>
        <h1 className="mt-8 text-[clamp(2.25rem,6vw,3rem)] leading-[1.05] tracking-[-0.035em]">
          Book a chair
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-porcelain/55">
          Four steps, about sixty seconds. You can go back at any point without losing what you have
          entered.
        </p>
      </div>
      <div className="mt-12">{children}</div>
    </main>
  );
}
