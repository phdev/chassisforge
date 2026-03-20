import { useMemo } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../store/useDesignStore';

/** mm to Three.js meters */
const MM = 0.001;

/** Corner radius as a fraction of the shorter frame dimension */
const CORNER_RADIUS_FRACTION = 0.08;
/** Wall thickness as a fraction of frame thickness (for the shell walls) */
const WALL_THICKNESS_FRACTION = 0.6;
/** Curve segments for rounded corners */
const CORNER_SEGMENTS = 8;

/**
 * Create a rounded rectangle THREE.Shape.
 * Origin at center, lying in the XZ plane.
 */
function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const r = Math.min(radius, width / 2, height / 2);
  const hw = width / 2;
  const hh = height / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  return shape;
}

/**
 * Parametric chassis rendered as a molded tray/shell:
 * - Rounded base plate (floor)
 * - Perimeter walls rising to frameHeight
 * - Interior cavity visible for component placement
 *
 * Looks like an injection-molded or CNC-machined robot chassis
 * (Roomba, ROSbot, delivery robot shell aesthetic).
 */
export default function ChassisModel() {
  const params = useDesignStore((s) => s.params);

  const { trayGeometry, lipGeometry, trayPosition } = useMemo(() => {
    const l = params.frameLength_mm * MM;
    const w = params.frameWidth_mm * MM;
    const t = params.frameThickness_mm * MM;
    const wallH = params.frameHeight_mm * MM;
    const wallThickness = t * WALL_THICKNESS_FRACTION;
    const cornerR = Math.min(l, w) * CORNER_RADIUS_FRACTION;

    // Base floor: extruded rounded rectangle
    const outerShape = roundedRectShape(l, w, cornerR);

    const trayGeo = new THREE.ExtrudeGeometry(outerShape, {
      depth: t,
      bevelEnabled: false,
      curveSegments: CORNER_SEGMENTS,
    });
    // Extrude goes along +Z by default. We'll rotate the mesh to make Y=up.

    // Walls: outer shape minus inner shape, extruded to wallH
    const innerShape = roundedRectShape(
      l - 2 * wallThickness,
      w - 2 * wallThickness,
      Math.max(cornerR - wallThickness, 0.001),
    );
    const wallShape = roundedRectShape(l, w, cornerR);
    wallShape.holes.push(innerShape);

    const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
      depth: wallH - t, // walls extend from top of base plate to frameHeight
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.001,
      bevelSegments: 1,
      curveSegments: CORNER_SEGMENTS,
    });

    const gc = params.groundClearance_mm * MM;

    return {
      trayGeometry: trayGeo,
      lipGeometry: wallGeo,
      trayPosition: [0, gc, 0] as [number, number, number],
    };
  }, [params.frameLength_mm, params.frameWidth_mm, params.frameThickness_mm, params.groundClearance_mm, params.frameHeight_mm]);

  const wallOffset = params.frameThickness_mm * MM;

  return (
    <group position={trayPosition}>
      {/* Base floor plate */}
      <mesh
        geometry={trayGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshPhysicalMaterial
          color="#3d7ab5"
          transparent
          opacity={0.55}
          roughness={0.25}
          metalness={0.1}
          clearcoat={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Perimeter walls */}
      <mesh
        geometry={lipGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, wallOffset, 0]}
      >
        <meshPhysicalMaterial
          color="#4a90c9"
          transparent
          opacity={0.4}
          roughness={0.2}
          metalness={0.15}
          clearcoat={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Top lip/rim edge highlight */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, params.frameHeight_mm * MM, 0]}
      >
        <ringGeometry args={[
          Math.min(params.frameLength_mm, params.frameWidth_mm) * MM * 0.48,
          Math.min(params.frameLength_mm, params.frameWidth_mm) * MM * 0.5,
          32,
        ]} />
        <meshBasicMaterial color="#5aade0" transparent opacity={0} />
      </mesh>
    </group>
  );
}
