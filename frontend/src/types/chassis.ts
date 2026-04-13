/** 3D vector with named axes. All values in millimeters unless otherwise noted. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Axis-aligned bounding box defined by min/max corners in mm. */
export interface AABB {
  min: Vec3;
  max: Vec3;
}

/**
 * Practical enclosure materials for a tabletop companion device.
 * Ordered from cheapest/easiest to most premium.
 */
export type FrameMaterial = 'pla' | 'petg' | 'abs' | 'plywood' | 'acrylic' | 'aluminum';

/**
 * Material densities in kg/mm³.
 * Sources: MatWeb, manufacturer datasheets.
 */
export const MATERIAL_DENSITY_KG_PER_MM3: Record<FrameMaterial, number> = {
  pla: 1.24e-6,
  petg: 1.27e-6,
  abs: 1.04e-6,
  plywood: 0.55e-6,
  acrylic: 1.18e-6,
  aluminum: 2.70e-6,
};

/** Material yield strength in MPa (conservative, across layer lines for prints). */
export const MATERIAL_YIELD_MPA: Record<FrameMaterial, number> = {
  pla: 30,
  petg: 40,
  abs: 35,
  plywood: 25,
  acrylic: 55,
  aluminum: 240,
};

/** Material thermal conductivity in W/(m·K). */
export const MATERIAL_THERMAL_CONDUCTIVITY: Record<FrameMaterial, number> = {
  pla: 0.13,
  petg: 0.15,
  abs: 0.17,
  plywood: 0.13,
  acrylic: 0.19,
  aluminum: 167,
};

/** Material elastic modulus in MPa. */
export const MATERIAL_ELASTIC_MODULUS_MPA: Record<FrameMaterial, number> = {
  pla: 2400,
  petg: 2100,
  abs: 2000,
  plywood: 8500,
  acrylic: 3100,
  aluminum: 69_000,
};

/**
 * Glass transition / max service temperature in °C.
 * Above this temperature, material significantly softens under load.
 * For non-thermoplastics, this is the continuous service temp limit.
 */
export const MATERIAL_MAX_SERVICE_TEMP_C: Record<FrameMaterial, number> = {
  pla: 55,      // Tg ~55-60°C, printed parts warp above this
  petg: 78,     // Tg ~80°C
  abs: 98,      // Tg ~100°C
  plywood: 120, // chars above ~200°C, glue softens ~120°C
  acrylic: 80,  // Tg ~105°C but crazes under stress at ~80°C
  aluminum: 200, // no softening concern at these temps
};

/** Positioned BOM component key. Only components with physical dimensions. */
export type ComponentKey =
  | 'pi5'
  | 'luma350'
  | 'piCamera'
  | 'xvf3800'
  | 'actuator'
  | 'panServo'
  | 'tiltServo'
  | 'pca9685'
  | 'tofSensor'
  | 'buckConverter'
  | 'bec'
  | 'ttlBoard';

export interface SensorMount {
  sensorId: string;
  position: Vec3;
  rotation: { pitch_deg: number; yaw_deg: number };
}

/**
 * Comni Box chassis parameters.
 *
 * Coordinate system: origin at center of base footprint at table level.
 * X = forward (lens/projection side), Y = left, Z = up. All mm.
 */
export interface ChassisParams {
  // Enclosure dimensions
  boxWidth_mm: number;         // 100-180, step 1
  boxDepth_mm: number;         // 100-180, step 1
  baseHeight_mm: number;       // 50-100, step 1
  headHeight_mm: number;       // 30-80, step 1
  wallThickness_mm: number;    // 1.5-6, step 0.5
  frameMaterial: FrameMaterial;

  // Structural / CAE
  basePlateWeight_kg: number;  // 0-2, step 0.05 (weighted steel/aluminum plate)
  filletRadius_mm: number;     // 1-10, step 0.5 (slot corner fillets)
  slotWidth_mm: number;        // 40-100, step 1 (neck slot opening)
  slotDepth_mm: number;        // 40-100, step 1
  riseMax_mm: number;          // 20-80, step 1 (actuator stroke)

  // Component positions (center-bottom, physics coords)
  componentPositions: Record<ComponentKey, Vec3>;
}

/**
 * Simulation scores for Comni Box (stationary tabletop device).
 * Updated on every parameter change — must compute in <16ms.
 */
export interface SimulationScores {
  // CG
  cgPosition: Vec3;

  // Base stability (tipping analysis)
  tippingMargin_pct: number;
  minTipAngle_deg: number;

  // Mass
  totalMass_kg: number;
  massBudget: Record<string, number>;

  // Power (electronics only — no drive motors)
  totalPowerDraw_w: number;
  electronicsPowerDraw_w: number;

  // Component fit
  allComponentsFit: boolean;
  interferenceWarnings: string[];

  // CAE results (reactive to params)
  actuatorSideLoadFoS: number;
  bucklingFoS: number;
  rodDeflection_mm: number;
  projectionShift_mm: number;
  slotCornerStress_mpa: number;
  slotFoS: number;
  bearingStress_mpa: number;
  bearingFoS: number;
  wallDeflection_mm: number;
  wallFoS: number;
  headSteadyStateTemp_c: number;
  baseSteadyStateTemp_c: number;
  thermalFoS: number;
  materialMaxServiceTemp_c: number;
  naturalFrequency_hz: number;
  tippingFoS: number;
  cableLifeCycles: number;
}

/** Slider parameter definition for UI generation. */
export interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}
