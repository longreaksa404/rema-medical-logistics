import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { summary, districtDashboard } from '../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard/summary — aggregated view: phase + stock + households + alerts
router.get('/summary', requireAuth, summary);

// GET /api/dashboard/district/:id — per-district summary card
router.get('/district/:id', requireAuth, districtDashboard);

export default router;