// offline/index.ts — app wiring for offline mode: the shared outbox, a
// submit-or-queue helper for field actions, React hooks, and the list of
// queries that are kept on the device for offline viewing.

import { useEffect, useState, useSyncExternalStore } from 'react';
import axios from 'axios';
import type { Query } from '@tanstack/react-query';
import { api } from '../api/client';
import { createOutbox, OutboxHttpError, OutboxNetworkError, type OutboxItem, type OutboxKind } from './outbox';

// Field requests on a bad connection should fail fast enough to be queued
const FIELD_REQUEST_TIMEOUT_MS = 20_000;

function isNetworkFailure(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

export const outbox = createOutbox({
  storage: window.localStorage,
  transport: {
    async post(url, body) {
      try {
        const res = await api.post(url, body, { timeout: FIELD_REQUEST_TIMEOUT_MS });
        return res.data;
      } catch (err) {
        if (isNetworkFailure(err)) throw new OutboxNetworkError('No connection');
        if (axios.isAxiosError(err)) {
          const message = (err.response?.data as { error?: string } | undefined)?.error ?? err.message;
          throw new OutboxHttpError(err.response!.status, message);
        }
        throw err;
      }
    },
  },
});

export type SubmitResult<T> = { queued: false; data: T } | { queued: true; item: OutboxItem };

/**
 * Sends a field submission now if possible; if the device is offline or the
 * request cannot reach the server, stores it in the outbox instead.
 * Server-side errors (validation, permissions…) are thrown as usual.
 */
export async function submitOrQueue<T>(input: {
  userId: string;
  kind: OutboxKind;
  url: string;
  body: unknown;
  label: string;
}): Promise<SubmitResult<T>> {
  if (!navigator.onLine) {
    return { queued: true, item: outbox.enqueue(input) };
  }
  try {
    const res = await api.post<T>(input.url, input.body, { timeout: FIELD_REQUEST_TIMEOUT_MS });
    return { queued: false, data: res.data };
  } catch (err) {
    if (isNetworkFailure(err)) return { queued: true, item: outbox.enqueue(input) };
    throw err;
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function useOutbox(userId: string | undefined) {
  const state = useSyncExternalStore(outbox.subscribe, outbox.getSnapshot);
  const flushing = useSyncExternalStore(outbox.subscribe, outbox.isFlushing);
  return {
    pending: userId ? state.items.filter((i) => i.userId === userId) : [],
    settled: userId ? state.settled.filter((i) => i.userId === userId) : [],
    flushing,
  };
}

// ─── QUERIES KEPT ON THE DEVICE ───────────────────────────────────────────────
// Only what a volunteer needs in the field is persisted (it includes household
// addresses, so it is cleared on logout).

export { QUERY_CACHE_KEY, clearPersistedQueryCache } from './keys';
export const OFFLINE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export function isOfflineQuery(query: Pick<Query, 'queryKey'>): boolean {
  const [a, b, c, d] = query.queryKey as unknown[];
  if (a === 'households' && b === 'queue' && query.queryKey.length === 3) return true;   // priority queue
  if (a === 'hub' && c === 'deliveries' && d === 'active') return true;                 // active delivery runs
  if (a === 'districts' && query.queryKey.length === 2) return true;                    // volunteer's district
  if (a === 'dashboard' && b === 'summary') return true;
  return false;
}
