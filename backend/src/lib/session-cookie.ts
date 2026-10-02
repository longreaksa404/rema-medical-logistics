import { Response } from 'express';

// Refresh-token cookie. Frontend (Vercel) and backend (Render) are different
// sites, so sameSite 'none' + secure is required for the browser to send it.
const COOKIE_NAME = 'rema_refresh';

const BASE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'none' as const,
  path:     '/api/auth',
};

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(COOKIE_NAME, token, {
    ...BASE_OPTS,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, BASE_OPTS);
}

export function readRefreshCookie(cookies: Record<string, string> | undefined): string | undefined {
  return cookies?.[COOKIE_NAME];
}
