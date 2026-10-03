import { Request, Response } from 'express';
import {
  computeScore,
  createHousehold,
  listHouseholds,
  getHousehold,
  updateHousehold,
  getPriorityQueue,
} from '../services/household.service';
import { ScoreInput } from '../utils/scoring';
import { sendError } from '../middleware/error-handler';

// ─── POST /api/score/household ────────────────────────────────────────────────

export async function scoreOnly(req: Request, res: Response): Promise<void> {
  const { cat1, cat2, cat3, cat4, cat5, householdSize, hasVulnerableMember } = req.body;

  try {
    const result = computeScore({
      cat1, cat2, cat3, cat4, cat5,
      householdSize,
      hasVulnerableMember,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── POST /api/households ─────────────────────────────────────────────────────

export async function create(req: Request, res: Response): Promise<void> {
  const {
    address, districtId,
    cat1, cat2, cat3, cat4, cat5,
    householdSize, hasVulnerableMember, chronicIllCount,
    notes, clientRef,
  } = req.body;

  try {
    const scoreInput: ScoreInput = {
      cat1, cat2, cat3, cat4, cat5,
      householdSize,
      hasVulnerableMember,
    };
    const household = await createHousehold({
      address,
      districtId,
      scoreInput,
      chronicIllCount,
      notes,
      assessedById: req.user?.userId,
      clientRef,
    });
    // 200 = an earlier attempt of this same (offline) assessment already created it
    res.status('replayed' in household ? 200 : 201).json(household);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── GET /api/households ──────────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  const { districtId, band, delivered } = req.query;
  const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));

  try {
    const result = await listHouseholds(
      {
        districtId: districtId as string | undefined,
        band:       band       as string | undefined,
        delivered:  delivered !== undefined ? delivered === 'true' : undefined,
      },
      page,
      pageSize
    );
    res.json(result);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/households/priority-queue ───────────────────────────────────────

export async function priorityQueue(req: Request, res: Response): Promise<void> {
  const { districtId } = req.query;

  if (!districtId) {
    res.status(400).json({ error: 'districtId query parameter is required' });
    return;
  }

  const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));

  try {
    const result = await getPriorityQueue(districtId as string, page, pageSize);
    res.json(result);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/households/:id ──────────────────────────────────────────────────

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const household = await getHousehold(req.params.id);
    res.json(household);
  } catch (err) {
    sendError(res, err, 404);
  }
}

// ─── PATCH /api/households/:id ────────────────────────────────────────────────

export async function update(req: Request, res: Response): Promise<void> {
  const {
    cat1, cat2, cat3, cat4, cat5,
    householdSize, hasVulnerableMember,
    notes,
  } = req.body;

  try {
    const scoreInput: Partial<ScoreInput> = {};
    if (cat1 !== undefined)                scoreInput.cat1 = cat1;
    if (cat2 !== undefined)                scoreInput.cat2 = cat2;
    if (cat3 !== undefined)                scoreInput.cat3 = cat3;
    if (cat4 !== undefined)                scoreInput.cat4 = cat4;
    if (cat5 !== undefined)                scoreInput.cat5 = cat5;
    if (householdSize !== undefined)       scoreInput.householdSize = householdSize;
    if (hasVulnerableMember !== undefined) scoreInput.hasVulnerableMember = hasVulnerableMember;

    const household = await updateHousehold(req.params.id, {
      scoreInput: Object.keys(scoreInput).length > 0 ? scoreInput : undefined,
      notes,
      assessedById: req.user?.userId,
    });
    res.json(household);
  } catch (err) {
    sendError(res, err, 400);
  }
}