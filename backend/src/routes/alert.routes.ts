import { Router } from 'express';
import { trigger, status, phase, reset } from '../controllers/alert.controller';
import { requireAuth, requireRole } from '../middleware/auth';


const router = Router();

// Confirming a trigger condition activates REMA — Emergency Coordinator or above
router.post('/trigger', requireAuth, requireRole('EMERGENCY_COORDINATOR'), trigger);

// Any authenticated user can check status
router.get('/status', requireAuth, status);

// Emergency Coordinator or above can advance phase
router.patch('/phase', requireAuth, requireRole('EMERGENCY_COORDINATOR'), phase);

router.post('/reset', requireAuth, requireRole('SUPER_ADMIN'), reset);

export default router;