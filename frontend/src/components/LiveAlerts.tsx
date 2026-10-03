// LiveAlerts.tsx — app-wide toasts for real-time events (Section C.9 scarcity).
// Mounted once in AppShell so alerts appear on every page. Also refreshes cached
// stock / dashboard data so open pages show the new levels without waiting.

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n, districtLabel } from '../i18n';

export interface ScarcityAlert {
  scope: 'subWarehouse' | 'central';
  districtId: string | null;
  districtName: string | null;
  emkType: 'EMK1' | 'EMK2' | 'EMK3';
  remaining: number;
  total: number;
  pct: number;
}

interface Toast extends ScarcityAlert {
  id: number;
}

const AUTO_DISMISS_MS = 20_000;
const MAX_TOASTS = 4;

let nextId = 1;

export function LiveAlerts() {
  const { user, onSocketEvent } = useAuth();
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t: tr } = useI18n();

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    return onSocketEvent('scarcity_triggered', (data) => {
      const alert = data as ScarcityAlert;

      // stock views everywhere should show the new level
      queryClient.invalidateQueries({ queryKey: ['hub'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Volunteers can't act on stock levels; Hub Managers only care about
      // their own district (central shortages affect everyone's resupply).
      if (!user || user.role === 'VOLUNTEER') return;
      if (user.role === 'HUB_MANAGER' && alert.scope === 'subWarehouse' && alert.districtId !== user.districtId) return;

      const toast = { ...alert, id: nextId++ };
      setToasts(prev => [...prev, toast].slice(-MAX_TOASTS));
      setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    });
  }, [onSocketEvent, queryClient, user, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]"
      role="status"
      aria-live="assertive"
    >
      {toasts.map(t => (
        <div key={t.id} className="card border-accent-red/40 bg-bg-elevated px-4 py-3 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-accent-red uppercase tracking-widest mb-1">
                ⚠ {tr('alerts.scarcity')}
              </p>
              <p className="font-sans text-sm text-text-primary">
                {t.scope === 'central' ? tr('alerts.central') : tr('alerts.subWarehouse', { district: districtLabel(tr, t.districtName) })}
                {' · '}{tr('alerts.atPct', { emk: t.emkType })} <span className="font-semibold text-accent-red">{t.pct}%</span>
              </p>
              <p className="font-mono text-[11px] text-text-muted mt-0.5">
                {tr('alerts.remaining', { remaining: t.remaining.toLocaleString(), total: t.total.toLocaleString() })} ·{' '}
                {t.scope === 'central' ? tr('alerts.arrangeResupply') : tr('alerts.reallocate')}
              </p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="font-mono text-xs text-text-muted hover:text-text-primary flex-shrink-0"
              aria-label={tr('alerts.dismiss')}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
