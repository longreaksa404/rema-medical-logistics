import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

// Mint an access token the same way auth.service does
export function tokenFor(user: Pick<User, 'id' | 'email' | 'role' | 'districtId'>): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, districtId: user.districtId },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' },
  );
}

export function bearer(user: Pick<User, 'id' | 'email' | 'role' | 'districtId'>): [string, string] {
  return ['Authorization', `Bearer ${tokenFor(user)}`];
}
