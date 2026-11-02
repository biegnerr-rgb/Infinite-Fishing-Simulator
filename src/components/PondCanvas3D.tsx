import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import './pond-scene.css';
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  Group,
  Line,
  Mesh,
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
  FACIAL_HAIR_STYLES,
  FishermanCustomization,
  HAIR_STYLES,
  HATS,
  OUTFITS,
  SKIN_TONES,
} from '../data/cosmeticsData';
import { FISH_VARIANTS } from '../data/fishData';

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
}

const ZONES: Record<PondZone, { title: string; hint: string }> = {
  lily_pads: { title: 'Lily pads', hint: 'Shallows & pearls' },
  deep_water: { title: 'Deep water', hint: 'Bigger fish below' },
  rocks_reef: { title: 'Rocky shore', hint: 'Relics & bottom fish' },
  reeds: { title: 'Reeds', hint: 'Shallows & lost tackle' },
};

const getZoneAt = (x: number, z: number): PondZone => {
  if (z > 1.25) return 'rocks_reef';
  if (x < -1.55 && z < 0.85) return 'lily_pads';
  if (x > 1.55 && z < 0.75) return 'reeds';
  return 'deep_water';
};

const getLightLevel = (timeOfDay: TimeOfDay) => ({
  dawn: 1.2,
  day: 1.7,
  dusk: 1.05,
  night: 0.72,
}[timeOfDay]);

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const compact = size.width / size.height < 1.2;
    camera.position.set(0, compact ? 13.5 : 8.4, compact ? 18.2 : 11.35);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function Terrain({ season, bedColor }: { season: SeasonType; bedColor: string }) {
  const leafColor = season === 'autumn' ? '#c8793c' : season === 'winter' ? '#a5bca6' : '#68a85b';
  const grassColor = season === 'autumn' ? '#b6a354' : season === 'winter' ? '#c2cbb4' : '#7db65e';
  const trees = [
    [-5.5, -2.6, 1.1], [-4.9, 1.5, 0.84], [-3.1, -4.2, 0.82],
    [5.55, -2.5, 1.05], [5.05, 0.7, 0.86], [2.9, -4.25, 0.75],
  ] as const;
  const rocks = [
    [-5.3, -0.3, 0.48], [-4.5, 2.6, 0.34], [-3.7, 3.35, 0.28],
    [-2.8, -3.35, 0.33], [-1.1, -3.75, 0.26], [1.3, -3.65, 0.38],
    [3.5, -3.1, 0.28], [4.55, -2.15, 0.34], [5.05, 0.5, 0.44],
    [4.35, 2.7, 0.37], [2.8, 3.35, 0.25], [-0.3, 3.58, 0.31],
  ] as const;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#d7e5d1" roughness={1} />
      </mesh>
      <mesh position={[0, -0.28, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[6.05, 5.75, 0.72, 72]} />
        <meshStandardMaterial color={bedColor || '#805c38'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.72, 72]} />
        <meshStandardMaterial color={grassColor} roughness={1} />
      </mesh>
      {rocks.map(([x, z, size], index) => (
        <mesh key={`shore-rock-${index}`} position={[x, 0.35, z]} scale={[size * 1.25, size * 0.78, size]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#b8a387' : '#9c927e'} roughness={0.88} />
        </mesh>
      ))}
      {trees.map(([x, z, size], index) => (
        <Tree key={`tree-${index}`} position={[x, 0.25, z]} scale={size} leafColor={leafColor} />
      ))}
      {Array.from({ length: 28 }, (_, index) => {
        const angle = (index / 28) * Math.PI * 2 + 0.12;
        const x = Math.cos(angle) * (5.25 + Math.sin(index * 1.7) * 0.22);
        const z = Math.sin(angle) * (3.8 + Math.cos(index * 1.3) * 0.22);
        const flower = index % 3 === 0;
        return (
          <group key={`grass-${index}`} position={[x, 0.31, z]} rotation={[0, -angle, 0]}>
            {[0, 1, 2].map((blade) => (
              <mesh key={blade} position={[(blade - 1) * 0.09, 0.19 + (blade % 2) * 0.07, 0]} rotation={[0, 0, (blade - 1) * -0.2]} castShadow>
                <coneGeometry args={[0.075, 0.48, 5]} />
                <meshStandardMaterial color={grassColor} roughness={0.9} />
              </mesh>
            ))}
            {flower && <Flower color={index % 2 ? '#f6d979' : '#f2e8da'} scale={0.48} position={[0.08, 0.31, 0.04]} />}
          </group>
        );
      })}
    </group>
  );
}

