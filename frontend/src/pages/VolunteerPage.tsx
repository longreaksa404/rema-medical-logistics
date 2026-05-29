// VolunteerPage.tsx — V8 Volunteer View
// Updated: 70/30 layout, audit log history under live score panel

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { householdsApi } from '../api/households';
import { queryKeys } from '../api/queryKeys';
import type { Household } from '../api/households';
import {
  scoreHousehold, computeCat2,
  CAT1_OPTIONS, CAT2_FLAGS, CAT3_OPTIONS, CAT4_OPTIONS,
} from '../utils/scoring';
import type { ScoreInput, PriorityBand, Cat2FlagId } from '../utils/scoring';
import { usePageTitle } from '../hooks/usePageTitle';

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

const BAND_CONFIG: Record<PriorityBand, { label: string; color: string; bg: string; border: string; dot: string }> = {
  CRITICAL: { label: 'CRITICAL', color: 'text-accent-red',    bg: 'bg-accent-red/10',    border: 'border-accent-red/40',    dot: 'bg-accent-red'    },
  HIGH:     { label: 'HIGH',     color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/40', dot: 'bg-accent-orange' },
  MEDIUM:   { label: 'MEDIUM',   color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/40', dot: 'bg-accent-yellow' },
  STANDARD: { label: 'STANDARD', color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/30',  dot: 'bg-accent-green'  },
};

const EMK_COLORS: Record<string, string> = {
  EMK1: 'text-accent-blue', EMK2: 'text-accent-green', EMK3: 'text-accent-red',
};

const INCIDENT_TYPES = [
  { value: 'ROUTE_BLOCKED',    label: 'Route Blocked',    icon: '🚧', autoEscalate: false },
  { value: 'VOLUNTEER_SAFETY', label: 'Volunteer Safety', icon: '⚠️', autoEscalate: true  },
  { value: 'STOCK_SCARCITY',   label: 'Stock Scarcity',   icon: '📦', autoEscalate: false },
  { value: 'BUILDING_FLOODED', label: 'Building Flooded', icon: '🌊', autoEscalate: false },
  { value: 'OTHER',            label: 'Other',            icon: '📋', autoEscalate: false },
] as const;

const BAND_ORDER: Record<PriorityBand, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, STANDARD: 3 };

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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
      <h3 className="font-sans font-bold text-text-primary">{children}</h3>
      {sub && <p className="font-mono text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${color}`}>{label}</span>;
}

function ErrorBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-red">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[10px] text-accent-red flex-shrink-0">✕</button>
    </div>
  );
}

function SuccessBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-green">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[10px] text-accent-green flex-shrink-0">✕</button>
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
  const parts: string[] = [];
  if (emk3 > 0) parts.push(`${emk3}x EMK3`);
  if (emk2 > 0) parts.push(`${emk2}x EMK2`);
  if (emk1 > 0) parts.push(`${emk1}x EMK1`);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-mono text-[10px] text-text-muted">Kits:</span>
      {parts.map((p, i) => (
        <span key={i} className={`font-mono text-[10px] font-bold ${
          p.includes('EMK3') ? 'text-accent-red' : p.includes('EMK2') ? 'text-accent-green' : 'text-accent-blue'
        }`}>{p}</span>
      ))}
      <span className="font-mono text-[10px] text-text-muted">= {total} total</span>
    </div>
  );
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
// Shows last 10 assessed households for this district — placed below live score

