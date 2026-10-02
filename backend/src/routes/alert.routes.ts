import { Router } from 'express';
import { trigger, status, phase, reset, history } from '../controllers/alert.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { triggerBody, phaseBody } from '../schemas/operations.schemas';


const router = Router();

// Confirming a trigger condition activates REMA — Emergency Coordinator or above
router.post('/trigger', requireAuth, requireRole('EMERGENCY_COORDINATOR'), validate({ body: triggerBody }), trigger);

// Any authenticated user can check status
router.get('/status', requireAuth, status);

// Emergency Coordinator or above can advance phase
router.patch('/phase', requireAuth, requireRole('EMERGENCY_COORDINATOR'), validate({ body: phaseBody }), phase);

// Closes + archives the current flood event and returns to Phase 0
router.post('/reset', requireAuth, requireRole('SUPER_ADMIN'), reset);

// Past and current flood events with after-action stats (read-only)
router.get('/history', requireAuth, history);

export default router;