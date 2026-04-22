import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { report, list, resolve } from '../controllers/incident.controller';

const router = Router();

// POST /api/incidents — report an incident (any authenticated user)
router.post('/', requireAuth, report);

// GET /api/incidents — list incidents with filters
router.get('/', requireAuth, list);

// PATCH /api/incidents/:id/resolve — mark resolved
// /:id/resolve must be registered before /:id (if we add GET /:id later)
router.patch('/:id/resolve', requireAuth, resolve);

export default router;