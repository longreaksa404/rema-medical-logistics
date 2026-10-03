// EventHistoryPage.tsx — past and current flood events (after-action reporting).
// Each event is archived when a SUPER_ADMIN closes it from the dashboard.

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../components/DashboardLayout';
import { alertApi } from '../api/alert';
import type { FloodEvent, TriggerCondition } from '../api/alert';
import { queryKeys } from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';

const CONDITION_LABELS: Record<TriggerCondition, string> = {
  warningLevelTwo:      'Warning level 2',
  rainfallExceeds100mm: 'Rainfall > 100mm',
  streetFloodingReport: 'Street flooding report',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(fromIso: string, toIso: string | null) {
  const ms = (toIso ? new Date(toIso).getTime() : Date.now()) - new Date(fromIso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function eventTitle(e: FloodEvent) {
  if (e.activatedAt) return `Flood event · activated ${fmtDateTime(e.activatedAt)}`;
  return e.status === 'OPEN' ? 'Standby · monitoring' : `Partial trigger · ${fmtDateTime(e.openedAt)}`;
}

export function EventHistoryPage() {
  usePageTitle('Event History');

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.alert.history(),
    queryFn: alertApi.getHistory,
  });

  return (
    <DashboardLayout title="Event History" onRefresh={() => refetch()} isRefreshing={isFetching}>
      <div className="space-y-4 max-w-5xl">
        <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
          One record per flood event · archived when a Super Admin closes the event · activity counted from opening to close
        </p>

        {isPending && <div className="card px-5 py-8 text-center font-mono text-xs text-text-muted">Loading events...</div>}

        {isError && (
          <div className="card px-5 py-4 font-mono text-xs text-accent-red">
            Could not load event history. Check your connection and refresh.
          </div>
        )}

        {data?.length === 0 && (
          <div className="card px-5 py-8 text-center font-mono text-xs text-text-muted">No flood events recorded yet.</div>
        )}

        {data?.map(event => <EventCard key={event.id} event={event} />)}
      </div>
    </DashboardLayout>
  );
}

function EventCard({ event }: { event: FloodEvent }) {
  const { stats } = event;
  const isOpen = event.status === 'OPEN';

  const timeline: Array<{ label: string; at: string | null }> = [
    { label: 'Opened',    at: event.openedAt },
    { label: 'Activated', at: event.activatedAt },
    { label: 'Phase 2',   at: event.phase2At },
    { label: 'Closed',    at: event.closedAt },
  ];

  return (
    <div className="card p-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="font-sans text-sm font-semibold text-text-primary">{eventTitle(event)}</p>
          <p className="font-mono text-[10px] text-text-muted mt-0.5">
            Phase reached: {event.phaseReached}
            {event.activatedAt && ` · active for ${fmtDuration(event.activatedAt, event.closedAt)}`}
            {event.closedBy && ` · closed by ${event.closedBy.name}`}
          </p>
        </div>
        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 ${
          isOpen
            ? 'text-accent-green border-accent-green/30 bg-accent-green/5'
            : 'text-text-muted border-bg-border bg-bg-elevated'
        }`}>
          {isOpen ? 'CURRENT' : 'ARCHIVED'}
        </span>
      </div>

      {/* timeline */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
        {timeline.map(step => (
          <div key={step.label}>
            <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest">{step.label}</p>
            <p className={`font-mono text-xs ${step.at ? 'text-text-primary' : 'text-text-muted'}`}>
              {step.at ? fmtDateTime(step.at) : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <Stat label="Households assessed"  value={stats.householdsAssessed} />
        <Stat label="Households delivered" value={stats.householdsDelivered} />
        <Stat
          label="Kits delivered"
          value={stats.kitsDelivered.EMK1 + stats.kitsDelivered.EMK2 + stats.kitsDelivered.EMK3}
          sub={`EMK1 ${stats.kitsDelivered.EMK1} · EMK2 ${stats.kitsDelivered.EMK2} · EMK3 ${stats.kitsDelivered.EMK3}`}
        />
        <Stat
          label="Delivery runs"
          value={stats.deliveryRuns.total}
          sub={`${stats.deliveryRuns.complete} complete · ${stats.deliveryRuns.aborted} aborted`
            + (stats.deliveryRuns.inProgress ? ` · ${stats.deliveryRuns.inProgress} active` : '')}
        />
        <Stat
          label="Incidents"
          value={stats.incidents.total}
          sub={stats.incidents.unresolved ? `${stats.incidents.unresolved} unresolved` : undefined}
          warn={stats.incidents.unresolved > 0}
        />
        <Stat label="Volunteers deployed" value={stats.volunteersDeployed} />
      </div>

      {/* triggers + incidents breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5">Activation conditions</p>
          {event.conditionReports.length === 0 ? (
            <p className="font-mono text-[10px] text-text-muted">None confirmed.</p>
          ) : (
            <ul className="space-y-1">
              {event.conditionReports.map((r, i) => (
                <li key={i} className="font-mono text-[10px] text-text-secondary">
                  <span className="text-text-primary">{CONDITION_LABELS[r.condition] ?? r.condition}</span>
                  {' · '}{r.reportedBy.name} ({r.reportedBy.role.replace(/_/g, ' ').toLowerCase()})
                  {' · '}{fmtDateTime(r.createdAt)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5">Incidents by type</p>
          {stats.incidents.total === 0 ? (
            <p className="font-mono text-[10px] text-text-muted">No incidents.</p>
          ) : (
            <ul className="space-y-1">
              {Object.entries(stats.incidents.byType).map(([type, count]) => (
                <li key={type} className="font-mono text-[10px] text-text-secondary">
                  {type.replace(/_/g, ' ').toLowerCase()} · <span className="text-text-primary">{count}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="font-mono text-[10px] text-text-muted mt-2">
            Radio check-ins: {stats.radioCheckins.total}
            {stats.radioCheckins.issuesReported > 0 && ` (${stats.radioCheckins.issuesReported} with issues)`}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, warn = false }: { label: string; value: number; sub?: string; warn?: boolean }) {
  return (
    <div className="bg-bg-elevated border border-bg-border rounded px-3 py-2 min-w-0">
      <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest truncate">{label}</p>
      <p className={`font-sans text-lg font-semibold ${warn ? 'text-accent-orange' : 'text-text-primary'}`}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="font-mono text-[9px] text-text-muted truncate" title={sub}>{sub}</p>}
    </div>
  );
}
