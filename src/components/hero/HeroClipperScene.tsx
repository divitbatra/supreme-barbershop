'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, ContactShadows, Environment, Preload } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import ClipperModel, { type Pointer } from './ClipperModel';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Scroll distance the hero is pinned for. 320% ≈ three unhurried beats. */
const PIN_LENGTH = '+=320%';

const BEATS = [
  {
    kicker: 'Supreme Barbershop · Edmonton',
    headline: 'Precision, chair by chair.',
    sub: '7906A 104 Street NW. Open seven days.',
  },
  {
    kicker: 'The tools',
    headline: 'Nothing here is accidental.',
    sub: 'Straight-razor finishes. Hot towel. A fade that holds its line for weeks.',
  },
  {
    kicker: 'The craft',
    headline: 'Sixty seconds to book.',
    sub: 'Haircut $37 · Beard Trim $21.50 · The Full Service $60',
  },
] as const;

export default function HeroClipperScene() {
  const sectionRef = useRef<HTMLElement>(null!);
  const progress = useRef(0);
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const [active, setActive] = useState(true);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const beats = gsap.utils.toArray<HTMLElement>('[data-beat]');

      if (reduced) {
        // Honour the OS setting: hold the hero pose, reveal the copy, no pin.
        progress.current = 0.34;
        gsap.set(beats[0], { autoAlpha: 1, y: 0, filter: 'none' });
        gsap.set(beats.slice(1), { autoAlpha: 0 });
        return;
      }

      // ── One timeline for the DOM copy, paused and scrubbed manually. ──
      // Driving both the text and the 3D from a single progress value is what
      // keeps them frame-locked; two independent ScrollTriggers always drift.
      const copy = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      beats.forEach((beat, i) => {
        copy
          .fromTo(
            beat,
            { autoAlpha: 0, y: 28, filter: 'blur(14px)' },
            { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.45 },
            i,
          )
          .to(
            beat,
            { autoAlpha: 0, y: -28, filter: 'blur(14px)', duration: 0.35 },
            i + 0.68,
          );
      });
      copy.to({}, { duration: 0.35 }); // tail so the last beat can breathe

      const rail = sectionRef.current.querySelector('[data-rail]');

      // A proxy tween gives us GSAP's inertial scrub without handing the
      // ScrollTrigger to any one animation.
      const proxy = { p: 0 };
      const glide = gsap.quickTo(proxy, 'p', {
        duration: 0.5,
        ease: 'power3.out',
        onUpdate: () => {
          progress.current = proxy.p;
          copy.progress(proxy.p);
          if (rail) gsap.set(rail, { scaleY: proxy.p });
        },
      });

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: PIN_LENGTH,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => glide(self.progress),
        // Stop rendering WebGL entirely once the hero leaves the viewport.
        onToggle: (self) => setActive(self.isActive),
      });
    },
    { scope: sectionRef },
  );

  const trackPointer = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  };

  return (
    <section
      ref={sectionRef}
      onPointerMove={trackPointer}
      onPointerLeave={() => (pointer.current = { x: 0, y: 0 })}
      className="relative h-svh w-full overflow-hidden bg-[#08090b]"
      aria-label="Supreme Barbershop"
    >
      {/* Radial key light behind the object, painted in CSS so it costs nothing */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_42%,rgba(201,162,39,0.13),transparent_70%)]" />

      <Canvas
        className="absolute inset-0"
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 32, position: [0, 1.4, 9] }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <spotLight
            position={[4, 7, 5]}
            angle={0.32}
            penumbra={0.9}
            intensity={140}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-6, 2, -4]} intensity={2.4} color="#8fb6ff" />

          <ClipperModel progress={progress} pointer={pointer} />

          <ContactShadows
            position={[0, -2.1, 0]}
            opacity={0.55}
            scale={14}
            blur={3.2}
            far={5}
            resolution={512}
          />
          <Environment preset="studio" environmentIntensity={0.55} />
          <AdaptiveDpr pixelated />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* ── Copy layer ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
        <div className="relative w-full max-w-3xl text-center">
          {BEATS.map((beat) => (
            <div
              key={beat.headline}
              data-beat
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-0"
            >
              <p className="mb-5 text-[0.7rem] uppercase tracking-[0.38em] text-[#c9a227]">
                {beat.kicker}
              </p>
              <h1 className="text-balance text-5xl font-medium leading-[0.95] tracking-[-0.035em] text-white md:text-7xl">
                {beat.headline}
              </h1>
              <p className="mx-auto mt-6 max-w-lg text-pretty text-base text-white/55 md:text-lg">
                {beat.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll progress rail */}
      <div className="absolute right-6 top-1/2 h-32 w-px -translate-y-1/2 bg-white/10 md:right-10">
        <div data-rail className="h-full w-full origin-top scale-y-0 bg-[#c9a227]" />
      </div>

      <a
        href="#book"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm tracking-wide text-white backdrop-blur-md transition hover:border-[#c9a227]/60 hover:bg-white/10"
      >
        Book a chair
      </a>
    </section>
  );
}
