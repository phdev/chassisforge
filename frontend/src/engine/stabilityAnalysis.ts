import type { Vec3 } from '../types/chassis';

/**
 * Calculate the minimum distance from a 2D point to the edges of a convex polygon.
 *
 * For each edge P1→P2, the signed distance from point P is:
 *   d = ((P2.x - P1.x) * (P1.y - P.y) - (P2.y - P1.y) * (P1.x - P.x)) / |P2 - P1|
 *
 * For a CCW-wound polygon, positive d means inside. We return the minimum.
 * If negative, the point is outside the polygon (unstable).
 */
function pointToPolygonMinDistance(
  point: { x: number; y: number },
  polygon: readonly { x: number; y: number }[],
): number {
  let minDist = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]!;
    const p2 = polygon[(i + 1) % polygon.length]!;

    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

    if (edgeLen === 0) continue;

    // Signed distance: positive = inside (for CCW polygon)
    const dist = (edgeX * (p1.y - point.y) - edgeY * (p1.x - point.x)) / edgeLen;
    minDist = Math.min(minDist, dist);
  }

  return minDist;
}

/**
 * Build the support polygon for a differential drive robot.
 * The polygon is defined by the 4 wheel/caster contact points on the ground plane.
 *
 * For differential drive:
 *   - 2 drive wheels at the sides (positioned along Y axis)
 *   - 2 rear casters (offset 20mm from rear frame edge)
 *
 * Polygon wound counter-clockwise when viewed from above (Z+).
 */
export function buildSupportPolygon(
  frameLength_mm: number,
  frameWidth_mm: number,
  wheelWidth_mm: number,
  _motorMountInset_mm: number,
): { x: number; y: number }[] {
  // Drive wheels: at center of frame length (x=0), at outer edges along Y
  const driveWheelY = frameWidth_mm / 2 + wheelWidth_mm / 2;

  // Casters: near the front and rear of frame, at some inset
  // For diff drive, casters at front center provide 3-point stability
  // Using a 4-point polygon with front caster spread and rear drive wheels
  // Actually: drive wheels at x = -motorMountInset (rear-ish), casters at front
  // Convention: drive wheels at x=0 (center), casters at front and rear for stability
  // Simplification: rectangular support polygon
  const casterX = frameLength_mm / 2 - 20; // 20mm from frame edge
  const casterY = frameWidth_mm / 4; // casters narrower than drive wheels

  // CCW winding viewed from above:
  // rear-right → front-right → front-left → rear-left
  return [
    { x: 0, y: -driveWheelY },           // right drive wheel
    { x: casterX, y: -casterY },          // front-right caster
    { x: casterX, y: casterY },           // front-left caster
    { x: 0, y: driveWheelY },             // left drive wheel
    { x: -casterX, y: casterY },          // rear-left caster (if present)
    { x: -casterX, y: -casterY },         // rear-right caster
  ];
}

/**
 * Calculate stability margin as a percentage.
 *
 * Formula:
 *   margin_mm = min signed distance from CG projection to polygon edges
 *   max_margin_mm = min signed distance from polygon centroid to edges (inscribed radius)
 *   stability_margin_pct = clamp((margin_mm / max_margin_mm) × 100, 0, 100)
 *
 * @returns 0-100 percentage. 0 = CG on edge, 100 = CG at optimal center.
 *          Negative internal margin means unstable, returned as 0.
 */
export function calculateStabilityMargin(
  cgProjection: { x: number; y: number },
  supportPolygon: readonly { x: number; y: number }[],
): number {
  if (supportPolygon.length < 3) return 0;

  const margin_mm = pointToPolygonMinDistance(cgProjection, supportPolygon);

  // Compute inscribed radius (max margin at centroid)
  const centroid = {
    x: supportPolygon.reduce((s, p) => s + p.x, 0) / supportPolygon.length,
    y: supportPolygon.reduce((s, p) => s + p.y, 0) / supportPolygon.length,
  };
  const maxMargin_mm = pointToPolygonMinDistance(centroid, supportPolygon);

  if (maxMargin_mm <= 0) return 0;
  if (margin_mm <= 0) return 0;

  return Math.min((margin_mm / maxMargin_mm) * 100, 100);
}

/**
 * Calculate the minimum tip angle — the slope angle at which the robot tips over.
 *
 * Formula:
 *   For each support polygon edge:
 *     d = horizontal distance from CG projection to that edge
 *     h = CG height (cg.z)
 *     tip_angle = atan2(d, h) × (180/π)
 *   tipAngle_deg = min across all edges
 *
 * Assumptions:
 *   - Static analysis only (no dynamic effects).
 *   - Robot tips over the nearest edge.
 *
 * @returns Minimum tip angle in degrees. Higher = more stable.
 */
export function calculateTipAngle(
  cg: Vec3,
  supportPolygon: readonly { x: number; y: number }[],
): number {
  if (supportPolygon.length < 3 || cg.z <= 0) return 0;

  const cgProj = { x: cg.x, y: cg.y };
  const margin_mm = pointToPolygonMinDistance(cgProj, supportPolygon);

  if (margin_mm <= 0) return 0;

  return Math.atan2(margin_mm, cg.z) * (180 / Math.PI);
}

/**
 * Calculate maximum payload before stability degrades below threshold.
 *
 * Uses binary search: adds payload mass at (0, 0, payloadMountHeight_mm)
 * and checks if stability margin stays above the threshold.
 *
 * @param threshold_pct Minimum acceptable stability margin (default 15%).
 * @param maxSearch_kg Upper bound for search (default from params.maxPayload_kg).
 * @returns Maximum payload in kg with 0.01 kg precision.
 */
export function calculatePayloadCapacity(
  currentCG: Vec3,
  currentMass_kg: number,
  payloadMountHeight_mm: number,
  supportPolygon: readonly { x: number; y: number }[],
  maxSearch_kg: number,
  threshold_pct: number = 15,
): number {
  let low = 0;
  let high = maxSearch_kg;

  // Check if even 0 payload is below threshold
  const baseMargin = calculateStabilityMargin({ x: currentCG.x, y: currentCG.y }, supportPolygon);
  if (baseMargin < threshold_pct) return 0;

  for (let i = 0; i < 20; i++) { // ~0.01 kg precision after 20 iterations
    const mid = (low + high) / 2;
    const totalMass = currentMass_kg + mid;
    // Payload at (0, 0, payloadMountHeight_mm) shifts CG toward center laterally
    const newCGProj = {
      x: (currentMass_kg * currentCG.x) / totalMass, // payload at x=0
      y: (currentMass_kg * currentCG.y) / totalMass, // payload at y=0
    };
    // Payload raises CG, reducing tip angle — use tip angle as stability metric
    const newCGz = (currentMass_kg * currentCG.z + mid * payloadMountHeight_mm) / totalMass;
    const newCG3d: Vec3 = { x: newCGProj.x, y: newCGProj.y, z: newCGz };
    // Use tip angle: if it drops below a threshold (proportional to margin), reduce capacity
    const margin = calculateStabilityMargin(newCGProj, supportPolygon);
    const tipAngle = calculateTipAngle(newCG3d, supportPolygon);
    // Consider unstable if margin < threshold OR tip angle < 15 degrees
    const stable = margin >= threshold_pct && tipAngle >= 15;

    if (stable) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor(low * 100) / 100; // round down to 0.01
}
