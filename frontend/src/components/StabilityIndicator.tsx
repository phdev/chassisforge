import { useMemo } from 'react';
import { useDesignStore } from '../store/useDesignStore';

/**
 * Top-down 2D SVG showing base footprint and CG projection.
 * Adapted for Comni Box (rectangular base footprint, no wheels).
 */
export default function StabilityIndicator() {
  const params = useDesignStore((s) => s.params);
  const scores = useDesignStore((s) => s.scores);

  const { viewBox, scale, dotColor } = useMemo(() => {
    const maxExtent = Math.max(params.boxWidth_mm, params.boxDepth_mm) * 0.7;
    const svgSize = 200;
    const s = svgSize / (2 * maxExtent);
    const color = scores.tippingMargin_pct > 50 ? '#22c55e' :
      scores.tippingMargin_pct > 15 ? '#eab308' : '#ef4444';
    return { viewBox: `0 0 ${svgSize} ${svgSize}`, scale: s, dotColor: color };
  }, [params.boxWidth_mm, params.boxDepth_mm, scores.tippingMargin_pct]);

  const svgSize = 200;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  const halfW = params.boxWidth_mm / 2;
  const halfD = params.boxDepth_mm / 2;

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
        Stability (top view)
      </h3>
      <svg viewBox={viewBox} className="w-full max-w-[200px] mx-auto">
        {/* Base footprint */}
        <rect
          x={cx - halfW * scale}
          y={cy - halfD * scale}
          width={params.boxWidth_mm * scale}
          height={params.boxDepth_mm * scale}
          fill="rgba(34,197,94,0.1)"
          stroke="#22c55e"
          strokeWidth="1"
          rx="3"
        />
        {/* Slot opening */}
        <rect
          x={cx - (params.slotWidth_mm / 2) * scale}
          y={cy - (params.slotDepth_mm / 2) * scale}
          width={params.slotWidth_mm * scale}
          height={params.slotDepth_mm * scale}
          fill="none"
          stroke="#eab308"
          strokeWidth="0.5"
          strokeDasharray="3,2"
          rx="1"
        />
        {/* CG dot */}
        <circle
          cx={cx + scores.cgPosition.x * scale}
          cy={cy - scores.cgPosition.y * scale}
          r={5}
          fill={dotColor}
        />
        {/* Origin crosshair */}
        <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke="#666" strokeWidth="0.5" />
        <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} stroke="#666" strokeWidth="0.5" />
        {/* Forward indicator */}
        <text x={cx} y={8} textAnchor="middle" fill="#666" fontSize="8">FWD (lens)</text>
      </svg>
      <div className="text-center text-[10px] text-gray-500 mt-1">
        CG at ({scores.cgPosition.x.toFixed(1)}, {scores.cgPosition.y.toFixed(1)}, {scores.cgPosition.z.toFixed(1)}) mm
      </div>
    </div>
  );
}
