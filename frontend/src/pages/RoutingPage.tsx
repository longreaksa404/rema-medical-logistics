// RoutingPage.tsx — V2 Routing Map

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../components/DashboardLayout';
import { routesApi } from '../api/routes';
import { queryKeys } from '../api/queryKeys';
import type { RouteLog, DeliveryMode } from '../api/routes';
import type { DistrictCard } from '../api/dashboard.types';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n, districtLabel, zoneLabel, type MessageKey } from '../i18n';
import { useThemeColors, type ThemeToken } from '../theme/ThemeContext';

// Leaflet is bundled from npm (no CDN at runtime) but only loaded with this page
const LeafletMap = lazy(() => import('../components/LeafletMap').then(m => ({ default: m.LeafletMap })));

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<DeliveryMode, {
  label: MessageKey; color: string; bgColor: string; borderColor: string;
  icon: string; depth: string; fill: ThemeToken; opacity: number;
}> = {
  MOTORBIKE:       { label: 'mode.MOTORBIKE',       color: 'text-accent-green',  bgColor: 'bg-accent-green/10',  borderColor: 'border-accent-green/30',  icon: '🏍',  depth: '0-30 cm',  fill: 'accent-green',  opacity: 0.35 },
  BICYCLE_OR_FOOT: { label: 'mode.BICYCLE_OR_FOOT', color: 'text-accent-yellow', bgColor: 'bg-accent-yellow/10', borderColor: 'border-accent-yellow/30', icon: '🚲', depth: '30-60 cm', fill: 'accent-yellow', opacity: 0.45 },
  BOAT:            { label: 'mode.BOAT',            color: 'text-accent-orange', bgColor: 'bg-accent-orange/10', borderColor: 'border-accent-orange/30', icon: '⛵', depth: '60-80 cm', fill: 'accent-orange', opacity: 0.50 },
  SUSPENDED:       { label: 'mode.SUSPENDED',       color: 'text-accent-red',    bgColor: 'bg-accent-red/10',    borderColor: 'border-accent-red/30',    icon: '⛔', depth: '> 80 cm',  fill: 'accent-red',    opacity: 0.55 },
};

const ZONES = ['Zone A', 'Zone B', 'Zone C'] as const;

const ZONE_FALLBACKS: Record<string, number> = {
  'Zone A': 15,
  'Zone B': 25,
  'Zone C': 45,
};

