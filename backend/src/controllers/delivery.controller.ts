import { Request, Response } from 'express';
import { DeliveryRunStatus, EmkType } from '@prisma/client';
import {
  startDeliveryRun,
  listDeliveryRuns,
  getDeliveryRun,
  createDeliveryReceipt,
  completeDeliveryRun,
  abortDeliveryRun,
} from '../services/delivery.service';

// ─── POST /api/delivery/runs ──────────────────────────────────────────────────

export async function startRun(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, teamNumber, zone, leadVolunteerId } = req.body;

  if (!subWarehouseId || !teamNumber || !zone || !leadVolunteerId) {
    res.status(400).json({
      error: 'subWarehouseId, teamNumber, zone, and leadVolunteerId are required',
    });
    return;
  }

  if (typeof teamNumber !== 'number' || teamNumber < 1 || teamNumber > 3) {
    res.status(400).json({ error: 'teamNumber must be 1, 2, or 3' });
    return;
  }

  try {
    const run = await startDeliveryRun({
      subWarehouseId,
      teamNumber: Number(teamNumber),
      zone,
      leadVolunteerId,
      performedById: req.user!.userId,
    });
    res.status(201).json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error starting run';
    res.status(400).json({ error: message });
  }
}

// ─── GET /api/delivery/runs ───────────────────────────────────────────────────

export async function listRuns(req: Request, res: Response): Promise<void> {
  const { districtId, status } = req.query;

  const validStatuses = ['IN_PROGRESS', 'COMPLETE', 'ABORTED'];
  if (status && !validStatuses.includes(status as string)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const runs = await listDeliveryRuns({
      districtId: districtId as string | undefined,
      status: status as DeliveryRunStatus | undefined,
    });
    res.json(runs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching runs';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/delivery/runs/:id ───────────────────────────────────────────────

export async function getRun(req: Request, res: Response): Promise<void> {
  try {
    const run = await getDeliveryRun(req.params.id);
    res.json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Not found';
    res.status(404).json({ error: message });
  }
}

// ─── POST /api/delivery/receipts ─────────────────────────────────────────────

export async function addReceipt(req: Request, res: Response): Promise<void> {
  const { deliveryRunId, householdId, emkType, quantity, deliveredAt, notes } = req.body;

  if (!deliveryRunId || !householdId || !emkType || !deliveredAt) {
    res.status(400).json({
      error: 'deliveryRunId, householdId, emkType, and deliveredAt are required',
    });
    return;
  }

  const validEmkTypes: EmkType[] = ['EMK1', 'EMK2', 'EMK3'];
  if (!validEmkTypes.includes(emkType)) {
    res.status(400).json({ error: 'emkType must be EMK1, EMK2, or EMK3' });
    return;
  }

  const qty = quantity ?? 1;
  if (typeof qty !== 'number' || qty < 1) {
    res.status(400).json({ error: 'quantity must be a positive integer' });
    return;
  }

  try {
    const receipt = await createDeliveryReceipt({
      deliveryRunId,
      householdId,
      emkType: emkType as EmkType,
      quantity: Number(qty),
      deliveredAt: new Date(deliveredAt),
      notes,
      performedById: req.user!.userId,
    });
    res.status(201).json(receipt);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error recording receipt';
    res.status(400).json({ error: message });
  }
}

// ─── PATCH /api/delivery/runs/:id/complete ────────────────────────────────────

export async function completeRun(req: Request, res: Response): Promise<void> {
  try {
    const run = await completeDeliveryRun(req.params.id, req.user!.userId);
    res.json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error completing run';
    res.status(400).json({ error: message });
  }
}

// ─── PATCH /api/delivery/runs/:id/abort ──────────────────────────────────────
// Section A.4: Volunteer safety — Hub Manager aborts when water > 80cm

export async function abortRun(req: Request, res: Response): Promise<void> {
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ error: 'reason is required when aborting a delivery run' });
    return;
  }

  try {
    const run = await abortDeliveryRun(req.params.id, reason);
    res.json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error aborting run';
    res.status(400).json({ error: message });
  }
}