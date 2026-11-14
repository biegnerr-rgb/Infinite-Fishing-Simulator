import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import './pond-scene.css';
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight as ThreeAmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight as ThreeDirectionalLight,
  DoubleSide,
  Fog as ThreeFog,
  Group,
  HemisphereLight as ThreeHemisphereLight,
  Line,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import {
  ActiveEvent,
  ActiveVisitorScene,
  FishSpecies,
  FishVariant,
  LocationDef,
  PondZone,
  SeasonType,
  TimeOfDay,
  VisitorType,
  WeatherType,
} from '../types/game';
import {
  DEFAULT_CUSTOMIZATION,
  FishermanCustomization,
} from '../data/cosmeticsData';
import {
  AmbientParticles,
  AnimatedWeather,
  AtmospherePalette,
  BackgroundForest,
  CelestialBodies,
  DistantRidge,
  DriftingClouds,
  getAtmospherePalette,
  getTargetHourForTimeOfDay,
  PondDragonflies,
  sampleCyclePalette,
  SceneEnvironmentRig,
  SkyDome,
  SoaringBirds,
} from './pond/PondAtmosphere';
import { Fisherman } from './pond/PondFishermanMesh';
import { PondFish } from './pond/PondFishMesh';
import { getBoatLayout, PlayerBoat } from './pond/PondBoatMesh';
import {
  clampInsideLakeXZ,
  createLakeBasinGeometry,
  createLakeDiscGeometry,
  createLakeRingGeometry,
  getLakeShorePoint,
  LAKE_BASE_RX,
  LAKE_BASE_RZ,
} from './pond/lakeGeometry';

// Pre-allocated scratch vectors for zero-GC animation updates
const _lineTip = new Vector3();
const _lineEnd = new Vector3();
const _linePt = new Vector3();
const _castReleasePos = new Vector3();
const _reelStartPos = new Vector3();
const _linePoints: Vector3[] = Array.from({ length: 13 }, () => new Vector3());

const NO_RAYCAST = () => null;

const ZONE_CAST_TARGETS: Record<PondZone, [number, number, number]> = {
  lily_pads: [-4.4, 0.36, -1.9],
  deep_water: [0.45, 0.36, -0.65],
  rocks_reef: [1.3, 0.36, 2.7],
  reeds: [4.6, 0.36, -0.6],
};

// Detect software WebGL once to adjust rendering cost (dpr, shadows) without changing scene content
const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

interface PondCanvasProps {
  location: LocationDef;
  availableFish: FishSpecies[];
  aquariumFish?: Array<{ species: FishSpecies; variant: FishVariant }>;
  isAquariumMode?: boolean;
  activeEvents: ActiveEvent[];
  isFishing: boolean;
  fishingState: 'idle' | 'casting' | 'waiting' | 'nibble' | 'hooked' | 'reeling';
  customization?: FishermanCustomization;
  boatTier?: number;
  bubblesMessage?: string;
  hasFloatingBottle?: boolean;
  timeOfDay?: TimeOfDay;
  weather?: WeatherType;
  season?: SeasonType;
  autoCycle?: boolean;
  selectedZone?: PondZone;
  activeVisitor?: ActiveVisitorScene | null;
  visitorName?: string;
  onManualCast: (clickX?: number, clickY?: number, zone?: PondZone) => void;
  onReelIn: () => void;
  onCollectChest?: () => void;
  onCollectRelic?: () => void;
  onCollectBottle?: () => void;
  onInteractBubbles?: () => void;
  onInteractVisitor?: (type: VisitorType) => void;
  onOpenShipyard?: () => void;
}

const ZONES: Record<PondZone, { title: string; hint: string }> = {
  lily_pads: { title: 'Lily pads', hint: 'Shallows & pearls' },
  deep_water: { title: 'Deep water', hint: 'Bigger fish below' },
  rocks_reef: { title: 'Rocky shore', hint: 'Relics & bottom fish' },
  reeds: { title: 'Reeds', hint: 'Shallows & lost tackle' },
};

const getZoneAt = (x: number, z: number): PondZone => {
  if (z > 2.0) return 'rocks_reef';
  if (x < -2.4 && z < 1.35) return 'lily_pads';
  if (x > 2.4 && z < 1.2) return 'reeds';
  return 'deep_water';
};

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const compact = size.width / size.height < 1.2;
    if (compact) {
      camera.position.set(0, 9.6, 20.6);
      camera.lookAt(0, 1.35, -1.4);
    } else {
      camera.position.set(0, 7.2, 15.8);
      camera.lookAt(0, 1.35, -1.6);
    }
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function Terrain({
  season,
  bedColor,
  locationId,
  palette,
  weather,
}: {
  season: SeasonType;
  bedColor: string;
  locationId: string;
  palette: AtmospherePalette;
  weather: WeatherType;
}) {
  // Deep forest-green trees & grass contrast strongly against the warm earthy brown/slate/sand ground
  const leafColor =
    locationId === 'alien_waters'
      ? '#9333ea'
      : locationId === 'midnight_deep'
        ? '#0f9488'
        : locationId === 'tropical_reef'
          ? '#2f7a3e'
          : locationId === 'crystal_lake'
            ? season === 'winter'
              ? '#4b736c'
              : '#235946'
            : season === 'autumn'
              ? '#b85d28'
              : season === 'winter'
                ? '#688582'
                : '#2f6b47';

  const grassColor =
    locationId === 'alien_waters'
      ? '#6d28d9'
      : locationId === 'midnight_deep'
        ? '#146968'
        : locationId === 'tropical_reef'
          ? '#4b8f44'
          : season === 'autumn'
            ? '#a3712e'
            : season === 'winter'
              ? '#8ba1ab'
              : '#467d3c';

  const trees = useMemo(
    () =>
      (
        [
          [-2.75, 1.12, false],
          [2.65, 0.88, false],
          [-2.05, 0.94, true],
          [-0.45, 1.08, false],
          [0.14, 0.9, false],
          [-1.08, 0.95, true],
        ] as const
      ).map(([angle, size, isPine]) => {
        const [x, z] = getLakeShorePoint(angle, 1.0, 1.65, 1.25);
        return [x, z, size, isPine] as const;
      }),
    []
  );

  const midgroundTrees = [
    [-11.8, -5.2, 1.15, true],
    [-8.8, -8.5, 1.05, false],
    [-12.6, -1.0, 1.0, true],
    [-11.0, 3.2, 0.9, false],
    [11.8, -5.0, 1.12, true],
    [9.2, -8.2, 1.02, false],
    [12.4, -0.6, 0.98, true],
    [11.0, 3.2, 0.92, false],
    [-6.2, -10.2, 1.08, true],
    [6.4, -10.0, 1.1, true],
  ] as const;

  const rocks = useMemo(
    () =>
      [
        [3.12, 0.54, 0.42],
        [2.48, 0.42, 0.35],
        [1.92, 0.34, 0.35],
        [-2.58, 0.38, 0.35],
        [-1.72, 0.42, 0.2], // North peninsula boulders
        [-1.56, 0.5, 0.12], // North headland tip
        [-1.36, 0.36, 0.22],
        [-0.78, 0.4, 0.38],
        [-0.08, 0.46, 0.42],
        [0.48, 0.48, 0.16], // SE rocky cape boulders
        [0.64, 0.56, 0.12],
        [0.82, 0.38, 0.26],
        [1.16, 0.34, 0.36],
        [1.62, 0.36, 0.34],
      ].map(([angle, size, pad]) => {
        const [x, z] = getLakeShorePoint(angle, 1.0, pad, pad * 0.72);
        return [x, z, size] as const;
      }),
    []
  );

  const basinWallGeo = useMemo(
    () => createLakeBasinGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 2.02, 1.46, 2.65, 1.95, 0.13, -0.62, 96),
    []
  );
  const bankSoilGeo = useMemo(
    () => createLakeDiscGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 1.0, 96, 4, 2.02, 1.46),
    []
  );
  const shoreSandGeo = useMemo(
    () => createLakeRingGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 0.94, 1.0, 96, 0, 1.12),
    []
  );

  useEffect(() => {
    return () => {
      basinWallGeo.dispose();
      bankSoilGeo.dispose();
      shoreSandGeo.dispose();
    };
  }, [basinWallGeo, bankSoilGeo, shoreSandGeo]);

  const rockMainColor =
    locationId === 'alien_waters'
      ? '#4b3b75'
      : locationId === 'midnight_deep'
        ? '#26384d'
        : locationId === 'crystal_lake'
          ? '#75828f'
          : '#71787d';
  const rockAltColor =
    locationId === 'alien_waters'
      ? '#6d4ca6'
      : locationId === 'midnight_deep'
        ? '#314c63'
        : locationId === 'tropical_reef'
          ? '#c7b08d'
          : '#8a857b';

  return (
    <group>
      {/* Distant meadow / earth ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color={palette.groundBase} roughness={0.98} />
      </mesh>
      {/* Organic lake basin wall matching irregular shore outline */}
      <mesh geometry={basinWallGeo} receiveShadow castShadow>
        <meshStandardMaterial color={bedColor || '#66482b'} roughness={0.95} />
      </mesh>
      {/* Rich damp bank soil border hugging the irregular lake coves */}
      <mesh geometry={bankSoilGeo} position={[0, 0.14, 0]} receiveShadow>
        <meshStandardMaterial color={palette.groundAccent} roughness={0.96} />
      </mesh>
      {/* Sandy / pebble shoreline rim following coves and capes */}
      <mesh geometry={shoreSandGeo} position={[0, 0.16, 0]} receiveShadow>
        <meshStandardMaterial color={palette.shoreSand} roughness={0.94} />
      </mesh>

      {/* Soft, low mounds blend the irregular lake bank into the surrounding terrain */}
      {Array.from({ length: 30 }, (_, index) => {
        const angle = (index / 30) * Math.PI * 2;
        const pad = 2.35 + Math.sin(index * 2.1) * 0.35;
        const [mx, mz] = getLakeShorePoint(angle, 1.0, pad, pad * 0.74);
        const width = 1.15 + (index % 3) * 0.3;
        return (
          <mesh
            key={`bank-mound-${index}`}
            position={[mx, -0.34, mz]}
            scale={[width, 0.25 + (index % 2) * 0.09, 0.95 + (index % 4) * 0.16]}
            rotation={[0, -angle, 0]}
            receiveShadow
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={index % 2 === 0 ? palette.groundBase : palette.groundAccent} roughness={1} />
          </mesh>
        );
      })}

      {/* Outer terrain knolls */}
      {[
        [-10.5, -0.45, -5.5, 3.2, 0.45, 2.6],
        [10.8, -0.45, -4.5, 3.5, 0.5, 2.8],
        [-11.2, -0.48, 3.5, 2.9, 0.38, 2.4],
        [11.0, -0.48, 3.2, 3.1, 0.42, 2.5],
      ].map(([x, y, z, sx, sy, sz], idx) => (
        <mesh key={`knoll-${idx}`} position={[x, y, z]} scale={[sx, sy, sz]} receiveShadow>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={palette.groundAccent} roughness={1} />
        </mesh>
      ))}

      {/* Mid-ground framing grove bridging pond shore into mountain foothills */}
      {midgroundTrees.map(([x, z, size, isPine], index) => (
        <Tree
          key={`midground-tree-${index}`}
          position={[x, -0.52, z]}
          scale={size}
          leafColor={leafColor}
          locationId={locationId}
          season={season}
          preferPine={isPine}
          windSpeed={weather === 'rain' ? 1.8 : 1.0}
          phase={index * 0.9}
        />
      ))}

      {/* Shore rocks & location crystals/coral */}
      {rocks.map(([x, z, size], index) => (
        <group key={`shore-rock-${index}`} position={[x, 0.35, z]}>
          <mesh scale={[size * 1.25, size * 0.78, size]} castShadow receiveShadow>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={index % 3 === 0 ? rockAltColor : rockMainColor} roughness={0.88} />
          </mesh>
          {locationId === 'tropical_reef' && index % 3 === 0 && (
            <mesh position={[0.12, 0.22, 0.08]} rotation={[0.2, index, -0.2]}>
              <coneGeometry args={[0.12, 0.36, 6]} />
              <meshStandardMaterial color={index % 2 === 0 ? '#fb7185' : '#fbbf24'} roughness={0.65} />
            </mesh>
          )}
          {(locationId === 'crystal_lake' || locationId === 'alien_waters' || locationId === 'midnight_deep') &&
            index % 4 === 0 && (
              <mesh position={[0.05, 0.28, 0]} rotation={[0.18, index * 0.7, 0.15]}>
                <octahedronGeometry args={[0.19, 0]} />
                <meshStandardMaterial
                  color={locationId === 'crystal_lake' ? '#bae6fd' : locationId === 'midnight_deep' ? '#2dd4bf' : '#e879f9'}
                  emissive={locationId === 'crystal_lake' ? '#38bdf8' : locationId === 'midnight_deep' ? '#0d9488' : '#c026d3'}
                  emissiveIntensity={locationId === 'crystal_lake' ? 0.25 : 0.65}
                  roughness={0.25}
                />
              </mesh>
            )}
        </group>
      ))}

      {/* Hero swaying shoreline trees */}
      {trees.map(([x, z, size, isPine], index) => (
        <Tree
          key={`tree-${index}`}
          position={[x, 0.25, z]}
          scale={size}
          leafColor={leafColor}
          locationId={locationId}
          season={season}
          preferPine={isPine}
          windSpeed={weather === 'rain' ? 1.85 : 1.0}
          phase={index * 1.4}
        />
      ))}

      {/* Swaying shoreline grass tufts & wildflowers hugging coves and points */}
      {Array.from({ length: 38 }, (_, index) => {
        const angle = (index / 38) * Math.PI * 2 + 0.08;
        const pad = 0.88 + Math.sin(index * 1.7) * 0.22;
        const [x, z] = getLakeShorePoint(angle, 1.0, pad, pad * 0.72);
        const hasFlower = index % 3 === 0 && season !== 'winter' && locationId !== 'midnight_deep';
        return (
          <SwayingGrassTuft
            key={`grass-${index}`}
            position={[x, 0.31, z]}
            rotationY={-angle}
            grassColor={grassColor}
            flowerColor={hasFlower ? (index % 2 ? '#f6d979' : '#f7d6e0') : undefined}
            phase={index * 0.65}
            windSpeed={weather === 'rain' ? 1.85 : 1.0}
          />
        );
      })}

      {/* Swaying cattails & reeds in the Reeds zone */}
      <ReedsCluster locationId={locationId} grassColor={grassColor} windSpeed={weather === 'rain' ? 1.9 : 1.0} />
    </group>
  );
}

