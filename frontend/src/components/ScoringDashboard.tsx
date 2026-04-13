import { useDesignStore } from '../store/useDesignStore';

function ScoreCard({ label, value, unit, status }: {
  label: string; value: string | number; unit: string; status?: 'good' | 'warn' | 'bad';
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

function fosStatus(fos: number): 'good' | 'warn' | 'bad' {
  if (fos >= 2.0) return 'good';
  if (fos >= 1.2) return 'warn';
  return 'bad';
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

  return (
    <div className="p-3 overflow-y-auto">
      <h2 className="text-sm font-bold text-white mb-3">Device Scores</h2>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <ScoreCard label="Total Mass" value={scores.totalMass_kg} unit="kg" />
        <ScoreCard label="Power Draw" value={scores.totalPowerDraw_w} unit="W" />
        <ScoreCard label="Tipping FoS" value={scores.tippingFoS} unit="x" status={fosStatus(scores.tippingFoS)} />
        <ScoreCard label="Tip Angle" value={scores.minTipAngle_deg} unit="°" status={scores.minTipAngle_deg > 30 ? 'good' : 'warn'} />
        <ScoreCard label="Rod Deflection" value={scores.rodDeflection_mm} unit="mm"
          status={scores.rodDeflection_mm < 0.5 ? 'good' : scores.rodDeflection_mm < 1.5 ? 'warn' : 'bad'} />
        <ScoreCard label="Proj. Shift @500mm" value={scores.projectionShift_mm} unit="mm"
          status={scores.projectionShift_mm < 5 ? 'good' : scores.projectionShift_mm < 15 ? 'warn' : 'bad'} />
        <ScoreCard label="Head Temp" value={scores.headSteadyStateTemp_c} unit="°C" status={fosStatus(scores.thermalFoS)} />
        <ScoreCard label="Thermal FoS" value={scores.thermalFoS} unit="x" status={fosStatus(scores.thermalFoS)} />
        <ScoreCard label="Actuator FoS" value={scores.actuatorSideLoadFoS} unit="x" status={fosStatus(scores.actuatorSideLoadFoS)} />
        <ScoreCard label="Buckling FoS" value={scores.bucklingFoS} unit="x" status={fosStatus(scores.bucklingFoS)} />
        <ScoreCard label="Slot FoS" value={scores.slotFoS} unit="x" status={fosStatus(scores.slotFoS)} />
        <ScoreCard label="Bearing FoS" value={scores.bearingFoS} unit="x" status={fosStatus(scores.bearingFoS)} />
        <ScoreCard label="Wall Deflection" value={scores.wallDeflection_mm} unit="mm"
          status={scores.wallDeflection_mm < 0.3 ? 'good' : scores.wallDeflection_mm < 1.0 ? 'warn' : 'bad'} />
        <ScoreCard label="Wall FoS" value={scores.wallFoS} unit="x" status={fosStatus(scores.wallFoS)} />
        <ScoreCard label="Nat. Frequency" value={scores.naturalFrequency_hz} unit="Hz" />
        <ScoreCard label="Cable Life" value={`${(scores.cableLifeCycles / 1000).toFixed(0)}k`} unit="cyc"
          status={scores.cableLifeCycles > 20000 ? 'good' : scores.cableLifeCycles > 5000 ? 'warn' : 'bad'} />
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <Badge pass={scores.allComponentsFit} label="Components fit" />
        <Badge pass={scores.headSteadyStateTemp_c < scores.materialMaxServiceTemp_c} label={`Head < ${scores.materialMaxServiceTemp_c}°C Tg`} />
      </div>

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
