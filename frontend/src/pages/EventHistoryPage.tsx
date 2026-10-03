// EventHistoryPage.tsx — past and current flood events (after-action reporting).
// Each event is archived when a SUPER_ADMIN closes it from the dashboard.

import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check, ChevronDown, ClipboardCheck, Flag, House, Package, Radio, TriangleAlert, Truck, Users,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { alertApi } from '../api/alert';
import type { FloodEvent, TriggerCondition } from '../api/alert';
import { queryKeys } from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';

type Icon = ComponentType<{ size?: number; className?: string }>;

const CONDITION_LABELS: Record<TriggerCondition, string> = {
  warningLevelTwo:      'Warning level 2',
  rainfallExceeds100mm: 'Rainfall > 100mm',
  streetFloodingReport: 'Street flooding report',
};

// Phase colours mirror the phase tokens in tailwind.config.js
const PHASE_STYLES: Record<number, string> = {
  0: 'text-text-secondary border-bg-border bg-bg-elevated',
  1: 'text-accent-orange border-accent-orange/30 bg-accent-orange/10',
  2: 'text-accent-red border-accent-red/30 bg-accent-red/10',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(fromIso: string, toIso: string | null) {
  const ms = (toIso ? new Date(toIso).getTime() : Date.now()) - new Date(fromIso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function eventTitle(e: FloodEvent) {
  if (e.activatedAt) return `Flood event · ${fmtDateTime(e.activatedAt)}`;
  return e.status === 'OPEN' ? 'Standby · monitoring' : `Partial trigger · ${fmtDateTime(e.openedAt)}`;
}

function totalKits(e: FloodEvent) {
  const k = e.stats.kitsDelivered;
  return k.EMK1 + k.EMK2 + k.EMK3;
}

// Nothing happened in the field — no assessments, runs, incidents or check-ins
function hasNoActivity(e: FloodEvent) {
  const s = e.stats;
  return s.householdsAssessed + s.deliveryRuns.total + s.incidents.total
    + s.radioCheckins.total + s.volunteersDeployed === 0;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export function EventHistoryPage() {
  usePageTitle('Event History');

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.alert.history(),
    queryFn: alertApi.getHistory,
  });

  return (
    <DashboardLayout title="Event History" onRefresh={() => refetch()} isRefreshing={isFetching}>
      <div className="space-y-5 max-w-6xl">
        <p className="font-mono text-[11px] text-text-secondary leading-relaxed">
          One record per flood event. Events are archived when a Super Admin closes them;
          activity is counted from opening to close.
        </p>

        {isPending && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading events">
            <div className="card h-[88px] animate-pulse" />
            {[0, 1, 2].map(i => <div key={i} className="card h-[76px] animate-pulse" />)}
          </div>
        )}

        {isError && (
          <div className="card px-5 py-4 font-mono text-xs text-accent-red">
            Could not load event history. Check your connection and refresh.
          </div>
        )}

        {data?.length === 0 && (
          <div className="card px-5 py-10 text-center">
            <Flag size={20} className="mx-auto mb-2 text-text-muted" />
            <p className="font-mono text-xs text-text-secondary">No flood events recorded yet.</p>
          </div>
        )}

        {data && data.length > 0 && <Summary events={data} />}

        {data && data.some(e => e.status === 'OPEN') && (
          <section className="space-y-3">
            <GroupHeading label="Current event" />
            {data.filter(e => e.status === 'OPEN').map(event => <EventCard key={event.id} event={event} />)}
          </section>
        )}

        {data && data.some(e => e.status === 'CLOSED') && (
          <section className="space-y-3">
            <GroupHeading label="Archived" count={data.filter(e => e.status === 'CLOSED').length} />
            {data.filter(e => e.status === 'CLOSED').map(event => <EventCard key={event.id} event={event} />)}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────

function Summary({ events }: { events: FloodEvent[] }) {
  const sum = (fn: (e: FloodEvent) => number) => events.reduce((n, e) => n + fn(e), 0);
  const items = [
    { label: 'Events recorded',      value: events.length },
    { label: 'Households delivered', value: sum(e => e.stats.householdsDelivered) },
    { label: 'Kits delivered',       value: sum(totalKits) },
    { label: 'Incidents logged',     value: sum(e => e.stats.incidents.total) },
  ];

  return (
    <div className="card grid grid-cols-2 md:grid-cols-4 divide-bg-border md:divide-x">
      {items.map(item => (
        <div key={item.label} className="px-5 py-4">
          <p className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">{item.label}</p>
          <p className="font-sans text-2xl font-semibold text-text-primary mt-1 tabular-nums">
            {item.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: FloodEvent }) {
  const { stats } = event;
  const isOpen = event.status === 'OPEN';
  const [expanded, setExpanded] = useState(isOpen);
  const kits = totalKits(event);

  return (
    <div className={`card overflow-hidden ${isOpen ? 'border-accent-green/40' : ''}`}>
      {isOpen && <div className="h-0.5 bg-accent-green/70" />}

      {/* header — toggles details */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-bg-elevated/40 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge open={isOpen} />
            <PhaseBadge phase={event.phaseReached} />
            <h2 className="font-sans text-[15px] font-semibold text-text-primary">{eventTitle(event)}</h2>
          </div>
          <p className="font-mono text-[11px] text-text-secondary mt-1.5">
            {event.activatedAt
              ? `${isOpen ? 'Active for' : 'Ran for'} ${fmtDuration(event.activatedAt, event.closedAt)}`
              : `Opened ${fmtDateTime(event.openedAt)}`}
            {event.closedBy && ` · closed by ${event.closedBy.name}`}
          </p>
        </div>

        {!expanded && (
          <div className="hidden sm:flex items-center gap-5 font-mono text-[11px] text-text-secondary">
            <InlineFigure icon={House} value={stats.householdsDelivered} label="households" />
            <InlineFigure icon={Package} value={kits} label="kits" />
            <InlineFigure
              icon={TriangleAlert}
              value={stats.incidents.total}
              label="incidents"
              warn={stats.incidents.unresolved > 0}
            />
          </div>
        )}

        <ChevronDown
          size={16}
          className={`text-text-secondary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-bg-border pt-5 animate-fade-in">
          <Timeline event={event} />

          {hasNoActivity(event) ? (
            <div className="rounded-md border border-dashed border-bg-border px-4 py-5 text-center">
              <p className="font-sans text-sm text-text-secondary">No field activity was recorded during this event.</p>
              <p className="font-mono text-[11px] text-text-muted mt-1">No assessments, delivery runs, incidents or radio check-ins.</p>
            </div>
          ) : (
          <>
          {/* stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Stat icon={ClipboardCheck} label="Households assessed" value={stats.householdsAssessed} />
            <Stat icon={House} label="Households delivered" value={stats.householdsDelivered}>
              {stats.householdsAssessed > 0 && (
                <Meter
                  value={pct(stats.householdsDelivered, stats.householdsAssessed)}
                  caption={`${pct(stats.householdsDelivered, stats.householdsAssessed)}% of assessed`}
                />
              )}
            </Stat>
            <Stat icon={Package} label="Kits delivered" value={kits}>
              <div className="flex flex-wrap gap-1">
                {(['EMK1', 'EMK2', 'EMK3'] as const).map(k => (
                  <span key={k} className="font-mono text-[10px] text-text-secondary bg-bg-secondary border border-bg-border rounded px-1.5 py-px">
                    {k} <span className="text-text-primary">{stats.kitsDelivered[k]}</span>
                  </span>
                ))}
              </div>
            </Stat>
            <Stat icon={Truck} label="Delivery runs" value={stats.deliveryRuns.total}>
              <p className="font-mono text-[10px] text-text-secondary">
                {stats.deliveryRuns.complete} complete · {stats.deliveryRuns.aborted} aborted
                {stats.deliveryRuns.inProgress > 0 && (
                  <span className="text-accent-blue"> · {stats.deliveryRuns.inProgress} active</span>
                )}
              </p>
            </Stat>
            <Stat
              icon={TriangleAlert}
              label="Incidents"
              value={stats.incidents.total}
              warn={stats.incidents.unresolved > 0}
            >
              {stats.incidents.unresolved > 0 && (
                <p className="font-mono text-[10px] text-accent-orange">{stats.incidents.unresolved} unresolved</p>
              )}
            </Stat>
            <Stat icon={Users} label="Volunteers deployed" value={stats.volunteersDeployed} />
          </div>

          </>
          )}

          {/* triggers + incidents breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section
              title="Activation conditions"
              aside={`${Object.values(event.conditions).filter(Boolean).length} of 3 met`}
            >
              <ul className="space-y-2.5">
                {(Object.keys(CONDITION_LABELS) as TriggerCondition[]).map(cond => {
                  const report = event.conditionReports.find(r => r.condition === cond);
                  const met = event.conditions[cond] || !!report;
                  return (
                    <li key={cond} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        met ? 'bg-accent-orange/15 text-accent-orange' : 'border border-bg-border'
                      }`}>
                        {met && <Check size={10} strokeWidth={3} />}
                      </span>
                      <div className="min-w-0">
                        <p className={`font-sans text-xs font-semibold ${met ? 'text-text-primary' : 'text-text-muted'}`}>
                          {CONDITION_LABELS[cond]}
                        </p>
                        <p className="font-mono text-[10px] text-text-secondary mt-0.5">
                          {report
                            ? `${report.reportedBy.name} · ${report.reportedBy.role.replace(/_/g, ' ').toLowerCase()} · ${fmtDateTime(report.createdAt)}`
                            : met ? 'Confirmed · reporter not recorded' : 'Not confirmed'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>

            <Section title="Incidents by type">
              {stats.incidents.total === 0 ? (
                <p className="font-mono text-[11px] text-text-secondary">No incidents.</p>
              ) : (
                <ul className="space-y-2">
                  {Object.entries(stats.incidents.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <li key={type} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 font-mono text-[11px]">
                        <span className="text-text-secondary capitalize truncate">{type.replace(/_/g, ' ').toLowerCase()}</span>
                        <span className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                          <span
                            className={`block h-full rounded-full ${type === 'VOLUNTEER_SAFETY' ? 'bg-accent-red' : 'bg-accent-orange/70'}`}
                            style={{ width: `${pct(count, stats.incidents.total)}%` }}
                          />
                        </span>
                        <span className="text-text-primary tabular-nums w-5 text-right">{count}</span>
                      </li>
                    ))}
                </ul>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-bg-border font-mono text-[11px] text-text-secondary">
                <Radio size={12} />
                <span>
                  Radio check-ins: <span className="text-text-primary">{stats.radioCheckins.total}</span>
                  {stats.radioCheckins.issuesReported > 0 && (
                    <span className="text-accent-orange"> ({stats.radioCheckins.issuesReported} with issues)</span>
                  )}
                </span>
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PIECES ───────────────────────────────────────────────────────────────────

function StatusBadge({ open }: { open: boolean }) {
  return open ? (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded border text-accent-green border-accent-green/30 bg-accent-green/10">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse-slow" />
      CURRENT
    </span>
  ) : (
    <span className="font-mono text-[10px] px-2 py-0.5 rounded border text-text-secondary border-bg-border bg-bg-elevated">
      ARCHIVED
    </span>
  );
}

function PhaseBadge({ phase }: { phase: number }) {
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${PHASE_STYLES[phase] ?? PHASE_STYLES[0]}`}>
      PHASE {phase}
    </span>
  );
}

function Timeline({ event }: { event: FloodEvent }) {
  // older events can have reached a phase before its timestamp was tracked
  const steps: Array<{ label: string; at: string | null; reached: boolean; dot: string }> = [
    { label: 'Opened',    at: event.openedAt,    reached: true,                     dot: 'bg-text-secondary' },
    { label: 'Activated', at: event.activatedAt, reached: event.phaseReached >= 1,  dot: 'bg-accent-orange' },
    { label: 'Phase 2',   at: event.phase2At,    reached: event.phaseReached >= 2,  dot: 'bg-accent-red' },
    { label: 'Closed',    at: event.closedAt,    reached: event.status === 'CLOSED', dot: 'bg-text-primary' },
  ];

  return (
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-y-4">
      {steps.map((step, i) => {
        const filled = step.at || step.reached;
        // a segment is solid only when both of its ends were reached
        const nextReached = filled && steps[i + 1]?.reached;
        return (
          <li key={step.label} className="relative pr-3">
            <div className="flex items-center mb-2">
              <span
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  filled ? step.dot : 'border border-text-muted bg-transparent'
                }`}
              />
              {i < steps.length - 1 && (
                <span className={`hidden sm:block h-px flex-1 ml-2 ${nextReached ? 'bg-text-secondary/50' : 'border-t border-dashed border-bg-border'}`} />
              )}
            </div>
            <p className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">{step.label}</p>
            {step.at ? (
              <p className="font-mono text-xs text-text-primary mt-0.5">
                {fmtDate(step.at)} <span className="text-text-secondary">{fmtTime(step.at)}</span>
              </p>
            ) : step.reached ? (
              <p className="font-mono text-xs text-text-secondary mt-0.5">Reached · time not recorded</p>
            ) : (
              <p className="font-mono text-xs text-text-muted mt-0.5">{event.status === 'OPEN' ? 'Pending' : 'Not reached'}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Stat({ icon: IconCmp, label, value, warn = false, children }: {
  icon: Icon; label: string; value: number; warn?: boolean; children?: ReactNode;
}) {
  return (
    <div className="bg-bg-elevated border border-bg-border rounded-md px-3.5 py-3 min-w-0">
      <div className="flex items-center gap-1.5 text-text-secondary">
        <IconCmp size={12} />
        <p className="font-mono text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`font-sans text-2xl font-semibold mt-1 tabular-nums ${
        warn ? 'text-accent-orange' : value === 0 ? 'text-text-secondary' : 'text-text-primary'
      }`}>
        {value.toLocaleString()}
      </p>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

function InlineFigure({ icon: IconCmp, value, label, warn = false }: {
  icon: Icon; value: number; label: string; warn?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${warn ? 'text-accent-orange' : ''}`}>
      <IconCmp size={12} />
      <span className={`tabular-nums ${warn ? '' : 'text-text-primary'}`}>{value.toLocaleString()}</span>
      {label}
    </span>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-bg-border px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <p className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">{title}</p>
        {aside && <p className="font-mono text-[10px] text-text-muted">{aside}</p>}
      </div>
      {children}
    </div>
  );
}

function GroupHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <h2 className="font-mono text-[11px] text-text-secondary uppercase tracking-widest">
        {label}{count !== undefined && <span className="text-text-muted"> · {count}</span>}
      </h2>
      <span className="h-px flex-1 bg-bg-border" />
    </div>
  );
}

function Meter({ value, caption }: { value: number; caption: string }) {
  return (
    <div>
      <div className="h-1 rounded-full bg-bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-accent-green" style={{ width: `${value}%` }} />
      </div>
      <p className="font-mono text-[10px] text-text-secondary mt-1">{caption}</p>
    </div>
  );
}
