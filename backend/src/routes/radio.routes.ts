import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkin, list, compliance } from '../controllers/radio.controller';

const router = Router();

// POST /api/radio/checkin — submit a scheduled check-in
router.post('/checkin', requireAuth, checkin);

// GET /api/radio/checkins — list check-ins (filter by district + date)
router.get('/checkins', requireAuth, list);

// GET /api/radio/compliance — today's check-in compliance summary
router.get('/compliance', requireAuth, compliance);

export default router;