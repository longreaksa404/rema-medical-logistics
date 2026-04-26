// Simple localStorage cache with TTL
// Used to show instant data on revisit while fresh data loads in background

const CACHE_PREFIX = 'rema_cache_';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttlMs,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function cacheGet<T>(key: string): { data: T; isStale: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.cachedAt;
    const isStale = age > entry.ttlMs;

    return { data: entry.data, isStale };
  } catch {
    return null;
  }
}

export function cacheClear(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}