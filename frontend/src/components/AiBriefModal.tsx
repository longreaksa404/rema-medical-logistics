import { useEffect, useRef } from 'react';
import type { AiBriefResponse } from '../api/ai';

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface AiBriefModalProps {
  isOpen: boolean;
  isLoading: boolean;
  result: AiBriefResponse | null;
  error: string;
  onClose: () => void;
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────

function BriefSection({
  label,
  icon,
  text,
  color = 'text-text-primary',
  borderColor = 'border-bg-border',
}: {
  label: string;
  icon: string;
  text: string;
  color?: string;
  borderColor?: string;
}) {
  return (
    <div className={`rounded border ${borderColor} bg-bg-elevated p-4`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
        {icon} {label}
      </p>
      <p className={`font-sans text-sm leading-relaxed ${color}`}>{text}</p>
    </div>
  );
}

// ─── SNAPSHOT ROW ─────────────────────────────────────────────────────────────

function SnapshotRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-bg-border last:border-0">
      <span className="font-mono text-[10px] text-text-muted uppercase tracking-wide">{label}</span>
      <span className="font-mono text-xs text-text-secondary">{value}</span>
    </div>
  );
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────

export function AiBriefModal({ isOpen, isLoading, result, error, onClose }: AiBriefModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!isOpen) return null;

  const snap = result?.dataSnapshot;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl bg-bg-base border border-bg-border rounded-lg shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-bg-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🤖</span>
              <h2 className="font-mono text-sm font-semibold text-text-primary uppercase tracking-widest">
                REMA AI Brief
              </h2>
            </div>
            <p className="font-mono text-[10px] text-text-muted">
              Operational summary · Advisory only · Human decision required
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors ml-4 flex-shrink-0"
            aria-label="Close modal"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── ADVISORY BANNER — always visible ── */}
        <div className="mx-6 mt-4 flex-shrink-0 bg-accent-red/10 border border-accent-red/30 rounded px-4 py-2.5">
          <p className="font-mono text-xs text-accent-red font-semibold">
            ⚠ Advisory only — all decisions require human judgment and authority
          </p>
          <p className="font-mono text-[10px] text-accent-red/70 mt-0.5">
            This brief cannot trigger any system action. The Emergency Coordinator retains full decision authority.
          </p>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-text-muted border-t-accent-blue rounded-full animate-spin" />
              <p className="font-mono text-xs text-text-muted">Generating operational brief...</p>
              <p className="font-mono text-[10px] text-text-muted">Reading live dashboard data · Calling AI model</p>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="bg-accent-orange/10 border border-accent-orange/30 rounded p-4">
              <p className="font-mono text-xs text-accent-orange font-semibold mb-1">
                AI Brief temporarily unavailable
              </p>
              <p className="font-mono text-[10px] text-accent-orange/80">
                {error}
              </p>
              <p className="font-mono text-[10px] text-text-muted mt-2">
                Use the dashboard directly to assess the current situation.
              </p>
            </div>
          )}

          {/* Result */}
          {!isLoading && result && (
            <>
              {/* Three brief sections */}
              <BriefSection
                label="Situation Summary"
                icon="📊"
                text={result.summary}
              />
              <BriefSection
                label="Priority Alert"
                icon="🔴"
                text={result.priorityAlert}
                color="text-accent-red"
                borderColor="border-accent-red/20"
              />
              <BriefSection
                label="Recommended Next Step"
                icon="➡"
                text={result.nextStep}
                color="text-accent-blue"
                borderColor="border-accent-blue/20"
              />

              {/* Data snapshot — transparency section */}
              {snap && (
                <div className="rounded border border-bg-border bg-bg-elevated p-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-3">
                    📋 Data used to generate this brief
                  </p>
                  <div>
                    <SnapshotRow label="Response phase" value={`Phase ${snap.phase}`} />
                    <SnapshotRow label="Critical households (undelivered)" value={snap.totalCritical} />
                    <SnapshotRow label="High households (undelivered)" value={snap.totalHigh} />
                    <SnapshotRow label="Active delivery runs" value={snap.activeDeliveryRuns} />
                    <SnapshotRow label="Open incidents" value={snap.openIncidentCount} />
                    <SnapshotRow label="Radio compliance today" value={`${snap.radioCompliancePct}%`} />
                    <SnapshotRow
                      label="Stock scarcity alert"
                      value={snap.scarcityActive ? '⚠ YES — below 30%' : 'No'}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 py-4 border-t border-bg-border flex items-center justify-between flex-shrink-0">
          <p className="font-mono text-[10px] text-text-muted">
            {result
              ? `Generated at ${new Date(result.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} from live dashboard data`
              : 'REMA AI · Powered by Claude · Anthropic'}
          </p>
          <button
            onClick={onClose}
            className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors border border-bg-border rounded px-3 py-1.5"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}