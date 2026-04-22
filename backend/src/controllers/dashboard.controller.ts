import { Request, Response } from 'express';
import { getDashboardSummary, getDistrictDashboard } from '../services/dashboard.service';

// ─── GET /api/dashboard/summary ───────────────────────────────────────────────

export async function summary(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getDashboardSummary();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching dashboard summary';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/dashboard/district/:id ─────────────────────────────────────────

export async function districtDashboard(req: Request, res: Response): Promise<void> {
  try {
    const data = await getDistrictDashboard(req.params.id);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'District not found';
    res.status(404).json({ error: message });
  }
}