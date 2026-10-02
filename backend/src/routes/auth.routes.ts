import { Router } from 'express';
import { login, logout, me, refresh } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { loginAccountLimiter, loginIpLimiter, refreshLimiter } from '../middleware/rate-limit';

const router = Router();

router.post('/login',   loginIpLimiter, loginAccountLimiter, login);
router.post('/logout',  logout);
router.post('/refresh', refreshLimiter, refresh);
router.get('/me',       requireAuth, me);

export default router;