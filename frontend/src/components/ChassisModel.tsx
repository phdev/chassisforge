import { useMemo } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../store/useDesignStore';

const MM = 0.001;
const CORNER_SEGMENTS = 8;

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
 * Parametric box shell for the Comni Box enclosure.
 * Uses boxWidth_mm, boxDepth_mm, baseHeight_mm + headHeight_mm, wallThickness_mm.
 */
export default function ChassisModel() {
  const params = useDesignStore((s) => s.params);

  const { trayGeometry, lipGeometry } = useMemo(() => {
    const l = params.boxWidth_mm * MM;
    const w = params.boxDepth_mm * MM;
    const t = params.wallThickness_mm * MM;
    const wallH = (params.baseHeight_mm + params.headHeight_mm) * MM;
    const wallThickness = t * 0.6;
    const cornerR = Math.min(l, w) * 0.08;

    const outerShape = roundedRectShape(l, w, cornerR);
    const trayGeo = new THREE.ExtrudeGeometry(outerShape, {
      depth: t, bevelEnabled: false, curveSegments: CORNER_SEGMENTS,
    });

    const innerShape = roundedRectShape(l - 2 * wallThickness, w - 2 * wallThickness, Math.max(cornerR - wallThickness, 0.001));
    const wallShape = roundedRectShape(l, w, cornerR);
    wallShape.holes.push(innerShape);
    const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
      depth: wallH - t, bevelEnabled: false, curveSegments: CORNER_SEGMENTS,
    });

    return { trayGeometry: trayGeo, lipGeometry: wallGeo };
  }, [params.boxWidth_mm, params.boxDepth_mm, params.wallThickness_mm, params.baseHeight_mm, params.headHeight_mm]);

  const wallOffset = params.wallThickness_mm * MM;

  return (
    <group>
      <mesh geometry={trayGeometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshPhysicalMaterial color="#3d7ab5" transparent opacity={0.55} roughness={0.25} metalness={0.1} depthWrite={false} />
      </mesh>
      <mesh geometry={lipGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, wallOffset, 0]}>
        <meshPhysicalMaterial color="#4a90c9" transparent opacity={0.4} roughness={0.2} metalness={0.15} depthWrite={false} />
      </mesh>
    </group>
  );
}
