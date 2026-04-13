/**
 * CAE (Computer-Aided Engineering) analysis for Design D popup box.
 *
 * Computes structural, thermal, and dynamic performance scores for the
 * 5"×5"×5" Comni companion device. All analyses are analytic (closed-form)
 * and run in <1ms for real-time dashboard updates.
 *
 * Coordinate system: origin at center of base footprint at table level.
 * X = forward (lens side), Y = left, Z = up. All mm unless noted.
 */

import { DESIGN_D } from '../data/designD';

const D = DESIGN_D;
const G = 9.81; // m/s² gravitational acceleration

// ─── Material properties ────────────────────────────────────────────
/** PLA/PETG 3D-print properties (conservative, layer-line-weakened) */
const MAT = {
  /** Yield strength in MPa (PLA, across layer lines) */
  yieldStrength_mpa: 30,
  /** Elastic modulus in MPa */
  elasticModulus_mpa: 2400,
  /** Thermal conductivity in W/(m·K) */
  thermalConductivity_wmk: 0.13,
  /** Enclosure wall thickness in mm */
  wallThickness_mm: 2,
} as const;

/** L12-50 actuator rod properties */
const ROD = {
  diameter_mm: 4,
  /** Exposed length when fully extended in mm */
  exposedLength_mm: 50,
  /** Steel elastic modulus in MPa */
  elasticModulus_mpa: 200_000,
  /** Max rated axial load in N */
  maxAxialLoad_n: 22,
  /** Max rated side load in N (at full extension) */
  maxSideLoad_n: 40,
} as const;

/** Head assembly properties */
const HEAD = {
  mass_kg: 0.350,
  /** CoG offset from rod center axis in mm (Luma 350 is heavy, offset) */
  cogOffset_mm: 15,
  /** Height of head enclosure in mm */
  height_mm: D.headHeight_mm,
  /** Width/depth of head in mm */
  width_mm: D.boxWidth_mm,
} as const;

/** Servo specs */
const PAN_SERVO = {
  name: 'LX-16A',
  stallTorque_kgcm: 17,
  /** Max angular velocity in deg/s */
  maxSpeed_degPerSec: 320,
} as const;

const TILT_SERVO = {
  name: 'MG996R',
  stallTorque_kgcm: 10,
  maxSpeed_degPerSec: 300,
} as const;

/** Thermal sources */
const THERMAL = {
  /** Luma 350 heat dissipation in W */
  lumaPower_w: 20,
  /** Pi 5 heat dissipation in W */
  piPower_w: 8,
  /** Ambient temperature in °C */
  ambientTemp_c: 25,
} as const;

// ─── Analysis results interface ─────────────────────────────────────

export interface CAEResults {
  // Actuator bending moment
  actuatorBendingMoment_nmm: number;
  actuatorSideLoad_n: number;
  actuatorSideLoadMargin_pct: number;
  actuatorSideLoadStatus: 'pass' | 'warn' | 'fail';

  // Column buckling
  eulerCriticalLoad_n: number;
  bucklingMargin_pct: number;
  bucklingStatus: 'pass' | 'warn' | 'fail';

  // Top panel slot stress
  slotAreaRemoved_pct: number;
  stressConcentrationFactor: number;
  slotCornerStress_mpa: number;
  slotStatus: 'pass' | 'warn' | 'fail';

  // Servo reaction torques
  panReactionTorque_nmm: number;
  tiltReactionTorque_nmm: number;
  mountStress_mpa: number;
  servoMountStatus: 'pass' | 'warn' | 'fail';

  // Thermal
  headSteadyStateTemp_c: number;
  baseSteadyStateTemp_c: number;
  thermalStatus: 'pass' | 'warn' | 'fail';

  // Vibration / resonance
  naturalFrequency_hz: number;
  servoStepRate_hz: number;
  resonanceMargin_pct: number;
  vibrationStatus: 'pass' | 'warn' | 'fail';

  // Base stability / tipping
  tippingMoment_nmm: number;
  resistingMoment_nmm: number;
  tippingMargin_pct: number;
  minBaseWeight_kg: number;
  tippingStatus: 'pass' | 'warn' | 'fail';

  // Cable fatigue
  cableBendRadius_mm: number;
  estimatedCableLifeCycles: number;
  cableFatigueStatus: 'pass' | 'warn' | 'fail';
}

// ─── Analysis functions ─────────────────────────────────────────────

/**
 * Actuator side load analysis.
 *
 * When the head is extended and tilted, the CoG offset creates a bending
 * moment on the actuator rod. The side load at the rod tip equals the
 * component of head weight perpendicular to the rod axis.
 *
 * Formula: F_side = m·g·sin(tilt) + m·g·cos(tilt)·(d_cog / L_rod)
 * where d_cog is the CoG offset from rod center.
 */
