// PrioritizePage.tsx
// V4 — Prioritization Tool
// Left panel: 5-category assessment form with live scoring
// Right panel: Priority queue table per district

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PriorityQueueTable } from '../components/PriorityQueueTable';
import { householdsApi } from '../api/households';
import type { CreateHouseholdPayload } from '../api/households';
import { api } from '../api/client';
import type { DistrictCard } from '../api/dashboard.types';
import {
  scoreHousehold,
  computeCat2,
  CAT1_OPTIONS,
  CAT2_FLAGS,
  CAT3_OPTIONS,
  CAT4_OPTIONS,
} from '../utils/scoring';
import type { ScoreInput, PriorityBand, Cat2FlagId } from '../utils/scoring';

// ─── BAND CONFIG ──────────────────────────────────────────────────────────────
const BAND_CONFIG: Record<PriorityBand, {
  label: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
  description: string;
}> = {
  CRITICAL: {
    label: 'CRITICAL',
    color: 'text-accent-red',
    bg: 'bg-accent-red/10',
    border: 'border-accent-red/40',
    ring: 'ring-accent-red/30',
    description: 'Deliver in current run',
  },
  HIGH: {
    label: 'HIGH',
    color: 'text-accent-orange',
    bg: 'bg-accent-orange/10',
    border: 'border-accent-orange/40',
    ring: 'ring-accent-orange/30',
    description: 'Deliver same day',
  },
  MEDIUM: {
    label: 'MEDIUM',
    color: 'text-accent-yellow',
    bg: 'bg-accent-yellow/10',
    border: 'border-accent-yellow/40',
    ring: 'ring-accent-yellow/30',
    description: 'Deliver within 48 hours',
  },
  STANDARD: {
    label: 'STANDARD',
    color: 'text-accent-green',
    bg: 'bg-accent-green/10',
    border: 'border-accent-green/40',
    ring: 'ring-accent-green/30',
    description: 'Community collection point',
  },
};

