import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { list, create, update, assign, roster } from '../controllers/volunteer.controller';

const router = Router();

// ─── IMPORTANT: Fixed paths BEFORE /:id ───────────────────────────────────────
// /assign must come before /:id — otherwise "assign" is treated as an ID.

// GET /api/volunteers — list all volunteers (filter by district/status)
router.get('/', requireAuth, list);

// POST /api/volunteers — add volunteer to roster (Hub Manager or above)
router.post('/', requireAuth, requireRole('HUB_MANAGER'), create);

// POST /api/volunteers/assign — assign volunteer to zone+team
router.post('/assign', requireAuth, requireRole('HUB_MANAGER'), assign);

// GET /api/volunteers/:districtId/roster — full roster for one district
// Note: this must come BEFORE /:id to avoid "roster" being treated as an ID
// Express will match /:districtId/roster before /:id for paths with two segments
router.get('/:districtId/roster', requireAuth, roster);

// PATCH /api/volunteers/:id — update info or status
router.patch('/:id', requireAuth, requireRole('HUB_MANAGER'), update);

export default router;