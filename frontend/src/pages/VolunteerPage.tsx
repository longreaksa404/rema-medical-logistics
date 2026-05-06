// VolunteerPage.tsx — V8 Volunteer View
// Responsive: desktop sidebar layout + mobile-friendly stacking
// 3 tabs: Assess | Deliver | Report
// Roles: VOLUNTEER, HUB_MANAGER, SUPER_ADMIN

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { householdsApi } from '../api/households';
import type { Household } from '../api/households';
import {
  scoreHousehold,
  computeCat2,
  CAT1_OPTIONS,
  CAT2_FLAGS,
  CAT3_OPTIONS,
  CAT4_OPTIONS,
} from '../utils/scoring';
import type { ScoreInput, PriorityBand, Cat2FlagId } from '../utils/scoring';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TabId = 'assess' | 'deliver' | 'report';

interface DeliveryRun {
  id: string;
  teamNumber: number;
  zone: string;
  departedAt: string;
  status: 'IN_PROGRESS' | 'COMPLETE' | 'ABORTED';
  subWarehouse: { district: { name: string } };
  receipts: { id: string }[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BAND_CONFIG: Record<PriorityBand, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  CRITICAL: { label: 'CRITICAL', color: 'text-accent-red',    bg: 'bg-accent-red/10',    border: 'border-accent-red/40',    dot: 'bg-accent-red'    },
  HIGH:     { label: 'HIGH',     color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/40', dot: 'bg-accent-orange' },
  MEDIUM:   { label: 'MEDIUM',   color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/40', dot: 'bg-accent-yellow' },
  STANDARD: { label: 'STANDARD', color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/30',  dot: 'bg-accent-green'  },
};

const EMK_COLORS: Record<string, string> = {
  EMK1: 'text-accent-blue',
  EMK2: 'text-accent-green',
  EMK3: 'text-accent-red',
};

const INCIDENT_TYPES = [
  { value: 'ROUTE_BLOCKED',    label: 'Route Blocked',    icon: '🚧', autoEscalate: false },
  { value: 'VOLUNTEER_SAFETY', label: 'Volunteer Safety', icon: '⚠️', autoEscalate: true  },
  { value: 'STOCK_SCARCITY',   label: 'Stock Scarcity',   icon: '📦', autoEscalate: false },
  { value: 'BUILDING_FLOODED', label: 'Building Flooded', icon: '🌊', autoEscalate: false },
  { value: 'OTHER',            label: 'Other',            icon: '📋', autoEscalate: false },
] as const;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-sans font-bold text-text-primary">{children}</h3>
      {sub && <p className="font-mono text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <p className="font-mono text-xs text-text-muted">{message}</p>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
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

// Responsive option button — works well at any screen width
function OptionButton({
  selected,
  onClick,
  children,
  danger = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const activeClass = danger
    ? 'bg-accent-red/10 border-accent-red/40'
    : 'bg-accent-blue/10 border-accent-blue/40';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded border transition-all ${
        selected ? activeClass : 'bg-bg-elevated border-bg-border hover:border-bg-border/60'
      }`}
    >
      {children}
    </button>
  );
}

// ─── TAB: ASSESS ─────────────────────────────────────────────────────────────

function AssessTab({ districtId }: { districtId: string }) {
  const [cat1, setCat1] = useState<number>(0);
  const [cat2Flags, setCat2Flags] = useState<Set<Cat2FlagId>>(new Set());
  const [cat3, setCat3] = useState<number>(0);
  const [cat4, setCat4] = useState<number>(0);
  const [cat5, setCat5] = useState<number>(0);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Household | null>(null);

  const cat2 = computeCat2(cat2Flags);
  const input: ScoreInput = { cat1, cat2, cat3, cat4, cat5 };
  const liveScore = scoreHousehold(input);
  const bandCfg = BAND_CONFIG[liveScore.priorityBand];
  const scorePct = (liveScore.totalScore / 20) * 100;

  const toggleFlag = (id: Cat2FlagId) => {
    setCat2Flags(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reset = () => {
    setCat1(0); setCat2Flags(new Set()); setCat3(0); setCat4(0); setCat5(0);
    setAddress(''); setNotes(''); setStep('form'); setResult(null); setError('');
  };

  const handleSubmit = async () => {
    if (!address.trim()) { setError('Please enter the household address.'); return; }
    setSubmitting(true); setError('');
    try {
      const h = await householdsApi.create({
        address: address.trim(), districtId,
        cat1, cat2, cat3, cat4, cat5,
        notes: notes.trim() || undefined,
      });
      setResult(h);
      setStep('result');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submission failed. Try again.');
    } finally { setSubmitting(false); }
  };

  // ── Result view ──────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const rBand = BAND_CONFIG[result.priorityBand];
    return (
      <div className="max-w-xl">
        {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
        <div className={`card p-6 border-2 ${rBand.border} mb-4`}>
          <div className="flex items-center gap-6 mb-6">
            {/* Score ring */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#21262d" strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none"
                  stroke={
                    result.priorityBand === 'CRITICAL' ? '#f85149' :
                    result.priorityBand === 'HIGH'     ? '#f0883e' :
                    result.priorityBand === 'MEDIUM'   ? '#d29922' : '#3fb950'
                  }
                  strokeWidth="6"
                  strokeDasharray={`${((result.totalScore / 20) * 100 / 100) * 163.4} 163.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-xl font-bold leading-none ${rBand.color}`}>{result.totalScore}</span>
                <span className="font-mono text-[9px] text-text-muted">/20</span>
              </div>
            </div>
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border font-mono text-sm font-bold mb-2 ${rBand.bg} ${rBand.border} ${rBand.color}`}>
                <span className={`w-2 h-2 rounded-full ${rBand.dot}`} />
                {rBand.label}
              </div>
              <p className="font-mono text-xs text-text-muted">
                {result.priorityBand === 'CRITICAL' ? 'Deliver in current run' :
                 result.priorityBand === 'HIGH'     ? 'Deliver same day' :
                 result.priorityBand === 'MEDIUM'   ? 'Deliver within 48h' :
                                                      'Community collection point'}
              </p>
            </div>
          </div>
          <div className="space-y-2 border-t border-bg-border pt-4">
            <div className="flex justify-between items-center py-1.5">
              <span className="font-mono text-xs text-text-muted">Address</span>
              <span className="font-sans text-sm text-text-primary">{result.address}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">Recommended EMK</span>
              <span className={`font-mono text-sm font-bold ${EMK_COLORS[result.recommendedEmk]}`}>{result.recommendedEmk}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-bg-border">
              <span className="font-mono text-xs text-text-muted">Score breakdown</span>
              <span className="font-mono text-xs text-text-secondary">
                Cat1:{result.medicalUrgencyScore} Cat2:{result.vulnerabilityScore} Cat3:{result.floodExposureScore} Cat4:{result.selfSufficiencyScore} Cat5:{result.isolationScore}
              </span>
            </div>
          </div>
        </div>
        <button onClick={reset} className="btn-primary w-full">
          Assess Next Household
        </button>
      </div>
    );
  }

  // ── Form view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}

      {/* Two-column desktop layout: form left, live score right */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left: all form categories ── */}
        <div className="flex-1 space-y-4">

          {/* Address */}
          <div className="card p-5">
            <SectionTitle>Household Address</SectionTitle>
            <input
              type="text"
              className="input"
              placeholder="e.g. 45 Le Loi Street, Ward 3"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Cat 1 — Medical Urgency */}
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

          {/* Cat 2 — Vulnerability */}
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
              {cat2 >= 5 && (
                <p className="font-mono text-[10px] text-accent-yellow px-1">⚠ Cap reached — additional flags don't add points</p>
              )}
            </div>
          </div>

          {/* Cat 3 — Flood Exposure */}
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

          {/* Cat 4 — Self-Sufficiency */}
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

          {/* Cat 5 — Isolation */}
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
                <span className={`font-sans text-sm flex-1 ${cat5 === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>
                  Completely isolated — no neighbors, family, or signal
                </span>
                <span className={`font-mono text-xs flex-shrink-0 ${cat5 === 1 ? 'text-accent-blue' : 'text-text-muted'}`}>1pt</span>
              </div>
            </OptionButton>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <SectionTitle>Field Notes (optional)</SectionTitle>
            <textarea
              rows={3}
              className="input resize-none"
              placeholder="Observations, contact name, additional context..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ── Right: live score panel (sticky on desktop) ── */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Score ring card */}
            <div className={`card p-5 border-2 transition-colors duration-300 ${bandCfg.border}`}>
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-4">Live Score</p>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#21262d" strokeWidth="6" />
                    <circle cx="32" cy="32" r="26" fill="none"
                      stroke={
                        liveScore.priorityBand === 'CRITICAL' ? '#f85149' :
                        liveScore.priorityBand === 'HIGH'     ? '#f0883e' :
                        liveScore.priorityBand === 'MEDIUM'   ? '#d29922' : '#3fb950'
                      }
                      strokeWidth="6"
                      strokeDasharray={`${(scorePct / 100) * 163.4} 163.4`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-mono text-2xl font-bold leading-none ${bandCfg.color}`}>{liveScore.totalScore}</span>
                    <span className="font-mono text-[8px] text-text-muted">/20</span>
                  </div>
                </div>
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs font-bold mb-1.5 ${bandCfg.bg} ${bandCfg.border} ${bandCfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${bandCfg.dot}`} />
                    {bandCfg.label}
                  </div>
                  <p className={`font-mono text-xs font-bold ${EMK_COLORS[liveScore.recommendedEmk]}`}>
                    → {liveScore.recommendedEmk}
                  </p>
                </div>
              </div>

              {/* Category breakdown bars */}
              <div className="mt-4 space-y-2">
                {[
                  { label: 'Medical', val: cat1, max: 8, color: 'bg-accent-red' },
                  { label: 'Vulnerability', val: cat2, max: 5, color: 'bg-accent-orange' },
                  { label: 'Flood Exp.', val: cat3, max: 4, color: 'bg-accent-yellow' },
                  { label: 'Self-Suff.', val: cat4, max: 2, color: 'bg-accent-blue' },
                  { label: 'Isolation', val: cat5, max: 1, color: 'bg-accent-green' },
                ].map(bar => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-text-muted w-20 flex-shrink-0">{bar.label}</span>
                    <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar.color} rounded-full transition-all duration-300`}
                        style={{ width: bar.max > 0 ? `${(bar.val / bar.max) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-text-muted w-8 text-right flex-shrink-0">{bar.val}/{bar.max}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery guidance */}
            <div className={`rounded border px-4 py-3 ${bandCfg.bg} ${bandCfg.border}`}>
              <p className={`font-mono text-[10px] font-bold mb-0.5 ${bandCfg.color}`}>Delivery Guidance</p>
              <p className="font-mono text-[10px] text-text-secondary">
                {liveScore.priorityBand === 'CRITICAL' ? 'Deliver within this run — goes first' :
                 liveScore.priorityBand === 'HIGH'     ? 'Deliver in the same day' :
                 liveScore.priorityBand === 'MEDIUM'   ? 'Deliver within 48 hours' :
                                                         'Community collection point self-pickup'}
              </p>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !address.trim()}
              className="btn-primary w-full"
            >
              {submitting ? 'Submitting...' : `Submit Assessment · ${liveScore.totalScore}/20`}
            </button>

            <p className="font-mono text-[10px] text-text-muted text-center">
              Section C — 5 categories, 20-point scale
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DELIVER ─────────────────────────────────────────────────────────────

function DeliverTab({ districtId }: { districtId: string }) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeRun, setActiveRun] = useState<DeliveryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [delivering, setDelivering] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queue, runsRes] = await Promise.all([
        householdsApi.getPriorityQueue(districtId),
        api.get('/api/delivery/runs', { params: { districtId, status: 'IN_PROGRESS' } }),
      ]);
      setHouseholds(queue);
      const runs: DeliveryRun[] = runsRes.data;
      setActiveRun(runs.length > 0 ? runs[0] : null);
    } catch {
      setError('Failed to load delivery queue.');
    } finally {
      setLoading(false);
    }
  }, [districtId]);

  useEffect(() => { load(); }, [load]);

  const handleDeliver = async (household: Household) => {
    if (!activeRun) {
      setError('No active delivery run. Ask your Hub Manager to start a run first.');
      return;
    }
    setDelivering(household.id);
    try {
      await api.post('/api/delivery/receipts', {
        deliveryRunId: activeRun.id,
        householdId: household.id,
        emkType: household.recommendedEmk,
        quantity: 1,
        deliveredAt: new Date().toISOString(),
      });
      setSuccess(`✓ Delivered ${household.recommendedEmk} to ${household.address}`);
      setConfirming(null);
      load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Delivery failed.');
    } finally { setDelivering(null); }
  };

  const BAND_ORDER: Record<PriorityBand, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, STANDARD: 3 };
  const sorted = [...households].sort((a, b) => BAND_ORDER[a.priorityBand] - BAND_ORDER[b.priorityBand]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-elevated rounded border border-bg-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      {/* Active run status */}
      {activeRun ? (
        <div className="card px-4 py-3 border-accent-green/30 bg-accent-green/5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow flex-shrink-0" />
          <div>
            <p className="font-sans text-sm font-semibold text-text-primary">
              Team {activeRun.teamNumber} · {activeRun.zone} — Active Run
            </p>
            <p className="font-mono text-[10px] text-text-muted">
              {activeRun.receipts?.length ?? 0} deliveries recorded so far
            </p>
          </div>
        </div>
      ) : (
        <div className="card px-4 py-3 border-accent-orange/20">
          <p className="font-mono text-xs text-accent-orange">
            ⚠ No active delivery run. Contact your Hub Manager to start one.
          </p>
        </div>
      )}

      {/* Priority queue */}
      <div>
        <SectionTitle sub={`${households.length} undelivered households, sorted by priority`}>
          Priority Queue
        </SectionTitle>

        {households.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="font-sans text-sm text-text-primary font-semibold">All households delivered</p>
            <p className="font-mono text-xs text-text-muted mt-1">Check back for new assessments.</p>
          </div>
        ) : (
          <div className="card divide-y divide-bg-border">
            {sorted.map(h => {
              const cfg = BAND_CONFIG[h.priorityBand];
              const isConfirming = confirming === h.id;
              const isDelivering = delivering === h.id;
              return (
                <div key={h.id} className={`px-4 py-4 transition-colors ${isConfirming ? cfg.bg : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge label={cfg.label} color={`${cfg.color} ${cfg.border} ${cfg.bg}`} />
                        <span className={`font-mono text-[10px] font-bold ${EMK_COLORS[h.recommendedEmk]}`}>{h.recommendedEmk}</span>
                        <span className="font-mono text-[10px] text-text-muted">{h.totalScore}/20</span>
                      </div>
                      <p className="font-sans text-sm text-text-primary">{h.address}</p>
                      {h.medicalUrgencyScore >= 5 && (
                        <p className="font-mono text-[10px] text-accent-red mt-0.5">⚕ Life-sustaining medication</p>
                      )}
                    </div>

                    {/* Deliver action */}
                    <div className="flex-shrink-0">
                      {!isConfirming ? (
                        <button
                          onClick={() => setConfirming(h.id)}
                          disabled={!activeRun}
                          className={`font-mono text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-40 ${cfg.bg} ${cfg.border} ${cfg.color} hover:opacity-80`}
                        >
                          Deliver
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeliver(h)}
                            disabled={isDelivering}
                            className="font-mono text-xs px-3 py-1.5 rounded border border-accent-green/40 text-accent-green bg-accent-green/10 hover:bg-accent-green/20 transition-colors disabled:opacity-40"
                          >
                            {isDelivering ? '...' : '✓ Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirming(null)}
                            className="font-mono text-xs px-3 py-1.5 rounded border border-bg-border text-text-muted hover:text-text-secondary transition-colors"
                          >
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
  const [incType, setIncType] = useState<typeof INCIDENT_TYPES[number]['value']>('ROUTE_BLOCKED');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ type: string; autoEscalated: boolean } | null>(null);

  const selectedType = INCIDENT_TYPES.find(t => t.value === incType)!;

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Please describe the incident.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await api.post('/api/incidents', {
        districtId,
        type: incType,
        description: description.trim(),
      });
      setSubmitted({
        type: incType,
        autoEscalated: res.data?.autoEscalated ?? false,
      });
      setDescription('');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Report failed.');
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="max-w-lg space-y-4">
        <div className={`card p-6 ${submitted.autoEscalated ? 'border-accent-red/40 bg-accent-red/5' : 'border-accent-green/30 bg-accent-green/5'}`}>
          <div className="flex items-start gap-4">
            <span className="text-4xl flex-shrink-0">{submitted.autoEscalated ? '🚨' : '✓'}</span>
            <div>
              <p className="font-sans font-bold text-text-primary text-lg mb-1">Incident Reported</p>
              {submitted.autoEscalated ? (
                <>
                  <Badge label="AUTO-ESCALATED" color="text-accent-red border-accent-red/30 bg-accent-red/10" />
                  <p className="font-mono text-[10px] text-text-secondary mt-2 leading-relaxed">
                    VOLUNTEER_SAFETY incident auto-escalated to Operations Center per Section A.4.
                    If water exceeds 80cm, return to sub-warehouse or shelter in place immediately.
                  </p>
                </>
              ) : (
                <p className="font-mono text-xs text-accent-green">Hub Manager and Operations Center have been notified.</p>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setSubmitted(null)} className="btn-primary">
          Report Another Incident
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}

      {/* Incident type grid */}
      <div className="card p-5">
        <SectionTitle sub="VOLUNTEER_SAFETY incidents are auto-escalated (Section A.4)">Incident Type</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INCIDENT_TYPES.map(t => (
            <OptionButton
              key={t.value}
              selected={incType === t.value}
              onClick={() => setIncType(t.value)}
              danger={t.value === 'VOLUNTEER_SAFETY'}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{t.icon}</span>
                <div className="flex-1">
                  <span className={`font-sans text-sm font-medium ${incType === t.value ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {t.label}
                  </span>
                  {t.autoEscalate && (
                    <span className="block font-mono text-[9px] text-accent-red mt-0.5">
                      Auto-escalates to Operations Center
                    </span>
                  )}
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

      {/* Safety warning — only when VOLUNTEER_SAFETY is selected */}
      {incType === 'VOLUNTEER_SAFETY' && (
        <div className="bg-accent-red/10 border border-accent-red/40 rounded px-4 py-3 flex gap-3 animate-slide-in">
          <span className="text-2xl flex-shrink-0">🚨</span>
          <div>
            <p className="font-mono text-xs font-bold text-accent-red mb-1">SAFETY HARD CONSTRAINT — Section A.4</p>
            <p className="font-mono text-[10px] text-accent-red/80 leading-relaxed">
              If water depth exceeds 80cm, stop all delivery immediately. Return to sub-warehouse or shelter in place.
              This report will auto-escalate to the Emergency Coordinator.
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="card p-5">
        <SectionTitle>
          Description
          <span className="font-normal text-text-muted"> — be specific about location and severity</span>
        </SectionTitle>
        <textarea
          rows={5}
          className="input resize-none"
          placeholder={
            incType === 'ROUTE_BLOCKED'    ? 'e.g. Nguyen Hue Street flooded, cannot pass by motorbike. Switching to Zone B alternate route.' :
            incType === 'VOLUNTEER_SAFETY' ? 'e.g. Water now 85cm in Zone C. Team 2 returning to sub-warehouse immediately.' :
            incType === 'BUILDING_FLOODED' ? 'e.g. Water entering sub-warehouse. 10cm on ground floor. Activating backup location.' :
                                             'Describe the incident clearly — include location, current situation, and actions taken.'
          }
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <p className="font-mono text-[10px] text-text-muted mt-2">
          Reporting as: {selectedType.icon} {selectedType.label}
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !description.trim()}
        className={`w-full py-2.5 rounded font-sans font-semibold text-sm transition-all disabled:opacity-40 ${
          incType === 'VOLUNTEER_SAFETY'
            ? 'bg-accent-red text-white hover:bg-accent-red/90'
            : 'btn-primary'
        }`}
      >
        {submitting ? 'Reporting...' : `Report ${selectedType.label}`}
      </button>
    </div>
  );
}

// ─── MAIN VOLUNTEER PAGE ──────────────────────────────────────────────────────

export function VolunteerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('assess');
  const [districtId, setDistrictId] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [loadingDistrict, setLoadingDistrict] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      setLoadingDistrict(true);
      try {
        if (user?.districtId) {
          const res = await api.get(`/api/districts/${user.districtId}`);
          setDistrictId(user.districtId);
          setDistrictName(res.data.name ?? 'Your District');
        } else {
          const res = await api.get('/api/dashboard/summary');
          const districts = res.data.districts ?? [];
          if (districts.length > 0) {
            setDistrictId(districts[0].districtId);
            setDistrictName(districts[0].name);
          }
        }
      } catch {
        // silent
      } finally { setLoadingDistrict(false); }
    };
    resolve();
  }, [user?.districtId]);

  const TABS: Array<{ id: TabId; icon: string; label: string }> = [
    { id: 'assess',  icon: '◈', label: 'Assess'  },
    { id: 'deliver', icon: '⟁', label: 'Deliver' },
    { id: 'report',  icon: '⚠', label: 'Report'  },
  ];

  if (loadingDistrict) {
    return (
      <DashboardLayout title="Volunteer View">
        <div className="py-32 text-center">
          <p className="font-mono text-sm text-text-muted animate-pulse">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!districtId) {
    return (
      <DashboardLayout title="Volunteer View">
        <div className="py-20 text-center max-w-sm mx-auto">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="font-sans font-bold text-text-primary mb-2">No District Assigned</p>
          <p className="font-mono text-xs text-text-muted">
            Your account has no district assigned. Contact your Hub Manager or SUPER_ADMIN.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Volunteer View">
      <div className="space-y-5">

        {/* ── Header row: district indicator ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
            <span className="font-sans font-semibold text-text-primary">{districtName}</span>
            <span className="font-mono text-[10px] text-text-muted">· {user?.name ?? 'Volunteer'}</span>
          </div>
          <span className="font-mono text-[10px] text-text-muted">
            {activeTab === 'assess'  ? 'Section C — 20-point scoring system' :
             activeTab === 'deliver' ? 'Section B.5 — Last-mile delivery model' :
                                      'Section A.4 — Volunteer safety protocol'}
          </span>
        </div>

        {/* ── Tab navigation — same style as HubPage ── */}
        <div className="flex gap-0.5 bg-bg-elevated rounded-lg p-1 border border-bg-border w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded font-sans text-sm font-medium transition-all duration-100 ${
                activeTab === tab.id
                  ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className="font-mono text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="animate-fade-in">
          {activeTab === 'assess'  && <AssessTab  districtId={districtId} />}
          {activeTab === 'deliver' && <DeliverTab districtId={districtId} />}
          {activeTab === 'report'  && <ReportTab  districtId={districtId} />}
        </div>

      </div>
    </DashboardLayout>
  );
}