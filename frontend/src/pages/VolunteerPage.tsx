// VolunteerPage.tsx — V8 Volunteer Mobile View
// Mobile-optimized: max-width 480px, large touch targets (min 44px)
// 3 bottom-nav tabs: Assess | Deliver | Report
// Roles: VOLUNTEER, HUB_MANAGER, SUPER_ADMIN

import { useState, useEffect, useCallback } from 'react';
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
  CRITICAL: { label: 'CRITICAL', color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/40', dot: 'bg-accent-red' },
  HIGH:     { label: 'HIGH',     color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/40', dot: 'bg-accent-orange' },
  MEDIUM:   { label: 'MEDIUM',   color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/40', dot: 'bg-accent-yellow' },
  STANDARD: { label: 'STANDARD', color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/40', dot: 'bg-accent-green' },
};

const EMK_COLORS: Record<string, string> = {
  EMK1: 'text-accent-blue',
  EMK2: 'text-accent-green',
  EMK3: 'text-accent-red',
};

const INCIDENT_TYPES = [
  { value: 'ROUTE_BLOCKED',    label: 'Route Blocked',    icon: '🚧' },
  { value: 'VOLUNTEER_SAFETY', label: 'Volunteer Safety', icon: '⚠️', autoEscalate: true },
  { value: 'STOCK_SCARCITY',   label: 'Stock Scarcity',   icon: '📦' },
  { value: 'BUILDING_FLOODED', label: 'Building Flooded', icon: '🌊' },
  { value: 'OTHER',            label: 'Other',            icon: '📋' },
] as const;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function MobileCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-bg-secondary border border-bg-border rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function ErrorBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 flex items-start gap-3 animate-slide-in">
      <span className="text-accent-red flex-shrink-0 mt-0.5">⚠</span>
      <p className="font-mono text-xs text-accent-red flex-1">{msg}</p>
      <button onClick={onDismiss} className="text-accent-red font-mono text-sm flex-shrink-0 p-1">✕</button>
    </div>
  );
}

function SuccessBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl px-4 py-3 flex items-start gap-3 animate-slide-in">
      <span className="text-accent-green flex-shrink-0 mt-0.5">✓</span>
      <p className="font-mono text-xs text-accent-green flex-1">{msg}</p>
      <button onClick={onDismiss} className="text-accent-green font-mono text-sm flex-shrink-0 p-1">✕</button>
    </div>
  );
}

