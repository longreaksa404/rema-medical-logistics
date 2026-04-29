import { useState, useEffect } from 'react';
import { radioApi } from '../api/radio';
import type { RadioComplianceEntry } from '../api/radio';

const SLOT_LABELS: Record<string, string> = {
  T0800: '08:00',
  T1200: '12:00',
  T1600: '16:00',
  T2000: '20:00',
};

const ALL_SLOTS = ['T0800', 'T1200', 'T1600', 'T2000'];

export function RadioCompliancePanel() {
  const [data, setData] = useState<RadioComplianceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    radioApi.getCompliance()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="card p-5">
        <h2 className="font-sans font-bold text-text-primary mb-4">Radio Check-ins</h2>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-bg-elevated rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalSlots = data.length * 4;
  const completedSlots = data.reduce((acc, d) => acc + d.completedSlots.length, 0);
  const hasIssues = data.some(d => d.issuesReported);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-sans font-bold uppercase text-text-primary">Radio Check-ins</h2>
          <p className="font-mono text-[10px] text-text-muted mt-0.5">
            Today's schedule — 08:00 / 12:00 / 16:00 / 20:00
          </p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-lg font-semibold ${
            completedSlots === totalSlots ? 'text-accent-green' :
            completedSlots > 0 ? 'text-accent-yellow' : 'text-text-muted'
          }`}>
            {completedSlots}/{totalSlots}
          </p>
          <p className="font-mono text-[9px] text-text-muted">slots filled</p>
        </div>
      </div>

      {hasIssues && (
        <div className="mb-3 bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2">
          <p className="font-mono text-[10px] text-accent-red">
            ⚠ Issues reported in one or more check-ins today
          </p>
        </div>
      )}

      <div className="space-y-2">
        {data.map((entry) => {
          const completed = entry.completedSlots.length;
          const total = 4;
          const pct = Math.round((completed / total) * 100);

          return (
            <div key={entry.districtId} className="bg-bg-elevated rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {entry.issuesReported && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0" />
                  )}
                  <span className="font-sans text-sm text-text-primary">
                    {entry.districtName}
                  </span>
                  {entry.issuesReported && (
                    <span className="font-mono text-[9px] text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded border border-accent-red/20">
                      ISSUE
                    </span>
                  )}
                </div>
                <span className={`font-mono text-xs font-semibold ${
                  completed === total ? 'text-accent-green' :
                  completed > 0 ? 'text-accent-yellow' : 'text-text-muted'
                }`}>
                  {entry.compliance}
                </span>
              </div>

              {/* Slot grid */}
              <div className="flex gap-1.5">
                {ALL_SLOTS.map((slot) => {
                  const done = entry.completedSlots.includes(slot);
                  return (
                    <div
                      key={slot}
                      title={SLOT_LABELS[slot]}
                      className={`flex-1 rounded text-center py-1 transition-colors ${
                        done
                          ? 'bg-accent-green/20 border border-accent-green/30'
                          : 'bg-bg-border/50 border border-bg-border'
                      }`}
                    >
                      <span className={`font-mono text-[9px] ${
                        done ? 'text-accent-green' : 'text-text-muted'
                      }`}>
                        {SLOT_LABELS[slot]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <p className="font-mono text-xs text-text-muted text-center py-4">
            No check-in data available.
          </p>
        )}
      </div>
    </div>
  );
}