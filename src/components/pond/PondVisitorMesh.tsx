import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CatmullRomCurve3,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { ActiveVisitorScene } from '../../types/game';
import { clampInsideLakeXZ, getLakeShorePoint } from './lakeGeometry';

const NO_RAYCAST = () => null;

// Pre-allocated scratch vectors for zero-GC animation updates
const _targetPos = new Vector3();
const _currPos = new Vector3();

// Lily pad landing spots matching LilyPads in PondCanvas3D (West cove cluster)
const FROG_PADS: Array<[number, number]> = [
  [-5.1, -0.7],
  [-5.6, -2.0],
  [-6.35, -0.95],
];

// --- SHARED SCULPTED PROCEDURAL GEOMETRIES (built once at module scope) ---

// 1. DUCK (Emerald Mallard)
function createDuckBodyGeo(): LatheGeometry {
  // Tail (-X) to breast (+X)
  const pts = [
    new Vector2(0.0, -0.34),
    new Vector2(0.045, -0.30),
    new Vector2(0.115, -0.20),
    new Vector2(0.175, -0.06),
    new Vector2(0.195, 0.08),
    new Vector2(0.172, 0.21),
    new Vector2(0.105, 0.30),
    new Vector2(0.042, 0.34),
    new Vector2(0.0, 0.35),
  ];
  const geo = new LatheGeometry(pts, 20);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.0, 0.82, 0.88);
  geo.computeVertexNormals();
  return geo;
}

function createDuckNeckGeo(): TubeGeometry {
  const curve = new CatmullRomCurve3([
    new Vector3(0.19, 0.06, 0),
    new Vector3(0.24, 0.16, 0),
    new Vector3(0.23, 0.27, 0),
    new Vector3(0.25, 0.35, 0),
  ]);
  const geo = new TubeGeometry(curve, 14, 0.062, 12, false);
  geo.computeVertexNormals();
  return geo;
}

function createDuckHeadGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.105),
    new Vector2(0.068, -0.092),
    new Vector2(0.092, -0.03),
    new Vector2(0.095, 0.035),
    new Vector2(0.075, 0.092),
    new Vector2(0.038, 0.12),
    new Vector2(0.0, 0.125),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.08, 0.92, 0.88);
  geo.computeVertexNormals();
  return geo;
}

function createDuckBillGeo(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, 0.028);
  s.quadraticCurveTo(0.09, 0.025, 0.155, 0.012);
  s.quadraticCurveTo(0.175, 0.0, 0.155, -0.014);
  s.quadraticCurveTo(0.08, -0.02, 0, -0.024);
  s.closePath();
  const geo = new ExtrudeGeometry(s, {
    depth: 0.068,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.034);
  geo.computeVertexNormals();
  return geo;
}

function createDuckWingGeo(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(-0.22, 0.01);
  s.quadraticCurveTo(-0.08, 0.085, 0.12, 0.062);
  s.quadraticCurveTo(0.18, 0.03, 0.15, -0.035);
  s.quadraticCurveTo(-0.02, -0.068, -0.22, 0.01);
  const geo = new ExtrudeGeometry(s, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.018);
  geo.computeVertexNormals();
  return geo;
}

function createDuckTailGeo(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, 0.025);
  s.lineTo(-0.16, 0.065);
  s.quadraticCurveTo(-0.13, 0.0, -0.15, -0.035);
  s.lineTo(0, -0.022);
  s.closePath();
  const geo = new ExtrudeGeometry(s, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.035);
  geo.computeVertexNormals();
  return geo;
}

function createWebbedFootGeo(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(0.095, -0.048);
  s.quadraticCurveTo(0.11, 0, 0.095, 0.048);
  s.closePath();
  const geo = new ExtrudeGeometry(s, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// 2. OTTER (Sleek River Otter)
function createOtterBodyGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.34),
    new Vector2(0.088, -0.30),
    new Vector2(0.132, -0.18),
    new Vector2(0.145, -0.02),
    new Vector2(0.142, 0.14),
    new Vector2(0.125, 0.27),
    new Vector2(0.095, 0.35),
    new Vector2(0.0, 0.37),
  ];
  const geo = new LatheGeometry(pts, 20);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.0, 0.84, 0.92);
  geo.computeVertexNormals();
  return geo;
}

function createOtterHeadGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.11),
    new Vector2(0.088, -0.095),
    new Vector2(0.105, -0.02),
    new Vector2(0.098, 0.055),
    new Vector2(0.075, 0.115),
    new Vector2(0.038, 0.145),
    new Vector2(0.0, 0.152),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.06, 0.78, 0.94);
  geo.computeVertexNormals();
  return geo;
}

function createOtterTailGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.38),
    new Vector2(0.018, -0.35),
    new Vector2(0.036, -0.24),
    new Vector2(0.058, -0.12),
    new Vector2(0.082, 0.0),
    new Vector2(0.092, 0.06),
    new Vector2(0.0, 0.07),
  ];
  const geo = new LatheGeometry(pts, 14);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.0, 0.72, 0.88);
  geo.computeVertexNormals();
  return geo;
}

// 3. FROG (Pond Bullfrog)
function createFrogTorsoGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.19),
    new Vector2(0.095, -0.175),
    new Vector2(0.148, -0.09),
    new Vector2(0.165, 0.01),
    new Vector2(0.145, 0.11),
    new Vector2(0.102, 0.18),
    new Vector2(0.0, 0.195),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.05, 0.74, 0.96);
  geo.computeVertexNormals();
  return geo;
}

function createFrogHeadGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.10),
    new Vector2(0.105, -0.085),
    new Vector2(0.122, -0.01),
    new Vector2(0.112, 0.065),
    new Vector2(0.072, 0.125),
    new Vector2(0.0, 0.14),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.08, 0.65, 1.06);
  geo.computeVertexNormals();
  return geo;
}

function createFrogThighGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.11),
    new Vector2(0.048, -0.095),
    new Vector2(0.065, -0.01),
    new Vector2(0.056, 0.08),
    new Vector2(0.032, 0.115),
    new Vector2(0.0, 0.12),
  ];
  const geo = new LatheGeometry(pts, 14);
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// 4. TURTLE (Sunbathing Terrapin)
function createTurtleShellGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, 0.0),
    new Vector2(0.24, 0.01),
    new Vector2(0.255, 0.04),
    new Vector2(0.235, 0.095),
    new Vector2(0.185, 0.15),
    new Vector2(0.11, 0.185),
    new Vector2(0.0, 0.196),
  ];
  const geo = new LatheGeometry(pts, 20);
  geo.scale(1.18, 1.0, 0.94);
  geo.computeVertexNormals();
  return geo;
}

function createTurtlePlastronGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.045),
    new Vector2(0.16, -0.04),
    new Vector2(0.22, -0.015),
    new Vector2(0.23, 0.015),
    new Vector2(0.0, 0.02),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.scale(1.14, 1.0, 0.88);
  geo.computeVertexNormals();
  return geo;
}

function createTurtleFlipperGeo(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, 0.025);
  s.quadraticCurveTo(0.08, 0.048, 0.175, 0.015);
  s.quadraticCurveTo(0.20, -0.01, 0.15, -0.038);
  s.quadraticCurveTo(0.06, -0.045, 0, -0.02);
  s.closePath();
  const geo = new ExtrudeGeometry(s, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.011, 0);
  geo.computeVertexNormals();
  return geo;
}

