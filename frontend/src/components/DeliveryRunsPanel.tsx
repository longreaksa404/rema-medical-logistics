import type { DashboardSummary } from '../api/dashboard';

interface DeliveryRunsPanelProps {
  activeRuns: number;
  districts: DashboardSummary['districts'];
}

export function DeliveryRunsPanel({ activeRuns, districts }: DeliveryRunsPanelProps) {
  const totalDelivered = districts.reduce((acc, d) => acc + d.deliveredCount, 0);
  const totalAssessed = districts.reduce((acc, d) => acc + d.householdsAssessed, 0);
  const deliveryPct = totalAssessed > 0
    ? Math.round((totalDelivered / totalAssessed) * 100)
    : 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-sans font-bold text-text-primary">Delivery Progress</h2>
          <p className="font-mono text-[10px] text-text-muted mt-0.5">
            Across all active districts
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs ${
          activeRuns > 0
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
            : 'bg-bg-elevated border-bg-border text-text-muted'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${activeRuns > 0 ? 'bg-accent-green animate-pulse-slow' : 'bg-text-muted'}`} />
          {activeRuns} run{activeRuns !== 1 ? 's' : ''} active
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="font-mono text-[10px] text-text-muted">Overall delivery</span>
          <span className="font-mono text-[10px] text-text-secondary">
            {totalDelivered}/{totalAssessed} households
          </span>
        </div>
        <div className="h-2 bg-bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-green transition-all duration-500"
            style={{ width: `${Math.max(deliveryPct, deliveryPct > 0 ? 2 : 0)}%` }}
          />
        </div>
        <p className="font-mono text-[10px] text-text-muted mt-1">
          {deliveryPct}% delivered
        </p>
      </div>

      {/* Per-district breakdown */}
      <div className="space-y-2">
        {districts.map((d) => {
          const pct = d.householdsAssessed > 0
            ? Math.round((d.deliveredCount / d.householdsAssessed) * 100)
            : 0;

          return (
            <div key={d.districtId}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-[10px] text-text-secondary">{d.name}</span>
                <span className="font-mono text-[10px] text-text-muted">
                  {d.deliveredCount}/{d.householdsAssessed}
                </span>
              </div>
              <div className="h-1 bg-bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-green/70 transition-all duration-500"
                  style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {totalAssessed === 0 && (
        <p className="font-mono text-xs text-text-muted text-center py-2 mt-2">
          No households assessed yet. Assessment begins in Phase 1 Hours 8–16.
        </p>
      )}
    </div>
  );
}