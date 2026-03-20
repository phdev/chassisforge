import type { Vec3 } from '../types/chassis';

/** A point mass used for CG computation. */
export interface MassItem {
  mass_kg: number;
  position: Vec3; // geometric center, in mm
}

/**
 * Calculate the center of gravity as the mass-weighted average of all component positions.
 *
 * Formula:
 *   CG_axis = Σ(m_i × pos_i) / Σ(m_i)  for each axis (x, y, z)
 *
 * Assumptions:
 *   - Each component has uniform density, so mass is concentrated at its geometric center.
 *   - Positions are in the chassis coordinate frame (origin at center of frame footprint, ground level).
 *
 * @returns CG position in mm. Returns (0,0,0) if total mass is zero.
 */
export function calculateCG(items: readonly MassItem[]): Vec3 {
  let totalMass_kg = 0;
  let wx = 0;
  let wy = 0;
  let wz = 0;

  for (const item of items) {
    totalMass_kg += item.mass_kg;
    wx += item.mass_kg * item.position.x;
    wy += item.mass_kg * item.position.y;
    wz += item.mass_kg * item.position.z;
  }

  if (totalMass_kg === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: wx / totalMass_kg,
    y: wy / totalMass_kg,
    z: wz / totalMass_kg,
  };
}
