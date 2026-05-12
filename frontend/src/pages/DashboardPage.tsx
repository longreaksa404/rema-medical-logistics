import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PhaseBanner } from '../components/PhaseBanner';
import { StockChart } from '../components/StockChart';
import { PriorityQueueTable } from '../components/PriorityQueueTable';
import { RadioCompliancePanel } from '../components/RadioCompliancePanel';
import { DeliveryRunsPanel } from '../components/DeliveryRunsPanel';
import { dashboardApi } from '../api/dashboard';
import { aiApi } from '../api/ai';                          // Chat 20
import { AiBriefModal } from '../components/AiBriefModal';  // Chat 20
import { useAuth } from '../context/AuthContext';            // Chat 20
import type { DashboardSummary } from '../api/dashboard';
import type { AiBriefResponse } from '../api/ai';           // Chat 20

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-elevated rounded ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-48 lg:col-span-2" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

const StatCard = memo(function StatCard({
  label,
  value,
  sub,
  color = 'text-text-primary',
  pulse = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <div className="card px-4 py-3">
      <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        {pulse && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow flex-shrink-0 mb-0.5" />
        )}
        <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
      </div>
      {sub && (
        <p className="font-mono text-[10px] text-text-muted mt-0.5">{sub}</p>
      )}
    </div>
  );
});

// ─── INCIDENT PANEL ───────────────────────────────────────────────────────────

const IncidentPanel = memo(function IncidentPanel({
  incidents,
}: {
  incidents: DashboardSummary['openIncidents'];
}) {
  if (incidents.length === 0) return null;

  return (
    <div>
      <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
        Open Incidents
        <span className="ml-2 text-accent-red">{incidents.length}</span>
      </h2>
      <div className="card divide-y divide-bg-border">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className="px-4 py-3 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    inc.status === 'ESCALATED' ? 'bg-accent-red animate-pulse-slow' : 'bg-accent-orange'
                  }`}
                />
                <span
                  className={`font-mono text-[10px] font-semibold ${
                    inc.status === 'ESCALATED' ? 'text-accent-red' : 'text-accent-orange'
                  }`}
                >
                  {inc.status}
                </span>
                <span className="font-mono text-[10px] text-text-muted">
                  {inc.type.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="font-sans text-sm text-text-secondary truncate max-w-md">
                {inc.description}
              </p>
            </div>
            <span className="font-mono text-[10px] text-text-muted flex-shrink-0">
              {new Date(inc.createdAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── DISTRICT CARD ────────────────────────────────────────────────────────────

const DistrictCard = memo(function DistrictCard({
  d,
}: {
  d: DashboardSummary['districts'][number];
}) {
  const statusColors = {
    ACTIVE: 'text-accent-green border-accent-green/30 bg-accent-green/10',
    INACTIVE: 'text-text-muted border-bg-border bg-transparent',
    BACKUP_ACTIVATED: 'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/10',
  };
  const statusColor = d.subWarehouseStatus
    ? statusColors[d.subWarehouseStatus]
    : statusColors.INACTIVE;

  const stockColor =
    d.anyScarce ? 'bg-accent-red' :
    d.stockPct > 60 ? 'bg-accent-green' :
    d.stockPct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange';

  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-text-muted/30 transition-colors duration-150">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-sans font-bold text-text-primary">{d.name}</h3>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            {d.population.toLocaleString()} households
          </p>
        </div>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${statusColor}`}>
          {d.subWarehouseStatus ?? 'NO WAREHOUSE'}
        </span>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Stock Level
          </span>
          <span className={`font-mono text-xs ${d.anyScarce ? 'text-accent-red' : 'text-text-secondary'}`}>
            {d.stockPct}%{d.anyScarce ? ' ⚠ SCARCE' : ''}
          </span>
        </div>
        <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stockColor}`}
            style={{ width: `${Math.max(d.stockPct, 2)}%` }}
          />
        </div>
        {d.stock && (
          <div className="mt-2 grid grid-cols-3 gap-1">
            {(['emk1', 'emk2', 'emk3'] as const).map((type) => {
              const remaining = d.stock![`${type}Remaining`];
              const total = d.stock![`${type}Total`];
              return (
                <div key={type} className="bg-bg-elevated rounded px-2 py-1.5">
                  <p className="font-mono text-[9px] text-text-muted uppercase">
                    {type.toUpperCase()}
                  </p>
                  <p className="font-mono text-xs text-text-primary">
                    {remaining.toLocaleString()}
                    <span className="text-text-muted">/{total.toLocaleString()}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-bg-border">
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-text-primary">
            {d.householdsAssessed}
          </p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">
            Assessed
          </p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-accent-green">
            {d.deliveredCount}
          </p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">
            Delivered
          </p>
        </div>
        <div className="text-center">
          <p className={`font-mono text-lg font-semibold ${d.openIncidents > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
            {d.openIncidents}
          </p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">
            Incidents
          </p>
        </div>
      </div>
    </div>
  );
});

