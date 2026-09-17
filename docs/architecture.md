# Supreme Barbershop — Architecture

> 7906A 104 Street NW, Edmonton, AB · Open seven days

## 1. Tech stack

| Layer | Choice | Why this one |
| --- | --- | --- |
| Framework | **Next.js 15 (App Router)** | Server Components keep the booking UI light; Route Handlers give us a real backend without a second deploy target; `after()` lets SMS run post-response. |
| 3D | **React Three Fiber + drei** | Declarative Three.js that composes with React state. `drei` supplies `Environment`, `ContactShadows`, `RoundedBox` so we are not hand-rolling studio lighting. |
| Scroll motion | **GSAP + ScrollTrigger** | The only library with frame-accurate `pin` + `scrub`. Framer Motion is better for UI micro-interaction; GSAP wins for cinematic, timeline-authored scroll. We use both. |
| UI motion | **Framer Motion** | Booking step transitions, layout animation on the slot grid, shared-element price card. |
| Styling | **Tailwind CSS v4** | Design tokens declared in CSS via `@theme`, so the palette lives in one file and is available to both Tailwind and raw CSS. |
| Components | **Radix UI primitives** | Accessible dialog/popover/radio-group foundations. The booking flow must be keyboard- and screen-reader-complete. |
| Database | **PostgreSQL (Neon)** + **Prisma 6** | We need `tstzrange` + `EXCLUDE` constraints — the single most important reason this is Postgres and not a document store. |
| SMS | **Twilio Messaging Service** | Native *scheduled messages* remove the need for a cron worker for the 24-hour reminder. |
| Rate limiting | **Upstash Redis** | Serverless-safe fixed window. Fails open so limiter downtime never costs a booking. |
| Hosting | **Vercel** | Edge-cached marketing routes, Node runtime for `/api/appointments`, cron for the long-tail reminder sweep. |

## 2. Route map

```
src/app
├─ (marketing)/page.tsx          Hero · Services · Barbers · Gallery · Visit
├─ book/page.tsx                 4-step booking flow (Server Component shell)
├─ a/[code]/page.tsx             Self-serve manage / cancel / reschedule
└─ api
   ├─ appointments/route.ts      POST create · GET availability
   ├─ appointments/[id]/route.ts PATCH reschedule · DELETE cancel
   ├─ twilio/inbound/route.ts    STOP / START / "C" to cancel
   ├─ twilio/status/route.ts     Delivery receipts → Notification.status
   └─ cron/reminders/route.ts    Nightly sweep for bookings > 35 days out
```

## 3. The three hard problems

### a. Making 60fps scroll survive a WebGL canvas

One `ScrollTrigger` owns the pin and writes a single smoothed `progress` float into a ref. Both the DOM copy timeline and the Three.js timeline are `paused: true` and scrubbed from that one value. Two independent ScrollTriggers **always** drift by a frame or two under load; one source of truth cannot.

Inside the canvas, `useFrame` calls `timeline.progress(ref.current)`. React never re-renders during scroll, nothing allocates per frame, and `frameloop` flips to `'never'` the moment the hero leaves the viewport.

### b. Double-booking

Application-level "check then insert" is a race, always. Two requests 40 ms apart both read an empty slot and both write. The fix is a Postgres exclusion constraint on `(barberId, tstzrange(startsAt, endsAt))` filtered to live statuses — the overlap becomes physically unrepresentable. Node's job is only to translate `SQLSTATE 23P01` into a friendly 409 with alternative times.

### c. SMS that never costs a booking

Messaging is dispatched from `after()`, so it runs once the HTTP response has flushed. Twilio being down produces a logged `FAILED` notification row, not a lost appointment. The 24-hour reminder is handed to Twilio's scheduler at booking time — no queue, no worker, no cron for 99% of bookings — and its `MessageSid` is stored so a cancellation can call it back.

## 4. Data integrity rules

- Money is **integer cents**. `$21.50` is `2150`, never `21.5`.
- Price and duration are **snapshotted** onto the appointment at booking time.
- All instants are `timestamptz`; `America/Edmonton` lives in code, never in a column.
- Price/duration **never** come from the client payload — they are re-resolved server-side.
- Consent (`smsOptIn`) is an affirmative act, recorded with a timestamp (CASL).

## 5. Performance budget

| Metric | Target |
| --- | --- |
| LCP (mobile) | < 2.0 s |
| INP | < 150 ms |
| Hero JS (gzip) | < 180 kB — canvas is `next/dynamic`, `ssr: false` |
| GLB asset | < 1.5 MB Draco + KTX2 |
| Booking POST p95 | < 250 ms |

The 3D hero is dynamically imported behind a static poster image, so the marketing page paints and is interactive before Three.js ever parses. `prefers-reduced-motion` skips the pin entirely and holds a single composed pose.
