import { useFrame } from '@react-three/fiber';
import { MutableRefObject, ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
} from 'three';
import { BOAT_TIERS } from '../../data/storyData';
import { AtmospherePalette } from './PondAtmosphere';

const NO_RAYCAST = () => null;

/**
 * Generates a realistic hollow boat hull BufferGeometry with curved sheer line,
 * flared sides, crisp pointed bow (+Z), flat transom stern (-Z), and solid inner floor.
 */
function createLoftedHullGeometry(
  length: number,
  beam: number,
  depth: number,
  options?: { bowSharpness?: number; sheerRise?: number; wallThickness?: number }
): BufferGeometry {
  const stations = 12;
  const bowSharpness = options?.bowSharpness ?? 0.68;
  const sheerRise = options?.sheerRise ?? 0.28;
  const wall = options?.wallThickness ?? 0.065;

  // 9 profile vertices per cross-section loop (CCW looking toward +Z)
  const profileCount = 9;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= stations; i++) {
    const t = i / stations; // 0 = stern (-Z), 1 = bow (+Z)
    const z = (t - 0.5) * length;

    // Smooth hull beam curve: wide stern transom -> full midships -> pointed bow
    const widthEnvelope =
      t === 1
        ? 0.012
        : Math.pow(Math.max(0.001, 1 - t), bowSharpness * 0.62) *
          (0.68 + 0.58 * Math.sin(Math.min(1, t * 1.18) * Math.PI * 0.78));

    const halfW = Math.max(0.015, beam * 0.5 * widthEnvelope);
    const chineW = halfW * 0.72;
    const innerHalfW = Math.max(0.008, halfW - wall);
    const innerFloorW = Math.max(0.005, chineW - wall * 0.9);

    const sheerY = depth * (0.48 + sheerRise * t * t);
    const chineY = -depth * 0.16 * (1 - 0.55 * t * t);
    const keelY = -depth * 0.38 * (1 - 0.65 * Math.pow(t, 2.3));
    const innerFloorY = keelY + depth * 0.2;

    // 0: Outer Starboard Gunwale
    positions.push(halfW, sheerY, z);
    // 1: Outer Starboard Chine
    positions.push(chineW, chineY, z);
    // 2: Outer Keel
    positions.push(0, keelY, z);
    // 3: Outer Port Chine
    positions.push(-chineW, chineY, z);
    // 4: Outer Port Gunwale
    positions.push(-halfW, sheerY, z);
    // 5: Inner Port Gunwale
    positions.push(-innerHalfW, sheerY, z);
    // 6: Inner Port Floor
    positions.push(-innerFloorW, innerFloorY, z);
    // 7: Inner Starboard Floor
    positions.push(innerFloorW, innerFloorY, z);
    // 8: Inner Starboard Gunwale
    positions.push(innerHalfW, sheerY, z);
  }

  for (let i = 0; i < stations; i++) {
    const rowA = i * profileCount;
    const rowB = (i + 1) * profileCount;
    for (let p = 0; p < profileCount; p++) {
      const pNext = (p + 1) % profileCount;
      const a = rowA + p;
      const b = rowA + pNext;
      const c = rowB + p;
      const d = rowB + pNext;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Cap Stern Transom (station 0)
  const sternBase = positions.length / 3;
  // Duplicate outer stern ring for clean flat-shaded stern normal
  const sHalfW = beam * 0.5 * 0.68;
  const sChineW = sHalfW * 0.72;
  const sSheerY = depth * 0.48;
  const sChineY = -depth * 0.16;
  const sKeelY = -depth * 0.38;
  const sz = -0.5 * length;
  positions.push(
    sHalfW, sSheerY, sz,
    sChineW, sChineY, sz,
    0, sKeelY, sz,
    -sChineW, sChineY, sz,
    -sHalfW, sSheerY, sz
  );
  indices.push(sternBase + 0, sternBase + 1, sternBase + 4);
  indices.push(sternBase + 1, sternBase + 2, sternBase + 4);
  indices.push(sternBase + 2, sternBase + 3, sternBase + 4);

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const ROWBOAT_HULL_GEO = createLoftedHullGeometry(2.55, 1.24, 0.48, { bowSharpness: 0.7, sheerRise: 0.34, wallThickness: 0.07 });
const SKIFF_HULL_GEO = createLoftedHullGeometry(2.95, 1.42, 0.52, { bowSharpness: 0.62, sheerRise: 0.3, wallThickness: 0.08 });
const CRUISER_HULL_GEO = createLoftedHullGeometry(3.45, 1.64, 0.64, { bowSharpness: 0.58, sheerRise: 0.35, wallThickness: 0.09 });
const CAT_PONTOON_GEO = createLoftedHullGeometry(3.55, 0.52, 0.48, { bowSharpness: 0.78, sheerRise: 0.24, wallThickness: 0.05 });
const YACHT_HULL_GEO = createLoftedHullGeometry(4.15, 2.02, 0.74, { bowSharpness: 0.64, sheerRise: 0.36, wallThickness: 0.1 });

export interface BoatMountLayout {
  boatPos: [number, number, number];
  boatYaw: number;
  fishermanOffset: [number, number, number];
  wakeScale: [number, number];
}

export function getBoatLayout(tier: number): BoatMountLayout {
  if (tier >= 5) {
    return {
      boatPos: [-3.55, 0.35, 1.68],
      boatYaw: 1.56,
      fishermanOffset: [0, 0.28, 0.92],
      wakeScale: [1.35, 2.45],
    };
  }
  if (tier === 4) {
    return {
      boatPos: [-3.42, 0.35, 1.74],
      boatYaw: 1.56,
      fishermanOffset: [0, 0.24, 0.52],
      wakeScale: [1.22, 2.1],
    };
  }
  if (tier === 3) {
    return {
      boatPos: [-3.32, 0.35, 1.78],
      boatYaw: 1.56,
      fishermanOffset: [0, 0.21, 0.68],
      wakeScale: [1.1, 1.95],
    };
  }
  if (tier === 2) {
    return {
      boatPos: [-3.22, 0.35, 1.82],
      boatYaw: 1.56,
      fishermanOffset: [0, 0.12, 0.42],
      wakeScale: [0.95, 1.7],
    };
  }
  return {
    boatPos: [-3.1, 0.35, 1.86],
    boatYaw: 1.56,
    fishermanOffset: [0, 0.06, 0.28],
    wakeScale: [0.85, 1.5],
  };
}

export function PlayerBoat({
  tier,
  paletteRef,
  locationId,
  worldPosition,
  worldYaw,
  scale = 1,
  onClick,
  children,
}: {
  tier: number;
  paletteRef?: MutableRefObject<AtmospherePalette>;
  locationId: string;
  worldPosition?: [number, number, number];
  worldYaw?: number;
  scale?: number;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const boatDef = useMemo(() => BOAT_TIERS.find((b) => b.tier === tier) || BOAT_TIERS[0], [tier]);
  const layout = useMemo(() => getBoatLayout(tier), [tier]);
  const pos = worldPosition ?? layout.boatPos;
  const yaw = worldYaw ?? layout.boatYaw;

  const rootRef = useRef<Group>(null);
  const wakeOuterRef = useRef<Mesh>(null);
  const wakeInnerRef = useRef<Mesh>(null);
  const lanternLightRef = useRef<PointLight>(null);
  const lanternMatRef = useRef<MeshStandardMaterial>(null);

  useEffect(() => {
    return () => {
      if (onClick && typeof document !== 'undefined') {
        document.body.style.cursor = 'auto';
      }
    };
  }, [onClick]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const bobAmp = tier >= 5 ? 0.018 : tier >= 3 ? 0.024 : 0.032;
    const rollAmp = tier >= 5 ? 0.016 : tier >= 3 ? 0.022 : 0.034;

    if (rootRef.current) {
      rootRef.current.position.y = pos[1] + Math.sin(t * 1.35) * bobAmp;
      rootRef.current.rotation.z = Math.sin(t * 1.05 + 0.4) * rollAmp;
      rootRef.current.rotation.x = Math.cos(t * 0.9) * (rollAmp * 0.65);
    }

    if (wakeOuterRef.current) {
      const pulse = (t * 0.42) % 1;
      wakeOuterRef.current.scale.set(
        layout.wakeScale[0] * (0.9 + pulse * 0.45),
        layout.wakeScale[1] * (0.9 + pulse * 0.45),
        1
      );
      const mat = wakeOuterRef.current.material as MeshBasicMaterial;
      mat.opacity = (1 - pulse) * 0.24;
    }

    if (wakeInnerRef.current) {
      const pulse = (t * 0.42 + 0.5) % 1;
      wakeInnerRef.current.scale.set(
        layout.wakeScale[0] * (0.85 + pulse * 0.35),
        layout.wakeScale[1] * (0.85 + pulse * 0.35),
        1
      );
      const mat = wakeInnerRef.current.material as MeshBasicMaterial;
      mat.opacity = (1 - pulse) * 0.2;
    }

    const p = paletteRef?.current;
    const glowFactor =
      locationId === 'midnight_deep' || locationId === 'alien_waters'
        ? 1.0
        : tier === 4
          ? Math.max(0.55, p ? p.nightFactor : 0)
          : p
            ? Math.max(p.twilightFactor * 0.68, p.nightFactor)
            : 0.25;

    if (lanternLightRef.current) {
      const flicker = tier === 1 ? 1 + Math.sin(t * 4.5) * 0.08 + Math.sin(t * 7.3) * 0.05 : 1;
      lanternLightRef.current.intensity = glowFactor * (tier >= 4 ? 2.1 : 1.7) * flicker;
    }
    if (lanternMatRef.current) {
      lanternMatRef.current.emissiveIntensity = glowFactor * 1.75;
    }
  });

  return (
    <group
      position={[pos[0], 0, pos[2]]}
      scale={scale}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onPointerOver={
        onClick
          ? () => {
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        onClick
          ? () => {
              document.body.style.cursor = 'auto';
            }
          : undefined
      }
    >
      {/* Gentle animated waterline hull ripples */}
      <mesh
        ref={wakeOuterRef}
        raycast={NO_RAYCAST}
        position={[0, 0.356, 0]}
        rotation={[-Math.PI / 2, 0, yaw]}
      >
        <ringGeometry args={[0.82, 0.87, 40]} />
        <meshBasicMaterial color="#d8f7f2" transparent opacity={0.22} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh
        ref={wakeInnerRef}
        raycast={NO_RAYCAST}
        position={[0, 0.358, 0]}
        rotation={[-Math.PI / 2, 0, yaw]}
      >
        <ringGeometry args={[0.74, 0.78, 36]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} side={DoubleSide} />
      </mesh>

      {/* Bobbing Boat Hull + Mounted Fisherman */}
      <group ref={rootRef} position={[0, pos[1], 0]} rotation={[0, yaw, 0]}>
        {tier === 1 && (
          <Tier1Rowboat
            hullColor={boatDef.hullColor}
            accentColor={boatDef.accentColor}
            deckColor={boatDef.deckColor}
            lanternMatRef={lanternMatRef}
            lanternLightRef={lanternLightRef}
          />
        )}
        {tier === 2 && (
          <Tier2MotorSkiff
            hullColor={boatDef.hullColor}
            accentColor={boatDef.accentColor}
            deckColor={boatDef.deckColor}
            lanternMatRef={lanternMatRef}
            lanternLightRef={lanternLightRef}
          />
        )}
        {tier === 3 && (
          <Tier3CabinCruiser
            hullColor={boatDef.hullColor}
            accentColor={boatDef.accentColor}
            deckColor={boatDef.deckColor}
            lanternMatRef={lanternMatRef}
            lanternLightRef={lanternLightRef}
          />
        )}
        {tier === 4 && (
          <Tier4Catamaran
            hullColor={boatDef.hullColor}
            accentColor={boatDef.accentColor}
            deckColor={boatDef.deckColor}
            lanternMatRef={lanternMatRef}
            lanternLightRef={lanternLightRef}
          />
        )}
        {tier >= 5 && (
          <Tier5MegaYacht
            hullColor={boatDef.hullColor}
            accentColor={boatDef.accentColor}
            deckColor={boatDef.deckColor}
            lanternMatRef={lanternMatRef}
            lanternLightRef={lanternLightRef}
          />
        )}

        {/* Fisherman riding smoothly on the boat deck */}
        <group position={layout.fishermanOffset}>{children}</group>
      </group>
    </group>
  );
}

/**
 * Tier 1: Grandpa's Rustic Wooden Rowboat — carved cedar planks, thwart benches, wooden oars & copper bow lantern.
 */
function Tier1Rowboat({
  hullColor,
  accentColor,
  deckColor,
  lanternMatRef,
  lanternLightRef,
}: {
  hullColor: string;
  accentColor: string;
  deckColor: string;
  lanternMatRef: MutableRefObject<MeshStandardMaterial | null>;
  lanternLightRef: MutableRefObject<PointLight | null>;
}) {
  return (
    <group>
      {/* Sculpted Cedar Hull */}
      <mesh geometry={ROWBOAT_HULL_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={hullColor} roughness={0.82} side={DoubleSide} />
      </mesh>
      {/* Gunwale Trim Rim */}
      <mesh position={[0, 0.24, 0.04]} rotation={[Math.PI / 2, 0, 0]} scale={[0.58, 1.24, 1]} castShadow>
        <torusGeometry args={[1.0, 0.036, 8, 28]} />
        <meshStandardMaterial color="#59280b" roughness={0.78} />
      </mesh>
      {/* Planked Floorboards */}
      {[-0.18, 0, 0.18].map((px, i) => (
        <mesh key={`plank-${i}`} position={[px, -0.04, -0.05]} receiveShadow>
          <boxGeometry args={[0.14, 0.025, 1.55]} />
          <meshStandardMaterial color={deckColor} roughness={0.85} />
        </mesh>
      ))}
      {/* Stern & Mid Wooden Benches */}
      <mesh position={[0, 0.12, -0.68]} castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.055, 0.34]} />
        <meshStandardMaterial color={accentColor} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.13, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[1.04, 0.055, 0.3]} />
        <meshStandardMaterial color={deckColor} roughness={0.78} />
      </mesh>
      {/* Bow Deck Triangle */}
      <mesh position={[0, 0.22, 0.92]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 3]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>
      {/* Port & Starboard Wooden Oars in Brass Oarlocks */}
      {[-1, 1].map((side) => (
        <group key={`oar-${side}`} position={[side * 0.56, 0.25, -0.18]} rotation={[0.08, side * 0.12, side * 0.18]}>
          {/* Oarlock bracket */}
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.08, 8]} />
            <meshStandardMaterial color="#d4a74b" metalness={0.75} roughness={0.32} />
          </mesh>
          {/* Oar Shaft */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, -0.1]} castShadow>
            <cylinderGeometry args={[0.022, 0.024, 1.38, 8]} />
            <meshStandardMaterial color="#c89252" roughness={0.74} />
          </mesh>
          {/* Tapered Oar Blade */}
          <mesh position={[0, 0.03, -0.82]} castShadow>
            <boxGeometry args={[0.14, 0.02, 0.42]} />
            <meshStandardMaterial color="#b4793c" roughness={0.76} />
          </mesh>
        </group>
      ))}
      {/* Vintage Copper Bow Lantern */}
      <group position={[0, 0.34, 1.05]}>
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.045, 0.055, 0.06, 10]} />
          <meshStandardMaterial color="#9a5b28" metalness={0.68} roughness={0.38} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.062, 0.052, 0.14, 10]} />
          <meshStandardMaterial
            ref={lanternMatRef}
            color="#fde68a"
            emissive="#fbbf24"
            emissiveIntensity={0.2}
            roughness={0.22}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.085, 0.065, 10]} />
          <meshStandardMaterial color="#783f18" metalness={0.72} roughness={0.36} />
        </mesh>
        <pointLight ref={lanternLightRef} position={[0, 0.06, 0.08]} color="#ffcb6b" distance={7} decay={2} intensity={0} />
      </group>
      {/* Cozy Tackle Bucket by Stern */}
      <group position={[-0.26, 0.09, -0.45]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.09, 0.18, 10]} />
          <meshStandardMaterial color="#7d4f2b" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.106, 0.012, 6, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Tier 2: Angler's Motor Skiff — blue hull, outboard motor, canvas bimini canopy, cooler & dual rod holders.
 */
