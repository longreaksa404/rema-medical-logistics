// Shared by api/client.ts and offline/index.ts (kept separate to avoid an import cycle)
export const QUERY_CACHE_KEY = 'rema_query_cache_v1';

export function clearPersistedQueryCache(): void {
  try {
    window.localStorage.removeItem(QUERY_CACHE_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}
