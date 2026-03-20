import type { ChassisParams, SimulationScores, Vec3 } from '../types/chassis';
import { MATERIAL_DENSITY_KG_PER_MM3 } from '../types/chassis';
import type { SelectedComponents } from '../types/components';
import { calculateCG, type MassItem } from './cgCalculator';
import { buildSupportPolygon, calculateStabilityMargin, calculateTipAngle, calculatePayloadCapacity } from './stabilityAnalysis';
import { calculateMaxSpeed, calculateTurningRadius, calculateGradeability, calculateStepClearance } from './mobilityCalcs';
import { calculatePowerBudget, calculateRuntime } from './powerBudget';
import { checkInterference, checkDoorwayFit, makeAABB, type NamedAABB } from './interferenceCheck';

/** Caster ball estimated mass in kg. */
const CASTER_MASS_KG = 0.030;

/**
 * Compute all simulation scores from chassis parameters and selected components.
 *
 * This is the single entry point called by the Zustand store on every parameter change.
 * Must complete in <16ms for 60fps slider responsiveness.
 */
export function computeAllScores(
  params: ChassisParams,
  components: SelectedComponents,
): SimulationScores {
  const { motor, battery, compute, wheel, sensors, motorDriver } = components;

  // --- Mass Budget ---
  const frameMass_kg =
    params.frameLength_mm *
    params.frameWidth_mm *
    params.frameThickness_mm *
    MATERIAL_DENSITY_KG_PER_MM3[params.frameMaterial];

  const motorsMass_kg = 2 * motor.mass_kg;
  const wheelsMass_kg = 2 * wheel.mass_kg; // 2 drive wheels
  const castersMass_kg = 2 * CASTER_MASS_KG;
  const sensorsMass_kg = sensors.reduce((sum, s) => sum + s.mass_kg, 0);

  const massBudget: Record<string, number> = {
    'Frame': frameMass_kg,
    'Motors': motorsMass_kg,
    'Battery': battery.mass_kg,
    'Compute': compute.mass_kg,
    'Sensors': sensorsMass_kg,
    'Wheels': wheelsMass_kg,
    'Casters': castersMass_kg,
    'Motor Driver': motorDriver.mass_kg,
  };

  const totalMass_kg = Object.values(massBudget).reduce((sum, v) => sum + v, 0);

  // --- Center of Gravity ---
  // Frame center: at geometric center of frame, z = groundClearance + frameHeight/2
  const frameCenter_z = params.groundClearance_mm + params.frameHeight_mm / 2;

  // Motor positions: at frame edges along Y, centered on X, at frame floor height
  const motorZ = params.groundClearance_mm + wheel.diameter_mm / 2; // motor at axle height
  const motorY = params.frameWidth_mm / 2 - params.motorMountInset_mm;

  // Wheel positions: drive wheels at sides, axle height
  const wheelZ = wheel.diameter_mm / 2;
  const wheelY = params.frameWidth_mm / 2 + wheel.width_mm / 2;

  // Caster positions: front and rear of frame
  const casterX = params.frameLength_mm / 2 - 20;
  const casterZ = 15; // approximate caster center height

  // Motor driver: on top of frame near center-rear
  const driverPosition: Vec3 = {
    x: -params.frameLength_mm / 4,
    y: 0,
    z: params.groundClearance_mm + params.frameHeight_mm,
  };

  const massItems: MassItem[] = [
    { mass_kg: frameMass_kg, position: { x: 0, y: 0, z: frameCenter_z } },
    { mass_kg: motor.mass_kg, position: { x: 0, y: motorY, z: motorZ } },
    { mass_kg: motor.mass_kg, position: { x: 0, y: -motorY, z: motorZ } },
    { mass_kg: battery.mass_kg, position: {
      x: params.batteryPosition.x,
      y: params.batteryPosition.y,
      z: params.batteryPosition.z + battery.dimensions_mm.height / 2,
    }},
    { mass_kg: compute.mass_kg, position: {
      x: params.computePosition.x,
      y: params.computePosition.y,
      z: params.computePosition.z + compute.dimensions_mm.height / 2,
    }},
    { mass_kg: wheel.mass_kg, position: { x: 0, y: wheelY, z: wheelZ } },
    { mass_kg: wheel.mass_kg, position: { x: 0, y: -wheelY, z: wheelZ } },
    { mass_kg: CASTER_MASS_KG, position: { x: casterX, y: 0, z: casterZ } },
    { mass_kg: CASTER_MASS_KG, position: { x: -casterX, y: 0, z: casterZ } },
    { mass_kg: motorDriver.mass_kg, position: {
      x: driverPosition.x,
      y: driverPosition.y,
      z: driverPosition.z + motorDriver.dimensions_mm.height / 2,
    }},
  ];

  // Add sensors
  for (const mount of params.sensorMounts) {
    const sensor = sensors.find(s => s.id === mount.sensorId);
    if (sensor) {
      massItems.push({
        mass_kg: sensor.mass_kg,
        position: {
          x: mount.position.x,
          y: mount.position.y,
          z: mount.position.z + sensor.dimensions_mm.height / 2,
        },
      });
    }
  }

  const cgPosition = calculateCG(massItems);

  // --- Stability ---
  const supportPolygon = buildSupportPolygon(
    params.frameLength_mm,
    params.frameWidth_mm,
    wheel.width_mm,
    params.motorMountInset_mm,
  );

  const stabilityMargin_pct = calculateStabilityMargin(
    { x: cgPosition.x, y: cgPosition.y },
    supportPolygon,
  );

  const tipAngle_deg = calculateTipAngle(cgPosition, supportPolygon);

  // --- Mobility ---
  const trackWidth_mm = params.frameWidth_mm + wheel.width_mm;
  const maxSpeed_mps = calculateMaxSpeed(motor, wheel);
  const turningRadius_mm = calculateTurningRadius(
    params.drivetrainType,
    trackWidth_mm,
    params.frameLength_mm,
  );
  const maxGradeability_deg = calculateGradeability(
    motor,
    totalMass_kg,
    wheel.diameter_mm / 2,
  );
  const stepClearance_mm = calculateStepClearance(
    wheel.diameter_mm,
    params.groundClearance_mm,
  );

  // --- Power ---
  const powerBudget = calculatePowerBudget(motor, compute, sensors, motorDriver);
  const estimatedRuntime_hrs = calculateRuntime(
    battery,
    powerBudget.motorPowerDraw_w,
    powerBudget.electronicsPowerDraw_w,
  );

  // --- Interference ---
  const namedAABBs: NamedAABB[] = [
    { name: 'Battery', aabb: makeAABB(params.batteryPosition, battery.dimensions_mm) },
    { name: 'Compute', aabb: makeAABB(params.computePosition, compute.dimensions_mm) },
    { name: 'Motor Driver', aabb: makeAABB(driverPosition, motorDriver.dimensions_mm) },
  ];
  for (const mount of params.sensorMounts) {
    const sensor = sensors.find(s => s.id === mount.sensorId);
    if (sensor) {
      namedAABBs.push({
        name: sensor.name,
        aabb: makeAABB(mount.position, sensor.dimensions_mm),
      });
    }
  }

  const interferenceWarnings = checkInterference(namedAABBs);
  const doorwayFit = checkDoorwayFit(params.frameWidth_mm, wheel.width_mm);

  // Check if components fit within frame
  const chassisAABB = makeAABB(
    { x: 0, y: 0, z: params.groundClearance_mm },
    { length: params.frameLength_mm, width: params.frameWidth_mm, height: params.frameHeight_mm },
  );
  // For fit check, we only check internal components (not sensors mounted externally)
  const internalAABBs = namedAABBs.filter(
    a => a.name === 'Battery' || a.name === 'Compute' || a.name === 'Motor Driver'
  );
  const allComponentsFit = interferenceWarnings.length === 0 &&
    internalAABBs.every(comp =>
      comp.aabb.min.x >= chassisAABB.min.x &&
      comp.aabb.max.x <= chassisAABB.max.x &&
      comp.aabb.min.y >= chassisAABB.min.y &&
      comp.aabb.max.y <= chassisAABB.max.y
    );

  // --- Payload Capacity ---
  const payloadCapacity_kg = calculatePayloadCapacity(
    cgPosition,
    totalMass_kg,
    params.payloadMountHeight_mm,
    supportPolygon,
    params.maxPayload_kg,
  );

  return {
    cgPosition,
    stabilityMargin_pct,
    tipAngle_deg,
    turningRadius_mm,
    maxSpeed_mps,
    maxGradeability_deg,
    stepClearance_mm,
    estimatedRuntime_hrs,
    totalPowerDraw_w: powerBudget.totalPowerDraw_w,
    motorPowerDraw_w: powerBudget.motorPowerDraw_w,
    electronicsPowerDraw_w: powerBudget.electronicsPowerDraw_w,
    totalMass_kg,
    massBudget,
    payloadCapacity_kg,
    allComponentsFit,
    interferenceWarnings,
    doorwayFit,
  };
}
