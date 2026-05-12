import { type ReactNode } from 'react';

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  isRefreshing?: boolean;
  // Chat 20 — AI Brief in header
  onAiBrief?: () => void;
  aiBriefLoading?: boolean;
  showAiBrief?: boolean;
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
}: DashboardLayoutProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border flex-shrink-0">
        <h1 className="font-sans font-bold text-text-primary text-lg">{title}</h1>

        <div className="flex items-center gap-5">

          {/* AI Brief button — visible only when showAiBrief is true */}
          {showAiBrief && onAiBrief && (
            <button
              onClick={onAiBrief}
              disabled={aiBriefLoading}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs
                transition-all duration-150
                ${aiBriefLoading
                  ? 'border-bg-border text-text-muted cursor-not-allowed bg-bg-elevated'
                  : 'border-accent-blue/40 text-accent-blue bg-accent-blue/5 hover:bg-accent-blue/10 hover:border-accent-blue/60'
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
                  <span className="sm:hidden">AI Brief</span>
                </>
              )}
            </button>
          )}

          {/* Last updated timestamp */}
          {lastUpdated && (
            <span className="font-mono text-[10px] text-text-muted hidden sm:block">
              updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          
          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs
                transition-all duration-150
                ${isRefreshing
                  ? 'border-bg-border text-text-muted cursor-not-allowed'
                  : 'border-bg-border text-text-muted hover:text-text-primary hover:border-text-muted/40'
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
                  <path d="M8 4.5h2V2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
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