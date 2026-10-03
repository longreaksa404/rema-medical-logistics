// sw.js — REMA service worker: lets the app open with no connection.
//
//   page navigations  → network first, fall back to the cached app shell
//   /assets/*         → cache first (Vite fingerprints these, so they never change)
//   other same-origin → network first, fall back to cache (logos, diagrams, PDF)
//
// API requests go to the backend on another origin and are NOT handled here —
// offline data comes from the saved query cache, and offline writes go to the
// outbox (src/offline/).

const VERSION = 'rema-v1';
const SHELL = ['/', '/index.html', '/rema_logo_new.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(fallbackUrl ?? request);
    if (cached) return cached;
    throw new Error('Offline and not cached');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;     // API, map tiles, fonts: browser handles
  if (url.pathname.startsWith('/api/')) return;        // dev proxy to the API

  if (request.mode === 'navigate') {
    // every route is the same SPA shell
    event.respondWith(networkFirst(request, '/index.html'));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
