import { Request, Response } from 'express';
import {
  submitTrigger,
  getAlertStatus,
  advancePhase,
  resetSystem,
} from '../services/alert.service';
import { getEventHistory } from '../services/event-history.service';
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
export async function reset(req: Request, res: Response): Promise<void> {
  try {
    const result = await resetSystem(req.user!.userId);
    res.json({
      message: result.archivedEventId
        ? 'Flood event closed and archived. System reset to Phase 0.'
        : 'System is already on standby (Phase 0).',
      ...result,
    });
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── GET /api/alert/history ───────────────────────────────────────────────────

export async function history(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await getEventHistory());
  } catch (err) {
    sendError(res, err, 500);
  }
}
