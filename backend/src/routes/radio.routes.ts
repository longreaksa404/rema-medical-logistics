import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireDistrictAccess, district } from '../middleware/district-access';
import { checkin, list, compliance } from '../controllers/radio.controller';

const router = Router();

// POST /api/radio/checkin — submit a scheduled check-in
router.post('/checkin', requireAuth, requireRole('VOLUNTEER'),
  requireDistrictAccess(district.fromBody('districtId')), checkin);

// GET /api/radio/checkins — list check-ins (filter by district + date)
router.get('/checkins', requireAuth, list);

// GET /api/radio/compliance — today's check-in compliance summary
router.get('/compliance', requireAuth, compliance);

export default router;