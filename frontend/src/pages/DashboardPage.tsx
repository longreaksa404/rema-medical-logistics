import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
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
import { useI18n, enumLabel, districtLabel, type MessageKey } from '../i18n';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TriggerConditionKey = 'warningLevelTwo' | 'rainfallExceeds100mm' | 'streetFloodingReport';

interface TriggerConditions {
  warningLevelTwo: boolean;
  rainfallExceeds100mm: boolean;
  streetFloodingReport: boolean;
}

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
      <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        {pulse && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow flex-shrink-0 mb-0.5" />
        )}
        <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
      </div>
      {sub && (
        <p className="font-mono text-[11px] text-text-muted mt-0.5">{sub}</p>
      )}
    </div>
  );
});

// ─── PRIORITY BANDS CONFIG ────────────────────────────────────────────────────

const BAND_DISPLAY = [
  { key: 'critical' as const, label: 'band.CRITICAL' as MessageKey, color: 'text-accent-red',    border: 'border-accent-red/20',    bg: 'bg-accent-red/5',    dot: 'bg-accent-red'    },
  { key: 'high'     as const, label: 'band.HIGH' as MessageKey, color: 'text-accent-orange', border: 'border-accent-orange/20', bg: 'bg-accent-orange/5', dot: 'bg-accent-orange' },
  { key: 'medium'   as const, label: 'band.MEDIUM' as MessageKey, color: 'text-accent-yellow', border: 'border-accent-yellow/20', bg: 'bg-accent-yellow/5', dot: 'bg-accent-yellow' },
  { key: 'standard' as const, label: 'band.STANDARD' as MessageKey, color: 'text-accent-green',  border: 'border-accent-green/20',  bg: 'bg-accent-green/5',  dot: 'bg-accent-green'  },
] as const;

// ─── INCIDENT PANEL ───────────────────────────────────────────────────────────

