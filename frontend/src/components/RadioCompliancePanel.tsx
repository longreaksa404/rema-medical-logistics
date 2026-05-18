import { useQuery } from '@tanstack/react-query';
import { radioApi } from '../api/radio';
import { queryKeys } from '../api/queryKeys';
import type { RadioComplianceEntry } from '../api/radio';

const SLOT_LABELS: Record<string, string> = {
  T0800: '08:00', T1200: '12:00', T1600: '16:00', T2000: '20:00',
};

const SLOT_HOURS: Record<string, number> = {
  T0800: 8, T1200: 12, T1600: 16, T2000: 20,
};

const ALL_SLOTS = ['T0800', 'T1200', 'T1600', 'T2000'];

// Returns true only if the slot time has already passed today
function isSlotPastDue(slot: string): boolean {
  const now = new Date();
  return now.getHours() >= SLOT_HOURS[slot];
}

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

  // Only count past-due slots as missed
  const totalPastDueSlots  = data.length * ALL_SLOTS.filter(isSlotPastDue).length;
  const completedSlots     = data.reduce(
    (acc: number, d: RadioComplianceEntry) => acc + d.completedSlots.length, 0,
  );

  const hasCritical = data.some((d: RadioComplianceEntry) => {
    const missed = ALL_SLOTS.filter(s => !d.completedSlots.includes(s) && isSlotPastDue(s)).length;
    return missed >= 2;
  });

  const hasIssues = data.some((d: RadioComplianceEntry) => d.issuesReported);

  const overallColor =
    completedSlots === totalPastDueSlots && totalPastDueSlots > 0 ? 'text-accent-green' :
    hasCritical                                                    ? 'text-accent-red'   :
    completedSlots > 0                                             ? 'text-accent-yellow' :
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
            {completedSlots}/{data.length * 4}
          </p>
          <p className="font-mono text-[9px] text-text-muted">slots filled</p>
        </div>
      </div>

      {/* Compliance progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Today's Compliance
          </span>
          <span className={`font-mono text-[10px] font-semibold tabular-nums ${overallColor}`}>
            {completedSlots} of {data.length * 4} slots
          </span>
        </div>
        <div className="h-1.5 w-full bg-bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              hasCritical        ? 'bg-accent-red'    :
              completedSlots === data.length * 4 ? 'bg-accent-green' :
              completedSlots > 0 ? 'bg-accent-yellow' : 'bg-bg-border'
            }`}
            style={{ width: `${data.length * 4 > 0 ? Math.round((completedSlots / (data.length * 4)) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Alert banners */}
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

      {/* Column headers */}
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
      <div className="flex-1 space-y-2">
        {data.map((entry: RadioComplianceEntry) => {
          // Only count slots that are actually past due as missed
          const missed     = ALL_SLOTS.filter(s => !entry.completedSlots.includes(s) && isSlotPastDue(s)).length;
          const isCritical = missed >= 2;

          return (
            <div
              key={entry.districtId}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-x-5 py-2.5 px-2 rounded-lg ${
                isCritical ? 'bg-accent-red/5 border border-accent-red/15' : 'bg-bg-elevated/40'
              }`}
            >
              {/* District name + badge */}
              <div className="flex items-center gap-2 min-w-0 pr-2">
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
                const done    = entry.completedSlots.includes(slot);
                const pastDue = isSlotPastDue(slot);
                return (
                  <div key={slot} className="flex items-center justify-center w-10">
                    <span
                      title={`${SLOT_LABELS[slot]} — ${done ? 'checked in' : pastDue ? 'missed' : 'upcoming'}`}
                      style={{ width: '1.375rem' }}
                      className={`h-2.5 rounded-full transition-colors ${
                        done
                          ? 'bg-accent-green'
                          : pastDue
                            ? isCritical
                              ? 'bg-accent-red opacity-70'
                              : 'bg-accent-red opacity-40'
                            : 'bg-bg-border'  // future slot — neutral grey
                      }`}
                    />
                  </div>
                );
              })}

              {/* Fill fraction */}
              <span className={`font-mono text-[10px] font-semibold text-right w-8 tabular-nums ${
                entry.completedSlots.length === 4 ? 'text-accent-green' :
                isCritical                        ? 'text-accent-red'   :
                entry.completedSlots.length > 0   ? 'text-accent-yellow' :
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