import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireDistrictAccess, district } from '../middleware/district-access';
import {
  list, createCommunity, update, updateRole,
  assign, assignTeamHandler, roster, deleteTeam,
} from '../controllers/volunteer.controller';
import { validate } from '../middleware/validate';
import {
  createVolunteerBody, updateVolunteerBody, volunteerRoleBody, assignVolunteerBody, assignTeamBody, deleteTeamBody,
} from '../schemas/operations.schemas';

const router = Router();

router.get('/', requireAuth, list);
router.post('/', requireAuth, requireRole('HUB_MANAGER'), validate({ body: createVolunteerBody }),
  requireDistrictAccess(district.fromBody('districtId')), createCommunity);
router.post('/assign', requireAuth, requireRole('HUB_MANAGER'), validate({ body: assignVolunteerBody }),
  requireDistrictAccess(district.ofSubWarehouse('subWarehouseId'), district.ofVolunteersInBody('volunteerId')), assign);
router.post('/assign-team', requireAuth, requireRole('HUB_MANAGER'), validate({ body: assignTeamBody }),
  requireDistrictAccess(district.ofSubWarehouse('subWarehouseId'), district.ofVolunteersInBody('leaderId', 'memberIds')),
  assignTeamHandler);
router.delete('/team', requireAuth, requireRole('HUB_MANAGER'), validate({ body: deleteTeamBody }),
  requireDistrictAccess(district.fromBody('districtId')), deleteTeam);
router.get('/:districtId/roster', requireAuth, roster);
router.patch('/:id/role', requireAuth, requireRole('HUB_MANAGER'), validate({ body: volunteerRoleBody }),
  requireDistrictAccess(district.ofVolunteerParam('id')), updateRole);
router.patch('/:id', requireAuth, requireRole('HUB_MANAGER'), validate({ body: updateVolunteerBody }),
  requireDistrictAccess(district.ofVolunteerParam('id')), update);

export default router;