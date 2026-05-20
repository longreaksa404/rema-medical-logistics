import axios from 'axios';

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

// track whether a refresh is already in flight to avoid parallel retries
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function drainQueue(newToken: string) {
  refreshQueue.forEach(fn => fn(newToken));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // only attempt refresh on 401, and only once per request
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    // if a refresh is already running, queue this request until it resolves
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retried  = true;
    isRefreshing       = true;

    try {
      // cookie is sent automatically (withCredentials: true)
      const res = await axios.post<{ token: string }>(
        `${API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newToken = res.data.token;
      localStorage.setItem('rema_token', newToken);

      // update auth header for the retried request and drain queue
      original.headers.Authorization = `Bearer ${newToken}`;
      drainQueue(newToken);

      return api(original);
    } catch {
      // refresh failed — clear everything and force re-login
      refreshQueue = [];
      localStorage.removeItem('rema_token');
      localStorage.removeItem('rema_user');
      localStorage.removeItem('rema_must_change');
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);