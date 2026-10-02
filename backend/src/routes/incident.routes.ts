import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireDistrictAccess, district } from '../middleware/district-access';
import { report, list, resolve } from '../controllers/incident.controller';

const router = Router();

// POST /api/incidents — report an incident (VOLUNTEER+, own district)
router.post('/', requireAuth, requireRole('VOLUNTEER'),
  requireDistrictAccess(district.fromBody('districtId')), report);

// GET /api/incidents — list incidents with filters
router.get('/', requireAuth, list);

// PATCH /api/incidents/:id/resolve — mark resolved
// /:id/resolve must be registered before /:id (if we add GET /:id later)
router.patch('/:id/resolve', requireAuth, requireRole('HUB_MANAGER'),
  requireDistrictAccess(district.ofIncidentParam('id')), resolve);

export default router;