function Tree({ position, scale, leafColor }: { position: [number, number, number]; scale: number; leafColor: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.28, 1.55, 8]} />
        <meshStandardMaterial color="#80603d" roughness={0.95} />
      </mesh>
      <mesh position={[0.12, 1.63, 0]} castShadow>
        <sphereGeometry args={[0.86, 16, 14]} />
        <meshStandardMaterial color={leafColor} roughness={0.88} />
      </mesh>
      <mesh position={[-0.44, 1.45, 0.12]} scale={0.68} castShadow>
        <sphereGeometry args={[0.76, 14, 12]} />
        <meshStandardMaterial color={leafColor} roughness={0.88} />
      </mesh>
      <mesh position={[0.5, 1.47, -0.08]} scale={0.67} castShadow>
        <sphereGeometry args={[0.76, 14, 12]} />
        <meshStandardMaterial color={leafColor} roughness={0.88} />
      </mesh>
      <mesh position={[0.05, 2.13, 0.04]} scale={0.62} castShadow>
        <sphereGeometry args={[0.7, 14, 12]} />
        <meshStandardMaterial color={leafColor} roughness={0.88} />
      </mesh>
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
        <meshStandardMaterial color="#f7c846" roughness={0.42} />
      </mesh>
    </group>
  );
}

function WaterSurface({
  color,
  bedColor,
  onWaterClick,
  onWaterMove,
  onWaterLeave,
}: {
  color: string;
  bedColor: string;
  onWaterClick: (event: ThreeEvent<MouseEvent>) => void;
  onWaterMove: (event: ThreeEvent<PointerEvent>) => void;
  onWaterLeave: () => void;
}) {
  const geometry = useMemo(() => new CircleGeometry(4.12, 96), []);
  const basePositions = useMemo(() => (geometry.attributes.position.array as Float32Array).slice(), [geometry]);
  const waterRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const positions = geometry.attributes.position.array as Float32Array;
    const time = clock.getElapsedTime();
    for (let index = 0; index < positions.length; index += 3) {
      const x = basePositions[index];
      const y = basePositions[index + 1];
      positions[index + 2] = Math.sin(x * 1.55 + time * 0.8) * 0.025 + Math.cos(y * 1.85 - time * 0.7) * 0.021;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    if (waterRef.current) waterRef.current.position.y = 0.35 + Math.sin(time * 0.5) * 0.012;
  });

  return (
    <group>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 1, 0.82]} receiveShadow>
        <circleGeometry args={[4.36, 88]} />
        <meshStandardMaterial color="#b5a379" roughness={0.92} />
      </mesh>
      <mesh
        ref={waterRef}
        geometry={geometry}
        position={[0, 0.35, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.3, 1, 0.82]}
        onClick={onWaterClick}
        onPointerMove={onWaterMove}
        onPointerLeave={onWaterLeave}
        receiveShadow
      >
        <meshPhysicalMaterial color={color} roughness={0.2} metalness={0.05} clearcoat={0.85} clearcoatRoughness={0.18} transparent opacity={0.84} />
      </mesh>
      <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.24, 1, 0.77]}>
        <circleGeometry args={[3.95, 64]} />
        <meshStandardMaterial color={bedColor} roughness={0.98} transparent opacity={0.35} />
      </mesh>
      <WaterRipples />
    </group>
  );
}

function WaterRipples() {
  const rings = useRef<Array<Mesh | null>>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    rings.current.forEach((ring, index) => {
      if (!ring) return;
      const phase = (time * 0.15 + index * 0.31) % 1;
      ring.scale.setScalar(0.3 + phase * 1.25);
      const material = ring.material as import('three').MeshBasicMaterial;
      material.opacity = (1 - phase) * 0.2;
    });
  });
  const positions: [number, number, number][] = [[-1.5, 0.3, -0.4], [1.7, 0.3, -1.25], [0.65, 0.3, 1.1]];
  return (
    <group>
      {positions.map((position, index) => (
        <mesh key={index} ref={(node) => { rings.current[index] = node; }} position={position} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.38, 40]} />
          <meshBasicMaterial color="#d8fff0" transparent opacity={0.16} side={2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function LilyPad({ position, size, flowerColor, rotation }: { position: [number, number, number]; size: number; flowerColor?: string; rotation: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, rotation]} receiveShadow>
        <circleGeometry args={[size, 32]} />
        <meshStandardMaterial color="#76ae42" roughness={0.45} side={2} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, rotation]}>
        <ringGeometry args={[size * 0.88, size * 0.94, 32]} />
        <meshStandardMaterial color="#a7cf55" roughness={0.44} side={2} />
      </mesh>
      {flowerColor && <Flower color={flowerColor} position={[size * 0.22, 0.12, size * 0.12]} scale={0.65} />}
    </group>
  );
}

