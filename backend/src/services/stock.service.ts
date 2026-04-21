import { PrismaClient, EmkType, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

// ─── SCARCITY THRESHOLD ───────────────────────────────────────────────────────
// Section C.9: Scarcity mode triggers when TOTAL stock across ALL sub-warehouses
// falls below 30% of the ORIGINAL allocation (emk1Total + emk2Total + emk3Total
// at dispatch time — stored as *Total fields).
// We compute per sub-warehouse and flag if ANY sub-warehouse is in scarcity.

export function isInScarcity(
  remaining: number,
  total: number
): boolean {
  if (total === 0) return false;
  return remaining / total < 0.3;
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

export async function getAllStock(): Promise<StockWithScarcity[]> {
  const records = await prisma.stock.findMany({
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
    },
    orderBy: { subWarehouse: { district: { name: 'asc' } } },
  });

  return records.map(enrichStock);
}

// ─── GET STOCK BY DISTRICT ────────────────────────────────────────────────────

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
// Note: This adds to *Total AND *Remaining — initial dispatch sets baseline.
// For resupply top-ups, total increases too (new baseline for scarcity calc).

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

  // Build field update based on EMK type
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
        quantity: quantity, // positive = stock coming in
        reason: reason ?? 'Central warehouse dispatch',
        performedById,
      },
    }),
  ]);

  // Special rule for EMK-3: activate sub-warehouse status if this is a MoH transfer
  // (detected by emkType = EMK3 — only ever dispatched by MoH)
  if (emkType === 'EMK3') {
    await prisma.stockMovement.update({
      where: { id: movement.id },
      data: { movementType: MovementType.MOH_TRANSFER },
    });
  }

  return {
    stock: enrichStock(updatedStock),
    movement,
  };
}

// ─── REALLOCATE — Cross-District ─────────────────────────────────────────────
// Emergency Coordinator only (enforced at route level).
// Moves stock from one sub-warehouse to another.
// Creates two movement records: negative (from) and positive (to).

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
    // Decrease source
    prisma.stock.update({
      where: { subWarehouseId: fromSubWarehouseId },
      data: { [remainingField]: fromRemaining - quantity },
      include: { subWarehouse: { include: { district: { select: { name: true } } } } },
    }),
    // Increase destination
    prisma.stock.update({
      where: { subWarehouseId: toSubWarehouseId },
      data: { [remainingField]: toRemaining + quantity },
      include: { subWarehouse: { include: { district: { select: { name: true } } } } },
    }),
    // Movement record: outbound from source (negative)
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
    // Movement record: inbound to destination (positive)
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

  return {
    from: enrichStock(updatedFrom),
    to: enrichStock(updatedTo),
  };
}

// ─── ADJUST — Manual with reason ─────────────────────────────────────────────
// Hub Manager. Positive = add, negative = remove. Always requires reason.

export async function adjustStock(data: {
  subWarehouseId: string;
  emkType: EmkType;
  quantity: number; // can be negative
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
        quantity, // positive or negative
        reason,
        performedById,
      },
    }),
  ]);

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
// Called internally when a delivery receipt is recorded (Chat 6).
// Decrements remaining stock at the source sub-warehouse.

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
        quantity: -quantity, // negative = stock going out
        reason: reason ?? 'Household delivery',
        performedById,
      },
    }),
  ]);

  return {
    stock: enrichStock(updatedStock),
    movement,
    scarcityWarning: enrichStock(updatedStock).anyScarce,
  };
}