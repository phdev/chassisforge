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

export type FrameMaterial = 'pla' | 'petg' | 'aluminum_6061' | 'steel' | 'carbon_fiber';

export type DrivetrainType = 'differential' | 'ackermann' | 'omni_4' | 'mecanum_4';

export interface SensorMount {
  sensorId: string;
  position: Vec3; // mm, relative to chassis origin
  rotation: { pitch_deg: number; yaw_deg: number };
}

/**
 * Parametric chassis configuration.
 * Coordinate system: origin at geometric center of frame footprint at ground level.
 * X = forward, Y = left, Z = up. All dimensions in mm.
 */
export interface ChassisParams {
  // Frame dimensions
  frameLength_mm: number;       // 150-800, step 5
  frameWidth_mm: number;        // 100-600, step 5
  frameHeight_mm: number;       // 30-200, step 5
  groundClearance_mm: number;   // 10-150, step 5
  frameThickness_mm: number;    // 2-10, step 0.5
  frameMaterial: FrameMaterial;

  // Drivetrain
  drivetrainType: DrivetrainType;
  motorMountInset_mm: number;   // how far inboard the motors sit from frame edge

  // Component placements (mm, relative to chassis origin)
  batteryPosition: Vec3;
  computePosition: Vec3;
  sensorMounts: SensorMount[];

  // Payload
  payloadMountHeight_mm: number;
  maxPayload_kg: number;
}

/** Doorway fit check results. */
export interface DoorwayFit {
  standard_762mm: boolean;
  wide_914mm: boolean;
}

/**
 * All simulation scores computed from ChassisParams + selected components.
 * Updated on every parameter change — must compute in <16ms.
 */
export interface SimulationScores {
  // Static stability
  cgPosition: Vec3;                // mm
  stabilityMargin_pct: number;     // 0-100
  tipAngle_deg: number;            // degrees

  // Mobility
  turningRadius_mm: number;        // 0 for diff drive pivot turn
  maxSpeed_mps: number;            // m/s
  maxGradeability_deg: number;     // degrees
  stepClearance_mm: number;        // mm

  // Power
  estimatedRuntime_hrs: number;
  totalPowerDraw_w: number;
  motorPowerDraw_w: number;
  electronicsPowerDraw_w: number;

  // Mass
  totalMass_kg: number;
  massBudget: Record<string, number>; // subsystem name -> kg
  payloadCapacity_kg: number;

  // Fit checks
  allComponentsFit: boolean;
  interferenceWarnings: string[];
  doorwayFit: DoorwayFit;
}

/**
 * Material densities in kg/mm³.
 * Sources: MatWeb, manufacturer datasheets.
 */
export const MATERIAL_DENSITY_KG_PER_MM3: Record<FrameMaterial, number> = {
  pla: 1.24e-6,
  petg: 1.27e-6,
  aluminum_6061: 2.70e-6,
  steel: 7.85e-6,
  carbon_fiber: 1.55e-6,
};

/** Slider parameter definition for UI generation. */
export interface SliderDef {
  key: keyof ChassisParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}
