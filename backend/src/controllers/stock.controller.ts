import { Request, Response } from 'express';
import { EmkType } from '@prisma/client';
import {
  getCentralStock,
  getCentralMovements,
  getAllStock,
  getStockByDistrict,
  dispatchStock,
  reallocateStock,
  adjustStock,
  replenishCentral   as replenishCentralStock,
  adjustCentral      as adjustCentralStock,
  setAllocation      as setAllocationStock,
  getAllMovements,
  getMovementsByDistrict,
} from '../services/stock.service';

const VALID_EMK: EmkType[] = ['EMK1', 'EMK2', 'EMK3'];

// ─── GET /api/stock/central ───────────────────────────────────────────────────

export async function getCentral(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await getCentralStock());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error fetching central stock' });
  }
}

// ─── GET /api/stock/central/movements ────────────────────────────────────────

export async function getCentralMovementsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await getCentralMovements());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error fetching central movements' });
  }
}

// ─── GET /api/stock/status ────────────────────────────────────────────────────

export async function getStatus(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await getAllStock());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error fetching stock' });
  }
}

// ─── GET /api/stock/:districtId ───────────────────────────────────────────────

export async function getByDistrict(req: Request, res: Response): Promise<void> {
  try {
    res.json(await getStockByDistrict(req.params.districtId));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
  }
}

// ─── POST /api/stock/dispatch ─────────────────────────────────────────────────

export async function dispatch(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, emkType, quantity, reason } = req.body;

  if (!subWarehouseId || !emkType || quantity === undefined) {
    res.status(400).json({ error: 'subWarehouseId, emkType, and quantity are required' });
    return;
  }
  if (!VALID_EMK.includes(emkType)) {
    res.status(400).json({ error: 'emkType must be EMK1, EMK2, or EMK3' });
    return;
  }

  try {
    const result = await dispatchStock({
      subWarehouseId,
      emkType: emkType as EmkType,
      quantity: Number(quantity),
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dispatch failed';
    res.status(message.includes('Insufficient') ? 422 : 400).json({ error: message });
  }
}

// ─── POST /api/stock/reallocate ───────────────────────────────────────────────

export async function reallocate(req: Request, res: Response): Promise<void> {
  const { fromSubWarehouseId, toSubWarehouseId, emkType, quantity, reason } = req.body;

  if (!fromSubWarehouseId || !toSubWarehouseId || !emkType || quantity === undefined) {
    res.status(400).json({ error: 'fromSubWarehouseId, toSubWarehouseId, emkType, and quantity are required' });
    return;
  }

  try {
    const result = await reallocateStock({
      fromSubWarehouseId, toSubWarehouseId,
      emkType: emkType as EmkType,
      quantity: Number(quantity),
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reallocation failed';
    res.status(message.includes('Insufficient') ? 422 : 400).json({ error: message });
  }
}

// ─── POST /api/stock/adjust ───────────────────────────────────────────────────

export async function adjust(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, emkType, quantity, reason } = req.body;

  if (!subWarehouseId || !emkType || quantity === undefined || !reason) {
    res.status(400).json({ error: 'subWarehouseId, emkType, quantity, and reason are required' });
    return;
  }

  try {
    const result = await adjustStock({
      subWarehouseId,
      emkType: emkType as EmkType,
      quantity: Number(quantity),
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Adjustment failed';
    res.status(message.includes('negative') ? 422 : 400).json({ error: message });
  }
}

// ─── GET /api/stock/movements ─────────────────────────────────────────────────

export async function getMovements(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await getAllMovements());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error fetching movements' });
  }
}

// ─── GET /api/stock/movements/:districtId ────────────────────────────────────

export async function getMovementsByDistrictHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await getMovementsByDistrict(req.params.districtId));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
  }
}

// ─── POST /api/stock/central/replenish ───────────────────────────────────────

export async function replenishCentral(req: Request, res: Response): Promise<void> {
  const { emkType, quantity, reason } = req.body;

  if (!emkType || quantity === undefined || !reason) {
    res.status(400).json({ error: 'emkType, quantity, and reason are required' });
    return;
  }
  if (!VALID_EMK.includes(emkType)) {
    res.status(400).json({ error: 'emkType must be EMK1, EMK2, or EMK3' });
    return;
  }

  try {
    const result = await replenishCentralStock({
      emkType: emkType as EmkType,
      quantity: Number(quantity),
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Replenishment failed' });
  }
}

// ─── PATCH /api/stock/central ────────────────────────────────────────────────

export async function adjustCentral(req: Request, res: Response): Promise<void> {
  const { emkType, quantity, reason } = req.body;

  if (!emkType || quantity === undefined || !reason) {
    res.status(400).json({ error: 'emkType, quantity, and reason are required' });
    return;
  }

  try {
    const result = await adjustCentralStock({
      emkType: emkType as EmkType,
      quantity: Number(quantity),
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Adjustment failed';
    res.status(message.includes('negative') ? 422 : 400).json({ error: message });
  }
}

// ─── PATCH /api/stock/allocation ─────────────────────────────────────────────

export async function setAllocation(req: Request, res: Response): Promise<void> {
  const { target, subWarehouseId, emkType, newTotal, reason } = req.body;

  if (!target || !emkType || newTotal === undefined || !reason) {
    res.status(400).json({ error: 'target, emkType, newTotal, and reason are required' });
    return;
  }
  if (!['central', 'subWarehouse'].includes(target)) {
    res.status(400).json({ error: 'target must be "central" or "subWarehouse"' });
    return;
  }
  if (target === 'subWarehouse' && !subWarehouseId) {
    res.status(400).json({ error: 'subWarehouseId is required when target is "subWarehouse"' });
    return;
  }
  if (!VALID_EMK.includes(emkType)) {
    res.status(400).json({ error: 'emkType must be EMK1, EMK2, or EMK3' });
    return;
  }

  try {
    const result = await setAllocationStock({
      target, subWarehouseId,
      emkType: emkType as EmkType,
      newTotal: Number(newTotal),
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to set allocation' });
  }
}
