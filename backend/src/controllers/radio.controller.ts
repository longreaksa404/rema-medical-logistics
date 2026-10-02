import { Request, Response } from 'express';
import { submitCheckin, listCheckins, getTodayComplianceSummary } from '../services/radio.service';
import { sendError } from '../middleware/error-handler';

// ─── POST /api/radio/checkin ──────────────────────────────────────────────────

export async function checkin(req: Request, res: Response): Promise<void> {
  const { districtId, scheduledTime, status, notes } = req.body;

  try {
    const result = await submitCheckin({
      districtId,
      submittedById: req.user!.userId,
      scheduledTime,
      status,
      notes,
    });
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── GET /api/radio/checkins ──────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  const { districtId, date } = req.query;

  try {
    const checkins = await listCheckins({
      districtId: districtId as string | undefined,
      date: date as string | undefined,
    });
    res.json(checkins);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/radio/compliance ────────────────────────────────────────────────
// Shows today's check-in compliance across all districts — useful for dashboard

export async function compliance(_req: Request, res: Response): Promise<void> {
  try {
    const summary = await getTodayComplianceSummary();
    res.json(summary);
  } catch (err) {
    sendError(res, err, 500);
  }
}