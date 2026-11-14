import { BufferAttribute, BufferGeometry } from 'three';

export const LAKE_BASE_RX = 8.4;
export const LAKE_BASE_RZ = 5.35;

/**
 * Multi-harmonic organic lake contour factor creating natural coves, bays, and headlands
 * instead of a uniform oval or circle.
 */
export function sampleLakeContourFactor(angleXZ: number): number {
  return (
    1.0 +
    0.08 * Math.cos(angleXZ + 2.2) +
    0.12 * Math.cos(2 * angleXZ + 0.45) -
    0.12 * Math.sin(3 * angleXZ - 0.1) +
    0.06 * Math.cos(4 * angleXZ + 1.2) +
    0.035 * Math.sin(5 * angleXZ + 0.5)
  );
}

/**
 * Returns [x, z] along the irregular lake shoreline at a given world XZ angle.
 */
export function getLakeShorePoint(
  angleXZ: number,
  scale = 1.0,
  padX = 0,
  padZ = 0
): [number, number] {
  const f = sampleLakeContourFactor(angleXZ);
  return [
    (LAKE_BASE_RX * f + padX) * scale * Math.cos(angleXZ),
    (LAKE_BASE_RZ * f + padZ) * scale * Math.sin(angleXZ),
  ];
}

/**
 * Clamps an arbitrary (x, z) point inside a radial fraction of the irregular lake shoreline.
 */
export function clampInsideLakeXZ(x: number, z: number, fraction = 0.84): [number, number] {
  const nx = x / LAKE_BASE_RX;
  const nz = z / LAKE_BASE_RZ;
  const dist = Math.hypot(nx, nz);
  if (dist < 1e-5) return [x, z];
  const angle = Math.atan2(nz, nx);
  const maxDist = sampleLakeContourFactor(angle) * fraction;
  if (dist <= maxDist) return [x, z];
  const ratio = maxDist / dist;
  return [x * ratio, z * ratio];
}

/**
 * Returns true if (x, z) lies inside the padded irregular lake contour (used to keep
 * background trees outside the natural shoreline and coves).
 */
export function isInsideLakePerimeter(x: number, z: number, padX = 0, padZ = 0): boolean {
  const rx = LAKE_BASE_RX + padX;
  const rz = LAKE_BASE_RZ + padZ;
  const nx = x / rx;
  const nz = z / rz;
  const angle = Math.atan2(nz, nx);
  const maxDist = sampleLakeContourFactor(angle);
  return Math.hypot(nx, nz) < maxDist;
}

/**
 * Builds an irregular lake surface disc directly in world XZ (Y up), with concentric
 * rings for smooth wave animation and shoreline silhouette fidelity.
 */
export function createLakeDiscGeometry(
  rx = LAKE_BASE_RX,
  rz = LAKE_BASE_RZ,
  scale = 1.0,
  radialSegments = 96,
  ringSegments = 16,
  padX = 0,
  padZ = 0
): BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];

  for (let ir = 1; ir <= ringSegments; ir++) {
    const t = ir / ringSegments;
    for (let ia = 0; ia < radialSegments; ia++) {
      const angle = (ia / radialSegments) * Math.PI * 2;
      const f = sampleLakeContourFactor(angle);
      const x = (rx * f + padX) * scale * t * Math.cos(angle);
      const z = (rz * f + padZ) * scale * t * Math.sin(angle);
      positions.push(x, 0, z);
      uvs.push(0.5 + 0.5 * t * Math.cos(angle), 0.5 + 0.5 * t * Math.sin(angle));
    }
  }

  // Center triangle fan (CCW viewed from +Y)
  for (let ia = 0; ia < radialSegments; ia++) {
    const next = (ia + 1) % radialSegments;
    indices.push(0, 1 + next, 1 + ia);
  }

  // Concentric rings
  for (let ir = 1; ir < ringSegments; ir++) {
    const rowA = 1 + (ir - 1) * radialSegments;
    const rowB = 1 + ir * radialSegments;
    for (let ia = 0; ia < radialSegments; ia++) {
      const next = (ia + 1) % radialSegments;
      const a0 = rowA + ia;
      const a1 = rowA + next;
      const b0 = rowB + ia;
      const b1 = rowB + next;
      indices.push(a0, a1, b0);
      indices.push(a1, b1, b0);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an irregular contour ring in world XZ (Y up) for shoreline sand, foam, and caustics.
 */
export function createLakeRingGeometry(
  rx = LAKE_BASE_RX,
  rz = LAKE_BASE_RZ,
  innerScale = 0.96,
  outerScale = 1.0,
  radialSegments = 96,
  innerPad = 0,
  outerPad = 0
): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ia = 0; ia < radialSegments; ia++) {
    const angle = (ia / radialSegments) * Math.PI * 2;
    const f = sampleLakeContourFactor(angle);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const ix = (rx * f + innerPad) * innerScale * c;
    const iz = (rz * f + innerPad * 0.72) * innerScale * s;
    const ox = (rx * f + outerPad) * outerScale * c;
    const oz = (rz * f + outerPad * 0.72) * outerScale * s;

    positions.push(ix, 0, iz, ox, 0, oz);
    uvs.push(ia / radialSegments, 0, ia / radialSegments, 1);
  }

  for (let ia = 0; ia < radialSegments; ia++) {
    const next = (ia + 1) % radialSegments;
    const i0 = ia * 2;
    const o0 = ia * 2 + 1;
    const i1 = next * 2;
    const o1 = next * 2 + 1;
    indices.push(i0, i1, o0);
    indices.push(i1, o1, o0);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the sloped outer earthen basin bank matching the irregular lake outline.
 */
export function createLakeBasinGeometry(
  rx = LAKE_BASE_RX,
  rz = LAKE_BASE_RZ,
  topPadX = 2.0,
  topPadZ = 1.45,
  bottomPadX = 2.65,
  bottomPadZ = 1.95,
  topY = 0.13,
  bottomY = -0.62,
  radialSegments = 96
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let ia = 0; ia < radialSegments; ia++) {
    const angle = (ia / radialSegments) * Math.PI * 2;
    const f = sampleLakeContourFactor(angle);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    // Top edge at bank crest, bottom edge seated into meadow ground
    positions.push(
      (rx * f + topPadX) * c,
      topY,
      (rz * f + topPadZ) * s,
      (rx * f + bottomPadX) * c,
      bottomY,
      (rz * f + bottomPadZ) * s
    );
  }

  for (let ia = 0; ia < radialSegments; ia++) {
    const next = (ia + 1) % radialSegments;
    const t0 = ia * 2;
    const b0 = ia * 2 + 1;
    const t1 = next * 2;
    const b1 = next * 2 + 1;
    indices.push(t0, t1, b0);
    indices.push(t1, b1, b0);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
