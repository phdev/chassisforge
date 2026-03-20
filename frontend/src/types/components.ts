/** Dimensions in mm for component bounding box. */
export interface Dimensions_mm {
  length: number;
  width: number;
  height: number;
}

/** DC gear motor specification. All specs from datasheets. */
export interface Motor {
  id: string;
  name: string;
  type: 'dc_gear' | 'brushless' | 'stepper';
  voltage_v: number;
  stallTorque_kgcm: number;
  noLoadRPM: number;
  stallCurrent_a: number;
  nominalPower_w: number;
  mass_kg: number;
  dimensions_mm: Dimensions_mm;
  shaftDiameter_mm: number;
  hasEncoder: boolean;
  encoderCPR: number | null;
  price_usd: number;
  vendor: string;
}

/** Battery pack specification. */
export interface Battery {
  id: string;
  name: string;
  chemistry: 'lipo' | 'liion' | 'lifepo4' | 'nimh';
  voltage_v: number;
  capacity_mah: number;
  energy_wh: number;
  maxDischarge_c: number;
  mass_kg: number;
  dimensions_mm: Dimensions_mm;
  price_usd: number;
  vendor: string;
}

/** Single-board computer or microcontroller. */
export interface ComputeBoard {
  id: string;
  name: string;
  type: 'sbc' | 'mcu' | 'gpu_module';
  powerDraw_w: number;
  mass_kg: number;
  dimensions_mm: Dimensions_mm;
  price_usd: number;
  vendor: string;
}

/** Wheel specification. */
export interface Wheel {
  id: string;
  name: string;
  type: 'rubber' | 'mecanum' | 'omni' | 'pneumatic';
  diameter_mm: number;
  width_mm: number;
  mass_kg: number;
  loadRating_kg: number;
  price_usd: number;
  vendor: string;
}

/** Sensor specification. */
export interface Sensor {
  id: string;
  name: string;
  type: 'depth_camera' | 'lidar_2d' | 'lidar_3d' | 'imu' | 'ultrasonic' | 'ir_tof';
  fovH_deg: number | null;
  fovV_deg: number | null;
  rangeMin_m: number | null;
  rangeMax_m: number | null;
  powerDraw_w: number;
  mass_kg: number;
  dimensions_mm: Dimensions_mm;
  price_usd: number;
  vendor: string;
}

/** Motor driver / H-bridge specification. */
export interface MotorDriver {
  id: string;
  name: string;
  channels: number;
  maxVoltage_v: number;
  maxCurrent_a: number;
  quiescentPower_w: number;
  mass_kg: number;
  dimensions_mm: Dimensions_mm;
  price_usd: number;
  vendor: string;
}

/** Currently selected components for a design. */
export interface SelectedComponents {
  motor: Motor;
  battery: Battery;
  compute: ComputeBoard;
  wheel: Wheel;
  sensors: Sensor[];
  motorDriver: MotorDriver;
}

/** Full component catalog. */
export interface ComponentCatalog {
  motors: readonly Motor[];
  batteries: readonly Battery[];
  computeBoards: readonly ComputeBoard[];
  wheels: readonly Wheel[];
  sensors: readonly Sensor[];
  motorDrivers: readonly MotorDriver[];
}
