import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../types/auth';

const JWT_SECRET           = process.env.JWT_SECRET || 'rema-dev-secret-change-in-production';
const ACCESS_EXPIRES_IN    = '15m';
const REFRESH_EXPIRES_DAYS = 7;

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
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

  const payload: JwtPayload = {
    userId:     user.id,
    email:      user.email,
    role:       user.role,
    districtId: user.districtId,
  };

  const accessToken  = signAccessToken(payload);
  const refreshToken = makeRefreshToken();

  // stamp lastLoginAt + store refresh token hash in one transaction
  await prisma.$transaction([
  prisma.user.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  }),
  prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId:    user.id,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86_400_000),
    },
  }),
]);

  return {
    accessToken,
    refreshToken,
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

// ─── REFRESH ──────────────────────────────────────────────────────────────────

export async function refreshAccessToken(rawRefreshToken: string) {
  const hash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!stored)                         throw new Error('Invalid refresh token');
  if (stored.revoked)                  throw new Error('Refresh token has been revoked');
  if (stored.expiresAt < new Date())   throw new Error('Refresh token has expired');
  if (!stored.user.active)             throw new Error('Account is inactive');

  const payload: JwtPayload = {
    userId:     stored.user.id,
    email:      stored.user.email,
    role:       stored.user.role,
    districtId: stored.user.districtId,
  };

  return { accessToken: signAccessToken(payload) };
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