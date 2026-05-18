import { PrismaClient, EmkType, MovementType } from '@prisma/client';
import { invalidateCache } from './dashboard.service';
import { isInScarcity } from '../utils/stock.utils';
import { getCached, setCached, deleteCached } from '../utils/cache';

const prisma = new PrismaClient();

export { isInScarcity } from '../utils/stock.utils';

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
const KEY_STATUS  = 'stock:status';
const KEY_CENTRAL = 'stock:central';
const TTL_STATUS  = 15_000;
const TTL_CENTRAL = 15_000;

function invalidateStockCache(districtId?: string): void {
  deleteCached(KEY_STATUS);
  deleteCached(KEY_CENTRAL);
  if (districtId) invalidateCache(`dashboard:district:${districtId}`);
  invalidateCache('dashboard:summary');
}

// ─── FIELD HELPERS ────────────────────────────────────────────────────────────

function getFields(emkType: EmkType) {
  return {
    totalField:     emkType === 'EMK1' ? 'emk1Total'     : emkType === 'EMK2' ? 'emk2Total'     : 'emk3Total',
    remainingField: emkType === 'EMK1' ? 'emk1Remaining' : emkType === 'EMK2' ? 'emk2Remaining' : 'emk3Remaining',
  };
}

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
  emk1Total: number; emk1Remaining: number; emk1Pct: number; emk1Scarce: boolean;
  emk2Total: number; emk2Remaining: number; emk2Pct: number; emk2Scarce: boolean;
  emk3Total: number; emk3Remaining: number; emk3Pct: number; emk3Scarce: boolean;
  anyScarce: boolean;
  updatedAt: Date;
}

function pct(rem: number, total: number) {
  return total > 0 ? Math.round((rem / total) * 100) : 0;
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
    emk2Total:      stock.emk2Total,
    emk2Remaining:  stock.emk2Remaining,
    emk2Pct:        pct(stock.emk2Remaining, stock.emk2Total),
    emk2Scarce,
    emk3Total:      stock.emk3Total,
    emk3Remaining:  stock.emk3Remaining,
    emk3Pct:        pct(stock.emk3Remaining, stock.emk3Total),
    emk3Scarce,
    anyScarce:      emk1Scarce || emk2Scarce || emk3Scarce,
    updatedAt:      stock.updatedAt,
  };
}

// ─── GET CENTRAL STOCK ────────────────────────────────────────────────────────
// Reads from central_warehouse table — completely separate from districts.

