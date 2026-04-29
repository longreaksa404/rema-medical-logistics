import type { DashboardSummary } from '../api/dashboard';

interface DeliveryRunsPanelProps {
  activeRuns: number;
  districts: DashboardSummary['districts'];
}

export function DeliveryRunsPanel({ activeRuns, districts }: DeliveryRunsPanelProps) {
  const totalDelivered = districts.reduce((acc, d) => acc + d.deliveredCount, 0);
  const totalAssessed = districts.reduce((acc, d) => acc + d.householdsAssessed, 0);
  const deliveryPct = totalAssessed > 0 ? Math.round((totalDelivered / totalAssessed) * 100) : 0;

  return (
    <div className="card p-5 h-full flex flex-col bg-bg-card border border-bg-border relative">
      
      {/* Top Right Active Badge */}
      <div className="absolute top-5 right-5">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[10px] font-bold shadow-sm ${
          activeRuns > 0 
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' 
            : 'bg-bg-elevated border-bg-border text-text-muted'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${activeRuns > 0 ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`} />
          {activeRuns} ACTIVE RUNS
        </div>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between pb-4 border-b border-bg-border pr-32">
        <div>
          <h2 className="font-sans font-bold text-text-primary uppercase tracking-tight">Delivery Progress</h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[10px] font-mono text-text-muted">Total Completion</span>
          </div>
        </div>
      </div>

      {/* Main Progress Bar Area */}
      <div className="py-6">
        <div className="h-[5px] w-full bg-bg-border relative rounded-full">
          <div 
            className="absolute top-0 left-0 h-full rounded-full bg-accent-green transition-all duration-700 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
            style={{ width: `${deliveryPct}%` }}
          />
        </div>
        {/* Updated Footer: Removed Start/Target, replaced with Percentage + Volume */}
        <div className="flex justify-between items-baseline gap-3 mt-2 font-mono text-[9px] uppercase tracking-tighter">
          <span className="text-[15px] text-accent-green font-bold">{deliveryPct}%</span>
          <span className="text-text-secondary">{totalDelivered} / {totalAssessed} households</span>
        </div>
      </div>

      {/* District List */}
      <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="border-b border-bg-border text-text-muted font-medium text-[9px] font-mono">
              <th className="text-left py-2 w-[30%] uppercase">District</th>
              <th className="text-center py-2 w-[35%] uppercase">Volume</th>
              <th className="text-right py-2 w-[35%] uppercase">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border/40">
            {districts.map((d) => {
              const pct = d.householdsAssessed > 0 ? Math.round((d.deliveredCount / d.householdsAssessed) * 100) : 0;
              return (
                <tr key={d.districtId}>
                  <td className="py-4 text-[11px] font-medium text-text-secondary truncate pr-2">
                    {d.name}
                  </td>
                  <td className="py-4 text-center font-mono text-[10px] text-text-muted">
                    {d.deliveredCount}<span className="text-bg-border mx-1">/</span>{d.householdsAssessed}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className="font-mono text-[10px] text-text-primary w-8 shrink-0">
                        {pct}%
                      </span>
                      <div className="w-16 sm:w-24 md:w-[120px] h-1 bg-bg-border rounded-full overflow-hidden shrink-0">
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

      {/* Empty State */}
      {totalAssessed === 0 && (
        <div className="pt-4 border-t border-bg-border mt-auto">
          <p className="font-mono text-[9px] text-text-muted text-center uppercase tracking-widest italic">
            Awaiting Phase 1 Assessment Data Stream...
          </p>
        </div>
      )}
    </div>
  );
}