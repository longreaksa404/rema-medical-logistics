import { Request, Response } from 'express';
import { IncidentType } from '@prisma/client';
import { reportIncident, listIncidents, resolveIncident } from '../services/incident.service';
import { sendError } from '../middleware/error-handler';

// ─── POST /api/incidents ──────────────────────────────────────────────────────

export async function report(req: Request, res: Response): Promise<void> {
  const { districtId, type, description, clientRef } = req.body;

  try {
    const incident = await reportIncident({
      districtId,
      type,
      description,
      reportedById: req.user!.userId,
      clientRef,
    });
    // 200 = an earlier attempt of this same (offline) report already created it
    res.status('replayed' in incident ? 200 : 201).json(incident);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── GET /api/incidents ───────────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  const { districtId, type } = req.query;
  const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));

  try {
    const result = await listIncidents({
      districtId: districtId as string | undefined,
      type:       type       as IncidentType | undefined,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── PATCH /api/incidents/:id/resolve ────────────────────────────────────────

export async function resolve(req: Request, res: Response): Promise<void> {
  try {
    const incident = await resolveIncident(req.params.id, req.user!.userId);
    res.json(incident);
  } catch (err) {
    sendError(res, err, 400);
  }
}