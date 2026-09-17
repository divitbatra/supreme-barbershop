import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mon–Fri 10:00–20:00 · Sat 09:00–19:00 · Sun 11:00–17:00
// Stored as minutes past shop-local midnight. 0 = Sunday.
const HOURS = [
  { weekday: 0, openMinute: 11 * 60, closeMinute: 17 * 60 },
  { weekday: 1, openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 2, openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 3, openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 4, openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 5, openMinute: 10 * 60, closeMinute: 20 * 60 },
  { weekday: 6, openMinute: 9 * 60, closeMinute: 19 * 60 },
];

const SERVICES = [
  {
    slug: 'haircut',
    name: 'Haircut',
    description: 'Consultation, cut, hot towel and finish. Clean lines that grow out well.',
    priceCents: 3700,
    durationMin: 30,
    sortOrder: 0,
  },
  {
    slug: 'beard-trim',
    name: 'Beard Trim',
    description: 'Shape, line-up and condition. Sharp edges, natural weight.',
    priceCents: 2150,
    durationMin: 20,
    sortOrder: 1,
  },
  {
    slug: 'full-service',
    name: 'Haircut & Beard Trim',
    description: 'The full service — haircut, beard shape and a straight-razor finish.',
    priceCents: 6000,
    durationMin: 60,
    sortOrder: 2,
  },
];

const BARBERS = [
  { slug: 'max', displayName: 'Max', title: 'Master Barber', phone: '+17805550101', chairNumber: 1 },
  { slug: 'kristian', displayName: 'Kristian', title: 'Barber', phone: '+17805550102', chairNumber: 2 },
];

async function main() {
  const services = await Promise.all(
    SERVICES.map((s) =>
      prisma.service.upsert({ where: { slug: s.slug }, create: s, update: s }),
    ),
  );

  for (const [i, b] of BARBERS.entries()) {
    const user = await prisma.user.upsert({
      where: { phone: b.phone },
      create: { phone: b.phone, firstName: b.displayName, role: 'BARBER' },
      update: { role: 'BARBER' },
    });

    const barber = await prisma.barber.upsert({
      where: { slug: b.slug },
      create: {
        userId: user.id,
        slug: b.slug,
        displayName: b.displayName,
        title: b.title,
        chairNumber: b.chairNumber,
        sortOrder: i,
      },
      update: { title: b.title, chairNumber: b.chairNumber, sortOrder: i },
    });

    // Both barbers perform every service, at standard price and pace.
    await prisma.barberService.createMany({
      data: services.map((s) => ({ barberId: barber.id, serviceId: s.id })),
      skipDuplicates: true,
    });

    await prisma.workingHours.createMany({
      data: HOURS.map((h) => ({ ...h, barberId: barber.id })),
      skipDuplicates: true,
    });
  }

  console.log(`Seeded ${services.length} services and ${BARBERS.length} barbers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
