/**
 * CAE (Computer-Aided Engineering) analysis for Comni Box.
 *
 * All analyses are analytic (closed-form) for real-time dashboard updates (<1ms).
 * Reactive to ChassisParams — slider changes update every result.
 *
 * Standard CAE outputs per check: stress, deflection, Factor of Safety.
 */

import type { ChassisParams } from '../types/chassis';
import {
  MATERIAL_YIELD_MPA,
  MATERIAL_ELASTIC_MODULUS_MPA,
  MATERIAL_MAX_SERVICE_TEMP_C,
} from '../types/chassis';

const G = 9.81; // m/s²

// ─── Fixed component properties ─────────────────────────────────────

const ROD = {
  diameter_mm: 4,
  elasticModulus_mpa: 200_000,  // steel
  maxSideLoad_n: 40,
  maxAxialLoad_n: 22,
} as const;

const HEAD = {
  mass_kg: 0.350,
  cogOffset_mm: 15,
} as const;

const PAN_SERVO = { maxSpeed_degPerSec: 320, stallTorque_kgcm: 17 } as const;
const TILT_SERVO = { maxSpeed_degPerSec: 300, stallTorque_kgcm: 10 } as const;

const THERMAL = { lumaPower_w: 20, piPower_w: 8, ambientTemp_c: 25 } as const;

// ─── Results interface ──────────────────────────────────────────────

export interface CAEResults {
  // ── Actuator side load ──
  actuatorSideLoad_n: number;
  actuatorBendingMoment_nmm: number;
  actuatorSideLoadFoS: number;
  actuatorSideLoadMargin_pct: number;
  actuatorSideLoadStatus: Status;

  // ── Column buckling ──
  eulerCriticalLoad_n: number;
  bucklingFoS: number;
  bucklingMargin_pct: number;
  bucklingStatus: Status;

  // ── Rod deflection (projector alignment) ──
  rodDeflection_mm: number;
  projectionShift_mm: number; // at 500mm throw distance
  rodDeflectionStatus: Status;

  // ── Slot stress ──
  slotAreaRemoved_pct: number;
  stressConcentrationFactor: number;
  slotCornerStress_mpa: number;
  slotFoS: number;
  slotStatus: Status;

  // ── Servo mount bearing stress ──
  panReactionTorque_nmm: number;
  tiltReactionTorque_nmm: number;
  bearingStress_mpa: number;
  bearingFoS: number;
  servoMountStatus: Status;

  // ── Wall deflection ──
  wallDeflection_mm: number;
  wallStress_mpa: number;
  wallFoS: number;
  wallDeflectionStatus: Status;

  // ── Thermal + softening ──
  headSteadyStateTemp_c: number;
  baseSteadyStateTemp_c: number;
  materialMaxServiceTemp_c: number;
  thermalFoS: number;
  thermalStatus: Status;

  // ── Vibration / resonance ──
  naturalFrequency_hz: number;
  servoStepRate_hz: number;
  resonanceMargin_pct: number;
  vibrationStatus: Status;

  // ── Base stability / tipping ──
  tippingMoment_nmm: number;
  resistingMoment_nmm: number;
  tippingFoS: number;
  tippingMargin_pct: number;
  minBaseWeight_kg: number;
  tippingStatus: Status;

  // ── Cable fatigue ──
  cableBendRadius_mm: number;
  estimatedCableLifeCycles: number;
  cableFatigueStatus: Status;
}

type Status = 'pass' | 'warn' | 'fail';

function statusFromFoS(fos: number): Status {
  if (fos >= 2.0) return 'pass';
  if (fos >= 1.2) return 'warn';
  return 'fail';
}

// ─── Analysis functions ─────────────────────────────────────────────

/**
 * Actuator side load at worst-case tilt + pan.
 *
 * F_side = sqrt( (m·g·sin(tilt))² + (m·g·cos(tilt)·d_cog/L_rod)² )
 * FoS = maxSideLoad / F_side
 */