function LilyPads() {
  const pads: Array<{ position: [number, number, number]; size: number; color?: string; rotation: number }> = [
    { position: [-3.45, 0.35, -1.2], size: 0.58, color: '#f6e7d3', rotation: 0.4 },
    { position: [-3.95, 0.34, -0.55], size: 0.48, rotation: 1.2 },
    { position: [-3.15, 0.34, -0.45], size: 0.42, color: '#f5c8d5', rotation: 2.1 },
    { position: [2.7, 0.34, -1.85], size: 0.52, color: '#f5e8d6', rotation: 2.7 },
    { position: [3.25, 0.34, -1.45], size: 0.43, rotation: 0.7 },
    { position: [0.8, 0.34, 2.25], size: 0.5, rotation: 1.9 },
    { position: [1.45, 0.34, 2.55], size: 0.4, color: '#f5c8d5', rotation: 0.1 },
  ];
  return <group>{pads.map((pad, index) => <LilyPad key={index} position={pad.position} size={pad.size} flowerColor={pad.color} rotation={pad.rotation} />)}</group>;
}

function Dock({ boatTier }: { boatTier: number }) {
  const planks = Array.from({ length: 8 }, (_, index) => 0.75 + index * 0.49);
  return (
    <group>
      <mesh position={[-1.25, 0.44, 2.48]} castShadow receiveShadow>
        <boxGeometry args={[2.12, 0.18, 4.15]} />
        <meshStandardMaterial color="#80522f" roughness={0.76} />
      </mesh>
      {planks.map((z, index) => (
        <mesh key={index} position={[-1.25, 0.55, z]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.12, 0.45]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#b87942' : '#a96e3c'} roughness={0.72} />
        </mesh>
      ))}
      {[-2.08, -0.42].flatMap((x) => [0.82, 4.16].map((z, index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.34, 0]} castShadow>
            <cylinderGeometry args={[0.105, 0.13, 1.15, 10]} />
            <meshStandardMaterial color="#6e4428" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.94, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.12, 10]} />
            <meshStandardMaterial color="#d09551" roughness={0.7} />
          </mesh>
        </group>
      )))}
      {boatTier > 1 && <Rowboat position={[2.65, 0.5, 2.3]} tier={boatTier} />}
    </group>
  );
}

function Rowboat({ position, tier }: { position: [number, number, number]; tier: number }) {
  const hullColor = tier >= 4 ? '#295f6b' : tier >= 2 ? '#8a5b35' : '#76513a';
  return (
    <group position={position} rotation={[0, -0.24, 0]}>
      <mesh scale={[1, 0.28, 1.7]} castShadow>
        <sphereGeometry args={[0.7, 18, 12]} />
        <meshStandardMaterial color={hullColor} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.1, 0.08, 0.78]} />
        <meshStandardMaterial color="#ba8852" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.48, -0.15]} rotation={[0.1, 0, -0.15]}>
        <cylinderGeometry args={[0.022, 0.032, 1.5, 8]} />
        <meshStandardMaterial color="#80552e" roughness={0.65} />
      </mesh>
    </group>
  );
}