function analyzeActuatorSideLoad(tiltDeg: number, panDeg: number): {
  bendingMoment_nmm: number;
  sideLoad_n: number;
  margin_pct: number;
} {
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const panRad = (panDeg * Math.PI) / 180;
  const weight_n = HEAD.mass_kg * G;

  // Lateral force from tilt: weight component perpendicular to rod
  const tiltForce_n = weight_n * Math.sin(tiltRad);

  // Lateral force from CoG offset (amplified by pan since CoG swings out)
  const cogLateral_mm = HEAD.cogOffset_mm * Math.abs(Math.cos(panRad));
  const cogForce_n = (weight_n * Math.cos(tiltRad) * cogLateral_mm) / ROD.exposedLength_mm;

  const totalSideLoad_n = Math.sqrt(tiltForce_n ** 2 + cogForce_n ** 2);
  const bendingMoment_nmm = totalSideLoad_n * ROD.exposedLength_mm;
  const margin_pct = ((ROD.maxSideLoad_n - totalSideLoad_n) / ROD.maxSideLoad_n) * 100;

  return { bendingMoment_nmm, sideLoad_n: totalSideLoad_n, margin_pct };
}

/**
 * Euler column buckling analysis.
 *
 * Treats the actuator rod as a fixed-free column (cantilever).
 * Euler critical load: P_cr = π²·E·I / (K·L)²
 * K = 2.0 for fixed-free end condition.
 *
 * I = π·d⁴/64 for solid circular cross-section.
 */
function analyzeBuckling(): { criticalLoad_n: number; margin_pct: number } {
  const d_m = ROD.diameter_mm / 1000;
  const L_m = ROD.exposedLength_mm / 1000;
  const E_pa = ROD.elasticModulus_mpa * 1e6;
  const I_m4 = (Math.PI * d_m ** 4) / 64;
  const K = 2.0; // fixed-free effective length factor

  const criticalLoad_n = (Math.PI ** 2 * E_pa * I_m4) / (K * L_m) ** 2;
  const appliedLoad_n = HEAD.mass_kg * G;
  const margin_pct = ((criticalLoad_n - appliedLoad_n) / criticalLoad_n) * 100;

  return { criticalLoad_n, margin_pct };
}

/**
 * Top panel slot stress concentration analysis.
 *
 * The 76×76mm slot in the 127×127mm top panel removes ~36% of cross-section.
 * Stress concentration factor at slot corners depends on fillet radius.
 * Using Peterson's SCF for a plate with central rectangular hole:
 *   K_t ≈ 1 + 2·sqrt(a/r) where a = slot half-width, r = fillet radius
 *
 * Nominal stress from head weight spread across remaining panel ligaments.
 */
function analyzeSlotStress(filletRadius_mm: number = 3): {
  areaRemoved_pct: number;
  scf: number;
  cornerStress_mpa: number;
} {
  const panelArea_mm2 = D.boxWidth_mm ** 2;
  const slotArea_mm2 = 76 * 76; // slot size for actuator + servo clearance
  const areaRemoved_pct = (slotArea_mm2 / panelArea_mm2) * 100;

  // Ligament width on each side
  const ligament_mm = (D.boxWidth_mm - 76) / 2; // ~25.5mm per side

  // Nominal stress: head weight spread across ligaments (two sides carry load)
  const ligamentArea_mm2 = 2 * ligament_mm * MAT.wallThickness_mm;
  const nominalStress_mpa = (HEAD.mass_kg * G) / ligamentArea_mm2;

  // Peterson's SCF for rectangular cutout with fillet
  const halfSlot_mm = 76 / 2;
  const r = Math.max(filletRadius_mm, 0.5);
  const scf = 1 + 2 * Math.sqrt(halfSlot_mm / r);

  const cornerStress_mpa = nominalStress_mpa * scf;

  return { areaRemoved_pct, scf, cornerStress_mpa };
}

/**
 * Servo reaction torque analysis.
 *
 * Computes peak reaction torque at servo mount points during maximum
 * acceleration (assumed full-speed start/stop in 50ms).
 * Torque = I_head · angular_acceleration
 * Plus static gravity torque for tilt servo.
 */
