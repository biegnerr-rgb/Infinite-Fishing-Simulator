import { useFrame, useThree } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator,
  ShaderMaterial,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ActiveEvent,
  LocationDef,
  SeasonType,
  TimeOfDay,
  WeatherType,
} from '../../types/game';
import { getLakeShorePoint, isInsideLakePerimeter } from './lakeGeometry';

// Pre-allocated scratch helpers for zero-GC per-frame updates
const _dummy = new Object3D();
const _cA = new Color();
const _cB = new Color();

export interface AtmospherePalette {
  zenith: string;
  midSky: string;
  horizon: string;
  fog: string;
  groundBase: string;
  groundAccent: string;
  shoreSand: string;
  hillNear: string;
  hillFar: string;
  cloud: string;
  sunOrMoon: string;
  sunGlow: string;
  ambientTint: string;
  hemiSky: string;
  hemiGround: string;
  keyLight: string;
  ambientIntensity: number;
  hemiIntensity: number;
  keyIntensity: number;
  nightFactor: number; // 0 = full day, 1 = full night
  twilightFactor: number; // peaks at dawn & dusk
}

export function getTargetHourForTimeOfDay(timeOfDay: TimeOfDay): number {
  switch (timeOfDay) {
    case 'dawn':
      return 6.2;
    case 'day':
      return 12.5;
    case 'dusk':
      return 18.2;
    case 'night':
      return 23.2;
  }
}

function getLocationGroundTheme(locationId: string, season: SeasonType) {
  if (locationId === 'alien_waters') {
    return {
      groundBase: '#2a1c3d',
      groundAccent: '#382552',
      shoreSand: '#513775',
      hillNear: '#26184a',
      hillFar: '#191036',
    };
  }
  if (locationId === 'midnight_deep') {
    return {
      groundBase: '#181e29',
      groundAccent: '#222b3a',
      shoreSand: '#334155',
      hillNear: '#132136',
      hillFar: '#0d1726',
    };
  }
  if (locationId === 'tropical_reef') {
    return {
      groundBase: '#b8945c',
      groundAccent: '#9e7a46',
      shoreSand: '#d4ba87',
      hillNear: '#477a66',
      hillFar: '#5f9486',
    };
  }
  if (locationId === 'crystal_lake') {
    return {
      groundBase: season === 'winter' ? '#7a8894' : '#535d66',
      groundAccent: season === 'winter' ? '#63717d' : '#434c54',
      shoreSand: '#87919c',
      hillNear: '#486670',
      hillFar: '#607e8a',
    };
  }
  // Little Pond: distinct warm earthy loam ground + sandstone pebble shore + cool misty hills
  if (season === 'winter') {
    return {
      groundBase: '#7c868a',
      groundAccent: '#636c70',
      shoreSand: '#9ca3a6',
      hillNear: '#5e7380',
      hillFar: '#758a96',
    };
  }
  if (season === 'autumn') {
    return {
      groundBase: '#6b4c35',
      groundAccent: '#543b28',
      shoreSand: '#a6865e',
      hillNear: '#665c4d',
      hillFar: '#7d7263',
    };
  }
  return {
    groundBase: '#5d4938', // rich earthy soil/loam — sharply distinct from green grass, trees & teal pond
    groundAccent: '#4a392b',
    shoreSand: '#a38764',
    hillNear: '#4d6b69', // cool misty blue-green hills for clear depth separation
    hillFar: '#617d7e',
  };
}

function getBasePhasePalette(
  locationId: string,
  phase: TimeOfDay,
  weather: WeatherType,
  season: SeasonType,
  activeEvents: ActiveEvent[]
): AtmospherePalette {
  const ground = getLocationGroundTheme(locationId, season);
  const hasBloodMoon = activeEvents.some((e) => e.event.bonusType === 'blood_moon');
  const isRain = weather === 'rain';
  const isAlien = locationId === 'alien_waters';
  const isMidnight = locationId === 'midnight_deep';

  if (isAlien) {
    return {
      zenith: '#0a071f',
      midSky: '#231347',
      horizon: phase === 'dawn' ? '#5b2d91' : '#3a1d66',
      fog: '#211342',
      ...ground,
      cloud: '#6146a6',
      sunOrMoon: hasBloodMoon ? '#fb7185' : '#e879f9',
      sunGlow: '#a855f7',
      ambientTint: '#9d87db',
      hemiSky: '#a78bfa',
      hemiGround: '#1e1638',
      keyLight: '#e9d5ff',
      ambientIntensity: 0.34,
      hemiIntensity: 0.42,
      keyIntensity: 0.85,
      nightFactor: 0.85,
      twilightFactor: 0.2,
    };
  }

  if (isMidnight) {
    return {
      zenith: '#050914',
      midSky: '#0d1930',
      horizon: hasBloodMoon ? '#3b1626' : '#152b47',
      fog: hasBloodMoon ? '#24121f' : '#0f2036',
      ...ground,
      cloud: '#1d3452',
      sunOrMoon: hasBloodMoon ? '#f87171' : '#93c5fd',
      sunGlow: hasBloodMoon ? '#ef4444' : '#38bdf8',
      ambientTint: '#5b82ab',
      hemiSky: '#466c96',
      hemiGround: '#0a121f',
      keyLight: '#7dd3fc',
      ambientIntensity: 0.28,
      hemiIntensity: 0.34,
      keyIntensity: 0.65,
      nightFactor: 0.95,
      twilightFactor: 0.1,
    };
  }

  if (phase === 'night') {
    if (hasBloodMoon) {
      return {
        zenith: '#140814',
        midSky: '#2e1121',
        horizon: '#591d2e',
        fog: '#2e131e',
        ...ground,
        cloud: '#522534',
        sunOrMoon: '#fca5a5',
        sunGlow: '#ef4444',
        ambientTint: '#ad6876',
        hemiSky: '#99475b',
        hemiGround: '#1a121c',
        keyLight: '#fda4af',
        ambientIntensity: 0.26,
        hemiIntensity: 0.3,
        keyIntensity: 0.55,
        nightFactor: 1,
        twilightFactor: 0.1,
      };
    }
    return {
      zenith: '#091524',
      midSky: '#11253b',
      horizon: '#1e3c54',
      fog: '#142a3d',
      ...ground,
      cloud: '#274259',
      sunOrMoon: '#fef3c7',
      sunGlow: '#93c5fd',
      ambientTint: '#4f7191',
      hemiSky: '#5e87ab',
      hemiGround: '#182421',
      keyLight: '#b8dcfa',
      ambientIntensity: 0.26,
      hemiIntensity: 0.32,
      keyIntensity: 0.52,
      nightFactor: 1,
      twilightFactor: 0,
    };
  }

  if (phase === 'dawn') {
    return {
      zenith: isRain ? '#3b4e5e' : '#3d587d',
      midSky: isRain ? '#617180' : '#9c727f',
      horizon: isRain ? '#8c969e' : '#dba684',
      fog: isRain ? '#788691' : '#c99c81',
      ...ground,
      cloud: isRain ? '#7b8a96' : '#f2c7b3',
      sunOrMoon: '#ffda94',
      sunGlow: '#f59e6c',
      ambientTint: '#e3bfa6',
      hemiSky: '#eab99e',
      hemiGround: '#4a3d31',
      keyLight: '#ffca99',
      ambientIntensity: 0.38,
      hemiIntensity: 0.48,
      keyIntensity: isRain ? 0.65 : 0.92,
      nightFactor: 0.22,
      twilightFactor: 1,
    };
  }

  if (phase === 'dusk') {
    return {
      zenith: isRain ? '#2e3a4d' : '#2a375e',
      midSky: isRain ? '#4e5669' : '#7d4c63',
      horizon: isRain ? '#75747d' : '#cc7e5c',
      fog: isRain ? '#636673' : '#ad7261',
      ...ground,
      cloud: isRain ? '#5d6575' : '#de9578',
      sunOrMoon: '#ffb86b',
      sunGlow: '#ea580c',
      ambientTint: '#d69c7a',
      hemiSky: '#d48c70',
      hemiGround: '#3d332a',
      keyLight: '#ffb378',
      ambientIntensity: 0.34,
      hemiIntensity: 0.44,
      keyIntensity: isRain ? 0.58 : 0.86,
      nightFactor: 0.35,
      twilightFactor: 1,
    };
  }

  // Daytime: rich, calm, never overexposed or glare-white
  if (isRain) {
    return {
      zenith: '#465e70',
      midSky: '#688091',
      horizon: '#8ea3ad',
      fog: '#7e939e',
      ...ground,
      cloud: '#6f828f',
      sunOrMoon: '#cbdbe0',
      sunGlow: '#9fb6bf',
      ambientTint: '#b4c9d1',
      hemiSky: '#9db7c2',
      hemiGround: '#473e33',
      keyLight: '#d1e1e8',
      ambientIntensity: 0.36,
      hemiIntensity: 0.45,
      keyIntensity: 0.68,
      nightFactor: 0.08,
      twilightFactor: 0,
    };
  }

  return {
    zenith: locationId === 'crystal_lake' ? '#3a76a6' : locationId === 'tropical_reef' ? '#2582b8' : '#427ea3',
    midSky: locationId === 'crystal_lake' ? '#6ea6cc' : locationId === 'tropical_reef' ? '#5cb4d4' : '#75a8bd',
    horizon: locationId === 'crystal_lake' ? '#b3d4e0' : locationId === 'tropical_reef' ? '#a9d9db' : '#b8cfbd',
    fog: locationId === 'crystal_lake' ? '#a5c8d6' : locationId === 'tropical_reef' ? '#9fd1d4' : '#a8c2b0',
    ...ground,
    cloud: '#ebe6d8',
    sunOrMoon: '#ffefb8',
    sunGlow: '#facc15',
    ambientTint: '#ede4cc',
    hemiSky: '#c7ded9',
    hemiGround: '#544638',
    keyLight: '#ffebc2',
    ambientIntensity: 0.42,
    hemiIntensity: 0.54,
    keyIntensity: 1.12,
    nightFactor: 0,
    twilightFactor: 0,
  };
}

