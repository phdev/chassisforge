import type { ChassisParams, SimulationScores, Vec3 } from '../types/chassis';
import { MATERIAL_DENSITY_KG_PER_MM3 } from '../types/chassis';
import { calculateCG, type MassItem } from './cgCalculator';
import { computeCAEResults } from './caeAnalysis';

/**
 * Component masses from the Design D BOM (items with physical dimensions).
 * Estimates in kg based on datasheet weights.
 */
const COMPONENT_MASS_KG: Record<string, number> = {
  pi5: 0.047,
  luma350: 0.200,
  piCamera: 0.004,
  xvf3800: 0.015,
  actuator: 0.056,
  panServo: 0.052,
  tiltServo: 0.055,
  pca9685: 0.010,
  tofSensor: 0.003,
  buckConverter: 0.008,
  bec: 0.008,
  ttlBoard: 0.005,
};

/** Component dimensions in mm (length, width, height). */
const COMPONENT_DIMS: Record<string, { length: number; width: number; height: number }> = {
  pi5: { length: 85, width: 56, height: 17 },
  luma350: { length: 112, width: 112, height: 22 },
  piCamera: { length: 25, width: 24, height: 12 },
  xvf3800: { length: 46, width: 46, height: 3 },
  actuator: { length: 13, width: 13, height: 88 },
  panServo: { length: 22, width: 22, height: 18 },
  tiltServo: { length: 40, width: 19, height: 43 },
  pca9685: { length: 63, width: 25, height: 10 },
  tofSensor: { length: 14, width: 14, height: 7 },
  buckConverter: { length: 30, width: 15, height: 10 },
  bec: { length: 30, width: 15, height: 10 },
  ttlBoard: { length: 30, width: 20, height: 5 },
};

/** Wire/connector/external items mass estimate in kg. */
const MISC_MASS_KG = 0.050;

/**
 * Compute all simulation scores for the Comni Box.
 * Replaces the mobile-robot scoring with stationary-device analysis.
 */
