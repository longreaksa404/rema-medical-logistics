import type { DashboardSummary } from '../api/dashboard';

interface DeliveryRunsPanelProps {
  activeRuns: number;
  districts: DashboardSummary['districts'];
}

export function DeliveryRunsPanel({ activeRuns, districts }: DeliveryRunsPanelProps) {
  const totalDelivered = districts.reduce((acc, d) => acc + d.deliveredCount, 0);
  const totalAssessed  = districts.reduce((acc, d) => acc + d.householdsAssessed, 0);
  const deliveryPct    = totalAssessed > 0 ? Math.round((totalDelivered / totalAssessed) * 100) : 0;

  return (
    <div className="card p-5 flex flex-col bg-bg-card border border-bg-border relative h-full">

      {/* Active runs badge */}
      <div className="absolute top-5 right-5">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[10px] font-bold ${
          activeRuns > 0
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
            : 'bg-bg-elevated border-bg-border text-text-muted'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${activeRuns > 0 ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`} />
          {activeRuns} ACTIVE RUNS
        </div>
      </div>

      {/* Header */}
      <div className="pb-3 border-b border-bg-border pr-32">
        <h2 className="font-sans font-bold text-text-primary uppercase tracking-tight">Delivery Progress</h2>
        <span className="font-mono text-[10px] text-text-muted">Total Completion</span>
      </div>

      {/* Overall progress bar */}
      <div className="py-3">
        <div className="h-[5px] w-full bg-bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-green transition-all duration-700 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
            style={{ width: `${deliveryPct}%` }}
          />
        </div>
        <div className="flex justify-between items-baseline mt-1.5 font-mono">
          <span className="text-[15px] text-accent-green font-bold">{deliveryPct}%</span>
          <span className="text-[9px] text-text-secondary uppercase tracking-tighter">
            {totalDelivered} / {totalAssessed} households
          </span>
        </div>
      </div>

      {/* District rows */}
      <div className="mt-1 flex-1">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="border-b border-bg-border text-text-muted font-mono text-[9px] uppercase">
              <th className="text-left py-1.5 w-[35%]">District</th>
              <th className="text-center py-1.5 w-[30%]">Volume</th>
              <th className="text-right py-1.5 w-[35%]">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border/40">
            {districts.map((d) => {
              const pct = d.householdsAssessed > 0
                ? Math.round((d.deliveredCount / d.householdsAssessed) * 100)
                : 0;
              return (
                <tr key={d.districtId}>
                  <td className="py-2.5 text-[11px] font-medium text-text-secondary truncate pr-2">
                    {d.name}
                  </td>
                  <td className="py-2.5 text-center font-mono text-[10px] text-text-muted">
                    {d.deliveredCount}<span className="text-bg-border mx-1">/</span>{d.householdsAssessed}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-[10px] text-text-primary w-7 shrink-0">{pct}%</span>
                      <div className="w-20 h-1 bg-bg-border rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-accent-green transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalAssessed === 0 && (
        <p className="font-mono text-[9px] text-text-muted text-center pt-3 border-t border-bg-border mt-auto uppercase tracking-widest italic">
          Awaiting Phase 1 Assessment Data Stream...
        </p>
      )}
    </div>
  );
}