function lerpHex(a: string, b: string, t: number, out: Color): string {
  _cA.set(a);
  _cB.set(b);
  out.copy(_cA).lerp(_cB, t);
  return `#${out.getHexString()}`;
}

/**
 * Smoothly blends between Dawn (6h), Day (12.5h), Dusk (18.2h), and Night (23.2h / 0h)
 * for a continuous, living daylight cycle.
 */
export function sampleCyclePalette(
  locationId: string,
  hour24: number,
  weather: WeatherType,
  season: SeasonType,
  activeEvents: ActiveEvent[],
  target?: AtmospherePalette
): AtmospherePalette {
  const h = ((hour24 % 24) + 24) % 24;
  // Keyframe hours: 0(night) -> 6.2(dawn) -> 12.5(day) -> 18.2(dusk) -> 23.2(night) -> 24(night)
  let pA: TimeOfDay = 'night';
  let pB: TimeOfDay = 'dawn';
  let t = 0;

  if (h < 6.2) {
    // 23.2 -> 6.2 spans 7 hours across midnight
    const fromNight = h < 6.2 ? h + 0.8 : h - 23.2;
    pA = 'night';
    pB = 'dawn';
    t = Math.min(1, Math.max(0, fromNight / 7.0));
  } else if (h < 12.5) {
    pA = 'dawn';
    pB = 'day';
    t = (h - 6.2) / (12.5 - 6.2);
  } else if (h < 18.2) {
    pA = 'day';
    pB = 'dusk';
    t = (h - 12.5) / (18.2 - 12.5);
  } else if (h < 23.2) {
    pA = 'dusk';
    pB = 'night';
    t = (h - 18.2) / (23.2 - 18.2);
  } else {
    pA = 'night';
    pB = 'dawn';
    t = (h - 23.2) / 7.0;
  }

  // Smoothstep easing for lush, organic transitions
  const ease = t * t * (3 - 2 * t);
  const a = getBasePhasePalette(locationId, pA, weather, season, activeEvents);
  const b = getBasePhasePalette(locationId, pB, weather, season, activeEvents);
  const tmp = new Color();
  const out = target || { ...a };

  out.zenith = lerpHex(a.zenith, b.zenith, ease, tmp);
  out.midSky = lerpHex(a.midSky, b.midSky, ease, tmp);
  out.horizon = lerpHex(a.horizon, b.horizon, ease, tmp);
  out.fog = lerpHex(a.fog, b.fog, ease, tmp);
  out.groundBase = a.groundBase;
  out.groundAccent = a.groundAccent;
  out.shoreSand = a.shoreSand;
  out.hillNear = lerpHex(a.hillNear, b.hillNear, ease, tmp);
  out.hillFar = lerpHex(a.hillFar, b.hillFar, ease, tmp);
  out.cloud = lerpHex(a.cloud, b.cloud, ease, tmp);
  out.sunOrMoon = lerpHex(a.sunOrMoon, b.sunOrMoon, ease, tmp);
  out.sunGlow = lerpHex(a.sunGlow, b.sunGlow, ease, tmp);
  out.ambientTint = lerpHex(a.ambientTint, b.ambientTint, ease, tmp);
  out.hemiSky = lerpHex(a.hemiSky, b.hemiSky, ease, tmp);
  out.hemiGround = lerpHex(a.hemiGround, b.hemiGround, ease, tmp);
  out.keyLight = lerpHex(a.keyLight, b.keyLight, ease, tmp);
  out.ambientIntensity = a.ambientIntensity + (b.ambientIntensity - a.ambientIntensity) * ease;
  out.hemiIntensity = a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * ease;
  out.keyIntensity = a.keyIntensity + (b.keyIntensity - a.keyIntensity) * ease;
  out.nightFactor = a.nightFactor + (b.nightFactor - a.nightFactor) * ease;
  out.twilightFactor = a.twilightFactor + (b.twilightFactor - a.twilightFactor) * ease;

  return out;
}

export function getAtmospherePalette(
  locationId: string,
  timeOfDay: TimeOfDay,
  weather: WeatherType,
  season: SeasonType,
  activeEvents: ActiveEvent[]
): AtmospherePalette {
  return getBasePhasePalette(locationId, timeOfDay, weather, season, activeEvents);
}

/**
 * Generates a zero-dependency procedural studio environment map for PBR reflections
 * with restrained intensity so daylight stays rich rather than washed out.
 */
export function SceneEnvironmentRig({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const rt = pmrem.fromScene(envScene, 0.04);
    scene.environment = rt.texture;
    scene.environmentIntensity = isSoftwareGl ? 0.22 : 0.28;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene, isSoftwareGl]);

  return null;
}

/**
 * Procedural gradient sky dome updated continuously on the daylight clock.
 */
export function SkyDome({
  paletteRef,
}: {
  paletteRef: MutableRefObject<AtmospherePalette>;
}) {
  const material = useMemo(() => {
    const init = paletteRef.current;
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new Color(init.zenith) },
        uMid: { value: new Color(init.midSky) },
        uHorizon: { value: new Color(init.horizon) },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        varying vec3 vWorldDir;
        void main() {
          float h = clamp(vWorldDir.y, -0.1, 1.0);
          float lowMix = smoothstep(-0.04, 0.28, h);
          float highMix = smoothstep(0.22, 0.82, h);
          vec3 col = mix(uHorizon, uMid, lowMix);
          col = mix(col, uZenith, highMix);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [paletteRef]);

  useFrame(() => {
    const p = paletteRef.current;
    material.uniforms.uZenith.value.set(p.zenith);
    material.uniforms.uMid.value.set(p.midSky);
    material.uniforms.uHorizon.value.set(p.horizon);
  });

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh material={material} renderOrder={-10}>
      <sphereGeometry args={[92, 32, 20]} />
    </mesh>
  );
}

/**
 * Moving Sun & Moon celestial arc, twinkling stars that fade smoothly with twilight,
 * and occasional shooting stars.
 */
