import { mulberry32 } from "./rng";

/**
 * The palace world is fully deterministic: same path, same landmarks, same
 * camera poses on every visit. Familiarity with the route is the point of the
 * memory-palace technique, so nothing here may depend on Math.random().
 */

export const TOTAL_WAYPOINTS = 52;
const STEP = 16; // distance between waypoints along z

export function terrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.045) * Math.cos(z * 0.038) * 2.0 +
    Math.sin(x * 0.012 + z * 0.021) * 3.0 +
    Math.sin(z * 0.09) * 0.5
  );
}

/** Winding path in the XZ plane, parameterized by waypoint index t (can be fractional). */
export function pathXZ(t: number): { x: number; z: number } {
  return {
    x: Math.sin(t * 0.5) * 26 + Math.sin(t * 0.23) * 15,
    z: -t * STEP,
  };
}

export function pathPoint(t: number): [number, number, number] {
  const { x, z } = pathXZ(t);
  return [x, terrainHeight(x, z), z];
}

export const LANDMARK_TYPES = [
  "oak",
  "pines",
  "boulder",
  "standingStone",
  "campfire",
  "pond",
  "cabin",
  "well",
  "arch",
  "obelisk",
  "flowers",
  "windmill",
  "logpile",
] as const;

export type LandmarkType = (typeof LANDMARK_TYPES)[number];

export interface Waypoint {
  index: number;
  /** point on the path itself */
  pathPos: [number, number, number];
  /** which side of the path the landmark/billboard sit on */
  side: 1 | -1;
  landmarkType: LandmarkType;
  /** seed for per-landmark cosmetic variation */
  seed: number;
  landmarkPos: [number, number, number];
  billboardPos: [number, number, number];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
}

const BILLBOARD_HEIGHT = 2.6;

function buildWaypoints(): Waypoint[] {
  const rand = mulberry32(1337);
  const waypoints: Waypoint[] = [];

  for (let i = 0; i < TOTAL_WAYPOINTS; i++) {
    const p = pathXZ(i);
    const prev = pathXZ(i - 1);
    const next = pathXZ(i + 1);

    // path direction and perpendicular, in XZ
    let dx = next.x - prev.x;
    let dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const perpX = -dz;
    const perpZ = dx;

    const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const seed = Math.floor(rand() * 1e9);

    const groundY = terrainHeight(p.x, p.z);

    const lmX = p.x + perpX * side * 6.5;
    const lmZ = p.z + perpZ * side * 6.5;
    const bbX = p.x + perpX * side * 3.2;
    const bbZ = p.z + perpZ * side * 3.2;

    const camX = p.x - dx * 9;
    const camZ = p.z - dz * 9;

    waypoints.push({
      index: i,
      pathPos: [p.x, groundY, p.z],
      side,
      landmarkType: LANDMARK_TYPES[i % LANDMARK_TYPES.length],
      seed,
      landmarkPos: [lmX, terrainHeight(lmX, lmZ), lmZ],
      billboardPos: [bbX, terrainHeight(bbX, bbZ) + BILLBOARD_HEIGHT, bbZ],
      cameraPos: [camX, terrainHeight(camX, camZ) + 3.4, camZ],
      cameraTarget: [bbX, terrainHeight(bbX, bbZ) + BILLBOARD_HEIGHT, bbZ],
    });
  }

  return waypoints;
}

export const WAYPOINTS: Waypoint[] = buildWaypoints();

/** Overview pose used before the walk starts (fly-in effect). */
export const OVERVIEW_POSE = {
  position: [0, 55, 60] as [number, number, number],
  target: [0, 0, -80] as [number, number, number],
};
