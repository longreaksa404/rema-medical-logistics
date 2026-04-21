import { Request, Response } from 'express';
import { listDistricts, getDistrict, getDistrictSummary } from '../services/district.service';

// ─── GET /api/districts ───────────────────────────────────────────────────────

export async function list(_req: Request, res: Response): Promise<void> {
  try {
    const districts = await listDistricts();
    res.json(districts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching districts';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/districts/:id ───────────────────────────────────────────────────

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const district = await getDistrict(req.params.id);
    res.json(district);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'District not found';
    res.status(404).json({ error: message });
  }
}

// ─── GET /api/districts/:id/summary ──────────────────────────────────────────

export async function summary(req: Request, res: Response): Promise<void> {
  try {
    const data = await getDistrictSummary(req.params.id);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'District not found';
    res.status(404).json({ error: message });
  }
}