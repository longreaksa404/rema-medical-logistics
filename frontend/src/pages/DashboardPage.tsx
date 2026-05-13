import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PhaseBanner } from '../components/PhaseBanner';
import { StockChart } from '../components/StockChart';
import { PriorityQueueTable } from '../components/PriorityQueueTable';
import { RadioCompliancePanel } from '../components/RadioCompliancePanel';
import { DeliveryRunsPanel } from '../components/DeliveryRunsPanel';
import { dashboardApi } from '../api/dashboard';
import { aiApi } from '../api/ai';
import { alertApi } from '../api/alert';
import { AiBriefModal } from '../components/AiBriefModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import type { DashboardSummary } from '../api/dashboard';
import type { AiBriefResponse } from '../api/ai';
import { usePageTitle } from '../hooks/usePageTitle';

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
          <div key={inc.id} className="px-4 py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  inc.status === 'ESCALATED' ? 'bg-accent-red animate-pulse-slow' : 'bg-accent-orange'
                }`} />
                <span className={`font-mono text-[10px] font-semibold ${
                  inc.status === 'ESCALATED' ? 'text-accent-red' : 'text-accent-orange'
                }`}>
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
              {new Date(inc.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
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
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">Stock Level</span>
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
                  <p className="font-mono text-[9px] text-text-muted uppercase">{type.toUpperCase()}</p>
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
          <p className="font-mono text-lg font-semibold text-text-primary">{d.householdsAssessed}</p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Assessed</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-accent-green">{d.deliveredCount}</p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Delivered</p>
        </div>
        <div className="text-center">
          <p className={`font-mono text-lg font-semibold ${d.openIncidents > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
            {d.openIncidents}
          </p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Incidents</p>
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

// ─── TRIGGER PANEL ────────────────────────────────────────────────────────────
// NOT wrapped in memo — conditions must re-render instantly on parent state change

type TriggerConditionKey = 'warningLevelTwo' | 'rainfallExceeds100mm' | 'streetFloodingReport';

interface TriggerConditions {
  warningLevelTwo: boolean;
  rainfallExceeds100mm: boolean;
  streetFloodingReport: boolean;
}

function TriggerPanel({
  onTrigger,
  currentConditions,
}: {
  onTrigger: (condition: TriggerConditionKey) => void;
  currentConditions: TriggerConditions;
}) {
  const conditions: { key: TriggerConditionKey; label: string; desc: string }[] = [
    { key: 'warningLevelTwo', label: 'Warning Lv.2', desc: 'City/provincial flood warning Level 2 or above' },
    { key: 'rainfallExceeds100mm', label: '100mm Rain', desc: 'Rainfall forecast exceeds 100mm in 24 hours' },
    { key: 'streetFloodingReport', label: 'Street Flooding', desc: 'Any target district reports street-level flooding' },
  ];

  const trueCount = Object.values(currentConditions).filter(Boolean).length;

  return (
    <div className="card border border-accent-yellow/20 bg-accent-yellow/5 p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-mono text-xs text-accent-yellow uppercase tracking-widest">
            Activation Required
          </h3>
          <p className="font-mono text-[10px] text-text-muted mt-0.5">
            Submit any 2 of 3 conditions to activate REMA Phase 1 — Section A.3
          </p>
        </div>
        <span className={`font-mono text-xs px-2 py-0.5 rounded border flex-shrink-0 ${
          trueCount >= 2
            ? 'text-accent-green border-accent-green/30 bg-accent-green/10'
            : 'text-text-muted border-bg-border'
        }`}>
          {trueCount}/3 met
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {conditions.map(({ key, label, desc }) => {
          const active = currentConditions[key];
          return (
            <button
              key={key}
              onClick={() => { if (!active) onTrigger(key); }}
              disabled={active}
              title={desc}
              className={`
                flex items-center gap-2 px-3 py-2.5 rounded border text-left
                transition-all duration-150
                ${active
                  ? 'border-accent-green/40 bg-accent-green/10 text-accent-green cursor-default'
                  : 'border-bg-border text-text-muted hover:border-accent-yellow/40 hover:text-accent-yellow hover:bg-accent-yellow/5 active:scale-95 cursor-pointer'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-150 ${
                active ? 'bg-accent-green' : 'bg-bg-border'
              }`} />
              <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
              {active && (
                <span className="ml-auto font-mono text-[9px] text-accent-green">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {trueCount === 1 && (
        <p className="font-mono text-[9px] text-accent-yellow mt-3 animate-pulse-slow">
          1 more condition needed to activate REMA
        </p>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD PAGE ──────────────────────────────────────────────────────

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  // ── Separate optimistic trigger conditions state ───────────────────────────
  // This is the single source of truth for the TriggerPanel display.
  // It updates instantly on click — never waits for the API.
  const [localConditions, setLocalConditions] = useState<TriggerConditions>({
    warningLevelTwo: false,
    rainfallExceeds100mm: false,
    streetFloodingReport: false,
  });

  // ── AI Brief state ────────────────────────────────────────────────────────
  const [aiBriefOpen, setAiBriefOpen] = useState(false);
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [aiBriefResult, setAiBriefResult] = useState<AiBriefResponse | null>(null);
  const [aiBriefError, setAiBriefError] = useState('');

  // ── Phase / reset state ───────────────────────────────────────────────────
  const [resetLoading, setResetLoading] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [advancePhaseLoading, setAdvancePhaseLoading] = useState(false);
  const [phaseError, setPhaseError] = useState('');

  // ── Role checks ───────────────────────────────────────────────────────────
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isEC = user?.role === 'EMERGENCY_COORDINATOR' || user?.role === 'SUPER_ADMIN';

  const showReset = isSuperAdmin && !!(data && (data.activated || data.phase > 0));
  const showTriggerPanel = isEC && !!(data && !data.activated && data.phase === 0);
  const showAdvancePhase = isEC && !!(data && data.activated && data.phase === 1);
  const canUseAiBrief = isEC;

  // ── Sync localConditions from server data ─────────────────────────────────
  // When real data arrives, update localConditions to match server truth
  useEffect(() => {
    if (data?.triggerConditions) {
      setLocalConditions({
        warningLevelTwo: data.triggerConditions.warningLevelTwo,
        rainfallExceeds100mm: data.triggerConditions.rainfallExceeds100mm,
        streetFloodingReport: data.triggerConditions.streetFloodingReport,
      });
    }
  }, [data?.triggerConditions]);

  // ── AI Brief handlers ─────────────────────────────────────────────────────
  const handleGenerateBrief = useCallback(async () => {
    setAiBriefOpen(true);
    setAiBriefLoading(true);
    setAiBriefResult(null);
    setAiBriefError('');
    try {
      const result = await aiApi.generateBrief();
      setAiBriefResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : 'AI Brief temporarily unavailable — use dashboard directly.';
      setAiBriefError(msg);
    } finally {
      setAiBriefLoading(false);
    }
  }, []);

  // ── Dashboard fetch ───────────────────────────────────────────────────────
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

  const handleCloseBrief = useCallback(() => setAiBriefOpen(false), []);

  // ── Reset handler ─────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setConfirmResetOpen(true);
  }, []);

  const handleConfirmReset = useCallback(async () => {
    setResetLoading(true);
    setPhaseError('');
    try {
      await alertApi.reset();
      setConfirmResetOpen(false);
      // Reset local conditions immediately
      setLocalConditions({ warningLevelTwo: false, rainfallExceeds100mm: false, streetFloodingReport: false });
      await fetchAll(false);
    } catch (err: unknown) {
      setPhaseError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  }, [fetchAll]);

  // ── Trigger condition handler — optimistic, zero perceived latency ─────────
  const handleTrigger = useCallback(async (condition: TriggerConditionKey) => {
    setPhaseError('');

    // 1. Update localConditions instantly — this is what TriggerPanel reads
    const next: TriggerConditions = { ...localConditions, [condition]: true };
    setLocalConditions(next);

    // 2. If 2+ conditions now met, optimistically update phase/activation on data too
    const trueCount = Object.values(next).filter(Boolean).length;
    if (trueCount >= 2 && data && !data.activated) {
      setData(prev => prev ? {
        ...prev,
        triggerConditions: next,
        activated: true,
        activatedAt: new Date().toISOString(),
        phase: 1 as 0 | 1 | 2,
      } : prev);
    }

    // 3. Fire API silently in background
    try {
      await alertApi.trigger(condition);
      fetchAll(true);
    } catch (err: unknown) {
      // Roll back on failure
      setLocalConditions(localConditions);
      if (trueCount >= 2 && data && !data.activated) {
        setData(prev => prev ? {
          ...prev,
          triggerConditions: localConditions,
          activated: false,
          activatedAt: null,
          phase: 0 as 0 | 1 | 2,
        } : prev);
      }
      setPhaseError(err instanceof Error ? err.message : 'Failed to submit condition');
    }
  }, [localConditions, data, fetchAll]);

  // ── Advance phase handler ─────────────────────────────────────────────────
  const handleAdvancePhase = useCallback(async () => {
    if (!data) return;
    const nextPhase = (data.phase + 1) as 1 | 2;
    setAdvancePhaseLoading(true);
    setPhaseError('');
    try {
      await alertApi.advancePhase(nextPhase);
      await fetchAll(false);
    } catch (err: unknown) {
      setPhaseError(err instanceof Error ? err.message : 'Failed to advance phase');
    } finally {
      setAdvancePhaseLoading(false);
    }
  }, [data, fetchAll]);

  // ── Init + polling ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const result = await dashboardApi.getSummaryCached();
        setData(result.data);
        setLastUpdated(new Date());
        setIsStale(result.isStale);
        if (result.fromCache) fetchAll(true);
      } catch {
        await fetchAll(false);
      } finally {
        setFirstLoad(false);
      }
    };
    init();
  }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    await fetchAll(false);
  }, [fetchAll]);

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
      showAiBrief={canUseAiBrief}
      onAiBrief={handleGenerateBrief}
      aiBriefLoading={aiBriefLoading}
      showAdvancePhase={showAdvancePhase}
      onAdvancePhase={handleAdvancePhase}
      advancePhaseLoading={advancePhaseLoading}
      advancePhaseLabel="Advance to Phase 2"
      showReset={showReset}
      onReset={handleReset}
      resetLoading={resetLoading}
    >
      <AiBriefModal
        isOpen={aiBriefOpen}
        isLoading={aiBriefLoading}
        result={aiBriefResult}
        error={aiBriefError}
        onClose={handleCloseBrief}
      />

      <ConfirmModal
        isOpen={confirmResetOpen}
        title="Reset System"
        description="Reset to Phase 0? This clears all trigger conditions and deactivates REMA. All data is preserved in the database."
        confirmLabel="Reset to Phase 0"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={resetLoading}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmResetOpen(false)}
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

      {phaseError && (
        <div className="mb-4 bg-accent-red/10 border border-accent-red/30 rounded px-4 py-2 animate-slide-in">
          <p className="font-mono text-xs text-accent-red">{phaseError}</p>
        </div>
      )}

      {data && topStats && (
        <div className="space-y-6 animate-fade-in">

          <PhaseBanner
            phase={data.phase}
            activated={data.activated}
            activatedAt={data.activatedAt}
            triggerConditions={data.triggerConditions}
          />

          {/* Trigger panel — phase 0 only, EC and SUPER_ADMIN */}
          {showTriggerPanel && (
            <TriggerPanel
              onTrigger={handleTrigger}
              currentConditions={localConditions}
            />
          )}

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
                    <p className={`font-mono text-[10px] uppercase tracking-widest ${color}`}>{label}</p>
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

          <StockChart districts={data.districts} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <DeliveryRunsPanel activeRuns={data.activeDeliveryRuns} districts={data.districts} />
            </div>
            <RadioCompliancePanel />
          </div>

          <div>
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">Districts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.districts.map((d) => (
                <DistrictCard key={d.districtId} d={d} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
              Household Priority Queue
            </h2>
            <PriorityQueueTable districts={data.districts} />
          </div>

          <IncidentPanel incidents={data.openIncidents} />

        </div>
      )}
    </DashboardLayout>
  );
}