import { useDesignStore } from '../store/useDesignStore';

export default function DeployControls() {
  const deployState = useDesignStore((s) => s.deployState);
  const setDeployState = useDesignStore((s) => s.setDeployState);

  return (
    <div className="p-3 border-b border-gray-800">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
        Design D — Deploy State
      </h3>
      <div className="flex gap-2">
        <button
          onClick={() => setDeployState('retracted')}
          className={`flex-1 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
            deployState === 'retracted'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Retracted
        </button>
        <button
          onClick={() => setDeployState('deployed')}
          className={`flex-1 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
            deployState === 'deployed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Deployed
        </button>
      </div>
      <div className="mt-1.5 text-[10px] text-gray-500">
        {deployState === 'retracted'
          ? '5"×5"×5" — head flush with base'
          : '5"×5"×7" — head raised 2", tilted 45°'}
      </div>
    </div>
  );
}
