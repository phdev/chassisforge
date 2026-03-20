import type { Motor, Battery, ComputeBoard, Sensor, MotorDriver } from '../types/components';

export interface PowerBreakdown {
  motorPowerDraw_w: number;
  electronicsPowerDraw_w: number;
  totalPowerDraw_w: number;
  breakdown: Record<string, number>; // component name → watts
}

/**
 * Calculate total power draw across all systems.
 *
 * Formula:
 *   motorPower_w = numMotors × motor.nominalPower_w
 *   electronicsPower_w = compute.powerDraw_w + Σ(sensor.powerDraw_w) + driver.quiescentPower_w
 *   totalPower_w = motorPower + electronicsPower
 *
 * @param numMotors Number of drive motors (2 for differential drive).
 */
export function calculatePowerBudget(
  motor: Motor,
  compute: ComputeBoard,
  sensors: readonly Sensor[],
  motorDriver: MotorDriver,
  numMotors: number = 2,
): PowerBreakdown {
  const motorPowerDraw_w = numMotors * motor.nominalPower_w;
  const sensorPower_w = sensors.reduce((sum, s) => sum + s.powerDraw_w, 0);
  const electronicsPowerDraw_w = compute.powerDraw_w + sensorPower_w + motorDriver.quiescentPower_w;

  const breakdown: Record<string, number> = {
    'Motors': motorPowerDraw_w,
    'Compute': compute.powerDraw_w,
    'Motor Driver': motorDriver.quiescentPower_w,
  };
  for (const sensor of sensors) {
    breakdown[sensor.name] = sensor.powerDraw_w;
  }

  return {
    motorPowerDraw_w,
    electronicsPowerDraw_w,
    totalPowerDraw_w: motorPowerDraw_w + electronicsPowerDraw_w,
    breakdown,
  };
}

/**
 * Estimate runtime from battery capacity and total power draw.
 *
 * Formula:
 *   usable_wh = battery.energy_wh × 0.80  (80% depth of discharge)
 *   effectivePower_w = motorPower_w × 0.50 + electronicsPower_w
 *   runtime_hrs = usable_wh / effectivePower_w
 *
 * Assumptions:
 *   - 80% depth of discharge (don't drain below 20% for battery health).
 *   - Motors at 50% average load (not constant stall, not constant free-running).
 *   - Electronics power is constant.
 *   - No efficiency losses in motor driver (Phase 1 simplification).
 *
 * @returns Estimated runtime in hours.
 */
export function calculateRuntime(
  battery: Battery,
  motorPowerDraw_w: number,
  electronicsPowerDraw_w: number,
): number {
  const usable_wh = battery.energy_wh * 0.80;
  const effectivePower_w = motorPowerDraw_w * 0.50 + electronicsPowerDraw_w;

  if (effectivePower_w <= 0) return Infinity;

  return usable_wh / effectivePower_w;
}
