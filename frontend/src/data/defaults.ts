import type { ChassisParams } from '../types/chassis';
import type { SelectedComponents } from '../types/components';
import { MOTORS, BATTERIES, COMPUTE_BOARDS, WHEELS, SENSORS, MOTOR_DRIVERS } from './components';

/**
 * Default chassis parameters for Design D — 5"×5"×5" popup box.
 *
 * Design D is a stationary companion device with a deployable head containing
 * a Kodak Luma 350 projector, Pi Camera, and VL53L5CX ToF sensor.
 * The base houses a Raspberry Pi 5, pan servo, linear actuator, and electronics.
 *
 * Coordinate system: origin at center of frame footprint at ground level.
 * X = forward, Y = left, Z = up.
 * Component positions are center-bottom of the component bounding box.
 *
 * Physical dimensions: 127mm × 127mm × 127mm (retracted), 178mm tall (deployed).
 */
export const DEFAULT_CHASSIS_PARAMS: ChassisParams = {
  // Frame: Design D box dimensions (5" = 127mm)
  frameLength_mm: 127,
  frameWidth_mm: 127,
  frameHeight_mm: 127,
  groundClearance_mm: 5,
  frameThickness_mm: 5,
  frameMaterial: 'pla',

  // Drivetrain: stationary device, but keep differential as the type
  drivetrainType: 'differential',
  motorMountInset_mm: 10,

  // Battery position (12V supply is external, but we still need a battery for scoring)
  batteryPosition: { x: 0, y: 0, z: 5 },

  // Compute: Pi 5 in base section
  computePosition: { x: 15, y: 10, z: 10 },

  // Sensors: Pi Camera and VL53L5CX ToF in head
  sensorMounts: [
    {
      sensorId: 'pi_camera_3_wide',
      position: { x: -55, y: -15, z: 100 },
      rotation: { pitch_deg: 0, yaw_deg: 0 },
    },
    {
      sensorId: 'vl53l5cx_tof',
      position: { x: -55, y: 15, z: 100 },
      rotation: { pitch_deg: 0, yaw_deg: 0 },
    },
  ],

  // Payload
  payloadMountHeight_mm: 130,
  maxPayload_kg: 2,
};

/**
 * Default selected components for Design D.
 * Uses small motor/wheel/battery for scoring compatibility even though
 * Design D is a stationary device. The BOM panel shows the actual parts list.
 * Non-null assertions are safe here because the catalog is hardcoded and non-empty.
 */
export const DEFAULT_SELECTED_COMPONENTS: SelectedComponents = {
  motor: MOTORS.find(m => m.id === 'n20_micro_100rpm')!,
  battery: BATTERIES.find(b => b.id === 'lipo_3s_2200')!,
  compute: COMPUTE_BOARDS.find(c => c.id === 'rpi5')!,
  wheel: WHEELS.find(w => w.id === 'pololu_60mm')!,
  sensors: SENSORS.filter(s => s.id === 'pi_camera_3_wide' || s.id === 'vl53l5cx_tof'),
  motorDriver: MOTOR_DRIVERS.find(d => d.id === 'tb6612fng')!,
};
