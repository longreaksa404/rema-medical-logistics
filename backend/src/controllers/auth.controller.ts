import { Request, Response } from 'express';
import { loginUser, getCurrentUser } from '../services/auth.service';

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await loginUser(email, password);
    res.json(result);
  } catch {
    // Same error message for wrong email or wrong password — don't leak which one
    res.status(401).json({ error: 'Invalid credentials' });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// JWT is stateless — we don't store tokens server-side.
// Logout is handled client-side by deleting the token.
// This endpoint exists to match the API spec and give a clean response.

export async function logout(_req: Request, res: Response): Promise<void> {
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