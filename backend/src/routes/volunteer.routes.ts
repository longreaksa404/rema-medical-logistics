import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  list, createCommunity, update, updateRole,
  assign, assignTeamHandler, roster, deleteTeam,
} from '../controllers/volunteer.controller';

const router = Router();

router.get('/', requireAuth, list);
router.post('/', requireAuth, requireRole('HUB_MANAGER'), createCommunity);
router.post('/assign', requireAuth, requireRole('HUB_MANAGER'), assign);
router.post('/assign-team', requireAuth, requireRole('HUB_MANAGER'), assignTeamHandler);
router.delete('/team', requireAuth, requireRole('HUB_MANAGER'), deleteTeam);  // add this
router.get('/:districtId/roster', requireAuth, roster);
router.patch('/:id/role', requireAuth, requireRole('HUB_MANAGER'), updateRole);
router.patch('/:id', requireAuth, requireRole('HUB_MANAGER'), update);

export default router;