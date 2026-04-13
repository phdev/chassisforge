import { useState } from 'react';
import { DESIGN_D_BOM, DESIGN_D_BOM_TOTAL } from '../data/designD';

const CATEGORY_COLORS: Record<string, string> = {
  compute: 'text-green-400',
  display: 'text-blue-400',
  sensor: 'text-cyan-400',
  actuator: 'text-gray-300',
  electronics: 'text-yellow-400',
  power: 'text-orange-400',
  wiring: 'text-gray-500',
};

export default function BOMPanel() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-bold text-white mb-2"
      >
        <span>Bill of Materials</span>
        <span className="text-xs text-gray-400">
          {expanded ? '▼' : '▶'} {DESIGN_D_BOM.length} items
        </span>
      </button>

      {expanded && (
        <>
          <div className="space-y-px mb-2">
            {DESIGN_D_BOM.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-2 py-1 rounded text-[11px] ${
                  i % 2 === 0 ? 'bg-gray-800/40' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[8px] uppercase tracking-wider ${CATEGORY_COLORS[item.category] ?? 'text-gray-400'}`}>
                    {item.category.slice(0, 3)}
                  </span>
                  <span className="text-gray-300 truncate">{item.name}</span>
                </div>
                <span className="text-green-400 font-mono ml-2 flex-shrink-0">
                  ${item.price_usd}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-700">
            <span className="text-xs font-bold text-white">Total</span>
            <span className="text-sm font-bold font-mono text-green-400">
              ${DESIGN_D_BOM_TOTAL}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
