// OfflineSync.tsx — sends queued offline submissions when the connection
// returns, and shows connection / sync status at the top of every page.

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { outbox, useOnline, useOutbox } from '../offline';

const RETRY_INTERVAL_MS = 30_000;

export function OfflineSync() {
  const { user } = useAuth();
  const online = useOnline();
  const queryClient = useQueryClient();
  const { pending, settled, flushing } = useOutbox(user?.id);

  const sync = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    const result = await outbox.flush(user.id);
    if (result.sent.length > 0 || result.settled.length > 0) {
      // the server state changed — refresh queues, runs, stock, incidents
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['hub'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  }, [user, queryClient]);

  // on sign-in / page load, and whenever the connection comes back
  useEffect(() => {
    if (online && pending.length > 0) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, user?.id]);

  // keep retrying while something is waiting (connection may be up but flaky)
  useEffect(() => {
    if (!online || pending.length === 0) return;
    const timer = setInterval(sync, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [online, pending.length, sync]);

  if (!user || (online && pending.length === 0 && settled.length === 0)) return null;

  return (
    <div className="border-b border-bg-border" role="status" aria-live="polite">
      {(!online || pending.length > 0) && (
        <div className={`px-6 py-2 flex flex-wrap items-center justify-between gap-2 ${
          online ? 'bg-accent-blue/10' : 'bg-accent-orange/10'
        }`}>
          <p className={`font-mono text-[11px] ${online ? 'text-accent-blue' : 'text-accent-orange'}`}>
            {online
              ? flushing
                ? `Syncing ${pending.length} item${pending.length === 1 ? '' : 's'} recorded offline…`
                : `${pending.length} item${pending.length === 1 ? '' : 's'} recorded offline waiting to sync`
              : 'Offline — showing data saved on this device. New deliveries, assessments and reports are kept and sent when you reconnect.'}
            {!online && pending.length > 0 && ` (${pending.length} waiting)`}
          </p>
          {online && pending.length > 0 && !flushing && (
            <button
              onClick={sync}
              className="font-mono text-[11px] px-2.5 py-1 rounded border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/10 transition-colors"
            >
              Sync now
            </button>
          )}
        </div>
      )}

      {settled.map(item => (
        <div
          key={item.id}
          className={`px-6 py-2 flex items-start justify-between gap-3 ${
            item.outcome === 'already-done' ? 'bg-bg-elevated' : 'bg-accent-red/10'
          }`}
        >
          <p className={`font-mono text-[11px] ${item.outcome === 'already-done' ? 'text-text-secondary' : 'text-accent-red'}`}>
            {item.outcome === 'already-done'
              ? `${item.label}: already recorded as delivered — nothing more to do.`
              : `${item.label} could not be saved: ${item.reason}. Tell your Hub Manager or record it again.`}
          </p>
          <button
            onClick={() => outbox.dismissSettled(item.id)}
            className="font-mono text-xs text-text-muted hover:text-text-primary flex-shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
