# Supreme Barbershop

A cinematic, 3D-interactive site and booking system for **Supreme Barbershop**, Edmonton.
7906A 104 Street NW · Mon–Fri 10–8 · Sat 9–7 · Sun 11–5

---

## What's here

| Deliverable | File |
| --- | --- |
| Tech stack & architecture | [`docs/architecture.md`](docs/architecture.md) |
| UI/UX design system & wireframes | [`docs/design-system.md`](docs/design-system.md) |
| Database schema | [`prisma/schema.prisma`](prisma/schema.prisma) |
| **3D scroll hero** | [`src/components/hero/HeroClipperScene.tsx`](src/components/hero/HeroClipperScene.tsx) · [`ClipperModel.tsx`](src/components/hero/ClipperModel.tsx) |
| **Booking API** | [`src/app/api/appointments/route.ts`](src/app/api/appointments/route.ts) |
| **SMS logic** | [`src/lib/sms.ts`](src/lib/sms.ts) |
| Availability engine | [`src/lib/availability.ts`](src/lib/availability.ts) |
| Landing page | [`src/app/page.tsx`](src/app/page.tsx) |
| Four-step booking UI | [`src/app/book/page.tsx`](src/app/book/page.tsx) · [`src/components/booking/`](src/components/booking) |

## Stack

Next.js 15 (App Router) · React Three Fiber + drei · GSAP ScrollTrigger · Framer Motion ·
Tailwind CSS v4 · Prisma 6 + PostgreSQL · Twilio Messaging Service · Vercel

## The three ideas worth stealing

**1 · One scroll value drives everything.** A single `ScrollTrigger` writes a smoothed
`progress` float into a ref. The DOM copy timeline and the Three.js timeline are both
`paused: true` and scrubbed from that one number. Two independent ScrollTriggers always
drift a frame apart under load; one source of truth cannot. React never re-renders during
scroll, and `frameloop` flips to `'never'` when the hero leaves the viewport.

**2 · Double-booking is solved in Postgres, not Node.** "Check then insert" is a race by
construction. An `EXCLUDE USING gist (barberId WITH =, tstzrange(startsAt, endsAt) WITH &&)`
constraint, filtered to live statuses, makes the overlap unrepresentable. The API's only
job is turning `SQLSTATE 23P01` into a 409 carrying the three nearest open times.

**3 · SMS can never cost a booking.** Messaging is dispatched from Next.js `after()`, so it
runs after the response flushes. The 24-hour reminder is handed to Twilio's own scheduler at
booking time — no queue, no cron, no worker — and its `MessageSid` is stored so cancelling the
appointment cancels the text.

## Getting started

```bash
cp .env.example .env        # fill in DATABASE_URL + Twilio
npm install
npx prisma migrate deploy   # includes the no-double-booking constraint
npm run db:seed             # services, barbers, weekly hours
npm run dev
```

Postgres 14+ with the `btree_gist` extension available is required. `migrate deploy`
runs the baseline schema first, then layers the exclusion constraint on top of it.

Without a `DATABASE_URL` the site still builds and the marketing page still renders —
`/book` is `force-dynamic`, so it degrades to a "booking is temporarily unavailable"
panel instead of breaking the build.

## Done

- [x] Next.js app shell — `tsconfig.json`, `next.config.ts`, PostCSS, root layout
- [x] Landing page — 3D hero behind a server-rendered poster, Services, Barbers, Gallery, Visit
- [x] `/book` four-step flow UI (design in `docs/design-system.md` §5)
- [x] Baseline Prisma migration, so `prisma migrate deploy` works against an empty database

## Still to build

- [ ] `/a/[code]` self-serve reschedule + cancel
- [ ] `api/twilio/inbound` — STOP/START and "C" to cancel
- [ ] `api/cron/reminders` — nightly sweep for bookings beyond Twilio's 35-day window
- [ ] Modelled clipper GLB (swap notes at the bottom of `ClipperModel.tsx`)
- [ ] Barber portraits, gallery photography, dark-styled map embed — all three are
      placeholders today, and the gallery lightbox ships with the real images
- [ ] `aria-hidden` on the hero `<Canvas>` (`docs/design-system.md` §7). The hero files
      were left byte-for-byte untouched, so this one-word fix is still outstanding
- [ ] Automated tests. The booking flow was verified by hand against a throwaway local
      Postgres: 201 create, 200 idempotent replay, 409 `SLOT_TAKEN` with alternatives
      from the real exclusion constraint, 422 on refused consent and on a bad number,
      409 `OUTSIDE_HOURS` / `TOO_SOON` / `PAST`, and 429 once the window closed
