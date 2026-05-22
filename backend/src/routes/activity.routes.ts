import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { myActivity } from '../controllers/activity.controller';

const router = Router();

router.get('/me', requireAuth, myActivity);

export default router;