function depthToMode(depth: number): DeliveryMode {
  if (depth <= 30) return 'MOTORBIKE';
  if (depth <= 60) return 'BICYCLE_OR_FOOT';
  if (depth <= 80) return 'BOAT';
  return 'SUSPENDED';
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-elevated rounded ${className}`} />;
}

function RoutingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-4">
          <Skeleton className="h-[497px]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        </div>
        <div className="xl:col-span-4 space-y-4">
          <Skeleton className="h-64" /><Skeleton className="h-48" /><Skeleton className="h-80" />
        </div>
      </div>
    </div>
  );
}

// ─── DEPTH SLIDER ─────────────────────────────────────────────────────────────

function DepthSlider({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  const mode = depthToMode(value);
  const cfg = MODE_CONFIG[mode];
  const { t } = useI18n();
  const color = useThemeColors();
  return (
    <div className="card px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest">{label}</p>
        <span className={`font-mono text-[11px] font-semibold ${cfg.color} flex items-center gap-1`}>
          {cfg.icon} {t(cfg.label)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range" min={0} max={120} step={5} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: color(cfg.fill) }}
        />
        <span className="font-mono text-sm font-semibold text-text-primary w-14 text-right tabular-nums">
          {value}<span className="text-[11px] text-text-muted">cm</span>
        </span>
      </div>
      {value > 80 && (
        <p className="mt-2 font-mono text-[11px] text-accent-red flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse-slow inline-block flex-shrink-0" />
          {t('routing.suspendedAbove')}
        </p>
      )}
    </div>
  );
}

// ─── ROUTE LOG ROW ────────────────────────────────────────────────────────────

function RouteLogRow({ log }: { log: RouteLog }) {
  const prevCfg = MODE_CONFIG[log.previousMode];
  const newCfg = MODE_CONFIG[log.newMode];
  const { t, locale } = useI18n();
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-bg-elevated/40 transition-colors duration-100">
      <div className="min-w-0">
        <p className="font-mono text-[11px] text-text-muted mb-0.5">
          {log.route?.district?.name ? districtLabel(t, log.route.district.name) : '-'} &bull; {log.route?.zone ? zoneLabel(t, log.route.zone) : '-'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-mono text-xs ${prevCfg.color}`}>{prevCfg.icon} {log.previousDepth}cm</span>
          <span className="text-text-muted font-mono text-[11px]">-&gt;</span>
          <span className={`font-mono text-xs font-semibold ${newCfg.color}`}>
            {newCfg.icon} {log.newDepth}cm - {t(newCfg.label)}
          </span>
        </div>
      </div>
      <span className="font-mono text-[11px] text-text-muted flex-shrink-0">
        {new Date(log.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ─── DISTRICT SUMMARY CARD ────────────────────────────────────────────────────
// Option 2 - minimal list rows, one per zone.
// Real household data from DistrictCard (no extra API call needed).

function DistrictSummaryCard({ district, depths, isSelected, onClick }: {
  district: DistrictCard; depths: Record<string, number>;
  isSelected: boolean; onClick: () => void;
}) {
  const suspendedCount = ZONES.filter(zone => (depths[zone] ?? 0) > 80).length;
  const hasSuspended = suspendedCount > 0;
  const pendingDelivery = district.householdsAssessed - district.deliveredCount;
  const { t } = useI18n();

  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left w-full transition-all duration-150 hover:border-text-muted/30 hover:scale-[1.01] ${
        isSelected ? 'ring-1 ring-accent-blue/60 border-accent-blue/30' : ''
      } ${hasSuspended ? 'border-accent-red/20' : ''}`}
    >
      {/* header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-display font-bold text-text-primary">{districtLabel(t, district.name)}</p>
          <p className="font-mono text-[11px] text-text-muted mt-0.5">
            {t('routing.assessed', { count: district.householdsAssessed })}
          </p>
        </div>
        {hasSuspended && (
          <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-accent-red bg-accent-red/10 border border-accent-red/30 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse-slow inline-block" />
            {t('routing.suspendedCount', { count: suspendedCount })}
          </span>
        )}
      </div>

      {/* zone list rows */}
      <div className="space-y-1.5 pb-3 border-b border-bg-border">
        {ZONES.map((zone) => {
          const dep = depths[zone] ?? 0;
          const mode = depthToMode(dep);
          const cfg = MODE_CONFIG[mode];
          const isSuspended = mode === 'SUSPENDED';
          return (
            <div
              key={zone}
              className={`flex items-center justify-between px-2 py-1.5 rounded ${
                isSuspended ? 'bg-accent-red/8 border border-accent-red/20' : 'hover:bg-bg-elevated/40'
              }`}
            >
              {/* left: icon + zone name */}
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none w-5 text-center">{cfg.icon}</span>
                <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
                  {zoneLabel(t, zone)}
                </span>
              </div>
              {/* right: depth + mode label */}
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs font-semibold tabular-nums ${cfg.color}`}>
                  {dep}cm
                </span>
                <span className={`font-mono text-[10px] ${cfg.color} ${
                  isSuspended ? 'font-bold' : 'text-text-muted'
                }`}>
                  {t(cfg.label)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* household stats footer — real data from API */}
      <div className="flex items-center justify-between pt-2.5 flex-wrap gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] text-text-muted">
          <span className="text-accent-green font-semibold">{district.deliveredCount}</span> {t('routing.delivered')}
        </span>
        {pendingDelivery > 0 && (
          <span className="font-mono text-[11px] text-text-muted">
            <span className="text-accent-yellow font-semibold">{pendingDelivery}</span> {t('routing.pending')}
          </span>
        )}
        {district.openIncidents > 0 && (
          <span className="font-mono text-[11px] text-text-muted">
            <span className="text-accent-red font-semibold">{district.openIncidents}</span> {t('history.inline.incidents')}
          </span>
        )}
      </div>

      {isSelected && (
        <p className="font-mono text-[10px] text-accent-blue mt-2 animate-pulse-slow">
          {t('routing.adjusting')} -&gt;
        </p>
      )}
    </button>
  );
}

// ─── MAIN ROUTING PAGE ────────────────────────────────────────────────────────