function Tier2MotorSkiff({
  hullColor,
  accentColor,
  deckColor,
  lanternMatRef,
  lanternLightRef,
}: {
  hullColor: string;
  accentColor: string;
  deckColor: string;
  lanternMatRef: MutableRefObject<MeshStandardMaterial | null>;
  lanternLightRef: MutableRefObject<PointLight | null>;
}) {
  return (
    <group>
      {/* Painted Fiberglass Hull */}
      <mesh geometry={SKIFF_HULL_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={hullColor} roughness={0.42} metalness={0.12} side={DoubleSide} />
      </mesh>
      {/* Clean Anti-Slip Inner Deck */}
      <mesh position={[0, 0.04, 0.05]} receiveShadow>
        <boxGeometry args={[0.96, 0.14, 2.05]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.72} />
      </mesh>
      {/* Raised Forward Casting Deck */}
      <mesh position={[0, 0.1, 0.56]} receiveShadow castShadow>
        <boxGeometry args={[0.88, 0.12, 0.84]} />
        <meshStandardMaterial color={deckColor} roughness={0.62} />
      </mesh>
      {/* Accent Waterline Trim Stripe */}
      <mesh position={[0, 0.18, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[0.68, 1.42, 1]}>
        <torusGeometry args={[1.0, 0.03, 8, 32]} />
        <meshStandardMaterial color={accentColor} roughness={0.35} />
      </mesh>

      {/* Canvas Bimini Sun Canopy (Aft/Mid, keeping bow casting deck clear) */}
      <group position={[0, 0.22, -0.45]}>
        {[
          [-0.56, 0.44, -0.38, 0.18],
          [0.56, 0.44, -0.38, 0.18],
          [-0.56, 0.44, 0.32, -0.16],
          [0.56, 0.44, 0.32, -0.16],
        ].map(([sx, sy, sz, tilt], i) => (
          <mesh key={`strut-${i}`} position={[sx, sy, sz]} rotation={[tilt, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.94, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.26} />
          </mesh>
        ))}
        <mesh position={[0, 0.88, -0.03]} castShadow>
          <boxGeometry args={[1.28, 0.05, 0.92]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.91, -0.03]}>
          <boxGeometry args={[1.22, 0.03, 0.84]} />
          <meshStandardMaterial color={accentColor} roughness={0.78} />
        </mesh>
      </group>

      {/* Live Bait Cooler Box */}
      <group position={[-0.25, 0.24, -0.22]}>
        <mesh castShadow>
          <boxGeometry args={[0.46, 0.26, 0.34]} />
          <meshStandardMaterial color="#0284c7" roughness={0.48} />
        </mesh>
        <mesh position={[0, 0.145, 0]}>
          <boxGeometry args={[0.49, 0.05, 0.37]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.42} />
        </mesh>
      </group>

      {/* Dual Gunwale Rod Holders */}
      {[-0.54, 0.54].map((rx, i) => (
        <mesh key={`holder-${i}`} position={[rx, 0.28, -0.68]} rotation={[-0.35, 0, rx < 0 ? 0.15 : -0.15]}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.28} />
        </mesh>
      ))}

      {/* 2-Stroke Outboard Motor on Stern Transom */}
      <group position={[0, 0.22, -1.56]}>
        {/* Mounting Bracket */}
        <mesh position={[0, 0.04, 0.08]}>
          <boxGeometry args={[0.24, 0.14, 0.18]} />
          <meshStandardMaterial color="#475569" metalness={0.65} roughness={0.38} />
        </mesh>
        {/* Cowling Cover */}
        <mesh position={[0, 0.24, -0.04]} castShadow>
          <boxGeometry args={[0.32, 0.28, 0.36]} />
          <meshStandardMaterial color="#1e293b" roughness={0.36} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.27, -0.04]}>
          <boxGeometry args={[0.33, 0.05, 0.32]} />
          <meshStandardMaterial color={accentColor} roughness={0.35} />
        </mesh>
        {/* Lower Unit Shaft */}
        <mesh position={[0, -0.14, -0.04]}>
          <cylinderGeometry args={[0.04, 0.03, 0.44, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Brass Propeller */}
        <mesh position={[0, -0.34, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.04, 6]} />
          <meshStandardMaterial color="#eab308" metalness={0.82} roughness={0.28} />
        </mesh>
      </group>

      {/* Bow Spotlight */}
      <group position={[0, 0.34, 1.28]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 10]} />
          <meshStandardMaterial
            ref={lanternMatRef}
            color="#fef3c7"
            emissive="#facc15"
            emissiveIntensity={0.25}
            roughness={0.2}
          />
        </mesh>
        <pointLight ref={lanternLightRef} position={[0, 0.08, 0.1]} color="#fde68a" distance={8} decay={2} intensity={0} />
      </group>
    </group>
  );
}

