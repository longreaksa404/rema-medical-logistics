import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// In-memory counters — fine for a single Render instance. Move to a shared
// store (e.g. Redis) if the API ever runs on more than one instance.

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function emailOf(req: Request): string {
  const email = req.body?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

// Password guessing against one account. Keyed by IP + email so one user typing
// a wrong password does not lock out a whole ops centre behind a shared NAT.
export const loginAccountLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${emailOf(req)}`,
  message: { error: 'Too many failed login attempts. Try again in 15 minutes.' },
});

// Spraying many accounts from one address
export const loginIpLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this network. Try again later.' },
});

export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