function analyzeActuatorSideLoad(riseMax_mm: number) {
  const tiltRad = 45 * Math.PI / 180; // worst case
  const weight_n = HEAD.mass_kg * G;

  const tiltForce_n = weight_n * Math.sin(tiltRad);
  const cogForce_n = (weight_n * Math.cos(tiltRad) * HEAD.cogOffset_mm) / Math.max(riseMax_mm, 1);
  const sideLoad_n = Math.sqrt(tiltForce_n ** 2 + cogForce_n ** 2);
  const bendingMoment_nmm = sideLoad_n * riseMax_mm;
  const fos = ROD.maxSideLoad_n / Math.max(sideLoad_n, 0.001);
  const margin_pct = ((ROD.maxSideLoad_n - sideLoad_n) / ROD.maxSideLoad_n) * 100;

  return { sideLoad_n, bendingMoment_nmm, fos, margin_pct };
}

/**
 * Euler column buckling for fixed-free rod.
 *
 * P_cr = π²·E·I / (K·L)²   where K=2.0 (fixed-free)
 * I = π·d⁴/64
 * FoS = P_cr / P_applied
 */
function analyzeBuckling(riseMax_mm: number) {
  const d_m = ROD.diameter_mm / 1000;
  const L_m = Math.max(riseMax_mm, 1) / 1000;
  const E_pa = ROD.elasticModulus_mpa * 1e6;
  const I_m4 = (Math.PI * d_m ** 4) / 64;

  const criticalLoad_n = (Math.PI ** 2 * E_pa * I_m4) / (2 * L_m) ** 2;
  const appliedLoad_n = HEAD.mass_kg * G;
  const fos = criticalLoad_n / Math.max(appliedLoad_n, 0.001);
  const margin_pct = ((criticalLoad_n - appliedLoad_n) / criticalLoad_n) * 100;

  return { criticalLoad_n, fos, margin_pct };
}

/**
 * Actuator rod deflection under side load (cantilever beam).
 *
 * δ = F·L³ / (3·E·I)  — tip deflection of cantilever
 *
 * Projection shift at throw distance D:
 *   θ = δ/L (rad), shift = θ·D
 *
 * For a projector, even 1mm deflection at 500mm throw = ~10mm shift on surface.
 */
function analyzeRodDeflection(riseMax_mm: number) {
  const d_m = ROD.diameter_mm / 1000;
  const L_m = Math.max(riseMax_mm, 1) / 1000;
  const E_pa = ROD.elasticModulus_mpa * 1e6;
  const I_m4 = (Math.PI * d_m ** 4) / 64;

  // Side force at worst case (same as side load analysis)
  const tiltRad = 45 * Math.PI / 180;
  const weight_n = HEAD.mass_kg * G;
  const sideForce_n = weight_n * Math.sin(tiltRad);

  const deflection_m = (sideForce_n * L_m ** 3) / (3 * E_pa * I_m4);
  const deflection_mm = deflection_m * 1000;

  // Angular deflection and projection shift at 500mm throw
  const angle_rad = deflection_m / L_m;
  const throwDistance_mm = 500;
  const projectionShift_mm = angle_rad * throwDistance_mm;

  return { deflection_mm, projectionShift_mm };
}

/**
 * Slot stress concentration at top-panel cutout corners.
 *
 * Peterson's SCF: K_t = 1 + 2·sqrt(a/r)
 * σ_corner = K_t · σ_nominal
 * FoS = σ_yield / σ_corner
 */
function analyzeSlotStress(
  boxWidth_mm: number, slotWidth_mm: number, slotDepth_mm: number,
  wallThickness_mm: number, filletRadius_mm: number, yieldMpa: number,
) {
  const panelArea_mm2 = boxWidth_mm ** 2;
  const slotArea_mm2 = slotWidth_mm * slotDepth_mm;
  const areaRemoved_pct = (slotArea_mm2 / panelArea_mm2) * 100;

  const ligament_mm = (boxWidth_mm - slotWidth_mm) / 2;
  const ligamentArea_mm2 = Math.max(2 * ligament_mm * wallThickness_mm, 0.01);
  const nominalStress_mpa = (HEAD.mass_kg * G) / ligamentArea_mm2;

  const r = Math.max(filletRadius_mm, 0.5);
  const scf = 1 + 2 * Math.sqrt((slotWidth_mm / 2) / r);
  const cornerStress_mpa = nominalStress_mpa * scf;
  const fos = yieldMpa / Math.max(cornerStress_mpa, 0.001);

  return { areaRemoved_pct, scf, cornerStress_mpa, fos };
}

