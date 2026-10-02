import { Request, Response } from 'express';
import {
  startDeliveryRun,
  listDeliveryRuns,
  getDeliveryRun,
  createDeliveryReceipt,
  completeDeliveryRun,
  abortDeliveryRun,
} from '../services/delivery.service';
import { sendError } from '../middleware/error-handler';

// ─── POST /api/delivery/runs ──────────────────────────────────────────────────

export async function startRun(req: Request, res: Response): Promise<void> {
  // body validated by startRunBody (schemas/delivery.schemas.ts)
  const { subWarehouseId, teamNumber, zone, leadVolunteerId } = req.body;

  try {
    const run = await startDeliveryRun({
      subWarehouseId,
      teamNumber,
      zone,
      leadVolunteerId,
      performedById: req.user!.userId,
    });
    res.status(201).json(run);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── GET /api/delivery/runs ───────────────────────────────────────────────────

export async function listRuns(req: Request, res: Response): Promise<void> {
  const { districtId } = req.query;
  const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));

  try {
    const result = await listDeliveryRuns({
      districtId: districtId as string | undefined,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/delivery/runs/:id ───────────────────────────────────────────────

export async function getRun(req: Request, res: Response): Promise<void> {
  try {
    const run = await getDeliveryRun(req.params.id);
    res.json(run);
  } catch (err) {
    sendError(res, err, 404);
  }
}

// ─── POST /api/delivery/receipts ─────────────────────────────────────────────

export async function addReceipt(req: Request, res: Response): Promise<void> {
  // receiptBody normalises single-kit and multi-kit payloads to { kits }
  const { deliveryRunId, householdId, kits, deliveredAt, notes } = req.body;

  try {
    const receipts = await createDeliveryReceipt({
      deliveryRunId,
      householdId,
      kits,
      deliveredAt,
      notes,
      performedById: req.user!.userId,
    });
    res.status(201).json(receipts);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/delivery/runs/:id/complete ────────────────────────────────────

export async function completeRun(req: Request, res: Response): Promise<void> {
  try {
    const run = await completeDeliveryRun(req.params.id, req.user!.userId);
    res.json(run);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/delivery/runs/:id/abort ──────────────────────────────────────
// Section A.4: Volunteer safety — Hub Manager aborts when water > 80cm

export async function abortRun(req: Request, res: Response): Promise<void> {
  const { reason } = req.body;

  try {
    const run = await abortDeliveryRun(req.params.id, reason);
    res.json(run);
  } catch (err) {
    sendError(res, err, 400);
  }
}