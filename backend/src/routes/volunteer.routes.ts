import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  list, createCommunity, update, updateRole,
  assign, assignTeamHandler, roster,
} from '../controllers/volunteer.controller';

const router = Router();

router.get('/', requireAuth, list);

// POST /api/volunteers — community volunteer only
router.post('/', requireAuth, requireRole('HUB_MANAGER'), createCommunity);

// fixed paths before /:id
router.post('/assign', requireAuth, requireRole('HUB_MANAGER'), assign);
router.post('/assign-team', requireAuth, requireRole('HUB_MANAGER'), assignTeamHandler);
router.get('/:districtId/roster', requireAuth, roster);
router.patch('/:id/role', requireAuth, requireRole('HUB_MANAGER'), updateRole);
router.patch('/:id', requireAuth, requireRole('HUB_MANAGER'), update);

export default router;