function Fisherman({ customization }: { customization: FishermanCustomization }) {
  const character = useRef<Group>(null);
  const outfit = OUTFITS.find((item) => item.id === customization.outfitId) || OUTFITS[0];
  const skin = SKIN_TONES.find((item) => item.id === customization.skinId) || SKIN_TONES[1];
  const hair = HAIR_STYLES.find((item) => item.id === customization.hairId) || HAIR_STYLES[0];
  const beard = FACIAL_HAIR_STYLES.find((item) => item.id === customization.facialHairId) || FACIAL_HAIR_STYLES[0];
  const hat = HATS.find((item) => item.id === customization.hatId) || HATS[0];

  useFrame(({ clock }) => {
    if (character.current) character.current.position.y = 0.63 + Math.sin(clock.getElapsedTime() * 1.6) * 0.025;
  });

  return (
    <group ref={character} position={[-1.24, 0.63, 2.0]} rotation={[0, 0.18, 0]}>
      <mesh position={[-0.22, 0.2, 0.02]} castShadow><capsuleGeometry args={[0.16, 0.34, 4, 8]} /><meshStandardMaterial color="#543b2c" roughness={0.82} /></mesh>
      <mesh position={[0.22, 0.2, 0.02]} castShadow><capsuleGeometry args={[0.16, 0.34, 4, 8]} /><meshStandardMaterial color="#543b2c" roughness={0.82} /></mesh>
      <mesh position={[-0.22, 0.06, 0.09]} castShadow><boxGeometry args={[0.38, 0.15, 0.52]} /><meshStandardMaterial color="#6f4b36" roughness={0.75} /></mesh>
      <mesh position={[0.22, 0.06, 0.09]} castShadow><boxGeometry args={[0.38, 0.15, 0.52]} /><meshStandardMaterial color="#6f4b36" roughness={0.75} /></mesh>
      <mesh position={[0, 0.94, 0]} castShadow><capsuleGeometry args={[0.39, 0.54, 5, 10]} /><meshStandardMaterial color={outfit.color} roughness={0.78} /></mesh>
      <mesh position={[0, 0.9, 0.37]}><boxGeometry args={[0.5, 0.08, 0.035]} /><meshStandardMaterial color={outfit.accentColor || '#d4b06b'} roughness={0.65} /></mesh>
      <mesh position={[-0.48, 1.07, 0.02]} rotation={[0, 0, -0.75]} castShadow><capsuleGeometry args={[0.13, 0.46, 4, 8]} /><meshStandardMaterial color={outfit.color} roughness={0.78} /></mesh>
      <mesh position={[0.48, 1.1, 0.02]} rotation={[0, 0, 0.65]} castShadow><capsuleGeometry args={[0.13, 0.45, 4, 8]} /><meshStandardMaterial color={outfit.color} roughness={0.78} /></mesh>
      <mesh position={[-0.69, 0.79, 0.15]} castShadow><sphereGeometry args={[0.14, 12, 10]} /><meshStandardMaterial color={skin.color} roughness={0.62} /></mesh>
      <mesh position={[0.66, 0.88, 0.18]} castShadow><sphereGeometry args={[0.14, 12, 10]} /><meshStandardMaterial color={skin.color} roughness={0.62} /></mesh>
      <mesh position={[0, 1.74, 0.02]} castShadow><sphereGeometry args={[0.43, 20, 16]} /><meshStandardMaterial color={skin.color} roughness={0.72} /></mesh>
      <mesh position={[0, 1.51, 0.13]} scale={[0.82, 0.62, 0.7]} castShadow><sphereGeometry args={[0.35, 16, 12]} /><meshStandardMaterial color={beard.color === 'transparent' ? skin.color : beard.color} roughness={0.86} /></mesh>
      <mesh position={[-0.15, 1.78, 0.39]}><sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color="#fff8e7" /></mesh>
      <mesh position={[0.15, 1.78, 0.39]}><sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color="#fff8e7" /></mesh>
      <mesh position={[-0.15, 1.78, 0.432]}><sphereGeometry args={[0.024, 8, 8]} /><meshStandardMaterial color="#392719" /></mesh>
      <mesh position={[0.15, 1.78, 0.432]}><sphereGeometry args={[0.024, 8, 8]} /><meshStandardMaterial color="#392719" /></mesh>
      <mesh position={[0, 1.67, 0.42]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color={skin.color} /></mesh>
      <mesh position={[-0.68, 1.92, 0]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color={hair.color} roughness={0.9} /></mesh>
      <mesh position={[0.68, 1.92, 0]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color={hair.color} roughness={0.9} /></mesh>
      {hat.id !== 'hat_none' && (
        <group position={[0, 2.12, 0]}>
          <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.5, 0.5, 0.1, 24]} /><meshStandardMaterial color={hat.color} roughness={0.78} /></mesh>
          <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.34, 0.39, 0.36, 20]} /><meshStandardMaterial color={hat.color} roughness={0.78} /></mesh>
          <mesh position={[0, 0.1, 0.052]}><boxGeometry args={[0.55, 0.055, 0.055]} /><meshStandardMaterial color={hat.accentColor || '#c79648'} roughness={0.7} /></mesh>
        </group>
      )}
      <mesh position={[0.61, 1.55, -0.08]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.035, 0.026, 2.65, 8]} />
        <meshStandardMaterial color="#67462b" roughness={0.66} />
      </mesh>
      <mesh position={[0.59, 0.42, -0.1]}><cylinderGeometry args={[0.06, 0.045, 0.22, 8]} /><meshStandardMaterial color="#aa7140" roughness={0.66} /></mesh>
      <mesh position={[0.62, 2.93, -0.1]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color="#f3e9cd" roughness={0.4} /></mesh>
    </group>
  );
}

