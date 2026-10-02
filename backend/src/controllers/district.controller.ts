import { Request, Response } from 'express';
import { listDistricts, getDistrict, getDistrictSummary } from '../services/district.service';
import { sendError } from '../middleware/error-handler';

// ─── GET /api/districts ───────────────────────────────────────────────────────

export async function list(_req: Request, res: Response): Promise<void> {
  try {
    const districts = await listDistricts();
    res.json(districts);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/districts/:id ───────────────────────────────────────────────────

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const district = await getDistrict(req.params.id);
    res.json(district);
  } catch (err) {
    sendError(res, err, 404);
  }
}

// ─── GET /api/districts/:id/summary ──────────────────────────────────────────

export async function summary(req: Request, res: Response): Promise<void> {
  try {
    const data = await getDistrictSummary(req.params.id);
    res.json(data);
  } catch (err) {
    sendError(res, err, 404);
  }
}