import { Request, Response } from 'express';
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
import { sendError } from '../middleware/error-handler';

// Request bodies are validated by schemas/stock.schemas.ts before these run

// ─── GET /api/stock/central ───────────────────────────────────────────────────

export async function getCentral(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await getCentralStock());
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/stock/central/movements ────────────────────────────────────────

export async function getCentralMovementsHandler(req: Request, res: Response): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    res.json(await getCentralMovements(page, pageSize));
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/stock/status ────────────────────────────────────────────────────

export async function getStatus(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await getAllStock());
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/stock/:districtId ───────────────────────────────────────────────

export async function getByDistrict(req: Request, res: Response): Promise<void> {
  try {
    res.json(await getStockByDistrict(req.params.districtId));
  } catch (err) {
    sendError(res, err, 404);
  }
}

// ─── POST /api/stock/dispatch ─────────────────────────────────────────────────

export async function dispatch(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, emkType, quantity, reason } = req.body;

  try {
    const result = await dispatchStock({
      subWarehouseId,
      emkType,
      quantity,
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── POST /api/stock/reallocate ───────────────────────────────────────────────

export async function reallocate(req: Request, res: Response): Promise<void> {
  const { fromSubWarehouseId, toSubWarehouseId, emkType, quantity, reason } = req.body;

  try {
    const result = await reallocateStock({
      fromSubWarehouseId, toSubWarehouseId,
      emkType,
      quantity,
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── POST /api/stock/adjust ───────────────────────────────────────────────────

export async function adjust(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, emkType, quantity, reason } = req.body;

  try {
    const result = await adjustStock({
      subWarehouseId,
      emkType,
      quantity,
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── GET /api/stock/movements ─────────────────────────────────────────────────

export async function getMovements(req: Request, res: Response): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    res.json(await getAllMovements(page, pageSize));
  } catch (err) {
    sendError(res, err, 500);
  }
}

// ─── GET /api/stock/movements/:districtId ────────────────────────────────────

export async function getMovementsByDistrictHandler(req: Request, res: Response): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    res.json(await getMovementsByDistrict(req.params.districtId, page, pageSize));
  } catch (err) {
    sendError(res, err, 404);
  }
}

// ─── POST /api/stock/central/replenish ───────────────────────────────────────

export async function replenishCentral(req: Request, res: Response): Promise<void> {
  const { emkType, quantity, reason } = req.body;

  try {
    const result = await replenishCentralStock({
      emkType,
      quantity,
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/stock/central ────────────────────────────────────────────────

export async function adjustCentral(req: Request, res: Response): Promise<void> {
  const { emkType, quantity, reason } = req.body;

  try {
    const result = await adjustCentralStock({
      emkType,
      quantity,
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// ─── PATCH /api/stock/allocation ─────────────────────────────────────────────

export async function setAllocation(req: Request, res: Response): Promise<void> {
  const { target, subWarehouseId, emkType, newTotal, reason } = req.body;

  try {
    const result = await setAllocationStock({
      target, subWarehouseId,
      emkType,
      newTotal,
      reason,
      performedById: req.user!.userId,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}
