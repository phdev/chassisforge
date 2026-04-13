import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDesignStore } from '../store/useDesignStore';
import { DESIGN_D } from '../data/designD';

const MM = 0.001;
const D = DESIGN_D;

/** Component color scheme */
const COLORS = {
  base: '#2a3a5a',
  baseEdge: '#4a6a9a',
  head: '#3a4a6a',
  headEdge: '#5a8aba',
  headActive: '#3388ff',
  pi: '#22c55e',
  luma: '#3388ff',
  camera: '#4aba4a',
  xvf: '#c44a4a',
  actuator: '#8a8a9a',
  servo: '#4a7aaa',
  tof: '#8a5aaa',
  pca: '#eab308',
  rod: '#aaaacc',
  power: '#ff8c00',
  electronics: '#eab308',
} as const;

/**
 * Rounded box geometry helper.
 * Creates an extruded rounded rectangle lying in the XZ plane.
 */
function roundedBoxShape(w_mm: number, d_mm: number, r_mm: number): THREE.Shape {
  const r = Math.min(r_mm, w_mm / 2, d_mm / 2) * MM;
  const hw = (w_mm / 2) * MM;
  const hd = (d_mm / 2) * MM;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return shape;
}

/** A labeled component bounding box positioned within the Design D model */
function DDBlock({ name, dims, position, color }: {
  name: string;
  dims: { length: number; width: number; height: number };
  position: [number, number, number];
  color: string;
}) {
  const args: [number, number, number] = [
    dims.length * MM,
    dims.height * MM,
    dims.width * MM,
  ];
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} transparent opacity={0.6} />
      <Edges color={color} />
      <Html position={[0, args[1] / 2 + 0.005, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="text-white text-[8px] whitespace-nowrap bg-black/60 px-1 rounded">
          {name}
        </div>
      </Html>
    </mesh>
  );
}

/**
 * Design D: 5"×5"×5" popup box with deployable head.
 *
 * Deployment phases (progress 0→1):
 *   0.0–0.5: head rises 51mm above base
 *   0.5–1.0: head tilts forward 0→45°
 */
