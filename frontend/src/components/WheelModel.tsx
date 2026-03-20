import { useMemo } from 'react';

const MM = 0.001;

interface WheelModelProps {
  diameter_mm: number;
  width_mm: number;
  x_mm: number;
  y_mm: number;
  color?: string;
}

export default function WheelModel({ diameter_mm, width_mm, x_mm, y_mm, color = '#404040' }: WheelModelProps) {
  const { radius, height, position } = useMemo(() => ({
    radius: (diameter_mm / 2) * MM,
    height: width_mm * MM,
    // Wheel center at axle height (radius from ground), positioned along Y axis
    position: [
      x_mm * MM,                          // forward/back
      (diameter_mm / 2) * MM,             // up (axle height)
      -y_mm * MM,                         // left/right (negated for scene coords)
    ] as [number, number, number],
  }), [diameter_mm, width_mm, x_mm, y_mm]);

  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius, radius, height, 24]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
