import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';
import { config } from '../config';

// Throws if the token is missing, malformed, expired or signed with another key
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

// ─── REQUIRE AUTH ─────────────────────────────────────────────────────────────
// Attach this to any route that requires a logged-in user.
// Sets req.user if valid, returns 401 if not.

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── REQUIRE ROLE ─────────────────────────────────────────────────────────────
// Role hierarchy — higher index = more authority.
// Usage: requireRole('HUB_MANAGER') — allows HUB_MANAGER and above.

const ROLE_HIERARCHY = [
  'VIEWER',
  'VOLUNTEER',
  'HUB_MANAGER',
  'EMERGENCY_COORDINATOR',
  'SUPER_ADMIN',
];

export function requireRole(minimumRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userLevel = ROLE_HIERARCHY.indexOf(req.user.role);
    const requiredLevel = ROLE_HIERARCHY.indexOf(minimumRole);

    if (userLevel === -1 || requiredLevel === -1) {
      res.status(403).json({ error: 'Unknown role' });
      return;
    }

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: `Requires ${minimumRole} or above. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}