const IncidentPanel = memo(function IncidentPanel({
  incidents,
}: {
  incidents: DashboardSummary['openIncidents'];
}) {
  const { t, locale } = useI18n();
  if (incidents.length === 0) return null;

  return (
    <div>
      <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
        {t('dash.openIncidents')}
        <span className="ml-2 text-accent-red">{incidents.length}</span>
      </h2>
      <div className="card divide-y divide-bg-border overflow-hidden">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className={`px-4 py-3 flex items-start justify-between gap-4 ${
              inc.status === 'ESCALATED' ? 'border-l-2 border-l-accent-red bg-accent-red/5' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  inc.status === 'ESCALATED' ? 'bg-accent-red animate-pulse-slow' : 'bg-accent-orange'
                }`} />
                <span className={`font-mono text-[11px] font-semibold ${
                  inc.status === 'ESCALATED' ? 'text-accent-red' : 'text-accent-orange'
                }`}>
                  {enumLabel(t, 'incidentStatus', inc.status)}
                </span>
                <span className="font-mono text-[11px] text-text-muted">
                  {enumLabel(t, 'incidentType', inc.type)}
                </span>
              </div>
              <p className="font-sans text-sm text-text-secondary truncate max-w-md">
                {inc.description}
              </p>
            </div>
            <span className="font-mono text-[11px] text-text-muted flex-shrink-0">
              {new Date(inc.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
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
  const { t } = useI18n();
  const statusColors = {
    ACTIVE:           'text-accent-green border-accent-green/30 bg-accent-green/10',
    INACTIVE:         'text-text-muted border-bg-border bg-transparent',
    BACKUP_ACTIVATED: 'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/10',
  };
  const statusColor = d.subWarehouseStatus
    ? statusColors[d.subWarehouseStatus]
    : statusColors.INACTIVE;

  const stockBarColor =
    d.anyScarce     ? 'bg-accent-red'    :
    d.stockPct > 60 ? 'bg-accent-green'  :
    d.stockPct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange';

  const stockTextColor =
    d.anyScarce     ? 'text-accent-red'    :
    d.stockPct > 60 ? 'text-accent-green'  :
    d.stockPct > 30 ? 'text-accent-yellow' : 'text-accent-orange';

  const deliveryPct = d.householdsAssessed > 0
    ? Math.round((d.deliveredCount / d.householdsAssessed) * 100)
    : 0;

  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-text-muted/30 transition-colors duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-text-primary">{districtLabel(t, d.name)}</h3>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            {t('dash.householdsCount', { count: d.population.toLocaleString() })}
          </p>
        </div>
        <span className={`font-mono text-[11px] px-2 py-0.5 rounded border flex-shrink-0 ${statusColor}`}>
          {d.subWarehouseStatus ? enumLabel(t, 'warehouseStatus', d.subWarehouseStatus) : t('dash.noWarehouse')}
        </span>
      </div>

      {/* Stock bar + EMK breakdown */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">{t('dash.stockLevel')}</span>
          <span className={`font-mono text-xs ${stockTextColor}`}>
            {d.stockPct}%{d.anyScarce ? ` ⚠ ${t('dash.scarce')}` : ''}
          </span>
        </div>
        <div className="h-1.5 bg-bg-border rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stockBarColor}`}
            style={{ width: `${Math.min(Math.max(d.stockPct, 2), 100)}%` }}
          />
        </div>
        {d.stock && (
          <div className="grid grid-cols-3 gap-1">
            {(['emk1', 'emk2', 'emk3'] as const).map((type) => {
              const remaining = d.stock![`${type}Remaining`];
              const total     = d.stock![`${type}Total`];
              const scarce    = total > 0 && remaining / total < 0.3;
              return (
                <div
                  key={type}
                  className={`rounded px-2 py-1.5 ${
                    scarce ? 'bg-accent-red/10 border border-accent-red/20' : 'bg-bg-elevated'
                  }`}
                >
                  <p className={`font-mono text-[10px] uppercase ${scarce ? 'text-accent-red' : 'text-text-muted'}`}>
                    {type.toUpperCase()}
                  </p>
                  <p className={`font-mono text-xs ${scarce ? 'text-accent-red' : 'text-text-primary'}`}>
                    {remaining.toLocaleString()}
                    <span className="text-text-muted">/{total.toLocaleString()}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-bg-border">
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-text-primary">{d.householdsAssessed}</p>
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-wide">{t('dash.assessed')}</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-accent-green">{d.deliveredCount}</p>
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-wide">{t('status.delivered')}</p>
        </div>
        <div className="text-center">
          <p className={`font-mono text-lg font-semibold ${d.openIncidents > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
            {d.openIncidents}
          </p>
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-wide">{t('dash.incidents')}</p>
        </div>
      </div>

      {/* Per-district delivery progress */}
      {d.householdsAssessed > 0 && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[10px] text-text-muted">{t('dash.deliveryProgress')}</span>
            <span className="font-mono text-[10px] text-text-muted">{deliveryPct}%</span>
          </div>
          <div className="h-1 bg-bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green rounded-full transition-all duration-500"
              style={{ width: `${deliveryPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

// ─── TRIGGER PANEL ────────────────────────────────────────────────────────────

function TriggerPanel({
  onTrigger,
  currentConditions,
  isLoading,
}: {
  onTrigger: (condition: TriggerConditionKey) => void;
  currentConditions: TriggerConditions;
  isLoading: boolean;
}) {
  const { t } = useI18n();
  const conditions: { key: TriggerConditionKey; label: string; desc: string }[] = [
    { key: 'warningLevelTwo',      label: t('trigger.warningLevelTwo.short'), desc: t('trigger.warningLevelTwo.desc') },
    { key: 'rainfallExceeds100mm', label: t('trigger.rainfall.short'),        desc: t('trigger.rainfall.desc') },
    { key: 'streetFloodingReport', label: t('trigger.streetFlooding.short'),  desc: t('trigger.streetFlooding.desc') },
  ];

  const trueCount   = Object.values(currentConditions).filter(Boolean).length;
  const shouldBlock = trueCount >= 2;

  return (
    <div className="card border border-accent-yellow/20 bg-accent-yellow/5 p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-mono text-xs text-accent-yellow uppercase tracking-widest">
            {t('dash.activationRequired')}
          </h3>
          <p className="font-mono text-[11px] text-text-muted mt-0.5">
            {t('dash.activationHint')}
          </p>
        </div>
        <span className={`font-mono text-xs px-2 py-0.5 rounded border flex-shrink-0 ${
          trueCount >= 2
            ? 'text-accent-green border-accent-green/30 bg-accent-green/10'
            : 'text-text-muted border-bg-border'
        }`}>
          {t('dash.conditionsMet', { count: trueCount })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {conditions.map(({ key, label, desc }) => {
          const active = currentConditions[key];
          return (
            <button
              key={key}
              onClick={() => { if (!active && !shouldBlock) onTrigger(key); }}
              disabled={active || shouldBlock}
              title={desc}
              className={`
                flex items-center gap-2 px-3 py-2.5 rounded border text-left
                transition-all duration-150
                ${active
                  ? 'border-accent-green/40 bg-accent-green/10 text-accent-green cursor-default'
                  : shouldBlock
                    ? 'border-bg-border text-text-muted opacity-50 cursor-not-allowed'
                    : 'border-bg-border text-text-muted hover:border-accent-yellow/40 hover:text-accent-yellow hover:bg-accent-yellow/5 active:scale-95 cursor-pointer'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-150 ${
                active ? 'bg-accent-green' : 'bg-bg-border'
              }`} />
              <span className="font-mono text-[11px] uppercase tracking-widest">{label}</span>
              {active && <span className="ml-auto font-mono text-[10px] text-accent-green">✓</span>}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="font-mono text-[10px] text-text-muted mt-3 animate-pulse-slow">
          {t('dash.processingTrigger')}
        </p>
      ) : trueCount === 1 ? (
        <p className="font-mono text-[10px] text-accent-yellow mt-3 animate-pulse-slow">
          {t('dash.oneMore')}
        </p>
      ) : null}
    </div>
  );
}

// ─── MAIN DASHBOARD PAGE ──────────────────────────────────────────────────────

export function DashboardPage() {
  const { t } = useI18n();
  usePageTitle(t('nav.dashboard'));
  const { user, onSocketEvent } = useAuth();

  const [data,             setData]             = useState<DashboardSummary | null>(null);
  const [isRefreshing,     setIsRefreshing]     = useState(false);
  const [firstLoad,        setFirstLoad]        = useState(true);
  const [error,            setError]            = useState('');
  const [lastUpdated,      setLastUpdated]      = useState<Date | null>(null);
  const [isStale,          setIsStale]          = useState(false);
  const [triggerLoading,   setTriggerLoading]   = useState(false);

  const [localConditions, setLocalConditions] = useState<TriggerConditions>({
    warningLevelTwo:      false,
    rainfallExceeds100mm: false,
    streetFloodingReport: false,
  });

  const [aiBriefOpen,    setAiBriefOpen]    = useState(false);
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [aiBriefResult,  setAiBriefResult]  = useState<AiBriefResponse | null>(null);
  const [aiBriefError,   setAiBriefError]   = useState('');

  const [resetLoading,        setResetLoading]        = useState(false);
  const [confirmResetOpen,    setConfirmResetOpen]    = useState(false);
  const [advancePhaseLoading, setAdvancePhaseLoading] = useState(false);
  const [phaseError,          setPhaseError]          = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isEC         = user?.role === 'EMERGENCY_COORDINATOR' || user?.role === 'SUPER_ADMIN';

  const showReset        = isSuperAdmin && !!(data && (data.activated || data.phase > 0));
  const showTriggerPanel = isEC && !!(data && !data.activated && data.phase === 0);
  const showAdvancePhase = isEC && !!(data && data.activated && data.phase === 1);
  const canUseAiBrief    = isEC;

  const isTriggeringRef = useRef(false);

  // Sync localConditions from server (skip while trigger is in flight)
  useEffect(() => {
    if (isTriggeringRef.current) return;
    if (data?.triggerConditions) {
      setLocalConditions({
        warningLevelTwo:      data.triggerConditions.warningLevelTwo,
        rainfallExceeds100mm: data.triggerConditions.rainfallExceeds100mm,
        streetFloodingReport: data.triggerConditions.streetFloodingReport,
      });
    }
  }, [
    data?.triggerConditions?.warningLevelTwo,
    data?.triggerConditions?.rainfallExceeds100mm,
    data?.triggerConditions?.streetFloodingReport,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const fresh = await dashboardApi.getSummary();
      setData(fresh);
      setIsStale(false);
      setLastUpdated(new Date());
      setError('');
    } catch {
      if (!silent) setError(t('dash.refreshFailed'));
      setIsStale(true);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [t]);

  const handleRefresh = useCallback(async () => { await fetchAll(false); }, [fetchAll]);

  const handleGenerateBrief = useCallback(async () => {
    setAiBriefOpen(true);
    setAiBriefLoading(true);
    setAiBriefResult(null);
    setAiBriefError('');
    try {
      const result = await aiApi.generateBrief();
      setAiBriefResult(result);
    } catch (err: unknown) {
      setAiBriefError(
        err instanceof Error ? err.message : t('ai.unavailableShort'),
      );
    } finally {
      setAiBriefLoading(false);
    }
  }, [t]);

  const handleCloseBrief = useCallback(() => setAiBriefOpen(false), []);

  const handleReset = useCallback(() => setConfirmResetOpen(true), []);

  const handleConfirmReset = useCallback(async () => {
    setResetLoading(true);
    setPhaseError('');
    try {
      await alertApi.reset();
      setConfirmResetOpen(false);
      setLocalConditions({ warningLevelTwo: false, rainfallExceeds100mm: false, streetFloodingReport: false });
      await fetchAll(false);
    } catch (err: unknown) {
      setPhaseError(err instanceof Error ? err.message : t('dash.resetFailed'));
    } finally {
      setResetLoading(false);
    }
  }, [fetchAll, t]);

  const handleTrigger = useCallback(async (condition: TriggerConditionKey) => {
    setPhaseError('');
    setTriggerLoading(true);
    isTriggeringRef.current = true;
    setLocalConditions(prev => ({ ...prev, [condition]: true }));
    try {
      await alertApi.trigger(condition);
      await fetchAll(false);
    } catch (err: unknown) {
      setLocalConditions(prev => ({ ...prev, [condition]: false }));
      setPhaseError(err instanceof Error ? err.message : t('dash.triggerFailed'));
    } finally {
      isTriggeringRef.current = false;
      setTriggerLoading(false);
    }
  }, [fetchAll, t]);

  const handleAdvancePhase = useCallback(async () => {
    if (!data) return;
    const nextPhase = (data.phase + 1) as 1 | 2;
    setAdvancePhaseLoading(true);
    setPhaseError('');
    try {
      await alertApi.advancePhase(nextPhase);
      await fetchAll(false);
    } catch (err: unknown) {
      setPhaseError(err instanceof Error ? err.message : t('dash.advanceFailed'));
    } finally {
      setAdvancePhaseLoading(false);
    }
  }, [data, fetchAll, t]);

  // ── Init + polling ────────────────────────────────────────────────────────

  // instant refresh on WebSocket events — no waiting for the 30s poll
  useEffect(() => {
    const unsubs = [
      onSocketEvent('phase_changed',     () => fetchAll(true)),
      onSocketEvent('scarcity_triggered', () => fetchAll(true)),
      onSocketEvent('incident_reported',  () => fetchAll(true)),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [onSocketEvent, fetchAll]);

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

  // ── Derived values ────────────────────────────────────────────────────────

  const topStats = useMemo(() => {
    if (!data) return null;
    return {
      activeRuns:      data.activeDeliveryRuns,
      pendingDelivery: data.households.pendingDelivery,
      delivered:       data.households.delivered,
      total:           data.households.total,
      deliveryPct:     data.households.total > 0
        ? Math.round((data.households.delivered / data.households.total) * 100)
        : 0,
      todayCheckins:   data.todayRadio.filled,
      totalScheduled:  data.todayRadio.due,
    };
  }, [data]);

  // ─────────────────────────────────────────────────────────────────────────

  if (firstLoad && !data) {
    return (
      <DashboardLayout title={t('dash.title')}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={t('dash.title')}
      onRefresh={handleRefresh}
      lastUpdated={lastUpdated}
      isRefreshing={isRefreshing}
      showAiBrief={canUseAiBrief}
      onAiBrief={handleGenerateBrief}
      aiBriefLoading={aiBriefLoading}
      showAdvancePhase={showAdvancePhase}
      onAdvancePhase={handleAdvancePhase}
      advancePhaseLoading={advancePhaseLoading}
      advancePhaseLabel={t('dash.advanceToPhase2')}
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
        title={t('dash.closeEvent.title')}
        description={
          t('dash.closeEvent.body')
          + ' '
          + (data?.activeDeliveryRuns
            ? t(data.activeDeliveryRuns === 1 ? 'dash.closeEvent.runs.one' : 'dash.closeEvent.runs.other', { count: data.activeDeliveryRuns }) + ' '
            : '')
          + t('dash.closeEvent.volunteers')
        }
        confirmLabel={t('dash.closeEvent.confirm')}
        variant="danger"
        isLoading={resetLoading}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmResetOpen(false)}
      />

      {/* ── Toasts ───────────────────────────────────────────────────── */}

      {isStale && !isRefreshing && (
        <div className="mb-4 bg-accent-yellow/10 border border-accent-yellow/30 rounded px-4 py-2 animate-fade-in">
          <p className="font-mono text-xs text-accent-yellow">
            {t('dash.cached')}
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

          {/* 1 ── Phase banner */}
          <PhaseBanner
            phase={data.phase}
            activated={data.activated}
            activatedAt={data.activatedAt}
            triggerConditions={data.triggerConditions}
          />

          {/* 2 ── Activation trigger (Phase 0 + EC only) */}
          {showTriggerPanel && (
            <TriggerPanel
              onTrigger={handleTrigger}
              currentConditions={localConditions}
              isLoading={triggerLoading}
            />
          )}

          {/* 3 ── KPI stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label={t('dash.activeRuns')}
              value={topStats.activeRuns}
              sub={topStats.activeRuns > 0 ? t('dash.teamsDeployed') : t('dash.noRuns')}
              color={topStats.activeRuns > 0 ? 'text-accent-green' : 'text-text-muted'}
              pulse={topStats.activeRuns > 0}
            />
            <StatCard
              label={t('dash.pendingDelivery')}
              value={topStats.pendingDelivery}
              sub={t('dash.totalAssessed', { count: topStats.total })}
            />
            <StatCard
              label={t('status.delivered')}
              value={topStats.delivered}
              sub={t('dash.pctComplete', { pct: topStats.deliveryPct })}
              color="text-accent-green"
            />
            <StatCard
              label={t('dash.checkins')}
              value={`${topStats.todayCheckins}/${topStats.totalScheduled}`}
              sub={
                topStats.todayCheckins === topStats.totalScheduled
                  ? t('dash.allSlotsFilled')
                  : t('dash.slotsMissed', { count: topStats.totalScheduled - topStats.todayCheckins })
              }
              color={
                topStats.todayCheckins === 0
                  ? 'text-accent-red'
                  : topStats.todayCheckins === topStats.totalScheduled
                    ? 'text-accent-green'
                    : 'text-accent-yellow'
              }
            />
          </div>

          {/* 4 ── Priority bands */}
          <div>
            <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-2">
              {t('dash.priorityBands')}
              <span className="ml-2 font-normal normal-case opacity-60">{t('dash.undelivered')}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BAND_DISPLAY.map(({ key, label, color, border, bg, dot }) => (
                <div key={key} className={`card border ${border} ${bg} px-4 py-3`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <p className={`font-mono text-[11px] uppercase tracking-widest ${color}`}>{t(label)}</p>
                  </div>
                  <p className={`font-mono text-3xl font-bold ${color}`}>
                    {data.households[key]}
                  </p>
                  {key === 'critical' && data.households.critical > 0 && (
                    <p className="font-mono text-[10px] text-accent-red mt-1.5 animate-pulse-slow">
                      {t('dash.deliverCurrentRun')}
                    </p>
                  )}
                  {data.households[key] === 0 && (
                    <p className="font-mono text-[10px] text-text-muted/40 mt-1.5">{t('dash.allClear')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5 ── Stock chart */}
          <StockChart
            districts={data.districts.filter(d => d.name !== '__central__')}
            centralWarehouse={data.centralWarehouse}
          />

          {/* 6 ── Delivery runs + Radio */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <DeliveryRunsPanel activeRuns={data.activeDeliveryRuns} districts={data.districts} />
            </div>
            <div className="lg:col-span-2">
              <RadioCompliancePanel />
            </div>
          </div>

          {/* 7 ── Districts */}
          <div>
            <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">
              {t('dash.districts')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.districts.filter(d => d.name !== '__central__').map((d) => (
                <DistrictCard key={d.districtId} d={d} />
              ))}
            </div>
          </div>

          {/* 8 ── Priority queue */}
          <div>
            <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">
              {t('dash.householdQueue')}
            </p>
            <PriorityQueueTable districts={data.districts.filter(d => d.name !== '__central__')} />
          </div>

          {/* 9 ── Incidents */}
          <IncidentPanel incidents={data.openIncidents} />

        </div>
      )}
    </DashboardLayout>
  );
}