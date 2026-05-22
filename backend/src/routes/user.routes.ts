import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  create,
  list,
  getOne,
  update,
  updateProfile,
  changePassword,
  resetPassword,
  updateAvatar,
} from '../controllers/user.controller';

const router = Router();

router.get('/',  requireAuth, requireRole('SUPER_ADMIN'), list);
router.post('/', requireAuth, requireRole('SUPER_ADMIN'), create);

// /me/* fixed paths must come before /:id
router.patch('/me/profile',  requireAuth, updateProfile);
router.patch('/me/password', requireAuth, changePassword);
router.patch('/me/avatar',   requireAuth, updateAvatar);

router.get('/:id',                 requireAuth, requireRole('SUPER_ADMIN'), getOne);
router.patch('/:id',               requireAuth, requireRole('SUPER_ADMIN'), update);
router.post('/:id/reset-password', requireAuth, requireRole('SUPER_ADMIN'), resetPassword);

export default router;