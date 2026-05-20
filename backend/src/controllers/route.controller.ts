import { Request, Response } from 'express';
import {
  recommendMode,
  recommendByDistrict,
  updateRouteDepth,
  getRouteLogs,
  getDistrictRoutes,
} from '../services/route.service';

// ─── GET /api/route/recommend ─────────────────────────────────────────────────
// With districtId: returns per-zone breakdown for that district.
// With waterDepthCm only: stateless single-depth lookup (kept for Swagger testing).

export async function recommend(req: Request, res: Response): Promise<void> {
  const { districtId, waterDepthCm: depthRaw } = req.query;

  // per-zone mode — primary use case for V2 Routing Map
  if (districtId) {
    try {
      const result = await recommendByDistrict(districtId as string);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching route recommendation';
      res.status(400).json({ error: message });
    }
    return;
  }

  // single-depth fallback — kept for Swagger manual testing
  if (depthRaw === undefined) {
    res.status(400).json({
      error: 'Provide districtId for per-zone recommendation, or waterDepthCm for a single-depth lookup',
    });
    return;
  }

  const depth = Number(depthRaw);
  if (isNaN(depth) || depth < 0) {
    res.status(400).json({ error: 'waterDepthCm must be a non-negative number' });
    return;
  }
  
  res.json(recommendMode(depth));
}

// ─── POST /api/route/update ───────────────────────────────────────────────────

export async function update(req: Request, res: Response): Promise<void> {
  const { districtId, zone, waterDepthCm } = req.body;

  if (!districtId || !zone || waterDepthCm === undefined) {
    res.status(400).json({
      error: 'districtId, zone, and waterDepthCm are required',
    });
    return;
  }

  const depth = Number(waterDepthCm);
  if (isNaN(depth) || depth < 0) {
    res.status(400).json({ error: 'waterDepthCm must be a non-negative number' });
    return;
  }

  try {
    const result = await updateRouteDepth({
      districtId,
      zone,
      waterDepthCm: depth,
      reportedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error updating route';
    res.status(400).json({ error: message });
  }
}

// ─── GET /api/route/logs ──────────────────────────────────────────────────────

export async function logs(req: Request, res: Response): Promise<void> {
  const { districtId } = req.query;

  try {
    const result = await getRouteLogs({
      districtId: districtId as string | undefined,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching route logs';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/route/district/:districtId ──────────────────────────────────────
// Returns all current active routes for a district (used by Hub Manager portal)

export async function districtRoutes(req: Request, res: Response): Promise<void> {
  try {
    const routes = await getDistrictRoutes(req.params.districtId);
    res.json(routes);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching routes';
    res.status(500).json({ error: message });
  }
}