function SwayingGrassTuft({
  position,
  rotationY,
  grassColor,
  flowerColor,
  phase,
  windSpeed,
}: {
  position: [number, number, number];
  rotationY: number;
  grassColor: string;
  flowerColor?: string;
  phase: number;
  windSpeed: number;
}) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(t * 1.55 * windSpeed + phase) * 0.085;
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {[0, 1, 2].map((blade) => (
        <mesh key={blade} position={[(blade - 1) * 0.09, 0.19 + (blade % 2) * 0.07, 0]} rotation={[0, 0, (blade - 1) * -0.2]} castShadow>
          <coneGeometry args={[0.075, 0.48, 5]} />
          <meshStandardMaterial color={grassColor} roughness={0.9} />
        </mesh>
      ))}
      {flowerColor && <Flower color={flowerColor} scale={0.48} position={[0.08, 0.31, 0.04]} />}
    </group>
  );
}

function ReedsCluster({
  locationId,
  grassColor,
  windSpeed,
}: {
  locationId: string;
  grassColor: string;
  windSpeed: number;
}) {
  const reeds = useMemo(
    () =>
      [
        [-0.42, 0.87, 1.02, true, 0.2],
        [-0.31, 0.9, 1.18, true, 0.9],
        [-0.19, 0.91, 0.92, false, 1.7],
        [-0.08, 0.88, 0.96, true, 2.3],
        [0.05, 0.87, 1.05, true, 3.1],
        [2.72, 0.87, 0.92, true, 1.1],
        [2.82, 0.84, 0.82, false, 2.5],
      ].map(([angle, s, h, cattail, phase]) => {
        const [x, z] = getLakeShorePoint(angle as number, s as number);
        return { x, z, h: h as number, cattail: cattail as boolean, phase: phase as number };
      }),
    []
  );
  const stalkRefs = useRef<Array<Group | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    stalkRefs.current.forEach((node, idx) => {
      if (!node) return;
      const s = reeds[idx];
      node.rotation.z = Math.sin(t * 1.45 * windSpeed + s.phase) * 0.11;
      node.rotation.x = Math.cos(t * 1.1 * windSpeed + s.phase) * 0.06;
    });
  });

  const stalkColor = locationId === 'alien_waters' ? '#7c3aed' : locationId === 'midnight_deep' ? '#0f766e' : grassColor;
  const tipColor = locationId === 'alien_waters' ? '#f472b6' : locationId === 'midnight_deep' ? '#5eead4' : '#6b4226';

  return (
    <group>
      {reeds.map((r, idx) => (
        <group
          key={`reed-${idx}`}
          ref={(el) => {
            stalkRefs.current[idx] = el;
          }}
          position={[r.x, 0.26, r.z]}
        >
          <mesh position={[0, r.h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.036, r.h, 6]} />
            <meshStandardMaterial color={stalkColor} roughness={0.85} />
          </mesh>
          {r.cattail && (
            <mesh position={[0, r.h * 0.84, 0]}>
              <capsuleGeometry args={[0.048, 0.16, 4, 8]} />
              <meshStandardMaterial
                color={tipColor}
                emissive={locationId === 'alien_waters' || locationId === 'midnight_deep' ? tipColor : '#000000'}
                emissiveIntensity={locationId === 'alien_waters' || locationId === 'midnight_deep' ? 0.35 : 0}
                roughness={0.78}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function Tree({
  position,
  scale,
  leafColor,
  locationId,
  season,
  preferPine = false,
  windSpeed,
  phase,
}: {
  position: [number, number, number];
  scale: number;
  leafColor: string;
  locationId: string;
  season: SeasonType;
  preferPine?: boolean;
  windSpeed: number;
  phase: number;
}) {
  const crownRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!crownRef.current) return;
    const t = clock.getElapsedTime();
    crownRef.current.rotation.z = Math.sin(t * 0.85 * windSpeed + phase) * 0.038;
    crownRef.current.rotation.x = Math.cos(t * 0.65 * windSpeed + phase) * 0.024;
  });

  if (locationId === 'crystal_lake' || (preferPine && locationId === 'little_pond')) {
    const coniferColor = locationId === 'little_pond' && season !== 'winter' ? '#22543d' : leafColor;
    return (
      <group position={position} scale={scale}>
        {/* Flared root collar & tapered trunk */}
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.34, 0.3, 8]} />
          <meshStandardMaterial color="#4a311e" roughness={0.96} />
        </mesh>
        <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.11, 0.22, 1.35, 8]} />
          <meshStandardMaterial color="#5c3f28" roughness={0.95} />
        </mesh>
        <group ref={crownRef} position={[0, 0.95, 0]}>
          {[
            { y: 0.36, r: 0.96, h: 1.18, rot: 0.1 },
            { y: 0.98, r: 0.78, h: 1.05, rot: 0.6 },
            { y: 1.54, r: 0.56, h: 0.92, rot: 1.1 },
            { y: 2.02, r: 0.34, h: 0.72, rot: 1.6 },
          ].map((tier, idx) => (
            <group key={idx} position={[0, tier.y, 0]} rotation={[0, tier.rot, 0]}>
              <mesh castShadow>
                <coneGeometry args={[tier.r, tier.h, 8]} />
                <meshStandardMaterial color={coniferColor} roughness={0.86} flatShading />
              </mesh>
              {season === 'winter' && (
                <mesh position={[0, tier.h * 0.18, 0]}>
                  <coneGeometry args={[tier.r * 0.72, tier.h * 0.52, 8]} />
                  <meshStandardMaterial color="#d8e6ed" roughness={0.82} flatShading />
                </mesh>
              )}
            </group>
          ))}
        </group>
      </group>
    );
  }

  if (locationId === 'tropical_reef') {
    return (
      <group position={position} scale={scale}>
        <mesh position={[0.08, 0.95, 0]} rotation={[0, 0, -0.14]} castShadow receiveShadow>
          <cylinderGeometry args={[0.11, 0.22, 1.95, 8]} />
          <meshStandardMaterial color="#7d583a" roughness={0.9} />
        </mesh>
        <group ref={crownRef} position={[0.2, 1.88, 0]}>
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            return (
              <group key={i} rotation={[0, angle, 0]}>
                <mesh position={[0.52, -0.04, 0]} rotation={[0, 0, -0.45]} scale={[1.15, 0.16, 0.42]} castShadow>
                  <sphereGeometry args={[0.55, 10, 8]} />
                  <meshStandardMaterial color={leafColor} roughness={0.78} />
                </mesh>
              </group>
            );
          })}
          <mesh position={[0.08, -0.16, 0.08]}>
            <sphereGeometry args={[0.13, 8, 8]} />
            <meshStandardMaterial color="#5c3a1d" roughness={0.85} />
          </mesh>
          <mesh position={[-0.1, -0.18, -0.05]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color="#5c3a1d" roughness={0.85} />
          </mesh>
        </group>
      </group>
    );
  }

  if (locationId === 'midnight_deep' || locationId === 'alien_waters') {
    const glowCol = locationId === 'alien_waters' ? '#f0abfc' : '#2dd4bf';
    return (
      <group position={position} scale={scale}>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.14, 0.25, 1.48, 8]} />
          <meshStandardMaterial color={locationId === 'alien_waters' ? '#3b2466' : '#1e3547'} roughness={0.85} />
        </mesh>
        <group ref={crownRef} position={[0, 1.48, 0]}>
          <mesh scale={[1.1, 0.52, 1.1]} castShadow>
            <sphereGeometry args={[0.85, 16, 12]} />
            <meshStandardMaterial
              color={leafColor}
              emissive={glowCol}
              emissiveIntensity={0.28}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0.36, 0]} scale={[0.68, 0.45, 0.68]}>
            <sphereGeometry args={[0.72, 14, 10]} />
            <meshStandardMaterial color={glowCol} emissive={glowCol} emissiveIntensity={0.45} roughness={0.4} />
          </mesh>
        </group>
      </group>
    );
  }

  // Sculpted broadleaf tree with flared root collar, forked boughs & rich multi-lobe foliage
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.38, 0.32, 8]} />
        <meshStandardMaterial color="#4a331e" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.25, 1.45, 8]} />
        <meshStandardMaterial color="#543b24" roughness={0.95} />
      </mesh>
      <mesh position={[-0.22, 1.24, 0.06]} rotation={[0, 0, 0.55]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.65, 6]} />
        <meshStandardMaterial color="#543b24" roughness={0.95} />
      </mesh>
      <mesh position={[0.22, 1.28, -0.05]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.62, 6]} />
        <meshStandardMaterial color="#543b24" roughness={0.95} />
      </mesh>
      <group ref={crownRef} position={[0, 1.48, 0]}>
        <mesh position={[0.08, 0.24, 0]} scale={[1.08, 0.92, 1.04]} castShadow>
          <dodecahedronGeometry args={[0.84, 1]} />
          <meshStandardMaterial color={leafColor} roughness={0.86} />
        </mesh>
        <mesh position={[-0.48, 0.02, 0.14]} scale={[0.76, 0.68, 0.74]} castShadow>
          <dodecahedronGeometry args={[0.78, 1]} />
          <meshStandardMaterial color={leafColor} roughness={0.88} />
        </mesh>
        <mesh position={[0.52, 0.06, -0.1]} scale={[0.74, 0.68, 0.72]} castShadow>
          <dodecahedronGeometry args={[0.78, 1]} />
          <meshStandardMaterial color={leafColor} roughness={0.88} />
        </mesh>
        <mesh position={[0.04, 0.74, 0.05]} scale={[0.68, 0.64, 0.68]} castShadow>
          <dodecahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial color={leafColor} roughness={0.85} />
        </mesh>
        {season === 'spring' && (
          <>
            <mesh position={[-0.25, 0.35, 0.62]}><sphereGeometry args={[0.11, 8, 8]} /><meshStandardMaterial color="#f9a8d4" roughness={0.6} /></mesh>
            <mesh position={[0.42, 0.22, 0.56]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#fcd34d" roughness={0.6} /></mesh>
          </>
        )}
      </group>
    </group>
  );
}

