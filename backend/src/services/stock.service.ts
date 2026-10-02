import { EmkType, MovementType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError, UnprocessableError, BadRequestError } from '../lib/errors';
import { invalidateCache } from './dashboard.service';
import { isInScarcity } from '../utils/stock.utils';
import { getCached, setCached, deleteCached } from '../utils/cache';

export { isInScarcity } from '../utils/stock.utils';

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
const KEY_STATUS  = 'stock:status';
const KEY_CENTRAL = 'stock:central';
const TTL_STATUS  = 15_000;
const TTL_CENTRAL = 15_000;

export function invalidateStockCache(...districtIds: string[]): void {
  deleteCached(KEY_STATUS);
  deleteCached(KEY_CENTRAL);
  for (const id of districtIds) invalidateCache(`dashboard:district:${id}`);
  invalidateCache('dashboard:summary');
}

// ─── FIELD HELPERS ────────────────────────────────────────────────────────────

const FIELDS = {
  EMK1: { totalField: 'emk1Total', remainingField: 'emk1Remaining' },
  EMK2: { totalField: 'emk2Total', remainingField: 'emk2Remaining' },
  EMK3: { totalField: 'emk3Total', remainingField: 'emk3Remaining' },
} as const satisfies Record<EmkType, { totalField: string; remainingField: string }>;

function getFields(emkType: EmkType) {
  return FIELDS[emkType];
}

const STOCK_INCLUDE = {
  subWarehouse: { include: { district: { select: { name: true } } } },
} as const;

// Interactive transactions default to 5s — Supabase round-trips from Render can be slow
export const TX_OPTIONS = { timeout: 15_000, maxWait: 10_000 };

// ─── ATOMIC STOCK DELTAS ──────────────────────────────────────────────────────
// Stock is never written as "read value, then write value ± qty" — two requests
// doing that at the same time silently lose one update. Instead each change is a
// single UPDATE ... SET x = x + delta WHERE x >= -delta. Postgres re-checks the
// WHERE under the row lock, so concurrent writers serialise and stock can never
// go below zero. count === 0 means the guard failed (or the row is missing).

export async function applySubWarehouseDelta(
  tx: Prisma.TransactionClient,
  subWarehouseId: string,
  emkType: EmkType,
  delta: number,
  insufficientMessage: (current: number) => string,
): Promise<void> {
  const { remainingField } = getFields(emkType);
  const where: Prisma.StockWhereInput =
    delta < 0 ? { subWarehouseId, [remainingField]: { gte: -delta } } : { subWarehouseId };

  const { count } = await tx.stock.updateMany({
    where,
    data: { [remainingField]: { increment: delta } },
  });
  if (count === 1) return;

  const stock = await tx.stock.findUnique({ where: { subWarehouseId } });
  if (!stock) throw new NotFoundError(`No stock record found for sub-warehouse ${subWarehouseId}`);
  throw new UnprocessableError(insufficientMessage(stock[remainingField]));
}

// Same as above for the single central warehouse row. Returns the central id.
async function applyCentralDelta(
  tx: Prisma.TransactionClient,
  emkType: EmkType,
  delta: number,
  insufficientMessage: (current: number) => string,
): Promise<string> {
  const { remainingField } = getFields(emkType);

  const central = await tx.centralWarehouse.findFirst({ select: { id: true } });
  if (!central) throw new NotFoundError('Central warehouse not found. Run seed.');

  const where: Prisma.CentralWarehouseWhereInput =
    delta < 0 ? { id: central.id, [remainingField]: { gte: -delta } } : { id: central.id };

  const { count } = await tx.centralWarehouse.updateMany({
    where,
    data: { [remainingField]: { increment: delta } },
  });
  if (count === 1) return central.id;

  const current = await tx.centralWarehouse.findUniqueOrThrow({ where: { id: central.id } });
  throw new UnprocessableError(insufficientMessage(current[remainingField]));
}

function centralSnapshot(c: {
  emk1Total: number; emk1Remaining: number;
  emk2Total: number; emk2Remaining: number;
  emk3Total: number; emk3Remaining: number;
}) {
  return {
    emk1Total: c.emk1Total, emk1Remaining: c.emk1Remaining,
    emk2Total: c.emk2Total, emk2Remaining: c.emk2Remaining,
    emk3Total: c.emk3Total, emk3Remaining: c.emk3Remaining,
  };
}

