import axios from 'axios';
import { clearPersistedQueryCache } from '../offline/keys';

const API_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || '';

export const api = axios.create({
  baseURL:         API_URL,
  withCredentials: true,   // send the httpOnly refresh cookie on every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// attach access token from memory/localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rema_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── TOKEN REFRESH ────────────────────────────────────────────────────────────
// Single-flight: however many requests (or the socket) hit an expired token at
// once, only ONE /refresh call is made and everyone awaits the same promise.
// This matters because the server rotates the refresh cookie on every use.

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ token: string }>(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        localStorage.setItem('rema_token', res.data.token);
        return res.data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export function clearSessionAndRedirect(): void {
  localStorage.removeItem('rema_token');
  localStorage.removeItem('rema_user');
  localStorage.removeItem('rema_must_change');
  // cached household data must not outlive the session; queued offline work
  // (the outbox) is kept and sent next time this user signs in
  clearPersistedQueryCache();
  if (window.location.pathname !== '/login') window.location.href = '/login';
}

// A 401 from these means "wrong credentials", not "access token expired"
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // only attempt refresh on 401, and only once per request
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retried ||
      NO_REFRESH_PATHS.some((p) => original.url?.includes(p))
    ) {
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      const newToken = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      // refresh failed — session is over, force re-login
      clearSessionAndRedirect();
      return Promise.reject(error);
    }
  }
);
