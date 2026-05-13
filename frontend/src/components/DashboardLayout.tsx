import { type ReactNode } from 'react';

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  isRefreshing?: boolean;
  // AI Brief
  onAiBrief?: () => void;
  aiBriefLoading?: boolean;
  showAiBrief?: boolean;
  // Phase advance  ← ADD THESE THREE
  onAdvancePhase?: () => void;
  advancePhaseLoading?: boolean;
  showAdvancePhase?: boolean;
  advancePhaseLabel?: string;
  // Phase reset
  onReset?: () => void;
  resetLoading?: boolean;
  showReset?: boolean;
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────

export function DashboardLayout({
  title,
  children,
  onRefresh,
  lastUpdated,
  isRefreshing = false,
  onAiBrief,
  aiBriefLoading = false,
  showAiBrief = false,
  onAdvancePhase,                   // ← ADD
  advancePhaseLoading = false,      // ← ADD
  showAdvancePhase = false,         // ← ADD
  advancePhaseLabel = 'Advance Phase', // ← ADD
  onReset,
  resetLoading = false,
  showReset = false,
}: DashboardLayoutProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-bg-border flex-shrink-0 gap-4">

        {/* Left — title + last updated stacked */}
        <div className="flex flex-col min-w-0">
          <h1 className="font-sans font-bold text-text-primary text-base leading-tight truncate">
            {title}
          </h1>
          {lastUpdated && (
            <span className="font-mono text-[9px] text-text-muted mt-0.5 hidden sm:block">
              updated {lastUpdated.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Right — action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* AI Brief button */}
          {showAiBrief && onAiBrief && (
            <button
              onClick={onAiBrief}
              disabled={aiBriefLoading}
              title="Generate AI operational brief"
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs
                transition-all duration-150
                ${aiBriefLoading
                  ? 'border-bg-border text-text-muted cursor-not-allowed bg-bg-elevated'
                  : 'border-accent-blue/40 text-accent-blue bg-accent-blue/5 hover:bg-accent-blue/15 hover:border-accent-blue/60 active:scale-95'
                }
              `}
            >
              {aiBriefLoading ? (
                <>
                  <div className="w-3 h-3 border border-text-muted border-t-accent-blue rounded-full animate-spin flex-shrink-0" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span className="hidden sm:inline">Generate AI Brief</span>
                  <span className="sm:hidden">AI</span>
                </>
              )}
            </button>
          )}

          {/* Divider between AI brief and phase controls */}
          {showAiBrief && (showAdvancePhase || showReset) && (
            <div className="h-5 w-px bg-bg-border flex-shrink-0" />
          )}

          {/* Advance Phase button — EC and SUPER_ADMIN, phases 1 only */}
          {showAdvancePhase && onAdvancePhase && (
            <button
              onClick={onAdvancePhase}
              disabled={advancePhaseLoading}
              title={advancePhaseLabel}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs
                transition-all duration-150
                ${advancePhaseLoading
                  ? 'border-bg-border text-text-muted cursor-not-allowed bg-bg-elevated'
                  : 'border-accent-orange/40 text-accent-orange bg-accent-orange/5 hover:bg-accent-orange/15 hover:border-accent-orange/60 active:scale-95'
                }
              `}
            >
              {advancePhaseLoading ? (
                <>
                  <div className="w-3 h-3 border border-text-muted border-t-accent-orange rounded-full animate-spin flex-shrink-0" />
                  <span className="hidden sm:inline">Advancing...</span>
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                    <path d="M6 1v10M6 1l4 4M6 1L2 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="hidden sm:inline">{advancePhaseLabel}</span>
                  <span className="sm:hidden">Ph2</span>
                </>
              )}
            </button>
          )}

          {/* Divider between advance and reset */}
          {showAdvancePhase && showReset && (
            <div className="h-5 w-px bg-bg-border flex-shrink-0" />
          )}

          {/* Reset System button — SUPER_ADMIN only */}
          {showReset && onReset && (
            <button
              onClick={onReset}
              disabled={resetLoading}
              title="Reset system to Phase 0 (SUPER_ADMIN only)"
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs
                transition-all duration-150
                ${resetLoading
                  ? 'border-bg-border text-text-muted cursor-not-allowed bg-bg-elevated'
                  : 'border-accent-red/40 text-accent-red bg-accent-red/5 hover:bg-accent-red/15 hover:border-accent-red/60 active:scale-95'
                }
              `}
            >
              {resetLoading ? (
                <>
                  <div className="w-3 h-3 border border-text-muted border-t-accent-red rounded-full animate-spin flex-shrink-0" />
                  <span className="hidden sm:inline">Resetting...</span>
                </>
              ) : (
                <>
                  {/* Reset icon */}
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                    <path
                      d="M1 6a5 5 0 1 0 1.5-3.54"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M1 2v2.5H3.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Reset System</span>
                  <span className="sm:hidden">Reset</span>
                </>
              )}
            </button>
          )}

          {/* Divider before refresh */}
          {onRefresh && (showAiBrief || showReset) && (
            <div className="h-5 w-px bg-bg-border flex-shrink-0" />
          )}

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh dashboard data"
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-mono text-xs
                transition-all duration-150
                ${isRefreshing
                  ? 'border-bg-border text-text-muted cursor-not-allowed'
                  : 'border-bg-border text-text-muted hover:text-text-primary hover:border-text-muted/40 active:scale-95'
                }
              `}
            >
              {isRefreshing ? (
                <div className="w-3 h-3 border border-text-muted border-t-text-primary rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 4.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 4.5h2V2.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">refresh</span>
            </button>
          )}

        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>

    </div>
  );
}