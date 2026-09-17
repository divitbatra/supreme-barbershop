import Link from 'next/link';

/**
 * What the visitor sees before Three.js has parsed a single byte — and what a
 * crawler and a screen reader get, because this is server-rendered while the
 * canvas is not. Painted entirely in CSS, so it costs no requests and no bytes
 * beyond the markup itself.
 */
export default function HeroPoster() {
  return (
    <section
      className="relative grid h-svh w-full place-items-center overflow-hidden bg-obsidian px-6"
      aria-label="Supreme Barbershop"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_42%,rgba(201,162,39,0.13),transparent_70%)]"
      />
      {/* Stand-in for the clipper: a lit silhouette, not a spinner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[46%] h-[42vh] w-[8.5vh] -translate-x-1/2 -translate-y-1/2 rounded-[2.4vh] bg-gradient-to-b from-graphite via-charcoal to-obsidian opacity-80 shadow-[inset_1px_0_0_rgba(255,255,255,0.08)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[30%] h-px w-[8.5vh] -translate-x-1/2 bg-gold/60"
      />

      <div className="relative w-full max-w-3xl text-center">
        <p className="mb-5 text-[0.7rem] uppercase tracking-[0.38em] text-gold">
          Supreme Barbershop · Edmonton
        </p>
        <h1 className="text-balance text-5xl font-medium leading-[0.95] tracking-[-0.035em] md:text-7xl">
          Precision, chair by chair.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-pretty text-base text-porcelain/55 md:text-lg">
          7906A 104 Street NW. Open seven days.
        </p>
      </div>

      <Link
        href="/book"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm tracking-wide text-porcelain backdrop-blur-md transition-colors hover:border-gold/60 hover:bg-white/10"
      >
        Book a chair
      </Link>
    </section>
  );
}
