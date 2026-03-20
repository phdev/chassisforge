import { useDesignStore } from '../store/useDesignStore';
import { MOTORS, BATTERIES, COMPUTE_BOARDS, WHEELS, MOTOR_DRIVERS, SENSORS } from '../data/components';

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mt-4 mb-2 border-b border-gray-700 pb-1">{title}</h3>;
}

export default function ComponentSelector() {
  const components = useDesignStore((s) => s.components);
  const { setMotor, setBattery, setCompute, setWheel, setMotorDriver, addSensor, removeSensor } = useDesignStore();

  return (
    <div className="p-3 overflow-y-auto">
      <h2 className="text-sm font-bold text-white mb-3">Components</h2>

      <SectionHeader title="Motor (×2)" />
      <select
        value={components.motor.id}
        onChange={(e) => setMotor(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1.5"
      >
        {MOTORS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} — {m.noLoadRPM}RPM, {m.stallTorque_kgcm}kg·cm
          </option>
        ))}
      </select>

      <SectionHeader title="Battery" />
      <select
        value={components.battery.id}
        onChange={(e) => setBattery(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1.5"
      >
        {BATTERIES.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} — {b.energy_wh}Wh, {b.mass_kg * 1000}g
          </option>
        ))}
      </select>

      <SectionHeader title="Compute" />
      <select
        value={components.compute.id}
        onChange={(e) => setCompute(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1.5"
      >
        {COMPUTE_BOARDS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.powerDraw_w}W, {c.mass_kg * 1000}g
          </option>
        ))}
      </select>

      <SectionHeader title="Wheels" />
      <select
        value={components.wheel.id}
        onChange={(e) => setWheel(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1.5"
      >
        {WHEELS.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} — ⌀{w.diameter_mm}mm, {w.type}
          </option>
        ))}
      </select>

      <SectionHeader title="Motor Driver" />
      <select
        value={components.motorDriver.id}
        onChange={(e) => setMotorDriver(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1.5"
      >
        {MOTOR_DRIVERS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} — {d.maxCurrent_a}A, {d.channels}ch
          </option>
        ))}
      </select>

      <SectionHeader title="Sensors" />
      <div className="space-y-1">
        {SENSORS.map((s) => {
          const isSelected = components.sensors.some((sel) => sel.id === s.id);
          return (
            <label key={s.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => isSelected ? removeSensor(s.id) : addSensor(s.id)}
                className="accent-blue-500"
              />
              <span>{s.name} — {s.powerDraw_w}W</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
