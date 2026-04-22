import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { recommend, update, logs, districtRoutes } from '../controllers/route.controller';

const router = Router();

// GET /api/route/recommend?waterDepthCm=45 — stateless tier recommendation
router.get('/recommend', requireAuth, recommend);

// POST /api/route/update — update water depth for a zone (creates route_log)
router.post('/update', requireAuth, update);

// GET /api/route/logs — route status change history (filter by districtId)
router.get('/logs', requireAuth, logs);

// GET /api/route/district/:districtId — current active routes for a district
router.get('/district/:districtId', requireAuth, districtRoutes);

export default router;