import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DashboardSummary } from '../api/dashboard';

interface StockChartProps {
  districts: DashboardSummary['districts'];
}

// Custom tooltip styled to match the dark industrial theme
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: Record<string, number> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-bg-elevated border border-bg-border rounded-lg px-4 py-3 shadow-2xl">
      <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-2">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="font-mono text-xs text-text-secondary">{entry.name}:</span>
          <span className="font-mono text-xs text-text-primary font-semibold">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// EMK bar colors — distinct, readable on dark background
const EMK_COLORS = {
  emk1: { normal: '#58a6ff', scarce: '#f85149' },
  emk2: { normal: '#3fb950', scarce: '#f0883e' },
  emk3: { normal: '#d29922', scarce: '#f85149' },
} as const;

function getColor(type: 'emk1' | 'emk2' | 'emk3', scarce: boolean): string {
  return scarce ? EMK_COLORS[type].scarce : EMK_COLORS[type].normal;
}

export function StockChart({ districts }: StockChartProps) {
  const chartData = districts.map((d) => {
    const emk1Pct = d.stock && d.stock.emk1Total > 0
      ? Math.round((d.stock.emk1Remaining / d.stock.emk1Total) * 100)
      : 0;
    const emk2Pct = d.stock && d.stock.emk2Total > 0
      ? Math.round((d.stock.emk2Remaining / d.stock.emk2Total) * 100)
      : 0;
    const emk3Pct = d.stock && d.stock.emk3Total > 0
      ? Math.round((d.stock.emk3Remaining / d.stock.emk3Total) * 100)
      : 0;

    return {
      name: d.name.replace('District ', 'D'),
      fullName: d.name,
      'EMK-1 %': emk1Pct,
      'EMK-2 %': emk2Pct,
      'EMK-3 %': emk3Pct,
      emk1Remaining: d.stock?.emk1Remaining ?? 0,
      emk2Remaining: d.stock?.emk2Remaining ?? 0,
      emk3Remaining: d.stock?.emk3Remaining ?? 0,
      emk1Scarce: emk1Pct < 30 && (d.stock?.emk1Total ?? 0) > 0,
      emk2Scarce: emk2Pct < 30 && (d.stock?.emk2Total ?? 0) > 0,
      emk3Scarce: emk3Pct < 30 && (d.stock?.emk3Total ?? 0) > 0,
      anyScarce: d.anyScarce,
    };
  });

  // Reference line at 30% (scarcity threshold)
  const SCARCITY_THRESHOLD = 30;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-sans font-bold text-text-primary">Stock Levels</h2>
          <p className="font-mono text-[10px] text-text-muted mt-0.5">
            % remaining per EMK type — red bars below 30% scarcity threshold
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3 rounded-sm bg-accent-blue inline-block" />
            <span className="font-mono text-[10px] text-text-muted">EMK-1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3 rounded-sm bg-accent-green inline-block" />
            <span className="font-mono text-[10px] text-text-muted">EMK-2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3 rounded-sm bg-accent-yellow inline-block" />
            <span className="font-mono text-[10px] text-text-muted">EMK-3</span>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            barCategoryGap="30%"
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#21262d"
              vertical={false}
            />
            {/* Scarcity threshold reference line */}
            <CartesianGrid
              strokeDasharray="6 2"
              stroke="#f85149"
              strokeOpacity={0.3}
              vertical={false}
              // Draw only at y=30 by using a custom reference approach
              // We'll add it as a separate line
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#8b949e', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#21262d' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              ticks={[0, 30, 60, 100]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: '#ffffff08' }}
            />
            <Bar dataKey="EMK-1 %" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={getColor('emk1', entry.emk1Scarce)}
                  opacity={entry.emk1Scarce ? 1 : 0.85}
                />
              ))}
            </Bar>
            <Bar dataKey="EMK-2 %" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={getColor('emk2', entry.emk2Scarce)}
                  opacity={entry.emk2Scarce ? 1 : 0.85}
                />
              ))}
            </Bar>
            <Bar dataKey="EMK-3 %" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={getColor('emk3', entry.emk3Scarce)}
                  opacity={entry.emk3Scarce ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scarcity threshold label */}
      <div className="flex items-center gap-2 mt-2">
        <div className="h-px flex-1 bg-accent-red/30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f85149 0, #f85149 6px, transparent 6px, transparent 8px)' }} />
        <span className="font-mono text-[9px] text-accent-red/60 flex-shrink-0">30% scarcity threshold</span>
        <div className="h-px flex-1 bg-accent-red/30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f85149 0, #f85149 6px, transparent 6px, transparent 8px)' }} />
      </div>

      {/* Raw numbers row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {districts.map((d) => (
          <div key={d.districtId} className="bg-bg-elevated rounded px-3 py-2">
            <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide mb-1.5">
              {d.name}
            </p>
            {d.stock ? (
              <div className="space-y-0.5">
                {(['emk1', 'emk2', 'emk3'] as const).map((k) => {
                  const rem = d.stock![`${k}Remaining`];
                  const tot = d.stock![`${k}Total`];
                  const pct = tot > 0 ? Math.round((rem / tot) * 100) : 0;
                  const scarce = pct < SCARCITY_THRESHOLD && tot > 0;
                  return (
                    <div key={k} className="flex justify-between items-center">
                      <span className={`font-mono text-[10px] ${scarce ? 'text-accent-red' : 'text-text-muted'}`}>
                        {k.toUpperCase()}
                      </span>
                      <span className={`font-mono text-[10px] font-semibold ${scarce ? 'text-accent-red' : 'text-text-secondary'}`}>
                        {rem.toLocaleString()}
                        {scarce && ' ⚠'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-mono text-[10px] text-text-muted">No stock data</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}