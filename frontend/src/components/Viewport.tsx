import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import { useDesignStore } from '../store/useDesignStore';
import DesignDModel from './DesignDModel';

const MM = 0.001;

const CG_COLOR = '#ef4444';

function CGMarker() {
  const cg = useDesignStore((s) => s.scores.cgPosition);
  const margin = useDesignStore((s) => s.scores.tippingMargin_pct);

  const dotColor = margin > 50 ? '#22c55e' : margin > 15 ? '#eab308' : '#ef4444';
  const pos: [number, number, number] = [cg.x * MM, cg.z * MM, -cg.y * MM];
  const groundPos: [number, number, number] = [cg.x * MM, 0.001, -cg.y * MM];

  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshStandardMaterial color={CG_COLOR} />
      </mesh>
      <Line
        points={[pos, groundPos]}
        color={CG_COLOR}
        lineWidth={1}
        dashed
        dashSize={0.01}
        gapSize={0.005}
      />
      <mesh position={groundPos} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.006, 16]} />
        <meshBasicMaterial color={dotColor} />
      </mesh>
    </group>
  );
}

function SceneContent() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />

      {/* Ground grid */}
      <Grid
        args={[2, 2]}
        cellSize={0.05}
        cellThickness={0.5}
        cellColor="#444444"
        sectionSize={0.1}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={3}
        position={[0, 0, 0]}
        infiniteGrid
      />

      {/* Design D popup box model */}
      <DesignDModel />

      {/* CG Marker */}
      <CGMarker />

      {/* Camera controls — centered on Design D box height */}
      <OrbitControls
        minDistance={0.15}
        maxDistance={3.0}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enableDamping
        target={[0, 0.065, 0]}
      />
    </>
  );
}

export default function Viewport() {
  return (
    <Canvas
      camera={{ position: [0.3, 0.25, 0.3], near: 0.01, far: 100 }}
      className="bg-gray-950"
    >
      <SceneContent />
    </Canvas>
  );
}
