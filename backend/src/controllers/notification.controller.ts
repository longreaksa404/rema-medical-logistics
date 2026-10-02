import { Request, Response } from 'express';
import {
  getUserNotifications,
  markRead,
  markAllRead,
} from '../services/notification.service';
import { sendError } from '../middleware/error-handler';

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const notifications = await getUserNotifications(req.user!.userId);
    res.json(notifications);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

export async function markOneRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await markRead(req.params.id, req.user!.userId);
    res.json(notification);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const result = await markAllRead(req.user!.userId);
    res.json(result);
  } catch (err) {
    sendError(res, err, 500);
  }
}