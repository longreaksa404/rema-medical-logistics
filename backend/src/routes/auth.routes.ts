import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public — no token needed
router.post('/login', login);
router.post('/logout', logout);

// Protected — token required
router.get('/me', requireAuth, me);

export default router;