/**
 * Bearing stress at servo mount screw holes.
 *
 * When servos accelerate, reaction torque loads the mounting screws.
 * Bearing stress = Force / (screw_diameter × wall_thickness)
 * 3D printed holes are weak — layer adhesion limits bearing strength to ~60% of yield.
 *
 * FoS = (0.6 × σ_yield) / σ_bearing
 */
function analyzeServoMounts(
  headWidth_mm: number, headHeight_mm: number,
  wallThickness_mm: number, yieldMpa: number,
) {
  const m = HEAD.mass_kg;
  const w = headWidth_mm / 1000;
  const h = headHeight_mm / 1000;

  // Pan inertial torque
  const I_pan = (m * w ** 2) / 6;
  const panAccel = (PAN_SERVO.maxSpeed_degPerSec * Math.PI / 180) / 0.05;
  const panTorque_nmm = I_pan * panAccel * 1000;

  // Tilt: gravity + inertial
  const gravTorque_nm = m * G * (HEAD.cogOffset_mm / 1000);
  const I_tilt = (m * (w ** 2 + h ** 2)) / 12;
  const tiltAccel = (TILT_SERVO.maxSpeed_degPerSec * Math.PI / 180) / 0.05;
  const tiltTorque_nmm = (gravTorque_nm + I_tilt * tiltAccel) * 1000;

  // Bearing stress: 4× M3 screws in 20mm pattern
  const screwDia_mm = 3; // M3
  const mountArm_mm = 10;
  const worstTorque_nmm = Math.max(panTorque_nmm, tiltTorque_nmm);
  const forcePerScrew_n = worstTorque_nmm / (4 * mountArm_mm);
  const bearingArea_mm2 = screwDia_mm * wallThickness_mm;
  const bearingStress_mpa = forcePerScrew_n / Math.max(bearingArea_mm2, 0.01);

  // 3D prints: bearing strength ≈ 60% of yield (layer adhesion limit)
  const allowableBearing_mpa = yieldMpa * 0.6;
  const fos = allowableBearing_mpa / Math.max(bearingStress_mpa, 0.001);

  return { panTorque_nmm, tiltTorque_nmm, bearingStress_mpa, fos };
}

/**
 * Enclosure wall deflection under servo reaction loads.
 *
 * Models head side wall as a simply-supported rectangular plate.
 * Plate deflection: δ = α·q·a⁴/(E·t³)
 * where α ≈ 0.0138 for square plate, a = wall span, t = thickness.
 *
 * For a projector, wall flex causes the entire head to wobble during pan reversal.
 */
function analyzeWallDeflection(
  headWidth_mm: number, headHeight_mm: number,
  wallThickness_mm: number, elasticModulus_mpa: number, yieldMpa: number,
) {
  // Servo reaction force distributed over one wall
  const m = HEAD.mass_kg;
  const panAccel = (PAN_SERVO.maxSpeed_degPerSec * Math.PI / 180) / 0.05;
  const reactionForce_n = m * (headWidth_mm / 2000) * panAccel;

  const a_mm = headWidth_mm;
  const t_mm = wallThickness_mm;

  // Distributed load over wall area (N/mm²)
  const wallArea_mm2 = a_mm * headHeight_mm;
  const q_mpa = reactionForce_n / Math.max(wallArea_mm2, 0.01);

  // Plate deflection (simply-supported, α ≈ 0.0138 for aspect ~1:1)
  const alpha = 0.0138;
  const deflection_mm = (alpha * q_mpa * a_mm ** 4) / (elasticModulus_mpa * t_mm ** 3);

  // Bending stress in plate: σ = β·q·a²/t²  where β ≈ 0.287
  const beta = 0.287;
  const stress_mpa = (beta * q_mpa * a_mm ** 2) / (t_mm ** 2);
  const fos = yieldMpa / Math.max(stress_mpa, 0.001);

  return { deflection_mm: Math.abs(deflection_mm), stress_mpa: Math.abs(stress_mpa), fos };
}

