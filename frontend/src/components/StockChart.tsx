import { memo, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { DashboardSummary } from '../api/dashboard';
import { useI18n, districtLabel } from '../i18n';
import { useThemeColors } from '../theme/ThemeContext';

interface StockChartProps {
  districts:        DashboardSummary['districts'];
  centralWarehouse: DashboardSummary['centralWarehouse'];
}

function CustomTooltip({ active, payload, label, centralLabel, reserveLabel }: {
  active?:  boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?:   string;
  centralLabel: string;
  reserveLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const isCentral = label === centralLabel;
  return (
    <div className="bg-bg-elevated border border-bg-border rounded-lg px-4 py-3 shadow-2xl">
      <p className={`font-mono text-xs uppercase tracking-widest mb-2 ${isCentral ? 'text-accent-orange' : 'text-text-muted'}`}>
        {label}{isCentral ? ` · ${reserveLabel}` : ''}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="font-mono text-xs text-text-secondary">{entry.name}:</span>
          <span className="font-mono text-xs text-text-primary font-semibold">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

const SCARCITY_THRESHOLD = 30;

type ChartRow = {
  name:          string;
  isCentral:     boolean;
  'EMK-1 %':     number;
  'EMK-2 %':     number;
  'EMK-3 %':     number;
  emk1Scarce:    boolean;
  emk2Scarce:    boolean;
  emk3Scarce:    boolean;
  emk1Remaining: number; emk1Total: number;
  emk2Remaining: number; emk2Total: number;
  emk3Remaining: number; emk3Total: number;
};

function XAxisTick({ x, y, payload, centralLabel, centralColor, color }: {
  x?: number; y?: number; payload?: { value: string };
  centralLabel: string; centralColor: string; color: string;
}) {
  const isCentral = payload?.value === centralLabel;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={13}
        textAnchor="middle"
        fill={isCentral ? centralColor : color}
        fontSize={11}
        fontFamily="JetBrains Mono"
        fontWeight={isCentral ? 600 : 400}
      >
        {payload?.value}
      </text>
    </g>
  );
}

export const StockChart = memo(function StockChart({ districts, centralWarehouse }: StockChartProps) {
  const { t } = useI18n();
  const color = useThemeColors();
  const centralLabel = t('stock.central');
  const emkColors = [color('accent-blue'), color('accent-green'), color('accent-yellow')] as const;
  const scarceColor = color('accent-red');

  const chartData = useMemo<ChartRow[]>(() => {
    const rows: ChartRow[] = [];

    if (centralWarehouse) {
      const cw = centralWarehouse;
      const e1 = cw.emk1Total > 0 ? Math.round((cw.emk1Remaining / cw.emk1Total) * 100) : 0;
      const e2 = cw.emk2Total > 0 ? Math.round((cw.emk2Remaining / cw.emk2Total) * 100) : 0;
      const e3 = cw.emk3Total > 0 ? Math.round((cw.emk3Remaining / cw.emk3Total) * 100) : 0;
      rows.push({
        name: centralLabel, isCentral: true,
        'EMK-1 %': e1, 'EMK-2 %': e2, 'EMK-3 %': e3,
        emk1Scarce: e1 < SCARCITY_THRESHOLD && cw.emk1Total > 0,
        emk2Scarce: e2 < SCARCITY_THRESHOLD && cw.emk2Total > 0,
        emk3Scarce: e3 < SCARCITY_THRESHOLD && cw.emk3Total > 0,
        emk1Remaining: cw.emk1Remaining, emk1Total: cw.emk1Total,
        emk2Remaining: cw.emk2Remaining, emk2Total: cw.emk2Total,
        emk3Remaining: cw.emk3Remaining, emk3Total: cw.emk3Total,
      });
    }

    for (const d of districts) {
      const s = d.stock;
      const e1 = s && s.emk1Total > 0 ? Math.round((s.emk1Remaining / s.emk1Total) * 100) : 0;
      const e2 = s && s.emk2Total > 0 ? Math.round((s.emk2Remaining / s.emk2Total) * 100) : 0;
      const e3 = s && s.emk3Total > 0 ? Math.round((s.emk3Remaining / s.emk3Total) * 100) : 0;
      rows.push({
        name: districtLabel(t, d.name), isCentral: false,
        'EMK-1 %': e1, 'EMK-2 %': e2, 'EMK-3 %': e3,
        emk1Scarce: e1 < SCARCITY_THRESHOLD && (s?.emk1Total ?? 0) > 0,
        emk2Scarce: e2 < SCARCITY_THRESHOLD && (s?.emk2Total ?? 0) > 0,
        emk3Scarce: e3 < SCARCITY_THRESHOLD && (s?.emk3Total ?? 0) > 0,
        emk1Remaining: s?.emk1Remaining ?? 0, emk1Total: s?.emk1Total ?? 0,
        emk2Remaining: s?.emk2Remaining ?? 0, emk2Total: s?.emk2Total ?? 0,
        emk3Remaining: s?.emk3Remaining ?? 0, emk3Total: s?.emk3Total ?? 0,
      });
    }

    return rows;
  }, [districts, centralWarehouse, centralLabel, t]);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-text-primary">{t('stock.title')}</h2>
          <p className="font-mono text-[11px] text-text-muted mt-0.5">
            {t('stock.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {centralWarehouse && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3 rounded-sm inline-block bg-accent-orange opacity-85" />
                <span className="font-mono text-[11px] text-accent-orange">{centralLabel}</span>
              </div>
              <span className="text-bg-border text-xs">|</span>
            </>
          )}
          {[
            { color: emkColors[0], label: 'EMK-1' },
            { color: emkColors[1], label: 'EMK-2' },
            { color: emkColors[2], label: 'EMK-3' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-1.5 h-3 rounded-sm inline-block" style={{ background: color }} />
              <span className="font-mono text-[11px] text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 8 }}
            barCategoryGap="30%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={color('bg-border')} vertical={false} />
            <XAxis
              dataKey="name"
              tick={<XAxisTick centralLabel={centralLabel} centralColor={color('accent-orange')} color={color('text-secondary')} />}
              axisLine={{ stroke: color('bg-border') }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: color('text-secondary'), fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              ticks={[0, 30, 60, 100]}
            />
            <Tooltip content={<CustomTooltip centralLabel={centralLabel} reserveLabel={t('stock.reserve')} />} cursor={{ fill: color('text-primary', 0.04) }} />
            <ReferenceLine y={30} stroke={scarceColor} strokeDasharray="4 4" strokeOpacity={0.4} />

            <Bar dataKey="EMK-1 %" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.emk1Scarce ? scarceColor : emkColors[0]}
                  opacity={entry.emk1Scarce ? 1 : 0.85}
                />
              ))}
            </Bar>
            <Bar dataKey="EMK-2 %" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.emk2Scarce ? scarceColor : emkColors[1]}
                  opacity={entry.emk2Scarce ? 1 : 0.85}
                />
              ))}
            </Bar>
            <Bar dataKey="EMK-3 %" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.emk3Scarce ? scarceColor : emkColors[2]}
                  opacity={entry.emk3Scarce ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scarcity label */}
      <div className="flex items-center gap-2 mt-1 mb-3">
        <div className="h-px flex-1" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${scarceColor} 0, ${scarceColor} 6px, transparent 6px, transparent 8px)` }} />
        <span className="font-mono text-[10px] text-accent-red/60 flex-shrink-0">{t('stock.threshold')}</span>
        <div className="h-px flex-1" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${scarceColor} 0, ${scarceColor} 6px, transparent 6px, transparent 8px)` }} />
      </div>

      {/* Detail cards — equal width, one row of 4 */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${chartData.length}, 1fr)` }}
      >
        {chartData.map((d) => (
          <div
            key={d.name}
            className={`rounded px-3 py-2 ${
              d.isCentral
                ? 'bg-accent-orange/10 border border-accent-orange/25'
                : 'bg-bg-elevated'
            }`}
          >
            <p className={`font-mono text-[10px] uppercase tracking-wide mb-1.5 ${
              d.isCentral ? 'text-accent-orange' : 'text-text-muted'
            }`}>
              {d.name}
              {d.isCentral && <span className="ml-1 opacity-50">· {t('stock.reserve')}</span>}
            </p>
            <div className="space-y-0.5">
              {([
                { label: 'EMK1', rem: d.emk1Remaining, tot: d.emk1Total },
                { label: 'EMK2', rem: d.emk2Remaining, tot: d.emk2Total },
                { label: 'EMK3', rem: d.emk3Remaining, tot: d.emk3Total },
              ]).map(({ label, rem, tot }) => {
                const scarce  = tot > 0 && rem / tot < 0.3;
                const mohHeld = label === 'EMK3' && tot === 0 && d.isCentral;
                return (
                  <div key={label} className="flex justify-between items-center">
                    <span className={`font-mono text-[11px] ${
                      scarce ? 'text-accent-red' : d.isCentral ? 'text-accent-orange/60' : 'text-text-muted'
                    }`}>
                      {label}
                    </span>
                    <span className={`font-mono text-[11px] font-semibold ${
                      scarce ? 'text-accent-red' : d.isCentral ? 'text-accent-orange' : 'text-text-secondary'
                    }`}>
                      {mohHeld
                        ? <span className="text-text-muted/50 font-normal">MoH</span>
                        : <>{rem.toLocaleString()}{scarce && ' ⚠'}</>
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});