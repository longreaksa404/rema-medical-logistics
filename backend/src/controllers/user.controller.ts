import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { revokeAllRefreshTokens, issueRefreshToken } from '../services/auth.service';
import { setRefreshCookie } from '../lib/session-cookie';
import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  updateOwnProfile,
  changeOwnPassword,
  resetUserPassword,
  getPublicStatus,
  updateOwnAvatar,
} from '../services/user.service';
import { sendError } from '../middleware/error-handler';

// ─── GET /api/status (PUBLIC) ─────────────────────────────────────────────────

export async function publicStatus(_req: Request, res: Response): Promise<void> {
  try {
    const status = await getPublicStatus();
    res.json(status);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export async function create(req: Request, res: Response): Promise<void> {
  const { email, name, role, districtId, temporaryPassword, phone } = req.body;

  try {
    const user = await createUser({ email, name, role, districtId, temporaryPassword, phone });
    res.status(201).json(user);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── GET /api/users ───────────────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  const { role, districtId, active } = req.query;

  const validRoles = Object.values(Role);
  if (role && !validRoles.includes(role as Role)) {
    res.status(400).json({ error: 'Invalid role filter' });
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
    sendError(res, err, 500);
  }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (err) {
    sendError(res, err, 404);
  }
}

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────

export async function update(req: Request, res: Response): Promise<void> {
  const { name, email, role, districtId, phone, active } = req.body;

  try {
    const user = await updateUser(req.params.id, req.user!.userId, {
      name, email, role: role as Role | undefined, districtId, phone, active,
    });
    // deactivated users lose every session immediately
    if (active === false) await revokeAllRefreshTokens(user.id);
    res.json(user);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/users/me/profile — any authenticated user ────────────────────

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { name, phone } = req.body;

  try {
    const user = await updateOwnProfile(req.user!.userId, { name, phone });
    res.json(user);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/users/me/password ────────────────────────────────────────────

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;

  try {
    const result = await changeOwnPassword(req.user!.userId, currentPassword, newPassword);
    // sign out every other session, keep this one alive with a fresh cookie
    await revokeAllRefreshTokens(req.user!.userId);
    const session = await issueRefreshToken(req.user!.userId);
    setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── POST /api/users/:id/reset-password ──────────────────────────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { temporaryPassword } = req.body;

  try {
    const result = await resetUserPassword(req.params.id, temporaryPassword);
    await revokeAllRefreshTokens(req.params.id);
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/users/me/avatar ───────────────────────────────────────────────

export async function updateAvatar(req: Request, res: Response): Promise<void> {
  const { avatarBase64 } = req.body;

  try {
    const result = await updateOwnAvatar(req.user!.userId, avatarBase64);
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}