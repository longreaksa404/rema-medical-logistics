import { PrismaClient, EmkType, MovementType } from '@prisma/client';
import { invalidateCache } from './dashboard.service';
import { isInScarcity } from '../utils/stock.utils';

const prisma = new PrismaClient();

// ─── SCARCITY THRESHOLD ───────────────────────────────────────────────────────
// Section C.9: Scarcity mode triggers when stock falls below 30% of original allocation.
// Function lives in utils/stock.utils.ts to avoid circular imports.
// Re-exported here so existing callers (stock.controller, dashboard.service) are unchanged.
export { isInScarcity } from '../utils/stock.utils';

// ─── LOCAL CACHE ──────────────────────────────────────────────────────────────
// Same in-memory pattern as dashboard.service.ts.
// TTL: 15 seconds — stock status is polled frequently but changes only on
// dispatch, reallocation, adjustment, or delivery. All four writers call
// invalidateStockCache() so the cache never serves stale data after a write.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const STOCK_STATUS_KEY = 'stock:status';
const STOCK_TTL_MS = 15_000; // 15 seconds

/**
 * Bust stock:status cache. Called by every write path:
 *   dispatchStock, reallocateStock, adjustStock, recordDelivery
 * Also invalidates the dashboard caches that aggregate stock data.
 */
function invalidateStockCache(districtId?: string): void {
  cache.delete(STOCK_STATUS_KEY);
  // Also propagate to dashboard so district cards reflect the change
  if (districtId) {
    invalidateCache(`dashboard:district:${districtId}`);
  }
  invalidateCache('dashboard:summary');
}

export interface StockWithScarcity {
  subWarehouseId: string;
  districtId: string;
  districtName: string;
  emk1Total: number;
  emk1Remaining: number;
  emk1Pct: number;
  emk1Scarce: boolean;
  emk2Total: number;
  emk2Remaining: number;
  emk2Pct: number;
  emk2Scarce: boolean;
  emk3Total: number;
  emk3Remaining: number;
  emk3Pct: number;
  emk3Scarce: boolean;
  anyScarce: boolean;
  updatedAt: Date;
}

function enrichStock(stock: {
  subWarehouseId: string;
  emk1Total: number;
  emk1Remaining: number;
  emk2Total: number;
  emk2Remaining: number;
  emk3Total: number;
  emk3Remaining: number;
  updatedAt: Date;
  subWarehouse: { districtId: string; district: { name: string } };
}): StockWithScarcity {
  const emk1Scarce = isInScarcity(stock.emk1Remaining, stock.emk1Total);
  const emk2Scarce = isInScarcity(stock.emk2Remaining, stock.emk2Total);
  const emk3Scarce = isInScarcity(stock.emk3Remaining, stock.emk3Total);

  return {
    subWarehouseId: stock.subWarehouseId,
    districtId: stock.subWarehouse.districtId,
    districtName: stock.subWarehouse.district.name,
    emk1Total: stock.emk1Total,
    emk1Remaining: stock.emk1Remaining,
    emk1Pct: stock.emk1Total > 0 ? Math.round((stock.emk1Remaining / stock.emk1Total) * 100) : 0,
    emk1Scarce,
    emk2Total: stock.emk2Total,
    emk2Remaining: stock.emk2Remaining,
    emk2Pct: stock.emk2Total > 0 ? Math.round((stock.emk2Remaining / stock.emk2Total) * 100) : 0,
    emk2Scarce,
    emk3Total: stock.emk3Total,
    emk3Remaining: stock.emk3Remaining,
    emk3Pct: stock.emk3Total > 0 ? Math.round((stock.emk3Remaining / stock.emk3Total) * 100) : 0,
    emk3Scarce,
    anyScarce: emk1Scarce || emk2Scarce || emk3Scarce,
    updatedAt: stock.updatedAt,
  };
}

// ─── GET ALL STOCK ────────────────────────────────────────────────────────────
// Cached for 15 seconds. Invalidated on every write (dispatch/reallocate/adjust/delivery).

export async function getAllStock(): Promise<StockWithScarcity[]> {
  const cached = getCached<StockWithScarcity[]>(STOCK_STATUS_KEY);
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
  setCached(STOCK_STATUS_KEY, result, STOCK_TTL_MS);
  return result;
}

// ─── GET STOCK BY DISTRICT ────────────────────────────────────────────────────
// Not cached — single-district lookup is fast and called less frequently.
// Hub Managers view their own district; no need to cache per-district reads.

export async function getStockByDistrict(districtId: string): Promise<StockWithScarcity> {
  const sw = await prisma.subWarehouse.findUnique({
    where: { districtId },
  });

  if (!sw) throw new Error(`No sub-warehouse found for district ${districtId}`);

  const stock = await prisma.stock.findUnique({
    where: { subWarehouseId: sw.id },
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
    },
  });

  if (!stock) throw new Error(`No stock record found for district ${districtId}`);

  return enrichStock(stock);
}

