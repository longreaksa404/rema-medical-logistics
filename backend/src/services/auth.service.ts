import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';
import { JwtPayload } from '../types/auth';
import { config } from '../config';

const ACCESS_EXPIRES_IN    = '15m';
const REFRESH_EXPIRES_DAYS = 7;

// Several tabs share one refresh cookie and may refresh at the same moment.
// A token rotated less than this long ago is still accepted (without rotating
// again) so the slower tab is not logged out.
const ROTATION_GRACE_MS = 30_000;

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: ACCESS_EXPIRES_IN });
}

function payloadFor(user: Pick<User, 'id' | 'email' | 'role' | 'districtId'>): JwtPayload {
  return { userId: user.id, email: user.email, role: user.role, districtId: user.districtId };
}

function makeRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const accessToken  = signAccessToken(payloadFor(user));
  const refreshToken = makeRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86_400_000);

  // stamp lastLoginAt + store refresh token hash in one transaction,
  // and drop this user's expired tokens so the table does not grow forever
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId:    user.id,
        expiresAt: refreshExpiresAt,
      },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt,
    user: {
      id:                 user.id,
      email:              user.email,
      name:               user.name,
      phone:              user.phone,
      role:               user.role,
      districtId:         user.districtId,
      mustChangePassword: user.mustChangePassword,
      avatarBase64:       user.avatarBase64,
      createdAt:          user.createdAt.toISOString(),
      lastLoginAt: new Date().toISOString(),
    },
  };
}

// ─── REFRESH (with rotation) ──────────────────────────────────────────────────
// Each refresh token works once: it is exchanged for a new one with the same
// absolute expiry (sessions still end 7 days after login). Presenting a token
// that was rotated more than ROTATION_GRACE_MS ago means someone kept a copy —
// every session for that user is revoked.

export async function refreshAccessToken(rawRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;   // null = keep the cookie the browser already has
  refreshExpiresAt: Date;
}> {
  const hash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!stored)                         throw new Error('Invalid refresh token');
  if (stored.expiresAt < new Date())   throw new Error('Refresh token has expired');
  if (!stored.user.active)             throw new Error('Account is inactive');

  const accessToken = signAccessToken(payloadFor(stored.user));

  if (stored.revoked) {
    if (stored.rotatedAt && Date.now() - stored.rotatedAt.getTime() < ROTATION_GRACE_MS) {
      return { accessToken, refreshToken: null, refreshExpiresAt: stored.expiresAt };
    }
    if (stored.rotatedAt) await revokeAllRefreshTokens(stored.userId);
    throw new Error('Refresh token has been revoked');
  }

  const newRefreshToken = makeRefreshToken();
  const rotated = await prisma.$transaction(async (tx) => {
    // conditional: if a parallel request rotated it first, count is 0
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, revoked: false },
      data:  { revoked: true, rotatedAt: new Date() },
    });
    if (count === 0) return false;
    await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId:    stored.userId,
        expiresAt: stored.expiresAt,
      },
    });
    return true;
  });

  return {
    accessToken,
    refreshToken: rotated ? newRefreshToken : null,
    refreshExpiresAt: stored.expiresAt,
  };
}

// ─── SESSION HELPERS ──────────────────────────────────────────────────────────

// Ends every session for a user (password change/reset, deactivation, token theft)
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data:  { revoked: true },
  });
}

// Starts a fresh session for an already-authenticated user (e.g. after they
// changed their own password and all their other sessions were revoked)
export async function issueRefreshToken(userId: string): Promise<{ refreshToken: string; refreshExpiresAt: Date }> {
  const refreshToken = makeRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86_400_000);
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId, expiresAt: refreshExpiresAt },
  });
  return { refreshToken, refreshExpiresAt };
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

export async function logoutUser(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) return;
  const hash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revoked: false },
    data:  { revoked: true },
  });
}

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, phone: true,
      role: true, districtId: true, active: true,
      createdAt: true, lastLoginAt: true,
      mustChangePassword: true, avatarBase64: true,
    },
  });

  if (!user || !user.active) throw new Error('User not found');
  return user;
}

// ─── HASH PASSWORD ────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}