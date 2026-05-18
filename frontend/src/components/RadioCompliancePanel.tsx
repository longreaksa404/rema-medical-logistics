import { useQuery } from '@tanstack/react-query';
import { radioApi } from '../api/radio';
import { queryKeys } from '../api/queryKeys';
import type { RadioComplianceEntry } from '../api/radio';

const SLOT_LABELS: Record<string, string> = {
  T0800: '08:00', T1200: '12:00', T1600: '16:00', T2000: '20:00',
};
const ALL_SLOTS = ['T0800', 'T1200', 'T1600', 'T2000'];

export function RadioCompliancePanel() {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.radio.compliance(),
    queryFn:  () => radioApi.getCompliance(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="h-4 bg-bg-elevated rounded w-1/3 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-bg-elevated rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalSlots     = data.length * 4;
  const completedSlots = data.reduce(
    (acc: number, d: RadioComplianceEntry) => acc + d.completedSlots.length, 0,
  );
  const hasCritical = data.some(
    (d: RadioComplianceEntry) => (4 - d.completedSlots.length) >= 2,
  );
  const hasIssues = data.some((d: RadioComplianceEntry) => d.issuesReported);

  const overallColor =
    completedSlots === totalSlots ? 'text-accent-green' :
    hasCritical                   ? 'text-accent-red'   :
    completedSlots > 0            ? 'text-accent-yellow' :
                                    'text-text-muted';

  return (
    <div className="card p-5 h-full flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-sans font-bold uppercase text-text-primary">Radio Check-ins</h2>
          <p className="font-mono text-[10px] text-text-muted mt-0.5">
            08:00 · 12:00 · 16:00 · 20:00
          </p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-lg font-semibold tabular-nums ${overallColor}`}>
            {completedSlots}/{totalSlots}
          </p>
          <p className="font-mono text-[9px] text-text-muted">slots filled</p>
        </div>
      </div>

      {/* Alert banner — only if critical */}
      {hasCritical && (
        <div className="mb-4 flex items-start gap-2 bg-accent-red/10 border border-accent-red/25 rounded-lg px-3 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse-slow flex-shrink-0 mt-0.5" />
          <p className="font-mono text-[10px] text-accent-red leading-snug">
            One or more districts missed 2+ check-ins — contact Hub Manager immediately
          </p>
        </div>
      )}
      {!hasCritical && hasIssues && (
        <div className="mb-4 flex items-start gap-2 bg-accent-orange/10 border border-accent-orange/20 rounded-lg px-3 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-orange flex-shrink-0 mt-0.5" />
          <p className="font-mono text-[10px] text-accent-orange leading-snug">
            Issues reported in one or more check-ins today
          </p>
        </div>
      )}

      {/* Column labels */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-x-5 mb-1 px-1">
        <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">District</span>
        {ALL_SLOTS.map((slot) => (
          <span key={slot} className="font-mono text-[9px] text-text-muted text-center w-10">
            {SLOT_LABELS[slot]}
          </span>
        ))}
        <span className="font-mono text-[9px] text-text-muted text-right w-8">Fill</span>
      </div>

      {/* District rows */}
      <div className="flex-1 space-y-3">
        {data.map((entry: RadioComplianceEntry) => {
          const completed  = entry.completedSlots.length;
          const missed     = 4 - completed;
          const isCritical = missed >= 2;

          return (
            <div
              key={entry.districtId}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-x-5 py-3 px-1 ${
                isCritical ? 'bg-accent-red/5 -mx-1 px-2 rounded' : ''
              }`}
            >
              {/* District name + missed badge */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-sans text-sm font-medium truncate ${
                  isCritical ? 'text-text-primary' : 'text-text-secondary'
                }`}>
                  {entry.districtName}
                </span>
                {isCritical && (
                  <span className="font-mono text-[8px] text-accent-red bg-accent-red/15 border border-accent-red/25 px-1.5 py-0.5 rounded flex-shrink-0">
                    {missed} MISSED
                  </span>
                )}
                {!isCritical && entry.issuesReported && (
                  <span className="font-mono text-[8px] text-accent-orange bg-accent-orange/15 border border-accent-orange/25 px-1.5 py-0.5 rounded flex-shrink-0">
                    ISSUE
                  </span>
                )}
              </div>

              {/* Slot dots */}
              {ALL_SLOTS.map((slot) => {
                const done = entry.completedSlots.includes(slot);
                return (
                  <div key={slot} className="flex items-center justify-center w-10">
                    <span
                      title={`${SLOT_LABELS[slot]} — ${done ? 'checked in' : 'missed'}`}
                      className={`w-3.5 h-3.5 rounded-full transition-colors ${
                        done
                          ? 'bg-accent-green'
                          : isCritical
                            ? 'bg-accent-red opacity-70'
                            : 'bg-bg-border'
                      }`}
                    />
                  </div>
                );
              })}

              {/* Compliance fraction */}
              <span className={`font-mono text-[10px] font-semibold text-right w-8 tabular-nums ${
                completed === 4 ? 'text-accent-green' :
                isCritical      ? 'text-accent-red'   :
                completed > 0   ? 'text-accent-yellow' :
                                  'text-text-muted'
              }`}>
                {entry.compliance}
              </span>
            </div>
          );
        })}

        {data.length === 0 && (
          <p className="font-mono text-xs text-text-muted text-center py-6">
            No check-in data available.
          </p>
        )}
      </div>
    </div>
  );
}