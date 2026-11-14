import { useFrame } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import {
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Shape,
  Vector2,
  Vector3,
} from 'three';
import {
  DEFAULT_CUSTOMIZATION,
  FACIAL_HAIR_STYLES,
  FishermanCustomization,
  HAIR_STYLES,
  HATS,
  OUTFITS,
  SKIN_TONES,
} from '../../data/cosmeticsData';

type FishingPhase = 'idle' | 'casting' | 'waiting' | 'nibble' | 'hooked' | 'reeling';

const _charWorldPos = new Vector3();

// Shared procedural geometries built once at module scope (zero per-render allocation)
function createBootUpperGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.0, 0.03),
    new Vector2(0.092, 0.035),
    new Vector2(0.095, 0.09),
    new Vector2(0.084, 0.15),
    new Vector2(0.086, 0.24),
    new Vector2(0.075, 0.245),
    new Vector2(0.0, 0.245),
  ];
  const geo = new LatheGeometry(pts, 14);
  geo.computeVertexNormals();
  return geo;
}

function createTrouserLegGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.0, 0.0),
    new Vector2(0.088, 0.0),
    new Vector2(0.094, 0.08),
    new Vector2(0.092, 0.24),
    new Vector2(0.108, 0.40),
    new Vector2(0.118, 0.54),
    new Vector2(0.0, 0.55),
  ];
  const geo = new LatheGeometry(pts, 14);
  geo.computeVertexNormals();
  return geo;
}

function createPelvisGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.0, 0.0),
    new Vector2(0.195, 0.01),
    new Vector2(0.228, 0.075),
    new Vector2(0.215, 0.14),
    new Vector2(0.0, 0.145),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.computeVertexNormals();
  return geo;
}

function createTorsoGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.0, 0.0),
    new Vector2(0.212, 0.02),
    new Vector2(0.205, 0.12),
    new Vector2(0.232, 0.26),
    new Vector2(0.262, 0.42),
    new Vector2(0.258, 0.54),
    new Vector2(0.205, 0.62),
    new Vector2(0.11, 0.66),
    new Vector2(0.0, 0.665),
  ];
  const geo = new LatheGeometry(pts, 20);
  geo.computeVertexNormals();
  return geo;
}

function createNeckGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.0, 0.0),
    new Vector2(0.092, 0.0),
    new Vector2(0.078, 0.06),
    new Vector2(0.074, 0.13),
    new Vector2(0.078, 0.17),
    new Vector2(0.0, 0.175),
  ];
  const geo = new LatheGeometry(pts, 14);
  geo.computeVertexNormals();
  return geo;
}

function createHeadGeometry(): LatheGeometry {
  // Chin at y = -0.17, cheekbones around y = -0.02, cranium top at y = +0.20
  const pts = [
    new Vector2(0.0, -0.175),
    new Vector2(0.068, -0.165),
    new Vector2(0.132, -0.12),
    new Vector2(0.168, -0.055),
    new Vector2(0.184, 0.015),
    new Vector2(0.188, 0.08),
    new Vector2(0.17, 0.14),
    new Vector2(0.125, 0.182),
    new Vector2(0.06, 0.202),
    new Vector2(0.0, 0.206),
  ];
  const geo = new LatheGeometry(pts, 22);
  geo.computeVertexNormals();
  return geo;
}

function createSleeveLimbGeometry(rBottom: number, rTop: number, length: number): CylinderGeometry {
  const geo = new CylinderGeometry(rTop, rBottom, length, 12);
  geo.translate(0, -length * 0.5, 0);
  return geo;
}

function createStrawBrimGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.18, 0.005),
    new Vector2(0.24, -0.008),
    new Vector2(0.31, -0.022),
    new Vector2(0.37, -0.018),
    new Vector2(0.39, -0.006),
    new Vector2(0.37, 0.004),
    new Vector2(0.28, -0.004),
    new Vector2(0.185, 0.018),
  ];
  const geo = new LatheGeometry(pts, 26);
  geo.computeVertexNormals();
  return geo;
}

function createStrawCrownGeometry(): LatheGeometry {
  const pts = [
    new Vector2(0.19, 0.0),
    new Vector2(0.192, 0.03),
    new Vector2(0.176, 0.10),
    new Vector2(0.155, 0.155),
    new Vector2(0.11, 0.172),
    new Vector2(0.04, 0.165),
    new Vector2(0.0, 0.162),
  ];
  const geo = new LatheGeometry(pts, 24);
  geo.computeVertexNormals();
  return geo;
}