function analyzeServoMounts(): {
  panTorque_nmm: number;
  tiltTorque_nmm: number;
  mountStress_mpa: number;
} {
  // Head moment of inertia about pan axis (approximate as uniform box)
  const m = HEAD.mass_kg;
  const w = HEAD.width_mm / 1000;
  const h = HEAD.height_mm / 1000;
  // I_pan ≈ m·(w² + w²)/12 = m·w²/6 (rotation about vertical axis)
  const I_pan_kgm2 = (m * w ** 2) / 6;

  // Angular acceleration: 0 to max speed in 50ms
  const panAccel_radPerS2 = ((PAN_SERVO.maxSpeed_degPerSec * Math.PI) / 180) / 0.05;
  const panTorque_nm = I_pan_kgm2 * panAccel_radPerS2;
  const panTorque_nmm = panTorque_nm * 1000;

  // Tilt: gravity torque + inertial torque
  const cogArm_m = HEAD.cogOffset_mm / 1000;
  const gravityTorque_nm = m * G * cogArm_m; // static torque from CoG offset at 90° tilt
  const I_tilt_kgm2 = (m * (w ** 2 + h ** 2)) / 12;
  const tiltAccel_radPerS2 = ((TILT_SERVO.maxSpeed_degPerSec * Math.PI) / 180) / 0.05;
  const tiltInertialTorque_nm = I_tilt_kgm2 * tiltAccel_radPerS2;
  const tiltTorque_nmm = (gravityTorque_nm + tiltInertialTorque_nm) * 1000;

  // Mount stress: 4 M3 screws in a 20mm × 20mm pattern
  const screwCount = 4;
  const mountArm_mm = 10; // distance from servo center to screw
  const screwShearArea_mm2 = Math.PI * (1.5 ** 2); // M3 screw minor diameter
  const forcePerScrew_n = Math.max(panTorque_nmm, tiltTorque_nmm) / (screwCount * mountArm_mm);
  const mountStress_mpa = forcePerScrew_n / screwShearArea_mm2;

  return { panTorque_nmm, tiltTorque_nmm, mountStress_mpa };
}

/**
 * Thermal steady-state analysis.
 *
 * Simplified 1D conduction model: T_inside = T_ambient + Q / (h·A)
 * where h = natural convection coefficient + conduction through walls.
 *
 * For sealed enclosure: h_eff ≈ k_wall/t_wall + h_convection
 * Natural convection h ≈ 5-10 W/(m²·K) for small enclosed boxes.
 */
function analyzeThermal(): { headTemp_c: number; baseTemp_c: number } {
  const h_conv = 7; // W/(m²·K) natural convection (sealed box, conservative)

  // Head: 5 walls (top + 4 sides, bottom is open slot)
  const headWallArea_m2 =
    (D.boxWidth_mm * D.boxDepth_mm + 4 * D.boxWidth_mm * D.headHeight_mm) / 1e6;
  const headConductance = h_conv * headWallArea_m2; // W/K
  const headDeltaT = THERMAL.lumaPower_w / headConductance;
  const headTemp_c = THERMAL.ambientTemp_c + headDeltaT;

  // Base: 5 walls (bottom + 4 sides, top has slot opening)
  const baseWallArea_m2 =
    (D.boxWidth_mm * D.boxDepth_mm + 4 * D.boxWidth_mm * D.baseHeight_mm) / 1e6;
  const baseConductance = h_conv * baseWallArea_m2;
  const baseDeltaT = THERMAL.piPower_w / baseConductance;
  const baseTemp_c = THERMAL.ambientTemp_c + baseDeltaT;

  return { headTemp_c, baseTemp_c };
}

/**
 * Vibration / natural frequency analysis.
 *
 * Models the head on the actuator rod as a cantilever beam with tip mass.
 * Natural frequency: f_n = (1/2π)·sqrt(3·E·I / (m·L³))
 *
 * Compares to servo step rate to check for resonance.
 */
function analyzeVibration(): {
  naturalFreq_hz: number;
  servoStepRate_hz: number;
  margin_pct: number;
} {
  const d_m = ROD.diameter_mm / 1000;
  const L_m = ROD.exposedLength_mm / 1000;
  const E_pa = ROD.elasticModulus_mpa * 1e6;
  const I_m4 = (Math.PI * d_m ** 4) / 64;
  const m_kg = HEAD.mass_kg;

  // Cantilever with tip mass: f_n = (1/2π)·sqrt(3EI / mL³)
  const fn_hz = (1 / (2 * Math.PI)) * Math.sqrt((3 * E_pa * I_m4) / (m_kg * L_m ** 3));

  // Servo step rate: typical hobby servo PWM update rate
  // LX-16A uses serial bus at ~50Hz update rate
  const servoStepRate_hz = 50;

  // Margin: how far natural freq is from servo excitation
  const ratio = fn_hz / servoStepRate_hz;
  const margin_pct = Math.abs(ratio - 1) * 100;

  return { naturalFreq_hz: fn_hz, servoStepRate_hz, margin_pct };
}

/**
 * Base stability / tipping analysis.
 *
 * Worst case: head extended 50mm, panned 90° to the side, tilted 45°.
 * Tipping moment about base edge vs. restoring moment from base weight.
 *
 * Tipping moment: M_tip = m_head · g · (horizontal_offset)
 * Resisting moment: M_resist = m_base · g · (base_width/2)
 */