// ─── CENTRAL MOVEMENT TYPES ───────────────────────────────────────────────────
// Separate from sub-warehouse MovementType enum — central has different operations.
export type CentralMovementType =
  | 'DISPATCH'           // stock sent to a sub-warehouse (negative quantity at central)
  | 'REPLENISH'          // new stock arriving at central (positive quantity)
  | 'ADJUSTMENT'         // manual correction (signed)
  | 'ALLOCATION_CHANGE'  // Total reference changed (quantity = newTotal, not a stock change)
  | 'MOH_TRANSFER';      // EMK3 MoH cold storage transfer

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface CentralStockLevel {
  id: string;
  emk1Total: number; emk1Remaining: number; emk1Pct: number; emk1Scarce: boolean;
  emk2Total: number; emk2Remaining: number; emk2Pct: number; emk2Scarce: boolean;
  emk3Total: number; emk3Remaining: number; emk3Pct: number; emk3Scarce: boolean;
  updatedAt: Date;
}

export interface StockWithScarcity {
  subWarehouseId: string;
  districtId: string;
  districtName: string;
  emk1Total: number; emk1Remaining: number; emk1Pct: number; emk1Scarce: boolean; emk1AboveAllocation: boolean;
  emk2Total: number; emk2Remaining: number; emk2Pct: number; emk2Scarce: boolean; emk2AboveAllocation: boolean;
  emk3Total: number; emk3Remaining: number; emk3Pct: number; emk3Scarce: boolean; emk3AboveAllocation: boolean;
  anyScarce: boolean;
  updatedAt: Date;
}

function pct(rem: number, total: number) {
  return total > 0 ? Math.min(Math.round((rem / total) * 100), 100) : 0;
}

function enrichStock(stock: {
  subWarehouseId: string;
  emk1Total: number; emk1Remaining: number;
  emk2Total: number; emk2Remaining: number;
  emk3Total: number; emk3Remaining: number;
  updatedAt: Date;
  subWarehouse: { districtId: string; district: { name: string } };
}): StockWithScarcity {
  const emk1Scarce = isInScarcity(stock.emk1Remaining, stock.emk1Total);
  const emk2Scarce = isInScarcity(stock.emk2Remaining, stock.emk2Total);
  const emk3Scarce = isInScarcity(stock.emk3Remaining, stock.emk3Total);
  return {
    subWarehouseId: stock.subWarehouseId,
    districtId:     stock.subWarehouse.districtId,
    districtName:   stock.subWarehouse.district.name,
    emk1Total:      stock.emk1Total,
    emk1Remaining:  stock.emk1Remaining,
    emk1Pct:        pct(stock.emk1Remaining, stock.emk1Total),
    emk1Scarce,
    emk1AboveAllocation: stock.emk1Remaining > stock.emk1Total,
    emk2Total:      stock.emk2Total,
    emk2Remaining:  stock.emk2Remaining,
    emk2Pct:        pct(stock.emk2Remaining, stock.emk2Total),
    emk2Scarce,
    emk2AboveAllocation: stock.emk2Remaining > stock.emk2Total,
    emk3Total:      stock.emk3Total,
    emk3Remaining:  stock.emk3Remaining,
    emk3Pct:        pct(stock.emk3Remaining, stock.emk3Total),
    emk3Scarce,
    emk3AboveAllocation: stock.emk3Remaining > stock.emk3Total,
    anyScarce:      emk1Scarce || emk2Scarce || emk3Scarce,
    updatedAt:      stock.updatedAt,
  };
}

// ─── GET CENTRAL STOCK ────────────────────────────────────────────────────────

export async function getCentralStock(): Promise<CentralStockLevel> {
  const cached = getCached<CentralStockLevel>(KEY_CENTRAL);
  if (cached) return cached;

  const central = await prisma.centralWarehouse.findFirst();
  if (!central) {
    throw new Error('Central warehouse not initialised. Run `npm run seed`.');
  }

  const result: CentralStockLevel = {
    id:            central.id,
    emk1Total:     central.emk1Total,
    emk1Remaining: central.emk1Remaining,
    emk1Pct:       pct(central.emk1Remaining, central.emk1Total),
    emk1Scarce:    isInScarcity(central.emk1Remaining, central.emk1Total),
    emk2Total:     central.emk2Total,
    emk2Remaining: central.emk2Remaining,
    emk2Pct:       pct(central.emk2Remaining, central.emk2Total),
    emk2Scarce:    isInScarcity(central.emk2Remaining, central.emk2Total),
    emk3Total:     central.emk3Total,
    emk3Remaining: central.emk3Remaining,
    emk3Pct:       pct(central.emk3Remaining, central.emk3Total),
    emk3Scarce:    isInScarcity(central.emk3Remaining, central.emk3Total),
    updatedAt:     central.updatedAt,
  };

  setCached(KEY_CENTRAL, result, TTL_CENTRAL);
  return result;
}

