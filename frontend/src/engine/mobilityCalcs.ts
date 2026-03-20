import type { DrivetrainType } from '../types/chassis';
import type { Motor, Wheel } from '../types/components';

/**
 * Calculate maximum theoretical speed from motor RPM and wheel diameter.
 *
 * Formula:
 *   wheel_circumference_m = π × wheel.diameter_mm / 1000
 *   maxSpeed_mps = (motor.noLoadRPM / 60) × wheel_circumference_m
 *
 * Assumptions:
 *   - No-load speed (actual loaded speed is ~70-80%, ignored in Phase 1).
 *   - Gear ratio is already baked into the motor's noLoadRPM spec.
 *   - Direct drive from motor shaft to wheel.
 *
 * @returns Speed in meters per second.
 */
export function calculateMaxSpeed(motor: Motor, wheel: Wheel): number {
  const circumference_m = Math.PI * wheel.diameter_mm / 1000;
  return (motor.noLoadRPM / 60) * circumference_m;
}

/**
 * Calculate minimum turning radius based on drivetrain type.
 *
 * Formulas:
 *   - Differential: 0 mm (can pivot in place)
 *   - Ackermann: wheelbase / tan(maxSteerAngle), assuming 35° max
 *   - Omni/Mecanum: 0 mm (can translate without rotation)
 *
 * @param trackWidth_mm Distance between left and right wheel centers.
 * @param wheelbase_mm Distance between front and rear axles (used for ackermann).
 * @returns Turning radius in mm.
 */
export function calculateTurningRadius(
  drivetrainType: DrivetrainType,
  _trackWidth_mm: number,
  wheelbase_mm: number,
): number {
  switch (drivetrainType) {
    case 'differential':
      return 0;
    case 'ackermann': {
      const maxSteerAngle_rad = 35 * Math.PI / 180;
      return wheelbase_mm / Math.tan(maxSteerAngle_rad);
    }
    case 'omni_4':
    case 'mecanum_4':
      return 0;
  }
}

/**
 * Calculate maximum climbable slope angle.
 *
 * Formula:
 *   motorForce_N = 2 × (stallTorque_kgcm × 0.0981) / wheelRadius_m × 0.5
 *   sinθ = clamp(motorForce_N / (totalMass_kg × 9.81), 0, 1)
 *   maxGradeability_deg = asin(sinθ) × 180/π
 *
 * Assumptions:
 *   - Stall torque derated 50% for continuous operation safety margin.
 *   - No wheel slip (sufficient traction assumed).
 *   - 2 motors contribute equally (differential drive).
 *
 * @returns Maximum slope angle in degrees.
 */
export function calculateGradeability(
  motor: Motor,
  totalMass_kg: number,
  wheelRadius_mm: number,
): number {
  if (totalMass_kg <= 0 || wheelRadius_mm <= 0) return 0;

  const wheelRadius_m = wheelRadius_mm / 1000;
  // Convert stall torque from kg·cm to N·m: multiply by 0.0981 / 100... wait
  // Actually: 1 kg·cm = 0.0981 N·m (since 1 kg·cm = 1 kgf × 0.01 m = 9.81 N × 0.01 m = 0.0981 N·m)
  const stallTorque_Nm = motor.stallTorque_kgcm * 0.0981;
  const motorForce_N = 2 * stallTorque_Nm / wheelRadius_m * 0.5; // 2 motors, 50% derating
  const sinTheta = Math.min(motorForce_N / (totalMass_kg * 9.81), 1.0);

  return Math.asin(sinTheta) * (180 / Math.PI);
}

/**
 * Calculate maximum obstacle step height the robot can roll over.
 *
 * Formula:
 *   wheelClimbLimit_mm = wheelDiameter_mm / 2 × 0.5  (50% of wheel radius)
 *   stepClearance_mm = min(wheelClimbLimit_mm, groundClearance_mm)
 *
 * Assumptions:
 *   - 50% of wheel radius is the geometric step-climb limit (conservative).
 *   - Chassis belly must also clear the step.
 *
 * @returns Maximum step height in mm.
 */
export function calculateStepClearance(
  wheelDiameter_mm: number,
  groundClearance_mm: number,
): number {
  const wheelClimbLimit_mm = (wheelDiameter_mm / 2) * 0.5;
  return Math.min(wheelClimbLimit_mm, groundClearance_mm);
}
