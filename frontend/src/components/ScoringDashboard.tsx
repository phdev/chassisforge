import { useDesignStore } from '../store/useDesignStore';

function ScoreCard({ label, value, unit, status }: {
  label: string;
  value: string | number;
  unit: string;
  status?: 'good' | 'warn' | 'bad';
}) {
  const statusColor = status === 'good' ? 'text-green-400' :
    status === 'warn' ? 'text-yellow-400' :
    status === 'bad' ? 'text-red-400' : 'text-gray-200';

  return (
    <div className="bg-gray-800/50 rounded px-2 py-1.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-mono font-semibold ${statusColor}`}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span className="text-[10px] text-gray-500 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function Badge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${pass ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
      {pass ? '✓' : '✗'} {label}
    </span>
  );
}

export default function ScoringDashboard() {
  const scores = useDesignStore((s) => s.scores);

  const stabilityStatus = scores.stabilityMargin_pct > 50 ? 'good' :
    scores.stabilityMargin_pct > 15 ? 'warn' : 'bad';

  const runtimeStatus = scores.estimatedRuntime_hrs > 2 ? 'good' :
    scores.estimatedRuntime_hrs > 1 ? 'warn' : 'bad';

  return (
    <div className="p-3 overflow-y-auto h-full">
      <h2 className="text-sm font-bold text-white mb-3">Scores</h2>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <ScoreCard label="Stability" value={scores.stabilityMargin_pct} unit="%" status={stabilityStatus} />
        <ScoreCard label="Tip Angle" value={scores.tipAngle_deg} unit="°" status={scores.tipAngle_deg > 30 ? 'good' : 'warn'} />
        <ScoreCard label="Max Speed" value={scores.maxSpeed_mps} unit="m/s" />
        <ScoreCard label="Turn Radius" value={scores.turningRadius_mm === 0 ? 'Pivot' : scores.turningRadius_mm.toFixed(0)} unit={scores.turningRadius_mm === 0 ? '' : 'mm'} />
        <ScoreCard label="Runtime" value={scores.estimatedRuntime_hrs} unit="hrs" status={runtimeStatus} />
        <ScoreCard label="Power Draw" value={scores.totalPowerDraw_w} unit="W" />
        <ScoreCard label="Total Mass" value={scores.totalMass_kg} unit="kg" />
        <ScoreCard label="Payload Cap." value={scores.payloadCapacity_kg} unit="kg" />
        <ScoreCard label="Gradeability" value={scores.maxGradeability_deg} unit="°" />
        <ScoreCard label="Step Clear." value={scores.stepClearance_mm} unit="mm" />
      </div>

      {/* Doorway Fit */}
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Doorway Fit</h3>
      <div className="flex gap-2 mb-3">
        <Badge pass={scores.doorwayFit.standard_762mm} label='30" (762mm)' />
        <Badge pass={scores.doorwayFit.wide_914mm} label='36" (914mm)' />
      </div>

      {/* Component Fit */}
      <div className="mb-3">
        <Badge pass={scores.allComponentsFit} label="All components fit" />
      </div>

      {/* Interference Warnings */}
      {scores.interferenceWarnings.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Warnings</h3>
          <ul className="text-[10px] text-red-300 space-y-0.5">
            {scores.interferenceWarnings.map((w, i) => (
              <li key={i} className="bg-red-900/20 rounded px-1.5 py-0.5">⚠ {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
