'use client';

import { useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type * as THREE from 'three';

export type Pointer = { x: number; y: number };

type PartName = 'blade' | 'faceplate' | 'goldRing' | 'lever' | 'housing' | 'base';

/**
 * Where each component travels during the Act III deconstruction, and how it
 * tumbles on the way out. Tuned so the silhouette reads as an exploded
 * technical drawing rather than debris.
 */
const DECONSTRUCT: Record<PartName, { to: [number, number, number]; spin: [number, number, number] }> = {
  blade: { to: [0, 1.75, 0.9], spin: [0.5, 0, 0] },
  faceplate: { to: [0, 0.95, -1.15], spin: [-0.35, 0.2, 0] },
  goldRing: { to: [0, 0.15, 1.55], spin: [0, 0, 0.9] },
  lever: { to: [1.7, 0.1, 0.45], spin: [0, 0, -0.6] },
  housing: { to: [0, -0.1, -0.4], spin: [0, 0.25, 0] },
  base: { to: [0, -1.7, 0.6], spin: [0.3, 0, 0] },
};

const MATTE = '#0e0f12';
const STEEL = '#c6cad1';
const GOLD = '#c9a227';

export default function ClipperModel({
  progress,
  pointer,
}: {
  progress: MutableRefObject<number>;
  pointer: MutableRefObject<Pointer>;
}) {
  // `outer` is owned by the scroll timeline. `inner` is owned by the idle
  // float and pointer parallax. Separating them means the two never fight
  // over the same transform channel.
  const outer = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const parts = useRef<Partial<Record<PartName, THREE.Group>>>({});
  const gold = useRef<THREE.MeshStandardMaterial>(null!);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const camera = useThree((s) => s.camera);

  useGSAP(() => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

    // ── ACT I · ARRIVAL (progress 0 → 0.33) ──────────────────────────
    // The clipper rises out of the dark, completes most of a revolution,
    // and the camera closes in. Classic Apple product reveal grammar.
    tl.fromTo(outer.current.rotation, { y: -1.15, x: 0.12 }, { y: Math.PI * 1.55, duration: 1 }, 0)
      .fromTo(
        outer.current.scale,
        { x: 0.52, y: 0.52, z: 0.52 },
        { x: 1, y: 1, z: 1, ease: 'power2.out', duration: 1 },
        0,
      )
      .fromTo(outer.current.position, { y: -1.5 }, { y: 0, ease: 'power2.out', duration: 1 }, 0)
      .fromTo(camera.position, { z: 9, y: 1.4 }, { z: 5.6, y: 0.75, duration: 1 }, 0);

    // ── ACT II · INSPECTION (0.33 → 0.66) ────────────────────────────
    // Settle into a three-quarter hero angle and ignite the gold accent —
    // the single warm note in an otherwise cold frame.
    tl.to(outer.current.rotation, { y: Math.PI * 2.32, x: -0.4, z: 0.16, duration: 1 }, 1)
      .to(camera.position, { z: 4.7, y: 0.35, duration: 1 }, 1)
      .to(gold.current, { emissiveIntensity: 1.5, duration: 0.6 }, 1.15);

    // ── ACT III · DECONSTRUCTION (0.66 → 1) ──────────────────────────
    // Parts separate along their assembly axes. Stagger is what sells it:
    // simultaneous motion looks like an explosion, sequenced motion looks
    // like engineering.
    (Object.keys(DECONSTRUCT) as PartName[]).forEach((name, i) => {
      const node = parts.current[name];
      if (!node) return;
      const { to, spin } = DECONSTRUCT[name];
      tl.to(
        node.position,
        {
          x: `+=${to[0]}`,
          y: `+=${to[1]}`,
          z: `+=${to[2]}`,
          ease: 'power2.inOut',
          duration: 0.8,
        },
        2 + i * 0.04,
      ).to(
        node.rotation,
        { x: `+=${spin[0]}`, y: `+=${spin[1]}`, z: `+=${spin[2]}`, ease: 'power2.inOut', duration: 0.8 },
        2 + i * 0.04,
      );
    });

    tl.to(outer.current.rotation, { y: Math.PI * 2.75, x: -0.22, z: 0, duration: 1 }, 2)
      .to(camera.position, { z: 7.4, y: 0.6, duration: 1 }, 2)
      .to(gold.current, { emissiveIntensity: 0.45, duration: 1 }, 2);

    timeline.current = tl;
    return () => {
      tl.kill();
      timeline.current = null;
    };
  }, []);

  useFrame((state, delta) => {
    // The whole scroll animation collapses to this one line — GSAP does the
    // easing, React never re-renders, and nothing allocates per frame.
    timeline.current?.progress(progress.current);

    const t = state.clock.elapsedTime;
    const damp = 1 - Math.pow(0.0008, delta); // frame-rate independent lerp

    inner.current.position.y = Math.sin(t * 0.7) * 0.05;
    inner.current.rotation.y += (pointer.current.x * 0.14 - inner.current.rotation.y) * damp;
    inner.current.rotation.x += (pointer.current.y * 0.09 - inner.current.rotation.x) * damp;

    camera.lookAt(0, 0, 0);
  });

  const register = (name: PartName) => (node: THREE.Group | null) => {
    if (node) parts.current[name] = node;
  };

  return (
    <group ref={outer} dispose={null}>
      <group ref={inner}>
        {/* Cutting blade */}
        <group ref={register('blade')} position={[0, 1.68, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[1.02, 0.09, 0.52]} />
            <meshStandardMaterial color={STEEL} metalness={1} roughness={0.14} />
          </mesh>
          <mesh position={[0, -0.07, 0.02]} castShadow>
            <boxGeometry args={[0.94, 0.06, 0.46]} />
            <meshStandardMaterial color="#9aa0a8" metalness={1} roughness={0.3} />
          </mesh>
        </group>

        {/* Faceplate / taper housing */}
        <group ref={register('faceplate')} position={[0, 1.24, 0]}>
          <RoundedBox args={[1.06, 0.58, 0.84]} radius={0.1} smoothness={5} castShadow>
            <meshPhysicalMaterial
              color={MATTE}
              roughness={0.55}
              metalness={0.4}
              clearcoat={0.7}
              clearcoatRoughness={0.38}
            />
          </RoundedBox>
        </group>

        {/* Gold trim ring — the brand note */}
        <group ref={register('goldRing')} position={[0, 0.82, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.56, 0.042, 20, 72]} />
            <meshStandardMaterial
              ref={gold}
              color={GOLD}
              metalness={1}
              roughness={0.24}
              emissive={GOLD}
              emissiveIntensity={0}
            />
          </mesh>
        </group>

        {/* Taper lever */}
        <group ref={register('lever')} position={[0.62, 0.34, 0.12]}>
          <RoundedBox args={[0.14, 0.72, 0.12]} radius={0.05} smoothness={4} castShadow>
            <meshStandardMaterial color="#1b1d21" metalness={0.7} roughness={0.35} />
          </RoundedBox>
        </group>

        {/* Main body */}
        <group ref={register('housing')} position={[0, 0, 0]}>
          <RoundedBox args={[1.02, 2.5, 0.86]} radius={0.24} smoothness={6} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={MATTE}
              roughness={0.62}
              metalness={0.35}
              clearcoat={0.6}
              clearcoatRoughness={0.42}
            />
          </RoundedBox>
          <mesh position={[0, 0.2, 0.44]}>
            <planeGeometry args={[0.34, 0.34]} />
            <meshStandardMaterial color={GOLD} metalness={1} roughness={0.3} toneMapped={false} />
          </mesh>
        </group>

        {/* Base cap */}
        <group ref={register('base')} position={[0, -1.34, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.46, 0.22, 48]} />
            <meshStandardMaterial color="#17191d" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/*
 * Swapping in a real GLB
 * ---------------------------------------------------------------------------
 * The procedural build above ships day one with zero asset weight. When the
 * modelled clipper is ready, export it with each component as a NAMED node,
 * run it through `npx gltfjsx clipper.glb --transform`, then replace the
 * <group> bodies with the generated meshes:
 *
 *   const { nodes, materials } = useGLTF('/models/clipper-draco.glb');
 *   <group ref={register('blade')} position={...}>
 *     <mesh geometry={nodes.Blade.geometry} material={materials.Steel} />
 *   </group>
 *
 * The DECONSTRUCT map and the entire timeline stay untouched — that is the
 * point of keying the animation to part names rather than to geometry.
 * Budget: < 1.5 MB Draco-compressed, 1024px KTX2 textures, and call
 * useGLTF.preload() from the route segment.
 */
