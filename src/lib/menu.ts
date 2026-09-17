/**
 * The marketing copy for the menu and the chairs.
 *
 * These mirror `prisma/seed.ts` so the landing page can be statically rendered
 * and edge-cached without a database round trip. The booking flow never uses
 * them — `/book` resolves the real catalogue, with real ids, from Postgres, and
 * the API re-resolves price and duration again server-side before it writes.
 */

export const MENU = [
  {
    slug: 'haircut',
    name: 'Haircut',
    priceCents: 3700,
    durationMin: 30,
    description: 'Consultation, cut, hot towel and finish. Clean lines that grow out well.',
  },
  {
    slug: 'beard-trim',
    name: 'Beard Trim',
    priceCents: 2150,
    durationMin: 20,
    description: 'Shape, line-up and condition. Sharp edges, natural weight.',
  },
  {
    slug: 'full-service',
    name: 'Haircut & Beard Trim',
    priceCents: 6000,
    durationMin: 60,
    description: 'The full service — haircut, beard shape and a straight-razor finish.',
  },
] as const;

export const CHAIRS = [
  {
    slug: 'max',
    displayName: 'Max',
    title: 'Master Barber',
    craft: 'Skin fades that hold their line for weeks.',
  },
  {
    slug: 'kristian',
    displayName: 'Kristian',
    title: 'Barber',
    craft: 'Scissor work, beard shaping and the straight razor.',
  },
] as const;
