import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  changeOwnPassword,
  resetUserPassword,
  getPublicStatus,
  updateOwnAvatar,
} from '../services/user.service';

// ─── GET /api/status (PUBLIC — no auth) ──────────────────────────────────────

export async function publicStatus(_req: Request, res: Response): Promise<void> {
  try {
    const status = await getPublicStatus();
    res.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching status';
    res.status(500).json({ error: message });
  }
}

// ─── POST /api/users — SUPER_ADMIN only ───────────────────────────────────────

export async function create(req: Request, res: Response): Promise<void> {
  const { email, name, role, districtId, temporaryPassword, phone } = req.body;

  if (!email || !name || !role || !temporaryPassword) {
    res.status(400).json({
      error: 'email, name, role, and temporaryPassword are all required',
    });
    return;
  }

  const validRoles = Object.values(Role);
  if (!validRoles.includes(role)) {
    res.status(400).json({
      error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    });
    return;
  }

  if (temporaryPassword.length < 8) {
    res.status(400).json({ error: 'temporaryPassword must be at least 8 characters' });
    return;
  }

  try {
    const user = await createUser({
      email,
      name,
      role: role as Role,
      districtId,
      temporaryPassword,
      phone,   // passed through — required when role is VOLUNTEER
    });
    res.status(201).json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creating user';
    res.status(400).json({ error: message });
  }
}

// ─── GET /api/users — SUPER_ADMIN only ───────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  const { role, districtId, active } = req.query;

  const validRoles = Object.values(Role);
  if (role && !validRoles.includes(role as Role)) {
    res.status(400).json({ error: `Invalid role filter` });
    return;
  }

  try {
    const users = await listUsers({
      role: role as Role | undefined,
      districtId: districtId as string | undefined,
      active: active !== undefined ? active === 'true' : undefined,
    });
    res.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching users';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/users/:id — SUPER_ADMIN only ────────────────────────────────────

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'User not found';
    res.status(404).json({ error: message });
  }
}

// ─── PATCH /api/users/:id — SUPER_ADMIN only ─────────────────────────────────

export async function update(req: Request, res: Response): Promise<void> {
  const { name, email, role, districtId, active } = req.body;

  if (role) {
    const validRoles = Object.values(Role);
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role` });
      return;
    }
  }

  try {
    const user = await updateUser(req.params.id, req.user!.userId, {
      name,
      email,
      role: role as Role | undefined,
      districtId,
      active,
    });
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error updating user';
    res.status(400).json({ error: message });
  }
}

// ─── PATCH /api/users/me/password — any authenticated user ───────────────────

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }

  try {
    const result = await changeOwnPassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error changing password';
    res.status(400).json({ error: message });
  }
}

// ─── POST /api/users/:id/reset-password — SUPER_ADMIN only ───────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { temporaryPassword } = req.body;

  if (!temporaryPassword) {
    res.status(400).json({ error: 'temporaryPassword is required' });
    return;
  }

  try {
    const result = await resetUserPassword(req.params.id, temporaryPassword);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error resetting password';
    res.status(400).json({ error: message });
  }
}

// ─── PATCH /api/users/me/avatar ───────────────────────────────────────────────

export async function updateAvatar(req: Request, res: Response): Promise<void> {
  const { avatarBase64 } = req.body;

  if (!avatarBase64) {
    res.status(400).json({ error: 'avatarBase64 is required' });
    return;
  }

  try {
    const result = await updateOwnAvatar(req.user!.userId, avatarBase64);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update avatar';
    res.status(400).json({ error: message });
  }
}