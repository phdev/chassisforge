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
      {pass ? '\u2713' : '\u2717'} {label}
    </span>
  );
}

export default function ScoringDashboard() {
  const scores = useDesignStore((s) => s.scores);

  const tippingStatus = scores.tippingMargin_pct > 50 ? 'good' as const :
    scores.tippingMargin_pct > 15 ? 'warn' as const : 'bad' as const;

  const thermalStatus = scores.headSteadyStateTemp_c < 55 ? 'good' as const :
    scores.headSteadyStateTemp_c < 70 ? 'warn' as const : 'bad' as const;

  const bucklingStatus = scores.bucklingMargin_pct > 80 ? 'good' as const :
    scores.bucklingMargin_pct > 50 ? 'warn' as const : 'bad' as const;

  const actuatorStatus = scores.actuatorSideLoadMargin_pct > 30 ? 'good' as const :
    scores.actuatorSideLoadMargin_pct > 10 ? 'warn' as const : 'bad' as const;

  return (
    <div className="p-3 overflow-y-auto">
      <h2 className="text-sm font-bold text-white mb-3">Device Scores</h2>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <ScoreCard label="Total Mass" value={scores.totalMass_kg} unit="kg" />
        <ScoreCard label="Power Draw" value={scores.totalPowerDraw_w} unit="W" />
        <ScoreCard label="Tip Stability" value={scores.tippingMargin_pct} unit="%" status={tippingStatus} />
        <ScoreCard label="Min Tip Angle" value={scores.minTipAngle_deg} unit="°" status={scores.minTipAngle_deg > 30 ? 'good' : 'warn'} />
        <ScoreCard label="Head Temp" value={scores.headSteadyStateTemp_c} unit="°C" status={thermalStatus} />
        <ScoreCard label="Base Temp" value={scores.baseSteadyStateTemp_c} unit="°C"
          status={scores.baseSteadyStateTemp_c < 45 ? 'good' : 'warn'} />
        <ScoreCard label="Actuator Margin" value={scores.actuatorSideLoadMargin_pct} unit="%" status={actuatorStatus} />
        <ScoreCard label="Buckling Margin" value={scores.bucklingMargin_pct} unit="%" status={bucklingStatus} />
        <ScoreCard label="Slot Stress" value={scores.slotCornerStress_mpa} unit="MPa" />
        <ScoreCard label="Nat. Frequency" value={scores.naturalFrequency_hz} unit="Hz" />
        <ScoreCard label="Cable Life" value={`${(scores.cableLifeCycles / 1000).toFixed(0)}k`} unit="cycles"
          status={scores.cableLifeCycles > 20000 ? 'good' : scores.cableLifeCycles > 5000 ? 'warn' : 'bad'} />
        <ScoreCard label="Electronics" value={scores.electronicsPowerDraw_w} unit="W" />
      </div>

      {/* Component Fit */}
      <div className="mb-3">
        <Badge pass={scores.allComponentsFit} label="All components fit in enclosure" />
      </div>

      {/* Interference Warnings */}
      {scores.interferenceWarnings.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Warnings</h3>
          <ul className="text-[10px] text-red-300 space-y-0.5">
            {scores.interferenceWarnings.map((w, i) => (
              <li key={i} className="bg-red-900/20 rounded px-1.5 py-0.5">{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
