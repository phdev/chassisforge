import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useDesignStore } from '../store/useDesignStore';

const COLORS = [
  '#4488cc', // Frame - blue
  '#ff8c00', // Motors - orange
  '#22c55e', // Battery - green
  '#8b5cf6', // Compute - purple
  '#06b6d4', // Sensors - cyan
  '#404040', // Wheels - gray
  '#808080', // Casters - light gray
  '#eab308', // Motor Driver - yellow
];

export default function MassBudgetChart() {
  const massBudget = useDesignStore((s) => s.scores.massBudget);
  const totalMass = useDesignStore((s) => s.scores.totalMass_kg);

  const data = Object.entries(massBudget)
    .filter(([, v]) => v > 0.001)
    .map(([name, value]) => ({ name, value: Math.round(value * 1000) })); // grams

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
        Mass Budget <span className="text-gray-500">({(totalMass * 1000).toFixed(0)}g total)</span>
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={60}
            innerRadius={30}
            paddingAngle={2}
            label={({ name, value }) => `${name} ${value}g`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', fontSize: '11px' }}
            itemStyle={{ color: '#e5e7eb' }}
            formatter={(value) => `${value}g`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