// ─── DISPATCH — Central Warehouse → Sub-Warehouse ────────────────────────────
// Records movement as DISPATCH. Increases stock at sub-warehouse.
// Invalidates stock:status cache and both dashboard caches.

export async function dispatchStock(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason?: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;

  if (quantity <= 0) throw new Error('Quantity must be positive for dispatch');

  const stock = await prisma.stock.findUnique({ where: { subWarehouseId } });
  if (!stock) throw new Error(`No stock record found for sub-warehouse ${subWarehouseId}`);

  const totalField = emkType === 'EMK1' ? 'emk1Total'
    : emkType === 'EMK2' ? 'emk2Total' : 'emk3Total';
  const remainingField = emkType === 'EMK1' ? 'emk1Remaining'
    : emkType === 'EMK2' ? 'emk2Remaining' : 'emk3Remaining';

  const currentTotal = stock[totalField as keyof typeof stock] as number;
  const currentRemaining = stock[remainingField as keyof typeof stock] as number;

  const [updatedStock, movement] = await prisma.$transaction([
    prisma.stock.update({
      where: { subWarehouseId },
      data: {
        [totalField]: currentTotal + quantity,
        [remainingField]: currentRemaining + quantity,
      },
      include: {
        subWarehouse: { include: { district: { select: { name: true } } } },
      },
    }),
    prisma.stockMovement.create({
      data: {
        subWarehouseId,
        emkType,
        movementType: MovementType.DISPATCH,
        quantity: quantity,
        reason: reason ?? 'Central warehouse dispatch',
        performedById,
      },
    }),
  ]);

  // EMK-3 dispatch is always a MoH transfer (cold chain — Section B.10)
  if (emkType === 'EMK3') {
    await prisma.stockMovement.update({
      where: { id: movement.id },
      data: { movementType: MovementType.MOH_TRANSFER },
    });
  }

  const districtId = updatedStock.subWarehouse.districtId;
  invalidateStockCache(districtId);

  return {
    stock: enrichStock(updatedStock),
    movement,
  };
}

// ─── REALLOCATE — Cross-District ─────────────────────────────────────────────
// Emergency Coordinator only (enforced at route level).
// Moves stock from one sub-warehouse to another.
// Invalidates stock:status cache and both affected district dashboard caches.

export async function reallocateStock(data: {
  fromSubWarehouseId: string;
  toSubWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason?: string;
  performedById: string;
}) {
  const { fromSubWarehouseId, toSubWarehouseId, emkType, quantity, reason, performedById } = data;

  if (quantity <= 0) throw new Error('Quantity must be positive for reallocation');
  if (fromSubWarehouseId === toSubWarehouseId) throw new Error('From and To sub-warehouses must be different');

  const remainingField = emkType === 'EMK1' ? 'emk1Remaining'
    : emkType === 'EMK2' ? 'emk2Remaining' : 'emk3Remaining';

  const fromStock = await prisma.stock.findUnique({ where: { subWarehouseId: fromSubWarehouseId } });
  const toStock = await prisma.stock.findUnique({ where: { subWarehouseId: toSubWarehouseId } });

  if (!fromStock) throw new Error(`Source sub-warehouse stock not found: ${fromSubWarehouseId}`);
  if (!toStock) throw new Error(`Destination sub-warehouse stock not found: ${toSubWarehouseId}`);

  const fromRemaining = fromStock[remainingField as keyof typeof fromStock] as number;
  if (fromRemaining < quantity) {
    throw new Error(
      `Insufficient stock: ${fromSubWarehouseId} only has ${fromRemaining} ${emkType} remaining`
    );
  }

  const toRemaining = toStock[remainingField as keyof typeof toStock] as number;
  const reasonText = reason ?? `Cross-district reallocation`;

  const [updatedFrom, updatedTo] = await prisma.$transaction([
    prisma.stock.update({
      where: { subWarehouseId: fromSubWarehouseId },
      data: { [remainingField]: fromRemaining - quantity },
      include: { subWarehouse: { include: { district: { select: { name: true } } } } },
    }),
    prisma.stock.update({
      where: { subWarehouseId: toSubWarehouseId },
      data: { [remainingField]: toRemaining + quantity },
      include: { subWarehouse: { include: { district: { select: { name: true } } } } },
    }),
    prisma.stockMovement.create({
      data: {
        subWarehouseId: fromSubWarehouseId,
        emkType,
        movementType: MovementType.REALLOCATION,
        quantity: -quantity,
        reason: `${reasonText} → to ${toSubWarehouseId}`,
        performedById,
      },
    }),
    prisma.stockMovement.create({
      data: {
        subWarehouseId: toSubWarehouseId,
        emkType,
        movementType: MovementType.REALLOCATION,
        quantity: quantity,
        reason: `${reasonText} ← from ${fromSubWarehouseId}`,
        performedById,
      },
    }),
  ]);

  const fromDistrictId = updatedFrom.subWarehouse.districtId;
  const toDistrictId = updatedTo.subWarehouse.districtId;
  // Bust stock status cache once, then each district dashboard cache
  cache.delete(STOCK_STATUS_KEY);
  invalidateCache(`dashboard:district:${fromDistrictId}`);
  invalidateCache(`dashboard:district:${toDistrictId}`);
  invalidateCache('dashboard:summary');

  return {
    from: enrichStock(updatedFrom),
    to: enrichStock(updatedTo),
  };
}