export function CelestialBodies({
  hourRef,
  paletteRef,
  locationId,
  weather,
  activeEvents,
}: {
  hourRef: MutableRefObject<number>;
  paletteRef: MutableRefObject<AtmospherePalette>;
  locationId: string;
  weather: WeatherType;
  activeEvents: ActiveEvent[];
}) {
  const hasMeteor = activeEvents.some((e) => e.event.bonusType === 'meteor_shower');
  const hasRainbow = activeEvents.some((e) => e.event.bonusType === 'rainbow_mist');

  const orbGroupRef = useRef<Group>(null);
  const orbMatRef = useRef<MeshBasicMaterial>(null);
  const haloRef = useRef<Mesh>(null);
  const haloMatRef = useRef<MeshBasicMaterial>(null);
  const starsRef = useRef<InstancedMesh>(null);
  const starsMatRef = useRef<MeshBasicMaterial>(null);
  const meteorRef = useRef<Group>(null);

  const starSeeds = useMemo(() => {
    return Array.from({ length: 150 }, (_, i) => {
      const theta = ((i * 137.508) % 180) * (Math.PI / 180);
      const y = 4.2 + ((i * 29) % 140) / 10;
      const r = 46 + (i % 7) * 1.8;
      return {
        x: Math.cos(theta) * r * 1.15,
        y,
        z: -Math.abs(Math.sin(theta) * r) - 8,
        scale: 0.06 + (i % 4) * 0.028,
        phase: i * 0.73,
      };
    });
  }, []);

  useEffect(() => {
    if (starsRef.current) starsRef.current.frustumCulled = false;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const h = hourRef.current;
    const p = paletteRef.current;
    const isDayArc = h >= 5.5 && h <= 19.0 && locationId !== 'midnight_deep' && locationId !== 'alien_waters';

    if (orbGroupRef.current) {
      if (isDayArc) {
        // Sun arcs gracefully above the mountain pass across the visible upper sky
        const sunFrac = (h - 5.5) / (19.0 - 5.5);
        const angle = sunFrac * Math.PI;
        orbGroupRef.current.position.set(-Math.cos(angle) * 20, 2.1 + Math.sin(angle) * 5.0, -44);
      } else {
        // Moon arcs across the night sky above the mountain silhouettes
        const nightH = h > 19.0 ? h - 19.0 : h + 5.0;
        const moonFrac = Math.min(1, Math.max(0, nightH / 10.5));
        const angle = moonFrac * Math.PI;
        orbGroupRef.current.position.set(-Math.cos(angle) * 18, 2.3 + Math.sin(angle) * 4.5, -44);
      }
    }

    if (orbMatRef.current) {
      orbMatRef.current.color.set(p.sunOrMoon);
      orbMatRef.current.opacity = weather === 'rain' ? 0.35 : 0.94;
    }

    if (haloRef.current && haloMatRef.current) {
      const pulse = 1 + Math.sin(t * 0.85) * 0.06;
      haloRef.current.scale.setScalar(pulse);
      haloMatRef.current.color.set(p.sunGlow);
      haloMatRef.current.opacity = weather === 'rain' ? 0.06 : isDayArc ? 0.22 : 0.24;
    }

    const starVis =
      locationId === 'midnight_deep' || locationId === 'alien_waters'
        ? 0.95
        : Math.max(0, (p.nightFactor - 0.25) / 0.75);

    if (starsRef.current && starsMatRef.current) {
      starsRef.current.visible = starVis > 0.02;
      starsMatRef.current.opacity = starVis;
      if (starsRef.current.visible) {
        for (let i = 0; i < starSeeds.length; i++) {
          const s = starSeeds[i];
          const twinkle = 0.55 + 0.45 * Math.sin(t * 1.9 + s.phase);
          _dummy.position.set(s.x, s.y, s.z);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.setScalar(s.scale * twinkle);
          _dummy.updateMatrix();
          starsRef.current.setMatrixAt(i, _dummy.matrix);
        }
        starsRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    if (meteorRef.current) {
      const cycle = (t * (hasMeteor ? 0.65 : 0.16)) % 1;
      const visible = (hasMeteor || cycle < 0.18) && starVis > 0.35;
      meteorRef.current.visible = visible;
      if (visible) {
        const prog = hasMeteor ? cycle : cycle / 0.18;
        meteorRef.current.position.set(-16 + prog * 32, 10 - prog * 5.5, -36);
      }
    }
  });

  return (
    <group>
      <group ref={orbGroupRef} position={[-8, 6.5, -44]}>
        <mesh>
          <sphereGeometry args={[1.65, 24, 24]} />
          <meshBasicMaterial ref={orbMatRef} color="#ffefb8" transparent opacity={0.94} fog={false} />
        </mesh>
        <mesh ref={haloRef} position={[0, 0, -0.2]}>
          <circleGeometry args={[4.2, 32]} />
          <meshBasicMaterial
            ref={haloMatRef}
            color="#facc15"
            transparent
            opacity={0.22}
            blending={AdditiveBlending}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </group>

      <instancedMesh ref={starsRef} args={[undefined, undefined, starSeeds.length]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          ref={starsMatRef}
          color={locationId === 'alien_waters' ? '#f5d0fe' : '#fff8dc'}
          transparent
          opacity={0}
          fog={false}
        />
      </instancedMesh>

      <group ref={meteorRef} rotation={[0, 0, -0.35]}>
        <mesh>
          <boxGeometry args={[1.6, 0.045, 0.045]} />
          <meshBasicMaterial color="#fef08a" transparent opacity={0.85} blending={AdditiveBlending} fog={false} />
        </mesh>
      </group>

      {hasRainbow && (
        <group position={[0, -0.2, -28]}>
          {['#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#c4b5fd'].map((col, idx) => (
            <mesh key={col} position={[0, 0, -idx * 0.05]}>
              <torusGeometry args={[14.5 - idx * 0.28, 0.14, 8, 48, Math.PI]} />
              <meshBasicMaterial color={col} transparent opacity={0.24} depthWrite={false} fog={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Multi-puff 3D clouds drifting slowly and picking up continuous sky/sunset tinting.
 */
export function DriftingClouds({
  paletteRef,
  weather,
  locationId,
}: {
  paletteRef: MutableRefObject<AtmospherePalette>;
  weather: WeatherType;
  locationId: string;
}) {
  const cloudRefs = useRef<Array<Group | null>>([]);
  const opacity = weather === 'rain' ? 0.85 : locationId === 'alien_waters' ? 0.45 : 0.74;

  const cloudMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: paletteRef.current.cloud,
        roughness: 0.95,
        transparent: true,
        opacity,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    cloudMaterial.opacity = opacity;
  }, [cloudMaterial, opacity]);

  useEffect(() => {
    return () => {
      cloudMaterial.dispose();
    };
  }, [cloudMaterial]);

  const cloudDefs = useMemo(
    () => [
      { x: -19, y: 6.4, z: -34, scale: 1.25, speed: 0.22, bobOffset: 0.4 },
      { x: -5, y: 7.4, z: -39, scale: 1.45, speed: 0.16, bobOffset: 1.9 },
      { x: 10, y: 6.1, z: -32, scale: 1.1, speed: 0.25, bobOffset: 3.1 },
      { x: 23, y: 7.1, z: -37, scale: 1.35, speed: 0.18, bobOffset: 4.5 },
      { x: -28, y: 5.9, z: -31, scale: 0.98, speed: 0.27, bobOffset: 2.2 },
    ],
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const speedMult = weather === 'rain' ? 1.85 : 1.0;
    cloudMaterial.color.set(paletteRef.current.cloud);
    cloudDefs.forEach((def, idx) => {
      const node = cloudRefs.current[idx];
      if (!node) return;
      const span = 62;
      const rawX = def.x + t * def.speed * speedMult;
      const wrappedX = ((((rawX + 31) % span) + span) % span) - 31;
      node.position.x = wrappedX;
      node.position.y = def.y + Math.sin(t * 0.35 + def.bobOffset) * 0.18;
    });
  });

  if (locationId === 'midnight_deep') return null;

  return (
    <group>
      {cloudDefs.map((def, idx) => (
        <group
          key={`cloud-${idx}`}
          ref={(el) => {
            cloudRefs.current[idx] = el;
          }}
          position={[def.x, def.y, def.z]}
          scale={def.scale}
        >
          {[
            [0, 0.1, 0, 1.15, 1, 1, 1],
            [-1.05, -0.12, 0.12, 0.92, 1.05, 0.82, 0.85],
            [1.12, -0.15, -0.08, 0.95, 1.1, 0.8, 0.85],
            [0.28, 0.45, 0.05, 0.8, 0.9, 0.75, 0.8],
          ].map(([px, py, pz, r, sx, sy, sz], pIdx) => (
            <mesh key={pIdx} position={[px, py, pz]} scale={[sx, sy, sz]} material={cloudMaterial}>
              <sphereGeometry args={[r, 12, 10]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Distant soaring birds gliding smoothly across the horizon sky during daylight & twilight.
 */
export function SoaringBirds({
  paletteRef,
  weather,
  locationId,
}: {
  paletteRef: MutableRefObject<AtmospherePalette>;
  weather: WeatherType;
  locationId: string;
}) {
  const groupRef = useRef<Group>(null);
  const birdRefs = useRef<Array<Group | null>>([]);
  const leftWings = useRef<Array<Group | null>>([]);
  const rightWings = useRef<Array<Group | null>>([]);

  const flock = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => ({
      offset: idx * 2.65,
      height: 5.5 + (idx % 3) * 0.58,
      depth: -18 - (idx % 3) * 2.1,
      scale: 0.72 + (idx % 3) * 0.13,
      speed: 1.05 + (idx % 3) * 0.09,
      phase: idx * 1.37,
    })),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const isDark = paletteRef.current.nightFactor > 0.72 || weather === 'rain' || locationId === 'midnight_deep';
    if (groupRef.current) groupRef.current.visible = !isDark;
    if (isDark) return;

    flock.forEach((birdData, idx) => {
      const bird = birdRefs.current[idx];
      if (!bird) return;
      const travel = (t * birdData.speed + birdData.offset) % 38;
      const x = travel - 19;
      const y = birdData.height + Math.sin(t * 0.72 + birdData.phase) * 0.24;
      const z = birdData.depth + Math.sin(t * 0.28 + birdData.phase) * 0.75;
      bird.position.set(x, y, z);
      bird.rotation.y = Math.sin(t * 0.28 + birdData.phase) * 0.12;
      bird.rotation.z = Math.sin(t * 0.72 + birdData.phase) * 0.045;

      const flap = Math.sin(t * 5.4 + birdData.phase) * 0.48;
      const left = leftWings.current[idx];
      const right = rightWings.current[idx];
      if (left) left.rotation.x = flap;
      if (right) right.rotation.x = -flap;
    });
  });

  const birdColor = locationId === 'alien_waters' ? '#f0abfc' : '#40534d';
  const bellyColor = locationId === 'alien_waters' ? '#f5d0fe' : '#d9d7c4';

  return (
    <group ref={groupRef}>
      {flock.map((bird, idx) => (
        <group
          key={`bird-${idx}`}
          ref={(el) => { birdRefs.current[idx] = el; }}
          scale={bird.scale}
        >
          {/* Rounded body and a soft contrasting underside read clearly against the sky */}
          <mesh scale={[1, 0.72, 0.78]}>
            <sphereGeometry args={[0.19, 10, 8]} />
            <meshBasicMaterial color={birdColor} />
          </mesh>
          <mesh position={[0.13, -0.055, 0]}>
            <sphereGeometry args={[0.105, 8, 6]} />
            <meshBasicMaterial color={bellyColor} />
          </mesh>
          {/* Tail feathers */}
          <mesh position={[-0.2, 0.015, 0]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.075, 0.22, 5]} />
            <meshBasicMaterial color={birdColor} />
          </mesh>
          {/* Broad tapered wings pivot at the shoulders and gently flap */}
          <group ref={(el) => { leftWings.current[idx] = el; }} position={[0, 0.035, 0.105]}>
            <mesh position={[0.015, 0, 0.19]} rotation={[0.08, 0, -0.08]} scale={[0.78, 0.16, 1.0]}>
              <sphereGeometry args={[0.25, 8, 6]} />
              <meshBasicMaterial color={birdColor} />
            </mesh>
          </group>
          <group ref={(el) => { rightWings.current[idx] = el; }} position={[0, 0.035, -0.105]}>
            <mesh position={[0.015, 0, -0.19]} rotation={[-0.08, 0, -0.08]} scale={[0.78, 0.16, 1.0]}>
              <sphereGeometry args={[0.25, 8, 6]} />
              <meshBasicMaterial color={birdColor} />
            </mesh>
          </group>
          <mesh position={[0.2, 0.025, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.045, 0.11, 5]} />
            <meshBasicMaterial color="#d6a66c" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Fluttering dragonflies & butterflies over the pond lilies and reeds in daytime.
 */
export function PondDragonflies({
  paletteRef,
  weather,
  locationId,
}: {
  paletteRef: MutableRefObject<AtmospherePalette>;
  weather: WeatherType;
  locationId: string;
}) {
  const groupRef = useRef<Group>(null);
  const bugRefs = useRef<Array<Group | null>>([]);
  const wingPairRefs = useRef<Array<Group | null>>([]);

  const bugs = useMemo(
    () => [
      { cx: -5.2, cz: -1.3, rx: 1.15, rz: 0.8, speed: 0.9, color: '#7dd3fc', body: '#0284c7', phase: 0 },
      { cx: 4.4, cz: -2.0, rx: 1.25, rz: 0.85, speed: 0.75, color: '#fde68a', body: '#d97706', phase: 1.8 },
      { cx: 1.8, cz: 3.1, rx: 0.95, rz: 0.68, speed: 1.05, color: '#fbcfe8', body: '#db2777', phase: 3.1 },
      { cx: -2.6, cz: 2.3, rx: 1.05, rz: 0.72, speed: 0.85, color: '#a7f3d0', body: '#059669', phase: 4.4 },
    ],
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const hidden = paletteRef.current.nightFactor > 0.65 || weather === 'rain' || locationId === 'midnight_deep';
    if (groupRef.current) {
      groupRef.current.visible = !hidden;
    }
    if (hidden) return;

    bugs.forEach((b, idx) => {
      const node = bugRefs.current[idx];
      if (!node) return;
      const u = t * b.speed + b.phase;
      const x = b.cx + Math.sin(u) * b.rx;
      const z = b.cz + Math.sin(u * 2) * b.rz * 0.5;
      const y = 0.72 + Math.sin(u * 2.7) * 0.14;
      const vx = Math.cos(u) * b.rx * b.speed;
      const vz = Math.cos(u * 2) * b.rz * b.speed;
      node.position.set(x, y, z);
      node.rotation.y = Math.atan2(-vz, vx);

      const wings = wingPairRefs.current[idx];
      if (wings) {
        wings.scale.y = 0.35 + Math.abs(Math.sin(t * 22 + b.phase)) * 0.65;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {bugs.map((b, idx) => (
        <group
          key={`bug-${idx}`}
          ref={(el) => {
            bugRefs.current[idx] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.022, 0.08, 4, 6]} />
            <meshStandardMaterial color={b.body} roughness={0.4} />
          </mesh>
          <group
            ref={(el) => {
              wingPairRefs.current[idx] = el;
            }}
          >
            <mesh position={[0, 0.03, 0.06]} rotation={[0.45, 0, 0]}>
              <circleGeometry args={[0.065, 8]} />
              <meshBasicMaterial color={b.color} transparent opacity={0.82} side={DoubleSide} />
            </mesh>
            <mesh position={[0, 0.03, -0.06]} rotation={[-0.45, 0, 0]}>
              <circleGeometry args={[0.065, 8]} />
              <meshBasicMaterial color={b.color} transparent opacity={0.82} side={DoubleSide} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/**
 * Location-themed floating particles + smooth twilight/night fireflies.
 */
export function AmbientParticles({
  location,
  paletteRef,
  season,
  activeEvents,
}: {
  location: LocationDef;
  paletteRef: MutableRefObject<AtmospherePalette>;
  season: SeasonType;
  activeEvents: ActiveEvent[];
}) {
  const particleRef = useRef<InstancedMesh>(null);
  const fireflyRef = useRef<InstancedMesh>(null);
  const fireflyMatRef = useRef<MeshBasicMaterial>(null);

  const count = 48;
  const fireflyCount = 26;

  const particleSeeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 73) % 140) / 10 - 7,
        y: 0.6 + ((i * 29) % 36) / 10,
        z: ((i * 47) % 100) / 10 - 5,
        speed: 0.25 + (i % 5) * 0.09,
        phase: i * 1.13,
        size: 0.04 + (i % 3) * 0.018,
      })),
    []
  );

  const fireflySeeds = useMemo(
    () =>
      Array.from({ length: fireflyCount }, (_, i) => {
        const angle = (i / fireflyCount) * Math.PI * 2 + (i % 3) * 0.2;
        const pad = 0.65 + (i % 4) * 0.72;
        const [bx, bz] = getLakeShorePoint(angle, 1.0, pad, pad * 0.75);
        return {
          bx,
          by: 0.65 + (i % 5) * 0.28,
          bz,
          phase: i * 0.91,
          speed: 0.4 + (i % 4) * 0.14,
        };
      }),
    []
  );

  useEffect(() => {
    if (particleRef.current) particleRef.current.frustumCulled = false;
    if (fireflyRef.current) fireflyRef.current.frustumCulled = false;
  }, []);

  const bloomEvent = activeEvents.some((e) => e.event.bonusType === 'plankton_bloom');

  const particleColor = useMemo(() => {
    if (season === 'autumn' && location.particleType === 'petals') return '#f59e0b';
    switch (location.particleType) {
      case 'petals':
        return '#fbcfe8';
      case 'sparkles':
        return '#e0f2fe';
      case 'bubbles':
        return '#a5f3fc';
      case 'abyssal_spores':
        return '#5eead4';
      case 'stardust':
        return '#f0abfc';
      default:
        return '#fef3c7';
    }
  }, [location.particleType, season]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const p = paletteRef.current;

    if (particleRef.current) {
      const rising =
        location.particleType === 'bubbles' ||
        location.particleType === 'abyssal_spores' ||
        location.particleType === 'stardust';
      for (let i = 0; i < count; i++) {
        const s = particleSeeds[i];
        const driftX = s.x + Math.sin(t * 0.45 + s.phase) * 0.65;
        const driftZ = s.z + Math.cos(t * 0.38 + s.phase) * 0.45;
        const rawY = rising
          ? ((s.y + t * s.speed) % 3.8) + 0.35
          : 3.9 - ((s.y + t * s.speed) % 3.4);
        _dummy.position.set(driftX, rawY, driftZ);
        _dummy.rotation.set(t * 0.9 + s.phase, t * 1.2 + s.phase, 0);
        const pulse = 0.7 + 0.35 * Math.sin(t * 2.2 + s.phase);
        const scaleY = location.particleType === 'petals' ? 0.38 : 1.0;
        _dummy.scale.set(s.size * pulse, s.size * pulse * scaleY, s.size * pulse);
        _dummy.updateMatrix();
        particleRef.current.setMatrixAt(i, _dummy.matrix);
      }
      particleRef.current.instanceMatrix.needsUpdate = true;
    }

    const fireflyVis =
      bloomEvent || location.id === 'midnight_deep'
        ? 0.95
        : Math.max(p.twilightFactor * 0.6, p.nightFactor);

    if (fireflyRef.current && fireflyMatRef.current) {
      fireflyRef.current.visible = fireflyVis > 0.05;
      fireflyMatRef.current.opacity = fireflyVis * 0.9;
      if (fireflyRef.current.visible) {
        for (let i = 0; i < fireflyCount; i++) {
          const f = fireflySeeds[i];
          const x = f.bx + Math.sin(t * f.speed + f.phase) * 0.55;
          const y = f.by + Math.sin(t * f.speed * 1.4 + f.phase) * 0.25;
          const z = f.bz + Math.cos(t * f.speed * 0.8 + f.phase) * 0.45;
          const glow = Math.max(0.08, Math.pow((Math.sin(t * 2.3 + f.phase) + 1) * 0.5, 2));
          _dummy.position.set(x, y, z);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.setScalar(0.055 * glow);
          _dummy.updateMatrix();
          fireflyRef.current.setMatrixAt(i, _dummy.matrix);
        }
        fireflyRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <instancedMesh ref={particleRef} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color={particleColor}
          transparent
          opacity={location.particleType === 'petals' ? 0.78 : 0.65}
          blending={location.particleType === 'petals' ? undefined : AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh ref={fireflyRef} args={[undefined, undefined, fireflyCount]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          ref={fireflyMatRef}
          color={location.id === 'alien_waters' ? '#e879f9' : '#d9f99d'}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

/**
 * Animated falling rain streaks + splash rings, winter snow, and dawn/rain mist.
 */
export function AnimatedWeather({
  weather,
  season,
  paletteRef,
}: {
  weather: WeatherType;
  season: SeasonType;
  paletteRef: MutableRefObject<AtmospherePalette>;
}) {
  const rainRef = useRef<InstancedMesh>(null);
  const snowRef = useRef<InstancedMesh>(null);
  const splashRefs = useRef<Array<Mesh | null>>([]);
  const mistRefs = useRef<Array<Mesh | null>>([]);

  const rainCount = 130;
  const snowCount = 85;

  const rainSeeds = useMemo(
    () =>
      Array.from({ length: rainCount }, (_, i) => ({
        x: ((i * 61) % 160) / 10 - 8,
        y: (i * 1.7) % 8,
        z: ((i * 43) % 120) / 10 - 6,
        speed: 8.5 + (i % 4) * 1.4,
      })),
    []
  );

  const snowSeeds = useMemo(
    () =>
      Array.from({ length: snowCount }, (_, i) => ({
        x: ((i * 53) % 160) / 10 - 8,
        y: (i * 1.9) % 7.5,
        z: ((i * 37) % 120) / 10 - 6,
        speed: 0.9 + (i % 5) * 0.22,
        phase: i * 0.83,
        scale: 0.032 + (i % 3) * 0.014,
      })),
    []
  );

  const splashPositions: [number, number, number][] = useMemo(
    () => [
      [-3.8, 0.37, -1.8],
      [3.3, 0.37, -2.2],
      [0.7, 0.37, 1.3],
      [-1.6, 0.37, 2.3],
      [4.5, 0.37, 0.5],
      [-4.9, 0.37, 1.1],
      [1.4, 0.37, -3.0],
      [-0.7, 0.37, -0.8],
    ],
    []
  );

  useEffect(() => {
    if (rainRef.current) rainRef.current.frustumCulled = false;
    if (snowRef.current) snowRef.current.frustumCulled = false;
  }, []);

  const isRain = weather === 'rain';
  const isSnow = season === 'winter' && weather !== 'rain';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mistStrength = isRain ? 0.1 : paletteRef.current.twilightFactor * 0.1;

    if (rainRef.current && isRain) {
      for (let i = 0; i < rainCount; i++) {
        const r = rainSeeds[i];
        const y = 7.8 - ((r.y + t * r.speed) % 7.8);
        const x = r.x - (7.8 - y) * 0.08;
        _dummy.position.set(x, y, r.z);
        _dummy.rotation.set(0, 0, -0.1);
        _dummy.scale.set(0.016, 0.38, 0.016);
        _dummy.updateMatrix();
        rainRef.current.setMatrixAt(i, _dummy.matrix);
      }
      rainRef.current.instanceMatrix.needsUpdate = true;

      splashRefs.current.forEach((ring, idx) => {
        if (!ring) return;
        const phase = (t * 1.45 + idx * 0.27) % 1;
        ring.scale.setScalar(0.18 + phase * 0.85);
        const mat = ring.material as MeshBasicMaterial;
        mat.opacity = (1 - phase) * 0.42;
      });
    }

    if (snowRef.current && isSnow) {
      for (let i = 0; i < snowCount; i++) {
        const s = snowSeeds[i];
        const y = 7.2 - ((s.y + t * s.speed) % 7.0);
        const x = s.x + Math.sin(t * 0.9 + s.phase) * 0.45;
        const z = s.z + Math.cos(t * 0.7 + s.phase) * 0.35;
        _dummy.position.set(x, y, z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(s.scale);
        _dummy.updateMatrix();
        snowRef.current.setMatrixAt(i, _dummy.matrix);
      }
      snowRef.current.instanceMatrix.needsUpdate = true;
    }

    mistRefs.current.forEach((m, idx) => {
      if (!m) return;
      m.visible = mistStrength > 0.015;
      if (m.visible) {
        m.position.x = Math.sin(t * 0.14 + idx * 2.1) * 1.6 + (idx - 1) * 1.2;
        const mat = m.material as MeshBasicMaterial;
        mat.opacity = mistStrength + Math.sin(t * 0.4 + idx) * 0.02;
      }
    });
  });

  return (
    <group>
      {isRain && (
        <>
          <instancedMesh ref={rainRef} args={[undefined, undefined, rainCount]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#cdecf5" transparent opacity={0.4} depthWrite={false} />
          </instancedMesh>
          {splashPositions.map((pos, idx) => (
            <mesh
              key={`splash-${idx}`}
              ref={(el) => {
                splashRefs.current[idx] = el;
              }}
              position={pos}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.14, 0.17, 20]} />
              <meshBasicMaterial color="#e0f7ff" transparent opacity={0.32} side={DoubleSide} depthWrite={false} />
            </mesh>
          ))}
        </>
      )}

      {isSnow && (
        <instancedMesh ref={snowRef} args={[undefined, undefined, snowCount]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.82} depthWrite={false} />
        </instancedMesh>
      )}

      {[0, 1, 2].map((idx) => (
        <mesh
          key={`mist-${idx}`}
          ref={(el) => {
            mistRefs.current[idx] = el;
          }}
          position={[(idx - 1) * 1.4, 0.45 + idx * 0.04, -1.2 + idx * 0.9]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[2.1 + idx * 0.35, 24]} />
          <meshBasicMaterial color="#dcebf0" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}


/**
 * A light seasonal breeze carries small leaves across the foreground in autumn.
 * Instanced meshes keep the effect inexpensive while each leaf tumbles independently.
 */
export function SeasonalDriftParticles({ season }: { season: SeasonType }) {
  const leavesRef = useRef<InstancedMesh>(null);
  const leafCount = 28;
  const seeds = useMemo(
    () => Array.from({ length: leafCount }, (_, idx) => ({
      x: ((idx * 47) % 180) / 10 - 9,
      y: (idx * 1.73) % 7,
      z: ((idx * 31) % 110) / 10 - 5.5,
      speed: 0.42 + (idx % 5) * 0.12,
      phase: idx * 1.19,
      size: 0.62 + (idx % 4) * 0.14,
    })),
    []
  );

  useEffect(() => {
    if (leavesRef.current) leavesRef.current.frustumCulled = false;
  }, []);

  useFrame(({ clock }) => {
    if (!leavesRef.current || (season !== 'autumn' && season !== 'spring')) return;
    const t = clock.getElapsedTime();
    seeds.forEach((leaf, idx) => {
      const fall = (leaf.y + t * leaf.speed) % 7.2;
      const x = leaf.x + Math.sin(t * 0.55 + leaf.phase) * 0.72 + fall * 0.12;
      const y = 7.1 - fall;
      const z = leaf.z + Math.cos(t * 0.38 + leaf.phase) * 0.46;
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(
        Math.sin(t * 1.15 + leaf.phase) * 0.7,
        t * 0.72 + leaf.phase,
        Math.cos(t * 0.9 + leaf.phase) * 0.55
      );
      _dummy.scale.set(leaf.size * 0.13, 0.025, leaf.size * 0.075);
      _dummy.updateMatrix();
      leavesRef.current!.setMatrixAt(idx, _dummy.matrix);
      const colors = season === 'autumn'
        ? ['#d97706', '#ea580c', '#fbbf24', '#b45309', '#c2410c']
        : ['#f9a8d4', '#fbcfe8', '#fda4af', '#fff1f2', '#f0abfc'];
      leavesRef.current!.setColorAt(idx, _cA.set(colors[idx % colors.length]));
    });
    leavesRef.current.instanceMatrix.needsUpdate = true;
    if (leavesRef.current.instanceColor) leavesRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={leavesRef} args={[undefined, undefined, leafCount]} visible={season === 'autumn' || season === 'spring'}>
      <sphereGeometry args={[1, 7, 5]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}

/**
 * Shared procedural height function for the surrounding mountain valley & foothills
 * so ridges, foothill boulders, and background forest trees sit flush on the terrain.
 */
function sampleMountainTerrainHeight(
  x: number,
  z: number,
  isAlpine: boolean,
  isAbyss: boolean
): number {
  // Distance from pond valley center (shifted slightly forward so the pond sits in a sheltered basin)
  const r = Math.hypot(x * 0.84, z + 1.5);
  if (r < 11.5) return -0.55;

  // Smooth ramp up from the valley meadow (r = 11.5..24) into high ridges (r = 24..48)
  const foothillMask = Math.min(1, Math.max(0, (r - 11.5) / 13.0));
  const peakMask = Math.min(1, Math.max(0, (r - 19.5) / 17.0));
  const outerFade = 1 - Math.min(1, Math.max(0, (r - 45.0) / 8.0));

  // Keep a gentle scenic V-shaped mountain pass behind dead-center (x ≈ 0) so sky/sun shine through
  const centerPass = 0.42 + 0.58 * Math.min(1, Math.abs(x) / 11.5);

  // Ridged multi-octave trig noise for natural crags, saddles, and shoulders
  const n1 = 1 - Math.abs(Math.sin(x * 0.11 + z * 0.08 + 0.6));
  const n2 = 1 - Math.abs(Math.sin(x * 0.23 - z * 0.17 + 1.9));
  const n3 = Math.sin(x * 0.37 + z * 0.31) * 0.5 + 0.5;
  const ridge = n1 * 0.58 + n2 * 0.3 + n3 * 0.12;

  const foothillH = (0.85 + ridge * 2.1) * foothillMask * foothillMask;
  const maxPeakBoost = isAlpine ? 9.8 : isAbyss ? 7.6 : 6.9;
  const peakH = Math.pow(ridge, 1.35) * maxPeakBoost * peakMask * centerPass;

  return -0.55 + (foothillH + peakH) * outerFade;
}

/**
 * Multi-layered procedural mountain panorama with faceted vertex-colored terrain,
 * far atmospheric silhouette peaks, foothills, and alien monoliths.
 */
export function DistantRidge({
  locationId,
  season,
  paletteRef,
}: {
  locationId: string;
  season: SeasonType;
  paletteRef: MutableRefObject<AtmospherePalette>;
}) {
  const monolithRefs = useRef<Array<Mesh | null>>([]);
  const terrainMatRef = useRef<MeshStandardMaterial>(null);
  const farPeakMats = useRef<Array<MeshStandardMaterial | null>>([]);
  const farSnowMats = useRef<Array<MeshStandardMaterial | null>>([]);

  const isAlpine = locationId === 'crystal_lake';
  const isAlien = locationId === 'alien_waters';
  const isAbyss = locationId === 'midnight_deep';
  const isTropical = locationId === 'tropical_reef';

  // Sculpted horseshoe mountain valley geometry surrounding the back and flanks of the pond
  const mountainGeo = useMemo(() => {
    const radialSteps = 26;
    const angularSteps = 72;
    const rMin = 10.8;
    const rMax = 49.0;
    // Arc spans from left flank (+17 deg) behind pond (-90 deg) to right flank (-197 deg)
    const angleStart = -Math.PI * 1.12;
    const angleEnd = Math.PI * 0.12;

    const vertCount = (radialSteps + 1) * (angularSteps + 1);
    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const indices: number[] = [];

    const cValley = new Color(
      isAlien
        ? '#311d54'
        : isAbyss
          ? '#172536'
          : isTropical
            ? '#447047'
            : season === 'winter'
              ? '#6e7e87'
              : season === 'autumn'
                ? '#69533b'
                : '#446342'
    );
    const cFoothill = new Color(
      isAlien
        ? '#452778'
        : isAbyss
          ? '#1f3247'
          : isTropical
            ? '#386b52'
            : season === 'winter'
              ? '#5d7380'
              : season === 'autumn'
                ? '#5d5747'
                : '#3b5c4f'
    );
    const cRock = new Color(
      isAlien
        ? '#5b3996'
        : isAbyss
          ? '#273d54'
          : isTropical
            ? '#4f695b'
            : '#5c6b73'
    );
    const cCap = new Color(
      isAlien
        ? '#a855f7'
        : isAbyss
          ? '#3b5875'
          : isTropical
            ? '#528064'
            : season === 'winter' || isAlpine
              ? '#dce6eb'
              : '#9eaab0'
    );
    const tmpCol = new Color();

    let v = 0;
    for (let ir = 0; ir <= radialSteps; ir++) {
      const rf = ir / radialSteps;
      const radius = rMin + rf * (rMax - rMin);
      for (let ia = 0; ia <= angularSteps; ia++) {
        const af = ia / angularSteps;
        const angle = angleStart + af * (angleEnd - angleStart);
        const x = Math.cos(angle) * radius * 1.14;
        const z = Math.sin(angle) * radius * 0.92 - 1.2;
        const y = sampleMountainTerrainHeight(x, z, isAlpine, isAbyss);

        positions[v * 3] = x;
        positions[v * 3 + 1] = y;
        positions[v * 3 + 2] = z;

        const elev = y + 0.55;
        const snowThresh = isAlpine || season === 'winter' ? 3.2 : 5.4;
        if (elev < 1.35) {
          tmpCol.copy(cValley).lerp(cFoothill, Math.min(1, elev / 1.35));
        } else if (elev < snowThresh) {
          tmpCol.copy(cFoothill).lerp(cRock, Math.min(1, (elev - 1.35) / (snowThresh - 1.35)));
        } else {
          tmpCol.copy(cRock).lerp(cCap, Math.min(1, (elev - snowThresh) / 2.6));
        }

        colors[v * 3] = tmpCol.r;
        colors[v * 3 + 1] = tmpCol.g;
        colors[v * 3 + 2] = tmpCol.b;
        v++;
      }
    }

    const rowStride = angularSteps + 1;
    for (let ir = 0; ir < radialSteps; ir++) {
      for (let ia = 0; ia < angularSteps; ia++) {
        const a = ir * rowStride + ia;
        const b = a + 1;
        const c = (ir + 1) * rowStride + ia;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [isAlpine, isAbyss, isAlien, isTropical, season]);

  useEffect(() => {
    return () => {
      mountainGeo.dispose();
    };
  }, [mountainGeo]);

  // Second far-horizon atmospheric mountain silhouettes for majestic layered depth
  const farPeaks = useMemo(
    () => [
      { x: -32, z: -41, r: 9.5, h: isAlpine ? 13.5 : 10.2, rot: 0.25 },
      { x: -19, z: -45, r: 10.5, h: isAlpine ? 15.2 : 11.4, rot: -0.18 },
      { x: -5, z: -48, r: 11.0, h: isAlpine ? 14.2 : 9.8, rot: 0.32 },
      { x: 10, z: -47, r: 10.8, h: isAlpine ? 15.8 : 11.8, rot: -0.22 },
      { x: 24, z: -43, r: 9.8, h: isAlpine ? 14.0 : 10.6, rot: 0.14 },
      { x: 35, z: -37, r: 8.6, h: isAlpine ? 12.2 : 9.2, rot: -0.35 },
    ],
    [isAlpine]
  );

  useFrame(({ clock }) => {
    const p = paletteRef.current;
    // Gently tint the vertex-colored mountain range with warm dawn/dusk or cool night tones
    if (terrainMatRef.current) {
      _cA.set('#ffffff');
      if (p.nightFactor > 0.05) {
        _cB.set('#5e7694');
        _cA.lerp(_cB, p.nightFactor * 0.72);
      }
      if (p.twilightFactor > 0.05) {
        _cB.set(p.sunGlow);
        _cA.lerp(_cB, p.twilightFactor * 0.24);
      }
      terrainMatRef.current.color.copy(_cA);
    }

    farPeakMats.current.forEach((m) => {
      if (m) m.color.set(p.hillFar);
    });
    farSnowMats.current.forEach((m) => {
      if (!m) return;
      _cA.set(season === 'winter' || isAlpine ? '#d8e4eb' : '#96a6ad');
      if (p.twilightFactor > 0.05) {
        _cB.set(p.sunGlow);
        _cA.lerp(_cB, p.twilightFactor * 0.28);
      }
      if (p.nightFactor > 0.05) {
        _cB.set(p.hillFar);
        _cA.lerp(_cB, p.nightFactor * 0.65);
      }
      m.color.copy(_cA);
    });

    if (isAlien) {
      const t = clock.getElapsedTime();
      monolithRefs.current.forEach((m, idx) => {
        if (!m) return;
        m.position.y = 3.2 + idx * 0.35 + Math.sin(t * 0.7 + idx * 1.4) * 0.38;
        m.rotation.y = t * 0.15 + idx;
      });
    }
  });

  return (
    <group>
      {/* Sculpted mountain valley & foothills surrounding the pond */}
      <mesh geometry={mountainGeo} receiveShadow>
        <meshStandardMaterial
          ref={terrainMatRef}
          vertexColors
          roughness={0.94}
          flatShading
        />
      </mesh>

      {/* Far atmospheric silhouette peaks behind the main mountain ridge */}
      {farPeaks.map((pk, idx) => (
        <group key={`far-peak-${idx}`} position={[pk.x, -0.6, pk.z]} rotation={[0, pk.rot, 0]}>
          <mesh position={[0, pk.h * 0.48, 0]}>
            <coneGeometry args={[pk.r, pk.h, 7]} />
            <meshStandardMaterial
              ref={(el) => {
                farPeakMats.current[idx] = el;
              }}
              color={paletteRef.current.hillFar}
              roughness={0.98}
              flatShading
            />
          </mesh>
          {(isAlpine || season === 'winter' || idx % 2 === 1) && !isTropical && !isAlien && !isAbyss && (
            <mesh position={[0, pk.h * 0.78, 0]}>
              <coneGeometry args={[pk.r * 0.37, pk.h * 0.4, 7]} />
              <meshStandardMaterial
                ref={(el) => {
                  farSnowMats.current[idx] = el;
                }}
                color="#cbd8e0"
                roughness={0.86}
                flatShading
              />
            </mesh>
          )}
        </group>
      ))}

      {isAlien &&
        [
          [-12, -16],
          [-4, -19],
          [5, -18],
          [13, -15],
        ].map(([x, z], idx) => (
          <mesh
            key={`monolith-${idx}`}
            ref={(el) => {
              monolithRefs.current[idx] = el;
            }}
            position={[x, 3.2, z]}
          >
            <octahedronGeometry args={[1.05 + (idx % 2) * 0.4, 0]} />
            <meshStandardMaterial
              color="#7e22ce"
              emissive="#c026d3"
              emissiveIntensity={0.45}
              roughness={0.35}
              metalness={0.4}
            />
          </mesh>
        ))}
    </group>
  );
}

/**
 * Instanced multi-part evergreen & broadleaf forest bands populating the meadow perimeter
 * and foothill slopes around the pond, seated flush on the terrain elevation.
 */
export function BackgroundForest({
  locationId,
  season,
  paletteRef,
}: {
  locationId: string;
  season: SeasonType;
  paletteRef: MutableRefObject<AtmospherePalette>;
}) {
  const pineTrunkRef = useRef<InstancedMesh>(null);
  const pineLowerRef = useRef<InstancedMesh>(null);
  const pineMidRef = useRef<InstancedMesh>(null);
  const pineTopRef = useRef<InstancedMesh>(null);

  const broadTrunkRef = useRef<InstancedMesh>(null);
  const broadCrownMainRef = useRef<InstancedMesh>(null);
  const broadCrownSideRef = useRef<InstancedMesh>(null);

  const trunkMaterial = useMemo(() => new MeshStandardMaterial({ color: '#4f3723', roughness: 0.95 }), []);
  const pineMaterial = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, flatShading: true }), []);
  const broadMaterial = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88 }), []);

  useEffect(() => {
    return () => {
      trunkMaterial.dispose();
      pineMaterial.dispose();
      broadMaterial.dispose();
    };
  }, [trunkMaterial, pineMaterial, broadMaterial]);

  const isAlpine = locationId === 'crystal_lake';
  const isAbyss = locationId === 'midnight_deep';
  const isAlien = locationId === 'alien_waters';
  const isTropical = locationId === 'tropical_reef';

  // Deterministic, organically clustered forest layout framing the flanks and foothill slopes
  // while leaving a natural vista corridor through the central mountain pass
  const { pines, broads } = useMemo(() => {
    const pineList: Array<{ x: number; y: number; z: number; scale: number; rot: number; shade: number }> = [];
    const broadList: Array<{ x: number; y: number; z: number; scale: number; rot: number; shade: number }> = [];

    const total = 124;
    for (let i = 0; i < total; i++) {
      // Pseudo-random deterministic scatter
      const h1 = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
      const r1 = h1 - Math.floor(h1);
      const h2 = Math.sin(i * 78.233 + 1.732) * 28411.1234;
      const r2 = h2 - Math.floor(h2);
      const h3 = Math.sin(i * 39.425 + 9.21) * 19341.871;
      const r3 = h3 - Math.floor(h3);

      // Arc behind and around left/right flanks (-198 deg to +18 deg)
      const angle = -Math.PI * 1.1 + r1 * Math.PI * 1.2;
      const radius = 9.4 + Math.pow(r2, 0.8) * 19.5;
      const x = Math.cos(angle) * radius * 1.16;
      const z = Math.sin(angle) * radius * 0.9 - 1.0;

      // Keep trees cleanly outside the irregular lake shoreline & bays
      if (isInsideLakePerimeter(x, z, 2.55, 1.95)) continue;
      // Keep central lake vista open close-in while allowing lush treeline further back
      if (Math.abs(x) < 4.2 && z > -11.8 && z < 6) continue;
      // Avoid overlapping the foreground view
      if (z > 3.8 && Math.abs(x) < 9.5) continue;

      const groundY = sampleMountainTerrainHeight(x, z, isAlpine, isAbyss);
      // Keep trees nestled on the meadow and lower/mid mountain slopes
      if (groundY > 2.65) continue;

      const scale = 0.72 + r3 * 0.68;
      const rot = r1 * Math.PI * 2;
      const shade = r2;

      const isConifer = isAlpine ? r3 < 0.88 : isTropical ? r3 < 0.25 : r3 < 0.68;
      if (isConifer) {
        pineList.push({ x, y: groundY, z, scale, rot, shade });
      } else {
        broadList.push({ x, y: groundY, z, scale, rot, shade });
      }
    }

    return { pines: pineList, broads: broadList };
  }, [isAlpine, isAbyss, isTropical]);

  useEffect(() => {
    const pinePalette = isAlien
      ? ['#6b21a8', '#7e22ce', '#581c87', '#9333ea']
      : isAbyss
        ? ['#0f5e59', '#115e59', '#134e4a', '#0d736c']
        : isTropical
          ? ['#2d6a3e', '#3a7d44', '#225732', '#4c8f4f']
          : season === 'winter'
            ? ['#2f524c', '#3b615a', '#486e67', '#264540']
            : ['#1e4d38', '#255c40', '#2e6b47', '#1a4230'];

    const broadPalette = isAlien
      ? ['#9333ea', '#c026d3', '#7e22ce', '#a855f7']
      : isAbyss
        ? ['#0d9488', '#14b8a6', '#0f766e', '#2dd4bf']
        : isTropical
          ? ['#3f8f46', '#56a34b', '#2f7a3e', '#6ab04c']
          : season === 'autumn'
            ? ['#b85d28', '#c97a2b', '#9e3e24', '#d49435']
            : season === 'winter'
              ? ['#5e7572', '#6f8580', '#4f6360', '#798e89']
              : ['#2f6b47', '#3d7d4b', '#4d8a4f', '#27593b'];

    // Populate Pine Instances
    pines.forEach((tree, i) => {
      const col = _cA.set(pinePalette[i % pinePalette.length]);

      _dummy.position.set(tree.x, tree.y + 0.48 * tree.scale, tree.z);
      _dummy.rotation.set(0, tree.rot, 0);
      _dummy.scale.set(tree.scale, tree.scale, tree.scale);
      _dummy.updateMatrix();
      pineTrunkRef.current?.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(tree.x, tree.y + 1.05 * tree.scale, tree.z);
      _dummy.scale.set(tree.scale, tree.scale, tree.scale);
      _dummy.updateMatrix();
      pineLowerRef.current?.setMatrixAt(i, _dummy.matrix);
      pineLowerRef.current?.setColorAt(i, col);

      _dummy.position.set(tree.x, tree.y + 1.68 * tree.scale, tree.z);
      _dummy.rotation.set(0, tree.rot + 0.5, 0);
      _dummy.updateMatrix();
      pineMidRef.current?.setMatrixAt(i, _dummy.matrix);
      pineMidRef.current?.setColorAt(i, _cB.copy(col).offsetHSL(0.01, 0.02, 0.03));

      _dummy.position.set(tree.x, tree.y + 2.24 * tree.scale, tree.z);
      _dummy.rotation.set(0, tree.rot + 1.0, 0);
      _dummy.updateMatrix();
      pineTopRef.current?.setMatrixAt(i, _dummy.matrix);
      pineTopRef.current?.setColorAt(i, _cB.copy(col).offsetHSL(-0.01, 0.02, 0.06));
    });

    if (pineTrunkRef.current) {
      pineTrunkRef.current.instanceMatrix.needsUpdate = true;
      pineTrunkRef.current.frustumCulled = false;
    }
    [pineLowerRef, pineMidRef, pineTopRef].forEach((ref) => {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
        ref.current.frustumCulled = false;
      }
    });

    // Populate Broadleaf Instances
    broads.forEach((tree, i) => {
      const col = _cA.set(broadPalette[i % broadPalette.length]);

      _dummy.position.set(tree.x, tree.y + 0.58 * tree.scale, tree.z);
      _dummy.rotation.set(0, tree.rot, 0);
      _dummy.scale.set(tree.scale, tree.scale, tree.scale);
      _dummy.updateMatrix();
      broadTrunkRef.current?.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(tree.x, tree.y + 1.42 * tree.scale, tree.z);
      _dummy.scale.set(tree.scale * 1.08, tree.scale * 0.88, tree.scale * 1.05);
      _dummy.updateMatrix();
      broadCrownMainRef.current?.setMatrixAt(i, _dummy.matrix);
      broadCrownMainRef.current?.setColorAt(i, col);

      _dummy.position.set(
        tree.x + Math.cos(tree.rot) * 0.34 * tree.scale,
        tree.y + 1.74 * tree.scale,
        tree.z + Math.sin(tree.rot) * 0.34 * tree.scale
      );
      _dummy.scale.set(tree.scale * 0.74, tree.scale * 0.68, tree.scale * 0.74);
      _dummy.updateMatrix();
      broadCrownSideRef.current?.setMatrixAt(i, _dummy.matrix);
      broadCrownSideRef.current?.setColorAt(i, _cB.copy(col).offsetHSL(0.015, 0, 0.04));
    });

    if (broadTrunkRef.current) {
      broadTrunkRef.current.instanceMatrix.needsUpdate = true;
      broadTrunkRef.current.frustumCulled = false;
    }
    [broadCrownMainRef, broadCrownSideRef].forEach((ref) => {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
        ref.current.frustumCulled = false;
      }
    });
  }, [pines, broads, isAlien, isAbyss, isTropical, season]);

  useFrame(() => {
    const p = paletteRef.current;
    _cA.set('#ffffff');
    if (p.nightFactor > 0.05) {
      _cB.set('#4c647d');
      _cA.lerp(_cB, p.nightFactor * 0.75);
    }
    if (p.twilightFactor > 0.05) {
      _cB.set(p.sunGlow);
      _cA.lerp(_cB, p.twilightFactor * 0.22);
    }
    pineMaterial.color.copy(_cA);
    broadMaterial.color.copy(_cA);
    trunkMaterial.color.set(isAlien ? '#3b2466' : isAbyss ? '#1e3242' : '#4f3723').multiply(_cA);
  });

  return (
    <group>
      {pines.length > 0 && (
        <>
          <instancedMesh ref={pineTrunkRef} args={[undefined, undefined, pines.length]} material={trunkMaterial} receiveShadow>
            <cylinderGeometry args={[0.1, 0.2, 1.05, 6]} />
          </instancedMesh>
          <instancedMesh ref={pineLowerRef} args={[undefined, undefined, pines.length]} material={pineMaterial} receiveShadow>
            <coneGeometry args={[0.92, 1.15, 7]} />
          </instancedMesh>
          <instancedMesh ref={pineMidRef} args={[undefined, undefined, pines.length]} material={pineMaterial} receiveShadow>
            <coneGeometry args={[0.72, 1.02, 7]} />
          </instancedMesh>
          <instancedMesh ref={pineTopRef} args={[undefined, undefined, pines.length]} material={pineMaterial} receiveShadow>
            <coneGeometry args={[0.48, 0.86, 7]} />
          </instancedMesh>
        </>
      )}

      {broads.length > 0 && (
        <>
          <instancedMesh ref={broadTrunkRef} args={[undefined, undefined, broads.length]} material={trunkMaterial} receiveShadow>
            <cylinderGeometry args={[0.14, 0.24, 1.2, 7]} />
          </instancedMesh>
          <instancedMesh ref={broadCrownMainRef} args={[undefined, undefined, broads.length]} material={broadMaterial} receiveShadow>
            <dodecahedronGeometry args={[0.88, 1]} />
          </instancedMesh>
          <instancedMesh ref={broadCrownSideRef} args={[undefined, undefined, broads.length]} material={broadMaterial} receiveShadow>
            <dodecahedronGeometry args={[0.72, 1]} />
          </instancedMesh>
        </>
      )}
    </group>
  );
}
