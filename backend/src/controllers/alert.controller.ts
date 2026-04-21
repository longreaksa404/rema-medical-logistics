import { Request, Response } from 'express';
import {
  submitTrigger,
  getAlertStatus,
  advancePhase,
  isValidCondition,
} from '../services/alert.service';

// ───   /api/alert/trigger ──────────────────────────────────────────────────

export async function trigger(req: Request, res: Response): Promise<void> {
  const { condition } = req.body;

  if (!condition || !isValidCondition(condition)) {
    res.status(400).json({
      error: `Invalid condition. Must be one of: warningLevelTwo, rainfallExceeds100mm, streetFloodingReport`,
    });
    return;
  }

  try {
    const alert = await submitTrigger(condition);
    res.json(alert);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/alert/status ────────────────────────────────────────────────────

export async function status(_req: Request, res: Response): Promise<void> {
  try {
    const alert = await getAlertStatus();
    res.json(alert);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

// ─── PATCH /api/alert/phase ───────────────────────────────────────────────────
// Emergency Coordinator only (enforced by route middleware)

export async function phase(req: Request, res: Response): Promise<void> {
  const { phase: targetPhase } = req.body;

  if (typeof targetPhase !== 'number' || ![1, 2].includes(targetPhase)) {
    res.status(400).json({ error: 'Phase must be 1 or 2' });
    return;
  }

  try {
    const alert = await advancePhase(targetPhase);
    res.json(alert);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
}