const EMK_CONFIG = {
  EMK1: { label: 'EMK-1 General Kit', color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/30' },
  EMK2: { label: 'EMK-2 Vulnerable Kit', color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/30' },
  EMK3: { label: 'EMK-3 Chronic Illness Kit', color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/30' },
};

// ─── SCORE BAR ────────────────────────────────────────────────────────────────
function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="h-1 bg-bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── RADIO GROUP ──────────────────────────────────────────────────────────────
function RadioGroup<T extends number>({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly { value: T; label: string; sublabel?: string }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-100 ${
              selected
                ? 'bg-accent-blue/10 border-accent-blue/40'
                : 'bg-bg-elevated border-bg-border hover:border-text-muted/30'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value as T)}
              className="sr-only"
            />
            <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
              selected ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'
            }`} />
            <div className="min-w-0">
              <p className={`font-sans text-sm leading-tight ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>
                {opt.label}
              </p>
              {opt.sublabel && (
                <p className="font-mono text-[10px] text-text-muted mt-0.5">{opt.sublabel}</p>
              )}
            </div>
            <span className={`ml-auto font-mono text-xs font-semibold flex-shrink-0 ${
              selected ? 'text-accent-blue' : 'text-text-muted'
            }`}>
              {opt.value} pts
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({
  number,
  title,
  max,
  score,
}: {
  number: number;
  title: string;
  max: number;
  score: number;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-text-muted">{number}.</span>
        <h3 className="font-sans font-semibold text-text-primary text-sm">{title}</h3>
      </div>
      <span className={`font-mono text-sm font-semibold ${
        score === max ? 'text-accent-red' : score > 0 ? 'text-accent-orange' : 'text-text-muted'
      }`}>
        {score}/{max}
      </span>
    </div>
  );
}

// ─── SUCCESS RESULT CARD ──────────────────────────────────────────────────────
function SuccessCard({
  result,
  address,
  onDismiss,
}: {
  result: { totalScore: number; priorityBand: PriorityBand; recommendedEmk: 'EMK1' | 'EMK2' | 'EMK3' };
  address: string;
  onDismiss: () => void;
}) {
  const bandCfg = BAND_CONFIG[result.priorityBand];
  const emkCfg = EMK_CONFIG[result.recommendedEmk];

  return (
    <div className={`rounded-xl border-2 ${bandCfg.border} ${bandCfg.bg} p-6 animate-slide-in`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${bandCfg.color.replace('text-', 'bg-')}`} />
            <p className="font-mono text-xs text-text-muted">Household assessed</p>
          </div>
          <p className="font-sans font-bold text-text-primary">{address}</p>
        </div>
        <button
          onClick={onDismiss}
          className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <div className={`flex-1 rounded-lg border ${bandCfg.border} ${bandCfg.bg} px-4 py-3 text-center`}>
          <p className="font-mono text-[10px] text-text-muted mb-1">Score</p>
          <p className={`font-mono text-3xl font-bold ${bandCfg.color}`}>{result.totalScore}</p>
          <p className={`font-mono text-[10px] ${bandCfg.color} mt-0.5`}>/ 20</p>
        </div>
        <div className={`flex-1 rounded-lg border ${bandCfg.border} ${bandCfg.bg} px-4 py-3 text-center`}>
          <p className="font-mono text-[10px] text-text-muted mb-1">Priority Band</p>
          <p className={`font-mono text-lg font-bold ${bandCfg.color}`}>{bandCfg.label}</p>
          <p className={`font-mono text-[10px] text-text-muted mt-0.5`}>{bandCfg.description}</p>
        </div>
        <div className={`flex-1 rounded-lg border ${emkCfg.border} ${emkCfg.bg} px-4 py-3 text-center`}>
          <p className="font-mono text-[10px] text-text-muted mb-1">Recommended</p>
          <p className={`font-mono text-base font-bold ${emkCfg.color}`}>{result.recommendedEmk}</p>
          <p className={`font-mono text-[10px] text-text-muted mt-0.5`}>{emkCfg.label}</p>
        </div>
      </div>

      <p className="font-mono text-[10px] text-text-muted mt-3 text-center">
        Household added to priority queue. Queue will refresh shortly.
      </p>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export function PrioritizePage() {
  const [districts, setDistricts] = useState<DistrictCard[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [address, setAddress] = useState('');
  const [cat1, setCat1] = useState<number>(0);
  const [cat2Flags, setCat2Flags] = useState<Set<Cat2FlagId>>(new Set());
  const [cat3, setCat3] = useState<number>(0);
  const [cat4, setCat4] = useState<number>(0);
  const [cat5, setCat5] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastResult, setLastResult] = useState<{
    totalScore: number;
    priorityBand: PriorityBand;
    recommendedEmk: 'EMK1' | 'EMK2' | 'EMK3';
  } | null>(null);
  const [lastAddress, setLastAddress] = useState('');
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  // Load districts
  useEffect(() => {
    api.get('/api/dashboard/summary').then((res) => {
      const d = res.data.districts ?? [];
      setDistricts(d);
      if (d.length > 0 && !selectedDistrictId) {
        setSelectedDistrictId(d[0].districtId);
      }
    }).catch(console.error);
  }, [selectedDistrictId]);

  // ─── Live scoring ─────────────────────────────────────────────────────────
  const cat2 = computeCat2(cat2Flags);
  const liveInput: ScoreInput = { cat1, cat2, cat3, cat4, cat5 };
  const liveResult = scoreHousehold(liveInput);
  const bandCfg = BAND_CONFIG[liveResult.priorityBand];
  const emkCfg = EMK_CONFIG[liveResult.recommendedEmk];

  // Progress ring: 0–20
  const scorePct = (liveResult.totalScore / 20) * 100;

  // ─── Toggle cat2 flag ─────────────────────────────────────────────────────
  const toggleFlag = useCallback((id: Cat2FlagId) => {
    setCat2Flags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Reset form ───────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setAddress('');
    setCat1(0);
    setCat2Flags(new Set());
    setCat3(0);
    setCat4(0);
    setCat5(0);
    setNotes('');
    setSubmitError('');
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedDistrictId || !address.trim()) {
      setSubmitError('Please select a district and enter an address.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload: CreateHouseholdPayload = {
        address: address.trim(),
        districtId: selectedDistrictId,
        cat1,
        cat2,
        cat3,
        cat4,
        cat5,
        notes: notes.trim() || undefined,
      };
      const result = await householdsApi.create(payload);
      setLastResult({
        totalScore: result.totalScore,
        priorityBand: result.priorityBand,
        recommendedEmk: result.recommendedEmk,
      });
      setLastAddress(address.trim());
      resetForm();
      setQueueRefreshKey((k) => k + 1); // trigger queue refresh
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSubmitError(msg ?? 'Failed to submit assessment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDistrictId, address, cat1, cat2, cat3, cat4, cat5, notes, resetForm]);

  const isFormValid = selectedDistrictId && address.trim().length > 0;

  return (
    <DashboardLayout title="Prioritization Tool">
      <div className="space-y-5">

        {/* ── Section C reference strip ── */}
        <div className="card px-5 py-3 flex items-center gap-6 overflow-x-auto">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest flex-shrink-0">
            Section C scoring
          </span>
          {Object.entries(BAND_CONFIG).map(([band, cfg]) => (
            <div key={band} className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
              <span className={`font-mono text-[10px] ${cfg.color}`}>{cfg.label}</span>
              <span className="font-mono text-[10px] text-text-muted">
                {band === 'CRITICAL' ? '15–20' : band === 'HIGH' ? '10–14' : band === 'MEDIUM' ? '5–9' : '0–4'}
              </span>
            </div>
          ))}
          <div className="ml-auto flex-shrink-0">
            <span className="font-mono text-[10px] text-text-muted">Max score: </span>
            <span className="font-mono text-[10px] text-text-primary">20 pts</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">

          {/* ── LEFT: Assessment Form (3/5) ── */}
          <div className="xl:col-span-3 space-y-4">

            {/* Success result */}
            {lastResult && (
              <SuccessCard
                result={lastResult}
                address={lastAddress}
                onDismiss={() => setLastResult(null)}
              />
            )}

            {/* Form card */}
            <div className="card">
              {/* Header with live score display */}
              <div className={`px-6 py-5 border-b border-bg-border flex items-start justify-between gap-4 transition-colors duration-300 ${
                liveResult.totalScore > 0 ? `${bandCfg.bg}` : ''
              }`}>
                <div>
                  <h2 className="font-sans font-bold text-text-primary text-lg">Household Assessment</h2>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">
                    Section C — 5-category scoring system
                  </p>
                </div>

                {/* Live score dial */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#21262d" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="26" fill="none"
                        stroke={
                          liveResult.priorityBand === 'CRITICAL' ? '#f85149' :
                          liveResult.priorityBand === 'HIGH' ? '#f0883e' :
                          liveResult.priorityBand === 'MEDIUM' ? '#d29922' : '#3fb950'
                        }
                        strokeWidth="6"
                        strokeDasharray={`${(scorePct / 100) * 163.4} 163.4`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`font-mono text-lg font-bold leading-none ${bandCfg.color}`}>
                        {liveResult.totalScore}
                      </span>
                      <span className="font-mono text-[8px] text-text-muted">/20</span>
                    </div>
                  </div>
                  <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono font-semibold ${bandCfg.bg} ${bandCfg.border} ${bandCfg.color}`}>
                    {bandCfg.label}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Address + District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">District</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {districts.map((d) => (
                        <button
                          key={d.districtId}
                          onClick={() => setSelectedDistrictId(d.districtId)}
                          className={`font-mono text-xs px-3 py-1.5 rounded border transition-all ${
                            selectedDistrictId === d.districtId
                              ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                              : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="address">Address</label>
                    <input
                      id="address"
                      type="text"
                      className="input"
                      placeholder="e.g. 45 Le Loi Street, Ward 3"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* ── CAT 1: Medical Urgency (max 8) ── */}
                <div>
                  <SectionHeader number={1} title="Medical Urgency" max={8} score={cat1} />
                  <ScoreBar score={cat1} max={8} color={
                    cat1 >= 8 ? 'bg-accent-red' : cat1 >= 5 ? 'bg-accent-orange' : cat1 > 0 ? 'bg-accent-yellow' : 'bg-bg-border'
                  } />
                  <div className="mt-3">
                    <RadioGroup
                      options={CAT1_OPTIONS}
                      value={cat1}
                      onChange={setCat1}
                      name="cat1"
                    />
                  </div>
                </div>

                {/* ── CAT 2: Household Vulnerability (max 5) ── */}
                <div>
                  <SectionHeader number={2} title="Household Vulnerability" max={5} score={cat2} />
                  <ScoreBar score={cat2} max={5} color={cat2 > 0 ? 'bg-accent-orange' : 'bg-bg-border'} />
                  <div className="mt-3 space-y-1.5">
                    {CAT2_FLAGS.map((flag) => {
                      const checked = cat2Flags.has(flag.id);
                      return (
                        <label
                          key={flag.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-100 ${
                            checked
                              ? 'bg-accent-blue/10 border-accent-blue/40'
                              : 'bg-bg-elevated border-bg-border hover:border-text-muted/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFlag(flag.id)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            checked ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'
                          }`}>
                            {checked && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                          </div>
                          <span className={`font-sans text-sm flex-1 ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {flag.label}
                          </span>
                          <span className={`font-mono text-xs font-semibold flex-shrink-0 ${checked ? 'text-accent-blue' : 'text-text-muted'}`}>
                            +{flag.points}
                          </span>
                        </label>
                      );
                    })}
                    {cat2 >= 5 && (
                      <p className="font-mono text-[10px] text-accent-yellow px-1">
                        ⚠ Score capped at 5 — multiple vulnerability flags present
                      </p>
                    )}
                  </div>
                </div>

                {/* ── CAT 3: Flood Exposure (max 4) ── */}
                <div>
                  <SectionHeader number={3} title="Flood Exposure" max={4} score={cat3} />
                  <ScoreBar score={cat3} max={4} color={
                    cat3 >= 4 ? 'bg-accent-red' : cat3 >= 3 ? 'bg-accent-orange' : cat3 > 0 ? 'bg-accent-yellow' : 'bg-bg-border'
                  } />
                  <div className="mt-3">
                    <RadioGroup
                      options={CAT3_OPTIONS}
                      value={cat3}
                      onChange={setCat3}
                      name="cat3"
                    />
                  </div>
                </div>

                {/* ── CAT 4: Self-Sufficiency (max 2) ── */}
                <div>
                  <SectionHeader number={4} title="Self-Sufficiency" max={2} score={cat4} />
                  <ScoreBar score={cat4} max={2} color={cat4 > 0 ? 'bg-accent-yellow' : 'bg-bg-border'} />
                  <div className="mt-3">
                    <RadioGroup
                      options={CAT4_OPTIONS}
                      value={cat4}
                      onChange={setCat4}
                      name="cat4"
                    />
                  </div>
                </div>

                {/* ── CAT 5: Isolation (max 1) ── */}
                <div>
                  <SectionHeader number={5} title="Isolation" max={1} score={cat5} />
                  <ScoreBar score={cat5} max={1} color={cat5 > 0 ? 'bg-accent-orange' : 'bg-bg-border'} />
                  <div className="mt-3">
                    <label
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        cat5 === 1
                          ? 'bg-accent-blue/10 border-accent-blue/40'
                          : 'bg-bg-elevated border-bg-border hover:border-text-muted/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={cat5 === 1}
                        onChange={(e) => setCat5(e.target.checked ? 1 : 0)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        cat5 === 1 ? 'border-accent-blue bg-accent-blue' : 'border-bg-border'
                      }`}>
                        {cat5 === 1 && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-sans text-sm ${cat5 === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>
                          Completely isolated — no neighbors, no family, no phone signal
                        </p>
                      </div>
                      <span className={`font-mono text-xs font-semibold flex-shrink-0 ${cat5 === 1 ? 'text-accent-blue' : 'text-text-muted'}`}>
                        1 pt
                      </span>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="label" htmlFor="notes">Field Notes (optional)</label>
                  <textarea
                    id="notes"
                    rows={2}
                    className="input resize-none"
                    placeholder="Volunteer observations, name, additional context..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Error */}
                {submitError && (
                  <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 animate-slide-in">
                    <p className="font-mono text-xs text-accent-red">{submitError}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isFormValid}
                    className="btn-primary flex-1"
                  >
                    {isSubmitting ? (
                      <span className="font-mono">Submitting...</span>
                    ) : (
                      `Submit Assessment — Score ${liveResult.totalScore}`
                    )}
                  </button>
                  <button
                    onClick={resetForm}
                    className="btn-ghost"
                    disabled={isSubmitting}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live Score Summary + Queue (2/5) ── */}
          <div className="xl:col-span-2 space-y-4">

            {/* Live summary card */}
            <div className={`card p-5 border-2 transition-all duration-300 ${bandCfg.border}`}>
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
                Live Score Preview
              </p>

              {/* EMK recommendation */}
              <div className={`mb-4 rounded-lg border ${emkCfg.border} ${emkCfg.bg} px-4 py-3 flex items-center gap-3`}>
                <div>
                  <p className="font-mono text-[10px] text-text-muted">Recommended</p>
                  <p className={`font-mono text-lg font-bold ${emkCfg.color}`}>{liveResult.recommendedEmk}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className={`font-sans text-xs ${emkCfg.color}`}>{emkCfg.label}</p>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="space-y-2">
                {[
                  { label: 'Medical Urgency (Cat.1)', score: cat1, max: 8 },
                  { label: 'Vulnerability (Cat.2)', score: cat2, max: 5 },
                  { label: 'Flood Exposure (Cat.3)', score: cat3, max: 4 },
                  { label: 'Self-Sufficiency (Cat.4)', score: cat4, max: 2 },
                  { label: 'Isolation (Cat.5)', score: cat5, max: 1 },
                ].map((cat) => (
                  <div key={cat.label}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-mono text-[10px] text-text-muted truncate pr-2">{cat.label}</span>
                      <span className={`font-mono text-[10px] font-semibold flex-shrink-0 ${
                        cat.score === cat.max && cat.max > 0 ? 'text-accent-red' :
                        cat.score > 0 ? 'text-accent-orange' : 'text-text-muted'
                      }`}>
                        {cat.score}/{cat.max}
                      </span>
                    </div>
                    <ScoreBar score={cat.score} max={cat.max} color={
                      cat.score === cat.max && cat.max > 0 ? 'bg-accent-red' :
                      cat.score > 0 ? 'bg-accent-blue/70' : 'bg-bg-border'
                    } />
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className={`mt-4 pt-3 border-t border-bg-border flex items-center justify-between`}>
                <span className="font-mono text-sm text-text-secondary">Total Score</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-2xl font-bold ${bandCfg.color}`}>
                    {liveResult.totalScore}
                  </span>
                  <span className="font-mono text-sm text-text-muted">/ 20</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded border ${bandCfg.bg} ${bandCfg.border} ${bandCfg.color}`}>
                    {bandCfg.label}
                  </span>
                </div>
              </div>

              <p className="font-mono text-[10px] text-text-muted mt-2">
                {bandCfg.description}
              </p>

              {/* Tiebreaker note */}
              <div className="mt-3 pt-3 border-t border-bg-border">
                <p className="font-mono text-[9px] text-text-muted leading-relaxed">
                  Tiebreaker order: Cat.1 score → infant under 6mo → first submitted (Section C.6)
                </p>
              </div>
            </div>

            {/* Worked example reference */}
            <div className="card p-4">
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
                Section C.8 Reference Cases
              </p>
              <div className="space-y-1.5">
                {[
                  { label: 'Elderly, alone, no meds', score: 8, band: 'MEDIUM' as PriorityBand, emk: 'EMK1' },
                  { label: 'Diabetic, insulin run out', score: 9, band: 'MEDIUM' as PriorityBand, emk: 'EMK3' },
                  { label: 'Pregnant, water inside', score: 8, band: 'MEDIUM' as PriorityBand, emk: 'EMK2' },
                  { label: 'Elderly hypertension, meds low', score: 10, band: 'HIGH' as PriorityBand, emk: 'EMK3' },
                ].map((ex) => {
                  const cfg = BAND_CONFIG[ex.band];
                  return (
                    <div key={ex.label} className="flex items-center gap-2 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.color.replace('text-', 'bg-')}`} />
                      <span className="font-mono text-[10px] text-text-secondary flex-1 truncate">{ex.label}</span>
                      <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>{ex.score}</span>
                      <span className="font-mono text-[10px] text-text-muted">{ex.emk}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── PRIORITY QUEUE TABLE (full width below) ── */}
        {districts.length > 0 && (
          <div key={queueRefreshKey}>
            <PriorityQueueTable districts={districts} />
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}