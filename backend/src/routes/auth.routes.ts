import { Router } from 'express';
import { login, logout, me, refresh } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login',   login);
router.post('/logout',  logout);
router.post('/refresh', refresh);
router.get('/me',       requireAuth, me);

export default router;