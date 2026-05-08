/**
 * Shared in-memory cache utility for REMA backend services.
 *
 * Extracted from dashboard.service.ts so all services share one implementation.
 * Architecture is Redis-ready: swap getCached/setCached/deleteCached for Redis
 * calls and the rest of every service file is unchanged.
 *
 * TTL reference (see individual services for context):
 *   districts        300 s — almost never changes mid-event
 *   volunteers        30 s
 *   incidents         20 s
 *   routes            20 s
 *   radio compliance  20 s
 *   stock status      15 s
 *   priority queue    15 s
 *   delivery runs     10 s
 *   dashboard summary 15 s
 *   dashboard district 10 s
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, CacheEntry<any>>();

/** Returns cached value or null if missing/expired. */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Stores a value with a TTL in milliseconds. */
export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Deletes one key, all keys matching a prefix, or the entire store.
 *
 * Usage:
 *   deleteCached('stock:status')               — single key
 *   deleteCached('dashboard:district:')         — prefix (trailing colon)
 *   deleteCached()                              — full flush
 */
export function deleteCached(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    store.clear();
    return;
  }
  // Prefix match: delete every key that starts with keyOrPrefix
  // A single exact key is also handled correctly (startsWith exact string).
  for (const k of store.keys()) {
    if (k.startsWith(keyOrPrefix)) {
      store.delete(k);
    }
  }
}

/** Convenience: how many entries are currently in the store (for tests/debug). */
export function cacheSize(): number {
  return store.size;
}