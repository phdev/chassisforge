/**
 * CAE (Computer-Aided Engineering) analysis for Comni Box.
 *
 * Computes structural, thermal, and dynamic performance scores.
 * All analyses are analytic (closed-form) for real-time dashboard updates (<1ms).
 *
 * Now reactive to ChassisParams — slider changes update all CAE results.
 */

import type { ChassisParams } from '../types/chassis';
import { MATERIAL_YIELD_MPA } from '../types/chassis';

const G = 9.81; // m/s²

// ─── Fixed component properties ─────────────────────────────────────

/** L12-50 actuator rod */
const ROD = {
  diameter_mm: 4,
  elasticModulus_mpa: 200_000,  // steel
  maxSideLoad_n: 40,
} as const;

/** Head assembly */
const HEAD = {
  mass_kg: 0.350,
  cogOffset_mm: 15, // Luma 350 offset from rod center
} as const;

/** Servo specs */
const PAN_SERVO = { maxSpeed_degPerSec: 320 } as const;
const TILT_SERVO = { maxSpeed_degPerSec: 300 } as const;

/** Thermal sources */
const THERMAL = {
  lumaPower_w: 20,
  piPower_w: 8,
  ambientTemp_c: 25,
} as const;

// ─── Results interface ──────────────────────────────────────────────

export interface CAEResults {
  actuatorBendingMoment_nmm: number;
  actuatorSideLoad_n: number;
  actuatorSideLoadMargin_pct: number;
  actuatorSideLoadStatus: 'pass' | 'warn' | 'fail';

  eulerCriticalLoad_n: number;
  bucklingMargin_pct: number;
  bucklingStatus: 'pass' | 'warn' | 'fail';

  slotAreaRemoved_pct: number;
  stressConcentrationFactor: number;
  slotCornerStress_mpa: number;
  slotStatus: 'pass' | 'warn' | 'fail';

  panReactionTorque_nmm: number;
  tiltReactionTorque_nmm: number;
  mountStress_mpa: number;
  servoMountStatus: 'pass' | 'warn' | 'fail';

  headSteadyStateTemp_c: number;
  baseSteadyStateTemp_c: number;
  thermalStatus: 'pass' | 'warn' | 'fail';

  naturalFrequency_hz: number;
  servoStepRate_hz: number;
  resonanceMargin_pct: number;
  vibrationStatus: 'pass' | 'warn' | 'fail';

  tippingMoment_nmm: number;
  resistingMoment_nmm: number;
  tippingMargin_pct: number;
  minBaseWeight_kg: number;
  tippingStatus: 'pass' | 'warn' | 'fail';

  cableBendRadius_mm: number;
  estimatedCableLifeCycles: number;
  cableFatigueStatus: 'pass' | 'warn' | 'fail';
}

// ─── Analysis functions (now parameterized) ─────────────────────────

function analyzeActuatorSideLoad(riseMax_mm: number, tiltDeg: number, panDeg: number) {
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const panRad = (panDeg * Math.PI) / 180;
  const weight_n = HEAD.mass_kg * G;

  const tiltForce_n = weight_n * Math.sin(tiltRad);
  const cogLateral_mm = HEAD.cogOffset_mm * Math.abs(Math.cos(panRad));
  const cogForce_n = (weight_n * Math.cos(tiltRad) * cogLateral_mm) / riseMax_mm;

  const totalSideLoad_n = Math.sqrt(tiltForce_n ** 2 + cogForce_n ** 2);
  const bendingMoment_nmm = totalSideLoad_n * riseMax_mm;
  const margin_pct = ((ROD.maxSideLoad_n - totalSideLoad_n) / ROD.maxSideLoad_n) * 100;

  return { bendingMoment_nmm, sideLoad_n: totalSideLoad_n, margin_pct };
}

function analyzeBuckling(riseMax_mm: number) {
  const d_m = ROD.diameter_mm / 1000;
  const L_m = riseMax_mm / 1000;
  const E_pa = ROD.elasticModulus_mpa * 1e6;
  const I_m4 = (Math.PI * d_m ** 4) / 64;
  const K = 2.0; // fixed-free

  const criticalLoad_n = (Math.PI ** 2 * E_pa * I_m4) / (K * L_m) ** 2;
  const appliedLoad_n = HEAD.mass_kg * G;
  const margin_pct = ((criticalLoad_n - appliedLoad_n) / criticalLoad_n) * 100;

  return { criticalLoad_n, margin_pct };
}

