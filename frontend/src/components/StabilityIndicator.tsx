import { useMemo } from 'react';
import { useDesignStore } from '../store/useDesignStore';
import { buildSupportPolygon } from '../engine/stabilityAnalysis';

/**
 * Top-down 2D SVG showing wheel contact polygon and CG projection dot.
 * Green dot = stable (>50%), Yellow = marginal (15-50%), Red = unstable (<15%).
 */
export default function StabilityIndicator() {
  const params = useDesignStore((s) => s.params);
  const components = useDesignStore((s) => s.components);
  const scores = useDesignStore((s) => s.scores);

  const { polygon, cgDot, scale, viewBox, dotColor } = useMemo(() => {
    const poly = buildSupportPolygon(
      params.frameLength_mm,
      params.frameWidth_mm,
      components.wheel.width_mm,
      params.motorMountInset_mm,
    );

    // Find bounds for SVG viewBox
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    const maxExtent = Math.max(
      Math.abs(Math.min(...xs)),
      Math.abs(Math.max(...xs)),
      Math.abs(Math.min(...ys)),
      Math.abs(Math.max(...ys)),
    ) * 1.3;

    const svgSize = 200;
    const s = svgSize / (2 * maxExtent);

    const color = scores.stabilityMargin_pct > 50 ? '#22c55e' :
      scores.stabilityMargin_pct > 15 ? '#eab308' : '#ef4444';

    return {
      polygon: poly,
      cgDot: { x: scores.cgPosition.x, y: scores.cgPosition.y },
      scale: s,
      viewBox: `0 0 ${svgSize} ${svgSize}`,
      dotColor: color,
    };
  }, [params, components.wheel, scores.cgPosition, scores.stabilityMargin_pct]);

  const svgSize = 200;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  // Convert to SVG coords: x→right, y→up (negate y for SVG which has y-down)
  const polyPoints = polygon
    .map((p) => `${cx + p.x * scale},${cy - p.y * scale}`)
    .join(' ');

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
        Stability (top view)
      </h3>
      <svg viewBox={viewBox} className="w-full max-w-[200px] mx-auto">
        {/* Support polygon */}
        <polygon
          points={polyPoints}
          fill="rgba(34,197,94,0.1)"
          stroke="#22c55e"
          strokeWidth="1"
        />
        {/* Frame outline */}
        <rect
          x={cx - params.frameLength_mm / 2 * scale}
          y={cy - params.frameWidth_mm / 2 * scale}
          width={params.frameLength_mm * scale}
          height={params.frameWidth_mm * scale}
          fill="none"
          stroke="#4488cc"
          strokeWidth="0.5"
          strokeDasharray="3,2"
        />
        {/* CG dot */}
        <circle
          cx={cx + cgDot.x * scale}
          cy={cy - cgDot.y * scale}
          r={5}
          fill={dotColor}
        />
        {/* Origin crosshair */}
        <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke="#666" strokeWidth="0.5" />
        <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} stroke="#666" strokeWidth="0.5" />
        {/* Forward arrow indicator */}
        <text x={cx} y={8} textAnchor="middle" fill="#666" fontSize="8">FWD</text>
      </svg>
      <div className="text-center text-[10px] text-gray-500 mt-1">
        CG at ({scores.cgPosition.x.toFixed(1)}, {scores.cgPosition.y.toFixed(1)}) mm
      </div>
    </div>
  );
}
