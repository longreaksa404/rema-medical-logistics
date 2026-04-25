import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
  onRefresh?: () => Promise<void>;
  lastUpdated?: Date | null;
  isRefreshing?: boolean;
  pollInterval?: number; // ms, default 30000
}

export function DashboardLayout({
  title,
  children,
  onRefresh,
  lastUpdated,
  isRefreshing = false,
  pollInterval = 30_000,
}: DashboardLayoutProps) {
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Auto-poll
  useEffect(() => {
    if (!onRefresh) return;

    const id = setInterval(() => {
      onRefresh();
    }, pollInterval);

    return () => clearInterval(id);
  }, [onRefresh, pollInterval]);

  const handleManualRefresh = useCallback(async () => {
    if (!onRefresh || manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setManualRefreshing(false);
    }
  }, [onRefresh, manualRefreshing]);

  const isAnyRefreshing = isRefreshing || manualRefreshing;

  const formattedLastUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="flex-1 flex flex-col min-h-screen min-w-0">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-bg-primary/90 backdrop-blur-sm border-b border-bg-border px-6 py-3 flex items-center justify-between gap-4">
        <h1 className="font-sans font-bold text-text-primary text-lg tracking-tight">
          {title}
        </h1>

        <div className="flex items-center gap-4">
          {formattedLastUpdated && (
            <span className="font-mono text-[11px] text-text-muted hidden sm:block">
              updated {formattedLastUpdated}
            </span>
          )}

          {onRefresh && (
            <button
              onClick={handleManualRefresh}
              disabled={isAnyRefreshing}
              className={`font-mono text-xs px-3 py-1.5 rounded border border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors duration-100 disabled:opacity-40 ${
                isAnyRefreshing ? 'animate-pulse' : ''
              }`}
            >
              {isAnyRefreshing ? 'refreshing...' : '↻ refresh'}
            </button>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 px-6 py-6">
        {children}
      </main>
    </div>
  );
}