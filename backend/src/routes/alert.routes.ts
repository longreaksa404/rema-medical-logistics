import { Router } from 'express';
import { trigger, status, phase } from '../controllers/alert.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = Router();

// Any authenticated user can submit a trigger condition
router.post('/trigger', requireAuth, trigger);

// Any authenticated user can check status
router.get('/status', requireAuth, status);

// Emergency Coordinator or above can advance phase
router.patch('/phase', requireAuth, requireRole('EMERGENCY_COORDINATOR'), phase);

export default router;