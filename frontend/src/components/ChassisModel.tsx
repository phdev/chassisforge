import { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { useDesignStore } from '../store/useDesignStore';

/** mm to Three.js meters */
const MM = 0.001;

/**
 * Parametric chassis frame rendered as:
 * - A solid base plate at groundClearance height (where components mount)
 * - A translucent wireframe box showing the full frame volume envelope
 */
export default function ChassisModel() {
  const params = useDesignStore((s) => s.params);

  const plate = useMemo(() => {
    const l = params.frameLength_mm * MM;
    const w = params.frameWidth_mm * MM;
    const t = params.frameThickness_mm * MM;
    // Base plate bottom face at groundClearance, centered on thickness
    const y = (params.groundClearance_mm + params.frameThickness_mm / 2) * MM;
    return { args: [l, w, t] as [number, number, number], position: [0, y, 0] as [number, number, number] };
  }, [params.frameLength_mm, params.frameWidth_mm, params.frameThickness_mm, params.groundClearance_mm]);

  const envelope = useMemo(() => {
    const l = params.frameLength_mm * MM;
    const w = params.frameWidth_mm * MM;
    const h = params.frameHeight_mm * MM;
    // Envelope from groundClearance to groundClearance + frameHeight
    const y = (params.groundClearance_mm + params.frameHeight_mm / 2) * MM;
    return { args: [l, w, h] as [number, number, number], position: [0, y, 0] as [number, number, number] };
  }, [params.frameLength_mm, params.frameWidth_mm, params.frameHeight_mm, params.groundClearance_mm]);

  return (
    <group>
      {/* Solid base plate */}
      <mesh position={plate.position}>
        <boxGeometry args={plate.args} />
        <meshPhysicalMaterial
          color="#4488cc"
          transparent
          opacity={0.5}
          roughness={0.3}
          depthWrite={false}
        />
        <Edges color="#2266aa" />
      </mesh>

      {/* Frame volume envelope (wireframe only) */}
      <mesh position={envelope.position}>
        <boxGeometry args={envelope.args} />
        <meshBasicMaterial
          color="#4488cc"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
        <Edges color="#2266aa" linewidth={1} />
      </mesh>
    </group>
  );
}
