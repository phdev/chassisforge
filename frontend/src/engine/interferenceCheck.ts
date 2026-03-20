import type { Vec3, AABB, DoorwayFit } from '../types/chassis';
import type { Dimensions_mm } from '../types/components';

/** A named AABB for interference reporting. */
export interface NamedAABB {
  name: string;
  aabb: AABB;
}

/**
 * Create an AABB from a component's position and dimensions.
 * Position is the center-bottom of the component bounding box.
 *
 * @param position Center-bottom position in mm (x, y = center; z = bottom face).
 * @param dimensions Component bounding box dimensions in mm.
 */
export function makeAABB(position: Vec3, dimensions: Dimensions_mm): AABB {
  return {
    min: {
      x: position.x - dimensions.length / 2,
      y: position.y - dimensions.width / 2,
      z: position.z,
    },
    max: {
      x: position.x + dimensions.length / 2,
      y: position.y + dimensions.width / 2,
      z: position.z + dimensions.height,
    },
  };
}

/**
 * Check if two AABBs overlap (strict inequality — touching is NOT interference).
 *
 * Formula:
 *   overlap = A.min.x < B.max.x && A.max.x > B.min.x &&
 *             A.min.y < B.max.y && A.max.y > B.min.y &&
 *             A.min.z < B.max.z && A.max.z > B.min.z
 */
function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.min.x < b.max.x && a.max.x > b.min.x &&
    a.min.y < b.max.y && a.max.y > b.min.y &&
    a.min.z < b.max.z && a.max.z > b.min.z
  );
}

/**
 * Check all component pairs for interference (AABB overlap).
 *
 * @returns Array of warning strings like "Battery overlaps with Compute board".
 */
export function checkInterference(components: readonly NamedAABB[]): string[] {
  const warnings: string[] = [];

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i]!;
      const b = components[j]!;
      if (aabbOverlap(a.aabb, b.aabb)) {
        warnings.push(`${a.name} overlaps with ${b.name}`);
      }
    }
  }

  return warnings;
}

/**
 * Check if all components fit within the chassis frame footprint.
 *
 * @param chassisAABB The chassis frame bounding box.
 * @returns true if all components are within the chassis, false otherwise.
 */
export function checkAllComponentsFit(
  components: readonly NamedAABB[],
  chassisAABB: AABB,
): boolean {
  for (const comp of components) {
    if (
      comp.aabb.min.x < chassisAABB.min.x ||
      comp.aabb.max.x > chassisAABB.max.x ||
      comp.aabb.min.y < chassisAABB.min.y ||
      comp.aabb.max.y > chassisAABB.max.y
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Check if the robot fits through standard doorways.
 *
 * Formula:
 *   totalWidth_mm = frameWidth_mm + 2 × wheelWidth_mm
 *   (wheels protrude beyond frame on each side)
 *
 * Standard doorway: 762mm (30"). Wide doorway: 914mm (36").
 */
export function checkDoorwayFit(
  frameWidth_mm: number,
  wheelWidth_mm: number,
): DoorwayFit {
  const totalWidth_mm = frameWidth_mm + 2 * wheelWidth_mm;
  return {
    standard_762mm: totalWidth_mm < 762,
    wide_914mm: totalWidth_mm < 914,
  };
}
