import { useState, useMemo } from 'react';
import { Edges, Html } from '@react-three/drei';
import type { Vec3 } from '../types/chassis';
import type { Dimensions_mm } from '../types/components';

const MM = 0.001;

interface ComponentBlockProps {
  name: string;
  position: Vec3;
  dimensions: Dimensions_mm;
  color: string;
}

export default function ComponentBlock({ name, position, dimensions, color }: ComponentBlockProps) {
  const [hovered, setHovered] = useState(false);

  const { args, pos } = useMemo(() => ({
    args: [
      dimensions.length * MM,
      dimensions.width * MM,
      dimensions.height * MM,
    ] as [number, number, number],
    // Position is center-bottom in mm; Three.js box is centered, so offset z by half height
    // Note: Three.js Y is up in our scene (we use Y-up with X=forward mapped to Z in scene)
    pos: [
      position.x * MM,
      (position.z + dimensions.height / 2) * MM,
      -position.y * MM, // negate Y for right-hand coordinate system
    ] as [number, number, number],
  }), [position, dimensions]);

  return (
    <mesh
      position={pos}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={hovered ? 0.8 : 0.6}
      />
      <Edges color={color} />
      <Html
        position={[0, args[2] / 2 + 0.01, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="text-white text-[10px] whitespace-nowrap bg-black/50 px-1 rounded">
          {name}
        </div>
      </Html>
    </mesh>
  );
}
