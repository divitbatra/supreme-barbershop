'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import HeroPoster from './HeroPoster';

/**
 * `ssr: false` keeps Three.js out of the server render entirely, and the poster
 * is server-rendered underneath it — so the page paints real hero copy first and
 * is interactive before the canvas chunk is even requested (architecture §5).
 *
 * The scene is then pulled in on the first idle frame rather than during
 * hydration, so parsing Three.js never competes with the rest of the page.
 */
const HeroClipperScene = dynamic(() => import('./HeroClipperScene'), {
  ssr: false,
  loading: () => <HeroPoster />,
});

export default function HeroMount() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const w = window as IdleWindow;

    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  return ready ? <HeroClipperScene /> : <HeroPoster />;
}
