import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector2,
} from 'three';
import { FISH_VARIANTS } from '../../data/fishData';
import { FishSpecies, FishVariant } from '../../types/game';
import { LAKE_BASE_RX, LAKE_BASE_RZ, sampleLakeContourFactor } from './lakeGeometry';

type BodyProfile = 'streamlined' | 'deep' | 'elongated';

const _hsl = { h: 0, s: 0, l: 0 };
const _tmpColor = new Color();

const VIBRANT_JEWEL_PALETTE: Array<{ body: string; accent: string; fin: string }> = [
  { body: '#ff5e3a', accent: '#ffe6a7', fin: '#ff9f1c' }, // Koi tangerine & gold
  { body: '#00bbf9', accent: '#bbf7d0', fin: '#38bdf8' }, // Electric reef cyan
  { body: '#f72585', accent: '#fbcfe8', fin: '#ff4d6d' }, // Coral magenta
  { body: '#10b981', accent: '#fef08a', fin: '#34d399' }, // Emerald jade
  { body: '#ffb703', accent: '#fffbeb', fin: '#fb8500' }, // Sunburst gold
  { body: '#8b5cf6', accent: '#f5d0fe', fin: '#c084fc' }, // Royal orchid
  { body: '#06d6a0', accent: '#e0f2fe', fin: '#0ea5e9' }, // Tropical teal
  { body: '#ef4444', accent: '#fef3c7', fin: '#f97316' }, // Scarlet goldfish
];

function boostVibrantHex(hex: string, fallback: string, minSat = 0.78, minLight = 0.48, maxLight = 0.64): string {
  _tmpColor.set(hex);
  _tmpColor.getHSL(_hsl);
  if (_hsl.s < 0.28 || _hsl.l < 0.24) {
    return fallback;
  }
  _tmpColor.setHSL(
    _hsl.h,
    Math.max(_hsl.s, minSat),
    Math.min(maxLight, Math.max(minLight, _hsl.l))
  );
  return `#${_tmpColor.getHexString()}`;
}

function getBodyProfile(species: FishSpecies): BodyProfile {
  const id = species.id.toLowerCase();
  const name = species.name.toLowerCase();
  if (
    species.pattern === 'whiskers' ||
    /eel|pike|gar|sturgeon|oarfish|dragon|leviathan|shark|barracuda|catfish/.test(id + name)
  ) {
    return 'elongated';
  }
  if (/sunfish|bluegill|angelfish|discus|butterfly|puffer|koi|goldfish|crappie|perch/.test(id + name)) {
    return 'deep';
  }
  return 'streamlined';
}

// Build shared geometries once at module scope for zero per-fish allocation overhead
function createFishBodyGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.44),
    new Vector2(0.042, -0.43),
    new Vector2(0.072, -0.34),
    new Vector2(0.138, -0.20),
    new Vector2(0.205, -0.05),
    new Vector2(0.232, 0.11),
    new Vector2(0.212, 0.26),
    new Vector2(0.152, 0.39),
    new Vector2(0.076, 0.49),
    new Vector2(0.025, 0.545),
    new Vector2(0.0, 0.56),
  ];
  const geo = new LatheGeometry(pts, 20);
  // Orient nose along +X and tail along -X
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createTailFinGeometry(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, 0.045);
  s.bezierCurveTo(-0.14, 0.16, -0.28, 0.28, -0.40, 0.31);
  s.quadraticCurveTo(-0.31, 0.11, -0.22, 0);
  s.quadraticCurveTo(-0.31, -0.11, -0.40, -0.31);
  s.bezierCurveTo(-0.28, -0.28, -0.14, -0.16, 0, -0.045);
  s.closePath();

  const geo = new ExtrudeGeometry(s, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(0, 0, -0.007);
  return geo;
}

function createDorsalFinGeometry(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0.14, 0.0);
  s.quadraticCurveTo(0.04, 0.23, -0.17, 0.19);
  s.quadraticCurveTo(-0.13, 0.09, -0.23, 0.0);
  s.closePath();

  const geo = new ExtrudeGeometry(s, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.006);
  return geo;
}

function createAnalFinGeometry(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0.06, 0.0);
  s.quadraticCurveTo(-0.04, -0.13, -0.15, -0.11);
  s.quadraticCurveTo(-0.12, -0.04, -0.17, 0.0);
  s.closePath();

  const geo = new ExtrudeGeometry(s, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -0.005);
  return geo;
}

