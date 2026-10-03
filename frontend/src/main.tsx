import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import './index.css';
import { App } from './App';
import { QUERY_CACHE_KEY, OFFLINE_CACHE_MAX_AGE, isOfflineQuery } from './offline';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // kept long enough that data saved for offline use is still there to restore
      gcTime: OFFLINE_CACHE_MAX_AGE,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Field data (priority queue, active runs, district) is saved on the device so
// volunteers can still see it with no connection. See offline/index.ts.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
});

createRoot(document.getElementById('root')!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: OFFLINE_CACHE_MAX_AGE,
      buster: 'v1',
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => query.state.status === 'success' && isOfflineQuery(query),
      },
    }}
  >
    <App />
  </PersistQueryClientProvider>
);

// Service worker: caches the app shell so the app opens without a connection.
// Production only — in development it would fight Vite's hot reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[sw] registration failed', err));
  });
}