/**
 * Tier 3: Oceanic Cabin Cruiser — reinforced navy hull, enclosed wheelhouse with glass windows, radar & floodlights.
 */
function Tier3CabinCruiser({
  hullColor,
  accentColor,
  deckColor,
  lanternMatRef,
  lanternLightRef,
}: {
  hullColor: string;
  accentColor: string;
  deckColor: string;
  lanternMatRef: MutableRefObject<MeshStandardMaterial | null>;
  lanternLightRef: MutableRefObject<PointLight | null>;
}) {
  return (
    <group>
      {/* Heavy Deep-Sea Hull */}
      <mesh geometry={CRUISER_HULL_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={hullColor} roughness={0.44} metalness={0.22} side={DoubleSide} />
      </mesh>
      {/* Golden Boot Stripe */}
      <mesh position={[0, 0.22, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[0.78, 1.66, 1]}>
        <torusGeometry args={[1.0, 0.032, 8, 36]} />
        <meshStandardMaterial color={accentColor} roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Solid Teak-Slate Working Deck */}
      <mesh position={[0, 0.12, 0.12]} receiveShadow castShadow>
        <boxGeometry args={[1.14, 0.14, 2.42]} />
        <meshStandardMaterial color={deckColor} roughness={0.72} />
      </mesh>

      {/* Enclosed Wheelhouse Cabin (Aft/Mid) */}
      <group position={[0, 0.56, -0.58]}>
        {/* Main Cabin Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.06, 0.72, 1.12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
        </mesh>
        {/* Dark Tinted Wrap-Around Bridge Windows */}
        <mesh position={[0, 0.14, 0.03]}>
          <boxGeometry args={[1.09, 0.28, 1.02]} />
          <meshPhysicalMaterial color="#0f172a" roughness={0.14} metalness={0.25} clearcoat={1} />
        </mesh>
        {/* Cabin Visor Roof */}
        <mesh position={[0, 0.4, 0.08]} castShadow>
          <boxGeometry args={[1.18, 0.08, 1.28]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Roof Radar Bar & Whip Antenna */}
        <mesh position={[0, 0.52, -0.1]}>
          <cylinderGeometry args={[0.04, 0.06, 0.18, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.62, -0.1]}>
          <boxGeometry args={[0.48, 0.045, 0.08]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.35} />
        </mesh>
        <mesh position={[0.38, 0.78, -0.35]}>
          <cylinderGeometry args={[0.01, 0.015, 0.75, 6]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Dual Roof Halogen Floodlights */}
        {[-0.36, 0.36].map((lx, i) => (
          <mesh key={`flood-${i}`} position={[lx, 0.48, 0.58]}>
            <cylinderGeometry args={[0.055, 0.065, 0.1, 10]} />
            <meshStandardMaterial
              ref={i === 0 ? lanternMatRef : undefined}
              color="#fef08a"
              emissive="#fbbf24"
              emissiveIntensity={0.35}
              roughness={0.2}
            />
          </mesh>
        ))}
        <pointLight ref={lanternLightRef} position={[0, 0.52, 0.78]} color="#fde68a" distance={9} decay={2} intensity={0} />
      </group>

      {/* Bow Pulpit Safety Rails */}
      {[-0.44, 0.44].map((rx, i) => (
        <mesh key={`rail-${i}`} position={[rx, 0.34, 1.02]} rotation={[Math.PI / 2, 0, rx < 0 ? 0.25 : -0.25]}>
          <cylinderGeometry args={[0.016, 0.016, 0.92, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.22} />
        </mesh>
      ))}

      {/* Orange Life Ring Buoy on Cabin Side */}
      <mesh position={[0.56, 0.54, -0.62]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.13, 0.036, 8, 16]} />
        <meshStandardMaterial color="#ea580c" roughness={0.55} />
      </mesh>
    </group>
  );
}

/**
 * Tier 4: Sleek Sports Catamaran — twin hydrofoil hulls, carbon bridge deck, glowing underwater cyan LEDs & aero arch.
 */
function Tier4Catamaran({
  hullColor,
  accentColor,
  deckColor,
  lanternMatRef,
  lanternLightRef,
}: {
  hullColor: string;
  accentColor: string;
  deckColor: string;
  lanternMatRef: MutableRefObject<MeshStandardMaterial | null>;
  lanternLightRef: MutableRefObject<PointLight | null>;
}) {
  return (
    <group>
      {/* Twin Hydrofoil Sponson Hulls */}
      {[-0.64, 0.64].map((hx, i) => (
        <group key={`sponson-${i}`} position={[hx, 0, 0]}>
          <mesh geometry={CAT_PONTOON_GEO} castShadow receiveShadow>
            <meshStandardMaterial color={hullColor} roughness={0.3} metalness={0.45} side={DoubleSide} />
          </mesh>
          {/* Glowing Cyan Hydrofoil Under-Hull LED Strip */}
          <mesh position={[0, -0.02, 0.05]}>
            <boxGeometry args={[0.32, 0.05, 2.75]} />
            <meshStandardMaterial
              ref={i === 0 ? lanternMatRef : undefined}
              color="#67e8f9"
              emissive={accentColor}
              emissiveIntensity={0.85}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Carbon-Fiber Cross-Deck Bridge Platform */}
      <mesh position={[0, 0.16, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[1.56, 0.14, 2.48]} />
        <meshStandardMaterial color={deckColor} roughness={0.42} metalness={0.35} />
      </mesh>
      {/* Aerodynamic Cyan Center Stripe */}
      <mesh position={[0, 0.238, 0.15]}>
        <boxGeometry args={[0.34, 0.02, 2.25]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.25} roughness={0.3} />
      </mesh>

      {/* Sleek Swept-Back Glass Cockpit Windshield */}
      <mesh position={[0, 0.42, -0.15]} rotation={[-0.55, 0, 0]}>
        <boxGeometry args={[1.18, 0.34, 0.06]} />
        <meshPhysicalMaterial color="#083344" roughness={0.1} metalness={0.3} clearcoat={1} transparent opacity={0.88} />
      </mesh>

      {/* Rear Carbon Aero Spoiler Arch */}
      <group position={[0, 0.56, -0.95]}>
        {[-0.64, 0.64].map((px, i) => (
          <mesh key={`fin-${i}`} position={[px, -0.18, 0]} rotation={[-0.28, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.58, 0.34]} />
            <meshStandardMaterial color={hullColor} roughness={0.32} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.12, -0.08]} castShadow>
          <boxGeometry args={[1.48, 0.07, 0.28]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.125, 0.07]}>
          <boxGeometry args={[1.28, 0.028, 0.03]} />
          <meshStandardMaterial color="#67e8f9" emissive={accentColor} emissiveIntensity={0.9} />
        </mesh>
      </group>

      {/* Twin High-Output Racing Outboards */}
      {[-0.64, 0.64].map((mx, i) => (
        <mesh key={`pod-${i}`} position={[mx, 0.2, -1.78]} castShadow>
          <boxGeometry args={[0.26, 0.28, 0.34]} />
          <meshStandardMaterial color="#020617" roughness={0.32} metalness={0.55} />
        </mesh>
      ))}

      <pointLight ref={lanternLightRef} position={[0, -0.05, 0.3]} color="#22d3ee" distance={8} decay={2} intensity={0.8} />
    </group>
  );
}

/**
 * Tier 5: The Sovereign Mega Yacht — gleaming white hull, brushed 24k gold trim, teak foredeck, multi-tier sky bridge & helipad.
 */
function Tier5MegaYacht({
  hullColor,
  accentColor,
  deckColor,
  lanternMatRef,
  lanternLightRef,
}: {
  hullColor: string;
  accentColor: string;
  deckColor: string;
  lanternMatRef: MutableRefObject<MeshStandardMaterial | null>;
  lanternLightRef: MutableRefObject<PointLight | null>;
}) {
  return (
    <group>
      {/* Grand White Yacht Hull */}
      <mesh geometry={YACHT_HULL_GEO} castShadow receiveShadow>
        <meshPhysicalMaterial color={hullColor} roughness={0.22} metalness={0.12} clearcoat={0.9} side={DoubleSide} />
      </mesh>
      {/* 24k Brushed Gold Waterline Trim */}
      <mesh position={[0, 0.26, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[0.96, 1.98, 1]}>
        <torusGeometry args={[1.0, 0.036, 10, 40]} />
        <meshStandardMaterial color={accentColor} metalness={0.88} roughness={0.22} />
      </mesh>
      {/* Polished Teak Wood Main & Foredeck */}
      <mesh position={[0, 0.2, 0.15]} receiveShadow castShadow>
        <boxGeometry args={[1.48, 0.16, 3.15]} />
        <meshStandardMaterial color={deckColor} roughness={0.62} />
      </mesh>

      {/* Gold Bow Stanchion Railings */}
      {[-0.58, 0.58].map((rx, i) => (
        <mesh key={`gold-rail-${i}`} position={[rx, 0.42, 1.24]} rotation={[Math.PI / 2, 0, rx < 0 ? 0.28 : -0.28]}>
          <cylinderGeometry args={[0.02, 0.02, 1.05, 8]} />
          <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.18} />
        </mesh>
      ))}

      {/* Lower Luxury Saloon Deckhouse */}
      <group position={[0, 0.56, -0.52]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.56, 1.65]} />
          <meshPhysicalMaterial color="#f8fafc" roughness={0.24} clearcoat={0.75} />
        </mesh>
        {/* Wrap-around Golden Warm-Lit Panoramic Saloon Windows */}
        <mesh position={[0, 0.04, 0.06]}>
          <boxGeometry args={[1.41, 0.26, 1.5]} />
          <meshStandardMaterial
            ref={lanternMatRef}
            color="#1e293b"
            emissive="#fbbf24"
            emissiveIntensity={0.35}
            roughness={0.15}
            metalness={0.4}
          />
        </mesh>

        {/* Upper Sky Bridge & Sun Lounge */}
        <group position={[0, 0.44, -0.1]}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.34, 1.08]} />
            <meshPhysicalMaterial color="#ffffff" roughness={0.22} clearcoat={0.8} />
          </mesh>
          <mesh position={[0, 0.02, 0.08]}>
            <boxGeometry args={[1.13, 0.18, 0.92]} />
            <meshPhysicalMaterial color="#0f172a" roughness={0.12} clearcoat={1} />
          </mesh>
          {/* Sky Roof Wing + Dual Radar Domes */}
          <mesh position={[0, 0.22, -0.05]} castShadow>
            <boxGeometry args={[1.22, 0.06, 1.12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.26} />
          </mesh>
          <mesh position={[-0.26, 0.36, -0.15]}>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0.26, 0.36, -0.15]}>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* Gold Mast Spire */}
          <mesh position={[0, 0.45, -0.25]}>
            <cylinderGeometry args={[0.018, 0.032, 0.46, 8]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Aft Helipad Deck */}
      <group position={[0, 0.3, -1.62]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[0.56, 0.62, 0.08, 20]} />
          <meshStandardMaterial color="#334155" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.44, 24]} />
          <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Golden 'H' Marking */}
        <mesh position={[-0.1, 0.046, 0]}>
          <boxGeometry args={[0.05, 0.01, 0.32]} />
          <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0.046, 0]}>
          <boxGeometry args={[0.05, 0.01, 0.32]} />
          <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.046, 0]}>
          <boxGeometry args={[0.2, 0.01, 0.05]} />
          <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      <pointLight ref={lanternLightRef} position={[0, 0.95, 0.35]} color="#fde68a" distance={10} decay={2} intensity={0} />
    </group>
  );
}