function FishingLine({ target, active }: { target: [number, number, number] | null; active: boolean }) {
  const geometry = useMemo(() => new BufferGeometry(), []);
  const line = useMemo(() => new Line(geometry), [geometry]);
  useFrame(({ clock }) => {
    const point = active && target ? new Vector3(target[0], 0.34, target[2]) : new Vector3(-0.25, 0.34, 0.65);
    const sway = Math.sin(clock.getElapsedTime() * 1.5) * 0.08;
    geometry.setFromPoints([new Vector3(-0.63, 3.56, 1.9), new Vector3(point.x + sway, point.y, point.z)]);
  });
  return <primitive object={line}><lineBasicMaterial attach="material" color="#fff1cf" transparent opacity={0.64} /></primitive>;
}

function PondFish({
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
  const phase = index * 1.37;
  const size = variant === 'Giant' ? 1.22 : variant === 'Tiny' ? 0.6 : 0.82 + (index % 3) * 0.1;
  const bodyColor = variant === 'Standard' ? species.color : FISH_VARIANTS[variant].color;

  useFrame(({ clock }) => {
    if (!fish.current) return;
    const time = clock.getElapsedTime() * 0.38 + phase;
    fish.current.position.x = Math.sin(time) * (1.4 + (index % 2) * 0.45) + (index % 3 - 1) * 0.8;
    fish.current.position.z = Math.cos(time * 0.8) * 0.66 + (index % 4 - 1.5) * 0.52;
    fish.current.position.y = leaping
      ? 0.12 + Math.abs(Math.sin(clock.getElapsedTime() * 4.2 + phase)) * 1.35
      : -0.08 + Math.sin(time * 1.9) * 0.06;
    fish.current.rotation.y = Math.cos(time) < 0 ? Math.PI : 0;
    if (tail.current) tail.current.rotation.y = Math.sin(clock.getElapsedTime() * 8 + phase) * 0.35;
  });

  return (
    <group ref={fish} scale={size}>
      <mesh castShadow>
        <sphereGeometry args={[0.43, 18, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.42} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.25, 0.43, 4]} />
        <meshStandardMaterial color={species.finColor} roughness={0.58} side={2} />
      </mesh>
      <group ref={tail} position={[-0.38, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.28, 0.48, 4]} />
          <meshStandardMaterial color={species.finColor} roughness={0.58} side={2} />
        </mesh>
      </group>
      <mesh position={[0.18, 0.02, 0.35]}><sphereGeometry args={[0.047, 8, 8]} /><meshStandardMaterial color="#fff7dd" /></mesh>
      <mesh position={[0.2, 0.02, 0.39]}><sphereGeometry args={[0.021, 8, 8]} /><meshStandardMaterial color="#163c42" /></mesh>
      <mesh position={[0.3, -0.12, 0.04]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.12, 0.2, 4]} />
        <meshStandardMaterial color={species.accentColor} roughness={0.5} />
      </mesh>
    </group>
  );
}

function FishSchool({ fish, aquariumFish, isAquariumMode }: {
  fish: FishSpecies[];
  aquariumFish: Array<{ species: FishSpecies; variant: FishVariant }>;
  isAquariumMode: boolean;
}) {
  const visibleFish = isAquariumMode
    ? aquariumFish.slice(0, 12)
    : fish.slice(0, 9).map((species) => ({ species, variant: 'Standard' as FishVariant }));
  return <group>{visibleFish.map((item, index) => <PondFish key={`${item.species.id}-${index}`} species={item.species} variant={item.variant} index={index} />)}</group>;
}