// 5. CRAB (Tidepool Shore Crab)
function createCrabCarapaceGeo(): ExtrudeGeometry {
  const s = new Shape();
  // Hexagonal/rounded crab carapace outline (X = front/back, Y -> Z width)
  s.moveTo(-0.145, -0.105);
  s.quadraticCurveTo(0.0, -0.185, 0.115, -0.145);
  s.quadraticCurveTo(0.175, -0.07, 0.16, 0.0);
  s.quadraticCurveTo(0.175, 0.07, 0.115, 0.145);
  s.quadraticCurveTo(0.0, 0.185, -0.145, 0.105);
  s.quadraticCurveTo(-0.175, 0.0, -0.145, -0.105);
  const geo = new ExtrudeGeometry(s, {
    depth: 0.078,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.026,
    bevelSegments: 3,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createCrabClawGeo(): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, -0.026);
  s.quadraticCurveTo(0.06, -0.052, 0.125, -0.02);
  s.quadraticCurveTo(0.155, 0.008, 0.11, 0.032);
  s.quadraticCurveTo(0.055, 0.048, 0, 0.026);
  s.closePath();
  const geo = new ExtrudeGeometry(s, {
    depth: 0.044,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.022);
  geo.computeVertexNormals();
  return geo;
}

// 6. RACCOON (Bandit)
function createRaccoonBodyGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.26),
    new Vector2(0.105, -0.23),
    new Vector2(0.165, -0.12),
    new Vector2(0.172, 0.02),
    new Vector2(0.148, 0.15),
    new Vector2(0.112, 0.24),
    new Vector2(0.0, 0.26),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.0, 0.92, 0.88);
  geo.computeVertexNormals();
  return geo;
}

function createRaccoonHeadGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.11),
    new Vector2(0.105, -0.088),
    new Vector2(0.128, -0.015),
    new Vector2(0.115, 0.045),
    new Vector2(0.076, 0.105),
    new Vector2(0.042, 0.148),
    new Vector2(0.0, 0.156),
  ];
  const geo = new LatheGeometry(pts, 18);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1.04, 0.84, 0.96);
  geo.computeVertexNormals();
  return geo;
}