function Flower({ color, position = [0, 0, 0], scale = 1 }: { color: string; position?: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={index} position={[Math.cos(index * Math.PI * 0.4) * 0.12, 0, Math.sin(index * Math.PI * 0.4) * 0.12]} rotation={[0, index * Math.PI * 0.4, 0]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial color={color} roughness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 0.065, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#eab308" roughness={0.42} />
      </mesh>
    </group>
  );
}

function WaterSurface({
  color,
  deepColor,
  bedColor,
  shoreColor,
  onWaterClick,
  onWaterMove,
  onWaterLeave,
}: {
  color: string;
  deepColor: string;
  bedColor: string;
  shoreColor: string;
  onWaterClick: (event: ThreeEvent<MouseEvent>) => void;
  onWaterMove: (event: ThreeEvent<PointerEvent>) => void;
  onWaterLeave: () => void;
}) {
  const geometry = useMemo(() => createLakeDiscGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 1.0, 96, 16), []);
  const sandRimGeo = useMemo(() => createLakeDiscGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 1.0, 96, 4, 0.55, 0.42), []);
  const foamGeo = useMemo(() => createLakeRingGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 0.972, 1.004, 96), []);
  const bedGeo = useMemo(() => createLakeDiscGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 0.94, 72, 4), []);
  const causticGeo = useMemo(() => createLakeRingGeometry(LAKE_BASE_RX, LAKE_BASE_RZ, 0.28, 0.78, 48), []);

  const basePositions = useMemo(() => (geometry.attributes.position.array as Float32Array).slice(), [geometry]);
  const waterRef = useRef<Mesh>(null);
  const causticRef = useRef<Mesh>(null);
  const shoreFoamRef = useRef<Mesh>(null);

  useEffect(() => {
    return () => {
      geometry.dispose();
      sandRimGeo.dispose();
      foamGeo.dispose();
      bedGeo.dispose();
      causticGeo.dispose();
    };
  }, [geometry, sandRimGeo, foamGeo, bedGeo, causticGeo]);

  useFrame(({ clock }) => {
    const positions = geometry.attributes.position.array as Float32Array;
    const time = clock.getElapsedTime();
    for (let index = 0; index < positions.length; index += 3) {
      const x = basePositions[index];
      const z = basePositions[index + 2];
      const broadWave = Math.sin(x * 0.52 + z * 0.4 + time * 0.55) * 0.02;
      const crossingWave = Math.cos(z * 0.78 - x * 0.34 - time * 0.68) * 0.015;
      const smallWave = Math.sin(x * 1.25 + z * 1.0 - time * 0.92) * 0.006;
      positions[index + 1] = broadWave + crossingWave + smallWave;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    if (waterRef.current) waterRef.current.position.y = 0.35 + Math.sin(time * 0.42) * 0.008;
    if (causticRef.current) {
      causticRef.current.rotation.y = Math.sin(time * 0.25) * 0.04;
      const mat = causticRef.current.material as MeshBasicMaterial;
      mat.opacity = 0.16 + Math.sin(time * 1.1) * 0.04;
    }
    if (shoreFoamRef.current) {
      const foamMat = shoreFoamRef.current.material as MeshBasicMaterial;
      foamMat.opacity = 0.13 + Math.sin(time * 1.3) * 0.04;
    }
  });

  return (
    <group>
      {/* Sandy / pebble shoreline shelf */}
      <mesh geometry={sandRimGeo} position={[0, 0.2, 0]} receiveShadow>
        <meshStandardMaterial color={shoreColor} roughness={0.92} />
      </mesh>
      {/* Animated translucent irregular lake surface */}
      <mesh
        ref={waterRef}
        geometry={geometry}
        position={[0, 0.35, 0]}
        onClick={onWaterClick}
        onPointerMove={onWaterMove}
        onPointerLeave={onWaterLeave}
        receiveShadow
        renderOrder={2}
      >
        <meshPhysicalMaterial
          color={color}
          roughness={0.18}
          metalness={0.08}
          clearcoat={0.85}
          clearcoatRoughness={0.14}
          transparent
          opacity={0.56}
          depthWrite={false}
        />
      </mesh>
      {/* Subtle shoreline foam rim hugging every cove and point */}
      <mesh ref={shoreFoamRef} raycast={NO_RAYCAST} geometry={foamGeo} position={[0, 0.346, 0]}>
        <meshBasicMaterial color="#d8f5f2" transparent opacity={0.14} depthWrite={false} side={DoubleSide} />
      </mesh>
      {/* Subsurface water depth & caustic shimmer */}
      <mesh raycast={NO_RAYCAST} geometry={bedGeo} position={[0, -0.07, 0]}>
        <meshStandardMaterial color={bedColor} roughness={0.98} transparent opacity={0.48} />
      </mesh>
      <mesh ref={causticRef} raycast={NO_RAYCAST} geometry={causticGeo} position={[0, 0.11, 0]}>
        <meshBasicMaterial color={deepColor} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <WaterGlints />
      <WaterRipples />
    </group>
  );
}