function Visitor({ visitor, name, onClick }: { visitor: ActiveVisitorScene; name?: string; onClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const root = useRef<Group>(null);
  const x = (visitor.x - 0.5) * 9.2;
  const z = (visitor.y - 0.5) * 5.8;
  const animalColor = visitor.type === 'frog' ? '#74b84a' : visitor.type === 'duck' ? '#f3cd62' : visitor.type === 'otter' ? '#9a6849' : visitor.type === 'raccoon' ? '#777c77' : visitor.type === 'crab' ? '#e88964' : '#66875e';
  useFrame(({ clock }) => {
    if (root.current) root.current.position.y = 0.44 + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <group ref={root} position={[x, 0.44, z]} onClick={(event) => { event.stopPropagation(); onClick(event); }}>
      <mesh castShadow><sphereGeometry args={[0.35, 14, 12]} /><meshStandardMaterial color={animalColor} roughness={0.72} /></mesh>
      <mesh position={[0.25, 0.2, 0.05]} castShadow><sphereGeometry args={[0.22, 12, 10]} /><meshStandardMaterial color={animalColor} roughness={0.7} /></mesh>
      <mesh position={[0.34, 0.23, 0.22]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#fff7e8" /></mesh>
      <mesh position={[0.35, 0.23, 0.25]}><sphereGeometry args={[0.016, 8, 8]} /><meshStandardMaterial color="#263c33" /></mesh>
      {name && <mesh position={[0, 0.75, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#f7e7b4" emissive="#f7e7b4" emissiveIntensity={0.5} /></mesh>}
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
      {type === 'chest' && <>
        <mesh castShadow><boxGeometry args={[0.5, 0.36, 0.36]} /><meshStandardMaterial color="#9a5e2e" roughness={0.7} /></mesh>
        <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.52, 0.1, 0.38]} /><meshStandardMaterial color="#e4b54c" metalness={0.35} roughness={0.4} /></mesh>
        <mesh position={[0, -0.02, 0.19]}><boxGeometry args={[0.09, 0.13, 0.04]} /><meshStandardMaterial color="#f4d078" metalness={0.55} roughness={0.35} /></mesh>
      </>}
      {type === 'relic' && <mesh castShadow><dodecahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color="#f1b947" emissive="#cc7b24" emissiveIntensity={0.32} metalness={0.28} roughness={0.38} /></mesh>}
      {type === 'bottle' && <>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.14, 0.55, 12]} /><meshStandardMaterial color="#78b7a3" transparent opacity={0.78} roughness={0.22} /></mesh>
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.12, 10]} /><meshStandardMaterial color="#bd8350" roughness={0.8} /></mesh>
      </>}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.22, 0.31, 24]} /><meshBasicMaterial color="#fff4c6" transparent opacity={0.5} side={2} /></mesh>
    </group>
  );
}

function GiantShadow() {
  const shadow = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (shadow.current) shadow.current.position.x = Math.sin(clock.getElapsedTime() * 0.22) * 2;
  });
  return (
    <mesh ref={shadow} position={[0, -0.02, -0.25]} scale={[2.8, 0.08, 0.72]}>
      <sphereGeometry args={[1, 24, 12]} />
      <meshBasicMaterial color="#173f4c" transparent opacity={0.38} depthWrite={false} />
    </mesh>
  );
}

