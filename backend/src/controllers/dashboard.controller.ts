import { Request, Response } from 'express';
import { getDashboardSummary, getDistrictDashboard } from '../services/dashboard.service';
import { sendError } from '../middleware/error-handler';

// ─── GET /api/dashboard/summary ───────────────────────────────────────────────

export async function summary(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getDashboardSummary();
    res.json(data);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/dashboard/district/:id ─────────────────────────────────────────

export async function districtDashboard(req: Request, res: Response): Promise<void> {
  try {
    const data = await getDistrictDashboard(req.params.id);
    res.json(data);
  } catch (err) {
    sendError(res, err, 404);
  }
}