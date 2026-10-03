// VolunteerPage.tsx — V8 Volunteer View
// Updated: 70/30 layout, audit log history under live score panel

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Truck, AlertTriangle, type LucideIcon } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { householdsApi } from '../api/households';
import { queryKeys } from '../api/queryKeys';
import type { Household, CreateHouseholdPayload } from '../api/households';
import { submitOrQueue, useOutbox, useOnline } from '../offline';
import {
  scoreHousehold, computeCat2,
  CAT1_OPTIONS, CAT2_FLAGS, CAT3_OPTIONS, CAT4_OPTIONS,
} from '../utils/scoring';
import type { ScoreInput, PriorityBand, Cat2FlagId } from '../utils/scoring';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n, bandLabel, districtLabel, enumLabel, zoneLabel, type MessageKey, type Translate } from '../i18n';
import { useThemeColors, type ThemeToken } from '../theme/ThemeContext';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TabId = 'assess' | 'deliver' | 'report';

interface DeliveryRun {
  id: string;
  teamNumber: number;
  zone: string;
  departedAt: string;
  status: 'IN_PROGRESS' | 'COMPLETE' | 'ABORTED';
  receipts: { id: string; householdId: string }[];
} 

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BAND_CONFIG: Record<PriorityBand, { label: string; color: string; bg: string; border: string; dot: string; ring: ThemeToken }> = {
  CRITICAL: { label: 'CRITICAL', color: 'text-accent-red',    bg: 'bg-accent-red/10',    border: 'border-accent-red/40',    dot: 'bg-accent-red',    ring: 'accent-red'    },
  HIGH:     { label: 'HIGH',     color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/40', dot: 'bg-accent-orange', ring: 'accent-orange' },
  MEDIUM:   { label: 'MEDIUM',   color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/40', dot: 'bg-accent-yellow', ring: 'accent-yellow' },
  STANDARD: { label: 'STANDARD', color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/30',  dot: 'bg-accent-green',  ring: 'accent-green'  },
};

const EMK_COLORS: Record<string, string> = {
  EMK1: 'text-accent-blue', EMK2: 'text-accent-green', EMK3: 'text-accent-red',
};

const INCIDENT_TYPES = [
  { value: 'ROUTE_BLOCKED',    icon: '🚧', autoEscalate: false },
  { value: 'VOLUNTEER_SAFETY', icon: '⚠️', autoEscalate: true  },
  { value: 'STOCK_SCARCITY',   icon: '📦', autoEscalate: false },
  { value: 'BUILDING_FLOODED', icon: '🌊', autoEscalate: false },
  { value: 'OTHER',            icon: '📋', autoEscalate: false },
] as const;

// Scoring options keep their English labels in utils/scoring.ts (shared rules);
// the UI shows these translations, keyed by option value / flag id.
const CAT1_LABELS: Record<number, MessageKey> = { 8: 'score.cat1.8', 5: 'score.cat1.5', 2: 'score.cat1.2', 0: 'score.cat1.0' };
const CAT3_LABELS: Record<number, MessageKey> = { 4: 'score.cat3.4', 3: 'score.cat3.3', 1: 'score.cat3.1', 0: 'score.cat3.0' };
const CAT4_LABELS: Record<number, MessageKey> = { 2: 'score.cat4.2', 1: 'score.cat4.1', 0: 'score.cat4.0' };
const CAT2_LABELS: Record<Cat2FlagId, MessageKey> = {
  infant: 'score.cat2.infant', pregnant: 'score.cat2.pregnant', elderly: 'score.cat2.elderly', disabled: 'score.cat2.disabled',
};

const BAND_GUIDANCE: Record<PriorityBand, MessageKey> = {
  CRITICAL: 'vol.guide.CRITICAL', HIGH: 'vol.guide.HIGH', MEDIUM: 'vol.guide.MEDIUM', STANDARD: 'vol.guide.STANDARD',
};
const BAND_GUIDANCE_SHORT: Record<PriorityBand, MessageKey> = {
  CRITICAL: 'dash.deliverCurrentRun', HIGH: 'vol.guideShort.HIGH', MEDIUM: 'vol.guideShort.MEDIUM', STANDARD: 'vol.guideShort.STANDARD',
};

const BAND_ORDER: Record<PriorityBand, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, STANDARD: 3 };

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function timeAgo(t: Translate, iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('time.justNow');
  if (m < 60) return t('time.minutesAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hoursAgo', { n: h });
  return t('time.daysAgo', { n: Math.floor(h / 24) });
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-elevated rounded ${className}`} />;
}

function VolunteerSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex gap-0.5 w-fit">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-24" />)}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-display font-bold text-text-primary">{children}</h3>
      {sub && <p className="font-mono text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${color}`}>{label}</span>;
}

function ErrorBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-red">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[11px] text-accent-red flex-shrink-0">✕</button>
    </div>
  );
}

function SuccessBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-green">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[11px] text-accent-green flex-shrink-0">✕</button>
    </div>
  );
}

