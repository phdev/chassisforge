import { useMemo } from 'react';
import { computeCAEResults, type CAEResults } from '../engine/caeAnalysis';

type Status = 'pass' | 'warn' | 'fail';

const STATUS_STYLES: Record<Status, string> = {
  pass: 'text-green-400',
  warn: 'text-yellow-400',
  fail: 'text-red-400',
};

const STATUS_BG: Record<Status, string> = {
  pass: 'bg-green-900/20 border-green-800/30',
  warn: 'bg-yellow-900/20 border-yellow-800/30',
  fail: 'bg-red-900/20 border-red-800/30',
};

const STATUS_ICON: Record<Status, string> = {
  pass: 'PASS',
  warn: 'WARN',
  fail: 'FAIL',
};

function CAECard({ title, status, children }: {
  title: string;
  status: Status;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded border px-2.5 py-2 mb-1.5 ${STATUS_BG[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-gray-200">{title}</span>
        <span className={`text-[9px] font-mono font-bold ${STATUS_STYLES[status]}`}>
          {STATUS_ICON[status]}
        </span>
      </div>
      <div className="text-[10px] text-gray-400 space-y-0.5">
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string | number; unit: string }) {
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
  const results: CAEResults = useMemo(() => computeCAEResults(), []);

  const overallStatus: Status =
    Object.values(results).some((v) => v === 'fail')
      ? 'fail'
      : Object.values(results).some((v) => v === 'warn')
        ? 'warn'
        : 'pass';

  const passCount = [
    results.actuatorSideLoadStatus,
    results.bucklingStatus,
    results.slotStatus,
    results.servoMountStatus,
    results.thermalStatus,
    results.vibrationStatus,
    results.tippingStatus,
    results.cableFatigueStatus,
  ].filter((s) => s === 'pass').length;

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-white">CAE Analysis</h2>
        <span className={`text-[10px] font-mono ${STATUS_STYLES[overallStatus]}`}>
          {passCount}/8 checks pass
        </span>
      </div>
      <p className="text-[9px] text-gray-500 mb-2">
        Worst case: deployed, 45° tilt, 90° pan
      </p>

      <CAECard title="Actuator Side Load" status={results.actuatorSideLoadStatus}>
        <Metric label="Side load" value={results.actuatorSideLoad_n} unit="N" />
        <Metric label="Bending moment" value={results.actuatorBendingMoment_nmm} unit="N·mm" />
        <Metric label="Margin (vs 40N limit)" value={results.actuatorSideLoadMargin_pct} unit="%" />
      </CAECard>

      <CAECard title="Column Buckling (Euler)" status={results.bucklingStatus}>
        <Metric label="Critical load" value={results.eulerCriticalLoad_n} unit="N" />
        <Metric label="Applied load" value={(0.35 * 9.81).toFixed(1)} unit="N" />
        <Metric label="Buckling margin" value={results.bucklingMargin_pct} unit="%" />
      </CAECard>

      <CAECard title="Top Panel Slot Stress" status={results.slotStatus}>
        <Metric label="Area removed" value={results.slotAreaRemoved_pct} unit="%" />
        <Metric label="Stress concentration" value={`${results.stressConcentrationFactor.toFixed(1)}×`} unit="" />
        <Metric label="Corner stress" value={results.slotCornerStress_mpa} unit="MPa" />
        <Metric label="Yield strength" value="30" unit="MPa" />
      </CAECard>

      <CAECard title="Servo Mount Reaction" status={results.servoMountStatus}>
        <Metric label="Pan torque" value={results.panReactionTorque_nmm} unit="N·mm" />
        <Metric label="Tilt torque" value={results.tiltReactionTorque_nmm} unit="N·mm" />
        <Metric label="Mount stress" value={results.mountStress_mpa} unit="MPa" />
      </CAECard>

      <CAECard title="Thermal (30 min projection)" status={results.thermalStatus}>
        <Metric label="Head temp (Luma 20W)" value={results.headSteadyStateTemp_c} unit="°C" />
        <Metric label="Base temp (Pi 5 8W)" value={results.baseSteadyStateTemp_c} unit="°C" />
        <Metric label="Ambient" value="25" unit="°C" />
      </CAECard>

      <CAECard title="Vibration / Resonance" status={results.vibrationStatus}>
        <Metric label="Natural frequency" value={results.naturalFrequency_hz} unit="Hz" />
        <Metric label="Servo update rate" value={results.servoStepRate_hz} unit="Hz" />
        <Metric label="Separation margin" value={results.resonanceMargin_pct} unit="%" />
      </CAECard>

      <CAECard title="Base Stability / Tipping" status={results.tippingStatus}>
        <Metric label="Tipping moment" value={(results.tippingMoment_nmm / 1000).toFixed(1)} unit="N·m" />
        <Metric label="Resisting moment" value={(results.resistingMoment_nmm / 1000).toFixed(1)} unit="N·m" />
        <Metric label="Margin" value={results.tippingMargin_pct} unit="%" />
        <Metric label="Min base weight" value={(results.minBaseWeight_kg * 1000).toFixed(0)} unit="g" />
      </CAECard>

      <CAECard title="Cable Fatigue (pan joint)" status={results.cableFatigueStatus}>
        <Metric label="Bend radius" value={results.cableBendRadius_mm} unit="mm" />
        <Metric label="Est. life" value={`${(results.estimatedCableLifeCycles / 1000).toFixed(0)}k`} unit="cycles" />
        <Metric label="Target" value="10k" unit="cycles" />
      </CAECard>
    </div>
  );
}