function WaterGlints() {
  const glints = useRef<Array<Mesh | null>>([]);
  const positions: Array<{ position: [number, number, number]; rotation: number; phase: number }> = [
    { position: [-4.1, 0.385, -2.3], rotation: 0.35, phase: 0 },
    { position: [-1.2, 0.385, -3.7], rotation: -0.5, phase: 1.1 },
    { position: [2.8, 0.385, -3.1], rotation: 0.8, phase: 2.2 },
    { position: [4.3, 0.385, 0.9], rotation: -0.25, phase: 0.7 },
    { position: [1.1, 0.385, 2.8], rotation: 0.55, phase: 1.8 },
    { position: [-3.2, 0.385, 2.7], rotation: -0.75, phase: 2.8 },
  ];

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    glints.current.forEach((glint, index) => {
      if (!glint) return;
      const pulse = (Math.sin(time * 1.15 + positions[index].phase) + 1) / 2;
      glint.scale.set(0.65 + pulse * 0.5, 0.72 + pulse * 0.4, 1);
      const material = glint.material as MeshBasicMaterial;
      material.opacity = 0.03 + pulse * 0.12;
    });
  });

  return (
    <group>
      {positions.map((item, index) => (
        <mesh
          key={index}
          raycast={NO_RAYCAST}
          ref={(node) => {
            glints.current[index] = node;
          }}
          position={item.position}
          rotation={[-Math.PI / 2, 0, item.rotation]}
        >
          <circleGeometry args={[0.2, 20]} />
          <meshBasicMaterial color="#d9faf4" transparent opacity={0.08} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function WaterRipples() {
  const rings = useRef<Array<Mesh | null>>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    rings.current.forEach((ring, index) => {
      if (!ring) return;
      const phase = (time * 0.18 + index * 0.31) % 1;
      ring.scale.setScalar(0.35 + phase * 1.5);
      const material = ring.material as MeshBasicMaterial;
      material.opacity = (1 - phase) * 0.18;
    });
  });
  const positions: [number, number, number][] = [
    [-2.4, 0.36, -0.75],
    [2.7, 0.36, -2.0],
    [1.15, 0.36, 1.85],
    [-0.4, 0.36, -2.4],
  ];
  return (
    <group>
      {positions.map((position, index) => (
        <mesh key={index} raycast={NO_RAYCAST} ref={(node) => { rings.current[index] = node; }} position={position} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.38, 40]} />
          <meshBasicMaterial color="#c8f7e8" transparent opacity={0.14} side={DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function LilyPad({
  position,
  size,
  flowerColor,
  rotation,
  phase,
}: {
  position: [number, number, number];
  size: number;
  flowerColor?: string;
  rotation: number;
  phase: number;
}) {
  const padRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!padRef.current) return;
    const t = clock.getElapsedTime();
    padRef.current.position.y = position[1] + Math.sin(t * 1.15 + phase) * 0.015;
    padRef.current.rotation.z = Math.sin(t * 0.8 + phase) * 0.025;
    padRef.current.rotation.x = Math.cos(t * 0.7 + phase) * 0.02;
  });

  return (
    <group ref={padRef} position={position}>
      <mesh raycast={NO_RAYCAST} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, rotation]} receiveShadow>
        <circleGeometry args={[size, 32]} />
        <meshStandardMaterial color="#588f33" roughness={0.48} side={DoubleSide} />
      </mesh>
      <mesh raycast={NO_RAYCAST} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, rotation]}>
        <ringGeometry args={[size * 0.88, size * 0.94, 32]} />
        <meshStandardMaterial color="#87b844" roughness={0.46} side={DoubleSide} />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 1.55 - Math.PI * 0.78 + rotation;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * size * 0.39, 0.027, Math.sin(angle) * size * 0.39]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <boxGeometry args={[size * 0.58, 0.012, 0.012]} />
            <meshStandardMaterial color="#8db54e" roughness={0.55} />
          </mesh>
        );
      })}
      <mesh position={[size * 0.05, 0.03, size * 0.04]} rotation={[-Math.PI / 2, 0, rotation]}>
        <circleGeometry args={[size * 0.055, 12]} />
        <meshStandardMaterial color="#b9cf72" roughness={0.5} />
      </mesh>
      {flowerColor && <Flower color={flowerColor} position={[size * 0.22, 0.12, size * 0.12]} scale={0.65} />}
    </group>
  );
}

function LilyPads({ locationId }: { locationId: string }) {
  if (locationId === 'midnight_deep') return null;
  const pads: Array<{ position: [number, number, number]; size: number; color?: string; rotation: number }> = [
    { position: [-5.6, 0.35, -2.0], size: 0.62, color: '#f6e7d3', rotation: 0.4 },
    { position: [-6.35, 0.34, -0.95], size: 0.52, rotation: 1.2 },
    { position: [-5.1, 0.34, -0.7], size: 0.46, color: '#f5c8d5', rotation: 2.1 },
    { position: [4.55, 0.34, -2.8], size: 0.56, color: '#f5e8d6', rotation: 2.7 },
    { position: [5.4, 0.34, -2.15], size: 0.46, rotation: 0.7 },
    { position: [1.3, 0.34, 3.65], size: 0.54, rotation: 1.9 },
    { position: [2.25, 0.34, 4.0], size: 0.44, color: '#f5c8d5', rotation: 0.1 },
  ];
  return (
    <group>
      {pads.map((pad, index) => (
        <LilyPad
          key={index}
          position={pad.position}
          size={pad.size}
          flowerColor={pad.color}
          rotation={pad.rotation}
          phase={index * 0.85}
        />
      ))}
    </group>
  );
}