function analyzeSlotStress(
  boxWidth_mm: number, slotWidth_mm: number, slotDepth_mm: number,
  wallThickness_mm: number, filletRadius_mm: number, yieldStrength_mpa: number,
) {
  const panelArea_mm2 = boxWidth_mm ** 2;
  const slotArea_mm2 = slotWidth_mm * slotDepth_mm;
  const areaRemoved_pct = (slotArea_mm2 / panelArea_mm2) * 100;

  const ligament_mm = (boxWidth_mm - slotWidth_mm) / 2;
  const ligamentArea_mm2 = 2 * ligament_mm * wallThickness_mm;
  const nominalStress_mpa = ligamentArea_mm2 > 0
    ? (HEAD.mass_kg * G) / ligamentArea_mm2
    : 999;

  const halfSlot_mm = slotWidth_mm / 2;
  const r = Math.max(filletRadius_mm, 0.5);
  const scf = 1 + 2 * Math.sqrt(halfSlot_mm / r);
  const cornerStress_mpa = nominalStress_mpa * scf;

  return { areaRemoved_pct, scf, cornerStress_mpa, yieldStrength_mpa };
}

function analyzeServoMounts(headWidth_mm: number, headHeight_mm: number) {
  const m = HEAD.mass_kg;
  const w = headWidth_mm / 1000;
  const h = headHeight_mm / 1000;

  const I_pan_kgm2 = (m * w ** 2) / 6;
  const panAccel = ((PAN_SERVO.maxSpeed_degPerSec * Math.PI) / 180) / 0.05;
  const panTorque_nmm = I_pan_kgm2 * panAccel * 1000;

  const cogArm_m = HEAD.cogOffset_mm / 1000;
  const gravityTorque_nm = m * G * cogArm_m;
  const I_tilt_kgm2 = (m * (w ** 2 + h ** 2)) / 12;
  const tiltAccel = ((TILT_SERVO.maxSpeed_degPerSec * Math.PI) / 180) / 0.05;
  const tiltTorque_nmm = (gravityTorque_nm + I_tilt_kgm2 * tiltAccel) * 1000;

  const screwCount = 4;
  const mountArm_mm = 10;
  const screwShearArea_mm2 = Math.PI * (1.5 ** 2);
  const forcePerScrew_n = Math.max(panTorque_nmm, tiltTorque_nmm) / (screwCount * mountArm_mm);
  const mountStress_mpa = forcePerScrew_n / screwShearArea_mm2;

  return { panTorque_nmm, tiltTorque_nmm, mountStress_mpa };
}

function analyzeThermal(
  boxWidth_mm: number, boxDepth_mm: number,
  headHeight_mm: number, baseHeight_mm: number,
) {
  const h_conv = 7; // W/(m²·K), natural convection

  const headWallArea_m2 =
    (boxWidth_mm * boxDepth_mm + 4 * boxWidth_mm * headHeight_mm) / 1e6;
  const headTemp_c = THERMAL.ambientTemp_c + THERMAL.lumaPower_w / (h_conv * headWallArea_m2);

  const baseWallArea_m2 =
    (boxWidth_mm * boxDepth_mm + 4 * boxWidth_mm * baseHeight_mm) / 1e6;
  const baseTemp_c = THERMAL.ambientTemp_c + THERMAL.piPower_w / (h_conv * baseWallArea_m2);

  return { headTemp_c, baseTemp_c };
}

function analyzeVibration(riseMax_mm: number) {
  const d_m = ROD.diameter_mm / 1000;
  const L_m = riseMax_mm / 1000;
  const E_pa = ROD.elasticModulus_mpa * 1e6;
  const I_m4 = (Math.PI * d_m ** 4) / 64;

  const fn_hz = (1 / (2 * Math.PI)) * Math.sqrt((3 * E_pa * I_m4) / (HEAD.mass_kg * L_m ** 3));
  const servoStepRate_hz = 50;
  const ratio = fn_hz / servoStepRate_hz;
  const margin_pct = Math.abs(ratio - 1) * 100;

  return { naturalFreq_hz: fn_hz, servoStepRate_hz, margin_pct };
}

function analyzeTipping(boxWidth_mm: number, basePlateWeight_kg: number) {
  const lateralOffset_mm = HEAD.cogOffset_mm + 10;
  const tippingMoment_nmm = HEAD.mass_kg * G * lateralOffset_mm * 1000;

  const baseArm_mm = boxWidth_mm / 2;
  const resistingMoment_nmm = basePlateWeight_kg * G * baseArm_mm * 1000;

  const margin_pct = resistingMoment_nmm > 0
    ? ((resistingMoment_nmm - tippingMoment_nmm) / resistingMoment_nmm) * 100
    : -100;

  const minBaseWeight_kg = (HEAD.mass_kg * lateralOffset_mm * 2.0) / baseArm_mm;

  return { tippingMoment_nmm, resistingMoment_nmm, margin_pct, minBaseWeight_kg };
}

