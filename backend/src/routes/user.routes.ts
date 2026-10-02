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
import { validate } from '../middleware/validate';
import {
  createUserBody, updateUserBody, updateProfileBody, changePasswordBody, resetPasswordBody, avatarBody,
} from '../schemas/user.schemas';

const router = Router();

router.get('/',  requireAuth, requireRole('SUPER_ADMIN'), list);
router.post('/', requireAuth, requireRole('SUPER_ADMIN'), validate({ body: createUserBody }), create);

// /me/* fixed paths must come before /:id
router.patch('/me/profile',  requireAuth, validate({ body: updateProfileBody }), updateProfile);
router.patch('/me/password', requireAuth, validate({ body: changePasswordBody }), changePassword);
router.patch('/me/avatar',   requireAuth, validate({ body: avatarBody }), updateAvatar);

router.get('/:id',                 requireAuth, requireRole('SUPER_ADMIN'), getOne);
router.patch('/:id',               requireAuth, requireRole('SUPER_ADMIN'), validate({ body: updateUserBody }), update);
router.post('/:id/reset-password', requireAuth, requireRole('SUPER_ADMIN'), validate({ body: resetPasswordBody }), resetPassword);

export default router;