function FishingLine({
  target,
  active,
  fishingState,
  rodTipRef,
}: {
  target: [number, number, number] | null;
  active: boolean;
  fishingState: PondCanvasProps['fishingState'];
  rodTipRef: MutableRefObject<Group | null>;
}) {
  const geometry = useMemo(() => new BufferGeometry(), []);
  const line = useMemo(() => new Line(geometry), [geometry]);
  const bobberRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const splashRingRef = useRef<Mesh>(null);
  const dropletsRef = useRef<Array<Mesh | null>>([]);

  const castElapsedRef = useRef(0);
  const reelElapsedRef = useRef(0);
  const splashElapsedRef = useRef(-1);
  const releaseCapturedRef = useRef(false);

  useEffect(() => {
    if (fishingState === 'casting') {
      castElapsedRef.current = 0;
      splashElapsedRef.current = -1;
      releaseCapturedRef.current = false;
    } else if (fishingState === 'reeling') {
      reelElapsedRef.current = 0;
      const tx = target ? target[0] : 0.35;
      const tz = target ? target[2] : -0.45;
      _reelStartPos.set(tx, 0.36, tz);
    }
  }, [fishingState, target]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.08);
    const time = clock.getElapsedTime();
    const tx = target ? target[0] : 0.35;
    const tz = target ? target[2] : -0.45;

    const idle = fishingState === 'idle';
    const casting = fishingState === 'casting';
    const reeling = fishingState === 'reeling';
    const hooked = fishingState === 'hooked';
    const nibbling = fishingState === 'nibble';
    const tension = hooked || reeling;

    if (rodTipRef.current) {
      rodTipRef.current.getWorldPosition(_lineTip);
    } else {
      _lineTip.set(-0.55, 3.45, 1.9);
    }

    let lineSag = 0.04;

    if (idle) {
      // Hang bobber peacefully just beneath the rod tip when idle/ready to cast
      _lineEnd.set(
        _lineTip.x + Math.sin(time * 1.4) * 0.032,
        _lineTip.y - 0.44,
        _lineTip.z + Math.cos(time * 1.1) * 0.028
      );
      lineSag = 0.025;
      if (ringRef.current) ringRef.current.visible = false;
    } else if (casting) {
      castElapsedRef.current += dt;
      const castT = Math.min(1, castElapsedRef.current / 0.9);

      if (castT < 0.28) {
        // Wind-up backswing: bobber trails near the cocked rod tip
        _lineEnd.set(
          _lineTip.x - 0.08,
          _lineTip.y - 0.34,
          _lineTip.z + 0.14
        );
        _castReleasePos.copy(_lineEnd);
        lineSag = 0.03;
      } else if (castT < 0.78) {
        if (!releaseCapturedRef.current) {
          _castReleasePos.copy(_lineTip);
          releaseCapturedRef.current = true;
        }
        // Parabolic ballistic flight from rod tip out to pond target
        const rawFlight = (castT - 0.28) / 0.5;
        const flightT = 1 - Math.pow(1 - rawFlight, 1.85);
        const dist = Math.hypot(tx - _castReleasePos.x, tz - _castReleasePos.z);
        const arcHeight = 1.25 + dist * 0.22;

        _lineEnd.lerpVectors(_castReleasePos, _linePt.set(tx, 0.36, tz), flightT);
        _lineEnd.y += Math.sin(Math.PI * flightT) * arcHeight;
        lineSag = -0.22 * Math.sin(Math.PI * flightT);
      } else {
        // Splashdown impact!
        if (splashElapsedRef.current < 0) splashElapsedRef.current = 0;
        const impactT = (castT - 0.78) / 0.12;
        const splashDip = -Math.sin(Math.min(1, impactT) * Math.PI) * 0.09;
        _lineEnd.set(tx, 0.36 + splashDip, tz);
        lineSag = 0.24;
      }
    } else if (reeling) {
      reelElapsedRef.current += dt;
      const reelT = Math.min(1, reelElapsedRef.current / 0.55);
      const easeReel = reelT * reelT * (3 - 2 * reelT);
      _lineEnd.lerpVectors(_reelStartPos, _lineTip, easeReel * 0.86);
      _lineEnd.y = Math.max(0.36, _lineEnd.y + Math.sin(Math.PI * easeReel) * 0.28);
      lineSag = 0.06;
    } else {
      // Waiting / nibble / hooked in the water
      const sway = Math.sin(time * 1.15) * (tension ? 0.025 : 0.055);
      const bobDip = hooked
        ? -0.095 + Math.sin(time * 13) * 0.045
        : nibbling
          ? Math.sin(time * 9) * 0.055
          : Math.sin(time * 2.1) * 0.018;
      _lineEnd.set(tx + sway, 0.355 + bobDip, tz);
      lineSag = tension ? 0.06 : 0.32;
    }

    if (bobberRef.current) {
      bobberRef.current.position.copy(_lineEnd);
      bobberRef.current.rotation.z = idle
        ? Math.sin(time * 1.4) * 0.08
        : Math.sin(time * 2.4) * (nibbling || hooked ? 0.32 : 0.08);
    }

    // Ripple ring on water while line is in pond
    if (ringRef.current) {
      const inWater = !idle && !reeling && (!casting || castElapsedRef.current >= 0.7);
      ringRef.current.visible = inWater && active;
      if (inWater && active) {
        const pulse = (time * (hooked ? 2.1 : nibbling ? 1.2 : 0.65)) % 1;
        ringRef.current.position.set(_lineEnd.x, 0.365, _lineEnd.z);
        ringRef.current.scale.setScalar(0.4 + pulse * (hooked ? 2.1 : 1.0));
        const mat = ringRef.current.material as MeshBasicMaterial;
        mat.opacity = (1 - pulse) * (hooked ? 0.65 : nibbling ? 0.45 : 0.24);
      }
    }

    // Cast impact splash ring + 5 splash droplets
    if (splashElapsedRef.current >= 0) {
      splashElapsedRef.current += dt;
      const st = splashElapsedRef.current / 0.65;
      if (st >= 1) {
        splashElapsedRef.current = -1;
        if (splashRingRef.current) splashRingRef.current.visible = false;
        dropletsRef.current.forEach((d) => {
          if (d) d.visible = false;
        });
      } else {
        if (splashRingRef.current) {
          splashRingRef.current.visible = true;
          splashRingRef.current.position.set(tx, 0.37, tz);
          splashRingRef.current.scale.setScalar(0.35 + st * 2.6);
          const smat = splashRingRef.current.material as MeshBasicMaterial;
          smat.opacity = (1 - st) * 0.72;
        }
        dropletsRef.current.forEach((drop, idx) => {
          if (!drop) return;
          drop.visible = true;
          const ang = (idx / 5) * Math.PI * 2 + 0.4;
          const rad = st * (0.28 + (idx % 2) * 0.14);
          const lift = Math.sin(Math.PI * st) * (0.34 + (idx % 3) * 0.08);
          drop.position.set(tx + Math.cos(ang) * rad, 0.36 + lift, tz + Math.sin(ang) * rad);
          drop.scale.setScalar(1 - st * 0.6);
        });
      }
    } else {
      if (splashRingRef.current) splashRingRef.current.visible = false;
      dropletsRef.current.forEach((d) => {
        if (d) d.visible = false;
      });
    }

    for (let index = 0; index <= 12; index++) {
      const t = index / 12;
      _linePt.copy(_lineTip).lerp(_lineEnd, t);
      _linePt.y -= Math.sin(Math.PI * t) * lineSag;
      if (!idle) {
        _linePt.x += Math.sin(Math.PI * t) * Math.sin(time * 1.4) * 0.025;
      }
      _linePoints[index].copy(_linePt);
    }
    geometry.setFromPoints(_linePoints);
  });

  return (
    <group>
      <primitive object={line}>
        <lineBasicMaterial attach="material" color="#fff1cf" transparent opacity={0.82} />
      </primitive>
      <group ref={bobberRef}>
        <mesh position={[0, 0.035, 0]} castShadow>
          <sphereGeometry args={[0.075, 12, 10]} />
          <meshStandardMaterial color="#ef4444" roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.025, 0]}>
          <sphereGeometry args={[0.072, 12, 10]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.4} />
        </mesh>
      </group>
      <mesh ref={ringRef} raycast={NO_RAYCAST} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.19, 24]} />
        <meshBasicMaterial color="#fef9c3" transparent opacity={0.3} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={splashRingRef} raycast={NO_RAYCAST} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.21, 28]} />
        <meshBasicMaterial color="#e0f7ff" transparent opacity={0.7} side={DoubleSide} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3, 4].map((idx) => (
        <mesh
          key={`drop-${idx}`}
          raycast={NO_RAYCAST}
          visible={false}
          ref={(el) => {
            dropletsRef.current[idx] = el;
          }}
        >
          <sphereGeometry args={[0.032, 6, 6]} />
          <meshBasicMaterial color="#e6fbff" transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

const SCHOOL_VARIANT_PATTERN: FishVariant[] = [
  'Standard',
  'Standard',
  'Golden',
  'Standard',
  'Glowing',
  'Standard',
  'Rainbow',
  'Standard',
  'Standard',
  'Glowing',
  'Standard',
  'Golden',
  'Standard',
  'Rainbow',
  'Standard',
  'Cosmic',
  'Standard',
  'Standard',
];

function FishSchool({ fish, aquariumFish, isAquariumMode }: {
  fish: FishSpecies[];
  aquariumFish: Array<{ species: FishSpecies; variant: FishVariant }>;
  isAquariumMode: boolean;
}) {
  const visibleFish = useMemo(() => {
    if (isAquariumMode) {
      return aquariumFish.slice(0, 24);
    }
    if (fish.length === 0) return [];
    return Array.from({ length: 18 }, (_, idx) => ({
      species: fish[idx % fish.length],
      variant: SCHOOL_VARIANT_PATTERN[idx % SCHOOL_VARIANT_PATTERN.length],
    }));
  }, [fish, aquariumFish, isAquariumMode]);

  return <group>{visibleFish.map((item, index) => <PondFish key={`${item.species.id}-${index}`} species={item.species} variant={item.variant} index={index} />)}</group>;
}

function Visitor({ visitor, name, onClick }: { visitor: ActiveVisitorScene; name?: string; onClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const root = useRef<Group>(null);
  const [x, z] = clampInsideLakeXZ((visitor.x - 0.5) * 14.5, (visitor.y - 0.5) * 9.0, 0.84);
  const colors = {
    frog: '#75bd4f',
    duck: '#f4cf68',
    otter: '#a87550',
    raccoon: '#858b89',
    crab: '#e98261',
    turtle: '#72965c',
  };
  const animalColor = colors[visitor.type] || '#72965c';
  const darkColor = visitor.type === 'raccoon' ? '#343d3e' : visitor.type === 'frog' ? '#4b873e' : '#76503b';
  const eyeWhite = '#fff8e9';
  const pupil = '#24312c';

  useFrame(({ clock }) => {
    if (root.current) {
      const t = clock.getElapsedTime();
      root.current.position.y = 0.44 + Math.sin(t * 2.1) * 0.025;
      root.current.rotation.y = Math.sin(t * 0.7) * 0.045;
    }
  });

  const eyes = (eyeX: number, eyeY: number, eyeZ: number, size = 0.052) => (
    <>
      <mesh position={[eyeX, eyeY, eyeZ]}><sphereGeometry args={[size, 12, 10]} /><meshStandardMaterial color={eyeWhite} /></mesh>
      <mesh position={[eyeX + 0.018, eyeY - 0.003, eyeZ + size * 0.48]}><sphereGeometry args={[size * 0.56, 10, 8]} /><meshStandardMaterial color={pupil} /></mesh>
      <mesh position={[eyeX + 0.026, eyeY + size * 0.22, eyeZ + size * 0.82]}><sphereGeometry args={[size * 0.17, 8, 6]} /><meshBasicMaterial color="white" /></mesh>
    </>
  );

  return (
    <group ref={root} position={[x, 0.44, z]} onClick={(event) => { event.stopPropagation(); onClick(event); }}>
      {visitor.type === 'frog' && (
        <>
          <mesh position={[-0.04, 0.13, 0]} scale={[1.28, 0.78, 0.92]} castShadow>
            <sphereGeometry args={[0.27, 18, 14]} /><meshStandardMaterial color={animalColor} roughness={0.68} />
          </mesh>
          <mesh position={[0.23, 0.22, 0]} scale={[0.9, 0.78, 0.9]} castShadow>
            <sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color={animalColor} />
          </mesh>
          {[ -0.12, 0.19 ].map((eyeZ) => (
            <React.Fragment key={eyeZ}>
              <mesh position={[0.16, 0.39, eyeZ]}><sphereGeometry args={[0.085, 12, 10]} /><meshStandardMaterial color={animalColor} /></mesh>
              {eyes(0.19, 0.4, eyeZ + 0.035, 0.046)}
            </React.Fragment>
          ))}
          <mesh position={[0.39, 0.18, 0.015]} scale={[0.72, 0.42, 0.55]}><sphereGeometry args={[0.1, 12, 8]} /><meshStandardMaterial color="#a9d96f" /></mesh>
          {[[-0.2, -0.08, -0.2],[-0.2, -0.08, 0.2],[0.22, -0.08, -0.2],[0.22, -0.08, 0.2]].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]} scale={[0.9, 0.62, 0.75]}><sphereGeometry args={[0.105, 10, 8]} /><meshStandardMaterial color={animalColor} /></mesh>
          ))}
        </>
      )}

      {visitor.type === 'duck' && (
        <>
          <mesh position={[-0.06, 0.13, 0]} scale={[1.28, 0.88, 0.88]} castShadow>
            <sphereGeometry args={[0.28, 18, 14]} /><meshStandardMaterial color={animalColor} roughness={0.7} />
          </mesh>
          <mesh position={[0.2, 0.32, 0]} scale={[0.78, 0.95, 0.78]} castShadow>
            <sphereGeometry args={[0.17, 16, 12]} /><meshStandardMaterial color={animalColor} />
          </mesh>
          {eyes(0.29, 0.36, 0.105, 0.035)}
          <mesh position={[0.42, 0.26, 0.015]} rotation={[0, 0, -0.12]} scale={[1, 0.42, 0.55]}><coneGeometry args={[0.105, 0.22, 8]} /><meshStandardMaterial color="#e58a3e" /></mesh>
          <mesh position={[-0.1, 0.2, 0.22]} rotation={[0.08, 0, -0.12]} scale={[0.8, 0.35, 0.25]}><sphereGeometry args={[0.19, 14, 10]} /><meshStandardMaterial color="#ffe49a" /></mesh>
          <mesh position={[-0.1, 0.2, -0.22]} rotation={[-0.08, 0, -0.12]} scale={[0.8, 0.35, 0.25]}><sphereGeometry args={[0.19, 14, 10]} /><meshStandardMaterial color="#ffe49a" /></mesh>
          {[-0.13, 0.12].map((zPos) => <mesh key={zPos} position={[0.02, -0.13, zPos]}><boxGeometry args={[0.055, 0.08, 0.045]} /><meshStandardMaterial color="#e58a3e" /></mesh>)}
        </>
      )}

      {visitor.type === 'otter' && (
        <>
          <mesh position={[-0.08, 0.11, 0]} scale={[1.55, 0.68, 0.78]} castShadow>
            <sphereGeometry args={[0.25, 18, 14]} /><meshStandardMaterial color={animalColor} roughness={0.78} />
          </mesh>
          <mesh position={[0.25, 0.25, 0]} scale={[0.92, 0.86, 0.82]} castShadow>
            <sphereGeometry args={[0.18, 16, 12]} /><meshStandardMaterial color={animalColor} />
          </mesh>
          <mesh position={[0.4, 0.17, 0.02]} scale={[0.8, 0.55, 0.68]}><sphereGeometry args={[0.105, 12, 10]} /><meshStandardMaterial color="#e5c5a0" /></mesh>
          {eyes(0.31, 0.29, 0.13, 0.033)}
          <mesh position={[0.48, 0.19, 0.03]}><sphereGeometry args={[0.035, 10, 8]} /><meshStandardMaterial color="#352b27" /></mesh>
          {[-0.1, 0.12].map((zPos) => <mesh key={zPos} position={[0.31, 0.37, zPos]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color={animalColor} /></mesh>)}
          <mesh position={[-0.42, 0.07, 0]} rotation={[0, 0, -0.28]} scale={[1.8, 0.42, 0.5]}><sphereGeometry args={[0.14, 14, 10]} /><meshStandardMaterial color={animalColor} /></mesh>
          {[[-0.2, -0.06, -0.15],[0.13, -0.06, 0.15]].map((p, i) => <mesh key={i} position={p as [number, number, number]}><sphereGeometry args={[0.075, 10, 8]} /><meshStandardMaterial color="#e5c5a0" /></mesh>)}
        </>
      )}

      {visitor.type === 'raccoon' && (
        <>
          <mesh position={[-0.05, 0.13, 0]} scale={[1.25, 0.82, 0.88]} castShadow>
            <sphereGeometry args={[0.26, 18, 14]} /><meshStandardMaterial color={animalColor} roughness={0.82} />
          </mesh>
          <mesh position={[0.23, 0.28, 0]} scale={[0.92, 0.9, 0.9]} castShadow>
            <sphereGeometry args={[0.18, 16, 12]} /><meshStandardMaterial color="#9da19d" />
          </mesh>
          {[-0.11, 0.13].map((zPos) => <mesh key={zPos} position={[0.12, 0.43, zPos]} rotation={[0, 0, -0.18]}><coneGeometry args={[0.075, 0.18, 8]} /><meshStandardMaterial color="#747b79" /></mesh>)}
          <mesh position={[0.37, 0.29, 0.015]} scale={[0.55, 0.32, 1.15]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color={darkColor} /></mesh>
          {eyes(0.4, 0.31, 0.13, 0.035)}
          <mesh position={[0.45, 0.18, 0.04]} scale={[0.72, 0.5, 0.72]}><sphereGeometry args={[0.09, 12, 10]} /><meshStandardMaterial color="#d7d0c4" /></mesh>
          <mesh position={[0.52, 0.2, 0.045]}><sphereGeometry args={[0.027, 8, 8]} /><meshStandardMaterial color="#252a29" /></mesh>
          <mesh position={[-0.43, 0.12, 0]} rotation={[0, 0, -0.18]} scale={[1.8, 0.42, 0.5]}><cylinderGeometry args={[0.055, 0.09, 0.42, 10]} /><meshStandardMaterial color="#737b79" /></mesh>
          {[-0.12, 0.04, 0.2].map((zPos, i) => <mesh key={zPos} position={[-0.52 + i * 0.09, 0.12, 0.015]} rotation={[0, 0, -0.18]}><torusGeometry args={[0.075, 0.018, 6, 12]} /><meshStandardMaterial color="#343b3b" /></mesh>)}
        </>
      )}

      {visitor.type === 'crab' && (
        <>
          <mesh position={[0, 0.08, 0]} scale={[1.18, 0.58, 1.05]} castShadow>
            <sphereGeometry args={[0.27, 18, 12]} /><meshStandardMaterial color={animalColor} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.22, 0]} scale={[1.05, 0.28, 0.92]}><sphereGeometry args={[0.25, 16, 10]} /><meshStandardMaterial color="#f49b78" /></mesh>
          {[-0.13, 0.13].map((zPos) => (
            <React.Fragment key={zPos}>
              <mesh position={[0.17, 0.36, zPos]}><cylinderGeometry args={[0.018, 0.025, 0.16, 8]} /><meshStandardMaterial color="#d96d53" /></mesh>
              {eyes(0.19, 0.45, zPos, 0.035)}
              <mesh position={[0.24, 0.16, zPos * 2.2]} rotation={[0, 0, -0.55]}><capsuleGeometry args={[0.055, 0.12, 4, 8]} /><meshStandardMaterial color={animalColor} /></mesh>
              <mesh position={[0.34, 0.25, zPos * 2.35]}><sphereGeometry args={[0.095, 12, 10]} /><meshStandardMaterial color="#f39a76" /></mesh>
            </React.Fragment>
          ))}
          {[-0.22, -0.08, 0.08, 0.22].flatMap((zPos, i) => [-1, 1].map((side) => (
            <mesh key={`${zPos}-${side}`} position={[-0.02 + (i % 2) * 0.04, -0.03, zPos * side]} rotation={[side * 0.12, 0, side * (i < 2 ? -0.42 : 0.42)]}>
              <capsuleGeometry args={[0.025, 0.17, 3, 6]} /><meshStandardMaterial color="#d96d53" />
            </mesh>
          )))}
        </>
      )}

      {visitor.type === 'turtle' && (
        <>
          <mesh position={[-0.07, 0.15, 0]} scale={[1.12, 0.62, 0.92]} castShadow>
            <sphereGeometry args={[0.27, 18, 14]} /><meshStandardMaterial color="#6f985c" roughness={0.8} />
          </mesh>
          <mesh position={[-0.08, 0.29, 0]} scale={[1.12, 0.58, 0.96]} castShadow>
            <sphereGeometry args={[0.25, 18, 14]} /><meshStandardMaterial color="#8a6948" roughness={0.88} />
          </mesh>
          <mesh position={[-0.08, 0.43, 0]} scale={[0.82, 0.12, 0.72]}><sphereGeometry args={[0.22, 14, 10]} /><meshStandardMaterial color="#b28b5d" roughness={0.9} /></mesh>
          <mesh position={[0.3, 0.2, 0]} scale={[0.92, 0.78, 0.78]} castShadow><sphereGeometry args={[0.16, 14, 10]} /><meshStandardMaterial color="#80a963" /></mesh>
          {eyes(0.39, 0.25, 0.11, 0.03)}
          <mesh position={[0.45, 0.16, 0.03]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#496d42" /></mesh>
          {[[-0.23, 0.02, -0.2],[-0.23, 0.02, 0.2],[0.13, 0.02, -0.2],[0.13, 0.02, 0.2]].map((p, i) => <mesh key={i} position={p as [number, number, number]} scale={[0.82, 0.7, 0.82]}><sphereGeometry args={[0.095, 10, 8]} /><meshStandardMaterial color="#71965a" /></mesh>)}
          <mesh position={[-0.4, 0.08, 0]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.06, 0.18, 8]} /><meshStandardMaterial color="#71965a" /></mesh>
        </>
      )}

      {name && <mesh position={[0, 0.78, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#f7e7b4" emissive="#f7e7b4" emissiveIntensity={0.5} /></mesh>}
    </group>
  );
}

function Collectible({ type, position, onCollect }: {
  type: 'chest' | 'relic' | 'bottle';
  position: [number, number, number];
  onCollect: () => void;
}) {
  const item = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (item.current) {
      item.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2.2) * 0.09;
      item.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.75) * 0.16;
    }
  });
  return (
    <group ref={item} position={position} onClick={(event) => { event.stopPropagation(); onCollect(); }}>
      {type === 'chest' && (
        <>
          <mesh castShadow><boxGeometry args={[0.5, 0.36, 0.36]} /><meshStandardMaterial color="#9a5e2e" roughness={0.7} /></mesh>
          <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.52, 0.1, 0.38]} /><meshStandardMaterial color="#e4b54c" metalness={0.35} roughness={0.4} /></mesh>
          <mesh position={[0, -0.02, 0.19]}><boxGeometry args={[0.09, 0.13, 0.04]} /><meshStandardMaterial color="#f4d078" metalness={0.55} roughness={0.35} /></mesh>
        </>
      )}
      {type === 'relic' && <mesh castShadow><dodecahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color="#f1b947" emissive="#cc7b24" emissiveIntensity={0.32} metalness={0.28} roughness={0.38} /></mesh>}
      {type === 'bottle' && (
        <>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.14, 0.55, 12]} /><meshStandardMaterial color="#78b7a3" transparent opacity={0.78} roughness={0.22} /></mesh>
          <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.12, 10]} /><meshStandardMaterial color="#bd8350" roughness={0.8} /></mesh>
        </>
      )}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.22, 0.31, 24]} /><meshBasicMaterial color="#fff4c6" transparent opacity={0.5} side={DoubleSide} /></mesh>
    </group>
  );
}

