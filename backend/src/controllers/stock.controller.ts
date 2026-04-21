import { Request, Response } from 'express';
import { EmkType } from '@prisma/client';
import {
  getAllStock,
  getStockByDistrict,
  dispatchStock,
  reallocateStock,
  adjustStock,
  getAllMovements,
  getMovementsByDistrict,
} from '../services/stock.service';

// ─── GET /api/stock/status ────────────────────────────────────────────────────

export async function getStatus(_req: Request, res: Response): Promise<void> {
  try {
    const stock = await getAllStock();
    res.json(stock);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching stock';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/stock/:districtId ───────────────────────────────────────────────

export async function getByDistrict(req: Request, res: Response): Promise<void> {
  try {
    const stock = await getStockByDistrict(req.params.districtId);
    res.json(stock);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Not found';
    res.status(404).json({ error: message });
  }
}

// ─── POST /api/stock/dispatch ─────────────────────────────────────────────────

export async function dispatch(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, emkType, quantity, reason } = req.body;

  if (!subWarehouseId || !emkType || quantity === undefined) {
    res.status(400).json({ error: 'subWarehouseId, emkType, and quantity are required' });
    return;
  }

  const validEmkTypes: EmkType[] = ['EMK1', 'EMK2', 'EMK3'];
  if (!validEmkTypes.includes(emkType)) {
    res.status(400).json({ error: 'emkType must be EMK1, EMK2, or EMK3' });
    return;
  }

  if (emkType === 'EMK3') {
    // EMK-3 dispatch is recorded as MOH_TRANSFER — only from MoH cold storage
    // Hub Managers cannot dispatch EMK-3 themselves; this endpoint handles the
    // MoH transfer event (performed by Emergency Coordinator or above)
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
    res.status(400).json({ error: message });
  }
}

// ─── POST /api/stock/reallocate ───────────────────────────────────────────────
// Emergency Coordinator only (enforced by route middleware)

export async function reallocate(req: Request, res: Response): Promise<void> {
  const { fromSubWarehouseId, toSubWarehouseId, emkType, quantity, reason } = req.body;

  if (!fromSubWarehouseId || !toSubWarehouseId || !emkType || quantity === undefined) {
    res.status(400).json({
      error: 'fromSubWarehouseId, toSubWarehouseId, emkType, and quantity are required',
    });
    return;
  }

  try {
    const result = await reallocateStock({
      fromSubWarehouseId,
      toSubWarehouseId,
      emkType: emkType as EmkType,
      quantity: Number(quantity),
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reallocation failed';
    res.status(400).json({ error: message });
  }
}

// ─── POST /api/stock/adjust ───────────────────────────────────────────────────

export async function adjust(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, emkType, quantity, reason } = req.body;

  if (!subWarehouseId || !emkType || quantity === undefined || !reason) {
    res.status(400).json({
      error: 'subWarehouseId, emkType, quantity, and reason are required',
    });
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
    res.status(400).json({ error: message });
  }
}

// ─── GET /api/stock/movements ─────────────────────────────────────────────────

export async function getMovements(_req: Request, res: Response): Promise<void> {
  try {
    const movements = await getAllMovements();
    res.json(movements);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching movements';
    res.status(500).json({ error: message });
  }
}

// ─── GET /api/stock/movements/:districtId ────────────────────────────────────

export async function getMovementsByDistrictHandler(req: Request, res: Response): Promise<void> {
  try {
    const movements = await getMovementsByDistrict(req.params.districtId);
    res.json(movements);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Not found';
    res.status(404).json({ error: message });
  }
}