function createRaccoonTailGeo(): LatheGeometry {
  const pts = [
    new Vector2(0.0, -0.36),
    new Vector2(0.032, -0.33),
    new Vector2(0.068, -0.22),
    new Vector2(0.078, -0.10),
    new Vector2(0.072, 0.02),
    new Vector2(0.048, 0.08),
    new Vector2(0.0, 0.095),
  ];
  const geo = new LatheGeometry(pts, 16);
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

const GEOS = {
  duckBody: createDuckBodyGeo(),
  duckNeck: createDuckNeckGeo(),
  duckHead: createDuckHeadGeo(),
  duckBill: createDuckBillGeo(),
  duckWing: createDuckWingGeo(),
  duckTail: createDuckTailGeo(),
  webbedFoot: createWebbedFootGeo(),
  otterBody: createOtterBodyGeo(),
  otterHead: createOtterHeadGeo(),
  otterTail: createOtterTailGeo(),
  frogTorso: createFrogTorsoGeo(),
  frogHead: createFrogHeadGeo(),
  frogThigh: createFrogThighGeo(),
  turtleShell: createTurtleShellGeo(),
  turtlePlastron: createTurtlePlastronGeo(),
  turtleFlipper: createTurtleFlipperGeo(),
  crabCarapace: createCrabCarapaceGeo(),
  crabClaw: createCrabClawGeo(),
  raccoonBody: createRaccoonBodyGeo(),
  raccoonHead: createRaccoonHeadGeo(),
  raccoonTail: createRaccoonTailGeo(),
};

function NaturalEye({
  position,
  radius = 0.024,
  irisColor = '#2a1d14',
}: {
  position: [number, number, number];
  radius?: number;
  irisColor?: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 12, 10]} />
        <meshStandardMaterial color={irisColor} roughness={0.14} metalness={0.05} />
      </mesh>
      <mesh position={[radius * 0.42, radius * 0.28, radius * 0.62]}>
        <sphereGeometry args={[radius * 0.26, 8, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export function PondVisitor({
  visitor,
  name,
  locationId,
  onClick,
}: {
  visitor: ActiveVisitorScene;
  name?: string;
  locationId?: string;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const rootRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const leftWingOrArmRef = useRef<Group>(null);
  const rightWingOrArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const extraLegLeftRef = useRef<Group>(null);
  const extraLegRightRef = useRef<Group>(null);
  const vocalSacRef = useRef<Mesh>(null);
  const pebbleRef = useRef<Mesh>(null);
  const pincerLeftRef = useRef<Mesh>(null);
  const pincerRightRef = useRef<Mesh>(null);
  const rippleRef = useRef<Mesh>(null);
  const indicatorRef = useRef<Group>(null);

  const [hovered, setHovered] = useState(false);
  const excitedUntilRef = useRef(0);
  const exciteTriggerRef = useRef(false);

  // Deterministic patrol/habitat seed per visitor arrival
  const seed = useMemo(() => {
    const h = visitor.x * 6.28 + visitor.y * 3.14;
    return h;
  }, [visitor.x, visitor.y]);

  // Shoreline anchor for Crab and Raccoon along the camera-facing bank
  const shoreAnchorAngle = useMemo(() => {
    return MathUtils.clamp(visitor.x * Math.PI * 2, 0.22 * Math.PI, 0.78 * Math.PI);
  }, [visitor.x]);

  // Initial world position
  const initialPos = useMemo<[number, number, number]>(() => {
    if (visitor.type === 'frog') {
      const [fx, fz] = FROG_PADS[0];
      return [fx, 0.365, fz];
    }
    if (visitor.type === 'crab') {
      const [cx, cz] = getLakeShorePoint(shoreAnchorAngle, 1.0, 0.34, 0.25);
      return [cx, 0.22, cz];
    }
    if (visitor.type === 'raccoon') {
      const [rx, rz] = getLakeShorePoint(shoreAnchorAngle, 1.0, 0.92, 0.68);
      return [rx, 0.168, rz];
    }
    if (visitor.type === 'turtle') {
      const [tx, tz] = clampInsideLakeXZ(2.5, -1.8, 0.74);
      return [tx, 0.35, tz];
    }
    const [wx, wz] = clampInsideLakeXZ((visitor.x - 0.5) * 9.0 + 1.8, (visitor.y - 0.5) * 6.0, 0.72);
    return [wx, 0.35, wz];
  }, [visitor.type, visitor.x, visitor.y, shoreAnchorAngle]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'auto';
      }
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const dt = Math.min(delta, 0.08);
    const t = clock.getElapsedTime();
    if (exciteTriggerRef.current) {
      excitedUntilRef.current = t + 1.5;
      exciteTriggerRef.current = false;
    }
    const isExcited = t < excitedUntilRef.current;
    const excitedBoost = isExcited ? Math.abs(Math.sin(t * 14)) : 0;

    // 1. DUCK: Cruises gracefully in figure-8 lake patrol, dips head to dabble, flaps wings when excited
    if (visitor.type === 'duck') {
      const routeT = t * 0.24 + seed;
      const rawX = 1.6 + Math.sin(routeT) * 3.1;
      const rawZ = -0.5 + Math.sin(routeT * 2.0) * 1.9;
      const [tx, tz] = clampInsideLakeXZ(rawX, rawZ, 0.72);

      // Gentle avoidance of player's boat around (-2.35, 1.38)
      const dxBoat = tx + 2.35;
      const dzBoat = tz - 1.38;
      const distBoat = Math.hypot(dxBoat, dzBoat);
      const safeX = distBoat < 2.6 ? tx + (dxBoat / Math.max(0.1, distBoat)) * (2.6 - distBoat) : tx;
      const safeZ = distBoat < 2.6 ? tz + (dzBoat / Math.max(0.1, distBoat)) * (2.6 - distBoat) : tz;

      _currPos.copy(root.position);
      _targetPos.set(safeX, 0.352 + Math.sin(t * 2.4) * 0.015, safeZ);
      root.position.lerp(_targetPos, 1 - Math.exp(-3.2 * dt));

      const vx = root.position.x - _currPos.x;
      const vz = root.position.z - _currPos.z;
      if (vx * vx + vz * vz > 1e-6) {
        const targetYaw = Math.atan2(-vz, vx);
        let diff = targetYaw - root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        root.rotation.y += diff * (1 - Math.exp(-5.0 * dt));
      }

      // Dabble cycle every ~8 seconds
      const dabbleCycle = (t + 2.5) % 8.2;
      const dabbleDip = dabbleCycle < 1.35 ? Math.sin((dabbleCycle / 1.35) * Math.PI) : 0;
      if (bodyRef.current) {
        bodyRef.current.rotation.z = -dabbleDip * 0.72 + Math.sin(t * 2.8) * 0.03;
        bodyRef.current.position.y = -dabbleDip * 0.075 + excitedBoost * 0.05;
        bodyRef.current.rotation.x = Math.sin(t * 2.1) * 0.04;
      }
      if (headRef.current) {
        // Curious head look-around & post-dabble head shake
        const shake = dabbleCycle >= 1.35 && dabbleCycle < 1.95 ? Math.sin(t * 32) * 0.25 : 0;
        headRef.current.rotation.y = Math.sin(t * 1.4) * 0.24 + shake;
        headRef.current.rotation.z = Math.sin(t * 0.9) * 0.08 - dabbleDip * 0.18;
      }
      if (tailRef.current) {
        // Happy tail feather wag
        tailRef.current.rotation.y = Math.sin(t * 6.5) * 0.16;
        tailRef.current.rotation.z = dabbleDip * 0.25 + Math.sin(t * 3.5) * 0.08;
      }
      if (leftWingOrArmRef.current && rightWingOrArmRef.current) {
        const wingLift = isExcited || hovered ? 0.28 + Math.abs(Math.sin(t * 16)) * 0.45 : Math.sin(t * 2.4) * 0.03;
        leftWingOrArmRef.current.rotation.x = -wingLift;
        rightWingOrArmRef.current.rotation.x = wingLift;
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.z = Math.sin(t * 6.2) * 0.45;
        rightLegRef.current.rotation.z = -Math.sin(t * 6.2) * 0.45;
      }
    }

    // 2. OTTER: Cruises in playful arc, alternating swimming with cozy back-float pebble juggling!
    else if (visitor.type === 'otter') {
      const cycle = t % 12.0;
      const isBackFloat = cycle >= 6.5;
      const rollBlend = isBackFloat
        ? MathUtils.clamp((cycle - 6.5) / 0.9, 0, 1) - MathUtils.clamp((cycle - 11.1) / 0.9, 0, 1)
        : 0;

      const swimPhase = t * 0.34 + seed;
      const rawX = 1.4 + Math.cos(swimPhase) * 2.9;
      const rawZ = -0.3 + Math.sin(swimPhase * 1.5) * 2.0;
      const [tx, tz] = clampInsideLakeXZ(rawX, rawZ, 0.72);
      const floatSpeed = isBackFloat ? 0.9 : 3.2;

      _currPos.copy(root.position);
      _targetPos.set(
        tx,
        0.34 + Math.sin(t * 2.6) * 0.018 + (isBackFloat ? 0.025 : 0),
        tz
      );
      root.position.lerp(_targetPos, 1 - Math.exp(-floatSpeed * dt));

      const vx = root.position.x - _currPos.x;
      const vz = root.position.z - _currPos.z;
      if (!isBackFloat && vx * vx + vz * vz > 1e-6) {
        const targetYaw = Math.atan2(-vz, vx);
        let diff = targetYaw - root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        root.rotation.y += diff * (1 - Math.exp(-4.5 * dt));
      }

      if (bodyRef.current) {
        // Smooth barrel roll onto back for pebble play!
        bodyRef.current.rotation.x = MathUtils.lerp(bodyRef.current.rotation.x, rollBlend * Math.PI, 1 - Math.exp(-6.0 * dt));
        bodyRef.current.rotation.z = Math.sin(t * 4.2) * 0.05 * (1 - rollBlend) + excitedBoost * 0.12;
        bodyRef.current.position.y = excitedBoost * 0.07;
      }
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * 1.9) * 0.25;
        headRef.current.rotation.z = rollBlend * 0.28 + Math.sin(t * 2.5) * 0.07;
      }
      if (tailRef.current) {
        tailRef.current.rotation.y = Math.sin(t * 5.2) * 0.28;
        tailRef.current.rotation.z = Math.cos(t * 4.2) * 0.14;
      }
      if (leftWingOrArmRef.current && rightWingOrArmRef.current) {
        // Front paws hold pebble or clap playfully on belly when rolling onto back
        const clap = rollBlend * Math.sin(t * 7.5) * 0.14;
        leftWingOrArmRef.current.rotation.x = -0.3 * rollBlend + clap;
        rightWingOrArmRef.current.rotation.x = 0.3 * rollBlend - clap;
      }
      if (pebbleRef.current) {
        pebbleRef.current.visible = rollBlend > 0.25;
        pebbleRef.current.position.y = -0.13 - Math.abs(Math.sin(t * 3.8)) * 0.055 * rollBlend;
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.z = Math.sin(t * 7.2) * 0.35;
        rightLegRef.current.rotation.z = -Math.sin(t * 7.2) * 0.35;
      }
    }

    // 3. FROG (Barnaby): Perches on real lily pads, puffs vocal sac & croaks, hops pad-to-pad!
    else if (visitor.type === 'frog') {
      const hopCycle = t % 6.0;
      const seg = Math.floor((t / 6.0)) % FROG_PADS.length;
      const nextSeg = (seg + 1) % FROG_PADS.length;
      const [sx, sz] = FROG_PADS[seg];
      const [nx, nz] = FROG_PADS[nextSeg];

      const isCrouch = hopCycle >= 4.4 && hopCycle < 4.75;
      const isHop = hopCycle >= 4.75 && hopCycle < 5.55;
      const hopU = isHop ? (hopCycle - 4.75) / 0.8 : hopCycle >= 5.55 ? 1 : 0;

      const px = MathUtils.lerp(sx, nx, hopU);
      const pz = MathUtils.lerp(sz, nz, hopU);
      const basePadY = 0.365 + Math.sin(t * 1.15 + seg * 0.85) * 0.015;
      const arcY = isHop ? Math.sin(Math.PI * hopU) * 0.68 : 0;
      const crouchDip = isCrouch ? -0.035 : 0;

      root.position.set(px, basePadY + arcY + crouchDip + excitedBoost * 0.16, pz);

      const targetYaw = Math.atan2(-(nz - sz), nx - sx);
      let diff = targetYaw - root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      root.rotation.y += diff * (1 - Math.exp(-8.0 * dt));

      if (bodyRef.current) {
        bodyRef.current.rotation.z = isCrouch ? -0.18 : isHop ? Math.cos(Math.PI * hopU) * 0.42 : 0.12;
      }
      if (headRef.current) {
        // Watch dragonflies between croaks
        headRef.current.rotation.y = Math.sin(t * 1.3) * 0.22;
      }
      if (vocalSacRef.current) {
        // Rhythmic croaking throat sac inflation
        const croak = !isHop && hopCycle < 3.6 ? Math.pow(Math.max(0, Math.sin(t * 3.4)), 4) : 0;
        const sacScale = 1 + croak * 0.85 + (isExcited ? 0.5 : 0);
        vocalSacRef.current.scale.set(sacScale, sacScale * 0.92, sacScale);
      }
      if (leftLegRef.current && rightLegRef.current) {
        // Extend hind legs straight back in mid-leap!
        const legExt = isHop ? Math.sin(Math.PI * hopU) * 1.15 : 0;
        leftLegRef.current.rotation.z = -legExt;
        rightLegRef.current.rotation.z = -legExt;
      }
    }

    // 4. TURTLE (Shelby): Swims leisurely in sunlit shallow arc, stretches neck high & paddles flippers
    else if (visitor.type === 'turtle') {
      const routeT = t * 0.14 + seed;
      const rawX = 2.6 + Math.cos(routeT) * 2.2;
      const rawZ = -1.1 + Math.sin(routeT) * 1.4;
      const [tx, tz] = clampInsideLakeXZ(rawX, rawZ, 0.72);

      // Pause briefly every 9s to stretch neck and sunbathe
      const sunPhase = t % 9.5;
      const basking = sunPhase > 5.5;
      const moveAlpha = basking ? 0.4 * dt : 2.2 * dt;

      _currPos.copy(root.position);
      _targetPos.set(tx, 0.345 + Math.sin(t * 1.6) * 0.012, tz);
      root.position.lerp(_targetPos, 1 - Math.exp(-moveAlpha));

      const vx = root.position.x - _currPos.x;
      const vz = root.position.z - _currPos.z;
      if (!basking && vx * vx + vz * vz > 1e-7) {
        const targetYaw = Math.atan2(-vz, vx);
        let diff = targetYaw - root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        root.rotation.y += diff * (1 - Math.exp(-3.5 * dt));
      }

      if (headRef.current) {
        // Stretch neck gracefully when basking, tuck slightly if hovered/startled
        const stretch = hovered ? -0.05 : basking ? 0.07 : 0.025;
        headRef.current.position.x = MathUtils.lerp(headRef.current.position.x, 0.25 + stretch, 1 - Math.exp(-4.0 * dt));
        headRef.current.rotation.y = Math.sin(t * 0.9) * 0.24;
        headRef.current.rotation.z = basking ? 0.18 : 0.04;
      }
      if (leftWingOrArmRef.current && rightWingOrArmRef.current) {
        const stroke = basking ? 0.08 : 1.0;
        leftWingOrArmRef.current.rotation.y = Math.sin(t * 2.8) * 0.45 * stroke;
        rightWingOrArmRef.current.rotation.y = -Math.sin(t * 2.8 + 0.4) * 0.45 * stroke;
      }
      if (leftLegRef.current && rightLegRef.current) {
        const stroke = basking ? 0.05 : 1.0;
        leftLegRef.current.rotation.y = -Math.sin(t * 2.8) * 0.28 * stroke;
        rightLegRef.current.rotation.y = Math.sin(t * 2.8) * 0.28 * stroke;
      }
    }

    // 5. CRAB (Pinchy): Scuttles sideways along sandy shore rim, stops to raise & clack both claws!
    else if (visitor.type === 'crab') {
      const patrolCycle = t % 7.5;
      const isPatrol = patrolCycle < 4.5;
      const sideOffset = isPatrol ? Math.sin((patrolCycle / 4.5) * Math.PI * 2) * 0.22 : 0;
      const angle = shoreAnchorAngle + sideOffset;
      const [cx, cz] = getLakeShorePoint(angle, 1.0, 0.34, 0.25);

      root.position.set(cx, 0.22 + excitedBoost * 0.06, cz);
      // Face inward toward the lake (+X points toward lake center)
      root.rotation.y = Math.atan2(cz, -cx);

      if (bodyRef.current) {
        bodyRef.current.rotation.x = isPatrol ? Math.sin(t * 14) * 0.05 : 0;
      }
      if (leftWingOrArmRef.current && rightWingOrArmRef.current) {
        // Raise claws defiantly during pause or excitement!
        const raise = !isPatrol || isExcited || hovered ? 0.55 : 0.12;
        leftWingOrArmRef.current.rotation.z = MathUtils.lerp(leftWingOrArmRef.current.rotation.z, raise, 1 - Math.exp(-8 * dt));
        rightWingOrArmRef.current.rotation.z = MathUtils.lerp(rightWingOrArmRef.current.rotation.z, raise, 1 - Math.exp(-8 * dt));
      }
      if (pincerLeftRef.current && pincerRightRef.current) {
        const snap = !isPatrol || isExcited || hovered ? Math.abs(Math.sin(t * 11)) * 0.45 : 0.06;
        pincerLeftRef.current.rotation.z = snap;
        pincerRightRef.current.rotation.z = snap;
      }
      const legWave = isPatrol ? Math.sin(t * 18) * 0.24 : Math.sin(t * 3) * 0.04;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = legWave;
        rightLegRef.current.rotation.x = -legWave;
      }
      if (extraLegLeftRef.current && extraLegRightRef.current) {
        extraLegLeftRef.current.rotation.x = -legWave;
        extraLegRightRef.current.rotation.x = legWave;
      }
    }

    // 6. RACCOON (Bandit): Prowls shoreline bank, sits up to wash/inspect paws, darts masked head & swishes ringed tail!
    else if (visitor.type === 'raccoon') {
      const cycle = t % 9.0;
      const isProzl = cycle < 3.6;
      const offsetAngle = shoreAnchorAngle + (isProzl ? Math.sin((cycle / 3.6) * Math.PI) * 0.12 : 0.04);
      const [rx, rz] = getLakeShorePoint(offsetAngle, 1.0, 0.92, 0.68);

      root.position.set(rx, 0.17 + (isProzl ? Math.abs(Math.sin(t * 10)) * 0.025 : 0) + excitedBoost * 0.06, rz);
      // Face toward the lake and fisherman's boat
      root.rotation.y = Math.atan2(rz, -rx) + Math.sin(t * 0.5) * 0.15;

      const sitUp = !isProzl ? Math.sin(((cycle - 3.6) / 5.4) * Math.PI) : 0;
      if (bodyRef.current) {
        bodyRef.current.rotation.z = sitUp * 0.26;
      }
      if (headRef.current) {
        // Suspicious darting look left/right
        headRef.current.rotation.y = Math.sin(t * 2.3) * 0.34;
        headRef.current.rotation.x = Math.sin(t * 1.4) * 0.1;
      }
      if (tailRef.current) {
        tailRef.current.rotation.y = Math.sin(t * 3.1) * 0.35;
        tailRef.current.rotation.z = 0.22 + Math.cos(t * 2.2) * 0.12;
      }
      if (leftWingOrArmRef.current && rightWingOrArmRef.current) {
        // Classic raccoon paw-washing / rubbing motion when sitting up!
        const wash = sitUp * Math.sin(t * 9.5) * 0.28;
        leftWingOrArmRef.current.rotation.z = sitUp * 0.45 + wash;
        rightWingOrArmRef.current.rotation.z = sitUp * 0.45 - wash;
      }
    }

    // Subtle expanding water ripple for swimming animals
    if (rippleRef.current) {
      const phase = (t * 0.72) % 1;
      rippleRef.current.scale.setScalar(0.65 + phase * 1.35);
      const mat = rippleRef.current.material as MeshBasicMaterial;
      mat.opacity = (1 - phase) * 0.24;
    }

    // Subtle floating interaction sparkle above friend
    if (indicatorRef.current) {
      indicatorRef.current.position.y = (visitor.type === 'frog' ? 0.58 : 0.78) + Math.sin(t * 2.4) * 0.04;
      indicatorRef.current.rotation.y = t * 1.4;
    }
  });

  const isSwimmer = visitor.type === 'duck' || visitor.type === 'otter' || visitor.type === 'turtle';

  return (
    <group
      ref={rootRef}
      position={initialPos}
      onClick={(event) => {
        event.stopPropagation();
        exciteTriggerRef.current = true;
        onClick(event);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        exciteTriggerRef.current = true;
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
      }}
    >
      {/* Fallback personal mossy pad for frog when in Midnight Deep (no lake lily pads) */}
      {visitor.type === 'frog' && locationId === 'midnight_deep' && (
        <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.42, 20]} />
          <meshStandardMaterial color="#3c6244" roughness={0.75} side={DoubleSide} />
        </mesh>
      )}

      {/* Expanding waterline wake ring for aquatic swimmers */}
      {isSwimmer && (
        <mesh ref={rippleRef} raycast={NO_RAYCAST} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.30, 28]} />
          <meshBasicMaterial color="#e0f7fa" transparent opacity={0.22} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}

      {/* --- 1. DUCK (Emerald Mallard) --- */}
      {visitor.type === 'duck' && (
        <group ref={bodyRef} position={[0, 0.06, 0]}>
          {/* Main waterfowl fuselage */}
          <mesh geometry={GEOS.duckBody} castShadow receiveShadow>
            <meshStandardMaterial color="#7d6e5e" roughness={0.78} />
          </mesh>
          {/* Warm chestnut mallard breast */}
          <mesh position={[0.16, -0.01, 0]} scale={[0.62, 0.72, 0.82]} castShadow>
            <sphereGeometry args={[0.145, 16, 12]} />
            <meshStandardMaterial color="#874832" roughness={0.76} />
          </mesh>
          {/* White collar ring */}
          <mesh position={[0.21, 0.115, 0]} rotation={[0, 0, 0.35]}>
            <torusGeometry args={[0.064, 0.014, 8, 16]} />
            <meshStandardMaterial color="#f5f3ed" roughness={0.7} />
          </mesh>
          {/* Curved neck */}
          <mesh geometry={GEOS.duckNeck} castShadow>
            <meshStandardMaterial color="#186049" roughness={0.48} metalness={0.18} />
          </mesh>
          {/* Articulated Head & Bill */}
          <group ref={headRef} position={[0.25, 0.36, 0]}>
            <mesh geometry={GEOS.duckHead} castShadow>
              <meshStandardMaterial color="#155e44" roughness={0.34} metalness={0.28} />
            </mesh>
            <mesh geometry={GEOS.duckBill} position={[0.09, -0.02, 0]}>
              <meshStandardMaterial color="#eab308" roughness={0.42} />
            </mesh>
            <NaturalEye position={[0.055, 0.025, 0.072]} radius={0.02} />
            <NaturalEye position={[0.055, 0.025, -0.072]} radius={0.02} />
          </group>
          {/* Folded Wings with blue speculum feather stripe */}
          <group ref={leftWingOrArmRef} position={[-0.02, 0.055, 0.14]}>
            <mesh geometry={GEOS.duckWing} castShadow>
              <meshStandardMaterial color="#61564b" roughness={0.82} />
            </mesh>
            <mesh position={[-0.05, 0.005, 0.016]} scale={[0.1, 0.032, 0.022]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.45} metalness={0.2} />
            </mesh>
          </group>
          <group ref={rightWingOrArmRef} position={[-0.02, 0.055, -0.14]}>
            <mesh geometry={GEOS.duckWing} castShadow>
              <meshStandardMaterial color="#61564b" roughness={0.82} />
            </mesh>
            <mesh position={[-0.05, 0.005, -0.016]} scale={[0.1, 0.032, 0.022]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.45} metalness={0.2} />
            </mesh>
          </group>
          {/* Fanned tail feathers */}
          <group ref={tailRef} position={[-0.3, 0.045, 0]}>
            <mesh geometry={GEOS.duckTail}>
              <meshStandardMaterial color="#49423a" roughness={0.8} />
            </mesh>
          </group>
          {/* Submerged orange webbed feet paddling */}
          <group ref={leftLegRef} position={[-0.04, -0.11, 0.075]}>
            <mesh geometry={GEOS.webbedFoot}>
              <meshStandardMaterial color="#ea7d24" roughness={0.6} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[-0.04, -0.11, -0.075]}>
            <mesh geometry={GEOS.webbedFoot}>
              <meshStandardMaterial color="#ea7d24" roughness={0.6} />
            </mesh>
          </group>
        </group>
      )}

      {/* --- 2. OTTER (Ollie the River Otter) --- */}
      {visitor.type === 'otter' && (
        <group ref={bodyRef} position={[0, 0.04, 0]}>
          {/* Sleek furred torso */}
          <mesh geometry={GEOS.otterBody} castShadow receiveShadow>
            <meshStandardMaterial color="#694228" roughness={0.84} />
          </mesh>
          {/* Creamy tan chest & belly */}
          <mesh position={[0.08, -0.05, 0]} scale={[1.2, 0.56, 0.72]}>
            <sphereGeometry args={[0.145, 16, 12]} />
            <meshStandardMaterial color="#cfb394" roughness={0.88} />
          </mesh>
          {/* Articulated Head, Snout, Ears & Whiskers */}
          <group ref={headRef} position={[0.37, 0.075, 0]}>
            <mesh geometry={GEOS.otterHead} castShadow>
              <meshStandardMaterial color="#694228" roughness={0.8} />
            </mesh>
            {/* Pale muzzle cheeks */}
            <mesh position={[0.105, -0.025, 0.032]} scale={[0.9, 0.7, 0.85]}>
              <sphereGeometry args={[0.042, 10, 8]} />
              <meshStandardMaterial color="#d8bea0" roughness={0.85} />
            </mesh>
            <mesh position={[0.105, -0.025, -0.032]} scale={[0.9, 0.7, 0.85]}>
              <sphereGeometry args={[0.042, 10, 8]} />
              <meshStandardMaterial color="#d8bea0" roughness={0.85} />
            </mesh>
            {/* Dark wet nose pad */}
            <mesh position={[0.148, -0.005, 0]} scale={[0.7, 0.65, 0.9]}>
              <sphereGeometry args={[0.026, 10, 8]} />
              <meshStandardMaterial color="#231c18" roughness={0.25} />
            </mesh>
            {/* Rounded small side ears */}
            <mesh position={[-0.02, 0.075, 0.082]}>
              <sphereGeometry args={[0.028, 10, 8]} />
              <meshStandardMaterial color="#583620" roughness={0.84} />
            </mesh>
            <mesh position={[-0.02, 0.075, -0.082]}>
              <sphereGeometry args={[0.028, 10, 8]} />
              <meshStandardMaterial color="#583620" roughness={0.84} />
            </mesh>
            {/* Whiskers */}
            {[-1, 1].map((side) =>
              [-0.08, 0.08].map((ang, wi) => (
                <mesh
                  key={`${side}-${wi}`}
                  position={[0.115, -0.022 + wi * 0.015, side * 0.078]}
                  rotation={[side * 0.25, ang, 0]}
                >
                  <cylinderGeometry args={[0.003, 0.001, 0.095, 4]} />
                  <meshStandardMaterial color="#e5d7c3" roughness={0.5} />
                </mesh>
              ))
            )}
            <NaturalEye position={[0.08, 0.035, 0.068]} radius={0.021} />
            <NaturalEye position={[0.08, 0.035, -0.068]} radius={0.021} />
          </group>
          {/* Undulating tapered rudder tail */}
          <group ref={tailRef} position={[-0.33, 0.0, 0]}>
            <mesh geometry={GEOS.otterTail} castShadow>
              <meshStandardMaterial color="#5e3a23" roughness={0.82} />
            </mesh>
          </group>
          {/* Forepaws */}
          <group ref={leftWingOrArmRef} position={[0.18, -0.085, 0.1]}>
            <mesh rotation={[0.3, 0, -0.2]}>
              <capsuleGeometry args={[0.032, 0.08, 4, 8]} />
              <meshStandardMaterial color="#5a3720" roughness={0.82} />
            </mesh>
          </group>
          <group ref={rightWingOrArmRef} position={[0.18, -0.085, -0.1]}>
            <mesh rotation={[-0.3, 0, -0.2]}>
              <capsuleGeometry args={[0.032, 0.08, 4, 8]} />
              <meshStandardMaterial color="#5a3720" roughness={0.82} />
            </mesh>
          </group>
          {/* Signature River Pebble balanced on tummy during back-float */}
          <mesh ref={pebbleRef} visible={false} position={[0.14, -0.13, 0]} scale={[1.1, 0.72, 0.9]}>
            <icosahedronGeometry args={[0.048, 1]} />
            <meshStandardMaterial color="#8da2b0" roughness={0.35} />
          </mesh>
          {/* Webbed hind flippers */}
          <group ref={leftLegRef} position={[-0.2, -0.075, 0.1]}>
            <mesh geometry={GEOS.webbedFoot}>
              <meshStandardMaterial color="#4e301d" roughness={0.75} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[-0.2, -0.075, -0.1]}>
            <mesh geometry={GEOS.webbedFoot}>
              <meshStandardMaterial color="#4e301d" roughness={0.75} />
            </mesh>
          </group>
        </group>
      )}

      {/* --- 3. FROG (Barnaby the Bullfrog) --- */}
      {visitor.type === 'frog' && (
        <group ref={bodyRef} position={[0, 0.1, 0]}>
          {/* Squat olive-emerald amphibian body */}
          <mesh geometry={GEOS.frogTorso} castShadow receiveShadow>
            <meshStandardMaterial color="#4e7d32" roughness={0.34} />
          </mesh>
          {/* Lighter speckled cream belly */}
          <mesh position={[0.02, -0.055, 0]} scale={[1.15, 0.58, 0.85]}>
            <sphereGeometry args={[0.125, 14, 10]} />
            <meshStandardMaterial color="#d2dca0" roughness={0.48} />
          </mesh>
          {/* Subtle dorsal mottling spots */}
          {[[-0.04, 0.095, 0.055], [-0.09, 0.08, -0.045], [0.02, 0.105, -0.03]].map(([sx, sy, sz], i) => (
            <mesh key={i} position={[sx, sy, sz]} scale={[1.2, 0.4, 1.0]}>
              <sphereGeometry args={[0.028, 8, 6]} />
              <meshStandardMaterial color="#365c21" roughness={0.42} />
            </mesh>
          ))}
          {/* Broad Head, Eye Ridges, Golden Irises & Croaking Throat Sac */}
          <group ref={headRef} position={[0.18, 0.08, 0]}>
            <mesh geometry={GEOS.frogHead} castShadow>
              <meshStandardMaterial color="#578837" roughness={0.32} />
            </mesh>
            {/* Raised brow ridges + golden bullfrog eyes */}
            {[-0.082, 0.082].map((ez) => (
              <group key={ez} position={[0.02, 0.082, ez]}>
                <mesh scale={[1.1, 0.85, 0.9]}>
                  <sphereGeometry args={[0.042, 12, 10]} />
                  <meshStandardMaterial color="#47732c" roughness={0.42} />
                </mesh>
                <NaturalEye position={[0.022, 0.008, ez > 0 ? 0.015 : -0.015]} radius={0.022} irisColor="#ca8a04" />
              </group>
            ))}
            {/* Inflating throat vocal sac */}
            <mesh ref={vocalSacRef} position={[0.05, -0.068, 0]} scale={[1, 0.72, 1]}>
              <sphereGeometry args={[0.064, 14, 10]} />
              <meshStandardMaterial color="#dce8a4" roughness={0.45} />
            </mesh>
          </group>
          {/* Splayed front forearms */}
          <mesh position={[0.13, -0.055, 0.11]} rotation={[0.35, 0, 0.35]}>
            <capsuleGeometry args={[0.024, 0.09, 4, 8]} />
            <meshStandardMaterial color="#4a7730" roughness={0.48} />
          </mesh>
          <mesh position={[0.13, -0.055, -0.11]} rotation={[-0.35, 0, 0.35]}>
            <capsuleGeometry args={[0.024, 0.09, 4, 8]} />
            <meshStandardMaterial color="#4a7730" roughness={0.48} />
          </mesh>
          {/* Articulated folded muscular hind legs */}
          <group ref={leftLegRef} position={[-0.1, -0.03, 0.145]}>
            <mesh geometry={GEOS.frogThigh} rotation={[0.25, 0.35, 0.25]} castShadow>
              <meshStandardMaterial color="#46722d" roughness={0.48} />
            </mesh>
            <mesh geometry={GEOS.webbedFoot} position={[0.02, -0.075, 0.02]} rotation={[0, -0.3, 0]}>
              <meshStandardMaterial color="#588a3a" roughness={0.5} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[-0.1, -0.03, -0.145]}>
            <mesh geometry={GEOS.frogThigh} rotation={[-0.25, -0.35, 0.25]} castShadow>
              <meshStandardMaterial color="#46722d" roughness={0.48} />
            </mesh>
            <mesh geometry={GEOS.webbedFoot} position={[0.02, -0.075, -0.02]} rotation={[0, 0.3, 0]}>
              <meshStandardMaterial color="#588a3a" roughness={0.5} />
            </mesh>
          </group>
        </group>
      )}

      {/* --- 4. TURTLE (Shelby the Terrapin) --- */}
      {visitor.type === 'turtle' && (
        <group ref={bodyRef} position={[0, 0.02, 0]}>
          {/* Domed carapace shell */}
          <mesh geometry={GEOS.turtleShell} position={[-0.02, 0.015, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#4e5232" roughness={0.68} />
          </mesh>
          {/* Raised amber-horn scute ridge plates */}
          {[[-0.08, 0.175, 0], [0.04, 0.178, 0], [-0.02, 0.195, 0], [-0.02, 0.145, 0.11], [-0.02, 0.145, -0.11]].map(
            ([px, py, pz], idx) => (
              <mesh key={idx} position={[px, py, pz]} scale={[1.25, 0.3, 1.1]}>
                <dodecahedronGeometry args={[0.055, 0]} />
                <meshStandardMaterial color={idx === 2 ? '#597a3e' : '#7a633c'} roughness={0.82} />
              </mesh>
            )
          )}
          {/* Creamy-yellow plastron underneath */}
          <mesh geometry={GEOS.turtlePlastron} position={[-0.02, 0.008, 0]}>
            <meshStandardMaterial color="#cbb378" roughness={0.75} />
          </mesh>
          {/* Retractable neck & painted-cheek terrapin head */}
          <group ref={headRef} position={[0.27, 0.06, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2 - 0.18]} castShadow>
              <cylinderGeometry args={[0.044, 0.052, 0.16, 12]} />
              <meshStandardMaterial color="#678a4b" roughness={0.72} />
            </mesh>
            <mesh position={[0.08, 0.03, 0]} scale={[1.25, 0.88, 0.88]} castShadow>
              <sphereGeometry args={[0.068, 14, 10]} />
              <meshStandardMaterial color="#608245" roughness={0.68} />
            </mesh>
            {/* Painted turtle yellow cheek stripes */}
            <mesh position={[0.06, 0.02, 0.052]} rotation={[0, 0.15, 0]} scale={[0.065, 0.018, 0.012]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#eab308" roughness={0.6} />
            </mesh>
            <mesh position={[0.06, 0.02, -0.052]} rotation={[0, -0.15, 0]} scale={[0.065, 0.018, 0.012]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#eab308" roughness={0.6} />
            </mesh>
            <NaturalEye position={[0.11, 0.048, 0.044]} radius={0.017} />
            <NaturalEye position={[0.11, 0.048, -0.044]} radius={0.017} />
          </group>
          {/* Four rowing paddle flippers */}
          <group ref={leftWingOrArmRef} position={[0.14, -0.01, 0.16]}>
            <mesh geometry={GEOS.turtleFlipper} rotation={[0, -0.8, 0]} castShadow>
              <meshStandardMaterial color="#5c7d44" roughness={0.72} />
            </mesh>
          </group>
          <group ref={rightWingOrArmRef} position={[0.14, -0.01, -0.16]}>
            <mesh geometry={GEOS.turtleFlipper} rotation={[0, 0.8, 0]} castShadow>
              <meshStandardMaterial color="#5c7d44" roughness={0.72} />
            </mesh>
          </group>
          <group ref={leftLegRef} position={[-0.18, -0.01, 0.14]}>
            <mesh geometry={GEOS.turtleFlipper} rotation={[0, -2.2, 0]} scale={0.78}>
              <meshStandardMaterial color="#587740" roughness={0.75} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[-0.18, -0.01, -0.14]}>
            <mesh geometry={GEOS.turtleFlipper} rotation={[0, 2.2, 0]} scale={0.78}>
              <meshStandardMaterial color="#587740" roughness={0.75} />
            </mesh>
          </group>
          {/* Tapered little tail */}
          <mesh position={[-0.31, 0.01, 0]} rotation={[0, 0, Math.PI / 2 + 0.15]}>
            <coneGeometry args={[0.025, 0.1, 8]} />
            <meshStandardMaterial color="#587740" roughness={0.75} />
          </mesh>
        </group>
      )}

      {/* --- 5. CRAB (Pinchy the Shore Crab) --- */}
      {visitor.type === 'crab' && (
        <group ref={bodyRef} position={[0, 0.085, 0]}>
          {/* Hexagonal beveled crustacean carapace */}
          <mesh geometry={GEOS.crabCarapace} position={[0, -0.02, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#cb4d2e" roughness={0.34} />
          </mesh>
          {/* Warm cream-coral lower abdomen */}
          <mesh position={[0, -0.035, 0]} scale={[1.1, 0.4, 1.15]}>
            <sphereGeometry args={[0.135, 14, 10]} />
            <meshStandardMaterial color="#e89a74" roughness={0.62} />
          </mesh>
          {/* Articulated eyestalks */}
          {[-0.065, 0.065].map((ez) => (
            <group key={ez} position={[0.13, 0.06, ez]}>
              <mesh rotation={[0, 0, -0.18]}>
                <cylinderGeometry args={[0.012, 0.016, 0.085, 8]} />
                <meshStandardMaterial color="#c0472a" roughness={0.48} />
              </mesh>
              <NaturalEye position={[0.012, 0.045, 0]} radius={0.02} />
            </group>
          ))}
          {/* Articulated Left & Right Pincer Arms with Snapping Claws */}
          <group ref={leftWingOrArmRef} position={[0.12, -0.01, 0.16]} rotation={[0, -0.45, 0.12]}>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.024, 0.07, 4, 8]} />
              <meshStandardMaterial color="#d45534" roughness={0.46} />
            </mesh>
            <group position={[0.12, 0.015, 0.01]}>
              <mesh geometry={GEOS.crabClaw} castShadow>
                <meshStandardMaterial color="#e06540" roughness={0.42} />
              </mesh>
              <mesh ref={pincerLeftRef} position={[0.055, 0.02, 0]} rotation={[0, 0, 0.1]}>
                <coneGeometry args={[0.02, 0.085, 8]} />
                <meshStandardMaterial color="#f2a27d" roughness={0.38} />
              </mesh>
            </group>
          </group>
          <group ref={rightWingOrArmRef} position={[0.12, -0.01, -0.16]} rotation={[0, 0.45, 0.12]}>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.024, 0.07, 4, 8]} />
              <meshStandardMaterial color="#d45534" roughness={0.46} />
            </mesh>
            <group position={[0.12, 0.015, -0.01]}>
              <mesh geometry={GEOS.crabClaw} scale={0.86} castShadow>
                <meshStandardMaterial color="#e06540" roughness={0.42} />
              </mesh>
              <mesh ref={pincerRightRef} position={[0.048, 0.018, 0]} rotation={[0, 0, 0.1]}>
                <coneGeometry args={[0.018, 0.075, 8]} />
                <meshStandardMaterial color="#f2a27d" roughness={0.38} />
              </mesh>
            </group>
          </group>
          {/* 8 Segmented Crustacean Walking Legs (alternating tripod gait) */}
          <group ref={leftLegRef}>
            {[-0.08, 0.05].map((lx, idx) => (
              <group key={idx} position={[lx, -0.02, 0.16]}>
                <mesh position={[0, -0.01, 0.05]} rotation={[0.55, 0, 0]}>
                  <capsuleGeometry args={[0.015, 0.08, 3, 6]} />
                  <meshStandardMaterial color="#b54328" roughness={0.55} />
                </mesh>
                <mesh position={[0, -0.05, 0.11]} rotation={[-0.35, 0, 0]}>
                  <coneGeometry args={[0.014, 0.09, 6]} />
                  <meshStandardMaterial color="#9e3921" roughness={0.55} />
                </mesh>
              </group>
            ))}
          </group>
          <group ref={rightLegRef}>
            {[-0.08, 0.05].map((lx, idx) => (
              <group key={idx} position={[lx, -0.02, -0.16]}>
                <mesh position={[0, -0.01, -0.05]} rotation={[-0.55, 0, 0]}>
                  <capsuleGeometry args={[0.015, 0.08, 3, 6]} />
                  <meshStandardMaterial color="#b54328" roughness={0.55} />
                </mesh>
                <mesh position={[0, -0.05, -0.11]} rotation={[0.35, 0, 0]}>
                  <coneGeometry args={[0.014, 0.09, 6]} />
                  <meshStandardMaterial color="#9e3921" roughness={0.55} />
                </mesh>
              </group>
            ))}
          </group>
          <group ref={extraLegLeftRef}>
            {[-0.015, -0.135].map((lx, idx) => (
              <group key={idx} position={[lx, -0.02, 0.15]}>
                <mesh position={[0, -0.01, 0.05]} rotation={[0.55, 0, 0]}>
                  <capsuleGeometry args={[0.014, 0.08, 3, 6]} />
                  <meshStandardMaterial color="#b54328" roughness={0.55} />
                </mesh>
                <mesh position={[0, -0.05, 0.11]} rotation={[-0.35, 0, 0]}>
                  <coneGeometry args={[0.013, 0.085, 6]} />
                  <meshStandardMaterial color="#9e3921" roughness={0.55} />
                </mesh>
              </group>
            ))}
          </group>
          <group ref={extraLegRightRef}>
            {[-0.015, -0.135].map((lx, idx) => (
              <group key={idx} position={[lx, -0.02, -0.15]}>
                <mesh position={[0, -0.01, -0.05]} rotation={[-0.55, 0, 0]}>
                  <capsuleGeometry args={[0.014, 0.08, 3, 6]} />
                  <meshStandardMaterial color="#b54328" roughness={0.55} />
                </mesh>
                <mesh position={[0, -0.05, -0.11]} rotation={[0.35, 0, 0]}>
                  <coneGeometry args={[0.013, 0.085, 6]} />
                  <meshStandardMaterial color="#9e3921" roughness={0.55} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      )}

      {/* --- 6. RACCOON (Bandit the Masked Raccoon) --- */}
      {visitor.type === 'raccoon' && (
        <group ref={bodyRef} position={[0, 0.21, 0]}>
          {/* Rounded grizzled torso */}
          <mesh geometry={GEOS.raccoonBody} castShadow receiveShadow>
            <meshStandardMaterial color="#6d6f6d" roughness={0.86} />
          </mesh>
          {/* Lighter silver-gray chest/belly */}
          <mesh position={[0.09, -0.04, 0]} scale={[0.9, 0.72, 0.78]}>
            <sphereGeometry args={[0.135, 14, 10]} />
            <meshStandardMaterial color="#a8aba8" roughness={0.88} />
          </mesh>
          {/* Tapered Fox-Like Head, Pointed Ears, Bandit Mask & Whiskers */}
          <group ref={headRef} position={[0.25, 0.155, 0]}>
            <mesh geometry={GEOS.raccoonHead} castShadow>
              <meshStandardMaterial color="#8c8f8c" roughness={0.82} />
            </mesh>
            {/* Iconic black bandit mask wrap */}
            <mesh position={[0.065, 0.015, 0]} scale={[0.62, 0.52, 1.24]}>
              <sphereGeometry args={[0.092, 14, 10]} />
              <meshStandardMaterial color="#1f2324" roughness={0.85} />
            </mesh>
            {/* Creamy-white muzzle & cheek fur */}
            <mesh position={[0.125, -0.03, 0]} scale={[1.1, 0.68, 0.85]}>
              <sphereGeometry args={[0.052, 12, 10]} />
              <meshStandardMaterial color="#e2ded5" roughness={0.84} />
            </mesh>
            {/* Glossy black button nose */}
            <mesh position={[0.175, -0.018, 0]}>
              <sphereGeometry args={[0.022, 10, 8]} />
              <meshStandardMaterial color="#181b1c" roughness={0.22} />
            </mesh>
            {/* Pointed ears with pale inner trim */}
            {[-0.088, 0.088].map((ez) => (
              <group key={ez} position={[-0.03, 0.115, ez]} rotation={[ez > 0 ? 0.18 : -0.18, 0, -0.14]}>
                <mesh castShadow>
                  <coneGeometry args={[0.048, 0.11, 8]} />
                  <meshStandardMaterial color="#585d5c" roughness={0.85} />
                </mesh>
                <mesh position={[0.014, -0.01, 0]}>
                  <coneGeometry args={[0.026, 0.07, 6]} />
                  <meshStandardMaterial color="#d9d4cb" roughness={0.88} />
                </mesh>
              </group>
            ))}
            <NaturalEye position={[0.095, 0.026, 0.068]} radius={0.021} />
            <NaturalEye position={[0.095, 0.026, -0.068]} radius={0.021} />
          </group>
          {/* Solid Striped Bushy Tail (alternating charcoal & silver bands along sculpted volume) */}
          <group ref={tailRef} position={[-0.24, -0.02, 0]}>
            <mesh geometry={GEOS.raccoonTail} castShadow>
              <meshStandardMaterial color="#8f8b83" roughness={0.88} />
            </mesh>
            {[-0.06, -0.16, -0.26, -0.34].map((tx, idx) => {
              const ringR = 0.074 - idx * 0.012;
              return (
                <mesh key={tx} position={[tx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[ringR, ringR * 0.94, 0.044, 14]} />
                  <meshStandardMaterial color="#232627" roughness={0.88} />
                </mesh>
              );
            })}
          </group>
          {/* Nimble Front Paws (used for washing/inspecting behavior!) */}
          <group ref={leftWingOrArmRef} position={[0.14, -0.11, 0.09]}>
            <mesh rotation={[0, 0, -0.18]} castShadow>
              <capsuleGeometry args={[0.028, 0.12, 4, 8]} />
              <meshStandardMaterial color="#343839" roughness={0.84} />
            </mesh>
          </group>
          <group ref={rightWingOrArmRef} position={[0.14, -0.11, -0.09]}>
            <mesh rotation={[0, 0, -0.18]} castShadow>
              <capsuleGeometry args={[0.028, 0.12, 4, 8]} />
              <meshStandardMaterial color="#343839" roughness={0.84} />
            </mesh>
          </group>
          {/* Grounded Hind Legs */}
          {[-0.095, 0.095].map((hz) => (
            <mesh key={hz} position={[-0.12, -0.14, hz]} rotation={[0, 0, 0.15]} castShadow>
              <capsuleGeometry args={[0.036, 0.1, 4, 8]} />
              <meshStandardMaterial color="#424647" roughness={0.86} />
            </mesh>
          ))}
        </group>
      )}

      {/* Subtle warm greeting sparkle charm */}
      {name && (
        <group ref={indicatorRef} position={[0, 0.78, 0]}>
          <mesh>
            <octahedronGeometry args={[0.04, 0]} />
            <meshStandardMaterial
              color={hovered ? '#fef08a' : '#f7e7b4'}
              emissive="#f59e0b"
              emissiveIntensity={hovered ? 0.9 : 0.45}
              roughness={0.25}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