function analyzeCableFatigue(slotWidth_mm: number) {
  const csiMinBendRadius_mm = 12;
  const availableLoopRadius_mm = Math.max(slotWidth_mm / 5, 8);
  const bendRadius_mm = Math.max(availableLoopRadius_mm, csiMinBendRadius_mm);

  let estimatedLifeCycles: number;
  if (bendRadius_mm >= 15) estimatedLifeCycles = 30_000;
  else if (bendRadius_mm >= 10) estimatedLifeCycles = 10_000;
  else estimatedLifeCycles = 3_000;

  return { bendRadius_mm, estimatedLifeCycles };
}

// ─── Main entry point (reactive to ChassisParams) ───────────────────

export function computeCAEResults(params: ChassisParams): CAEResults {
  const yieldMpa = MATERIAL_YIELD_MPA[params.frameMaterial];

  const sideLoad = analyzeActuatorSideLoad(params.riseMax_mm, 45, 90);
  const buckling = analyzeBuckling(params.riseMax_mm);
  const slot = analyzeSlotStress(
    params.boxWidth_mm, params.slotWidth_mm, params.slotDepth_mm,
    params.wallThickness_mm, params.filletRadius_mm, yieldMpa,
  );
  const servo = analyzeServoMounts(params.boxWidth_mm, params.headHeight_mm);
  const thermal = analyzeThermal(
    params.boxWidth_mm, params.boxDepth_mm,
    params.headHeight_mm, params.baseHeight_mm,
  );
  const vib = analyzeVibration(params.riseMax_mm);
  const tipping = analyzeTipping(params.boxWidth_mm, params.basePlateWeight_kg);
  const cable = analyzeCableFatigue(params.slotWidth_mm);

  return {
    actuatorBendingMoment_nmm: sideLoad.bendingMoment_nmm,
    actuatorSideLoad_n: sideLoad.sideLoad_n,
    actuatorSideLoadMargin_pct: sideLoad.margin_pct,
    actuatorSideLoadStatus:
      sideLoad.margin_pct > 30 ? 'pass' : sideLoad.margin_pct > 10 ? 'warn' : 'fail',

    eulerCriticalLoad_n: buckling.criticalLoad_n,
    bucklingMargin_pct: buckling.margin_pct,
    bucklingStatus:
      buckling.margin_pct > 80 ? 'pass' : buckling.margin_pct > 50 ? 'warn' : 'fail',

    slotAreaRemoved_pct: slot.areaRemoved_pct,
    stressConcentrationFactor: slot.scf,
    slotCornerStress_mpa: slot.cornerStress_mpa,
    slotStatus:
      slot.cornerStress_mpa < yieldMpa * 0.5 ? 'pass'
        : slot.cornerStress_mpa < yieldMpa * 0.8 ? 'warn' : 'fail',

    panReactionTorque_nmm: servo.panTorque_nmm,
    tiltReactionTorque_nmm: servo.tiltTorque_nmm,
    mountStress_mpa: servo.mountStress_mpa,
    servoMountStatus:
      servo.mountStress_mpa < yieldMpa * 0.4 ? 'pass'
        : servo.mountStress_mpa < yieldMpa * 0.7 ? 'warn' : 'fail',

    headSteadyStateTemp_c: thermal.headTemp_c,
    baseSteadyStateTemp_c: thermal.baseTemp_c,
    thermalStatus:
      thermal.headTemp_c < 55 ? 'pass' : thermal.headTemp_c < 70 ? 'warn' : 'fail',

    naturalFrequency_hz: vib.naturalFreq_hz,
    servoStepRate_hz: vib.servoStepRate_hz,
    resonanceMargin_pct: vib.margin_pct,
    vibrationStatus:
      vib.margin_pct > 30 ? 'pass' : vib.margin_pct > 10 ? 'warn' : 'fail',

    tippingMoment_nmm: tipping.tippingMoment_nmm,
    resistingMoment_nmm: tipping.resistingMoment_nmm,
    tippingMargin_pct: tipping.margin_pct,
    minBaseWeight_kg: tipping.minBaseWeight_kg,
    tippingStatus:
      tipping.margin_pct > 30 ? 'pass' : tipping.margin_pct > 10 ? 'warn' : 'fail',

    cableBendRadius_mm: cable.bendRadius_mm,
    estimatedCableLifeCycles: cable.estimatedLifeCycles,
    cableFatigueStatus:
      cable.estimatedLifeCycles > 20_000 ? 'pass'
        : cable.estimatedLifeCycles > 5_000 ? 'warn' : 'fail',
  };
}