function AssessAuditLog({ districtId }: { districtId: string }) {
  const { data: historyResult, isLoading } = useQuery({
    queryKey: [...queryKeys.households.queue(districtId), 'all'],
    queryFn: () => householdsApi.list({ districtId }),
    enabled: !!districtId,
    staleTime: 15_000,
  });

  // sort by createdAt descending, take last 10
  const history = historyResult?.data ?? [];
  const recent = useMemo(
    () => [...history]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10),
    [history]
  );

  if (isLoading) {
    return (
      <div className="card p-4 space-y-2">
        <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">Assessment History</p>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }

  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
        Assessment History
      </p>
      {recent.length === 0 ? (
        <p className="font-mono text-[10px] text-text-muted text-center py-4">No assessments yet this session.</p>
      ) : (
        <div className="space-y-2">
          {recent.map(h => {
            const cfg = BAND_CONFIG[h.priorityBand];
            return (
              <div key={h.id} className="flex items-start gap-2 py-2 border-b border-bg-border last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`font-mono text-[9px] font-bold ${cfg.color}`}>{cfg.label}</span>
                    {(h.totalEmkQuantity ?? 1) > 1 ? (
                      <>
                        <span className="font-mono text-[9px] font-bold text-accent-red">{h.emk3Quantity ? `${h.emk3Quantity}×EMK3` : ''}</span>
                        <span className="font-mono text-[9px] font-bold text-accent-green">{h.emk2Quantity ? `${h.emk2Quantity}×EMK2` : ''}</span>
                        <span className="font-mono text-[9px] font-bold text-accent-blue">{h.emk1Quantity ? `${h.emk1Quantity}×EMK1` : ''}</span>
                      </>
                    ) : (
                      <span className={`font-mono text-[9px] font-bold ${EMK_COLORS[h.recommendedEmk]}`}>{h.recommendedEmk}</span>
                    )}
                    <span className="font-mono text-[9px] text-text-muted">{h.totalScore}/20</span>
                  </div>
                  <p className="font-mono text-[9px] text-text-secondary truncate">{h.address}</p>
                </div>
                <span className="font-mono text-[9px] text-text-muted flex-shrink-0">{timeAgo(h.createdAt)}</span>
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
    setAddress(''); setNotes(''); setSubmittedResult(null);
  }, []);

  const submitMutation = useMutation({
    mutationFn: householdsApi.create,
    onSuccess: (result) => {
      setSubmittedResult(result);
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
        <div className={`card p-6 border-2 ${rBand.border} mb-4`}>
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#21262d" strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none"
                  stroke={submittedResult.priorityBand === 'CRITICAL' ? '#f85149' : submittedResult.priorityBand === 'HIGH' ? '#f0883e' : submittedResult.priorityBand === 'MEDIUM' ? '#d29922' : '#3fb950'}
                  strokeWidth="6"
                  strokeDasharray={`${((submittedResult.totalScore / 20) * 163.4)} 163.4`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-xl font-bold leading-none ${rBand.color}`}>{submittedResult.totalScore}</span>
                <span className="font-mono text-[9px] text-text-muted">/20</span>
              </div>
            </div>
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border font-mono text-sm font-bold mb-2 ${rBand.bg} ${rBand.border} ${rBand.color}`}>
                <span className={`w-2 h-2 rounded-full ${rBand.dot}`} />{rBand.label}
              </div>
              <p className="font-mono text-xs text-text-muted">
                {submittedResult.priorityBand === 'CRITICAL' ? 'Deliver in current run' :
                 submittedResult.priorityBand === 'HIGH'     ? 'Deliver same day' :
                 submittedResult.priorityBand === 'MEDIUM'   ? 'Deliver within 48h' :
                                                               'Community collection point'}
              </p>
            </div>
          </div>
          <div className="space-y-2 border-t border-bg-border pt-4">
            <div className="flex justify-between items-center py-1.5">
              <span className="font-mono text-xs text-text-muted">Address</span>
              <span className="font-sans text-sm text-text-primary">{submittedResult.address}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">Primary EMK</span>
              <span className={`font-mono text-sm font-bold ${EMK_COLORS[submittedResult.recommendedEmk]}`}>{submittedResult.recommendedEmk}</span>
            </div>
            {submittedResult.totalEmkQuantity !== undefined && submittedResult.totalEmkQuantity > 0 && (
              <div className="flex justify-between items-start py-1.5 border-t border-bg-border">
                <span className="font-mono text-xs text-text-muted">Kit breakdown</span>
                <EmkQuantityBadge
                  emk3={submittedResult.emk3Quantity ?? 0}
                  emk2={submittedResult.emk2Quantity ?? 0}
                  emk1={submittedResult.emk1Quantity ?? 0}
                  total={submittedResult.totalEmkQuantity ?? 1}
                />
              </div>
            )}
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">Household size</span>
              <span className="font-mono text-xs text-text-secondary">{submittedResult.householdSize ?? householdSize} people</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">Score breakdown</span>
              <span className="font-mono text-xs text-text-secondary">
                Cat1:{submittedResult.medicalUrgencyScore} Cat2:{submittedResult.vulnerabilityScore} Cat3:{submittedResult.floodExposureScore} Cat4:{submittedResult.selfSufficiencyScore} Cat5:{submittedResult.isolationScore}
              </span>
            </div>
          </div>
        </div>
        <button onClick={reset} className="btn-primary w-full">Assess Next Household</button>
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
            <SectionTitle>Household Address</SectionTitle>
            <input type="text" className="input" placeholder="e.g. 45 Le Loi Street, Ward 3"
              value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="card p-5">
            <SectionTitle sub="Used to calculate how many kits to deliver">Household Size</SectionTitle>
            <div className="flex items-center gap-4">
              <div>
                <label className="label">Total people in household</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                    className="w-8 h-8 rounded border border-bg-border text-text-secondary hover:text-text-primary font-mono text-lg flex items-center justify-center">-</button>
                  <span className="font-mono text-xl font-bold text-text-primary w-8 text-center">{householdSize}</span>
                  <button onClick={() => setHouseholdSize(Math.min(20, householdSize + 1))}
                    className="w-8 h-8 rounded border border-bg-border text-text-secondary hover:text-text-primary font-mono text-lg flex items-center justify-center">+</button>
                </div>
                <p className="font-mono text-[9px] text-text-muted mt-1">
                  EMK3 determined by Category 1 — EMK2 by vulnerability flags
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
              <SectionTitle sub="Chronic illness + medication status">1. Medical Urgency</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat1 > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{cat1}/8</span>
            </div>
            <div className="space-y-2">
              {CAT1_OPTIONS.map(opt => (
                <OptionButton key={opt.value} selected={cat1 === opt.value} onClick={() => setCat1(opt.value)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-sans text-sm ${cat1 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                    <span className={`font-mono text-xs font-semibold flex-shrink-0 ${cat1 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
                  </div>
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle sub="Infant, pregnant, elderly, disabled — capped at 5">2. Household Vulnerability</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat2 > 0 ? 'text-accent-orange' : 'text-text-muted'}`}>{cat2}/5</span>
            </div>
            <div className="space-y-2">
              {CAT2_FLAGS.map(flag => {
                const checked = cat2Flags.has(flag.id);
                return (
                  <OptionButton key={flag.id} selected={checked} onClick={() => toggleFlag(flag.id)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'}`}>
                        {checked && <span className="text-bg-primary text-[9px] font-bold">✓</span>}
                      </div>
                      <span className={`font-sans text-sm flex-1 ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>{flag.label}</span>
                      <span className={`font-mono text-xs flex-shrink-0 ${checked ? 'text-accent-blue' : 'text-text-muted'}`}>+{flag.points}</span>
                    </div>
                  </OptionButton>
                );
              })}
              {cat2 >= 5 && <p className="font-mono text-[10px] text-accent-yellow px-1">Cap reached — additional flags don't add points</p>}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle sub="Water depth at or in household">3. Flood Exposure</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat3 > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{cat3}/4</span>
            </div>
            <div className="space-y-2">
              {CAT3_OPTIONS.map(opt => (
                <OptionButton key={opt.value} selected={cat3 === opt.value} onClick={() => setCat3(opt.value)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-sans text-sm ${cat3 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                    <span className={`font-mono text-xs flex-shrink-0 ${cat3 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
                  </div>
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle sub="Food, clean water, sanitation access">4. Self-Sufficiency</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat4 > 0 ? 'text-accent-yellow' : 'text-text-muted'}`}>{cat4}/2</span>
            </div>
            <div className="space-y-2">
              {CAT4_OPTIONS.map(opt => (
                <OptionButton key={opt.value} selected={cat4 === opt.value} onClick={() => setCat4(opt.value)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-sans text-sm ${cat4 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                    <span className={`font-mono text-xs flex-shrink-0 ${cat4 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
                  </div>
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>5. Isolation</SectionTitle>
              <span className={`font-mono text-sm font-bold ${cat5 > 0 ? 'text-accent-orange' : 'text-text-muted'}`}>{cat5}/1</span>
            </div>
            <OptionButton selected={cat5 === 1} onClick={() => setCat5(cat5 === 1 ? 0 : 1)}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${cat5 === 1 ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'}`}>
                  {cat5 === 1 && <span className="text-bg-primary text-[9px] font-bold">✓</span>}
                </div>
                <span className={`font-sans text-sm flex-1 ${cat5 === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>Completely isolated — no neighbors, family, or signal</span>
                <span className={`font-mono text-xs flex-shrink-0 ${cat5 === 1 ? 'text-accent-blue' : 'text-text-muted'}`}>1pt</span>
              </div>
            </OptionButton>
          </div>

          <div className="card p-5">
            <SectionTitle>Field Notes (optional)</SectionTitle>
            <textarea rows={3} className="input resize-none" placeholder="Observations, contact name, additional context..."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* ── Right: live score + audit log — 30% ── */}
        <div className="w-full lg:w-[30%] flex-shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* live score card */}
            <div className={`card p-5 border-2 transition-colors duration-300 ${bandCfg.border}`}>
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-4">Live Score</p>

              {/* score circle + band — larger */}
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#21262d" strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none"
                      stroke={liveScore.priorityBand === 'CRITICAL' ? '#f85149' : liveScore.priorityBand === 'HIGH' ? '#f0883e' : liveScore.priorityBand === 'MEDIUM' ? '#d29922' : '#3fb950'}
                      strokeWidth="5" strokeDasharray={`${(scorePct / 100) * 163.4} 163.4`}
                      strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-mono text-3xl font-bold leading-none ${bandCfg.color}`}>{liveScore.totalScore}</span>
                    <span className="font-mono text-[9px] text-text-muted">/20</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-sm font-bold mb-2 ${bandCfg.bg} ${bandCfg.border} ${bandCfg.color}`}>
                    <span className={`w-2 h-2 rounded-full ${bandCfg.dot}`} />{bandCfg.label}
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
                  { label: 'Medical',       val: cat1, max: 8, color: 'bg-accent-red'    },
                  { label: 'Vulnerability', val: cat2, max: 5, color: 'bg-accent-orange' },
                  { label: 'Flood Exp.',    val: cat3, max: 4, color: 'bg-accent-yellow' },
                  { label: 'Self-Suff.',    val: cat4, max: 2, color: 'bg-accent-blue'   },
                  { label: 'Isolation',     val: cat5, max: 1, color: 'bg-accent-green'  },
                ].map(bar => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-text-muted w-20 flex-shrink-0">{bar.label}</span>
                    <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full transition-all duration-300`}
                        style={{ width: bar.max > 0 ? `${(bar.val / bar.max) * 100}%` : '0%' }} />
                    </div>
                    <span className="font-mono text-[9px] text-text-muted w-8 text-right flex-shrink-0">{bar.val}/{bar.max}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* delivery guidance */}
            <div className={`rounded border px-4 py-3 ${bandCfg.bg} ${bandCfg.border}`}>
              <p className={`font-mono text-[10px] font-bold mb-0.5 ${bandCfg.color}`}>Delivery Guidance</p>
              <p className="font-mono text-[10px] text-text-secondary">
                {liveScore.priorityBand === 'CRITICAL' ? 'Deliver within this run — goes first' :
                 liveScore.priorityBand === 'HIGH'     ? 'Deliver in the same day' :
                 liveScore.priorityBand === 'MEDIUM'   ? 'Deliver within 48 hours' :
                                                         'Community collection point self-pickup'}
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
              {submitMutation.isPending ? 'Submitting...' : `Submit Assessment · ${liveScore.totalScore}/20`}
            </button>
            <p className="font-mono text-[10px] text-text-muted text-center">5 categories, 20-point scale</p>

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

  const { data: householdsResult, isLoading: queueLoading } = useQuery({
    queryKey: queryKeys.households.queue(districtId),
    queryFn: () => householdsApi.getPriorityQueue(districtId),
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
      return api.post('/api/delivery/receipts', {
        deliveryRunId: activeRun!.id,
        householdId: household.id,
        kits,
        deliveredAt: now,
      });
    },
    onSuccess: () => {
      setConfirming(null);
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
          <p className="font-mono text-xs text-accent-orange">No active delivery run. Contact your Hub Manager to start one.</p>
        </div>
      ) : activeRuns.length === 1 ? (
        // single run — just show the banner, no need to pick
        <div className="card px-4 py-3 border-accent-green/30 bg-accent-green/5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow flex-shrink-0" />
          <div>
            <p className="font-sans text-sm font-semibold text-text-primary">
              Team {activeRun!.teamNumber} · {activeRun!.zone} — Active Run
            </p>
            <p className="font-mono text-[10px] text-text-muted">
              {new Set(activeRun!.receipts?.map(r => r.householdId) ?? []).size} deliveries
            </p>
          </div>
        </div>
      ) : (
        // multiple runs — let volunteer pick which one they're on
        <div className="card p-4">
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
            Select Your Run — {activeRuns.length} teams in field
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
                        Team {run.teamNumber} · {run.zone}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-text-muted">{deliveryCount} delivered</span>
                      {isSelected && (
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-accent-green/40 text-accent-green bg-accent-green/10">
                          SELECTED
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
        <SectionTitle sub={`${households.length} undelivered households, sorted by priority`}>Priority Queue</SectionTitle>
        {households.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="font-sans text-sm text-text-primary font-semibold">All households delivered</p>
            <p className="font-mono text-xs text-text-muted mt-1">Check back for new assessments.</p>
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
                        <Badge label={cfg.label} color={`${cfg.color} ${cfg.border} ${cfg.bg}`} />
                        <span className={`font-mono text-[10px] font-bold ${EMK_COLORS[h.recommendedEmk]}`}>{h.recommendedEmk}</span>
                        <span className="font-mono text-[10px] text-text-muted">{h.totalScore}/20</span>
                        {qty > 1 && <span className="font-mono text-[10px] text-accent-yellow font-bold">{qty} kits</span>}
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
                        <p className="font-mono text-[10px] text-accent-red mt-0.5">Life-sustaining medication needed</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {!isConfirming ? (
                        <button onClick={() => setConfirming(h.id)} disabled={!activeRun}
                          className={`font-mono text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-40 ${cfg.bg} ${cfg.border} ${cfg.color} hover:opacity-80`}>
                          Deliver {qty > 1 ? `(${qty})` : ''}
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => deliverMutation.mutate(h)} disabled={isDelivering}
                            className="font-mono text-xs px-3 py-1.5 rounded border border-accent-green/40 text-accent-green bg-accent-green/10 hover:bg-accent-green/20 transition-colors disabled:opacity-40">
                            {isDelivering ? '...' : '✓ Confirm'}
                          </button>
                          <button onClick={() => setConfirming(null)}
                            className="font-mono text-xs px-3 py-1.5 rounded border border-bg-border text-text-muted hover:text-text-secondary transition-colors">
                            Cancel
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
  const [submitted, setSubmitted] = useState<{ type: string; autoEscalated: boolean } | null>(null);

  const selectedType = INCIDENT_TYPES.find(t => t.value === incType)!;

  const reportMutation = useMutation({
    mutationFn: (payload: { districtId: string; type: string; description: string }) =>
      api.post('/api/incidents', payload).then(r => r.data),
    onSuccess: (data) => {
      setSubmitted({ type: incType, autoEscalated: data?.autoEscalated ?? false });
      setDescription('');
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.incidents(districtId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    },
  });

  const reportError = (reportMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className={`card p-6 ${submitted.autoEscalated ? 'border-accent-red/40 bg-accent-red/5' : 'border-accent-green/30 bg-accent-green/5'}`}>
          <div className="flex items-start gap-4">
            <span className="text-4xl flex-shrink-0">{submitted.autoEscalated ? '🚨' : '✓'}</span>
            <div>
              <p className="font-sans font-bold text-text-primary text-lg mb-1">Incident Reported</p>
              {submitted.autoEscalated ? (
                <>
                  <Badge label="AUTO-ESCALATED" color="text-accent-red border-accent-red/30 bg-accent-red/10" />
                  <p className="font-mono text-[10px] text-text-secondary mt-2 leading-relaxed">
                    VOLUNTEER_SAFETY incident auto-escalated to Operations Center.
                    If water exceeds 80cm, return to sub-warehouse or shelter in place immediately.
                  </p>
                </>
              ) : (
                <p className="font-mono text-xs text-accent-green">Hub Manager and Operations Center have been notified.</p>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setSubmitted(null)} className="btn-primary">Report Another Incident</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reportError && <ErrorBox msg={reportError} onDismiss={() => reportMutation.reset()} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle sub="VOLUNTEER_SAFETY incidents are auto-escalated">Incident Type</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {INCIDENT_TYPES.map(t => (
              <OptionButton key={t.value} selected={incType === t.value} onClick={() => setIncType(t.value)} danger={t.value === 'VOLUNTEER_SAFETY'}>
                <div className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">{t.icon}</span>
                  <div className="flex-1">
                    <span className={`font-sans text-sm font-medium ${incType === t.value ? 'text-text-primary' : 'text-text-secondary'}`}>{t.label}</span>
                    {t.autoEscalate && <span className="block font-mono text-[9px] text-accent-red mt-0.5">Auto-escalates to Operations Center</span>}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    incType === t.value
                      ? t.value === 'VOLUNTEER_SAFETY' ? 'border-accent-red bg-accent-red' : 'border-accent-blue bg-accent-blue'
                      : 'border-bg-border'
                  }`}>
                    {incType === t.value && <span className="text-bg-primary text-[8px] font-bold">✓</span>}
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
                <p className="font-mono text-xs font-bold text-accent-red mb-1">SAFETY HARD CONSTRAINT</p>
                <p className="font-mono text-[10px] text-accent-red/80 leading-relaxed">
                  If water depth exceeds 80cm, stop all delivery immediately. Return to sub-warehouse or shelter in place.
                </p>
              </div>
            </div>
          )}

          <div className="card p-5">
            <SectionTitle sub="Be specific about location and severity">Description</SectionTitle>
            <textarea rows={8} className="input resize-none"
              placeholder={
                incType === 'ROUTE_BLOCKED'    ? 'e.g. Nguyen Hue Street flooded, cannot pass by motorbike.' :
                incType === 'VOLUNTEER_SAFETY' ? 'e.g. Water now 85cm in Zone C. Team 2 returning immediately.' :
                incType === 'BUILDING_FLOODED' ? 'e.g. Water entering sub-warehouse. 10cm on ground floor.' :
                'Describe the incident — location, current situation, actions taken.'
              }
              value={description} onChange={e => setDescription(e.target.value)} />
            <p className="font-mono text-[10px] text-text-muted mt-2">Reporting as: {selectedType.icon} {selectedType.label}</p>
          </div>

          <button
            onClick={() => description.trim() && reportMutation.mutate({ districtId, type: incType, description: description.trim() })}
            disabled={reportMutation.isPending || !description.trim()}
            className={`w-full py-2.5 rounded font-sans font-semibold text-sm transition-all disabled:opacity-40 ${
              incType === 'VOLUNTEER_SAFETY' ? 'bg-accent-red text-white hover:bg-accent-red/90' : 'btn-primary'
            }`}>
            {reportMutation.isPending ? 'Reporting...' : `Report ${selectedType.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN VOLUNTEER PAGE ──────────────────────────────────────────────────────

export function VolunteerPage() {
  usePageTitle('Volunteer');
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
  const districtName = districtData?.name ?? realDistricts[0]?.name ?? 'Your District';
  const isLoading = user?.districtId ? districtLoading : summaryLoading;

  const TABS: Array<{ id: TabId; icon: string; label: string }> = [
    { id: 'assess',  icon: '◈', label: 'Assess'  },
    { id: 'deliver', icon: '⟁', label: 'Deliver' },
    { id: 'report',  icon: '⚠', label: 'Report'  },
  ];

  if (isLoading) {
    return <DashboardLayout title="Volunteer View"><VolunteerSkeleton /></DashboardLayout>;
  }

  if (!districtId) {
    return (
      <DashboardLayout title="Volunteer View">
        <div className="py-20 text-center max-w-sm mx-auto">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="font-sans font-bold text-text-primary mb-2">No District Assigned</p>
          <p className="font-mono text-xs text-text-muted">Contact your Hub Manager or SUPER_ADMIN.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Volunteer View">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
            <span className="font-sans font-semibold text-text-primary">{districtName}</span>
            <span className="font-mono text-[10px] text-text-muted">· {user?.name ?? 'Volunteer'}</span>
          </div>
          <span className="font-mono text-[10px] text-text-muted">
            {activeTab === 'assess'  ? '20-point scoring system' :
             activeTab === 'deliver' ? 'Last-mile delivery model' :
                                      'Volunteer safety protocol'}
          </span>
        </div>

        <div className="flex gap-0.5 bg-bg-elevated rounded-lg p-1 border border-bg-border w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded font-sans text-sm font-medium transition-all duration-100 ${
                activeTab === tab.id
                  ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}>
              <span className="font-mono text-xs">{tab.icon}</span>
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