function createPectoralFinGeometry(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(-0.08, 0.075, -0.21, 0.035);
  s.quadraticCurveTo(-0.18, -0.055, -0.05, -0.065);
  s.closePath();

  const geo = new ExtrudeGeometry(s, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -0.005);
  return geo;
}

const BODY_GEO = createFishBodyGeometry();
const TAIL_FIN_GEO = createTailFinGeometry();
const DORSAL_FIN_GEO = createDorsalFinGeometry();
const ANAL_FIN_GEO = createAnalFinGeometry();
const PECTORAL_FIN_GEO = createPectoralFinGeometry();

export function PondFish({
  species,
  variant,
  index,
  leaping = false,
}: {
  species: FishSpecies;
  variant: FishVariant;
  index: number;
  leaping?: boolean;
}) {
  const fish = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const leftPec = useRef<Mesh>(null);
  const rightPec = useRef<Mesh>(null);
  const bodyMatRef = useRef<MeshStandardMaterial>(null);

  const phase = index * 2.39996; // Golden-angle spread across pond
  const size = variant === 'Giant' ? 1.24 : variant === 'Tiny' ? 0.62 : 0.8 + (index % 4) * 0.095;
  const profile = useMemo(() => getBodyProfile(species), [species]);

  const bodyScale: [number, number, number] =
    profile === 'elongated'
      ? [1.24, 0.72, 0.42]
      : profile === 'deep'
        ? [0.94, 1.12, 0.44]
        : [1.05, 0.9, 0.48];

  const { bodyColor, accentColor, finColor } = useMemo(() => {
    const jewel = VIBRANT_JEWEL_PALETTE[index % VIBRANT_JEWEL_PALETTE.length];

    const baseBody =
      variant === 'Standard'
        ? boostVibrantHex(species.color, jewel.body, 0.82, 0.48, 0.62)
        : variant === 'Rainbow'
          ? '#ff4d94'
          : variant === 'Cosmic'
            ? '#7c3aed'
            : variant === 'Corrupted'
              ? '#3f1d38'
              : boostVibrantHex(FISH_VARIANTS[variant].color, jewel.body, 0.85, 0.5, 0.68);

    const baseAccent =
      variant === 'Golden'
        ? '#fef08a'
        : variant === 'Corrupted'
          ? '#fb7185'
          : variant === 'Cosmic'
            ? '#f0abfc'
            : boostVibrantHex(species.accentColor, jewel.accent, 0.78, 0.6, 0.82);

    const baseFin =
      variant === 'Golden'
        ? '#f59e0b'
        : variant === 'Corrupted'
          ? '#e11d48'
          : variant === 'Rainbow'
            ? '#38bdf8'
            : boostVibrantHex(species.finColor, jewel.fin, 0.84, 0.48, 0.66);

    return { bodyColor: baseBody, accentColor: baseAccent, finColor: baseFin };
  }, [species.color, species.accentColor, species.finColor, variant, index]);

  const isLuminous =
    species.pattern === 'glow' ||
    variant === 'Glowing' ||
    variant === 'Cosmic' ||
    variant === 'Rainbow' ||
    variant === 'Corrupted' ||
    variant === 'Golden';

  // Distributed home centers & orbit radii across the expanded pond surface
  const orbit = useMemo(() => {
    const ring = index % 3;
    const baseAngle = index * 2.39996;
    const centerX = Math.cos(baseAngle) * (1.1 + ring * 1.32);
    const centerZ = Math.sin(baseAngle) * (0.72 + ring * 0.72);
    const xRange = 1.85 + (index % 3) * 0.65;
    const zRange = 0.98 + (index % 2) * 0.52;
    const swimSpeed = (profile === 'elongated' ? 0.38 : 0.31) + (index % 4) * 0.035;
    const baseDepth =
      species.preferredDepth === 'surface'
        ? 0.14
        : species.preferredDepth === 'deep'
          ? 0.02
          : 0.08;
    return { centerX, centerZ, xRange, zRange, swimSpeed, baseDepth };
  }, [index, profile, species.preferredDepth]);

  useFrame(({ clock }) => {
    if (!fish.current) return;
    const elapsed = clock.getElapsedTime();
    const time = elapsed * orbit.swimSpeed + phase;

    const rawX = orbit.centerX + Math.sin(time) * orbit.xRange;
    const rawZ = orbit.centerZ + Math.cos(time * 0.84) * orbit.zRange;
    // Clamp smoothly inside the irregular lake shoreline contour (zero allocations)
    const normX = rawX / LAKE_BASE_RX;
    const normZ = rawZ / LAKE_BASE_RZ;
    const normDist = Math.hypot(normX, normZ);
    const maxAllowed = 0.82 * sampleLakeContourFactor(Math.atan2(normZ, normX));
    const clampRatio = normDist > maxAllowed && normDist > 1e-5 ? maxAllowed / normDist : 1;
    const nextX = rawX * clampRatio;
    const nextZ = rawZ * clampRatio;

    const velocityX = Math.cos(time) * orbit.xRange * orbit.swimSpeed;
    const velocityZ = -Math.sin(time * 0.84) * orbit.zRange * 0.84 * orbit.swimSpeed;

    fish.current.position.x = nextX;
    fish.current.position.z = nextZ;

    if (leaping) {
      const leapWave = Math.sin(elapsed * 2.2 + phase);
      const leapHeight = Math.pow(Math.max(0, leapWave), 1.6) * 1.1;
      fish.current.position.y = 0.16 + leapHeight;
      fish.current.rotation.z = Math.cos(elapsed * 2.2 + phase) * 0.55;
    } else {
      fish.current.position.y =
        orbit.baseDepth + Math.sin(time * 1.35) * 0.035 + Math.sin(time * 0.55 + phase) * 0.015;
      fish.current.rotation.z = Math.sin(time * 1.5) * 0.04;
    }

    // Smooth yaw heading + subtle fish body wiggle
    const swimWiggle = Math.sin(elapsed * 6.8 + phase) * 0.055;
    fish.current.rotation.y = Math.atan2(-velocityZ, velocityX) + swimWiggle;
    fish.current.rotation.x = Math.sin(time * 0.9 + phase) * 0.035;

    if (tail.current) {
      tail.current.rotation.y = Math.sin(elapsed * 7.2 + phase) * 0.42;
      tail.current.rotation.z = Math.sin(elapsed * 3.6 + phase) * 0.06;
    }

    const finPaddle = Math.sin(elapsed * 4.5 + phase) * 0.25;
    if (leftPec.current) leftPec.current.rotation.y = 0.48 + finPaddle;
    if (rightPec.current) rightPec.current.rotation.y = -0.48 - finPaddle;

    if (variant === 'Rainbow' && bodyMatRef.current) {
      const hue = (elapsed * 0.14 + index * 0.17) % 1;
      bodyMatRef.current.color.setHSL(hue, 0.9, 0.56);
      bodyMatRef.current.emissive.setHSL(hue, 0.85, 0.42);
    }
  });

  const lengthScale = bodyScale[0];
  const heightScale = bodyScale[1];
  const widthScale = bodyScale[2];

  return (
    <group ref={fish} scale={size}>
      {/* Tapered hydrodynamic fish torso */}
      <mesh geometry={BODY_GEO} scale={bodyScale} castShadow>
        <meshStandardMaterial
          ref={bodyMatRef}
          color={bodyColor}
          roughness={0.28}
          metalness={variant === 'Golden' ? 0.55 : 0.14}
          emissive={isLuminous ? bodyColor : bodyColor}
          emissiveIntensity={isLuminous ? 0.34 : 0.16}
        />
      </mesh>

      {/* Lighter counter-shaded belly highlight */}
      <mesh
        geometry={BODY_GEO}
        position={[0, -0.04 * heightScale, 0]}
        scale={[lengthScale * 0.82, heightScale * 0.68, widthScale * 0.86]}
      >
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.14}
          roughness={0.36}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Curved gill-plate operculum ridges on both flanks */}
      {[-1, 1].map((side) => (
        <mesh
          key={`gill-${side}`}
          position={[0.24 * lengthScale, -0.01 * heightScale, side * 0.175 * widthScale]}
          rotation={[0, side * 0.18, -0.25]}
        >
          <torusGeometry args={[0.095 * heightScale, 0.008, 6, 14, Math.PI * 0.72]} />
          <meshStandardMaterial color={finColor} roughness={0.45} />
        </mesh>
      ))}

      {/* Expressive eyes on BOTH flanks */}
      {[-1, 1].map((side) => (
        <group
          key={`eye-${side}`}
          position={[0.36 * lengthScale, 0.045 * heightScale, side * 0.135 * widthScale]}
        >
          <mesh>
            <sphereGeometry args={[0.042, 10, 8]} />
            <meshStandardMaterial color="#fff9eb" roughness={0.2} />
          </mesh>
          <mesh position={[0.014, 0.004, side * 0.025]}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshStandardMaterial
              color={variant === 'Corrupted' ? '#ef4444' : variant === 'Golden' ? '#92400e' : '#0f172a'}
              roughness={0.15}
            />
          </mesh>
        </group>
      ))}

      {/* Species patterns along flanks */}
      {species.pattern === 'stripes' &&
        [-0.08, 0.04, 0.16].map((xOff, idx) => (
          <mesh
            key={`stripe-${idx}`}
            position={[xOff * lengthScale, 0.02 * heightScale, 0]}
            scale={[0.04, heightScale * 0.34, widthScale * 0.44]}
          >
            <torusGeometry args={[0.5, 0.12, 6, 16]} />
            <meshStandardMaterial color={accentColor} roughness={0.5} transparent opacity={0.75} />
          </mesh>
        ))}

      {species.pattern === 'spots' &&
        [
          [0.06, 0.07, 1],
          [-0.08, 0.05, -1],
          [0.14, 0.03, -1],
          [-0.02, 0.08, 1],
        ].map(([xOff, yOff, side], idx) => (
          <mesh
            key={`spot-${idx}`}
            position={[xOff * lengthScale, yOff * heightScale, side * 0.195 * widthScale]}
          >
            <sphereGeometry args={[0.028, 6, 6]} />
            <meshStandardMaterial color={accentColor} roughness={0.45} />
          </mesh>
        ))}

      {/* Catfish / Sturgeon whiskers (barbels) */}
      {species.pattern === 'whiskers' &&
        [-1, 1].map((side) => (
          <mesh
            key={`barbel-${side}`}
            position={[0.5 * lengthScale, -0.035, side * 0.055]}
            rotation={[side * 0.5, side * 0.4, -0.7]}
          >
            <cylinderGeometry args={[0.005, 0.012, 0.2, 6]} />
            <meshStandardMaterial color={accentColor} roughness={0.5} />
          </mesh>
        ))}

      {/* Swept Dorsal Fin */}
      <mesh
        geometry={DORSAL_FIN_GEO}
        position={[0.02 * lengthScale, 0.18 * heightScale, 0]}
        scale={[lengthScale * 0.95, heightScale * 0.95, 1]}
      >
        <meshStandardMaterial
          color={finColor}
          emissive={finColor}
          emissiveIntensity={isLuminous ? 0.28 : 0.14}
          roughness={0.36}
          transparent
          opacity={0.94}
          side={DoubleSide}
        />
      </mesh>

      {/* Ventral / Anal Fin */}
      <mesh
        geometry={ANAL_FIN_GEO}
        position={[-0.14 * lengthScale, -0.14 * heightScale, 0]}
        scale={[lengthScale * 0.9, heightScale * 0.9, 1]}
      >
        <meshStandardMaterial
          color={finColor}
          emissive={finColor}
          emissiveIntensity={isLuminous ? 0.28 : 0.14}
          roughness={0.38}
          transparent
          opacity={0.92}
          side={DoubleSide}
        />
      </mesh>

      {/* Paired Rowing Pectoral Fins */}
      <mesh
        ref={leftPec}
        geometry={PECTORAL_FIN_GEO}
        position={[0.2 * lengthScale, -0.055 * heightScale, 0.165 * widthScale]}
        rotation={[0.35, 0.48, -0.25]}
      >
        <meshStandardMaterial
          color={finColor}
          emissive={finColor}
          emissiveIntensity={isLuminous ? 0.28 : 0.14}
          roughness={0.38}
          transparent
          opacity={0.9}
          side={DoubleSide}
        />
      </mesh>
      <mesh
        ref={rightPec}
        geometry={PECTORAL_FIN_GEO}
        position={[0.2 * lengthScale, -0.055 * heightScale, -0.165 * widthScale]}
        rotation={[-0.35, -0.48, -0.25]}
      >
        <meshStandardMaterial
          color={finColor}
          emissive={finColor}
          emissiveIntensity={isLuminous ? 0.28 : 0.14}
          roughness={0.38}
          transparent
          opacity={0.9}
          side={DoubleSide}
        />
      </mesh>

      {/* Articulated Forked Caudal (Tail) Fin */}
      <group ref={tail} position={[-0.41 * lengthScale, 0, 0]}>
        <mesh geometry={TAIL_FIN_GEO} scale={[lengthScale * 0.92, heightScale * 0.98, 1]}>
          <meshStandardMaterial
            color={finColor}
            emissive={finColor}
            emissiveIntensity={isLuminous ? 0.28 : 0.14}
            roughness={0.35}
            transparent
            opacity={0.94}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
