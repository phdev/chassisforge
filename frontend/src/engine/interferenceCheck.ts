import type { Vec3, AABB } from '../types/chassis';
import type { Dimensions_mm } from '../types/components';

/** A named AABB for interference reporting. */
export interface NamedAABB {
  name: string;
  aabb: AABB;
}

/**
 * Create an AABB from a component's position and dimensions.
 * Position is the center-bottom of the component bounding box.
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

/** Check all component pairs for AABB overlap. */
export function checkInterference(components: readonly NamedAABB[]): string[] {
  const warnings: string[] = [];
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i]!;
      const b = components[j]!;
      if (
        a.aabb.min.x < b.aabb.max.x && a.aabb.max.x > b.aabb.min.x &&
        a.aabb.min.y < b.aabb.max.y && a.aabb.max.y > b.aabb.min.y &&
        a.aabb.min.z < b.aabb.max.z && a.aabb.max.z > b.aabb.min.z
      ) {
        warnings.push(`${a.name} overlaps with ${b.name}`);
      }
    }
  }
  return warnings;
}