// ─── ADJUST — Manual with reason ─────────────────────────────────────────────
// Hub Manager. Positive = add, negative = remove. Always requires reason.
// Invalidates stock:status cache. Dashboard TTL (15s) is acceptable here
// since adjustments are small corrections during active operations.

export async function adjustStock(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;

  if (quantity === 0) throw new Error('Adjustment quantity cannot be 0');
  if (!reason || reason.trim().length === 0) throw new Error('Reason is required for manual adjustment');

  const remainingField = emkType === 'EMK1' ? 'emk1Remaining'
    : emkType === 'EMK2' ? 'emk2Remaining' : 'emk3Remaining';

  const stock = await prisma.stock.findUnique({ where: { subWarehouseId } });
  if (!stock) throw new Error(`No stock record found for sub-warehouse ${subWarehouseId}`);

  const currentRemaining = stock[remainingField as keyof typeof stock] as number;
  const newRemaining = currentRemaining + quantity;

  if (newRemaining < 0) {
    throw new Error(
      `Adjustment would result in negative stock: current=${currentRemaining}, adjustment=${quantity}`
    );
  }

  const [updatedStock, movement] = await prisma.$transaction([
    prisma.stock.update({
      where: { subWarehouseId },
      data: { [remainingField]: newRemaining },
      include: {
        subWarehouse: { include: { district: { select: { name: true } } } },
      },
    }),
    prisma.stockMovement.create({
      data: {
        subWarehouseId,
        emkType,
        movementType: MovementType.ADJUSTMENT,
        quantity,
        reason,
        performedById,
      },
    }),
  ]);

  // Bust stock:status cache — even small adjustments must be reflected immediately
  cache.delete(STOCK_STATUS_KEY);

  return {
    stock: enrichStock(updatedStock),
    movement,
  };
}

// ─── GET MOVEMENTS ────────────────────────────────────────────────────────────

export async function getAllMovements() {
  return prisma.stockMovement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
      performedBy: { select: { name: true, email: true, role: true } },
    },
  });
}

export async function getMovementsByDistrict(districtId: string) {
  const sw = await prisma.subWarehouse.findUnique({ where: { districtId } });
  if (!sw) throw new Error(`No sub-warehouse found for district ${districtId}`);

  return prisma.stockMovement.findMany({
    where: { subWarehouseId: sw.id },
    orderBy: { createdAt: 'desc' },
    include: {
      performedBy: { select: { name: true, email: true, role: true } },
    },
  });
}

// ─── RECORD DELIVERY CONSUMPTION ─────────────────────────────────────────────
// Called internally when a delivery receipt is recorded.
// Decrements remaining stock at the source sub-warehouse.
// Invalidates stock:status cache — delivery frequency is high but the
// 15s TTL would otherwise serve stale scarcity warnings to volunteers.

export async function recordDelivery(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason?: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;

  if (quantity <= 0) throw new Error('Quantity must be positive for delivery recording');

  const remainingField = emkType === 'EMK1' ? 'emk1Remaining'
    : emkType === 'EMK2' ? 'emk2Remaining' : 'emk3Remaining';

  const stock = await prisma.stock.findUnique({ where: { subWarehouseId } });
  if (!stock) throw new Error(`No stock record for sub-warehouse ${subWarehouseId}`);

  const currentRemaining = stock[remainingField as keyof typeof stock] as number;
  if (currentRemaining < quantity) {
    throw new Error(`Insufficient stock: ${currentRemaining} remaining, need ${quantity}`);
  }

  const [updatedStock, movement] = await prisma.$transaction([
    prisma.stock.update({
      where: { subWarehouseId },
      data: { [remainingField]: currentRemaining - quantity },
      include: {
        subWarehouse: { include: { district: { select: { name: true } } } },
      },
    }),
    prisma.stockMovement.create({
      data: {
        subWarehouseId,
        emkType,
        movementType: MovementType.DELIVERY,
        quantity: -quantity,
        reason: reason ?? 'Household delivery',
        performedById,
      },
    }),
  ]);

  // Bust stock:status cache so scarcity warnings propagate immediately
  cache.delete(STOCK_STATUS_KEY);

  const enriched = enrichStock(updatedStock);
  return {
    stock: enriched,
    movement,
    scarcityWarning: enriched.anyScarce,
  };
}