import { create } from 'zustand';
import type { ChassisParams, SimulationScores } from '../types/chassis';
import type { SelectedComponents } from '../types/components';
import { MOTORS, BATTERIES, COMPUTE_BOARDS, WHEELS, SENSORS, MOTOR_DRIVERS } from '../data/components';
import { DEFAULT_CHASSIS_PARAMS, DEFAULT_SELECTED_COMPONENTS } from '../data/defaults';
import { computeAllScores } from '../engine/physics';

export type DeployState = 'retracted' | 'deployed';

interface DesignStore {
  // State
  params: ChassisParams;
  components: SelectedComponents;
  scores: SimulationScores;

  // Design D deployment state
  deployState: DeployState;
  /** 0 = fully retracted, 1 = fully deployed (risen + tilted) */
  deployTarget: number;

  // Actions — chassis params
  setParam: <K extends keyof ChassisParams>(key: K, value: ChassisParams[K]) => void;
  setParams: (updates: Partial<ChassisParams>) => void;

  // Actions — component selection (by ID)
  setMotor: (id: string) => void;
  setBattery: (id: string) => void;
  setCompute: (id: string) => void;
  setWheel: (id: string) => void;
  setMotorDriver: (id: string) => void;
  addSensor: (id: string) => void;
  removeSensor: (id: string) => void;

  // Actions — deployment
  setDeployState: (state: DeployState) => void;

  // Reset
  reset: () => void;
}

/** Recompute scores from current params and components. */
function recompute(params: ChassisParams, components: SelectedComponents): SimulationScores {
  return computeAllScores(params, components);
}

const initialScores = recompute(DEFAULT_CHASSIS_PARAMS, DEFAULT_SELECTED_COMPONENTS);

export const useDesignStore = create<DesignStore>()((set) => ({
  params: DEFAULT_CHASSIS_PARAMS,
  components: DEFAULT_SELECTED_COMPONENTS,
  scores: initialScores,
  deployState: 'retracted',
  deployTarget: 0,

  setParam: (key, value) =>
    set((state) => {
      const newParams = { ...state.params, [key]: value };
      return {
        params: newParams,
        scores: recompute(newParams, state.components),
      };
    }),

  setParams: (updates) =>
    set((state) => {
      const newParams = { ...state.params, ...updates };
      return {
        params: newParams,
        scores: recompute(newParams, state.components),
      };
    }),

  setMotor: (id) =>
    set((state) => {
      const motor = MOTORS.find((m) => m.id === id);
      if (!motor) return state;
      const newComponents = { ...state.components, motor };
      return {
        components: newComponents,
        scores: recompute(state.params, newComponents),
      };
    }),

  setBattery: (id) =>
    set((state) => {
      const battery = BATTERIES.find((b) => b.id === id);
      if (!battery) return state;
      const newComponents = { ...state.components, battery };
      return {
        components: newComponents,
        scores: recompute(state.params, newComponents),
      };
    }),

  setCompute: (id) =>
    set((state) => {
      const compute = COMPUTE_BOARDS.find((c) => c.id === id);
      if (!compute) return state;
      const newComponents = { ...state.components, compute };
      return {
        components: newComponents,
        scores: recompute(state.params, newComponents),
      };
    }),

  setWheel: (id) =>
    set((state) => {
      const wheel = WHEELS.find((w) => w.id === id);
      if (!wheel) return state;
      const newComponents = { ...state.components, wheel };
      return {
        components: newComponents,
        scores: recompute(state.params, newComponents),
      };
    }),

  setMotorDriver: (id) =>
    set((state) => {
      const motorDriver = MOTOR_DRIVERS.find((d) => d.id === id);
      if (!motorDriver) return state;
      const newComponents = { ...state.components, motorDriver };
      return {
        components: newComponents,
        scores: recompute(state.params, newComponents),
      };
    }),

  addSensor: (id) =>
    set((state) => {
      const sensor = SENSORS.find((s) => s.id === id);
      if (!sensor) return state;
      if (state.components.sensors.some((s) => s.id === id)) return state;

      const newSensors = [...state.components.sensors, sensor];
      const newComponents = { ...state.components, sensors: newSensors };

      // Also add a default sensor mount
      const newMount = {
        sensorId: id,
        position: { x: 0, y: 0, z: state.params.groundClearance_mm + state.params.frameHeight_mm + 20 },
        rotation: { pitch_deg: 0, yaw_deg: 0 },
      };
      const newParams = {
        ...state.params,
        sensorMounts: [...state.params.sensorMounts, newMount],
      };

      return {
        components: newComponents,
        params: newParams,
        scores: recompute(newParams, newComponents),
      };
    }),

  removeSensor: (id) =>
    set((state) => {
      const newSensors = state.components.sensors.filter((s) => s.id !== id);
      const newComponents = { ...state.components, sensors: newSensors };
      const newParams = {
        ...state.params,
        sensorMounts: state.params.sensorMounts.filter((m) => m.sensorId !== id),
      };
      return {
        components: newComponents,
        params: newParams,
        scores: recompute(newParams, newComponents),
      };
    }),

  setDeployState: (state) =>
    set({
      deployState: state,
      deployTarget: state === 'deployed' ? 1 : 0,
    }),

  reset: () =>
    set({
      params: DEFAULT_CHASSIS_PARAMS,
      components: DEFAULT_SELECTED_COMPONENTS,
      scores: initialScores,
      deployState: 'retracted',
      deployTarget: 0,
    }),
}));
