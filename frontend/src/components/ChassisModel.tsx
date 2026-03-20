import { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { useDesignStore } from '../store/useDesignStore';

/** mm to Three.js meters */
const MM = 0.001;

/** Standoff diameter in mm */
const STANDOFF_DIAMETER_MM = 8;
/** Standoff inset from plate corners in mm */
const STANDOFF_INSET_MM = 15;

/**
 * Parametric chassis frame rendered as a dual-deck structure:
 * - Base plate at groundClearance height (drivetrain/battery mounting surface)
 * - Top plate at groundClearance + frameHeight (compute/sensor/payload mounting)
 * - Four corner standoffs connecting the decks
 *
 * This matches the most common indoor mobile robot chassis construction
 * (e.g. TurtleBot, ROSbot, warehouse bots).
 */
export default function ChassisModel() {
  const params = useDesignStore((s) => s.params);

  const geometry = useMemo(() => {
    const l = params.frameLength_mm * MM;
    const w = params.frameWidth_mm * MM;
    const t = params.frameThickness_mm * MM;
    const gc = params.groundClearance_mm * MM;
    const fh = params.frameHeight_mm * MM;

    // Base plate: bottom face at groundClearance
    const basePlateY = gc + t / 2;

    // Top plate: top face at groundClearance + frameHeight
    const topPlateY = gc + fh - t / 2;

    // Standoff height: gap between the two plates
    const standoffHeight = fh - 2 * params.frameThickness_mm * MM;
    const standoffY = gc + t + standoffHeight / 2; // centered between plates
    const standoffRadius = (STANDOFF_DIAMETER_MM / 2) * MM;

    // Standoff corner positions (inset from plate edges)
    const inset = STANDOFF_INSET_MM * MM;
    const standoffPositions: [number, number, number][] = [
      [l / 2 - inset, standoffY, w / 2 - inset],
      [l / 2 - inset, standoffY, -(w / 2 - inset)],
      [-(l / 2 - inset), standoffY, w / 2 - inset],
      [-(l / 2 - inset), standoffY, -(w / 2 - inset)],
    ];

    return {
      plateArgs: [l, t, w] as [number, number, number],
      basePlatePos: [0, basePlateY, 0] as [number, number, number],
      topPlatePos: [0, topPlateY, 0] as [number, number, number],
      standoffHeight: Math.max(standoffHeight, 0.001),
      standoffRadius,
      standoffPositions,
    };
  }, [params.frameLength_mm, params.frameWidth_mm, params.frameThickness_mm, params.groundClearance_mm, params.frameHeight_mm]);

  const plateMaterial = (
    <meshPhysicalMaterial
      color="#4488cc"
      transparent
      opacity={0.45}
      roughness={0.3}
      depthWrite={false}
    />
  );

  return (
    <group>
      {/* Base plate */}
      <mesh position={geometry.basePlatePos}>
        <boxGeometry args={geometry.plateArgs} />
        {plateMaterial}
        <Edges color="#2266aa" />
      </mesh>

      {/* Top plate */}
      <mesh position={geometry.topPlatePos}>
        <boxGeometry args={geometry.plateArgs} />
        {plateMaterial}
        <Edges color="#2266aa" />
      </mesh>

      {/* Corner standoffs */}
      {geometry.standoffPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[geometry.standoffRadius, geometry.standoffRadius, geometry.standoffHeight, 8]} />
          <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
