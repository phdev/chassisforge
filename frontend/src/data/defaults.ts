import type { ChassisParams } from '../types/chassis';
import type { SelectedComponents } from '../types/components';
import { MOTORS, BATTERIES, COMPUTE_BOARDS, WHEELS, SENSORS, MOTOR_DRIVERS } from './components';

/**
 * Default chassis parameters for a differential drive indoor mobile base.
 * Positions are chosen to avoid component interference at startup.
 *
 * Coordinate system: origin at center of frame footprint at ground level.
 * X = forward, Y = left, Z = up.
 * Component positions are center-bottom of the component bounding box.
 */
export const DEFAULT_CHASSIS_PARAMS: ChassisParams = {
  // Frame: a medium-sized indoor base
  frameLength_mm: 300,
  frameWidth_mm: 250,
  frameHeight_mm: 80,
  groundClearance_mm: 40,
  frameThickness_mm: 5,
  frameMaterial: 'pla',

  // Drivetrain
  drivetrainType: 'differential',
  motorMountInset_mm: 10,

  // Battery: centered, sitting on the frame floor
  // Frame floor Z = groundClearance_mm = 40mm
  batteryPosition: { x: 0, y: 0, z: 40 },

  // Compute: offset forward, on top of battery area
  // Battery height = 24mm, so compute at z = 40 + 24 = 64
  computePosition: { x: 60, y: 0, z: 64 },

  // Sensors: RealSense at front, RPLiDAR on top
  sensorMounts: [
    {
      sensorId: 'realsense_d435',
      position: { x: 140, y: 0, z: 80 },
      rotation: { pitch_deg: 0, yaw_deg: 0 },
    },
    {
      sensorId: 'rplidar_a1',
      position: { x: 0, y: 0, z: 120 },
      rotation: { pitch_deg: 0, yaw_deg: 0 },
    },
  ],

  // Payload
  payloadMountHeight_mm: 140,
  maxPayload_kg: 10,
};

/**
 * Default selected components. Uses the first reasonable option from each category.
 * Non-null assertions are safe here because the catalog is hardcoded and non-empty.
 */
export const DEFAULT_SELECTED_COMPONENTS: SelectedComponents = {
  motor: MOTORS.find(m => m.id === 'pololu_37d_150rpm')!,
  battery: BATTERIES.find(b => b.id === 'lipo_3s_2200')!,
  compute: COMPUTE_BOARDS.find(c => c.id === 'rpi5')!,
  wheel: WHEELS.find(w => w.id === 'pololu_90mm')!,
  sensors: SENSORS.filter(s => s.id === 'realsense_d435' || s.id === 'rplidar_a1'),
  motorDriver: MOTOR_DRIVERS.find(d => d.id === 'cytron_mdd10a')!,
};