function WeatherEffects({ weather, season }: { weather: WeatherType; season: SeasonType }) {
  if (weather !== 'rain' && season !== 'winter') return null;
  const particles = Array.from({ length: 32 }, (_, index) => ({
    x: ((index * 37) % 110) / 10 - 5.5,
    z: ((index * 19) % 70) / 10 - 3.5,
    y: 1.8 + (index % 5) * 0.45,
  }));
  return (
    <group>
      {particles.map((particle, index) => (
        <mesh key={index} position={[particle.x, particle.y, particle.z]} rotation={[0, 0, weather === 'rain' ? 0.14 : 0]}>
          {weather === 'rain' ? <boxGeometry args={[0.018, 0.35, 0.018]} /> : <sphereGeometry args={[0.045, 6, 6]} />}
          <meshBasicMaterial color={weather === 'rain' ? '#b8e5ef' : '#fff8dc'} transparent opacity={weather === 'rain' ? 0.36 : 0.72} />
        </mesh>
      ))}
    </group>
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
  hasFloatingBottle: boolean;
}) {
  const hasEvent = (type: ActiveEvent['event']['bonusType']) => activeEvents.some((active) => active.event.bonusType === type);
  const nightTint = timeOfDay === 'night' ? '#223d54' : timeOfDay === 'dusk' ? '#f3b37b' : '#fff4d2';
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
      <color attach="background" args={[timeOfDay === 'night' ? '#183343' : timeOfDay === 'dusk' ? '#d4ad92' : '#d7e8d4']} />
      <fog attach="fog" args={[new Color(timeOfDay === 'night' ? '#183343' : '#d7e8d4'), 18, 40]} />
      <ambientLight intensity={getLightLevel(timeOfDay)} color={nightTint} />
      <hemisphereLight args={['#e8f6eb', '#647949', timeOfDay === 'night' ? 0.65 : 1.05]} />
      <directionalLight position={[-5, 10, 5]} intensity={timeOfDay === 'night' ? 1.1 : 2.2} color={timeOfDay === 'dawn' || timeOfDay === 'dusk' ? '#ffd3a1' : '#fff4dc'} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[3, 2.2, -1]} intensity={bloom ? 1.1 : 0.38} color={bloom ? '#68e7bd' : accentLight[location.accentTheme] || '#34d399'} distance={9} />
      <Terrain season={season} bedColor={location.bedColor} />
      <WaterSurface color={location.waterColors[0]} bedColor={location.bedColor} onWaterClick={onWaterClick} onWaterMove={onWaterMove} onWaterLeave={onWaterLeave} />
      <LilyPads />
      <FishSchool fish={availableFish} aquariumFish={aquariumFish} isAquariumMode={isAquariumMode} />
      <Dock boatTier={boatTier} />
      <Fisherman customization={customization} />
      <FishingLine target={castTarget} active={fishingState !== 'idle'} />
      {hasEvent('giant_sighting') && <GiantShadow />}
      {hasFloatingBottle && onCollectBottle && <Collectible type="bottle" position={[3.1, 0.48, 0.5]} onCollect={onCollectBottle} />}
      {hasEvent('treasure_chest') && onCollectChest && <Collectible type="chest" position={[3.15, 0.66, 1.6]} onCollect={onCollectChest} />}
      {hasEvent('sunken_relic') && onCollectRelic && <Collectible type="relic" position={[-3.05, 0.64, 1.0]} onCollect={onCollectRelic} />}
      {activeVisitor && onInteractVisitor && <Visitor visitor={activeVisitor} name={visitorName} onClick={() => onInteractVisitor(activeVisitor.type)} />}
      {onInteractBubbles && <Bubbles onClick={onInteractBubbles} />}
      {hasEvent('traveling_merchant') && <Rowboat position={[3.2, 0.54, -0.2]} tier={3} />}
      <WeatherEffects weather={weather} season={season} />
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
    <group ref={bubbles} position={[1.45, 0.52, 2.45]} onClick={(event) => { event.stopPropagation(); onClick(); }}>
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
}: PondCanvasProps) {
  const [hoverZone, setHoverZone] = useState<PondZone | null>(null);
  const [castTarget, setCastTarget] = useState<[number, number, number] | null>(null);
  const [showCatchLeap, setShowCatchLeap] = useState(false);
  const showEvent = (type: ActiveEvent['event']['bonusType']) => activeEvents.some((active) => active.event.bonusType === type);

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
    setCastTarget([event.point.x, 0.38, event.point.z]);
    onManualCast(undefined, undefined, zone);
  };

  const handleWaterMove = (event: ThreeEvent<PointerEvent>) => setHoverZone(getZoneAt(event.point.x, event.point.z));
  const waterLeave = () => setHoverZone(null);
  const pondLabel = isAquariumMode ? 'Aquarium view' : location.name;
  const fishingLabel = fishingState === 'idle'
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
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 8.4, 11.35], fov: 36, near: 0.1, far: 80 }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color('#d7e8d4'));
          gl.shadowMap.enabled = true;
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
          hasFloatingBottle={hasFloatingBottle}
        />
        {showCatchLeap && availableFish[0] && <PondFish species={availableFish[0]} variant="Standard" index={2} leaping />}
      </Canvas>
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
      {isFishing && <div className={`pond-scene-bite ${fishingState === 'hooked' ? 'is-hooked' : ''}`}>{fishingState === 'hooked' ? 'BITE!' : fishingState === 'nibble' ? 'Nibble...' : 'Line out'}</div>}
      {showEvent('treasure_chest') && <div className="pond-scene-pickup">Treasure is floating near the reeds</div>}
      {showEvent('sunken_relic') && <div className="pond-scene-pickup pond-scene-relic">A sun stone is glimmering in the water</div>}
    </div>
  );
}