function analyzeTipping(baseMass_kg: number = 0.8): {
  tippingMoment_nmm: number;
  resistingMoment_nmm: number;
  margin_pct: number;
  minBaseWeight_kg: number;
} {
  // Worst case: head panned 90° — CoG moves to edge of base
  // Head CoG lateral offset when panned 90°: CoG is at HEAD.cogOffset_mm from center
  // Plus extra margin from tilt shifting the CoG further
  const lateralOffset_mm = HEAD.cogOffset_mm + 10; // conservative with tilt

  // Tipping moment about base edge
  const tippingMoment_nmm = HEAD.mass_kg * G * lateralOffset_mm * 1000; // N·mm

  // Resisting moment: base weight acts at center, moment arm = base_width/2 to edge
  const baseArm_mm = D.boxWidth_mm / 2;
  const resistingMoment_nmm = baseMass_kg * G * baseArm_mm * 1000; // N·mm

  const margin_pct =
    ((resistingMoment_nmm - tippingMoment_nmm) / resistingMoment_nmm) * 100;

  // Minimum base weight to prevent tipping (safety factor 2.0)
  const minBaseWeight_kg =
    (HEAD.mass_kg * lateralOffset_mm * 2.0) / baseArm_mm;

  return { tippingMoment_nmm, resistingMoment_nmm, margin_pct, minBaseWeight_kg };
}

/**
 * Cable fatigue analysis.
 *
 * Flat flex cables (FFC) through the rotating pan joint bend with each
 * pan cycle. Cable life depends on bend radius and number of cycles.
 *
 * Standard FFC rated for 20,000-50,000 cycles at min bend radius.
 * CSI ribbon cables are less flexible (~5,000 cycles at tight radius).
 *
 * Conservative estimate using MIL-STD bend radius guidelines.
 */
function analyzeCableFatigue(): {
  bendRadius_mm: number;
  estimatedLifeCycles: number;
} {
  // Available space for cable loop in neck slot
  // Neck slot ~10mm wide, cable must form a service loop for ±90° rotation
  // Minimum bend radius for FFC: 3-5mm, for CSI: 10-15mm
  const csiMinBendRadius_mm = 12;
  const availableLoopRadius_mm = 15; // constrained by neck slot

  const bendRadius_mm = Math.max(availableLoopRadius_mm, csiMinBendRadius_mm);

  // Fatigue life estimate: empirical curve for FFC at given bend radius
  // At 15mm radius: ~30,000 cycles. At 10mm: ~10,000. At 5mm: ~3,000.
  let estimatedLifeCycles: number;
  if (bendRadius_mm >= 15) {
    estimatedLifeCycles = 30_000;
  } else if (bendRadius_mm >= 10) {
    estimatedLifeCycles = 10_000;
  } else {
    estimatedLifeCycles = 3_000;
  }

  return { bendRadius_mm, estimatedLifeCycles };
}

// ─── Main entry point ───────────────────────────────────────────────

/**
 * Run all CAE analyses for Design D at worst-case load conditions.
 *
 * Worst case: head extended 50mm, tilted 45°, panned 90°.
 * Thermal: 30-minute steady-state projection.
 */
export function computeCAEResults(): CAEResults {
  // Worst-case tilt + pan
  const worstTilt_deg = 45;
  const worstPan_deg = 90;

  const sideLoad = analyzeActuatorSideLoad(worstTilt_deg, worstPan_deg);
  const buckling = analyzeBuckling();
  const slot = analyzeSlotStress(3); // 3mm fillet radius
  const servo = analyzeServoMounts();
  const thermal = analyzeThermal();
  const vib = analyzeVibration();
  const tipping = analyzeTipping(0.8); // 800g base mass estimate
  const cable = analyzeCableFatigue();

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
      slot.cornerStress_mpa < MAT.yieldStrength_mpa * 0.5
        ? 'pass'
        : slot.cornerStress_mpa < MAT.yieldStrength_mpa * 0.8
          ? 'warn'
          : 'fail',

    panReactionTorque_nmm: servo.panTorque_nmm,
    tiltReactionTorque_nmm: servo.tiltTorque_nmm,
    mountStress_mpa: servo.mountStress_mpa,
    servoMountStatus:
      servo.mountStress_mpa < MAT.yieldStrength_mpa * 0.4
        ? 'pass'
        : servo.mountStress_mpa < MAT.yieldStrength_mpa * 0.7
          ? 'warn'
          : 'fail',

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
      cable.estimatedLifeCycles > 20_000
        ? 'pass'
        : cable.estimatedLifeCycles > 5_000
          ? 'warn'
          : 'fail',
  };
}
