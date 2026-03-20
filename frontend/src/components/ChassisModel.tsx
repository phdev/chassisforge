import { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { useDesignStore } from '../store/useDesignStore';

/** mm to Three.js meters */
const MM = 0.001;

export default function ChassisModel() {
  const params = useDesignStore((s) => s.params);

  const { args, position } = useMemo(() => {
    const l = params.frameLength_mm * MM;
    const w = params.frameWidth_mm * MM;
    const t = params.frameThickness_mm * MM;
    // Frame plate sits at top of the frame volume
    const z = (params.groundClearance_mm + params.frameHeight_mm - params.frameThickness_mm / 2) * MM;
    return {
      args: [l, w, t] as [number, number, number],
      position: [0, z, 0] as [number, number, number],
    };
  }, [params.frameLength_mm, params.frameWidth_mm, params.frameThickness_mm, params.groundClearance_mm, params.frameHeight_mm]);

  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color="#4488cc"
        transparent
        opacity={0.35}
        roughness={0.3}
        depthWrite={false}
      />
      <Edges color="#2266aa" />
    </mesh>
  );
}