export function computeAllScores(params: ChassisParams): SimulationScores {
  // --- Mass Budget ---
  // Enclosure shell: approximate as hollow box (6 panels of wallThickness)
  const w = params.boxWidth_mm;
  const d = params.boxDepth_mm;
  const totalH = params.baseHeight_mm + params.headHeight_mm;
  const t = params.wallThickness_mm;
  const density = MATERIAL_DENSITY_KG_PER_MM3[params.frameMaterial];

  // 6 panels: top, bottom, front, back, left, right (simplified)
  const shellVolume_mm3 =
    2 * (w * d * t) +        // top + bottom
    2 * (w * totalH * t) +   // front + back
    2 * (d * totalH * t);    // left + right
  const enclosureMass_kg = shellVolume_mm3 * density;

  const massBudget: Record<string, number> = {
    'Enclosure': enclosureMass_kg,
    'Base Plate': params.basePlateWeight_kg,
    'Pi 5': COMPONENT_MASS_KG.pi5!,
    'Luma 350': COMPONENT_MASS_KG.luma350!,
    'Servos': COMPONENT_MASS_KG.panServo! + COMPONENT_MASS_KG.tiltServo!,
    'Actuator': COMPONENT_MASS_KG.actuator!,
    'Sensors': COMPONENT_MASS_KG.piCamera! + COMPONENT_MASS_KG.xvf3800! + COMPONENT_MASS_KG.tofSensor!,
    'Electronics': COMPONENT_MASS_KG.pca9685! + COMPONENT_MASS_KG.buckConverter! + COMPONENT_MASS_KG.bec! + COMPONENT_MASS_KG.ttlBoard!,
    'Misc': MISC_MASS_KG,
  };
  const totalMass_kg = Object.values(massBudget).reduce((s, v) => s + v, 0);

  // --- Center of Gravity ---
  const pos = params.componentPositions;
  const massItems: MassItem[] = [
    // Enclosure shell: CG at geometric center
    { mass_kg: enclosureMass_kg, position: { x: 0, y: 0, z: totalH / 2 } },
    // Base plate: at bottom
    { mass_kg: params.basePlateWeight_kg, position: { x: 0, y: 0, z: t / 2 } },
    // Misc wiring
    { mass_kg: MISC_MASS_KG, position: { x: 0, y: 0, z: params.baseHeight_mm / 2 } },
  ];

  // Add each positioned component
  for (const [key, mass_kg] of Object.entries(COMPONENT_MASS_KG)) {
    const p = pos[key as keyof typeof pos];
    const dims = COMPONENT_DIMS[key];
    if (p && dims) {
      massItems.push({
        mass_kg,
        position: { x: p.x, y: p.y, z: p.z + dims.height / 2 },
      });
    }
  }

  const cgPosition = calculateCG(massItems);

  // --- Base Stability / Tipping ---
  // Support polygon is the base footprint (rectangle)
  const halfW = params.boxWidth_mm / 2;
  const halfD = params.boxDepth_mm / 2;

  // Tipping margin: CG must be within base footprint
  // Margin = min distance from CG projection to nearest edge / max possible distance
  const edgeDistances = [
    halfW - Math.abs(cgPosition.x),  // front/back edges
    halfD - Math.abs(cgPosition.y),  // left/right edges
  ];
  const minEdgeDist_mm = Math.min(...edgeDistances);
  const maxEdgeDist_mm = Math.min(halfW, halfD);
  const tippingMargin_pct = maxEdgeDist_mm > 0
    ? Math.max(0, Math.min(100, (minEdgeDist_mm / maxEdgeDist_mm) * 100))
    : 0;

  // Tip angle: atan2(min_edge_dist, cg_height)
  const minTipAngle_deg = cgPosition.z > 0 && minEdgeDist_mm > 0
    ? Math.atan2(minEdgeDist_mm, cgPosition.z) * (180 / Math.PI)
    : 0;

  // --- Power Draw (electronics only) ---
  // Pi 5: 8W, Luma 350: 20W, servos: ~2W avg, sensors: ~0.5W
  const electronicsPowerDraw_w = 8 + 20 + 2 + 0.5;
  const totalPowerDraw_w = electronicsPowerDraw_w;

  // --- Interference Check ---
  const interferenceWarnings: string[] = [];
  const componentAABBs: { name: string; min: Vec3; max: Vec3 }[] = [];

  for (const [key, dims] of Object.entries(COMPONENT_DIMS)) {
    const p = pos[key as keyof typeof pos];
    if (!p) continue;
    componentAABBs.push({
      name: key,
      min: { x: p.x - dims.length / 2, y: p.y - dims.width / 2, z: p.z },
      max: { x: p.x + dims.length / 2, y: p.y + dims.width / 2, z: p.z + dims.height },
    });
  }

  for (let i = 0; i < componentAABBs.length; i++) {
    for (let j = i + 1; j < componentAABBs.length; j++) {
      const a = componentAABBs[i]!;
      const b = componentAABBs[j]!;
      if (
        a.min.x < b.max.x && a.max.x > b.min.x &&
        a.min.y < b.max.y && a.max.y > b.min.y &&
        a.min.z < b.max.z && a.max.z > b.min.z
      ) {
        interferenceWarnings.push(`${a.name} overlaps ${b.name}`);
      }
    }
  }

  // Check components fit within enclosure
  const allComponentsFit = componentAABBs.every((c) =>
    c.min.x >= -halfW && c.max.x <= halfW &&
    c.min.y >= -halfD && c.max.y <= halfD &&
    c.min.z >= 0 && c.max.z <= totalH
  );

  // --- CAE Analysis (reactive to params) ---
  const cae = computeCAEResults(params);

  return {
    cgPosition,
    tippingMargin_pct,
    minTipAngle_deg,
    totalMass_kg,
    massBudget,
    totalPowerDraw_w,
    electronicsPowerDraw_w,
    allComponentsFit,
    interferenceWarnings,
    actuatorSideLoadFoS: cae.actuatorSideLoadFoS,
    bucklingFoS: cae.bucklingFoS,
    rodDeflection_mm: cae.rodDeflection_mm,
    projectionShift_mm: cae.projectionShift_mm,
    slotCornerStress_mpa: cae.slotCornerStress_mpa,
    slotFoS: cae.slotFoS,
    bearingStress_mpa: cae.bearingStress_mpa,
    bearingFoS: cae.bearingFoS,
    wallDeflection_mm: cae.wallDeflection_mm,
    wallFoS: cae.wallFoS,
    headSteadyStateTemp_c: cae.headSteadyStateTemp_c,
    baseSteadyStateTemp_c: cae.baseSteadyStateTemp_c,
    thermalFoS: cae.thermalFoS,
    materialMaxServiceTemp_c: cae.materialMaxServiceTemp_c,
    naturalFrequency_hz: cae.naturalFrequency_hz,
    tippingFoS: cae.tippingFoS,
    cableLifeCycles: cae.estimatedCableLifeCycles,
  };
}
