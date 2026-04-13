import { useDesignStore } from '../store/useDesignStore';
import type { ChassisParams, FrameMaterial, ComponentKey, Vec3 } from '../types/chassis';

function SliderRow({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-400 mb-0.5">
        <span>{label}</span>
        <span className="font-mono">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
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
  { value: 'pla', label: 'PLA (3D Print)' },
  { value: 'petg', label: 'PETG (3D Print)' },
  { value: 'abs', label: 'ABS (3D Print)' },
  { value: 'plywood', label: 'Plywood (Laser Cut)' },
  { value: 'acrylic', label: 'Acrylic (Laser Cut)' },
  { value: 'aluminum', label: 'Aluminum (CNC/Sheet)' },
];

const COMPONENT_LABELS: Record<ComponentKey, { label: string; section: 'base' | 'head' }> = {
  pi5:           { label: 'Pi 5', section: 'base' },
  xvf3800:       { label: 'XVF3800 Mic', section: 'base' },
  actuator:      { label: 'L12-50 Actuator', section: 'base' },
  panServo:      { label: 'Pan Servo', section: 'base' },
  pca9685:       { label: 'PCA9685', section: 'base' },
  buckConverter: { label: '5V Buck', section: 'base' },
  bec:           { label: '6V BEC', section: 'base' },
  ttlBoard:      { label: 'TTL Board', section: 'base' },
  luma350:       { label: 'Luma 350', section: 'head' },
  piCamera:      { label: 'Pi Camera', section: 'head' },
  tiltServo:     { label: 'Tilt Servo', section: 'head' },
  tofSensor:     { label: 'ToF Sensor', section: 'head' },
};

function CompactPosRow({ label, pos, onChange }: {
  label: string;
  pos: Vec3;
  onChange: (axis: keyof Vec3, v: number) => void;
}) {
  return (
    <div className="mb-1.5">
      <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
      <div className="flex gap-1">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="flex-1">
            <label className="text-[8px] text-gray-500 uppercase">{axis}</label>
            <input
              type="number"
              value={pos[axis]}
              step={1}
              onChange={(e) => onChange(axis, Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-[10px] font-mono rounded px-1 py-0.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SliderPanel() {
  const params = useDesignStore((s) => s.params);
  const setParam = useDesignStore((s) => s.setParam);
  const setComponentPosition = useDesignStore((s) => s.setComponentPosition);

  const set = <K extends keyof ChassisParams>(key: K) => (value: ChassisParams[K]) => setParam(key, value);

  const handlePosChange = (key: ComponentKey) => (axis: keyof Vec3, value: number) => {
    const current = params.componentPositions[key];
    setComponentPosition(key, { ...current, [axis]: value });
  };

  const baseComponents = (Object.entries(COMPONENT_LABELS) as [ComponentKey, typeof COMPONENT_LABELS[ComponentKey]][])
    .filter(([, v]) => v.section === 'base');
  const headComponents = (Object.entries(COMPONENT_LABELS) as [ComponentKey, typeof COMPONENT_LABELS[ComponentKey]][])
    .filter(([, v]) => v.section === 'head');

  return (
    <div className="p-3 overflow-y-auto h-full">
      <h2 className="text-sm font-bold text-white mb-3">Comni Box Parameters</h2>

      <SectionHeader title="Enclosure Dimensions" />
      <SliderRow label="Width" value={params.boxWidth_mm} min={100} max={180} step={1} unit="mm" onChange={set('boxWidth_mm') as (v: number) => void} />
      <SliderRow label="Depth" value={params.boxDepth_mm} min={100} max={180} step={1} unit="mm" onChange={set('boxDepth_mm') as (v: number) => void} />
      <SliderRow label="Base Height" value={params.baseHeight_mm} min={50} max={100} step={1} unit="mm" onChange={set('baseHeight_mm') as (v: number) => void} />
      <SliderRow label="Head Height" value={params.headHeight_mm} min={30} max={80} step={1} unit="mm" onChange={set('headHeight_mm') as (v: number) => void} />
      <SliderRow label="Wall Thickness" value={params.wallThickness_mm} min={1.5} max={6} step={0.5} unit="mm" onChange={set('wallThickness_mm') as (v: number) => void} />

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

      <SectionHeader title="Structural / CAE" />
      <SliderRow label="Base Plate Weight" value={params.basePlateWeight_kg} min={0} max={2} step={0.05} unit="kg" onChange={set('basePlateWeight_kg') as (v: number) => void} />
      <SliderRow label="Slot Fillet Radius" value={params.filletRadius_mm} min={1} max={10} step={0.5} unit="mm" onChange={set('filletRadius_mm') as (v: number) => void} />
      <SliderRow label="Slot Width" value={params.slotWidth_mm} min={40} max={100} step={1} unit="mm" onChange={set('slotWidth_mm') as (v: number) => void} />
      <SliderRow label="Slot Depth" value={params.slotDepth_mm} min={40} max={100} step={1} unit="mm" onChange={set('slotDepth_mm') as (v: number) => void} />
      <SliderRow label="Actuator Rise" value={params.riseMax_mm} min={20} max={80} step={1} unit="mm" onChange={set('riseMax_mm') as (v: number) => void} />

      <SectionHeader title="Base Components (mm)" />
      {baseComponents.map(([key, { label }]) => (
        <CompactPosRow
          key={key}
          label={label}
          pos={params.componentPositions[key]}
          onChange={handlePosChange(key)}
        />
      ))}

      <SectionHeader title="Head Components (mm)" />
      {headComponents.map(([key, { label }]) => (
        <CompactPosRow
          key={key}
          label={label}
          pos={params.componentPositions[key]}
          onChange={handlePosChange(key)}
        />
      ))}
    </div>
  );
}