// ─── PRIORITY BANDS ───────────────────────────────────────────────────────────

const BAND_DISPLAY = [
  { key: 'critical' as const, label: 'Critical', color: 'text-accent-red', border: 'border-accent-red/20', bg: 'bg-accent-red/5', dot: 'bg-accent-red' },
  { key: 'high' as const, label: 'High', color: 'text-accent-orange', border: 'border-accent-orange/20', bg: 'bg-accent-orange/5', dot: 'bg-accent-orange' },
  { key: 'medium' as const, label: 'Medium', color: 'text-accent-yellow', border: 'border-accent-yellow/20', bg: 'bg-accent-yellow/5', dot: 'bg-accent-yellow' },
  { key: 'standard' as const, label: 'Standard', color: 'text-accent-green', border: 'border-accent-green/20', bg: 'bg-accent-green/5', dot: 'bg-accent-green' },
] as const;

// ─── AI BRIEF BUTTON ──────────────────────────────────────────────────────────
// Visible only to EMERGENCY_COORDINATOR and SUPER_ADMIN.

const AiBriefButton = memo(function AiBriefButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded border font-mono text-xs
        transition-all duration-150
        ${isLoading
          ? 'border-bg-border text-text-muted cursor-not-allowed bg-bg-elevated'
          : 'border-accent-blue/40 text-accent-blue bg-accent-blue/5 hover:bg-accent-blue/10 hover:border-accent-blue/60'
        }
      `}
    >
      {isLoading ? (
        <>
          <div className="w-3.5 h-3.5 border border-text-muted border-t-accent-blue rounded-full animate-spin flex-shrink-0" />
          Generating brief...
        </>
      ) : (
        <>
          <span>🤖</span>
          Generate AI Brief
        </>
      )}
    </button>
  );
});

// ─── MAIN DASHBOARD PAGE ──────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth(); // Chat 20 — role check for AI Brief button

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  // ── Chat 20: AI Brief state ──────────────────────────────────────────────────
  const [aiBriefOpen, setAiBriefOpen] = useState(false);
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [aiBriefResult, setAiBriefResult] = useState<AiBriefResponse | null>(null);
  const [aiBriefError, setAiBriefError] = useState('');

  // Only EC and SUPER_ADMIN can see the AI Brief button
  const canUseAiBrief =
    user?.role === 'EMERGENCY_COORDINATOR' || user?.role === 'SUPER_ADMIN';

  const handleGenerateBrief = useCallback(async () => {
    setAiBriefOpen(true);
    setAiBriefLoading(true);
    setAiBriefResult(null);
    setAiBriefError('');
    try {
      const result = await aiApi.generateBrief();
      setAiBriefResult(result);
    } catch (err: unknown) {
      // Show user-friendly error — do not crash
      const msg =
        err instanceof Error
          ? err.message
          : 'AI Brief temporarily unavailable — use dashboard directly.';
      setAiBriefError(msg);
    } finally {
      setAiBriefLoading(false);
    }
  }, []);

  const handleCloseBrief = useCallback(() => {
    setAiBriefOpen(false);
  }, []);

  // ── Fetch: dashboard summary ─────────────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const fresh = await dashboardApi.getSummary();
      setData(fresh);
      setIsStale(false);
      setLastUpdated(new Date());
      setError('');
    } catch {
      if (!silent) setError('Failed to refresh. Showing cached data.');
      setIsStale(true);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const result = await dashboardApi.getSummaryCached();
        setData(result.data);
        setLastUpdated(new Date());
        setIsStale(result.isStale);
        if (result.fromCache) {
          fetchAll(true);
        }
      } catch {
        await fetchAll(false);
      } finally {
        setFirstLoad(false);
      }
    };
    init();
  }, [fetchAll]);

  // ── Auto-poll every 30s ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    await fetchAll(false);
  }, [fetchAll]);

  // ── Memoised derived data ─────────────────────────────────────────────────────
  const topStats = useMemo(() => {
    if (!data) return null;
    return {
      activeRuns: data.activeDeliveryRuns,
      pendingDelivery: data.households.pendingDelivery,
      delivered: data.households.delivered,
      deliveryPct: data.households.total > 0
        ? Math.round((data.households.delivered / data.households.total) * 100)
        : 0,
      todayCheckins: data.todayRadioCheckins,
      totalScheduled: data.districts.length * 4,
    };
  }, [data]);

  if (firstLoad && !data) {
    return (
      <DashboardLayout title="Operations Dashboard">
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Operations Dashboard"
      onRefresh={handleRefresh}
      lastUpdated={lastUpdated}
      isRefreshing={isRefreshing}
    >
      {/* ── AI Brief Modal (Chat 20) ── */}
      <AiBriefModal
        isOpen={aiBriefOpen}
        isLoading={aiBriefLoading}
        result={aiBriefResult}
        error={aiBriefError}
        onClose={handleCloseBrief}
      />

      {isStale && !isRefreshing && (
        <div className="mb-4 bg-accent-yellow/10 border border-accent-yellow/30 rounded px-4 py-2 animate-fade-in">
          <p className="font-mono text-xs text-accent-yellow">
            Showing cached data — refreshing in background...
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-accent-red/10 border border-accent-red/30 rounded px-4 py-2 animate-slide-in">
          <p className="font-mono text-xs text-accent-red">{error}</p>
        </div>
      )}

      {data && topStats && (
        <div className="space-y-6 animate-fade-in">

          {/* ── PHASE BANNER ── */}
          <PhaseBanner
            phase={data.phase}
            activated={data.activated}
            activatedAt={data.activatedAt}
            triggerConditions={data.triggerConditions}
          />

          {/* ── AI BRIEF BUTTON (EC + SUPER_ADMIN only) ── */}
          {canUseAiBrief && (
            <div className="flex justify-end">
              <AiBriefButton
                onClick={handleGenerateBrief}
                isLoading={aiBriefLoading}
              />
            </div>
          )}

          {/* ── TOP STATS ROW ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Active Runs"
              value={topStats.activeRuns}
              color={topStats.activeRuns > 0 ? 'text-accent-green' : 'text-text-muted'}
              pulse={topStats.activeRuns > 0}
            />
            <StatCard
              label="Pending Delivery"
              value={topStats.pendingDelivery}
              sub={`${data.households.total} total assessed`}
              color="text-accent-blue"
            />
            <StatCard
              label="Delivered"
              value={topStats.delivered}
              sub={`${topStats.deliveryPct}% complete`}
              color="text-accent-green"
            />
            <StatCard
              label="Check-ins Today"
              value={topStats.todayCheckins}
              sub={`of ${topStats.totalScheduled} scheduled`}
              color={topStats.todayCheckins === topStats.totalScheduled
                ? 'text-accent-green'
                : 'text-text-primary'}
            />
          </div>

          {/* ── PRIORITY BANDS ── */}
          <div>
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
              Household Priority Bands
              <span className="ml-2 text-text-muted font-normal normal-case">(undelivered)</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BAND_DISPLAY.map(({ key, label, color, border, bg, dot }) => (
                <div key={key} className={`card border ${border} ${bg} px-4 py-3`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <p className={`font-mono text-[10px] uppercase tracking-widest ${color}`}>
                      {label}
                    </p>
                  </div>
                  <p className={`font-mono text-2xl font-semibold ${color}`}>
                    {data.households[key]}
                  </p>
                  {key === 'critical' && data.households.critical > 0 && (
                    <p className="font-mono text-[9px] text-accent-red mt-0.5 animate-pulse-slow">
                      Deliver in current run
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── STOCK CHART ── */}
          <StockChart districts={data.districts} />

          {/* ── DELIVERY + RADIO ROW ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <DeliveryRunsPanel
                activeRuns={data.activeDeliveryRuns}
                districts={data.districts}
              />
            </div>
            <RadioCompliancePanel />
          </div>

          {/* ── DISTRICT CARDS ── */}
          <div>
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
              Districts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.districts.map((d) => (
                <DistrictCard key={d.districtId} d={d} />
              ))}
            </div>
          </div>

          {/* ── PRIORITY QUEUE TABLE ── */}
          <div>
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
              Household Priority Queue
            </h2>
            <PriorityQueueTable districts={data.districts} />
          </div>

          {/* ── INCIDENTS ── */}
          <IncidentPanel incidents={data.openIncidents} />

        </div>
      )}
    </DashboardLayout>
  );
}