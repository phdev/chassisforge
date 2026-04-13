import Viewport from './components/Viewport';
import SliderPanel from './components/SliderPanel';
import ScoringDashboard from './components/ScoringDashboard';
import MassBudgetChart from './components/MassBudgetChart';
import StabilityIndicator from './components/StabilityIndicator';
import DeployControls from './components/DeployControls';
import BOMPanel from './components/BOMPanel';
import CAEDashboard from './components/CAEDashboard';

export default function App() {
  return (
    <div className="w-screen h-screen bg-gray-900 flex overflow-hidden">
      {/* Left Panel: Deploy Controls + Sliders */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <DeployControls />
          <SliderPanel />
        </div>
      </div>

      {/* Center: 3D Viewport */}
      <div className="flex-1 min-w-0">
        <Viewport />
      </div>

      {/* Right Panel: BOM + Scores + CAE */}
      <div className="w-96 flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <BOMPanel />
          <div className="border-t border-gray-800">
            <ScoringDashboard />
          </div>
          <div className="border-t border-gray-800">
            <MassBudgetChart />
          </div>
          <div className="border-t border-gray-800">
            <StabilityIndicator />
          </div>
          <div className="border-t border-gray-800">
            <CAEDashboard />
          </div>
        </div>
      </div>
    </div>
  );
}
