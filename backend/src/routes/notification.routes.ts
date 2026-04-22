import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { list, markOneRead, markAllAsRead } from '../controllers/notification.controller';

const router = Router();

// ─── IMPORTANT: /read-all before /:id ─────────────────────────────────────────
// Otherwise "read-all" would be treated as a notification ID.

// GET /api/notifications — all notifications for current user
router.get('/', requireAuth, list);

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', requireAuth, markAllAsRead);

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', requireAuth, markOneRead);

export default router;