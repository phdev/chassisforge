import { useDesignStore } from '../store/useDesignStore';
import type { ChassisParams, FrameMaterial } from '../types/chassis';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-400 mb-0.5">
        <span>{label}</span>
        <span className="font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue-500 cursor-pointer"
      />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mt-4 mb-2 border-b border-gray-700 pb-1">{title}</h3>;
}

const MATERIALS: { value: FrameMaterial; label: string }[] = [
  { value: 'pla', label: 'PLA' },
  { value: 'petg', label: 'PETG' },
  { value: 'aluminum_6061', label: 'Aluminum 6061' },
  { value: 'steel', label: 'Steel' },
  { value: 'carbon_fiber', label: 'Carbon Fiber' },
];

export default function SliderPanel() {
  const params = useDesignStore((s) => s.params);
  const setParam = useDesignStore((s) => s.setParam);

  const set = <K extends keyof ChassisParams>(key: K) => (value: ChassisParams[K]) => setParam(key, value);

  return (
    <div className="p-3 overflow-y-auto h-full">
      <h2 className="text-sm font-bold text-white mb-3">Chassis Parameters</h2>

      <SectionHeader title="Frame Dimensions" />
      <SliderRow label="Length" value={params.frameLength_mm} min={150} max={800} step={5} unit="mm" onChange={set('frameLength_mm')} />
      <SliderRow label="Width" value={params.frameWidth_mm} min={100} max={600} step={5} unit="mm" onChange={set('frameWidth_mm')} />
      <SliderRow label="Height" value={params.frameHeight_mm} min={30} max={200} step={5} unit="mm" onChange={set('frameHeight_mm')} />
      <SliderRow label="Thickness" value={params.frameThickness_mm} min={2} max={10} step={0.5} unit="mm" onChange={set('frameThickness_mm')} />
      <SliderRow label="Ground Clearance" value={params.groundClearance_mm} min={10} max={150} step={5} unit="mm" onChange={set('groundClearance_mm')} />

      <div className="mb-2 mt-2">
        <label className="text-xs text-gray-400">Material</label>
        <select
          value={params.frameMaterial}
          onChange={(e) => setParam('frameMaterial', e.target.value as FrameMaterial)}
          className="w-full mt-1 bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1.5"
        >
          {MATERIALS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <SectionHeader title="Drivetrain" />
      <SliderRow label="Motor Inset" value={params.motorMountInset_mm} min={0} max={50} step={5} unit="mm" onChange={set('motorMountInset_mm')} />

      <SectionHeader title="Battery Position" />
      <SliderRow label="X (fwd)" value={params.batteryPosition.x} min={-200} max={200} step={5} unit="mm"
        onChange={(v) => setParam('batteryPosition', { ...params.batteryPosition, x: v })} />
      <SliderRow label="Y (left)" value={params.batteryPosition.y} min={-200} max={200} step={5} unit="mm"
        onChange={(v) => setParam('batteryPosition', { ...params.batteryPosition, y: v })} />

      <SectionHeader title="Compute Position" />
      <SliderRow label="X (fwd)" value={params.computePosition.x} min={-200} max={200} step={5} unit="mm"
        onChange={(v) => setParam('computePosition', { ...params.computePosition, x: v })} />
      <SliderRow label="Y (left)" value={params.computePosition.y} min={-200} max={200} step={5} unit="mm"
        onChange={(v) => setParam('computePosition', { ...params.computePosition, y: v })} />

      <SectionHeader title="Payload" />
      <SliderRow label="Mount Height" value={params.payloadMountHeight_mm} min={50} max={300} step={5} unit="mm" onChange={set('payloadMountHeight_mm')} />
      <SliderRow label="Max Payload" value={params.maxPayload_kg} min={0} max={50} step={0.5} unit="kg" onChange={set('maxPayload_kg')} />
    </div>
  );
}