export function RoutingPage() {
  const { t } = useI18n();
  usePageTitle(t('nav.routing'));
  const color = useThemeColors();
  const queryClient = useQueryClient();
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(null);

  const [zoneDepths, setZoneDepths] = useState<Record<string, Record<string, number>>>({});
  const [loadedDistricts, setLoadedDistricts] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const isHubManager = user?.role === 'HUB_MANAGER';
  // hub managers can only edit their own district — districtId from JWT
  const canEditSelected = !isHubManager || selectedDistrictId === user?.districtId;

  const { data: summaryData, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => import('../api/dashboard').then(m => m.dashboardApi.getSummary()),
  });

  const districts: DistrictCard[] = (summaryData?.districts ?? []).filter(
    (d) => d.name !== '__central__'
  );

  useEffect(() => {
    if (districts.length === 0) return;
    districts.forEach((d: DistrictCard) => {
      if (loadedDistricts.has(d.districtId)) return;
      routesApi.getRecommendByDistrict(d.districtId)
        .then((result) => {
          setZoneDepths(prev => {
            const next = { ...prev };
            if (result.zones && result.zones.length > 0) {
              const zoneMap: Record<string, number> = {};
              result.zones.forEach((z: { zone: string; waterDepthCm: number }) => {
                const displayZone = z.zone.startsWith('Zone') ? z.zone : `Zone ${z.zone}`;
                zoneMap[displayZone] = z.waterDepthCm;
              });
              ZONES.forEach(zone => {
                if (!(zone in zoneMap)) zoneMap[zone] = ZONE_FALLBACKS[zone];
              });
              next[d.name] = zoneMap;
            } else {
              next[d.name] = { ...ZONE_FALLBACKS };
            }
            return next;
          });
          setLoadedDistricts(prev => new Set([...prev, d.districtId]));
        })
        .catch(() => {
          setZoneDepths(prev => ({
            ...prev,
            [d.name]: prev[d.name] ?? { ...ZONE_FALLBACKS },
          }));
          setLoadedDistricts(prev => new Set([...prev, d.districtId]));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districts.length]);

  const { data: logs = [] } = useQuery({
    queryKey: queryKeys.routes.logs(selectedDistrictId ?? undefined),
    queryFn: () => routesApi.getLogs(selectedDistrictId ?? undefined),
    select: (data: RouteLog[]) => data.slice(0, 30),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: routesApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.routes.logs(selectedDistrictId ?? undefined),
      });
    },
  });

  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  const handleSaveDepth = useCallback(async (
    districtId: string, districtName: string, zone: string, depth: number
  ) => {
    const key = `${districtId}:${zone}`;
    setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));
    try {
      await updateMutation.mutateAsync({ districtId, zone, waterDepthCm: depth });
      setSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: 'idle' })), 1800);
    } catch {
      setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: 'idle' })), 2500);
    }
  }, [updateMutation]);

  const handleDistrictClick = useCallback((districtId: string, name: string) => {
    setSelectedDistrictId(prev => prev === districtId ? null : districtId);
    setSelectedDistrictName(prev => prev === name ? null : name);
  }, []);

  const handleDepthChange = useCallback((districtName: string, zone: string, depth: number) => {
    setZoneDepths(prev => ({
      ...prev,
      [districtName]: { ...(prev[districtName] ?? {}), [zone]: depth },
    }));
  }, []);

  const selectedDistrictDepths = useMemo(
    () => selectedDistrictName ? (zoneDepths[selectedDistrictName] ?? {}) : {},
    [selectedDistrictName, zoneDepths]
  );

  const anySuspended = useMemo(
    () => districts.some((d: DistrictCard) =>
      Object.values(zoneDepths[d.name] ?? {}).some(dep => dep > 80)
    ),
    [districts, zoneDepths]
  );

  if (isLoading && districts.length === 0) {
    return <DashboardLayout title={t('routing.title')}><RoutingSkeleton /></DashboardLayout>;
  }

  return (
    <DashboardLayout title={t('routing.title')}>
      <div className="space-y-6 animate-fade-in">

        {anySuspended && (
          <div className="bg-accent-red/10 border border-accent-red/30 rounded px-4 py-3 animate-slide-in flex items-center gap-3">
            <span className="font-mono text-[11px] font-semibold text-accent-red uppercase tracking-widest px-2 py-0.5 bg-accent-red/20 rounded flex-shrink-0">
              {t('mode.SUSPENDED')}
            </span>
            <p className="font-mono text-xs text-accent-red">
              {t('routing.suspendedBanner')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          <div className="xl:col-span-8 space-y-6">
            <div>
              <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                {t('routing.mapTitle')}
                <span className="ml-2 font-normal normal-case">{t('routing.mapHint')}</span>
              </h2>
              <div className="card p-0 overflow-hidden rounded">
                <div className="flex items-center gap-5 px-4 py-2 border-b border-bg-border flex-wrap">
                  {Object.values(MODE_CONFIG).map(cfg => (
                    <div key={cfg.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color(cfg.fill) }} />
                      <span className="font-mono text-[11px] text-text-muted">{cfg.depth}</span>
                      <span className="font-mono text-[11px] text-text-secondary">{cfg.icon} {t(cfg.label)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 460 }}>
                  <Suspense fallback={
                    <div className="h-full flex items-center justify-center bg-bg-elevated">
                      <p className="font-mono text-xs text-text-muted">{t('routing.loadingMap')}</p>
                    </div>
                  }>
                    <LeafletMap
                      districts={districts}
                      zoneDepths={zoneDepths}
                      selectedDistrictId={selectedDistrictId}
                      onDistrictClick={handleDistrictClick}
                    />
                  </Suspense>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">{t('dash.districts')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {districts.map((d: DistrictCard) => (
                  <DistrictSummaryCard
                    key={d.districtId}
                    district={d}
                    depths={zoneDepths[d.name] ?? {}}
                    isSelected={selectedDistrictId === d.districtId}
                    onClick={() => handleDistrictClick(d.districtId, d.name)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 space-y-6">

            <div>
              <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                {t('routing.zoneDepth')}
                {selectedDistrictName && (
                  <span className="ml-2 text-text-primary normal-case font-normal">- {districtLabel(t, selectedDistrictName)}</span>
                )}
              </h2>
              {!selectedDistrictName ? (
                <div className="card px-4 py-8 text-center">
                  <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
                    {t('routing.selectDistrict')}
                  </p>
                </div>
              ) : !canEditSelected ? (
                <div className="card px-4 py-8 text-center space-y-2">
                  <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
                    {t('routing.readOnly')}
                  </p>
                  <p className="font-mono text-[11px] text-text-muted">
                    {t('routing.ownDistrictOnly')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ZONES.map((zone) => {
                    const depth = selectedDistrictDepths[zone] ?? 0;
                    const key = `${selectedDistrictId}:${zone}`;
                    const status = saveStatus[key] ?? 'idle';
                    return (
                      <div key={zone}>
                        <DepthSlider
                          label={zoneLabel(t, zone)}
                          value={depth}
                          onChange={v => handleDepthChange(selectedDistrictName!, zone, v)}
                        />
                        <div className="flex justify-end mt-1.5">
                          <button
                            onClick={() => handleSaveDepth(selectedDistrictId!, selectedDistrictName!, zone, depth)}
                            disabled={status === 'saving'}
                            className={`font-mono text-[11px] px-3 py-1 rounded border transition-all duration-150 ${
                              status === 'saved'  ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' :
                              status === 'error'  ? 'bg-accent-red/10 border-accent-red/30 text-accent-red' :
                              status === 'saving' ? 'bg-bg-elevated border-bg-border text-text-muted cursor-not-allowed' :
                              'bg-bg-elevated border-bg-border text-text-muted hover:border-text-muted/30 hover:text-text-secondary'
                            }`}
                          >
                            {status === 'saving' ? t('common.saving') : status === 'saved' ? t('profile.saved') : status === 'error' ? t('common.failed') : t('common.save')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                {t('routing.tiers')}
              </h2>
              <div className="card divide-y divide-bg-border">
                {Object.values(MODE_CONFIG).map(cfg => (
                  <div key={cfg.label} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{cfg.icon}</span>
                      <span className={`font-mono text-xs font-semibold ${cfg.color}`}>{t(cfg.label)}</span>
                    </div>
                    <span className="font-mono text-[11px] text-text-muted">{cfg.depth}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                {t('routing.changeLog')}
              </h2>
              <div className="card overflow-hidden">
                {logs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
                      {t('routing.noChanges')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-bg-border max-h-80 overflow-y-auto">
                    {logs.map((log: RouteLog) => <RouteLogRow key={log.id} log={log} />)}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}