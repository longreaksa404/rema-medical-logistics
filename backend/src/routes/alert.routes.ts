import { Router } from 'express';
import { trigger, status, phase, reset } from '../controllers/alert.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';


const router = Router();

// Any authenticated user can submit a trigger condition
router.post('/trigger', requireAuth, trigger);

// Any authenticated user can check status
router.get('/status', requireAuth, status);

// Emergency Coordinator or above can advance phase
router.patch('/phase', requireAuth, requireRole('EMERGENCY_COORDINATOR'), phase);

router.post('/reset', requireAuth, requireRole('SUPER_ADMIN'), reset);

export default router;