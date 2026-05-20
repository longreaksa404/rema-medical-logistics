import { Request, Response } from 'express';
import { loginUser, refreshAccessToken, logoutUser, getCurrentUser } from '../services/auth.service';

// refresh token cookie config
// httpOnly so JS can't read it — XSS safe
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path:     '/api/auth',
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await loginUser(email, password);

    // refresh token goes in httpOnly cookie — never in response body
    res.cookie('rema_refresh', result.refreshToken, COOKIE_OPTS);

    res.json({
      token: result.accessToken,   // kept as "token" so frontend needs no change
      user:  result.user,
    });
  } catch {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.rema_refresh;

  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const result = await refreshAccessToken(rawToken);
    res.json({ token: result.accessToken });
  } catch (err) {
    // clear the bad cookie
    res.clearCookie('rema_refresh', { path: '/api/auth' });
    res.status(401).json({ error: 'Session expired — please log in again' });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.rema_refresh;
  await logoutUser(rawToken);
  res.clearCookie('rema_refresh', { path: '/api/auth' });
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