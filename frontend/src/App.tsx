import Viewport from './components/Viewport';
import SliderPanel from './components/SliderPanel';
import ComponentSelector from './components/ComponentSelector';
import ScoringDashboard from './components/ScoringDashboard';
import MassBudgetChart from './components/MassBudgetChart';
import StabilityIndicator from './components/StabilityIndicator';

export default function App() {
  return (
    <div className="w-screen h-screen bg-gray-900 flex overflow-hidden">
      {/* Left Panel: Sliders + Component Selection */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <SliderPanel />
          <ComponentSelector />
        </div>
      </div>

      {/* Center: 3D Viewport */}
      <div className="flex-1 min-w-0">
        <Viewport />
      </div>

      {/* Right Panel: Scoring Dashboard */}
      <div className="w-80 flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <ScoringDashboard />
          <MassBudgetChart />
          <StabilityIndicator />
        </div>
      </div>
    </div>
  );
}
