import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'rema-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '12h';

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    districtId: user.districtId,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      districtId: user.districtId,
      mustChangePassword: user.mustChangePassword,  // included in login response
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
      mustChangePassword: true,
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