function createFullBeardGeometry(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(-0.155, 0.05);
  s.quadraticCurveTo(-0.165, -0.07, -0.105, -0.165);
  s.quadraticCurveTo(0, -0.235, 0.105, -0.165);
  s.quadraticCurveTo(0.165, -0.07, 0.155, 0.05);
  s.quadraticCurveTo(0.08, -0.01, 0, -0.01);
  s.quadraticCurveTo(-0.08, -0.01, -0.155, 0.05);
  s.closePath();

  const geo = new ExtrudeGeometry(s, {
    depth: 0.095,
    bevelEnabled: true,
    bevelThickness: 0.026,
    bevelSize: 0.022,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(0, 0, -0.03);
  geo.computeVertexNormals();
  return geo;
}

function createCapeGeometry(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(-0.22, 0);
  s.lineTo(0.22, 0);
  s.lineTo(0.32, -0.82);
  s.quadraticCurveTo(0, -0.9, -0.32, -0.82);
  s.closePath();
  const geo = new ExtrudeGeometry(s, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
  });
  geo.computeVertexNormals();
  return geo;
}

const BOOT_UPPER_GEO = createBootUpperGeometry();
const TROUSER_LEG_GEO = createTrouserLegGeometry();
const PELVIS_GEO = createPelvisGeometry();
const TORSO_GEO = createTorsoGeometry();
const NECK_GEO = createNeckGeometry();
const HEAD_GEO = createHeadGeometry();
const UPPER_ARM_GEO = createSleeveLimbGeometry(0.068, 0.078, 0.28);
const FOREARM_GEO = createSleeveLimbGeometry(0.054, 0.066, 0.25);
const STRAW_BRIM_GEO = createStrawBrimGeometry();
const STRAW_CROWN_GEO = createStrawCrownGeometry();
const FULL_BEARD_GEO = createFullBeardGeometry();
const CAPE_GEO = createCapeGeometry();

function HandMesh({ skinColor, gripClosed = false }: { skinColor: string; gripClosed?: boolean }) {
  return (
    <group>
      {/* Palm */}
      <mesh position={[0, -0.038, 0.005]} scale={[0.92, 1.08, 0.64]} castShadow>
        <sphereGeometry args={[0.048, 12, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.62} />
      </mesh>
      {/* Thumb */}
      <mesh position={[-0.034, -0.026, 0.026]} rotation={[0.4, 0.2, 0.5]} castShadow>
        <capsuleGeometry args={[0.014, 0.032, 4, 6]} />
        <meshStandardMaterial color={skinColor} roughness={0.62} />
      </mesh>
      {/* Curled fingers */}
      <mesh
        position={[0.006, -0.072, gripClosed ? 0.022 : 0.012]}
        rotation={[gripClosed ? 0.85 : 0.35, 0, 0]}
        scale={[1.05, 0.8, 0.72]}
        castShadow
      >
        <capsuleGeometry args={[0.032, 0.03, 4, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.62} />
      </mesh>
    </group>
  );
}

function smooth01(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function Fisherman({
  customization = DEFAULT_CUSTOMIZATION,
  fishingState,
  rodTipRef,
  castTarget = null,
  boatYaw = 0,
}: {
  customization?: FishermanCustomization;
  fishingState: FishingPhase;
  rodTipRef: MutableRefObject<Group | null>;
  castTarget?: [number, number, number] | null;
  boatYaw?: number;
}) {
  const character = useRef<Group>(null);
  const hipGroup = useRef<Group>(null);
  const torsoGroup = useRef<Group>(null);
  const headGroup = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const leftForearm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const rightForearm = useRef<Group>(null);
  const rightWrist = useRef<Group>(null);
  const rodGroup = useRef<Group>(null);
  const rodUpperRef = useRef<Group>(null);

  const castElapsedRef = useRef(0);
  const reelElapsedRef = useRef(0);

  useEffect(() => {
    if (fishingState === 'casting') {
      castElapsedRef.current = 0;
    } else if (fishingState === 'reeling') {
      reelElapsedRef.current = 0;
    }
  }, [fishingState]);

  const outfit = OUTFITS.find((item) => item.id === customization.outfitId) || OUTFITS[0];
  const skin = SKIN_TONES.find((item) => item.id === customization.skinId) || SKIN_TONES[1];
  const hair = HAIR_STYLES.find((item) => item.id === customization.hairId) || HAIR_STYLES[0];
  const beard = FACIAL_HAIR_STYLES.find((item) => item.id === customization.facialHairId) || FACIAL_HAIR_STYLES[0];
  const hat = HATS.find((item) => item.id === customization.hatId) || HATS[0];

  const pantsColor = useMemo(() => {
    if (outfit.id === 'outfit_overalls') return outfit.color;
    if (outfit.id === 'outfit_slicker') return '#334155';
    if (outfit.id === 'outfit_hawaiian') return '#c2a67d';
    if (outfit.id === 'outfit_vampire' || outfit.id === 'outfit_skeleton') return '#0f172a';
    if (outfit.id === 'outfit_ghost') return '#e2e8f0';
    return '#4b433b';
  }, [outfit]);

  const sleeveColor = useMemo(() => {
    if (outfit.id === 'outfit_overalls') return outfit.accentColor || '#b91c1c';
    if (outfit.id === 'outfit_vest') return '#d6c7ae';
    return outfit.color;
  }, [outfit]);

  const shirtColor = outfit.accentColor || '#b91c1c';
  const showSkin = hat.id !== 'hat_ghost' && hat.id !== 'hat_pumpkin' && hat.id !== 'hat_diver' && hat.id !== 'hat_skeleton';

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const dt = Math.min(delta, 0.08);

    const casting = fishingState === 'casting';
    const waiting = fishingState === 'waiting';
    const nibbling = fishingState === 'nibble';
    const hooked = fishingState === 'hooked';
    const reeling = fishingState === 'reeling';

    if (casting) castElapsedRef.current += dt;
    if (reeling) reelElapsedRef.current += dt;

    // Normalized 0..1 cast phases across 0.90s:
    // 0.00-0.28s wind-up backswing, 0.28-0.56s whip release, 0.56-0.90s follow-through settle
    const castT = Math.min(1, castElapsedRef.current / 0.9);
    const windUp = smooth01(0.0, 0.28, castT);
    const whip = smooth01(0.26, 0.56, castT);
    const settle = smooth01(0.56, 0.95, castT);

    // Gentle directional aim toward the target spot on the water in boat-local space
    let targetYawOffset = -0.18;
    if (castTarget && fishingState !== 'idle' && character.current) {
      character.current.getWorldPosition(_charWorldPos);
      const dx = castTarget[0] - _charWorldPos.x;
      const dz = castTarget[2] - _charWorldPos.z;
      const worldYaw = Math.atan2(dx, dz);
      let relYaw = worldYaw - boatYaw;
      while (relYaw > Math.PI) relYaw -= Math.PI * 2;
      while (relYaw < -Math.PI) relYaw += Math.PI * 2;
      targetYawOffset = MathUtils.clamp(relYaw, -1.25, 1.55);
    }

    // Layered organic idle breathing + subtle weight shift
    const breathSlow = Math.sin(time * 1.45);
    const breathHarmonic = Math.sin(time * 2.9 + 0.6) * 0.22;
    const weightWave = Math.sin(time * 0.62) + Math.sin(time * 1.13 + 1.2) * 0.35;

    // 1. Root posture & weight shift (boots stay grounded firmly on boat deck)
    if (character.current) {
      const baseYaw =
        targetYawOffset +
        (casting ? (windUp * -0.28 + whip * 0.44 - settle * 0.14) : 0) +
        (hooked ? -0.08 + Math.sin(time * 3.8) * 0.03 : 0) +
        weightWave * 0.025;

      const rootSwayZ =
        weightWave * 0.014 +
        (casting ? (windUp * 0.035 - whip * 0.06 + settle * 0.025) : 0) +
        (hooked ? Math.sin(time * 5.2) * 0.022 : 0);

      character.current.rotation.y = MathUtils.damp(character.current.rotation.y, baseYaw, 7.5, dt);
      character.current.rotation.z = MathUtils.damp(character.current.rotation.z, rootSwayZ, 7.5, dt);
    }

    // 2. Hip dip & lateral shift for natural knee/leg balance
    if (hipGroup.current) {
      const kneeDip = casting
        ? -(windUp * 0.035) + whip * 0.018 - settle * 0.01
        : hooked
          ? -0.045 + Math.sin(time * 6) * 0.008
          : reeling
            ? -0.025 + Math.sin(time * 7) * 0.012
            : Math.abs(weightWave) * -0.006;
      const hipShiftX = weightWave * 0.015 + (casting ? windUp * 0.025 - whip * 0.035 : 0);
      hipGroup.current.position.y = MathUtils.damp(hipGroup.current.position.y, kneeDip, 9, dt);
      hipGroup.current.position.x = MathUtils.damp(hipGroup.current.position.x, hipShiftX, 8, dt);
    }

    // 3. Upper Torso spine pitch, twist & breathing
    if (torsoGroup.current) {
      const breathScale = 1 + (breathSlow + breathHarmonic) * 0.013;
      torsoGroup.current.scale.y = breathScale;
      torsoGroup.current.scale.z = 1 + breathSlow * 0.01;

      const spinePitch = casting
        ? -(windUp * 0.16) + whip * 0.28 - settle * 0.1
        : hooked
          ? -0.14 + Math.sin(time * 7) * 0.028
          : reeling
            ? -0.09 + Math.sin(time * 7.5) * 0.04
            : nibbling
              ? 0.04 + Math.sin(time * 5.5) * 0.018
              : 0.02 + breathSlow * 0.016;

      const spineYaw = casting
        ? -(windUp * 0.34) + whip * 0.56 - settle * 0.18
        : reeling
          ? Math.sin(time * 7.5) * 0.065
          : hooked
            ? -0.08 + Math.sin(time * 4.5) * 0.04
            : weightWave * 0.024;

      const spineRoll = casting
        ? windUp * 0.07 - whip * 0.11 + settle * 0.04
        : weightWave * 0.018;

      torsoGroup.current.rotation.x = MathUtils.damp(torsoGroup.current.rotation.x, spinePitch, 10, dt);
      torsoGroup.current.rotation.y = MathUtils.damp(torsoGroup.current.rotation.y, spineYaw, 10, dt);
      torsoGroup.current.rotation.z = MathUtils.damp(torsoGroup.current.rotation.z, spineRoll, 9, dt);
    }

    // 4. Head gaze & expressive motion
    if (headGroup.current) {
      const headPitch = casting
        ? -(windUp * 0.12) + whip * 0.18 - settle * 0.04
        : hooked
          ? 0.12 + Math.sin(time * 6) * 0.025
          : nibbling
            ? 0.14
            : waiting
              ? 0.08 + Math.sin(time * 0.9) * 0.025
              : Math.sin(time * 0.85) * 0.035;

      const headYaw = casting
        ? windUp * 0.12 - whip * 0.16
        : Math.sin(time * 0.45) * 0.09 + (waiting || nibbling ? targetYawOffset * 0.45 : 0);

      const headTilt = Math.sin(time * 0.7 + 0.8) * 0.03 + (nibbling ? 0.06 : 0);

      headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, headPitch, 8.5, dt);
      headGroup.current.rotation.y = MathUtils.damp(headGroup.current.rotation.y, headYaw, 7, dt);
      headGroup.current.rotation.z = MathUtils.damp(headGroup.current.rotation.z, headTilt, 7, dt);
    }

    // 5. Right Arm + Forearm + Wrist + Flexing Rod
    if (rightArm.current && rightForearm.current && rightWrist.current) {
      const armPitch = casting
        ? -0.46 - windUp * 0.92 + whip * 1.18 - settle * 0.25
        : hooked
          ? -0.78 + Math.sin(time * 9) * 0.055
          : reeling
            ? -0.66 + Math.sin(time * 7.5) * 0.075
            : nibbling
              ? -0.52 + Math.sin(time * 8) * 0.035
              : -0.42 + breathSlow * 0.03;

      const armOut = casting
        ? -0.15 - windUp * 0.22 + whip * 0.24
        : hooked || reeling
          ? -0.1
          : -0.16 + Math.sin(time * 0.7) * 0.02;

      rightArm.current.rotation.x = MathUtils.damp(rightArm.current.rotation.x, armPitch, casting ? 14 : 9, dt);
      rightArm.current.rotation.z = MathUtils.damp(rightArm.current.rotation.z, armOut, 10, dt);

      const forearmBend = casting
        ? -0.75 - windUp * 0.55 + whip * 0.88 - settle * 0.35
        : hooked
          ? -0.96 + Math.sin(time * 9.5) * 0.04
          : reeling
            ? -0.88 + Math.sin(time * 7.5) * 0.06
            : -0.74 + breathSlow * 0.028;

      rightForearm.current.rotation.x = MathUtils.damp(rightForearm.current.rotation.x, forearmBend, casting ? 14 : 9, dt);

      const wristFlick = casting
        ? -(windUp * 0.45) + whip * 0.82 - settle * 0.32
        : nibbling
          ? Math.sin(time * 10) * 0.06
          : hooked
            ? 0.14 + Math.sin(time * 11) * 0.04
            : Math.sin(time * 1.2) * 0.025;
      rightWrist.current.rotation.x = MathUtils.damp(rightWrist.current.rotation.x, wristFlick, 16, dt);
    }

    // 6. Left Arm (natural balance during cast, circular reel cranking during reel-in)
    if (leftArm.current && leftForearm.current) {
      const crankAngle = time * 11.5;
      const lPitch = reeling
        ? -0.62 + Math.sin(crankAngle) * 0.18
        : hooked
          ? -0.56 + Math.sin(time * 6) * 0.03
          : casting
            ? -0.12 - windUp * 0.28 + whip * 0.38 - settle * 0.18
            : -0.14 + Math.sin(time * 1.1 + 0.7) * 0.035;

      const lSplay = reeling
        ? 0.28 + Math.cos(crankAngle) * 0.08
        : hooked
          ? 0.24
          : casting
            ? 0.16 + windUp * 0.12
            : 0.12 + weightWave * 0.02;

      leftArm.current.rotation.x = MathUtils.damp(leftArm.current.rotation.x, lPitch, 10, dt);
      leftArm.current.rotation.z = MathUtils.damp(leftArm.current.rotation.z, lSplay, 10, dt);

      const lForearm = reeling
        ? -1.02 + Math.cos(crankAngle) * 0.22
        : hooked
          ? -0.88
          : casting
            ? -0.45 - windUp * 0.22 + whip * 0.24
            : -0.34 + Math.sin(time * 1.2 + 0.4) * 0.04;
      leftForearm.current.rotation.x = MathUtils.damp(leftForearm.current.rotation.x, lForearm, 11, dt);
    }

    // 7. Fishing Rod Angle & Tip Flex under Cast Whip / Fish Fight
    if (rodGroup.current && rodUpperRef.current) {
      const rodPitch = casting
        ? -(windUp * 0.36) + whip * 0.56 - settle * 0.18
        : hooked
          ? 0.26 + Math.sin(time * 11) * 0.045
          : reeling
            ? 0.24 + Math.sin(time * 7.5) * 0.05
            : nibbling
              ? 0.06 + Math.sin(time * 9) * 0.04
              : Math.sin(time * 1.1) * 0.018;
      rodGroup.current.rotation.x = MathUtils.damp(rodGroup.current.rotation.x, rodPitch, 14, dt);

      const tipBend = casting
        ? -(windUp * 0.16) + whip * 0.34 - settle * 0.18
        : hooked
          ? 0.24 + Math.sin(time * 12) * 0.06
          : reeling
            ? 0.18 + Math.sin(time * 8) * 0.04
            : nibbling
              ? 0.06 + Math.sin(time * 10) * 0.05
              : 0.02;
      rodUpperRef.current.rotation.x = MathUtils.damp(rodUpperRef.current.rotation.x, tipBend, 16, dt);
    }
  });

  return (
    <group ref={character} position={[0, 0, 0]} rotation={[0, -0.18, 0]}>
      {/* Booted Legs grounded firmly at y = 0 on the boat deck */}
      {[-0.125, 0.125].map((xPos, idx) => (
        <group key={`leg-${idx}`} position={[xPos, 0, 0]}>
          {/* Rubber Sole */}
          <mesh position={[0, 0.022, 0.038]} castShadow receiveShadow>
            <boxGeometry args={[0.165, 0.044, 0.27]} />
            <meshStandardMaterial color="#1f1814" roughness={0.92} />
          </mesh>
          {/* Boot Heel */}
          <mesh position={[0, 0.038, -0.055]} castShadow>
            <boxGeometry args={[0.15, 0.04, 0.08]} />
            <meshStandardMaterial color="#2a201b" roughness={0.88} />
          </mesh>
          {/* Sculpted Boot Upper + Toe Cap */}
          <mesh geometry={BOOT_UPPER_GEO} position={[0, 0.01, -0.01]} castShadow receiveShadow>
            <meshStandardMaterial color="#5c3a24" roughness={0.64} />
          </mesh>
          <mesh position={[0, 0.072, 0.095]} scale={[0.92, 0.66, 1.25]} castShadow>
            <sphereGeometry args={[0.08, 12, 10]} />
            <meshStandardMaterial color="#5c3a24" roughness={0.62} />
          </mesh>
          {/* Boot Cuff Rim */}
          <mesh position={[0, 0.245, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.082, 0.014, 8, 16]} />
            <meshStandardMaterial color="#432818" roughness={0.72} />
          </mesh>
          {/* Sculpted Tapered Trouser Leg */}
          <mesh geometry={TROUSER_LEG_GEO} position={[0, 0.23, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={pantsColor} roughness={0.84} />
          </mesh>
        </group>
      ))}

      {/* Hip & Spine Motion Group */}
      <group ref={hipGroup}>
        {/* Pelvis & Belt */}
        <mesh geometry={PELVIS_GEO} position={[0, 0.72, 0]} scale={[1.02, 1.0, 0.72]} castShadow>
          <meshStandardMaterial color={pantsColor} roughness={0.84} />
        </mesh>
        <mesh position={[0, 0.82, 0]} scale={[1.05, 1.0, 0.76]} castShadow>
          <cylinderGeometry args={[0.214, 0.222, 0.065, 20]} />
          <meshStandardMaterial color="#4f321f" roughness={0.72} />
        </mesh>
        {/* Metallic Belt Buckle */}
        <mesh position={[0, 0.82, 0.168]} castShadow>
          <boxGeometry args={[0.082, 0.068, 0.024]} />
          <meshStandardMaterial color="#d4a74b" metalness={0.72} roughness={0.32} />
        </mesh>

        {/* Upper Body Group (breathing, shoulders, arms, neck, head) */}
        <group ref={torsoGroup} position={[0, 0.82, 0]}>
          {/* Sculpted Human Torso */}
          <mesh geometry={TORSO_GEO} position={[0, 0, 0]} scale={[1.0, 1.0, 0.7]} castShadow receiveShadow>
            <meshStandardMaterial color={outfit.color} roughness={0.8} />
          </mesh>

        {/* Shirt Collar & Neckline Trim */}
        <mesh position={[0, 0.62, 0.01]} rotation={[0.16, 0, 0]} scale={[1.0, 1.0, 0.85]}>
          <torusGeometry args={[0.105, 0.024, 8, 18]} />
          <meshStandardMaterial color={shirtColor} roughness={0.78} />
        </mesh>

        {/* Tailored Outfit Details */}
        {outfit.id === 'outfit_overalls' && (
          <group>
            {/* Flannel chest V-insert */}
            <mesh position={[0, 0.49, 0.128]} rotation={[-0.12, 0, 0]}>
              <boxGeometry args={[0.28, 0.24, 0.06]} />
              <meshStandardMaterial color={shirtColor} roughness={0.82} />
            </mesh>
            {/* Denim Overall Straps over shoulders */}
            {[-0.12, 0.12].map((sx, i) => (
              <group key={`strap-${i}`}>
                <mesh position={[sx, 0.45, 0.15]} rotation={[-0.08, 0, 0]} castShadow>
                  <boxGeometry args={[0.055, 0.36, 0.032]} />
                  <meshStandardMaterial color={outfit.color} roughness={0.82} />
                </mesh>
                {/* Brass Buckle Button */}
                <mesh position={[sx, 0.32, 0.178]}>
                  <cylinderGeometry args={[0.018, 0.018, 0.015, 10]} />
                  <meshStandardMaterial color="#e0b252" metalness={0.75} roughness={0.28} />
                </mesh>
              </group>
            ))}
            {/* Chest Bib Pocket */}
            <mesh position={[0, 0.24, 0.174]} castShadow>
              <boxGeometry args={[0.18, 0.13, 0.025]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.82} />
            </mesh>
          </group>
        )}

        {outfit.id !== 'outfit_overalls' && (
          <group>
            {/* Jacket Center Placket & Buttons */}
            <mesh position={[0, 0.3, 0.172]} castShadow>
              <boxGeometry args={[0.05, 0.52, 0.024]} />
              <meshStandardMaterial color={outfit.accentColor || '#d4b06b'} roughness={0.68} />
            </mesh>
            {[0.14, 0.29, 0.44].map((by, i) => (
              <mesh key={`btn-${i}`} position={[0, by, 0.188]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.016, 0.016, 0.012, 10]} />
                <meshStandardMaterial color="#e2c27a" metalness={0.55} roughness={0.38} />
              </mesh>
            ))}
            {/* Side Vest/Coat Pocket */}
            <mesh position={[-0.12, 0.36, 0.168]} castShadow>
              <boxGeometry args={[0.1, 0.1, 0.022]} />
              <meshStandardMaterial color={outfit.accentColor || '#d4b06b'} roughness={0.75} />
            </mesh>
          </group>
        )}

        {outfit.id === 'outfit_skeleton' && (
          <group>
            {[0.24, 0.34, 0.44].map((ry, i) => (
              <mesh key={`rib-${i}`} position={[0, ry, 0.185]}>
                <boxGeometry args={[0.24 - i * 0.02, 0.026, 0.015]} />
                <meshStandardMaterial color="#86efac" emissive="#4ade80" emissiveIntensity={0.45} />
              </mesh>
            ))}
          </group>
        )}

        {outfit.id === 'outfit_vampire' && (
          <mesh geometry={CAPE_GEO} position={[0, 0.59, -0.14]} rotation={[0.12, 0, 0]} castShadow>
            <meshStandardMaterial color={outfit.accentColor || '#991b1b'} roughness={0.72} side={DoubleSide} />
          </mesh>
        )}

        {/* Left Arm (Shoulder -> Upper Arm -> Elbow -> Forearm -> Sculpted Hand) */}
        <group ref={leftArm} position={[-0.275, 0.56, 0.01]} rotation={[-0.14, 0, 0.12]}>
          {/* Shoulder Cap */}
          <mesh castShadow>
            <sphereGeometry args={[0.078, 12, 10]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.8} />
          </mesh>
          {/* Upper Arm */}
          <mesh geometry={UPPER_ARM_GEO} castShadow>
            <meshStandardMaterial color={sleeveColor} roughness={0.8} />
          </mesh>
          {/* Elbow Pivot */}
          <group ref={leftForearm} position={[0, -0.27, 0]} rotation={[-0.35, 0, -0.08]}>
            <mesh castShadow>
              <sphereGeometry args={[0.062, 10, 8]} />
              <meshStandardMaterial color={sleeveColor} roughness={0.8} />
            </mesh>
            {/* Forearm */}
            <mesh geometry={FOREARM_GEO} castShadow>
              <meshStandardMaterial color={sleeveColor} roughness={0.8} />
            </mesh>
            {/* Sleeve Cuff */}
            <mesh position={[0, -0.24, 0]}>
              <cylinderGeometry args={[0.058, 0.06, 0.04, 12]} />
              <meshStandardMaterial color={outfit.accentColor || '#d4b06b'} roughness={0.78} />
            </mesh>
            {/* Left Hand */}
            <group position={[0, -0.26, 0]}>
              <HandMesh skinColor={skin.color} />
            </group>
          </group>
        </group>

        {/* Right Arm + Hand Gripping Fishing Rod */}
        <group ref={rightArm} position={[0.275, 0.56, 0.01]} rotation={[-0.46, 0, -0.16]}>
          {/* Shoulder Cap */}
          <mesh castShadow>
            <sphereGeometry args={[0.078, 12, 10]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.8} />
          </mesh>
          {/* Upper Arm */}
          <mesh geometry={UPPER_ARM_GEO} castShadow>
            <meshStandardMaterial color={sleeveColor} roughness={0.8} />
          </mesh>
          {/* Elbow Pivot */}
          <group ref={rightForearm} position={[0, -0.27, 0]} rotation={[-0.78, 0.12, 0.1]}>
            <mesh castShadow>
              <sphereGeometry args={[0.062, 10, 8]} />
              <meshStandardMaterial color={sleeveColor} roughness={0.8} />
            </mesh>
            {/* Forearm */}
            <mesh geometry={FOREARM_GEO} castShadow>
              <meshStandardMaterial color={sleeveColor} roughness={0.8} />
            </mesh>
            {/* Sleeve Cuff */}
            <mesh position={[0, -0.24, 0]}>
              <cylinderGeometry args={[0.058, 0.06, 0.04, 12]} />
              <meshStandardMaterial color={outfit.accentColor || '#d4b06b'} roughness={0.78} />
            </mesh>

            {/* Right Hand & Held Fishing Rod with Wrist Pivot and Flexing Rod Tip */}
            <group ref={rightWrist} position={[0, -0.26, 0]}>
              <HandMesh skinColor={skin.color} gripClosed />

              {/* Fishing Rod held cleanly inside right hand */}
              <group ref={rodGroup} position={[0.01, -0.05, 0.025]} rotation={[0.12, 0.08, -0.34]}>
                {/* Cork Rod Grip */}
                <mesh position={[0, 0.04, 0]} castShadow>
                  <cylinderGeometry args={[0.024, 0.026, 0.34, 10]} />
                  <meshStandardMaterial color="#b98a56" roughness={0.86} />
                </mesh>
                {/* Brass Reel Seat & Spinning Reel */}
                <mesh position={[0, 0.16, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.028, 0.028, 0.04, 10]} />
                  <meshStandardMaterial color="#8b95a5" metalness={0.72} roughness={0.32} />
                </mesh>
                <mesh position={[0.045, 0.15, 0.055]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.042, 0.042, 0.055, 12]} />
                  <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.28} />
                </mesh>
                {/* Lower Rod Blank */}
                <mesh position={[0, 0.85, 0]} castShadow>
                  <cylinderGeometry args={[0.015, 0.021, 1.32, 10]} />
                  <meshStandardMaterial color="#6e4828" roughness={0.55} />
                </mesh>
                <mesh position={[0, 0.68, 0.016]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.018, 0.004, 6, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.22} />
                </mesh>
                <mesh position={[0, 1.25, 0.015]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.015, 0.004, 6, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.22} />
                </mesh>
                {/* Flexing Upper Rod Section */}
                <group ref={rodUpperRef} position={[0, 1.5, 0]}>
                  <mesh position={[0, 0.54, 0]} castShadow>
                    <cylinderGeometry args={[0.007, 0.015, 1.08, 10]} />
                    <meshStandardMaterial color="#6e4828" roughness={0.55} />
                  </mesh>
                  {[0.32, 0.78].map((gy, i) => (
                    <mesh key={`guide-up-${i}`} position={[0, gy, 0.013]} rotation={[0, Math.PI / 2, 0]}>
                      <torusGeometry args={[0.012 - i * 0.003, 0.0035, 6, 12]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.22} />
                    </mesh>
                  ))}
                  {/* Rod Tip Eyelet & World-Space Line Origin Marker */}
                  <group ref={rodTipRef} position={[0, 1.08, 0]}>
                    <mesh>
                      <sphereGeometry args={[0.02, 8, 8]} />
                      <meshStandardMaterial color="#f59e0b" metalness={0.65} roughness={0.32} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Neck (Connects Torso smoothly to Head) */}
        <mesh geometry={NECK_GEO} position={[0, 0.62, 0.005]} castShadow>
          <meshStandardMaterial color={skin.color} roughness={0.62} />
        </mesh>

        {/* Franken Neck Bolts if Franken hair selected */}
        {hair.id === 'hair_franken' &&
          [-0.088, 0.088].map((bx, i) => (
            <mesh key={`bolt-${i}`} position={[bx, 0.70, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, 0.06, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}

        {/* Head, Facial Features, Hair, Beard & Hat */}
        <group ref={headGroup} position={[0, 0.87, 0.015]}>
          {showSkin && (
            <>
              {/* Sculpted Cranium & Jawline */}
              <mesh geometry={HEAD_GEO} scale={[0.93, 1.0, 1.02]} castShadow receiveShadow>
                <meshStandardMaterial color={skin.color} roughness={0.64} />
              </mesh>

              {/* Left & Right Ears */}
              {[-0.174, 0.174].map((ex, i) => (
                <mesh
                  key={`ear-${i}`}
                  position={[ex, -0.01, -0.02]}
                  rotation={[0, i === 0 ? -0.25 : 0.25, i === 0 ? 0.15 : -0.15]}
                  scale={[0.45, 1.0, 0.72]}
                  castShadow
                >
                  <sphereGeometry args={[0.044, 10, 8]} />
                  <meshStandardMaterial color={skin.color} roughness={0.66} />
                </mesh>
              ))}

              {/* Sculpted Nose (Bridge + Tip) */}
              <mesh position={[0, -0.01, 0.188]} rotation={[-0.28, 0, 0]} castShadow>
                <capsuleGeometry args={[0.02, 0.038, 4, 8]} />
                <meshStandardMaterial color={skin.color} roughness={0.62} />
              </mesh>
              <mesh position={[0, -0.036, 0.204]} scale={[1.1, 0.85, 0.95]} castShadow>
                <sphereGeometry args={[0.024, 10, 8]} />
                <meshStandardMaterial color={skin.color} roughness={0.62} />
              </mesh>

              {/* Eyebrows & Expressive Eyes */}
              {[-0.068, 0.068].map((ex, i) => (
                <group key={`eye-${i}`}>
                  {/* Eyebrow */}
                  <mesh
                    position={[ex, 0.068, 0.178]}
                    rotation={[0.08, 0, i === 0 ? 0.12 : -0.12]}
                    scale={[1.5, 0.42, 0.55]}
                  >
                    <capsuleGeometry args={[0.012, 0.024, 4, 6]} />
                    <meshStandardMaterial
                      color={hair.id === 'hair_short' || hair.id === 'hair_messy' ? hair.color : '#3b281c'}
                      roughness={0.88}
                    />
                  </mesh>
                  {/* Sclera */}
                  <mesh position={[ex, 0.026, 0.172]} scale={[1.1, 0.82, 0.55]}>
                    <sphereGeometry args={[0.027, 12, 10]} />
                    <meshStandardMaterial color="#f8f6f2" roughness={0.35} />
                  </mesh>
                  {/* Iris */}
                  <mesh position={[ex, 0.026, 0.185]} scale={[1.0, 0.95, 0.45]}>
                    <sphereGeometry args={[0.016, 10, 8]} />
                    <meshStandardMaterial color="#3c5a47" roughness={0.25} />
                  </mesh>
                  {/* Pupil */}
                  <mesh position={[ex, 0.026, 0.191]} scale={[1.0, 1.0, 0.4]}>
                    <sphereGeometry args={[0.009, 8, 8]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.18} />
                  </mesh>
                  {/* Specular Catchlight */}
                  <mesh position={[ex + 0.005, 0.032, 0.194]}>
                    <sphereGeometry args={[0.0032, 6, 6]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              ))}

              {/* Mouth / Smile (subtle warm line beneath nose) */}
              {beard.id !== 'beard_full' && beard.id !== 'beard_witcher' && (
                <mesh position={[0, -0.095, 0.166]} rotation={[0.15, 0, Math.PI]}>
                  <torusGeometry args={[0.032, 0.0065, 6, 14, Math.PI * 0.72]} />
                  <meshStandardMaterial color="#8c4a42" roughness={0.75} />
                </mesh>
              )}

              {/* Sculpted Hair Hugging the Cranium (Zero Floating Spheres!) */}
              <group>
                {/* Fitted Crown & Back Hair Cap */}
                <mesh position={[0, 0.045, -0.022]} scale={[0.96, 0.98, 1.02]} castShadow>
                  <sphereGeometry args={[0.194, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                  <meshStandardMaterial color={hair.color} roughness={0.88} />
                </mesh>
                {/* Back Nape Hair */}
                <mesh position={[0, -0.015, -0.105]} scale={[1.02, 1.15, 0.65]} castShadow>
                  <sphereGeometry args={[0.155, 14, 12]} />
                  <meshStandardMaterial color={hair.color} roughness={0.88} />
                </mesh>
                {/* Left & Right Sideburns */}
                {[-0.164, 0.164].map((sx, i) => (
                  <mesh key={`sb-${i}`} position={[sx, 0.015, 0.025]} scale={[0.32, 0.95, 0.55]} castShadow>
                    <sphereGeometry args={[0.075, 10, 8]} />
                    <meshStandardMaterial color={hair.color} roughness={0.88} />
                  </mesh>
                ))}
                {/* Style-Specific Hair Accents */}
                {hair.id === 'hair_messy' && (
                  <>
                    <mesh position={[-0.08, 0.13, 0.12]} rotation={[0.4, 0, 0.3]}>
                      <coneGeometry args={[0.045, 0.11, 6]} />
                      <meshStandardMaterial color={hair.color} roughness={0.88} />
                    </mesh>
                    <mesh position={[0.06, 0.14, 0.11]} rotation={[0.35, 0, -0.25]}>
                      <coneGeometry args={[0.042, 0.1, 6]} />
                      <meshStandardMaterial color={hair.color} roughness={0.88} />
                    </mesh>
                  </>
                )}
                {hair.id === 'hair_ponytail' && (
                  <group position={[0, -0.02, -0.2]}>
                    <mesh rotation={[0.45, 0, 0]} castShadow>
                      <capsuleGeometry args={[0.042, 0.16, 4, 8]} />
                      <meshStandardMaterial color={hair.color} roughness={0.86} />
                    </mesh>
                    <mesh position={[0, 0.045, 0.01]} rotation={[0.45, 0, 0]}>
                      <torusGeometry args={[0.046, 0.01, 6, 12]} />
                      <meshStandardMaterial color="#b45309" roughness={0.6} />
                    </mesh>
                  </group>
                )}
                {hair.id === 'hair_franken' && (
                  <mesh position={[0, 0.165, 0]} castShadow>
                    <cylinderGeometry args={[0.175, 0.185, 0.11, 14]} />
                    <meshStandardMaterial color={hair.color} roughness={0.9} />
                  </mesh>
                )}
              </group>

              {/* Facial Hair */}
              {beard.id === 'beard_stubble' && (
                <mesh position={[0, -0.085, 0.038]} scale={[0.92, 0.85, 0.96]}>
                  <sphereGeometry args={[0.158, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
                  <meshStandardMaterial color={beard.color} roughness={0.94} transparent opacity={0.48} />
                </mesh>
              )}

              {(beard.id === 'beard_mustache' || beard.id === 'beard_full' || beard.id === 'beard_witcher' || beard.id === 'beard_glowing') && (
                <group position={[0, -0.062, 0.174]}>
                  <mesh position={[-0.042, 0, 0]} rotation={[0.1, 0.22, -0.22]} scale={[1.35, 0.65, 0.72]} castShadow>
                    <capsuleGeometry args={[0.02, 0.04, 4, 8]} />
                    <meshStandardMaterial
                      color={beard.color}
                      emissive={beard.id === 'beard_glowing' ? beard.color : '#000000'}
                      emissiveIntensity={beard.id === 'beard_glowing' ? 0.55 : 0}
                      roughness={0.86}
                    />
                  </mesh>
                  <mesh position={[0.042, 0, 0]} rotation={[0.1, -0.22, 0.22]} scale={[1.35, 0.65, 0.72]} castShadow>
                    <capsuleGeometry args={[0.02, 0.04, 4, 8]} />
                    <meshStandardMaterial
                      color={beard.color}
                      emissive={beard.id === 'beard_glowing' ? beard.color : '#000000'}
                      emissiveIntensity={beard.id === 'beard_glowing' ? 0.55 : 0}
                      roughness={0.86}
                    />
                  </mesh>
                </group>
              )}

              {(beard.id === 'beard_full' || beard.id === 'beard_witcher' || beard.id === 'beard_glowing') && (
                <mesh
                  geometry={FULL_BEARD_GEO}
                  position={[0, -0.075, 0.098]}
                  scale={[1, beard.id === 'beard_witcher' ? 1.35 : 1, 1]}
                  castShadow
                >
                  <meshStandardMaterial
                    color={beard.color}
                    emissive={beard.id === 'beard_glowing' ? beard.color : '#000000'}
                    emissiveIntensity={beard.id === 'beard_glowing' ? 0.55 : 0}
                    roughness={0.88}
                  />
                </mesh>
              )}

              {beard.id === 'beard_vampire' && (
                <mesh position={[0, -0.145, 0.145]} rotation={[Math.PI, 0, 0]} castShadow>
                  <coneGeometry args={[0.045, 0.12, 8]} />
                  <meshStandardMaterial color={beard.color} roughness={0.85} />
                </mesh>
              )}
            </>
          )}

          {/* Hats & Headgear */}
          {hat.id !== 'hat_none' && (
            <group position={[0, 0.115, -0.005]} rotation={[-0.06, 0, 0]}>
              {hat.id === 'hat_straw' && (
                <group>
                  <mesh geometry={STRAW_BRIM_GEO} castShadow receiveShadow>
                    <meshStandardMaterial color={hat.color} roughness={0.88} />
                  </mesh>
                  <mesh geometry={STRAW_CROWN_GEO} castShadow receiveShadow>
                    <meshStandardMaterial color={hat.color} roughness={0.88} />
                  </mesh>
                  {/* Woven Crimson/Mahogany Ribbon Band */}
                  <mesh position={[0, 0.032, 0]} castShadow>
                    <cylinderGeometry args={[0.191, 0.197, 0.044, 24]} />
                    <meshStandardMaterial color={hat.accentColor || '#8b261d'} roughness={0.72} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_bucket' && (
                <group>
                  <mesh position={[0, -0.01, 0]} castShadow>
                    <cylinderGeometry args={[0.195, 0.275, 0.07, 22]} />
                    <meshStandardMaterial color={hat.color} roughness={0.84} />
                  </mesh>
                  <mesh position={[0, 0.075, 0]} castShadow>
                    <cylinderGeometry args={[0.175, 0.195, 0.13, 22]} />
                    <meshStandardMaterial color={hat.color} roughness={0.84} />
                  </mesh>
                  <mesh position={[0, 0.025, 0]}>
                    <cylinderGeometry args={[0.197, 0.198, 0.028, 22]} />
                    <meshStandardMaterial color={hat.accentColor || '#fbbf24'} roughness={0.65} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_beanie' && (
                <group position={[0, -0.01, 0]}>
                  <mesh position={[0, 0.01, 0]} scale={[1.0, 0.9, 1.02]} castShadow>
                    <sphereGeometry args={[0.196, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
                    <meshStandardMaterial color={hat.color} roughness={0.92} />
                  </mesh>
                  <mesh position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <torusGeometry args={[0.188, 0.032, 8, 22]} />
                    <meshStandardMaterial color={hat.accentColor || '#c2410c'} roughness={0.94} />
                  </mesh>
                  <mesh position={[0, 0.195, -0.02]} castShadow>
                    <sphereGeometry args={[0.046, 10, 8]} />
                    <meshStandardMaterial color="#fed7aa" roughness={0.95} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_captain' && (
                <group>
                  <mesh position={[0, 0.02, 0]} castShadow>
                    <cylinderGeometry args={[0.205, 0.19, 0.08, 22]} />
                    <meshStandardMaterial color={hat.color} roughness={0.68} />
                  </mesh>
                  <mesh position={[0, 0.075, 0]} scale={[1.1, 0.45, 1.1]} castShadow>
                    <sphereGeometry args={[0.205, 20, 12]} />
                    <meshStandardMaterial color={hat.color} roughness={0.68} />
                  </mesh>
                  {/* Cap Visor Peak */}
                  <mesh position={[0, -0.01, 0.19]} rotation={[0.16, 0, 0]} scale={[1.1, 0.2, 0.9]} castShadow>
                    <cylinderGeometry args={[0.16, 0.16, 0.04, 16, 1, false, -Math.PI * 0.5, Math.PI]} />
                    <meshStandardMaterial color="#090d16" roughness={0.35} />
                  </mesh>
                  {/* Gold Emblem */}
                  <mesh position={[0, 0.055, 0.196]}>
                    <sphereGeometry args={[0.026, 8, 8]} />
                    <meshStandardMaterial color={hat.accentColor || '#fbbf24'} metalness={0.75} roughness={0.28} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_crown' && (
                <group position={[0, 0.03, 0]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.185, 0.18, 0.07, 18]} />
                    <meshStandardMaterial color={hat.color} metalness={0.82} roughness={0.24} />
                  </mesh>
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const ang = (i / 6) * Math.PI * 2;
                    return (
                      <mesh
                        key={`tine-${i}`}
                        position={[Math.sin(ang) * 0.175, 0.075, Math.cos(ang) * 0.175]}
                        castShadow
                      >
                        <coneGeometry args={[0.032, 0.095, 5]} />
                        <meshStandardMaterial color={hat.color} metalness={0.82} roughness={0.24} />
                      </mesh>
                    );
                  })}
                  <mesh position={[0, 0.035, 0.185]}>
                    <octahedronGeometry args={[0.026, 0]} />
                    <meshStandardMaterial color={hat.accentColor || '#ef4444'} roughness={0.18} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_diver' && (
                <group position={[0, -0.1, 0]}>
                  <mesh castShadow>
                    <sphereGeometry args={[0.23, 20, 16]} />
                    <meshStandardMaterial color={hat.color} metalness={0.72} roughness={0.34} />
                  </mesh>
                  <mesh position={[0, 0.01, 0.205]}>
                    <cylinderGeometry args={[0.095, 0.095, 0.05, 16]} />
                    <meshStandardMaterial color={hat.accentColor || '#38bdf8'} roughness={0.16} metalness={0.2} />
                  </mesh>
                  <mesh position={[0, 0.01, 0.195]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.098, 0.016, 8, 16]} />
                    <meshStandardMaterial color="#78350f" metalness={0.78} roughness={0.32} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_witch' && (
                <group>
                  <mesh position={[0, -0.01, 0]} castShadow>
                    <cylinderGeometry args={[0.36, 0.37, 0.024, 24]} />
                    <meshStandardMaterial color={hat.color} roughness={0.82} />
                  </mesh>
                  <mesh position={[0, 0.19, -0.02]} rotation={[-0.14, 0, 0]} castShadow>
                    <coneGeometry args={[0.19, 0.42, 16]} />
                    <meshStandardMaterial color={hat.color} roughness={0.82} />
                  </mesh>
                  <mesh position={[0, 0.022, 0]}>
                    <cylinderGeometry args={[0.185, 0.195, 0.04, 18]} />
                    <meshStandardMaterial color={hat.accentColor || '#a855f7'} roughness={0.55} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_pumpkin' && (
                <group position={[0, -0.11, 0.01]}>
                  <mesh scale={[1.08, 0.96, 1.04]} castShadow>
                    <sphereGeometry args={[0.235, 16, 12]} />
                    <meshStandardMaterial color={hat.color} roughness={0.75} />
                  </mesh>
                  <mesh position={[0, 0.24, 0]}>
                    <cylinderGeometry args={[0.025, 0.04, 0.09, 6]} />
                    <meshStandardMaterial color="#15803d" roughness={0.85} />
                  </mesh>
                  {[-0.075, 0.075].map((px, i) => (
                    <mesh key={`pe-${i}`} position={[px, 0.04, 0.215]}>
                      <coneGeometry args={[0.032, 0.05, 3]} />
                      <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.85} />
                    </mesh>
                  ))}
                  <mesh position={[0, -0.07, 0.215]}>
                    <boxGeometry args={[0.14, 0.036, 0.025]} />
                    <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.85} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_skeleton' && (
                <group position={[0, -0.11, 0.01]}>
                  <mesh scale={[0.96, 1.04, 1.02]} castShadow>
                    <sphereGeometry args={[0.215, 16, 14]} />
                    <meshStandardMaterial color={hat.color} roughness={0.55} />
                  </mesh>
                  {[-0.07, 0.07].map((sx, i) => (
                    <mesh key={`se-${i}`} position={[sx, 0.03, 0.195]}>
                      <sphereGeometry args={[0.036, 8, 8]} />
                      <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.75} />
                    </mesh>
                  ))}
                </group>
              )}

              {hat.id === 'hat_vampire' && (
                <group position={[0, 0.02, 0]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.185, 0.18, 0.06, 16]} />
                    <meshStandardMaterial color={hat.color} roughness={0.45} metalness={0.4} />
                  </mesh>
                  <mesh position={[0, 0.04, 0.185]}>
                    <octahedronGeometry args={[0.032, 0]} />
                    <meshStandardMaterial color={hat.accentColor || '#dc2626'} emissive="#991b1b" emissiveIntensity={0.45} />
                  </mesh>
                </group>
              )}

              {hat.id === 'hat_ghost' && (
                <group position={[0, -0.11, 0]}>
                  <mesh scale={[1.05, 1.15, 1.05]} castShadow>
                    <capsuleGeometry args={[0.21, 0.16, 6, 14]} />
                    <meshStandardMaterial color={hat.color} roughness={0.88} />
                  </mesh>
                  {[-0.07, 0.07].map((gx, i) => (
                    <mesh key={`ge-${i}`} position={[gx, 0.03, 0.21]}>
                      <sphereGeometry args={[0.034, 8, 8]} />
                      <meshStandardMaterial color="#09090b" />
                    </mesh>
                  ))}
                </group>
              )}
            </group>
          )}
        </group>
      </group>
      </group>
    </group>
  );
}