// ─── GET CENTRAL MOVEMENTS ────────────────────────────────────────────────────

export interface PaginatedMovements<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 10;

export async function getCentralMovements(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedMovements<object>> {
  const skip = (page - 1) * pageSize;

  const [data, total] = await prisma.$transaction([
    prisma.centralStockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        performedBy: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.centralStockMovement.count(),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── GET ALL SUB-WAREHOUSE STOCK ─────────────────────────────────────────────

export async function getAllStock(): Promise<StockWithScarcity[]> {
  const cached = getCached<StockWithScarcity[]>(KEY_STATUS);
  if (cached) return cached;

  const records = await prisma.stock.findMany({
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
    },
    orderBy: { subWarehouse: { district: { name: 'asc' } } },
  });

  const result = records.map(enrichStock);
  setCached(KEY_STATUS, result, TTL_STATUS);
  return result;
}

// ─── GET STOCK BY DISTRICT ────────────────────────────────────────────────────

export async function getStockByDistrict(districtId: string): Promise<StockWithScarcity> {
  const sw = await prisma.subWarehouse.findUnique({ where: { districtId } });
  if (!sw) throw new Error(`No sub-warehouse found for district ${districtId}`);

  const stock = await prisma.stock.findUnique({
    where: { subWarehouseId: sw.id },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
    },
  });
  if (!stock) throw new Error(`No stock record found for district ${districtId}`);
  return enrichStock(stock);
}

// ─── DISPATCH — Central → Sub-Warehouse ──────────────────────────────────────

export async function dispatchStock(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason?: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;
  if (quantity <= 0) throw new BadRequestError('Quantity must be positive for dispatch');

  const movementType = emkType === 'EMK3' ? MovementType.MOH_TRANSFER : MovementType.DISPATCH;
  const reasonText = reason ?? 'Central warehouse dispatch';

  const updatedStock = await prisma.$transaction(async (tx) => {
    // Lock order: central first, then sub-warehouse — same order everywhere
    const centralId = await applyCentralDelta(tx, emkType, -quantity, (available) =>
      `Insufficient central warehouse stock for ${emkType}. ` +
      `Available: ${available}, requested: ${quantity}.`
    );
    await applySubWarehouseDelta(tx, subWarehouseId, emkType, quantity, () => '');

    // Sub-warehouse audit log
    await tx.stockMovement.create({
      data: { subWarehouseId, emkType, movementType, quantity, reason: reasonText, performedById },
    });
    // Central audit log — negative quantity (stock leaving central)
    await tx.centralStockMovement.create({
      data: {
        centralWarehouseId: centralId,
        emkType,
        movementType,
        quantity: -quantity,
        reason: reasonText,
        performedById,
      },
    });

    return tx.stock.findUniqueOrThrow({ where: { subWarehouseId }, include: STOCK_INCLUDE });
  }, TX_OPTIONS);

  invalidateStockCache(updatedStock.subWarehouse.districtId);
  return { stock: enrichStock(updatedStock) };
}

// ─── REALLOCATE — Sub-Warehouse → Sub-Warehouse ───────────────────────────────

export async function reallocateStock(data: {
  fromSubWarehouseId: string;
  toSubWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason?: string;
  performedById: string;
}) {
  const { fromSubWarehouseId, toSubWarehouseId, emkType, quantity, reason, performedById } = data;

  if (quantity <= 0) throw new BadRequestError('Quantity must be positive for reallocation');
  if (fromSubWarehouseId === toSubWarehouseId) throw new BadRequestError('Source and destination must differ');

  const reasonText = reason ?? 'Cross-district reallocation';

  const [updatedFrom, updatedTo] = await prisma.$transaction(async (tx) => {
    const [fromSw, toSw] = await Promise.all([
      tx.subWarehouse.findUnique({ where: { id: fromSubWarehouseId }, include: { district: { select: { name: true } } } }),
      tx.subWarehouse.findUnique({ where: { id: toSubWarehouseId },   include: { district: { select: { name: true } } } }),
    ]);
    if (!fromSw) throw new NotFoundError('Source sub-warehouse stock not found');
    if (!toSw)   throw new NotFoundError('Destination sub-warehouse stock not found');

    // Lock both stock rows in a fixed (id) order so two opposite reallocations
    // running at once cannot deadlock each other.
    const steps = [
      { id: fromSubWarehouseId, delta: -quantity },
      { id: toSubWarehouseId,   delta:  quantity },
    ].sort((a, b) => a.id.localeCompare(b.id));

    for (const step of steps) {
      await applySubWarehouseDelta(tx, step.id, emkType, step.delta, (available) =>
        `Insufficient stock: source only has ${available} ${emkType} remaining`
      );
    }

    await tx.stockMovement.create({
      data: {
        subWarehouseId: fromSubWarehouseId, emkType,
        movementType: MovementType.REALLOCATION,
        quantity: -quantity,
        reason: `${reasonText} → to ${toSw.district.name}`,
        performedById,
      },
    });
    await tx.stockMovement.create({
      data: {
        subWarehouseId: toSubWarehouseId, emkType,
        movementType: MovementType.REALLOCATION,
        quantity,
        reason: `${reasonText} ← from ${fromSw.district.name}`,
        performedById,
      },
    });

    return Promise.all([
      tx.stock.findUniqueOrThrow({ where: { subWarehouseId: fromSubWarehouseId }, include: STOCK_INCLUDE }),
      tx.stock.findUniqueOrThrow({ where: { subWarehouseId: toSubWarehouseId },   include: STOCK_INCLUDE }),
    ]);
  }, TX_OPTIONS);

  invalidateStockCache(updatedFrom.subWarehouse.districtId, updatedTo.subWarehouse.districtId);
  return { from: enrichStock(updatedFrom), to: enrichStock(updatedTo) };
}

// ─── ADJUST — Sub-warehouse manual correction ─────────────────────────────────

export async function adjustStock(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;
  if (quantity === 0) throw new BadRequestError('Adjustment quantity cannot be 0');
  if (!reason?.trim()) throw new BadRequestError('Reason is required for manual adjustment');

  const [updatedStock, movement] = await prisma.$transaction(async (tx) => {
    await applySubWarehouseDelta(tx, subWarehouseId, emkType, quantity, (current) =>
      `Adjustment would result in negative stock: current=${current}, adjustment=${quantity}`
    );
    const movement = await tx.stockMovement.create({
      data: { subWarehouseId, emkType, movementType: MovementType.ADJUSTMENT, quantity, reason, performedById },
    });
    const stock = await tx.stock.findUniqueOrThrow({ where: { subWarehouseId }, include: STOCK_INCLUDE });
    return [stock, movement] as const;
  }, TX_OPTIONS);

  invalidateStockCache(updatedStock.subWarehouse.districtId);
  return { stock: enrichStock(updatedStock), movement };
}

// ─── REPLENISH CENTRAL ────────────────────────────────────────────────────────
// New stock arriving — increases Remaining only. Total stays as seed reference.

export async function replenishCentral(data: {
  emkType: EmkType;
  quantity: number;
  reason: string;
  performedById: string;
}) {
  const { emkType, quantity, reason, performedById } = data;
  if (quantity <= 0) throw new BadRequestError('Quantity must be positive for replenishment');

  const updated = await prisma.$transaction(async (tx) => {
    const centralId = await applyCentralDelta(tx, emkType, quantity, () => '');
    await tx.centralStockMovement.create({
      data: {
        centralWarehouseId: centralId,
        emkType,
        movementType: 'REPLENISH',
        quantity,          // positive — stock arriving
        reason,
        performedById,
      },
    });
    return tx.centralWarehouse.findUniqueOrThrow({ where: { id: centralId } });
  }, TX_OPTIONS);

  invalidateStockCache();
  return { emkType, quantity, reason, updatedStock: centralSnapshot(updated) };
}

// ─── ADJUST CENTRAL ───────────────────────────────────────────────────────────
// Signed correction — changes only Remaining.

export async function adjustCentral(data: {
  emkType: EmkType;
  quantity: number;
  reason: string;
  performedById: string;
}) {
  const { emkType, quantity, reason, performedById } = data;
  if (quantity === 0) throw new BadRequestError('Adjustment quantity cannot be 0');
  if (!reason?.trim()) throw new BadRequestError('Reason is required for manual adjustment');

  const updated = await prisma.$transaction(async (tx) => {
    const centralId = await applyCentralDelta(tx, emkType, quantity, (current) =>
      `Adjustment would result in negative stock: current=${current}, adjustment=${quantity}`
    );
    await tx.centralStockMovement.create({
      data: {
        centralWarehouseId: centralId,
        emkType,
        movementType: 'ADJUSTMENT',
        quantity,          // signed
        reason,
        performedById,
      },
    });
    return tx.centralWarehouse.findUniqueOrThrow({ where: { id: centralId } });
  }, TX_OPTIONS);

  invalidateStockCache();
  return { emkType, quantity, reason, updatedStock: centralSnapshot(updated) };
}

// ─── SET ALLOCATION ───────────────────────────────────────────────────────────
// Changes Total reference only — Remaining is unaffected.

export async function setAllocation(data: {
  target: 'central' | 'subWarehouse';
  subWarehouseId?: string;
  emkType: EmkType;
  newTotal: number;
  reason: string;
  performedById: string;
}) {
  const { target, subWarehouseId, emkType, newTotal, reason, performedById } = data;
  if (newTotal < 0) throw new BadRequestError('Allocation cannot be negative');
  if (!reason?.trim()) throw new BadRequestError('Reason is required when changing allocation');

  const { totalField } = getFields(emkType);

  if (target === 'central') {
    const updated = await prisma.$transaction(async (tx) => {
      const central = await tx.centralWarehouse.findFirst();
      if (!central) throw new NotFoundError('Central warehouse not found. Run seed.');

      const updated = await tx.centralWarehouse.update({
        where: { id: central.id },
        data: { [totalField]: newTotal },
      });
      await tx.centralStockMovement.create({
        data: {
          centralWarehouseId: central.id,
          emkType,
          movementType: 'ALLOCATION_CHANGE',
          quantity: newTotal,
          reason,
          performedById,
        },
      });
      return updated;
    }, TX_OPTIONS);

    invalidateStockCache();
    return { target: 'central', emkType, newTotal, reason, updatedStock: centralSnapshot(updated) };
  }

  if (!subWarehouseId) throw new BadRequestError('subWarehouseId is required for sub-warehouse allocation');

  const updated = await prisma.$transaction(async (tx) => {
    const central = await tx.centralWarehouse.findFirst();
    if (!central) throw new NotFoundError('Central warehouse not found. Run seed.');

    const exists = await tx.stock.findUnique({ where: { subWarehouseId } });
    if (!exists) throw new NotFoundError('Stock record not found for this sub-warehouse');

    const updated = await tx.stock.update({
      where: { subWarehouseId },
      data: { [totalField]: newTotal },
      include: STOCK_INCLUDE,
    });
    await tx.stockMovement.create({
      data: {
        subWarehouseId,
        emkType,
        movementType: MovementType.ADJUSTMENT,
        quantity: 0,
        reason: `ALLOCATION CHANGE: ${reason} (new total: ${newTotal})`,
        performedById,
      },
    });
    await tx.centralStockMovement.create({
      data: {
        centralWarehouseId: central.id,
        emkType,
        movementType: 'ALLOCATION_CHANGE',
        quantity: newTotal,
        reason: `[${updated.subWarehouse.district.name}] ${reason} (new total: ${newTotal})`,
        performedById,
      },
    });
    return updated;
  }, TX_OPTIONS);

  invalidateStockCache(updated.subWarehouse.districtId);
  return {
    target: 'subWarehouse', subWarehouseId, emkType, newTotal, reason,
    updatedStock: enrichStock(updated),
  };
}

// ─── GET SUB-WAREHOUSE MOVEMENTS ─────────────────────────────────────────────

export async function getAllMovements(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedMovements<object>> {
  const skip = (page - 1) * pageSize;

  const [data, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        subWarehouse: { include: { district: { select: { name: true } } } },
        performedBy: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.stockMovement.count(),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getMovementsByDistrict(
  districtId: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedMovements<object>> {
  const sw = await prisma.subWarehouse.findUnique({ where: { districtId } });
  if (!sw) throw new Error(`No sub-warehouse found for district ${districtId}`);

  const skip = (page - 1) * pageSize;

  const [data, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where: { subWarehouseId: sw.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        performedBy: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.stockMovement.count({ where: { subWarehouseId: sw.id } }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── RECORD DELIVERY CONSUMPTION ─────────────────────────────────────────────
// Runs inside the caller's transaction so the stock deduction, the movement log
// and the delivery receipt either all commit or all roll back together.
// Caller is responsible for invalidateStockCache() after commit.

export async function recordDelivery(
  tx: Prisma.TransactionClient,
  data: {
    subWarehouseId: string;
    emkType: EmkType;
    quantity: number;
    reason?: string;
    performedById: string;
  },
) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;
  if (quantity <= 0) throw new BadRequestError('Quantity must be positive for delivery recording');

  await applySubWarehouseDelta(tx, subWarehouseId, emkType, -quantity, (available) =>
    `Insufficient ${emkType} stock: ${available} remaining, need ${quantity}`
  );

  return tx.stockMovement.create({
    data: {
      subWarehouseId, emkType, movementType: MovementType.DELIVERY,
      quantity: -quantity,
      reason: reason ?? 'Household delivery',
      performedById,
    },
  });
}
