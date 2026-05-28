import { Request, Response } from 'express';
import { IncidentType, IncidentStatus } from '@prisma/client';
import { reportIncident, listIncidents, resolveIncident } from '../services/incident.service';

// ─── POST /api/incidents ──────────────────────────────────────────────────────

export async function report(req: Request, res: Response): Promise<void> {
  const { districtId, type, description } = req.body;

  if (!districtId || !type || !description) {
    res.status(400).json({ error: 'districtId, type, and description are required' });
    return;
  }

  const validTypes: IncidentType[] = [
    'ROUTE_BLOCKED', 'VOLUNTEER_SAFETY', 'STOCK_SCARCITY', 'BUILDING_FLOODED', 'OTHER',
  ];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    const incident = await reportIncident({
      districtId,
      type: type as IncidentType,
      description,
      reportedById: req.user!.userId,
    });
    res.status(201).json(incident);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error reporting incident';
    res.status(400).json({ error: message });
  }
}

// ─── GET /api/incidents ───────────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  const { districtId, type } = req.query;
  const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  try {
    const result = await listIncidents({
      districtId: districtId as string | undefined,
      type:       type       as IncidentType | undefined,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching incidents';
    res.status(500).json({ error: message });
  }
}

// ─── PATCH /api/incidents/:id/resolve ────────────────────────────────────────

export async function resolve(req: Request, res: Response): Promise<void> {
  try {
    const incident = await resolveIncident(req.params.id, req.user!.userId);
    res.json(incident);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error resolving incident';
    res.status(400).json({ error: message });
  }
}