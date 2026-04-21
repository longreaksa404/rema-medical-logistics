import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { list, getOne, summary } from '../controllers/district.controller';

const router = Router();

// GET /api/districts
router.get('/', requireAuth, list);

// GET /api/districts/:id/summary — MUST come before /:id to avoid route conflict
router.get('/:id/summary', requireAuth, summary);

// GET /api/districts/:id
router.get('/:id', requireAuth, getOne);

export default router;