function BigButton({
  onClick, disabled, children, variant = 'primary', className = ''
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
}) {
  const base = 'w-full py-4 rounded-xl font-sans font-semibold text-base transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px] active:scale-[0.98]';
  const styles = {
    primary: 'bg-accent-blue text-bg-primary',
    ghost:   'bg-transparent border border-bg-border text-text-secondary',
    danger:  'bg-accent-red text-white',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ─── ASSESS TAB ───────────────────────────────────────────────────────────────

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
      const h = await householdsApi.create({ address: address.trim(), districtId, cat1, cat2, cat3, cat4, cat5, notes: notes.trim() || undefined });
      setResult(h);
      setStep('result');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submission failed. Try again.');
    } finally { setSubmitting(false); }
  };

  if (step === 'result' && result) {
    const rBand = BAND_CONFIG[result.priorityBand];
    return (
      <div className="space-y-4">
        <MobileCard className={`p-6 border-2 ${rBand.border}`}>
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${rBand.bg} border-2 ${rBand.border} mb-3`}>
              <span className={`font-mono text-2xl font-bold ${rBand.color}`}>{result.totalScore}</span>
            </div>
            <p className={`font-mono text-xs text-text-muted`}>out of 20</p>
            <div className={`inline-block mt-2 px-3 py-1 rounded-full font-mono text-sm font-bold ${rBand.bg} ${rBand.border} border ${rBand.color}`}>
              {rBand.label}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-bg-border">
              <span className="font-mono text-xs text-text-muted">Address</span>
              <span className="font-sans text-sm text-text-primary text-right max-w-[60%]">{result.address}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-bg-border">
              <span className="font-mono text-xs text-text-muted">Recommended EMK</span>
              <span className={`font-mono text-sm font-bold ${EMK_COLORS[result.recommendedEmk]}`}>{result.recommendedEmk}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-mono text-xs text-text-muted">Priority</span>
              <span className={`font-mono text-xs ${rBand.color}`}>
                {result.priorityBand === 'CRITICAL' ? 'Deliver this run' :
                 result.priorityBand === 'HIGH' ? 'Deliver today' :
                 result.priorityBand === 'MEDIUM' ? 'Within 48h' : 'Collection point'}
              </span>
            </div>
          </div>
        </MobileCard>

        <BigButton onClick={reset}>Assess Next Household</BigButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}

      {/* Live score ring */}
      <MobileCard className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#21262d" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={liveScore.priorityBand === 'CRITICAL' ? '#f85149' : liveScore.priorityBand === 'HIGH' ? '#f0883e' : liveScore.priorityBand === 'MEDIUM' ? '#d29922' : '#3fb950'}
                strokeWidth="6"
                strokeDasharray={`${(scorePct / 100) * 163.4} 163.4`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-lg font-bold leading-none ${bandCfg.color}`}>{liveScore.totalScore}</span>
              <span className="font-mono text-[8px] text-text-muted">/20</span>
            </div>
          </div>
          <div className="flex-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-xs font-semibold ${bandCfg.bg} ${bandCfg.border} ${bandCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${bandCfg.dot}`} />
              {bandCfg.label}
            </div>
            <p className={`font-mono text-xs mt-1 ${EMK_COLORS[liveScore.recommendedEmk]}`}>
              → {liveScore.recommendedEmk}
            </p>
          </div>
        </div>
      </MobileCard>

      {/* Address */}
      <MobileCard className="p-4">
        <label className="font-mono text-[10px] text-text-muted uppercase tracking-widest block mb-2">Address *</label>
        <input type="text" className="input text-base" placeholder="e.g. 45 Le Loi Street, Ward 3"
          value={address} onChange={e => setAddress(e.target.value)} />
      </MobileCard>

      {/* Cat 1 — Medical Urgency */}
      <MobileCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans font-semibold text-text-primary">1. Medical Urgency</span>
          <span className={`font-mono text-sm font-bold ${cat1 > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{cat1}/8</span>
        </div>
        <div className="space-y-2">
          {CAT1_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setCat1(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border min-h-[52px] transition-all ${cat1 === opt.value ? 'bg-accent-blue/10 border-accent-blue/40' : 'bg-bg-elevated border-bg-border'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`font-sans text-sm flex-1 ${cat1 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                <span className={`font-mono text-xs font-semibold flex-shrink-0 ${cat1 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
              </div>
            </button>
          ))}
        </div>
      </MobileCard>

      {/* Cat 2 — Vulnerability */}
      <MobileCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans font-semibold text-text-primary">2. Vulnerability</span>
          <span className={`font-mono text-sm font-bold ${cat2 > 0 ? 'text-accent-orange' : 'text-text-muted'}`}>{cat2}/5</span>
        </div>
        <div className="space-y-2">
          {CAT2_FLAGS.map(flag => {
            const checked = cat2Flags.has(flag.id);
            return (
              <button key={flag.id} onClick={() => toggleFlag(flag.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border min-h-[52px] transition-all ${checked ? 'bg-accent-blue/10 border-accent-blue/40' : 'bg-bg-elevated border-bg-border'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'}`}>
                    {checked && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                  </div>
                  <span className={`font-sans text-sm flex-1 ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>{flag.label}</span>
                  <span className={`font-mono text-xs flex-shrink-0 ${checked ? 'text-accent-blue' : 'text-text-muted'}`}>+{flag.points}</span>
                </div>
              </button>
            );
          })}
          {cat2 >= 5 && <p className="font-mono text-[10px] text-accent-yellow px-1">⚠ Capped at 5 pts</p>}
        </div>
      </MobileCard>

      {/* Cat 3 — Flood Exposure */}
      <MobileCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans font-semibold text-text-primary">3. Flood Exposure</span>
          <span className={`font-mono text-sm font-bold ${cat3 > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{cat3}/4</span>
        </div>
        <div className="space-y-2">
          {CAT3_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setCat3(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border min-h-[52px] transition-all ${cat3 === opt.value ? 'bg-accent-blue/10 border-accent-blue/40' : 'bg-bg-elevated border-bg-border'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`font-sans text-sm flex-1 ${cat3 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                <span className={`font-mono text-xs flex-shrink-0 ${cat3 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
              </div>
            </button>
          ))}
        </div>
      </MobileCard>

      {/* Cat 4 — Self-Sufficiency */}
      <MobileCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans font-semibold text-text-primary">4. Self-Sufficiency</span>
          <span className={`font-mono text-sm font-bold ${cat4 > 0 ? 'text-accent-yellow' : 'text-text-muted'}`}>{cat4}/2</span>
        </div>
        <div className="space-y-2">
          {CAT4_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setCat4(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border min-h-[52px] transition-all ${cat4 === opt.value ? 'bg-accent-blue/10 border-accent-blue/40' : 'bg-bg-elevated border-bg-border'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`font-sans text-sm flex-1 ${cat4 === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                <span className={`font-mono text-xs flex-shrink-0 ${cat4 === opt.value ? 'text-accent-blue' : 'text-text-muted'}`}>{opt.value}pt</span>
              </div>
            </button>
          ))}
        </div>
      </MobileCard>

      {/* Cat 5 — Isolation */}
      <MobileCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans font-semibold text-text-primary">5. Isolation</span>
          <span className={`font-mono text-sm font-bold ${cat5 > 0 ? 'text-accent-orange' : 'text-text-muted'}`}>{cat5}/1</span>
        </div>
        <button onClick={() => setCat5(cat5 === 1 ? 0 : 1)}
          className={`w-full text-left px-4 py-3 rounded-xl border min-h-[52px] transition-all ${cat5 === 1 ? 'bg-accent-blue/10 border-accent-blue/40' : 'bg-bg-elevated border-bg-border'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${cat5 === 1 ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'}`}>
              {cat5 === 1 && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
            </div>
            <span className={`font-sans text-sm flex-1 ${cat5 === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>
              Completely isolated — no neighbors, family, or signal
            </span>
            <span className={`font-mono text-xs flex-shrink-0 ${cat5 === 1 ? 'text-accent-blue' : 'text-text-muted'}`}>1pt</span>
          </div>
        </button>
      </MobileCard>

      {/* Notes */}
      <MobileCard className="p-4">
        <label className="font-mono text-[10px] text-text-muted uppercase tracking-widest block mb-2">Field Notes (optional)</label>
        <textarea rows={3} className="input resize-none text-base" placeholder="Observations, name, context..."
          value={notes} onChange={e => setNotes(e.target.value)} />
      </MobileCard>

      <BigButton onClick={handleSubmit} disabled={submitting || !address.trim()}>
        {submitting ? 'Submitting...' : `Submit — Score ${liveScore.totalScore}/20`}
      </BigButton>
    </div>
  );
}

// ─── DELIVER TAB ──────────────────────────────────────────────────────────────

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
          <div key={i} className="h-20 bg-bg-secondary rounded-xl animate-pulse border border-bg-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      {/* Active run status */}
      {activeRun ? (
        <MobileCard className="p-4 border-accent-green/30 bg-accent-green/5">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-slow flex-shrink-0" />
            <div>
              <p className="font-sans text-sm font-semibold text-text-primary">
                Team {activeRun.teamNumber} · {activeRun.zone}
              </p>
              <p className="font-mono text-[10px] text-text-muted">
                Active run · {activeRun.receipts?.length ?? 0} delivered so far
              </p>
            </div>
          </div>
        </MobileCard>
      ) : (
        <MobileCard className="p-4 border-accent-orange/20">
          <p className="font-mono text-xs text-accent-orange">
            ⚠ No active delivery run. Contact your Hub Manager to start one.
          </p>
        </MobileCard>
      )}

      {/* Priority queue */}
      <div>
        <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest px-1 mb-3">
          Priority Queue · {households.length} undelivered
        </p>

        {households.length === 0 ? (
          <MobileCard className="p-8 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="font-sans text-sm text-text-primary font-semibold">All households delivered</p>
            <p className="font-mono text-xs text-text-muted mt-1">Great work. Check back for new assessments.</p>
          </MobileCard>
        ) : (
          <div className="space-y-2">
            {sorted.map(h => {
              const cfg = BAND_CONFIG[h.priorityBand];
              const isConfirming = confirming === h.id;
              const isDelivering = delivering === h.id;
              return (
                <MobileCard key={h.id} className={`p-4 ${isConfirming ? `border-2 ${cfg.border}` : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`font-mono text-[10px] font-bold ${EMK_COLORS[h.recommendedEmk]}`}>{h.recommendedEmk}</span>
                        <span className="font-mono text-[10px] text-text-muted">{h.totalScore}/20</span>
                      </div>
                      <p className="font-sans text-sm text-text-primary truncate">{h.address}</p>
                      {h.medicalUrgencyScore >= 5 && (
                        <p className="font-mono text-[10px] text-accent-red mt-0.5">⚕ Life-sustaining medication</p>
                      )}
                    </div>
                  </div>

                  {!isConfirming ? (
                    <button
                      onClick={() => setConfirming(h.id)}
                      disabled={!activeRun}
                      className={`mt-3 w-full py-3 rounded-xl font-sans font-semibold text-sm transition-all min-h-[44px] disabled:opacity-40 ${cfg.bg} ${cfg.border} border ${cfg.color}`}
                    >
                      Deliver {h.recommendedEmk}
                    </button>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="font-mono text-xs text-text-muted text-center">Confirm delivery to this household?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeliver(h)}
                          disabled={isDelivering}
                          className="flex-1 py-3 rounded-xl bg-accent-green text-bg-primary font-sans font-semibold text-sm min-h-[44px]"
                        >
                          {isDelivering ? 'Recording...' : '✓ Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="flex-1 py-3 rounded-xl border border-bg-border text-text-secondary font-sans text-sm min-h-[44px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </MobileCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REPORT TAB ───────────────────────────────────────────────────────────────

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
      <div className="space-y-4">
        <MobileCard className={`p-6 text-center ${submitted.autoEscalated ? 'border-accent-red/40 bg-accent-red/5' : 'border-accent-green/30 bg-accent-green/5'}`}>
          <p className="text-4xl mb-3">{submitted.autoEscalated ? '🚨' : '✓'}</p>
          <p className="font-sans font-bold text-text-primary text-lg mb-1">
            Incident Reported
          </p>
          {submitted.autoEscalated ? (
            <>
              <p className={`font-mono text-xs text-accent-red mb-3`}>AUTO-ESCALATED to Operations Center</p>
              <p className="font-mono text-[10px] text-text-muted leading-relaxed">
                VOLUNTEER SAFETY incident escalated per Section A.4. If water exceeds 80cm, return to sub-warehouse immediately.
              </p>
            </>
          ) : (
            <p className="font-mono text-xs text-accent-green">Hub Manager and Operations Center notified.</p>
          )}
        </MobileCard>
        <BigButton onClick={() => setSubmitted(null)}>Report Another Incident</BigButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}

      {/* Incident type */}
      <MobileCard className="p-4">
        <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">Incident Type</p>
        <div className="grid grid-cols-1 gap-2">
          {INCIDENT_TYPES.map(t => (
            <button key={t.value} onClick={() => setIncType(t.value)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border min-h-[52px] transition-all ${
                incType === t.value
                  ? t.value === 'VOLUNTEER_SAFETY'
                    ? 'bg-accent-red/10 border-accent-red/40'
                    : 'bg-accent-blue/10 border-accent-blue/40'
                  : 'bg-bg-elevated border-bg-border'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{t.icon}</span>
                <div className="flex-1">
                  <span className={`font-sans text-sm font-medium ${incType === t.value ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {t.label}
                  </span>
                  {'autoEscalate' in t && t.autoEscalate && (
                    <span className="block font-mono text-[9px] text-accent-red mt-0.5">Auto-escalates to Operations Center</span>
                  )}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  incType === t.value
                    ? t.value === 'VOLUNTEER_SAFETY' ? 'border-accent-red bg-accent-red' : 'border-accent-blue bg-accent-blue'
                    : 'border-bg-border'
                }`}>
                  {incType === t.value && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </MobileCard>

      {/* VOLUNTEER_SAFETY warning */}
      {incType === 'VOLUNTEER_SAFETY' && (
        <div className="bg-accent-red/10 border border-accent-red/40 rounded-xl px-4 py-3 flex gap-3">
          <span className="text-2xl flex-shrink-0">🚨</span>
          <div>
            <p className="font-mono text-xs font-bold text-accent-red mb-1">SAFETY HARD CONSTRAINT</p>
            <p className="font-mono text-[10px] text-accent-red/80 leading-relaxed">
              If water depth exceeds 80cm, stop all delivery immediately. Return to sub-warehouse or shelter in place. This report will auto-escalate (Section A.4).
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      <MobileCard className="p-4">
        <label className="font-mono text-[10px] text-text-muted uppercase tracking-widest block mb-2">
          Description * <span className="normal-case">— be specific about location and severity</span>
        </label>
        <textarea rows={5} className="input resize-none text-base"
          placeholder={
            incType === 'ROUTE_BLOCKED' ? 'e.g. Nguyen Hue Street flooded, cannot pass by motorbike. Switching to Zone B alternate route.' :
            incType === 'VOLUNTEER_SAFETY' ? 'e.g. Water now 85cm in Zone C. Team 2 returning to sub-warehouse immediately.' :
            incType === 'BUILDING_FLOODED' ? 'e.g. Water entering sub-warehouse. 10cm on ground floor. Activating backup location.' :
            'Describe the incident clearly...'
          }
          value={description} onChange={e => setDescription(e.target.value)} />
        <p className="font-mono text-[10px] text-text-muted mt-2">
          {selectedType.icon} Reporting as: {selectedType.label}
        </p>
      </MobileCard>

      <BigButton
        onClick={handleSubmit}
        disabled={submitting || !description.trim()}
        variant={incType === 'VOLUNTEER_SAFETY' ? 'danger' : 'primary'}
      >
        {submitting ? 'Reporting...' : `Report ${selectedType.label}`}
      </BigButton>
    </div>
  );
}

// ─── MAIN VOLUNTEER PAGE ─────────────────────────────────────────────────────

export function VolunteerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('assess');
  const [districtId, setDistrictId] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [loadingDistrict, setLoadingDistrict] = useState(true);

  // Resolve district: use user.districtId if set, else load first district
  useEffect(() => {
    const resolve = async () => {
      setLoadingDistrict(true);
      try {
        if (user?.districtId) {
          // Try to get the district name
          const res = await api.get(`/api/districts/${user.districtId}`);
          setDistrictId(user.districtId);
          setDistrictName(res.data.name ?? 'Your District');
        } else {
          // Fallback: first district from summary (for EC/SUPER_ADMIN)
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
    { id: 'assess',  icon: '📋', label: 'Assess'  },
    { id: 'deliver', icon: '📦', label: 'Deliver' },
    { id: 'report',  icon: '⚠️',  label: 'Report'  },
  ];

  if (loadingDistrict) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="font-mono text-sm text-text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!districtId) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="font-sans font-bold text-text-primary mb-2">No District Assigned</p>
          <p className="font-mono text-xs text-text-muted">
            Your account has no district. Contact your Hub Manager or SUPER_ADMIN.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* ── Top header ── */}
      <header className="bg-bg-secondary border-b border-bg-border px-5 py-4 flex-shrink-0 safe-area-top">
        <div className="max-w-[480px] mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
              <h1 className="font-sans font-bold text-text-primary text-lg">REMA</h1>
            </div>
            <p className="font-mono text-[10px] text-text-muted">{districtName} · {user?.name ?? 'Volunteer'}</p>
          </div>
          <div className="text-right">
            <p className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
              activeTab === 'assess' ? 'text-accent-blue bg-accent-blue/10 border-accent-blue/30' :
              activeTab === 'deliver' ? 'text-accent-green bg-accent-green/10 border-accent-green/30' :
              'text-accent-orange bg-accent-orange/10 border-accent-orange/30'
            }`}>
              {activeTab.toUpperCase()}
            </p>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-28">
        <div className="max-w-[480px] mx-auto space-y-1">
          <div className="animate-fade-in">
            {activeTab === 'assess'  && <AssessTab  districtId={districtId} />}
            {activeTab === 'deliver' && <DeliverTab districtId={districtId} />}
            {activeTab === 'report'  && <ReportTab  districtId={districtId} />}
          </div>
        </div>
      </main>

      {/* ── Fixed bottom navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-bg-border safe-area-bottom">
        <div className="max-w-[480px] mx-auto flex">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 min-h-[60px] transition-colors duration-100 ${
                  isActive ? 'text-accent-blue' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className={`font-mono text-[10px] uppercase tracking-widest ${isActive ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent-blue rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}