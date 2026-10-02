import { Request, Response } from 'express';
import {
  submitTrigger,
  getAlertStatus,
  advancePhase,
  resetSystem,
} from '../services/alert.service';
import { sendError } from '../middleware/error-handler';

// ───   /api/alert/trigger ──────────────────────────────────────────────────

export async function trigger(req: Request, res: Response): Promise<void> {
  const { condition } = req.body;   // validated by triggerBody

  try {
    const alert = await submitTrigger(condition, req.user!.userId);
    res.json(alert);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/alert/status ────────────────────────────────────────────────────

export async function status(_req: Request, res: Response): Promise<void> {
  try {
    const alert = await getAlertStatus();
    res.json(alert);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── PATCH /api/alert/phase ───────────────────────────────────────────────────
// Emergency Coordinator only (enforced by route middleware)

export async function phase(req: Request, res: Response): Promise<void> {
  const { phase: targetPhase } = req.body;   // validated by phaseBody (1 | 2)

  try {
    const alert = await advancePhase(targetPhase);
    res.json(alert);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── POST /api/alert/reset ────────────────────────────────────────────────────
// SUPER_ADMIN only (enforced by route middleware)
export async function reset(_req: Request, res: Response): Promise<void> {
  try {
    const alert = await resetSystem();
    res.json({ message: 'System reset to Phase 0', alert });
  } catch (err) {
    sendError(res, err, 500);
  }
}