/**
 * Thermal steady-state + material softening check.
 *
 * T_inside = T_ambient + Q / (h·A)
 * FoS_thermal = T_max_service / T_head (both in °C above ambient, ratio)
 *
 * Critical for PLA: Tg ≈ 55°C. Luma puts 20W into a tiny sealed head.
 */
function analyzeThermal(
  boxWidth_mm: number, boxDepth_mm: number,
  headHeight_mm: number, baseHeight_mm: number,
  maxServiceTemp_c: number,
) {
  const h_conv = 7; // W/(m²·K), sealed box natural convection

  const headArea_m2 = (boxWidth_mm * boxDepth_mm + 4 * boxWidth_mm * headHeight_mm) / 1e6;
  const headTemp_c = THERMAL.ambientTemp_c + THERMAL.lumaPower_w / (h_conv * headArea_m2);

  const baseArea_m2 = (boxWidth_mm * boxDepth_mm + 4 * boxWidth_mm * baseHeight_mm) / 1e6;
  const baseTemp_c = THERMAL.ambientTemp_c + THERMAL.piPower_w / (h_conv * baseArea_m2);

  // FoS: margin between predicted temp and material service limit
  // Both relative to ambient
  const headDeltaT = headTemp_c - THERMAL.ambientTemp_c;
  const maxDeltaT = maxServiceTemp_c - THERMAL.ambientTemp_c;
  const fos = maxDeltaT / Math.max(headDeltaT, 0.1);

  return { headTemp_c, baseTemp_c, maxServiceTemp_c, fos };
}

/**
 * Natural frequency of rod+head cantilever system.
 *
 * f_n = (1/2π)·sqrt(3EI / mL³)
 */
function analyzeVibration(riseMax_mm: number) {
  const d_m = ROD.diameter_mm / 1000;
  const L_m = Math.max(riseMax_mm, 1) / 1000;
  const E_pa = ROD.elasticModulus_mpa * 1e6;
  const I_m4 = (Math.PI * d_m ** 4) / 64;

  const fn = (1 / (2 * Math.PI)) * Math.sqrt((3 * E_pa * I_m4) / (HEAD.mass_kg * L_m ** 3));
  const servoRate = 50;
  const margin = Math.abs(fn / servoRate - 1) * 100;

  return { naturalFreq_hz: fn, servoStepRate_hz: servoRate, margin_pct: margin };
}

/**
 * Base stability / tipping at worst-case pan 90°.
 *
 * FoS = M_resist / M_tip
 */
function analyzeTipping(boxWidth_mm: number, basePlateWeight_kg: number) {
  const lateralOffset_mm = HEAD.cogOffset_mm + 10;
  const tippingMoment_nmm = HEAD.mass_kg * G * lateralOffset_mm * 1000;
  const baseArm_mm = boxWidth_mm / 2;
  const resistingMoment_nmm = basePlateWeight_kg * G * baseArm_mm * 1000;

  const fos = resistingMoment_nmm / Math.max(tippingMoment_nmm, 0.001);
  const margin_pct = resistingMoment_nmm > 0
    ? ((resistingMoment_nmm - tippingMoment_nmm) / resistingMoment_nmm) * 100 : -100;
  const minBaseWeight_kg = (HEAD.mass_kg * lateralOffset_mm * 2.0) / baseArm_mm;

  return { tippingMoment_nmm, resistingMoment_nmm, fos, margin_pct, minBaseWeight_kg };
}

function analyzeCableFatigue(slotWidth_mm: number) {
  const available_mm = Math.max(slotWidth_mm / 5, 8);
  const bendRadius_mm = Math.max(available_mm, 12);
  const life = bendRadius_mm >= 15 ? 30_000 : bendRadius_mm >= 10 ? 10_000 : 3_000;
  return { bendRadius_mm, estimatedLifeCycles: life };
}

// ─── Main entry point ───────────────────────────────────────────────

