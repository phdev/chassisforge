import { create } from 'zustand';
import type { ChassisParams, SimulationScores, ComponentKey, Vec3 } from '../types/chassis';
import { DEFAULT_CHASSIS_PARAMS } from '../data/defaults';
import { computeAllScores } from '../engine/physics';

export type DeployState = 'retracted' | 'deployed';

interface DesignStore {
  params: ChassisParams;
  scores: SimulationScores;

  // Deploy animation
  deployState: DeployState;
  deployTarget: number;

  // Actions
  setParam: <K extends keyof ChassisParams>(key: K, value: ChassisParams[K]) => void;
  setParams: (updates: Partial<ChassisParams>) => void;
  setComponentPosition: (key: ComponentKey, pos: Vec3) => void;
  setDeployState: (state: DeployState) => void;
  reset: () => void;
}

function recompute(params: ChassisParams): SimulationScores {
  return computeAllScores(params);
}

const initialScores = recompute(DEFAULT_CHASSIS_PARAMS);

export const useDesignStore = create<DesignStore>()((set) => ({
  params: DEFAULT_CHASSIS_PARAMS,
  scores: initialScores,
  deployState: 'retracted',
  deployTarget: 0,

  setParam: (key, value) =>
    set((state) => {
      const newParams = { ...state.params, [key]: value };
      return { params: newParams, scores: recompute(newParams) };
    }),

  setParams: (updates) =>
    set((state) => {
      const newParams = { ...state.params, ...updates };
      return { params: newParams, scores: recompute(newParams) };
    }),

  setComponentPosition: (key, pos) =>
    set((state) => {
      const newPositions = { ...state.params.componentPositions, [key]: pos };
      const newParams = { ...state.params, componentPositions: newPositions };
      return { params: newParams, scores: recompute(newParams) };
    }),

  setDeployState: (state) =>
    set({
      deployState: state,
      deployTarget: state === 'deployed' ? 1 : 0,
    }),

  reset: () =>
    set({
      params: DEFAULT_CHASSIS_PARAMS,
      scores: initialScores,
      deployState: 'retracted',
      deployTarget: 0,
    }),
}));