function GiantShadow() {
  const shadow = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (shadow.current) shadow.current.position.x = Math.sin(clock.getElapsedTime() * 0.22) * 3.8;
  });
  return (
    <mesh ref={shadow} position={[0, -0.02, -0.45]} scale={[3.4, 0.08, 0.85]}>
      <sphereGeometry args={[1, 24, 12]} />
      <meshBasicMaterial color="#173f4c" transparent opacity={0.38} depthWrite={false} />
    </mesh>
  );
}

function PondScene({
  location,
  availableFish,
  aquariumFish,
  isAquariumMode,
  activeEvents,
  customization,
  boatTier,
  timeOfDay,
  weather,
  season,
  autoCycle,
  castTarget,
  fishingState,
  activeVisitor,
  visitorName,
  onWaterClick,
  onWaterMove,
  onWaterLeave,
  onCollectChest,
  onCollectRelic,
  onCollectBottle,
  onInteractBubbles,
  onInteractVisitor,
  onOpenShipyard,
  hasFloatingBottle,
}: {
  location: LocationDef;
  availableFish: FishSpecies[];
  aquariumFish: Array<{ species: FishSpecies; variant: FishVariant }>;
  isAquariumMode: boolean;
  activeEvents: ActiveEvent[];
  customization: FishermanCustomization;
  boatTier: number;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  season: SeasonType;
  autoCycle: boolean;
  castTarget: [number, number, number] | null;
  fishingState: PondCanvasProps['fishingState'];
  activeVisitor?: ActiveVisitorScene | null;
  visitorName?: string;
  onWaterClick: (event: ThreeEvent<MouseEvent>) => void;
  onWaterMove: (event: ThreeEvent<PointerEvent>) => void;
  onWaterLeave: () => void;
  onCollectChest?: () => void;
  onCollectRelic?: () => void;
  onCollectBottle?: () => void;
  onInteractBubbles?: () => void;
  onInteractVisitor?: (type: VisitorType) => void;
  onOpenShipyard?: () => void;
  hasFloatingBottle: boolean;
}) {
  const { scene } = useThree();
  const hasEvent = (type: ActiveEvent['event']['bonusType']) => activeEvents.some((active) => active.event.bonusType === type);

  // Continuous 24h daylight cycle state updated smoothly in useFrame (0 React re-renders!)
  const hourRef = useRef<number>(getTargetHourForTimeOfDay(timeOfDay));
  const lastPhaseRef = useRef<TimeOfDay>(timeOfDay);
  const initialPalette = useMemo(
    () => getAtmospherePalette(location.id, timeOfDay, weather, season, activeEvents),
    [location.id, timeOfDay, weather, season, activeEvents]
  );
  const paletteRef = useRef<AtmospherePalette>({ ...initialPalette });

  const fogRef = useRef<ThreeFog>(null);
  const bgColorRef = useRef<Color>(null);
  const ambientRef = useRef<ThreeAmbientLight>(null);
  const hemiRef = useRef<ThreeHemisphereLight>(null);
  const keyLightRef = useRef<ThreeDirectionalLight>(null);
  const rimLightRef = useRef<ThreeDirectionalLight>(null);
  const rodTipRef = useRef<Group | null>(null);

  useEffect(() => {
    if (timeOfDay !== lastPhaseRef.current) {
      lastPhaseRef.current = timeOfDay;
      // Nudge smoothly toward the newly chosen phase if user jumped manually or phase ticked
      const target = getTargetHourForTimeOfDay(timeOfDay);
      const diff = ((target - hourRef.current + 36) % 24) - 12;
      if (Math.abs(diff) > 4.5) {
        hourRef.current = target;
      }
    }
  }, [timeOfDay]);

  useFrame((_, delta) => {
    // Advance continuous daylight hour smoothly when autoCycle is active
    // ~96 seconds for a full 24h cycle (0.25h per second), or ease gently to selected phase
    const dt = Math.min(delta, 0.1);
    const targetH = getTargetHourForTimeOfDay(timeOfDay);
    if (autoCycle) {
      // Advance smoothly at 0.25 hours/sec while staying gently aligned with React's 24s phase cadence
      hourRef.current = (hourRef.current + dt * 0.25) % 24;
    } else {
      // Smoothly glide to the fixed selected time of day
      const diff = ((targetH - hourRef.current + 36) % 24) - 12;
      hourRef.current = (hourRef.current + diff * Math.min(1, dt * 3.5) + 24) % 24;
    }

    const p = sampleCyclePalette(location.id, hourRef.current, weather, season, activeEvents, paletteRef.current);

    if (fogRef.current) fogRef.current.color.set(p.fog);
    if (bgColorRef.current) bgColorRef.current.set(p.horizon);
    if (scene.background instanceof Color) scene.background.set(p.horizon);

    if (ambientRef.current) {
      ambientRef.current.intensity = p.ambientIntensity;
      ambientRef.current.color.set(p.ambientTint);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = p.hemiIntensity;
      hemiRef.current.color.set(p.hemiSky);
      hemiRef.current.groundColor.set(p.hemiGround);
    }
    if (keyLightRef.current) {
      keyLightRef.current.intensity = p.keyIntensity;
      keyLightRef.current.color.set(p.keyLight);
      // Move key light along celestial arc so shadows gently shift across the day!
      const h = hourRef.current;
      const arc = ((Math.min(19, Math.max(5.5, h)) - 5.5) / 13.5) * Math.PI;
      const isNight = h < 5.5 || h > 19.0;
      if (isNight) {
        keyLightRef.current.position.set(6, 10, -4);
      } else {
        keyLightRef.current.position.set(-Math.cos(arc) * 9, 4.5 + Math.sin(arc) * 8.5, 5.5);
      }
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.set(p.sunGlow);
      rimLightRef.current.intensity = 0.22;
    }
  });

  const accentLight: Record<string, string> = {
    emerald: '#34d399',
    cyan: '#38bdf8',
    amber: '#fbbf24',
    indigo: '#818cf8',
    fuchsia: '#e879f9',
  };
  const bloom = hasEvent('plankton_bloom');

  return (
    <>
      <SceneEnvironmentRig isSoftwareGl={isSoftwareGl} />
      <color ref={bgColorRef} attach="background" args={[initialPalette.horizon]} />
      <fog ref={fogRef} attach="fog" args={[new Color(initialPalette.fog), 28, 84]} />
      <SkyDome paletteRef={paletteRef} />
      <CelestialBodies
        hourRef={hourRef}
        paletteRef={paletteRef}
        locationId={location.id}
        weather={weather}
        activeEvents={activeEvents}
      />
      <DriftingClouds paletteRef={paletteRef} weather={weather} locationId={location.id} />
      <SoaringBirds paletteRef={paletteRef} weather={weather} locationId={location.id} />

      <ambientLight ref={ambientRef} intensity={initialPalette.ambientIntensity} color={initialPalette.ambientTint} />
      <hemisphereLight
        ref={hemiRef}
        args={[initialPalette.hemiSky, initialPalette.hemiGround, initialPalette.hemiIntensity]}
      />
      <directionalLight
        ref={keyLightRef}
        position={[-6, 11, 5]}
        intensity={initialPalette.keyIntensity}
        color={initialPalette.keyLight}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={38}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={rimLightRef} position={[7, 5, -8]} intensity={0.22} color={initialPalette.sunGlow} />
      <pointLight
        position={[3, 2.2, -1]}
        intensity={bloom ? 1.15 : 0.32}
        color={bloom ? '#68e7bd' : accentLight[location.accentTheme] || '#34d399'}
        distance={10}
      />

      <DistantRidge locationId={location.id} season={season} paletteRef={paletteRef} />
      <BackgroundForest locationId={location.id} season={season} paletteRef={paletteRef} />
      <Terrain
        season={season}
        bedColor={location.bedColor}
        locationId={location.id}
        palette={initialPalette}
        weather={weather}
      />
      <WaterSurface
        color={location.waterColors[0]}
        deepColor={location.waterColors[1]}
        bedColor={location.bedColor}
        shoreColor={initialPalette.shoreSand}
        onWaterClick={onWaterClick}
        onWaterMove={onWaterMove}
        onWaterLeave={onWaterLeave}
      />
      <LilyPads locationId={location.id} />
      <FishSchool fish={availableFish} aquariumFish={aquariumFish} isAquariumMode={isAquariumMode} />
      <PlayerBoat tier={boatTier} paletteRef={paletteRef} locationId={location.id} onClick={onOpenShipyard}>
        <Fisherman
          customization={customization}
          fishingState={fishingState}
          rodTipRef={rodTipRef}
          castTarget={castTarget}
          boatYaw={getBoatLayout(boatTier).boatYaw}
        />
      </PlayerBoat>
      <FishingLine target={castTarget} active={fishingState !== 'idle'} fishingState={fishingState} rodTipRef={rodTipRef} />

      <PondDragonflies paletteRef={paletteRef} weather={weather} locationId={location.id} />
      <AmbientParticles location={location} paletteRef={paletteRef} season={season} activeEvents={activeEvents} />
      <AnimatedWeather weather={weather} season={season} paletteRef={paletteRef} />

      {hasEvent('giant_sighting') && <GiantShadow />}
      {hasFloatingBottle && onCollectBottle && <Collectible type="bottle" position={[5.3, 0.48, 0.3]} onCollect={onCollectBottle} />}
      {hasEvent('treasure_chest') && onCollectChest && <Collectible type="chest" position={[6.9, 0.66, -1.78]} onCollect={onCollectChest} />}
      {hasEvent('sunken_relic') && onCollectRelic && <Collectible type="relic" position={[-5.37, 0.64, -2.14]} onCollect={onCollectRelic} />}
      {activeVisitor && onInteractVisitor && <Visitor visitor={activeVisitor} name={visitorName} onClick={() => onInteractVisitor(activeVisitor.type)} />}
      {onInteractBubbles && <Bubbles onClick={onInteractBubbles} />}
      {hasEvent('traveling_merchant') && (
        <PlayerBoat
          tier={2}
          paletteRef={paletteRef}
          locationId={location.id}
          worldPosition={[4.85, 0.35, -0.75]}
          worldYaw={-0.95}
          scale={0.78}
        />
      )}
    </>
  );
}