export function computeCAEResults(params: ChassisParams): CAEResults {
  const yieldMpa = MATERIAL_YIELD_MPA[params.frameMaterial];
  const elasticMpa = MATERIAL_ELASTIC_MODULUS_MPA[params.frameMaterial];
  const maxServiceC = MATERIAL_MAX_SERVICE_TEMP_C[params.frameMaterial];

  const side = analyzeActuatorSideLoad(params.riseMax_mm);
  const buck = analyzeBuckling(params.riseMax_mm);
  const rod = analyzeRodDeflection(params.riseMax_mm);
  const slot = analyzeSlotStress(
    params.boxWidth_mm, params.slotWidth_mm, params.slotDepth_mm,
    params.wallThickness_mm, params.filletRadius_mm, yieldMpa,
  );
  const servo = analyzeServoMounts(
    params.boxWidth_mm, params.headHeight_mm,
    params.wallThickness_mm, yieldMpa,
  );
  const wall = analyzeWallDeflection(
    params.boxWidth_mm, params.headHeight_mm,
    params.wallThickness_mm, elasticMpa, yieldMpa,
  );
  const therm = analyzeThermal(
    params.boxWidth_mm, params.boxDepth_mm,
    params.headHeight_mm, params.baseHeight_mm, maxServiceC,
  );
  const vib = analyzeVibration(params.riseMax_mm);
  const tip = analyzeTipping(params.boxWidth_mm, params.basePlateWeight_kg);
  const cable = analyzeCableFatigue(params.slotWidth_mm);

  return {
    actuatorSideLoad_n: side.sideLoad_n,
    actuatorBendingMoment_nmm: side.bendingMoment_nmm,
    actuatorSideLoadFoS: side.fos,
    actuatorSideLoadMargin_pct: side.margin_pct,
    actuatorSideLoadStatus: statusFromFoS(side.fos),

    eulerCriticalLoad_n: buck.criticalLoad_n,
    bucklingFoS: buck.fos,
    bucklingMargin_pct: buck.margin_pct,
    bucklingStatus: statusFromFoS(buck.fos),

    rodDeflection_mm: rod.deflection_mm,
    projectionShift_mm: rod.projectionShift_mm,
    rodDeflectionStatus: rod.deflection_mm < 0.5 ? 'pass' : rod.deflection_mm < 1.5 ? 'warn' : 'fail',

    slotAreaRemoved_pct: slot.areaRemoved_pct,
    stressConcentrationFactor: slot.scf,
    slotCornerStress_mpa: slot.cornerStress_mpa,
    slotFoS: slot.fos,
    slotStatus: statusFromFoS(slot.fos),

    panReactionTorque_nmm: servo.panTorque_nmm,
    tiltReactionTorque_nmm: servo.tiltTorque_nmm,
    bearingStress_mpa: servo.bearingStress_mpa,
    bearingFoS: servo.fos,
    servoMountStatus: statusFromFoS(servo.fos),

    wallDeflection_mm: wall.deflection_mm,
    wallStress_mpa: wall.stress_mpa,
    wallFoS: wall.fos,
    wallDeflectionStatus: wall.deflection_mm < 0.3 ? 'pass' : wall.deflection_mm < 1.0 ? 'warn' : 'fail',

    headSteadyStateTemp_c: therm.headTemp_c,
    baseSteadyStateTemp_c: therm.baseTemp_c,
    materialMaxServiceTemp_c: therm.maxServiceTemp_c,
    thermalFoS: therm.fos,
    thermalStatus: statusFromFoS(therm.fos),

    naturalFrequency_hz: vib.naturalFreq_hz,
    servoStepRate_hz: vib.servoStepRate_hz,
    resonanceMargin_pct: vib.margin_pct,
    vibrationStatus: vib.margin_pct > 30 ? 'pass' : vib.margin_pct > 10 ? 'warn' : 'fail',

    tippingMoment_nmm: tip.tippingMoment_nmm,
    resistingMoment_nmm: tip.resistingMoment_nmm,
    tippingFoS: tip.fos,
    tippingMargin_pct: tip.margin_pct,
    minBaseWeight_kg: tip.minBaseWeight_kg,
    tippingStatus: statusFromFoS(tip.fos),

    cableBendRadius_mm: cable.bendRadius_mm,
    estimatedCableLifeCycles: cable.estimatedLifeCycles,
    cableFatigueStatus: cable.estimatedLifeCycles > 20_000 ? 'pass' :
      cable.estimatedLifeCycles > 5_000 ? 'warn' : 'fail',
  };
}
