import { useDesignStore } from '../store/useDesignStore';
import { computeCAEResults, type CAEResults } from '../engine/caeAnalysis';
import { MATERIAL_YIELD_MPA, MATERIAL_MAX_SERVICE_TEMP_C } from '../types/chassis';

type Status = 'pass' | 'warn' | 'fail';

const STATUS_BG: Record<Status, string> = {
  pass: 'bg-green-900/20 border-green-800/30',
  warn: 'bg-yellow-900/20 border-yellow-800/30',
  fail: 'bg-red-900/20 border-red-800/30',
};
const STATUS_CLR: Record<Status, string> = {
  pass: 'text-green-400', warn: 'text-yellow-400', fail: 'text-red-400',
};

function CAECard({ title, status, fos, children }: {
  title: string; status: Status; fos?: number; children: React.ReactNode;
}) {
  return (
    <div className={`rounded border px-2.5 py-2 mb-1.5 ${STATUS_BG[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-gray-200">{title}</span>
        <div className="flex items-center gap-2">
          {fos !== undefined && (
            <span className={`text-[9px] font-mono ${STATUS_CLR[status]}`}>
              FoS {fos.toFixed(1)}
            </span>
          )}
          <span className={`text-[9px] font-mono font-bold ${STATUS_CLR[status]}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="text-[10px] text-gray-400 space-y-0.5">{children}</div>
    </div>
  );
}

function M({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-mono text-gray-300">
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span className="text-gray-500 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

export default function CAEDashboard() {
  const params = useDesignStore((s) => s.params);
  const r: CAEResults = computeCAEResults(params);
  const yld = MATERIAL_YIELD_MPA[params.frameMaterial];
  const tg = MATERIAL_MAX_SERVICE_TEMP_C[params.frameMaterial];

  const statuses: Status[] = [
    r.actuatorSideLoadStatus, r.bucklingStatus, r.rodDeflectionStatus,
    r.slotStatus, r.servoMountStatus, r.wallDeflectionStatus,
    r.thermalStatus, r.vibrationStatus, r.tippingStatus, r.cableFatigueStatus,
  ];
  const passCount = statuses.filter(s => s === 'pass').length;
  const overall: Status = statuses.some(s => s === 'fail') ? 'fail' :
    statuses.some(s => s === 'warn') ? 'warn' : 'pass';

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-white">CAE Analysis</h2>
        <span className={`text-[10px] font-mono ${STATUS_CLR[overall]}`}>
          {passCount}/{statuses.length} pass
        </span>
      </div>
      <p className="text-[9px] text-gray-500 mb-2">
        {params.frameMaterial.toUpperCase()} · {yld} MPa yield · Tg {tg}°C · worst case: 45° tilt, 90° pan
      </p>

      <CAECard title="Actuator Side Load" status={r.actuatorSideLoadStatus} fos={r.actuatorSideLoadFoS}>
        <M label="Side load" value={r.actuatorSideLoad_n} unit="N" />
        <M label="Bending moment" value={r.actuatorBendingMoment_nmm} unit="N·mm" />
        <M label="Rated limit" value={40} unit="N" />
      </CAECard>

      <CAECard title="Column Buckling" status={r.bucklingStatus} fos={r.bucklingFoS}>
        <M label="Euler critical load" value={r.eulerCriticalLoad_n} unit="N" />
        <M label="Applied load" value={HEAD.mass_kg * 9.81} unit="N" />
      </CAECard>

      <CAECard title="Rod Deflection (Projector Alignment)" status={r.rodDeflectionStatus}>
        <M label="Rod tip deflection" value={r.rodDeflection_mm} unit="mm" />
        <M label="Projection shift @500mm" value={r.projectionShift_mm} unit="mm" />
        <div className="text-[9px] text-gray-500 mt-0.5">
          {r.projectionShift_mm < 5 ? 'Acceptable alignment' :
           r.projectionShift_mm < 15 ? 'Noticeable shift — stiffen rod or reduce rise' :
           'Severe misalignment — need guide rail or thicker rod'}
        </div>
      </CAECard>

      <CAECard title="Slot Corner Stress" status={r.slotStatus} fos={r.slotFoS}>
        <M label="Area removed" value={r.slotAreaRemoved_pct} unit="%" />
        <M label="Stress conc. factor" value={`${r.stressConcentrationFactor.toFixed(1)}x`} unit="" />
        <M label="Corner stress" value={r.slotCornerStress_mpa} unit="MPa" />
        <M label="Material yield" value={yld} unit="MPa" />
      </CAECard>

      <CAECard title="Servo Mount Bearing Stress" status={r.servoMountStatus} fos={r.bearingFoS}>
        <M label="Pan reaction torque" value={r.panReactionTorque_nmm} unit="N·mm" />
        <M label="Tilt reaction torque" value={r.tiltReactionTorque_nmm} unit="N·mm" />
        <M label="Bearing stress (M3 holes)" value={r.bearingStress_mpa} unit="MPa" />
        <M label="Allowable (60% yield)" value={yld * 0.6} unit="MPa" />
        <div className="text-[9px] text-gray-500 mt-0.5">
          {r.bearingFoS < 1.5 ? 'Risk of screws pulling through print — add brass inserts' : ''}
        </div>
      </CAECard>

      <CAECard title="Enclosure Wall Deflection" status={r.wallDeflectionStatus} fos={r.wallFoS}>
        <M label="Wall deflection" value={r.wallDeflection_mm} unit="mm" />
        <M label="Wall bending stress" value={r.wallStress_mpa} unit="MPa" />
        <div className="text-[9px] text-gray-500 mt-0.5">
          {r.wallDeflection_mm > 0.5 ? 'Wall flex during pan reversal — add ribs or increase thickness' : 'Stiff enough for stable projection'}
        </div>
      </CAECard>

      <CAECard title="Thermal + Material Softening" status={r.thermalStatus} fos={r.thermalFoS}>
        <M label="Head temp (Luma 20W)" value={r.headSteadyStateTemp_c} unit="°C" />
        <M label="Base temp (Pi 5 8W)" value={r.baseSteadyStateTemp_c} unit="°C" />
        <M label="Material Tg / max service" value={tg} unit="°C" />
        <div className={`text-[9px] mt-0.5 ${r.headSteadyStateTemp_c > tg ? 'text-red-400 font-semibold' : 'text-gray-500'}`}>
          {r.headSteadyStateTemp_c > tg
            ? `HEAD EXCEEDS Tg — ${params.frameMaterial.toUpperCase()} will soften and deform. Add vents or switch material.`
            : r.thermalFoS < 1.5
              ? 'Close to thermal limit — consider ventilation holes'
              : 'Safe thermal margin'}
        </div>
      </CAECard>

      <CAECard title="Vibration / Resonance" status={r.vibrationStatus}>
        <M label="Natural frequency" value={r.naturalFrequency_hz} unit="Hz" />
        <M label="Servo update rate" value={r.servoStepRate_hz} unit="Hz" />
        <M label="Separation" value={r.resonanceMargin_pct} unit="%" />
      </CAECard>

      <CAECard title="Base Stability / Tipping" status={r.tippingStatus} fos={r.tippingFoS}>
        <M label="Tipping moment" value={(r.tippingMoment_nmm / 1000)} unit="N·m" />
        <M label="Resisting moment" value={(r.resistingMoment_nmm / 1000)} unit="N·m" />
        <M label="Min base weight needed" value={(r.minBaseWeight_kg * 1000)} unit="g" />
      </CAECard>

      <CAECard title="Cable Fatigue (Pan Joint)" status={r.cableFatigueStatus}>
        <M label="Bend radius" value={r.cableBendRadius_mm} unit="mm" />
        <M label="Estimated life" value={`${(r.estimatedCableLifeCycles / 1000).toFixed(0)}k`} unit="cycles" />
        <M label="Target" value="10k" unit="cycles" />
      </CAECard>
    </div>
  );
}

// Re-export HEAD for use in JSX
const HEAD = { mass_kg: 0.350 };