export default function DesignDModel() {
  const deployTarget = useDesignStore((s) => s.deployTarget);
  const headGroupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  // Smooth animation via useFrame
  useFrame(() => {
    progressRef.current += (deployTarget - progressRef.current) * 0.05;
    if (Math.abs(progressRef.current - deployTarget) < 0.001) {
      progressRef.current = deployTarget;
    }

    const p = progressRef.current;
    const riseT = Math.min(p * 2, 1);           // 0→1 during first half
    const tiltT = Math.max((p - 0.5) * 2, 0);   // 0→1 during second half

    const rise_m = riseT * D.riseMax_mm * MM;
    const tilt_rad = tiltT * D.tiltMax_deg * (Math.PI / 180);

    if (headGroupRef.current) {
      headGroupRef.current.position.y = D.baseHeight_mm * MM + rise_m;
      // Tilt around the back edge of the head (pivot at rear-bottom)
      headGroupRef.current.rotation.z = tilt_rad;
    }
  });

  // Geometry for base shell (floor + walls)
  const { baseFloorGeo, baseWallGeo, headFloorGeo, headWallGeo } = useMemo(() => {
    const outerShape = roundedBoxShape(D.boxWidth_mm, D.boxDepth_mm, D.cornerRadius_mm);
    const innerR = Math.max(D.cornerRadius_mm - D.wallThickness_mm, 1);
    const innerShape = roundedBoxShape(
      D.boxWidth_mm - D.wallThickness_mm * 2,
      D.boxDepth_mm - D.wallThickness_mm * 2,
      innerR,
    );
    const wallShape = roundedBoxShape(D.boxWidth_mm, D.boxDepth_mm, D.cornerRadius_mm);
    wallShape.holes.push(innerShape);

    const bFloor = new THREE.ExtrudeGeometry(outerShape, {
      depth: D.wallThickness_mm * MM,
      bevelEnabled: false,
      curveSegments: 8,
    });
    const bWall = new THREE.ExtrudeGeometry(wallShape, {
      depth: (D.baseHeight_mm - D.wallThickness_mm) * MM,
      bevelEnabled: false,
      curveSegments: 8,
    });
    const hFloor = new THREE.ExtrudeGeometry(outerShape, {
      depth: D.wallThickness_mm * MM,
      bevelEnabled: false,
      curveSegments: 8,
    });
    const hWall = new THREE.ExtrudeGeometry(wallShape, {
      depth: (D.headHeight_mm - D.wallThickness_mm) * MM,
      bevelEnabled: false,
      curveSegments: 8,
    });
    return { baseFloorGeo: bFloor, baseWallGeo: bWall, headFloorGeo: hFloor, headWallGeo: hWall };
  }, []);

  // Component positions in local coords (Y-up in Three.js)
  // Base interior: Y range [wallThickness, baseHeight]
  const baseFloor_y = D.wallThickness_mm * MM;
  const headFloor_y = D.wallThickness_mm * MM;

  return (
    <group>
      {/* ===== BASE BOX ===== */}
      <group>
        {/* Base floor plate */}
        <mesh geometry={baseFloorGeo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshPhysicalMaterial
            color={COLORS.base}
            transparent opacity={0.55}
            roughness={0.3} metalness={0.1}
            depthWrite={false}
          />
        </mesh>
        {/* Base walls */}
        <mesh geometry={baseWallGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, D.wallThickness_mm * MM, 0]}>
          <meshPhysicalMaterial
            color={COLORS.base}
            transparent opacity={0.35}
            roughness={0.2} metalness={0.15}
            depthWrite={false}
          />
        </mesh>

        {/* --- Base components --- */}
        {/* Raspberry Pi 5 */}
        <DDBlock
          name="Pi 5"
          dims={{ length: 85, width: 56, height: 17 }}
          position={[0.015, baseFloor_y + 0.0085, 0.01]}
          color={COLORS.pi}
        />
        {/* XVF3800 mic array (top of base, flat) */}
        <DDBlock
          name="XVF3800"
          dims={{ length: 46, width: 46, height: 3 }}
          position={[0, (D.baseHeight_mm - 3) * MM, 0]}
          color={COLORS.xvf}
        />
        {/* L12-50 actuator (vertical, center) */}
        <DDBlock
          name="L12-50"
          dims={{ length: 13, width: 13, height: 88 }}
          position={[0, baseFloor_y + 0.044, 0]}
          color={COLORS.actuator}
        />
        {/* Pan servo */}
        <DDBlock
          name="Pan Servo"
          dims={{ length: 22, width: 22, height: 18 }}
          position={[0, (D.baseHeight_mm - D.wallThickness_mm - 12) * MM, 0]}
          color={COLORS.servo}
        />
        {/* PCA9685 servo driver */}
        <DDBlock
          name="PCA9685"
          dims={{ length: 63, width: 25, height: 10 }}
          position={[-0.02, baseFloor_y + 0.022, -0.025]}
          color={COLORS.pca}
        />
        {/* Buck converter */}
        <DDBlock
          name="5V Buck"
          dims={{ length: 30, width: 15, height: 10 }}
          position={[0.035, baseFloor_y + 0.005, -0.04]}
          color={COLORS.power}
        />
        {/* 6V BEC */}
        <DDBlock
          name="6V BEC"
          dims={{ length: 30, width: 15, height: 10 }}
          position={[0.035, baseFloor_y + 0.005, 0.04]}
          color={COLORS.power}
        />
        {/* TTL debug board */}
        <DDBlock
          name="TTL Board"
          dims={{ length: 30, width: 20, height: 5 }}
          position={[-0.04, baseFloor_y + 0.0025, 0.04]}
          color={COLORS.electronics}
        />
      </group>

      {/* ===== ACTUATOR ROD (connects base to head) ===== */}
      <mesh position={[0, D.baseHeight_mm * MM, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.005, 8]} />
        <meshStandardMaterial color={COLORS.rod} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ===== HEAD BOX (deployable) ===== */}
      {/* Pivot is at rear-bottom of head. We translate the pivot point to the back edge. */}
      <group
        ref={headGroupRef}
        position={[0, D.baseHeight_mm * MM, 0]}
      >
        {/* Head floor plate */}
        <mesh geometry={headFloorGeo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshPhysicalMaterial
            color={COLORS.head}
            transparent opacity={0.55}
            roughness={0.3} metalness={0.1}
            depthWrite={false}
          />
        </mesh>
        {/* Head walls */}
        <mesh geometry={headWallGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, D.wallThickness_mm * MM, 0]}>
          <meshPhysicalMaterial
            color={COLORS.head}
            transparent opacity={0.35}
            roughness={0.2} metalness={0.15}
            depthWrite={false}
          />
        </mesh>

        {/* --- Head components --- */}
        {/* Kodak Luma 350 projector (centered, main component) */}
        <DDBlock
          name="Luma 350"
          dims={{ length: 112, width: 112, height: 22 }}
          position={[0, headFloor_y + 0.011, 0]}
          color={COLORS.luma}
        />
        {/* Luma lens indicator */}
        <mesh position={[-D.boxWidth_mm / 2 * MM - 0.001, headFloor_y + 0.011, 0]}>
          <sphereGeometry args={[0.006, 16, 16]} />
          <meshStandardMaterial color="#3388ff" emissive="#3388ff" emissiveIntensity={0.5} />
        </mesh>
        {/* Pi Camera 3 Wide (next to Luma lens, front-left) */}
        <DDBlock
          name="Pi Cam"
          dims={{ length: 25, width: 24, height: 12 }}
          position={[-D.boxWidth_mm / 2 * MM + 0.018, headFloor_y + 0.028, -0.015]}
          color={COLORS.camera}
        />
        {/* VL53L5CX ToF sensor (below camera on front face) */}
        <DDBlock
          name="ToF"
          dims={{ length: 14, width: 14, height: 7 }}
          position={[-D.boxWidth_mm / 2 * MM + 0.012, headFloor_y + 0.028, 0.015]}
          color={COLORS.tof}
        />
        {/* MG996R tilt servo (rear of head) */}
        <DDBlock
          name="Tilt Servo"
          dims={{ length: 40, width: 19, height: 43 }}
          position={[D.boxWidth_mm / 2 * MM - 0.025, headFloor_y + 0.015, 0]}
          color={COLORS.servo}
        />
      </group>
    </group>
  );
}