export async function getCentralStock(): Promise<CentralStockLevel> {
  const cached = getCached<CentralStockLevel>(KEY_CENTRAL);
  if (cached) return cached;

  // Singleton — only one row ever exists
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

// ─── DISPATCH — Central Warehouse → Sub-Warehouse ────────────────────────────

export async function dispatchStock(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason?: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;
  if (quantity <= 0) throw new Error('Quantity must be positive for dispatch');

  const { totalField, remainingField } = getFields(emkType);

  // ── 1. Check central has enough ────────────────────────────────────────────
  const central = await prisma.centralWarehouse.findFirst();
  if (!central) throw new Error('Central warehouse not found. Run seed.');

  const centralRemaining = central[remainingField as keyof typeof central] as number;
  if (centralRemaining < quantity) {
    throw new Error(
      `Insufficient central warehouse stock for ${emkType}. ` +
      `Available: ${centralRemaining}, requested: ${quantity}.`
    );
  }

  // ── 2. Check sub-warehouse exists ──────────────────────────────────────────
  const stock = await prisma.stock.findUnique({
    where: { subWarehouseId },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
    },
  });
  if (!stock) throw new Error(`No stock record found for sub-warehouse ${subWarehouseId}`);

  const currentTotal     = stock[totalField     as keyof typeof stock] as number;
  const currentRemaining = stock[remainingField as keyof typeof stock] as number;

  // ── 3. Transaction: deduct central, add to sub-warehouse, log movement ────
  const [updatedStock, movement] = await prisma.$transaction([
    // Add to sub-warehouse
    prisma.stock.update({
      where: { subWarehouseId },
      data: {
        [totalField]:     currentTotal     + quantity,
        [remainingField]: currentRemaining + quantity,
      },
      include: {
        subWarehouse: { include: { district: { select: { name: true } } } },
      },
    }),
    // Deduct from central_warehouse table
    prisma.centralWarehouse.update({
      where: { id: central.id },
      data: {
        [totalField]:     { decrement: quantity },
        [remainingField]: { decrement: quantity },
      },
    }),
    // Audit log
    prisma.stockMovement.create({
      data: {
        subWarehouseId,
        emkType,
        movementType: emkType === 'EMK3' ? MovementType.MOH_TRANSFER : MovementType.DISPATCH,
        quantity,
        reason: reason ?? 'Central warehouse dispatch',
        performedById,
      },
    }),
  ]);

  invalidateStockCache(updatedStock.subWarehouse.districtId);
  return { stock: enrichStock(updatedStock), movement };
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

  if (quantity <= 0) throw new Error('Quantity must be positive for reallocation');
  if (fromSubWarehouseId === toSubWarehouseId) throw new Error('Source and destination must differ');

  const { totalField, remainingField } = getFields(emkType);

  const fromStock = await prisma.stock.findUnique({ where: { subWarehouseId: fromSubWarehouseId } });
  const toStock   = await prisma.stock.findUnique({ where: { subWarehouseId: toSubWarehouseId } });

  if (!fromStock) throw new Error(`Source sub-warehouse stock not found`);
  if (!toStock)   throw new Error(`Destination sub-warehouse stock not found`);

  const fromRemaining = fromStock[remainingField as keyof typeof fromStock] as number;
  const toRemaining   = toStock[remainingField   as keyof typeof toStock]   as number;

  if (fromRemaining < quantity) {
    throw new Error(`Insufficient stock: source only has ${fromRemaining} ${emkType} remaining`);
  }

  const reasonText = reason ?? 'Cross-district reallocation';

  const [updatedFrom, updatedTo] = await prisma.$transaction([
    prisma.stock.update({
      where: { subWarehouseId: fromSubWarehouseId },
      data: {
        [totalField]:     { decrement: quantity },
        [remainingField]: fromRemaining - quantity,
      },
      include: { subWarehouse: { include: { district: { select: { name: true } } } } },
    }),
    prisma.stock.update({
      where: { subWarehouseId: toSubWarehouseId },
      data: {
        [totalField]:     { increment: quantity },
        [remainingField]: toRemaining + quantity,
      },
      include: { subWarehouse: { include: { district: { select: { name: true } } } } },
    }),
    prisma.stockMovement.create({
      data: {
        subWarehouseId: fromSubWarehouseId, emkType,
        movementType: MovementType.REALLOCATION,
        quantity: -quantity,
        reason: `${reasonText} → to ${toSubWarehouseId}`,
        performedById,
      },
    }),
    prisma.stockMovement.create({
      data: {
        subWarehouseId: toSubWarehouseId, emkType,
        movementType: MovementType.REALLOCATION,
        quantity,
        reason: `${reasonText} ← from ${fromSubWarehouseId}`,
        performedById,
      },
    }),
  ]);

  deleteCached(KEY_STATUS);
  invalidateCache(`dashboard:district:${updatedFrom.subWarehouse.districtId}`);
  invalidateCache(`dashboard:district:${updatedTo.subWarehouse.districtId}`);
  invalidateCache('dashboard:summary');

  return { from: enrichStock(updatedFrom), to: enrichStock(updatedTo) };
}

// ─── ADJUST — Manual correction at sub-warehouse ─────────────────────────────

export async function adjustStock(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;
  if (quantity === 0) throw new Error('Adjustment quantity cannot be 0');
  if (!reason?.trim()) throw new Error('Reason is required for manual adjustment');

  const { remainingField } = getFields(emkType);

  const stock = await prisma.stock.findUnique({ where: { subWarehouseId } });
  if (!stock) throw new Error(`No stock record found for sub-warehouse ${subWarehouseId}`);

  const currentRemaining = stock[remainingField as keyof typeof stock] as number;
  const newRemaining = currentRemaining + quantity;
  if (newRemaining < 0) {
    throw new Error(`Adjustment would result in negative stock: current=${currentRemaining}, adjustment=${quantity}`);
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
      data: { subWarehouseId, emkType, movementType: MovementType.ADJUSTMENT, quantity, reason, performedById },
    }),
  ]);

  deleteCached(KEY_STATUS);
  return { stock: enrichStock(updatedStock), movement };
}

