import { Request, Response } from 'express';
import { loginUser, refreshAccessToken, logoutUser, getCurrentUser } from '../services/auth.service';
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from '../lib/session-cookie';


// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await loginUser(email, password);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({
      token: result.accessToken,
      user:  result.user,
    });
  } catch {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = readRefreshCookie(req.cookies);

  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const result = await refreshAccessToken(rawToken);
    if (result.refreshToken) setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({ token: result.accessToken });
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({ error: 'Session expired - please log in again' });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  await logoutUser(readRefreshCookie(req.cookies));
  clearRefreshCookie(res);
  res.json({ message: 'Logged out successfully' });
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const user = await getCurrentUser(req.user.userId);
    res.json(user);
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
}