function Bubbles({ onClick }: { onClick: () => void }) {
  const bubbles = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (bubbles.current) {
      bubbles.current.position.y = 0.52 + Math.sin(clock.getElapsedTime() * 1.6) * 0.08;
      bubbles.current.rotation.y = Math.sin(clock.getElapsedTime()) * 0.08;
    }
  });
  return (
    <group ref={bubbles} position={[1.6, 0.52, 3.65]} onClick={(event) => { event.stopPropagation(); onClick(); }}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[(index - 1) * 0.13, index * 0.13, 0]}>
          <sphereGeometry args={[0.1 - index * 0.018, 10, 8]} />
          <meshPhysicalMaterial color="#d5fff8" transparent opacity={0.65} roughness={0.12} clearcoat={1} />
        </mesh>
      ))}
    </group>
  );
}

export function PondCanvas3D({
  location,
  availableFish,
  aquariumFish = [],
  isAquariumMode = false,
  activeEvents,
  isFishing,
  fishingState,
  customization = DEFAULT_CUSTOMIZATION,
  boatTier = 1,
  bubblesMessage,
  hasFloatingBottle = false,
  timeOfDay = 'day',
  weather = 'clear',
  season = 'spring',
  autoCycle = true,
  selectedZone = 'deep_water',
  activeVisitor,
  visitorName,
  onManualCast,
  onReelIn,
  onCollectChest,
  onCollectRelic,
  onCollectBottle,
  onInteractBubbles,
  onInteractVisitor,
  onOpenShipyard,
}: PondCanvasProps) {
  const [hoverZone, setHoverZone] = useState<PondZone | null>(null);
  const [castTarget, setCastTarget] = useState<[number, number, number] | null>(null);
  const [showCatchLeap, setShowCatchLeap] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const clickedWaterThisCastRef = useRef(false);
  const showEvent = (type: ActiveEvent['event']['bonusType']) => activeEvents.some((active) => active.event.bonusType === type);

  // Pick a fresh target inside selectedZone whenever casting starts via Cast button or Spacebar
  useEffect(() => {
    if (fishingState === 'casting') {
      if (!clickedWaterThisCastRef.current) {
        const base = ZONE_CAST_TARGETS[selectedZone] || ZONE_CAST_TARGETS.deep_water;
        const jitterX = (Math.random() - 0.5) * 1.1;
        const jitterZ = (Math.random() - 0.5) * 0.8;
        setCastTarget([base[0] + jitterX, base[1], base[2] + jitterZ]);
      }
      clickedWaterThisCastRef.current = false;
    }
  }, [fishingState, selectedZone]);

  useEffect(() => {
    if (fishingState !== 'reeling') return;
    setShowCatchLeap(true);
    const timeout = window.setTimeout(() => setShowCatchLeap(false), 1100);
    return () => window.clearTimeout(timeout);
  }, [fishingState]);

  const handleWaterClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (fishingState === 'hooked' || fishingState === 'nibble') {
      onReelIn();
      return;
    }
    if (fishingState !== 'idle') return;
    const zone = getZoneAt(event.point.x, event.point.z);
    clickedWaterThisCastRef.current = true;
    setCastTarget([event.point.x, 0.36, event.point.z]);
    onManualCast(undefined, undefined, zone);
  };

  const handleWaterMove = (event: ThreeEvent<PointerEvent>) => setHoverZone(getZoneAt(event.point.x, event.point.z));
  const waterLeave = () => setHoverZone(null);
  const pondLabel = isAquariumMode ? 'Aquarium view' : location.name;
  const fishingLabel =
    fishingState === 'idle'
      ? 'Choose a spot and cast'
      : fishingState === 'casting'
        ? 'Line in the air'
        : fishingState === 'waiting'
          ? 'Listening for a bite'
          : fishingState === 'nibble'
            ? 'Something is nibbling'
            : fishingState === 'hooked'
              ? 'Fish on the line! Reel in'
              : 'Reeling in your catch';

  return (
    <div className="pond-canvas-3d" aria-label="Interactive 3D fishing pond">
      {contextLost ? (
        <div className="flex h-full w-full items-center justify-center bg-slate-900/80 text-sm text-amber-100">
          Restoring 3D pond view...
        </div>
      ) : (
        <Canvas
          shadows={!isSoftwareGl}
          dpr={isSoftwareGl ? 1 : [1, 1.75]}
          gl={{ antialias: !isSoftwareGl, powerPreference: 'high-performance' }}
          camera={{ position: [0, 7.2, 15.8], fov: 45, near: 0.1, far: 165 }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = SRGBColorSpace;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.86;
            gl.setClearColor(new Color('#75a8bd'));
            gl.shadowMap.enabled = !isSoftwareGl;
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            canvas.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <CameraRig />
          <PondScene
            location={location}
            availableFish={availableFish}
            aquariumFish={aquariumFish}
            isAquariumMode={isAquariumMode}
            activeEvents={activeEvents}
            customization={customization}
            boatTier={boatTier}
            timeOfDay={timeOfDay}
            weather={weather}
            season={season}
            autoCycle={autoCycle}
            castTarget={castTarget}
            fishingState={fishingState}
            activeVisitor={activeVisitor}
            visitorName={visitorName}
            onWaterClick={handleWaterClick}
            onWaterMove={handleWaterMove}
            onWaterLeave={waterLeave}
            onCollectChest={onCollectChest}
            onCollectRelic={onCollectRelic}
            onCollectBottle={onCollectBottle}
            onInteractBubbles={onInteractBubbles}
            onInteractVisitor={onInteractVisitor}
            onOpenShipyard={onOpenShipyard}
            hasFloatingBottle={hasFloatingBottle}
          />
          {showCatchLeap && availableFish[0] && <PondFish species={availableFish[0]} variant="Standard" index={2} leaping />}
        </Canvas>
      )}
      <div className="pond-scene-label" aria-live="polite">
        <span className="pond-scene-live-dot" />
        <span>{pondLabel}</span>
        {season !== 'spring' && <span className="pond-scene-season">{season}</span>}
      </div>
      <div className="pond-scene-status" aria-live="polite">
        <strong>{hoverZone ? ZONES[hoverZone].title : ZONES[selectedZone].title}</strong>
        <span>{hoverZone ? ZONES[hoverZone].hint : fishingLabel}</span>
      </div>
      {bubblesMessage && <div className="pond-scene-message">{bubblesMessage}</div>}
      {isFishing && (
        <div className={`pond-scene-bite ${fishingState === 'hooked' ? 'is-hooked' : ''}`}>
          {fishingState === 'hooked' ? 'BITE!' : fishingState === 'nibble' ? 'Nibble...' : 'Line out'}
        </div>
      )}
      {showEvent('treasure_chest') && <div className="pond-scene-pickup">Treasure is floating near the reeds</div>}
      {showEvent('sunken_relic') && <div className="pond-scene-pickup pond-scene-relic">A sun stone is glimmering in the water</div>}
    </div>
  );
}