function OptionButton({ selected, onClick, children, danger = false }: {
  selected: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded border transition-all ${
        selected
          ? danger ? 'bg-accent-red/10 border-accent-red/40' : 'bg-accent-blue/10 border-accent-blue/40'
          : 'bg-bg-elevated border-bg-border hover:border-bg-border/60'
      }`}>
      {children}
    </button>
  );
}

// ─── EMK QUANTITY BADGE ───────────────────────────────────────────────────────

function EmkQuantityBadge({ emk3, emk2, emk1, total }: { emk3: number; emk2: number; emk1: number; total: number }) {
  const { t } = useI18n();
  const parts: string[] = [];
  if (emk3 > 0) parts.push(`${emk3}x EMK3`);
  if (emk2 > 0) parts.push(`${emk2}x EMK2`);
  if (emk1 > 0) parts.push(`${emk1}x EMK1`);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-mono text-[11px] text-text-muted">{t('vol.kits')}</span>
      {parts.map((p, i) => (
        <span key={i} className={`font-mono text-[11px] font-bold ${
          p.includes('EMK3') ? 'text-accent-red' : p.includes('EMK2') ? 'text-accent-green' : 'text-accent-blue'
        }`}>{p}</span>
      ))}
      <span className="font-mono text-[11px] text-text-muted">= {t('vol.kitsTotal', { total })}</span>
    </div>
  );
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
// Shows last 10 assessed households for this district — placed below live score

function AssessAuditLog({ districtId }: { districtId: string }) {
  const { t } = useI18n();
  const { data: historyResult, isLoading } = useQuery({
    queryKey: [...queryKeys.households.queue(districtId), 'all'],
    queryFn: () => householdsApi.list({ districtId }, 1, 100),
    enabled: !!districtId,
    staleTime: 15_000,
  });

  // sort by createdAt descending, take last 10
  const history = historyResult?.data ?? [];
  const recent = useMemo(
    () => [...history]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20),
    [history]
  );

  if (isLoading) {
    return (
      <div className="card p-4 space-y-2">
        <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">{t('vol.history')}</p>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }

  return (
    <div className="card p-4">
      <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">
        {t('vol.history')}
      </p>
      {recent.length === 0 ? (
        <p className="font-mono text-[11px] text-text-muted text-center py-4">{t('vol.noHistory')}</p>
      ) : (
        <div className="space-y-2">
          {recent.map(h => {
            const cfg = BAND_CONFIG[h.priorityBand];
            return (
              <div key={h.id} className="flex items-start gap-2 py-2 border-b border-bg-border last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`font-mono text-[10px] font-bold ${cfg.color}`}>{bandLabel(t, cfg.label)}</span>
                    {(h.totalEmkQuantity ?? 1) > 1 ? (
                      <>
                        <span className="font-mono text-[10px] font-bold text-accent-red">{h.emk3Quantity ? `${h.emk3Quantity}×EMK3` : ''}</span>
                        <span className="font-mono text-[10px] font-bold text-accent-green">{h.emk2Quantity ? `${h.emk2Quantity}×EMK2` : ''}</span>
                        <span className="font-mono text-[10px] font-bold text-accent-blue">{h.emk1Quantity ? `${h.emk1Quantity}×EMK1` : ''}</span>
                      </>
                    ) : (
                      <span className={`font-mono text-[10px] font-bold ${EMK_COLORS[h.recommendedEmk]}`}>{h.recommendedEmk}</span>
                    )}
                    <span className="font-mono text-[10px] text-text-muted">{h.totalScore}/20</span>
                  </div>
                  <p className="font-mono text-[10px] text-text-secondary truncate">{h.address}</p>
                </div>
                <span className="font-mono text-[10px] text-text-muted flex-shrink-0">{timeAgo(t, h.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB: ASSESS ─────────────────────────────────────────────────────────────

function AssessTab({ districtId }: { districtId: string }) {
  const queryClient = useQueryClient();
  const [cat1, setCat1] = useState<number>(0);
  const [cat2Flags, setCat2Flags] = useState<Set<Cat2FlagId>>(new Set());
  const [cat3, setCat3] = useState<number>(0);
  const [cat4, setCat4] = useState<number>(0);
  const [cat5, setCat5] = useState<number>(0);
  const [householdSize, setHouseholdSize] = useState<number>(4);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submittedResult, setSubmittedResult] = useState<Household | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const { user } = useAuth();
  const { t } = useI18n();
  const color = useThemeColors();

  const cat2 = computeCat2(cat2Flags);
  const hasVulnerableMember = cat2Flags.size > 0;

  const liveScore = useMemo(
    () => scoreHousehold({ cat1, cat2, cat3, cat4, cat5, householdSize, hasVulnerableMember } as ScoreInput),
    [cat1, cat2, cat3, cat4, cat5, householdSize, hasVulnerableMember]
  );
  const bandCfg = BAND_CONFIG[liveScore.priorityBand];
  const scorePct = (liveScore.totalScore / 20) * 100;

  const toggleFlag = useCallback((id: Cat2FlagId) => {
    setCat2Flags(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCat1(0); setCat2Flags(new Set()); setCat3(0); setCat4(0); setCat5(0);
    setHouseholdSize(4);
    setAddress(''); setNotes(''); setSubmittedResult(null); setSavedOffline(false);
  }, []);

  const submitMutation = useMutation({
    // online: saved straight away; offline: kept in the outbox and synced later
    // (clientRef lets the server ignore a retry that already got through)
    mutationFn: (payload: CreateHouseholdPayload) => submitOrQueue<Household>({
      userId: user!.id,
      kind: 'assessment',
      url: '/api/households',
      body: { ...payload, clientRef: crypto.randomUUID() },
      label: `${t('vol.outbox.assessment')} · ${payload.address}`,
    }),
    onSuccess: (result, payload) => {
      if (result.queued) {
        // show the score computed on the device (same rules as the server)
        const now = new Date().toISOString();
        setSavedOffline(true);
        setSubmittedResult({
          id: result.item.id, address: payload.address, districtId: payload.districtId, district: { name: '' },
          medicalUrgencyScore: liveScore.cat1, vulnerabilityScore: liveScore.cat2, floodExposureScore: liveScore.cat3,
          selfSufficiencyScore: liveScore.cat4, isolationScore: liveScore.cat5, totalScore: liveScore.totalScore,
          priorityBand: liveScore.priorityBand, recommendedEmk: liveScore.recommendedEmk, householdSize,
          emk1Quantity: liveScore.emkQuantity.emk1, emk2Quantity: liveScore.emkQuantity.emk2,
          emk3Quantity: liveScore.emkQuantity.emk3, totalEmkQuantity: liveScore.emkQuantity.total,
          delivered: false, deliveredAt: null, createdAt: now, updatedAt: now,
        });
        return;
      }
      setSubmittedResult(result.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.households.queue(districtId) });
      // invalidate audit log too
      queryClient.invalidateQueries({ queryKey: [...queryKeys.households.queue(districtId), 'all'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    },
  });

  const submitError = (submitMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  // ── Result view ──────────────────────────────────────────────────────────────
  if (submittedResult) {
    const rBand = BAND_CONFIG[submittedResult.priorityBand];
    return (
      <div className="max-w-xl">
        {savedOffline && (
          <div className="card px-4 py-3 mb-4 border-accent-orange/40 bg-accent-orange/5">
            <p className="font-mono text-xs text-accent-orange font-bold mb-0.5">{t('vol.savedOffline')}</p>
            <p className="font-mono text-[11px] text-text-secondary leading-relaxed">
              {t('vol.savedOfflineAssess')}
            </p>
          </div>
        )}
        <div className={`card p-6 border-2 ${rBand.border} mb-4`}>
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke={color('bg-border')} strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none"
                  stroke={color(rBand.ring)}
                  strokeWidth="6"
                  strokeDasharray={`${((submittedResult.totalScore / 20) * 163.4)} 163.4`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-xl font-bold leading-none ${rBand.color}`}>{submittedResult.totalScore}</span>
                <span className="font-mono text-[10px] text-text-muted">/20</span>
              </div>
            </div>
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border font-mono text-sm font-bold mb-2 ${rBand.bg} ${rBand.border} ${rBand.color}`}>
                <span className={`w-2 h-2 rounded-full ${rBand.dot}`} />{bandLabel(t, rBand.label)}
              </div>
              <p className="font-mono text-xs text-text-muted">
                {t(BAND_GUIDANCE_SHORT[submittedResult.priorityBand])}
              </p>
            </div>
          </div>
          <div className="space-y-2 border-t border-bg-border pt-4">
            <div className="flex justify-between items-center py-1.5">
              <span className="font-mono text-xs text-text-muted">{t('queue.col.address')}</span>
              <span className="font-sans text-sm text-text-primary">{submittedResult.address}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">{t('vol.primaryEmk')}</span>
              <span className={`font-mono text-sm font-bold ${EMK_COLORS[submittedResult.recommendedEmk]}`}>{submittedResult.recommendedEmk}</span>
            </div>
            {submittedResult.totalEmkQuantity !== undefined && submittedResult.totalEmkQuantity > 0 && (
              <div className="flex justify-between items-start py-1.5 border-t border-bg-border">
                <span className="font-mono text-xs text-text-muted">{t('vol.kitBreakdown')}</span>
                <EmkQuantityBadge
                  emk3={submittedResult.emk3Quantity ?? 0}
                  emk2={submittedResult.emk2Quantity ?? 0}
                  emk1={submittedResult.emk1Quantity ?? 0}
                  total={submittedResult.totalEmkQuantity ?? 1}
                />
              </div>
            )}
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">{t('vol.householdSizeShort')}</span>
              <span className="font-mono text-xs text-text-secondary">{t('vol.people', { count: submittedResult.householdSize ?? householdSize })}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">{t('vol.scoreBreakdown')}</span>
              <span className="font-mono text-xs text-text-secondary">
                Cat1:{submittedResult.medicalUrgencyScore} Cat2:{submittedResult.vulnerabilityScore} Cat3:{submittedResult.floodExposureScore} Cat4:{submittedResult.selfSufficiencyScore} Cat5:{submittedResult.isolationScore}
              </span>
            </div>
          </div>
        </div>
        <button onClick={reset} className="btn-primary w-full">{t('vol.assessNext')}</button>
      </div>
    );
  }

  // ── Form view — 70/30 layout ──────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {submitError && <ErrorBox msg={submitError} onDismiss={() => submitMutation.reset()} />}

      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left: form categories — 70% ── */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="card p-5">
            <SectionTitle>{t('vol.address')}</SectionTitle>
            <input type="text" className="input" placeholder={t('vol.addressPlaceholder')}
              value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="card p-5">
            <SectionTitle sub={t('vol.householdSizeSub')}>{t('vol.householdSize')}</SectionTitle>
            <div className="flex items-center gap-4">
              <div>
                <label className="label">{t('vol.totalPeople')}</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                    className="w-8 h-8 rounded border border-bg-border text-text-secondary hover:text-text-primary font-mono text-lg flex items-center justify-center">-</button>
                  <span className="font-mono text-xl font-bold text-text-primary w-8 text-center">{householdSize}</span>
                  <button onClick={() => setHouseholdSize(Math.min(20, householdSize + 1))}
                    className="w-8 h-8 rounded border border-bg-border text-text-secondary hover:text-text-primary font-mono text-lg flex items-center justify-center">+</button>
                </div>
                <p className="font-mono text-[10px] text-text-muted mt-1">
                  {t('vol.emkRule')}
                </p>
              </div>
            </div>
            {liveScore.emkQuantity && (
              <div className="mt-4 pt-3 border-t border-bg-border">
                <EmkQuantityBadge
                  emk3={liveScore.emkQuantity.emk3}
                  emk2={liveScore.emkQuantity.emk2}
                  emk1={liveScore.emkQuantity.emk1}
                  total={liveScore.emkQuantity.total}
                />
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle sub={t('vol.cat1.sub')}>1. {t('vol.cat1')}</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat1 > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{cat1}/8</span>
            </div>
            <div className="space-y-2">
              {CAT1_OPTIONS.map(opt => (
                <OptionButton key={opt.value} selected={cat1 === opt.value} onClick={() => setCat1(opt.value)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-sans text-sm ${cat1 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{t(CAT1_LABELS[opt.value])}</span>
                    <span className={`font-mono text-xs font-semibold flex-shrink-0 ${cat1 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
                  </div>
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle sub={t('vol.cat2.sub')}>2. {t('vol.cat2')}</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat2 > 0 ? 'text-accent-orange' : 'text-text-muted'}`}>{cat2}/5</span>
            </div>
            <div className="space-y-2">
              {CAT2_FLAGS.map(flag => {
                const checked = cat2Flags.has(flag.id);
                return (
                  <OptionButton key={flag.id} selected={checked} onClick={() => toggleFlag(flag.id)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'}`}>
                        {checked && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                      </div>
                      <span className={`font-sans text-sm flex-1 ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>{t(CAT2_LABELS[flag.id])}</span>
                      <span className={`font-mono text-xs flex-shrink-0 ${checked ? 'text-accent-blue' : 'text-text-muted'}`}>+{flag.points}</span>
                    </div>
                  </OptionButton>
                );
              })}
              {cat2 >= 5 && <p className="font-mono text-[11px] text-accent-yellow px-1">{t('vol.capReached')}</p>}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle sub={t('vol.cat3.sub')}>3. {t('vol.cat3')}</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat3 > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{cat3}/4</span>
            </div>
            <div className="space-y-2">
              {CAT3_OPTIONS.map(opt => (
                <OptionButton key={opt.value} selected={cat3 === opt.value} onClick={() => setCat3(opt.value)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-sans text-sm ${cat3 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{t(CAT3_LABELS[opt.value])}</span>
                    <span className={`font-mono text-xs flex-shrink-0 ${cat3 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
                  </div>
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle sub={t('vol.cat4.sub')}>4. {t('vol.cat4')}</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat4 > 0 ? 'text-accent-yellow' : 'text-text-muted'}`}>{cat4}/2</span>
            </div>
            <div className="space-y-2">
              {CAT4_OPTIONS.map(opt => (
                <OptionButton key={opt.value} selected={cat4 === opt.value} onClick={() => setCat4(opt.value)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-sans text-sm ${cat4 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{t(CAT4_LABELS[opt.value])}</span>
                    <span className={`font-mono text-xs flex-shrink-0 ${cat4 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
                  </div>
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>5. {t('vol.cat5')}</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat5 > 0 ? 'text-accent-orange' : 'text-text-muted'}`}>{cat5}/1</span>
            </div>
            <OptionButton selected={cat5 === 1} onClick={() => setCat5(cat5 === 1 ? 0 : 1)}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${cat5 === 1 ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'}`}>
                  {cat5 === 1 && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                </div>
                <span className={`font-sans text-sm flex-1 ${cat5 === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>{t('score.cat5.1')}</span>
                <span className={`font-mono text-xs flex-shrink-0 ${cat5 === 1 ? 'text-accent-blue' : 'text-text-muted'}`}>1pt</span>
              </div>
            </OptionButton>
          </div>

          <div className="card p-5">
            <SectionTitle>{t('vol.notes')}</SectionTitle>
            <textarea rows={3} className="input resize-none" placeholder={t('vol.notesPlaceholder')}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* ── Right: live score + audit log — 30% ── */}
        <div className="w-full lg:w-[30%] flex-shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* live score card */}
            <div className={`card p-5 border-2 transition-colors duration-300 ${bandCfg.border}`}>
              <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-4">{t('vol.liveScore')}</p>

              {/* score circle + band — larger */}
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke={color('bg-border')} strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none"
                      stroke={color(bandCfg.ring)}
                      strokeWidth="5" strokeDasharray={`${(scorePct / 100) * 163.4} 163.4`}
                      strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-mono text-3xl font-bold leading-none ${bandCfg.color}`}>{liveScore.totalScore}</span>
                    <span className="font-mono text-[10px] text-text-muted">/20</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-sm font-bold mb-2 ${bandCfg.bg} ${bandCfg.border} ${bandCfg.color}`}>
                    <span className={`w-2 h-2 rounded-full ${bandCfg.dot}`} />{bandLabel(t, bandCfg.label)}
                  </div>
                  <p className={`font-mono text-sm font-bold ${EMK_COLORS[liveScore.recommendedEmk]}`}>→ {liveScore.recommendedEmk}</p>
                </div>
              </div>

              {/* kit quantity */}
              {liveScore.emkQuantity && (
                <div className="pt-3 border-t border-bg-border mb-4">
                  <EmkQuantityBadge
                    emk3={liveScore.emkQuantity.emk3}
                    emk2={liveScore.emkQuantity.emk2}
                    emk1={liveScore.emkQuantity.emk1}
                    total={liveScore.emkQuantity.total}
                  />
                </div>
              )}

              {/* category bars */}
              <div className="space-y-2">
                {[
                  { label: t('vol.bar.medical'),       val: cat1, max: 8, color: 'bg-accent-red'    },
                  { label: t('vol.bar.vulnerability'), val: cat2, max: 5, color: 'bg-accent-orange' },
                  { label: t('vol.bar.flood'),         val: cat3, max: 4, color: 'bg-accent-yellow' },
                  { label: t('vol.bar.selfSuff'),      val: cat4, max: 2, color: 'bg-accent-blue'   },
                  { label: t('vol.cat5'),              val: cat5, max: 1, color: 'bg-accent-green'  },
                ].map(bar => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-text-muted w-20 flex-shrink-0">{bar.label}</span>
                    <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full transition-all duration-300`}
                        style={{ width: bar.max > 0 ? `${(bar.val / bar.max) * 100}%` : '0%' }} />
                    </div>
                    <span className="font-mono text-[10px] text-text-muted w-8 text-right flex-shrink-0">{bar.val}/{bar.max}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* delivery guidance */}
            <div className={`rounded border px-4 py-3 ${bandCfg.bg} ${bandCfg.border}`}>
              <p className={`font-mono text-[11px] font-bold mb-0.5 ${bandCfg.color}`}>{t('vol.guidance')}</p>
              <p className="font-mono text-[11px] text-text-secondary">
                {t(BAND_GUIDANCE[liveScore.priorityBand])}
              </p>
            </div>

            {/* submit button */}
            <button
              onClick={() => address.trim() && submitMutation.mutate({
                address: address.trim(), districtId,
                cat1, cat2, cat3, cat4, cat5,
                householdSize, hasVulnerableMember,
                notes: notes.trim() || undefined,
              })}
              disabled={submitMutation.isPending || !address.trim()}
              className="btn-primary w-full">
              {submitMutation.isPending ? t('vol.submitting') : `${t('vol.submit')} · ${liveScore.totalScore}/20`}
            </button>
            <p className="font-mono text-[11px] text-text-muted text-center">{t('vol.scale')}</p>

            {/* audit log — below submit */}
            <AssessAuditLog districtId={districtId} />

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DELIVER ─────────────────────────────────────────────────────────────

