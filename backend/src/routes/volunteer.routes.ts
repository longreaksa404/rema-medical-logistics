import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireDistrictAccess, district } from '../middleware/district-access';
import {
  list, createCommunity, update, updateRole,
  assign, assignTeamHandler, roster, deleteTeam,
} from '../controllers/volunteer.controller';

const router = Router();

router.get('/', requireAuth, list);
router.post('/', requireAuth, requireRole('HUB_MANAGER'),
  requireDistrictAccess(district.fromBody('districtId')), createCommunity);
router.post('/assign', requireAuth, requireRole('HUB_MANAGER'),
  requireDistrictAccess(district.ofSubWarehouse('subWarehouseId'), district.ofVolunteersInBody('volunteerId')), assign);
router.post('/assign-team', requireAuth, requireRole('HUB_MANAGER'),
  requireDistrictAccess(district.ofSubWarehouse('subWarehouseId'), district.ofVolunteersInBody('leaderId', 'memberIds')),
  assignTeamHandler);
router.delete('/team', requireAuth, requireRole('HUB_MANAGER'),
  requireDistrictAccess(district.fromBody('districtId')), deleteTeam);
router.get('/:districtId/roster', requireAuth, roster);
router.patch('/:id/role', requireAuth, requireRole('HUB_MANAGER'),
  requireDistrictAccess(district.ofVolunteerParam('id')), updateRole);
router.patch('/:id', requireAuth, requireRole('HUB_MANAGER'),
  requireDistrictAccess(district.ofVolunteerParam('id')), update);

export default router;