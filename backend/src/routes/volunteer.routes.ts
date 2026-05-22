import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { list, createCommunity, update, updateRole, assign, roster } from '../controllers/volunteer.controller';

const router = Router();

// GET /api/volunteers
router.get('/', requireAuth, list);

// POST /api/volunteers — community volunteer only (no login account)
// VOLUNTEER users with login are created via POST /api/users
router.post('/', requireAuth, requireRole('HUB_MANAGER'), createCommunity);

// POST /api/volunteers/assign — must come before /:id routes
router.post('/assign', requireAuth, requireRole('HUB_MANAGER'), assign);

// GET /api/volunteers/:districtId/roster
router.get('/:districtId/roster', requireAuth, roster);

// PATCH /api/volunteers/:id/role — must come before /:id
router.patch('/:id/role', requireAuth, requireRole('HUB_MANAGER'), updateRole);

// PATCH /api/volunteers/:id — name, phone, status only
router.patch('/:id', requireAuth, requireRole('HUB_MANAGER'), update);

export default router;