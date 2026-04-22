import { Request, Response } from 'express';
import { RadioCheckTime, RadioStatus } from '@prisma/client';
import { submitCheckin, listCheckins, getTodayComplianceSummary } from '../services/radio.service';

// ─── POST /api/radio/checkin ──────────────────────────────────────────────────

export async function checkin(req: Request, res: Response): Promise<void> {
  const { districtId, scheduledTime, status, notes } = req.body;

  if (!districtId || !scheduledTime || !status) {
    res.status(400).json({ error: 'districtId, scheduledTime, and status are required' });
    return;
  }

  const validTimes: RadioCheckTime[] = ['T0800', 'T1200', 'T1600', 'T2000'];
  if (!validTimes.includes(scheduledTime)) {
    res.status(400).json({ error: `scheduledTime must be one of: ${validTimes.join(', ')}` });
    return;
  }

  const validStatuses: RadioStatus[] = ['OK', 'ISSUE_REPORTED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be OK or ISSUE_REPORTED` });
    return;
  }

  try {
    const result = await submitCheckin({
      districtId,
      submittedById: req.user!.userId,
      scheduledTime: scheduledTime as RadioCheckTime,
      status: status as RadioStatus,
      notes,
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error submitting check-in';
    res.status(400).json({ error: message });
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
    const message = err instanceof Error ? err.message : 'Error fetching check-ins';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/radio/compliance ────────────────────────────────────────────────
// Shows today's check-in compliance across all districts — useful for dashboard

export async function compliance(_req: Request, res: Response): Promise<void> {
  try {
    const summary = await getTodayComplianceSummary();
    res.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching compliance';
    res.status(500).json({ error: message });
  }
}