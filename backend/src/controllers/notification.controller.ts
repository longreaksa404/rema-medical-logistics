import { Request, Response } from 'express';
import {
  getUserNotifications,
  markRead,
  markAllRead,
} from '../services/notification.service';

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const notifications = await getUserNotifications(req.user!.userId);
    res.json(notifications);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching notifications';
    res.status(500).json({ error: message });
  }
}

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

export async function markOneRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await markRead(req.params.id, req.user!.userId);
    res.json(notification);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error updating notification';
    res.status(400).json({ error: message });
  }
}

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const result = await markAllRead(req.user!.userId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error updating notifications';
    res.status(500).json({ error: message });
  }
}