import type { ChassisParams, ComponentKey, Vec3 } from '../types/chassis';

/**
 * Default Comni Box Design D component positions.
 * Physics coords: origin at center of base footprint at table level.
 * X = forward (lens side), Y = left, Z = up. All mm, center-bottom.
 *
 * Base interior: Z from wallThickness to baseHeight.
 * Head interior: Z from baseHeight to baseHeight + headHeight.
 */
const DEFAULT_POSITIONS: Record<ComponentKey, Vec3> = {
  // ── Base components ──
  pi5:           { x: 15, y: 10, z: 5 },
  xvf3800:       { x: 0, y: 0, z: 73 },       // flush on top panel
  actuator:      { x: 0, y: 0, z: 5 },         // vertical, center
  panServo:      { x: 0, y: 0, z: 55 },        // top of base
  pca9685:       { x: -20, y: -25, z: 5 },
  buckConverter: { x: 35, y: -40, z: 5 },
  bec:           { x: 35, y: 40, z: 5 },
  ttlBoard:      { x: -40, y: 40, z: 5 },

  // ── Head components ──
  luma350:       { x: 0, y: 0, z: 81 },        // centered in head
  piCamera:      { x: -50, y: -15, z: 95 },    // front-left of head
  tiltServo:     { x: 40, y: 0, z: 81 },       // rear of head
  tofSensor:     { x: -50, y: 15, z: 95 },     // front-right of head
};

/**
 * Default Comni Box parameters for Design D.
 * 5"×5"×5" retracted (127mm cube), 2" rise, ±45° tilt.
 */
export const DEFAULT_CHASSIS_PARAMS: ChassisParams = {
  boxWidth_mm: 127,
  boxDepth_mm: 127,
  baseHeight_mm: 76,
  headHeight_mm: 51,
  wallThickness_mm: 3,
  frameMaterial: 'pla',

  basePlateWeight_kg: 0.80,
  filletRadius_mm: 3,
  slotWidth_mm: 76,
  slotDepth_mm: 76,
  riseMax_mm: 51,

  componentPositions: { ...DEFAULT_POSITIONS },
};