// ─── GET MOVEMENTS ────────────────────────────────────────────────────────────

export async function getAllMovements() {
  return prisma.stockMovement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
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

export async function recordDelivery(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number;
  reason?: string;
  performedById: string;
}) {
  const { subWarehouseId, emkType, quantity, reason, performedById } = data;
  if (quantity <= 0) throw new Error('Quantity must be positive for delivery recording');

  const { remainingField } = getFields(emkType);

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
        subWarehouseId, emkType, movementType: MovementType.DELIVERY,
        quantity: -quantity,
        reason: reason ?? 'Household delivery',
        performedById,
      },
    }),
  ]);

  deleteCached(KEY_STATUS);
  const enriched = enrichStock(updatedStock);
  return { stock: enriched, movement, scarcityWarning: enriched.anyScarce };
}


// ─── REPLENISH CENTRAL WAREHOUSE ─────────────────────────────────────────────
// Called when new EMK stock arrives at central (donor shipment, MoH delivery).
// Increases both Total and Remaining — this is new stock entering the system.

export async function replenishCentral(data: {
  emkType: EmkType;
  quantity: number;
  reason: string;
}) {
  const { emkType, quantity, reason } = data;
  if (quantity <= 0) throw new Error('Quantity must be positive for replenishment');

  const { totalField, remainingField } = getFields(emkType);

  const central = await prisma.centralWarehouse.findFirst();
  if (!central) throw new Error('Central warehouse not found. Run seed.');

  const updated = await prisma.centralWarehouse.update({
    where: { id: central.id },
    data: {
      [totalField]:     { increment: quantity },
      [remainingField]: { increment: quantity },
    },
  });

  deleteCached(KEY_CENTRAL);
  invalidateCache('dashboard:summary');

  return {
    emkType,
    quantity,
    reason,
    updatedStock: {
      emk1Total: updated.emk1Total, emk1Remaining: updated.emk1Remaining,
      emk2Total: updated.emk2Total, emk2Remaining: updated.emk2Remaining,
      emk3Total: updated.emk3Total, emk3Remaining: updated.emk3Remaining,
    },
  };
}

// ─── ADJUST CENTRAL WAREHOUSE ─────────────────────────────────────────────────
// Manual correction only — signed quantity (+/-).
// Does NOT change Total — only Remaining (same as sub-warehouse adjust).

export async function adjustCentral(data: {
  emkType: EmkType;
  quantity: number;  // signed: positive = add, negative = remove
  reason: string;
}) {
  const { emkType, quantity, reason } = data;
  if (quantity === 0) throw new Error('Adjustment quantity cannot be 0');
  if (!reason?.trim()) throw new Error('Reason is required for manual adjustment');

  const { remainingField } = getFields(emkType);

  const central = await prisma.centralWarehouse.findFirst();
  if (!central) throw new Error('Central warehouse not found. Run seed.');

  const currentRemaining = central[remainingField as keyof typeof central] as number;
  const newRemaining = currentRemaining + quantity;

  if (newRemaining < 0) {
    throw new Error(
      `Adjustment would result in negative stock: current=${currentRemaining}, adjustment=${quantity}`
    );
  }

  const updated = await prisma.centralWarehouse.update({
    where: { id: central.id },
    data: { [remainingField]: newRemaining },
  });

  deleteCached(KEY_CENTRAL);
  invalidateCache('dashboard:summary');

  return {
    emkType,
    quantity,
    reason,
    updatedStock: {
      emk1Total: updated.emk1Total, emk1Remaining: updated.emk1Remaining,
      emk2Total: updated.emk2Total, emk2Remaining: updated.emk2Remaining,
      emk3Total: updated.emk3Total, emk3Remaining: updated.emk3Remaining,
    },
  };
}