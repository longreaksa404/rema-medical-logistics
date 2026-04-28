import axios from 'axios';

const API_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rema_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rema_token');
      localStorage.removeItem('rema_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);