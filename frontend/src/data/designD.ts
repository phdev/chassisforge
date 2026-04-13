/**
 * Design D: 5"x5"x5" popup box with deployable head.
 *
 * Physical dimensions (inches → mm):
 *   Box outer: 5" = 127mm square
 *   Base height: 3" = 76.2mm
 *   Head height: 2" = 50.8mm
 *   Rise: 2" = 50.8mm (via L12-50 linear actuator)
 *   Wall thickness: ~5mm
 *
 * Deployment sequence (0→1):
 *   0.0–0.5: head rises from base by 50.8mm
 *   0.5–1.0: head tilts forward 0→45°
 */

export interface BOMItem {
  name: string;
  price_usd: number;
  category: 'compute' | 'display' | 'sensor' | 'actuator' | 'electronics' | 'power' | 'wiring';
  /** Bounding box in mm (length × width × height). Null for cables/connectors. */
  dimensions_mm: { length: number; width: number; height: number } | null;
  /** Where this component lives in the box */
  location: 'base' | 'head' | 'external';
}

export const DESIGN_D_BOM: readonly BOMItem[] = [
  {
    name: 'Raspberry Pi 5 (8GB)',
    price_usd: 200,
    category: 'compute',
    dimensions_mm: { length: 85, width: 56, height: 17 },
    location: 'base',
  },
  {
    name: 'Kodak Luma 350',
    price_usd: 200,
    category: 'display',
    dimensions_mm: { length: 112, width: 112, height: 22 },
    location: 'head',
  },
  {
    name: 'Pi Camera 3 Wide',
    price_usd: 35,
    category: 'sensor',
    dimensions_mm: { length: 25, width: 24, height: 12 },
    location: 'head',
  },
  {
    name: 'ReSpeaker XVF3800',
    price_usd: 50,
    category: 'sensor',
    dimensions_mm: { length: 46, width: 46, height: 3 },
    location: 'base',
  },
  {
    name: 'Actuonix L12-50-50-6-R (lift)',
    price_usd: 50,
    category: 'actuator',
    dimensions_mm: { length: 13, width: 13, height: 88 },
    location: 'base',
  },
  {
    name: 'LX-16A serial servo (pan)',
    price_usd: 20,
    category: 'actuator',
    dimensions_mm: { length: 22, width: 22, height: 18 },
    location: 'base',
  },
  {
    name: 'MG996R servo (tilt)',
    price_usd: 10,
    category: 'actuator',
    dimensions_mm: { length: 40, width: 19, height: 43 },
    location: 'head',
  },
  {
    name: 'LX-16A TTL debug board',
    price_usd: 8,
    category: 'electronics',
    dimensions_mm: { length: 30, width: 20, height: 5 },
    location: 'base',
  },
  {
    name: 'PCA9685 servo driver',
    price_usd: 6,
    category: 'electronics',
    dimensions_mm: { length: 63, width: 25, height: 10 },
    location: 'base',
  },
  {
    name: 'SparkFun VL53L5CX ToF',
    price_usd: 25,
    category: 'sensor',
    dimensions_mm: { length: 14, width: 14, height: 7 },
    location: 'head',
  },
  {
    name: 'Qwiic cable 100mm',
    price_usd: 2,
    category: 'wiring',
    dimensions_mm: null,
    location: 'base',
  },
  {
    name: '12V 5A power supply',
    price_usd: 12,
    category: 'power',
    dimensions_mm: { length: 60, width: 35, height: 20 },
    location: 'external',
  },
  {
    name: '5V USB-C buck converter',
    price_usd: 5,
    category: 'power',
    dimensions_mm: { length: 30, width: 15, height: 10 },
    location: 'base',
  },
  {
    name: '6V 3A BEC',
    price_usd: 5,
    category: 'power',
    dimensions_mm: { length: 30, width: 15, height: 10 },
    location: 'base',
  },
  {
    name: 'Wago 221 lever connectors',
    price_usd: 5,
    category: 'wiring',
    dimensions_mm: null,
    location: 'base',
  },
  {
    name: 'Jumper wires',
    price_usd: 5,
    category: 'wiring',
    dimensions_mm: null,
    location: 'base',
  },
] as const;

export const DESIGN_D_BOM_TOTAL = DESIGN_D_BOM.reduce((sum, item) => sum + item.price_usd, 0);

/** Design D physical constants in mm */
export const DESIGN_D = {
  boxWidth_mm: 127,       // 5"
  boxDepth_mm: 127,       // 5"
  baseHeight_mm: 76,      // 3" (rounded from 76.2)
  headHeight_mm: 51,      // 2" (rounded from 50.8)
  riseMax_mm: 51,         // 2" actuator travel
  wallThickness_mm: 5,
  cornerRadius_mm: 9,     // ~10px at 28px/inch
  tiltMax_deg: 45,        // max head tilt angle
} as const;
