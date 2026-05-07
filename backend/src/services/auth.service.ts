import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'rema-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '12h'; // Long enough for a full flood event shift

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  // 1. Find user by email
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    throw new Error('Invalid credentials');
  }

  // 2. Check password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  // 3. Build JWT payload
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    districtId: user.districtId,
  };

  // 4. Sign token
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      districtId: user.districtId,
    },
  };
}

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      districtId: true,
      active: true,
      createdAt: true,
    },
  });

  if (!user || !user.active) {
    throw new Error('User not found');
  }

  return user;
}

// ─── HASH PASSWORD (used by seed script) ──────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}