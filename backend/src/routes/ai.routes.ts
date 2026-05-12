import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { postAiBrief } from '../controllers/ai.controller';

const router = Router();

// POST /api/ai/brief
// Requires EMERGENCY_COORDINATOR or above (SUPER_ADMIN).
// HUB_MANAGER, VOLUNTEER, and VIEWER are explicitly excluded.
router.post('/brief', requireAuth, requireRole('EMERGENCY_COORDINATOR'), postAiBrief);

export default router;