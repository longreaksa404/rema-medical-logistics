import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  create,
  list,
  getOne,
  update,
  changePassword,
  resetPassword,
} from '../controllers/user.controller';

const router = Router();

// ─── IMPORTANT: Fixed paths BEFORE /:id ───────────────────────────────────────
// /me/password and /:id/reset-password must be ordered correctly.

// GET /api/users — list all users (SUPER_ADMIN only)
router.get('/', requireAuth, requireRole('SUPER_ADMIN'), list);

// POST /api/users — create a new user (SUPER_ADMIN only)
router.post('/', requireAuth, requireRole('SUPER_ADMIN'), create);

// PATCH /api/users/me/password — change own password (any authenticated user)
// Must come BEFORE /:id to avoid "me" being treated as a user ID
router.patch('/me/password', requireAuth, changePassword);

// GET /api/users/:id — get single user (SUPER_ADMIN only)
router.get('/:id', requireAuth, requireRole('SUPER_ADMIN'), getOne);

// PATCH /api/users/:id — update user info, role, or active status (SUPER_ADMIN only)
router.patch('/:id', requireAuth, requireRole('SUPER_ADMIN'), update);

// POST /api/users/:id/reset-password — admin password reset (SUPER_ADMIN only)
router.post('/:id/reset-password', requireAuth, requireRole('SUPER_ADMIN'), resetPassword);

export default router;