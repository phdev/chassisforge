import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import { useDesignStore } from '../store/useDesignStore';
import ChassisModel from './ChassisModel';
import ComponentBlock from './ComponentBlock';
import WheelModel from './WheelModel';

const MM = 0.001;

/** Color scheme per component type */
const COLORS = {
  motor: '#ff8c00',
  battery: '#22c55e',
  compute: '#8b5cf6',
  sensor: '#06b6d4',
  motorDriver: '#eab308',
  cg: '#ef4444',
} as const;

function CGMarker() {
  const cg = useDesignStore((s) => s.scores.cgPosition);
  const margin = useDesignStore((s) => s.scores.stabilityMargin_pct);

  const dotColor = margin > 50 ? '#22c55e' : margin > 15 ? '#eab308' : '#ef4444';
  const pos: [number, number, number] = [cg.x * MM, cg.z * MM, -cg.y * MM];
  const groundPos: [number, number, number] = [cg.x * MM, 0.001, -cg.y * MM];

  return (
    <group>
      {/* CG sphere */}
      <mesh position={pos}>
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshStandardMaterial color={COLORS.cg} />
      </mesh>
      {/* Dashed line to ground */}
      <Line
        points={[pos, groundPos]}
        color={COLORS.cg}
        lineWidth={1}
        dashed
        dashSize={0.01}
        gapSize={0.005}
      />
      {/* Ground projection dot */}
      <mesh position={groundPos} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.006, 16]} />
        <meshBasicMaterial color={dotColor} />
      </mesh>
    </group>
  );
}

function SceneContent() {
  const params = useDesignStore((s) => s.params);
  const components = useDesignStore((s) => s.components);
  const { wheel, motor, motorDriver } = components;

  // Drive wheels: at sides of frame
  const wheelY = params.frameWidth_mm / 2 + wheel.width_mm / 2;

  // Motor positions (shown as blocks at frame edge)
  const motorY = params.frameWidth_mm / 2 - params.motorMountInset_mm;
  const motorZ = params.groundClearance_mm + wheel.diameter_mm / 2 - motor.dimensions_mm.height / 2;

  // Motor driver position
  const driverPos = {
    x: -params.frameLength_mm / 4,
    y: 0,
    z: params.groundClearance_mm + params.frameHeight_mm,
  };

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

      {/* Chassis frame */}
      <ChassisModel />

      {/* Battery */}
      <ComponentBlock
        name="Battery"
        position={params.batteryPosition}
        dimensions={components.battery.dimensions_mm}
        color={COLORS.battery}
      />

      {/* Compute */}
      <ComponentBlock
        name={components.compute.name}
        position={params.computePosition}
        dimensions={components.compute.dimensions_mm}
        color={COLORS.compute}
      />

      {/* Motors (×2) */}
      <ComponentBlock
        name="Motor L"
        position={{ x: 0, y: motorY, z: motorZ }}
        dimensions={motor.dimensions_mm}
        color={COLORS.motor}
      />
      <ComponentBlock
        name="Motor R"
        position={{ x: 0, y: -motorY, z: motorZ }}
        dimensions={motor.dimensions_mm}
        color={COLORS.motor}
      />

      {/* Motor Driver */}
      <ComponentBlock
        name={motorDriver.name}
        position={driverPos}
        dimensions={motorDriver.dimensions_mm}
        color={COLORS.motorDriver}
      />

      {/* Sensors */}
      {params.sensorMounts.map((mount) => {
        const sensor = components.sensors.find((s) => s.id === mount.sensorId);
        if (!sensor) return null;
        return (
          <ComponentBlock
            key={mount.sensorId}
            name={sensor.name}
            position={mount.position}
            dimensions={sensor.dimensions_mm}
            color={COLORS.sensor}
          />
        );
      })}

      {/* Drive wheels */}
      <WheelModel diameter_mm={wheel.diameter_mm} width_mm={wheel.width_mm} x_mm={0} y_mm={wheelY} />
      <WheelModel diameter_mm={wheel.diameter_mm} width_mm={wheel.width_mm} x_mm={0} y_mm={-wheelY} />

      {/* Casters (simplified as small spheres) */}
      {[1, -1].map((sign) => (
        <mesh key={sign} position={[sign * (params.frameLength_mm / 2 - 20) * MM, 0.012, 0]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshStandardMaterial color="#808080" />
        </mesh>
      ))}

      {/* CG Marker */}
      <CGMarker />

      {/* Camera controls */}
      <OrbitControls
        minDistance={0.2}
        maxDistance={3.0}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enableDamping
        target={[0, 0.05, 0]}
      />
    </>
  );
}

export default function Viewport() {
  return (
    <Canvas
      camera={{ position: [0.4, 0.3, 0.4], near: 0.01, far: 100 }}
      className="bg-gray-950"
    >
      <SceneContent />
    </Canvas>
  );
}
