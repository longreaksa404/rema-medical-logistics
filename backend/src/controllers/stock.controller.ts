import { Request, Response } from 'express';
import { EmkType } from '@prisma/client';
import {
  getAllStock,
  getStockByDistrict,
  getCentralStock,
  dispatchStock,
  reallocateStock,
  adjustStock,
  getAllMovements,
  getMovementsByDistrict,
} from '../services/stock.service';

// ─── GET /api/stock/central ───────────────────────────────────────────────────

export async function getCentral(_req: Request, res: Response): Promise<void> {
  try {
    const stock = await getCentralStock();
    res.json(stock);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching central stock';
    res.status(500).json({ error: message });
  }
}

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
    // Insufficient stock is a client error (422), not a server error
    const status = message.includes('Insufficient') ? 422 : 400;
    res.status(status).json({ error: message });
  }
}

// ─── POST /api/stock/reallocate ───────────────────────────────────────────────

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
    const status = message.includes('Insufficient') ? 422 : 400;
    res.status(status).json({ error: message });
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
    const status = message.includes('negative') ? 422 : 400;
    res.status(status).json({ error: message });
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