// ─── TAB: DELIVER ─────────────────────────────────────────────────────────────

function DeliverTab({ districtId }: { districtId: string }) {
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useI18n();
  const { pending } = useOutbox(user?.id);

  // deliveries recorded offline and not yet synced — shown as such so nobody delivers twice
  const queuedHouseholdIds = useMemo(
    () => new Set(pending.filter(i => i.kind === 'delivery').map(i => (i.body as { householdId: string }).householdId)),
    [pending]
  );

  const { data: householdsResult, isLoading: queueLoading } = useQuery({
    queryKey: queryKeys.households.queue(districtId),
    queryFn: () => householdsApi.getPriorityQueue(districtId, 1, 200),
    enabled: !!districtId,
    staleTime: 15_000,
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: [...queryKeys.hub.deliveries(districtId), 'active'],
    queryFn: () => api.get('/api/delivery/runs', { params: { districtId } }).then(r => r.data),
    enabled: !!districtId,
    refetchInterval: 30_000,
  });

  const activeRuns: DeliveryRun[] = runsData?.active ?? [];

  // auto-select the first run when runs load and nothing is selected yet
  const activeRun: DeliveryRun | null =
    activeRuns.find(r => r.id === selectedRunId) ?? activeRuns[0] ?? null;

  const households = householdsResult?.data ?? [];
  const sorted = useMemo(
    () => [...households].sort((a: Household, b: Household) => BAND_ORDER[a.priorityBand] - BAND_ORDER[b.priorityBand]),
    [households]
  );

  const deliverMutation = useMutation({
    mutationFn: (household: Household) => {
      const now = new Date().toISOString();
      const kits: Array<{ emkType: string; quantity: number }> = [];
      if ((household.emk3Quantity ?? 0) > 0) kits.push({ emkType: 'EMK3', quantity: household.emk3Quantity! });
      if ((household.emk2Quantity ?? 0) > 0) kits.push({ emkType: 'EMK2', quantity: household.emk2Quantity! });
      if ((household.emk1Quantity ?? 0) > 0) kits.push({ emkType: 'EMK1', quantity: household.emk1Quantity! });
      if (kits.length === 0) kits.push({ emkType: household.recommendedEmk, quantity: household.totalEmkQuantity ?? 1 });
      // offline → kept in the outbox; deliveredAt is the real hand-over time either way
      return submitOrQueue({
        userId: user!.id,
        kind: 'delivery',
        url: '/api/delivery/receipts',
        body: { deliveryRunId: activeRun!.id, householdId: household.id, kits, deliveredAt: now },
        label: `${t('vol.outbox.delivery')} · ${household.address}`,
      });
    },
    onSuccess: (result) => {
      setConfirming(null);
      if (result.queued) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.households.queue(districtId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.hub.deliveries(districtId), 'active'] });
    },
  });

  const deliverError = (deliverMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';
  const isLoading = queueLoading || runsLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-bg-elevated rounded border border-bg-border animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {deliverError && <ErrorBox msg={deliverError} onDismiss={() => deliverMutation.reset()} />}

      {/* ── run selector ── */}
      {activeRuns.length === 0 ? (
        <div className="card px-4 py-3 border-accent-orange/20">
          <p className="font-mono text-xs text-accent-orange">{t('vol.noRun')}</p>
        </div>
      ) : activeRuns.length === 1 ? (
        // single run — just show the banner, no need to pick
        <div className="card px-4 py-3 border-accent-green/30 bg-accent-green/5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow flex-shrink-0" />
          <div>
            <p className="font-sans text-sm font-semibold text-text-primary">
              {t('vol.teamZone', { n: activeRun!.teamNumber, zone: zoneLabel(t, activeRun!.zone) })} — {t('vol.activeRun')}
            </p>
            <p className="font-mono text-[11px] text-text-muted">
              {t('vol.deliveries', { count: new Set(activeRun!.receipts?.map(r => r.householdId) ?? []).size })}
            </p>
          </div>
        </div>
      ) : (
        // multiple runs — let volunteer pick which one they're on
        <div className="card p-4">
          <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">
            {t('vol.selectRun', { count: activeRuns.length })}
          </p>
          <div className="space-y-2">
            {activeRuns.map(run => {
              const isSelected = (selectedRunId ?? activeRuns[0]?.id) === run.id;
              const deliveryCount = new Set(run.receipts?.map(r => r.householdId) ?? []).size;
              return (
                <button
                  key={run.id}
                  onClick={() => { setSelectedRunId(run.id); setConfirming(null); }}
                  className={`w-full text-left px-4 py-3 rounded border transition-all ${
                    isSelected
                      ? 'bg-accent-green/10 border-accent-green/40'
                      : 'bg-bg-elevated border-bg-border hover:border-bg-border/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-accent-green' : 'bg-text-muted'}`} />
                      <span className={`font-sans text-sm font-semibold ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {t('vol.teamZone', { n: run.teamNumber, zone: zoneLabel(t, run.zone) })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-text-muted">{deliveryCount} {t('routing.delivered')}</span>
                      {isSelected && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-accent-green/40 text-accent-green bg-accent-green/10">
                          {t('vol.selected')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── priority queue ── */}
      <div>
        <SectionTitle sub={t('vol.queueSub', { count: householdsResult?.total ?? 0 })}>{t('queue.title')}</SectionTitle>
        {households.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="font-sans text-sm text-text-primary font-semibold">{t('vol.allDelivered')}</p>
            <p className="font-mono text-xs text-text-muted mt-1">{t('vol.checkBack')}</p>
          </div>
        ) : (
          <div className="card divide-y divide-bg-border">
            {sorted.map((h: Household) => {
              const cfg = BAND_CONFIG[h.priorityBand];
              const isConfirming = confirming === h.id;
              const isDelivering = deliverMutation.isPending && deliverMutation.variables?.id === h.id;
              const qty = h.totalEmkQuantity ?? 1;
              return (
                <div key={h.id} className={`px-4 py-4 transition-colors ${isConfirming ? cfg.bg : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge label={bandLabel(t, cfg.label)} color={`${cfg.color} ${cfg.border} ${cfg.bg}`} />
                        <span className={`font-mono text-[11px] font-bold ${EMK_COLORS[h.recommendedEmk]}`}>{h.recommendedEmk}</span>
                        <span className="font-mono text-[11px] text-text-muted">{h.totalScore}/20</span>
                        {qty > 1 && <span className="font-mono text-[11px] text-accent-yellow font-bold">{t('vol.nKits', { count: qty })}</span>}
                      </div>
                      <p className="font-sans text-sm text-text-primary">{h.address}</p>
                      {qty > 1 && (h.emk3Quantity || h.emk2Quantity || h.emk1Quantity) && (
                        <div className="mt-1">
                          <EmkQuantityBadge
                            emk3={h.emk3Quantity ?? 0}
                            emk2={h.emk2Quantity ?? 0}
                            emk1={h.emk1Quantity ?? 0}
                            total={qty}
                          />
                        </div>
                      )}
                      {h.medicalUrgencyScore >= 5 && (
                        <p className="font-mono text-[11px] text-accent-red mt-0.5">{t('vol.lifeMeds')}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {queuedHouseholdIds.has(h.id) ? (
                        <span className="font-mono text-[11px] px-2 py-1 rounded border border-accent-orange/40 text-accent-orange bg-accent-orange/10"
                          title={t('vol.recordedOffline')}>
                          ⏳ {t('vol.savedOfflineShort')}
                        </span>
                      ) : !isConfirming ? (
                        <button onClick={() => setConfirming(h.id)} disabled={!activeRun}
                          className={`font-mono text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-40 ${cfg.bg} ${cfg.border} ${cfg.color} hover:opacity-80`}>
                          {t('vol.deliver')} {qty > 1 ? `(${qty})` : ''}
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => deliverMutation.mutate(h)} disabled={isDelivering}
                            className="font-mono text-xs px-3 py-1.5 rounded border border-accent-green/40 text-accent-green bg-accent-green/10 hover:bg-accent-green/20 transition-colors disabled:opacity-40">
                            {isDelivering ? '...' : `✓ ${t('common.confirm')}`}
                          </button>
                          <button onClick={() => setConfirming(null)}
                            className="font-mono text-xs px-3 py-1.5 rounded border border-bg-border text-text-muted hover:text-text-secondary transition-colors">
                            {t('common.cancel')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB: REPORT ──────────────────────────────────────────────────────────────

function ReportTab({ districtId }: { districtId: string }) {
  const queryClient = useQueryClient();
  const [incType, setIncType] = useState<typeof INCIDENT_TYPES[number]['value']>('ROUTE_BLOCKED');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState<{ type: string; autoEscalated: boolean; savedOffline?: boolean } | null>(null);
  const { user } = useAuth();
  const { t } = useI18n();
  const online = useOnline();

  const selectedType = INCIDENT_TYPES.find(it => it.value === incType)!;
  const selectedLabel = enumLabel(t, 'incidentType', selectedType.value);

  const reportMutation = useMutation({
    mutationFn: (payload: { districtId: string; type: string; description: string }) =>
      submitOrQueue<{ autoEscalated?: boolean }>({
        userId: user!.id,
        kind: 'incident',
        url: '/api/incidents',
        body: { ...payload, clientRef: crypto.randomUUID() },
        label: `${t('vol.outbox.incident')} · ${enumLabel(t, 'incidentType', payload.type)}`,
      }),
    onSuccess: (result) => {
      if (result.queued) {
        setSubmitted({ type: incType, autoEscalated: false, savedOffline: true });
        setDescription('');
        return;
      }
      setSubmitted({ type: incType, autoEscalated: result.data?.autoEscalated ?? false });
      setDescription('');
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.incidents(districtId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    },
  });

  const reportError = (reportMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  if (submitted?.savedOffline) {
    const isSafety = submitted.type === 'VOLUNTEER_SAFETY';
    return (
      <div className="space-y-4">
        <div className={`card p-6 ${isSafety ? 'border-accent-red/60 bg-accent-red/10' : 'border-accent-orange/40 bg-accent-orange/5'}`}>
          <div className="flex items-start gap-4">
            <span className="text-4xl flex-shrink-0">{isSafety ? '📻' : '⏳'}</span>
            <div>
              <p className="font-display font-bold text-text-primary text-lg mb-1">{t('vol.savedOffline')}</p>
              {isSafety ? (
                <p className="font-mono text-xs text-accent-red leading-relaxed font-bold">
                  {t('vol.safetyOffline')}
                </p>
              ) : (
                <p className="font-mono text-xs text-text-secondary leading-relaxed">
                  {t('vol.reportOffline')}
                </p>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setSubmitted(null)} className="btn-primary">{t('vol.reportAnother')}</button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className={`card p-6 ${submitted.autoEscalated ? 'border-accent-red/40 bg-accent-red/5' : 'border-accent-green/30 bg-accent-green/5'}`}>
          <div className="flex items-start gap-4">
            <span className="text-4xl flex-shrink-0">{submitted.autoEscalated ? '🚨' : '✓'}</span>
            <div>
              <p className="font-display font-bold text-text-primary text-lg mb-1">{t('vol.reported')}</p>
              {submitted.autoEscalated ? (
                <>
                  <Badge label={t('vol.autoEscalated')} color="text-accent-red border-accent-red/30 bg-accent-red/10" />
                  <p className="font-mono text-[11px] text-text-secondary mt-2 leading-relaxed">
                    {t('vol.autoEscalatedBody')}
                  </p>
                </>
              ) : (
                <p className="font-mono text-xs text-accent-green">{t('vol.notified')}</p>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setSubmitted(null)} className="btn-primary">{t('vol.reportAnother')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reportError && <ErrorBox msg={reportError} onDismiss={() => reportMutation.reset()} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle sub={t('vol.typeSub')}>{t('vol.incidentType')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {INCIDENT_TYPES.map(it => (
              <OptionButton key={it.value} selected={incType === it.value} onClick={() => setIncType(it.value)} danger={it.value === 'VOLUNTEER_SAFETY'}>
                <div className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">{it.icon}</span>
                  <div className="flex-1">
                    <span className={`font-sans text-sm font-medium ${incType === it.value ? 'text-text-primary' : 'text-text-secondary'}`}>{enumLabel(t, 'incidentType', it.value)}</span>
                    {it.autoEscalate && <span className="block font-mono text-[10px] text-accent-red mt-0.5">{t('vol.autoEscalates')}</span>}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    incType === it.value
                      ? it.value === 'VOLUNTEER_SAFETY' ? 'border-accent-red bg-accent-red' : 'border-accent-blue bg-accent-blue'
                      : 'border-bg-border'
                  }`}>
                    {incType === it.value && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                  </div>
                </div>
              </OptionButton>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {incType === 'VOLUNTEER_SAFETY' && (
            <div className="bg-accent-red/10 border border-accent-red/40 rounded px-4 py-3 flex gap-3 animate-slide-in">
              <span className="text-2xl flex-shrink-0">🚨</span>
              <div>
                <p className="font-mono text-xs font-bold text-accent-red mb-1">{t('vol.safetyConstraint')}</p>
                <p className="font-mono text-[11px] text-accent-red/80 leading-relaxed">
                  {t('vol.safetyConstraintBody')}
                </p>
              </div>
            </div>
          )}

          <div className="card p-5">
            <SectionTitle sub={t('vol.descSub')}>{t('vol.description')}</SectionTitle>
            <textarea rows={8} className="input resize-none"
              placeholder={
                incType === 'ROUTE_BLOCKED'    ? t('vol.ph.route') :
                incType === 'VOLUNTEER_SAFETY' ? t('vol.ph.safety') :
                incType === 'BUILDING_FLOODED' ? t('vol.ph.building') :
                t('vol.ph.other')
              }
              value={description} onChange={e => setDescription(e.target.value)} />
            <p className="font-mono text-[11px] text-text-muted mt-2">{t('vol.reportingAs')} {selectedType.icon} {selectedLabel}</p>
          </div>

          {!online && (
            <p className="font-mono text-[11px] text-accent-orange leading-relaxed">
              {t('vol.offlineWarning')}
            </p>
          )}

          <button
            onClick={() => description.trim() && reportMutation.mutate({ districtId, type: incType, description: description.trim() })}
            disabled={reportMutation.isPending || !description.trim()}
            className={`w-full py-2.5 rounded font-sans font-semibold text-sm transition-all disabled:opacity-40 ${
              incType === 'VOLUNTEER_SAFETY' ? 'bg-accent-red text-white hover:bg-accent-red/90' : 'btn-primary'
            }`}>
            {reportMutation.isPending ? t('vol.reporting') : t('vol.reportType', { type: selectedLabel })}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN VOLUNTEER PAGE ──────────────────────────────────────────────────────

export function VolunteerPage() {
  const { t } = useI18n();
  usePageTitle(t('nav.volunteer'));
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('assess');

  const { data: districtData, isLoading: districtLoading } = useQuery({
    queryKey: queryKeys.districts.detail(user?.districtId ?? ''),
    queryFn: () => api.get(`/api/districts/${user!.districtId}`).then(r => r.data),
    enabled: !!user?.districtId,
  });
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => import('../api/dashboard').then(m => m.dashboardApi.getSummary()),
    enabled: !user?.districtId,
  });

  const realDistricts = (summaryData?.districts ?? []).filter((d: { name: string }) => d.name !== '__central__');
  const districtId = user?.districtId ?? realDistricts[0]?.districtId ?? '';
  const rawDistrictName = districtData?.name ?? realDistricts[0]?.name;
  const districtName = rawDistrictName ? districtLabel(t, rawDistrictName) : t('vol.yourDistrict');
  const isLoading = user?.districtId ? districtLoading : summaryLoading;

  const TABS: Array<{ id: TabId; Icon: LucideIcon; label: string }> = [
    { id: 'assess',  Icon: ClipboardCheck, label: t('vol.tab.assess')  },
    { id: 'deliver', Icon: Truck,          label: t('vol.deliver') },
    { id: 'report',  Icon: AlertTriangle,  label: t('vol.tab.report')  },
  ];

  if (isLoading) {
    return <DashboardLayout title={t('vol.title')}><VolunteerSkeleton /></DashboardLayout>;
  }

  if (!districtId) {
    return (
      <DashboardLayout title={t('vol.title')}>
        <div className="py-20 text-center max-w-sm mx-auto">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="font-display font-bold text-text-primary mb-2">{t('vol.noDistrict')}</p>
          <p className="font-mono text-xs text-text-muted">{t('vol.noDistrictHint')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('vol.title')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
            <span className="font-sans font-semibold text-text-primary">{districtName}</span>
            <span className="font-mono text-[11px] text-text-muted">· {user?.name ?? t('role.VOLUNTEER')}</span>
          </div>
          <span className="font-mono text-[11px] text-text-muted">
            {activeTab === 'assess'  ? t('vol.tabHint.assess') :
             activeTab === 'deliver' ? t('vol.tabHint.deliver') :
                                      t('vol.tabHint.report')}
          </span>
        </div>

        <div role="tablist" className="flex gap-0.5 bg-bg-elevated rounded-lg p-1 border border-bg-border w-full sm:w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              role="tab" aria-selected={activeTab === tab.id}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] rounded-md font-sans text-sm font-medium transition-colors duration-100 border ${
                activeTab === tab.id
                  ? 'bg-bg-primary text-text-primary border-bg-border shadow-sm'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-hover'
              }`}>
              <tab.Icon size={15} strokeWidth={2} className={activeTab === tab.id ? 'text-accent-blue' : ''} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-fade-in">
          {activeTab === 'assess'  && <AssessTab  districtId={districtId} />}
          {activeTab === 'deliver' && <DeliverTab districtId={districtId} />}
          {activeTab === 'report'  && <ReportTab  districtId={districtId} />}
        </div>
      </div>
    </DashboardLayout>
  );
}