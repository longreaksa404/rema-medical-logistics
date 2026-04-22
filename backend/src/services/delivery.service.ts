import { PrismaClient, DeliveryRunStatus, EmkType } from '@prisma/client';
import { recordDelivery } from './stock.service';

const prisma = new PrismaClient();

// ─── START A DELIVERY RUN ────────────────────────────────────────────────────
// Section B.5: Team Leader collects household list, loads EMKs, departs.
// Fixed departure times: 07:00, 11:00, 15:00 — but we record actual departure.

export async function startDeliveryRun(data: {
  subWarehouseId: string;
  teamNumber: number;
  zone: string;
  leadVolunteerId: string;
  performedById: string;
}) {
  const { subWarehouseId, teamNumber, zone, leadVolunteerId, performedById } = data;

  // Verify sub-warehouse exists
  const sw = await prisma.subWarehouse.findUnique({ where: { id: subWarehouseId } });
  if (!sw) throw new Error(`Sub-warehouse not found: ${subWarehouseId}`);

  // Verify volunteer exists
  const volunteer = await prisma.volunteer.findUnique({ where: { id: leadVolunteerId } });
  if (!volunteer) throw new Error(`Volunteer not found: ${leadVolunteerId}`);

  const run = await prisma.deliveryRun.create({
    data: {
      subWarehouseId,
      teamNumber,
      zone,
      departedAt: new Date(),
      status: DeliveryRunStatus.IN_PROGRESS,
      leadVolunteerId,
      performedById,
    },
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
      leadVolunteer: { select: { name: true, phone: true, role: true } },
      receipts: true,
    },
  });

  return run;
}

// ─── LIST DELIVERY RUNS ───────────────────────────────────────────────────────

export async function listDeliveryRuns(filters: {
  districtId?: string;
  status?: DeliveryRunStatus;
}) {
  const where: Record<string, unknown> = {};

  if (filters.status) where.status = filters.status;

  // Filter by district: go through subWarehouse → district
  if (filters.districtId) {
    const sw = await prisma.subWarehouse.findUnique({
      where: { districtId: filters.districtId },
    });
    if (sw) where.subWarehouseId = sw.id;
  }

  return prisma.deliveryRun.findMany({
    where,
    orderBy: { departedAt: 'desc' },
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
      leadVolunteer: { select: { name: true, phone: true } },
      receipts: {
        select: { id: true, emkType: true, quantity: true, deliveredAt: true },
      },
    },
  });
}

// ─── GET SINGLE RUN WITH RECEIPTS ────────────────────────────────────────────

export async function getDeliveryRun(id: string) {
  const run = await prisma.deliveryRun.findUnique({
    where: { id },
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
      leadVolunteer: { select: { name: true, phone: true, role: true } },
      receipts: {
        orderBy: { deliveredAt: 'asc' },
        include: {
          household: {
            select: {
              address: true,
              totalScore: true,
              priorityBand: true,
              recommendedEmk: true,
            },
          },
        },
      },
    },
  });

  if (!run) throw new Error('Delivery run not found');
  return run;
}

// ─── RECORD DELIVERY RECEIPT ──────────────────────────────────────────────────
// Section B.5: At each household, confirm identity, deliver EMK, get signature.
// Also decrements stock at the sub-warehouse via recordDelivery().

export async function createDeliveryReceipt(data: {
  deliveryRunId: string;
  householdId: string;
  emkType: EmkType;
  quantity: number;
  deliveredAt: Date;
  notes?: string;
  performedById: string;
}) {
  const { deliveryRunId, householdId, emkType, quantity, deliveredAt, notes, performedById } = data;

  // Verify run exists and is IN_PROGRESS
  const run = await prisma.deliveryRun.findUnique({ where: { id: deliveryRunId } });
  if (!run) throw new Error('Delivery run not found');
  if (run.status !== DeliveryRunStatus.IN_PROGRESS) {
    throw new Error(`Cannot add receipts to a run with status: ${run.status}`);
  }

  // Verify household exists
  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) throw new Error(`Household not found: ${householdId}`);
  if (household.delivered) {
    throw new Error(`Household ${householdId} has already been marked as delivered`);
  }

  // Step 1: Decrement stock at sub-warehouse (audit trail created in stock_movements)
  await recordDelivery({
    subWarehouseId: run.subWarehouseId,
    emkType,
    quantity,
    reason: `Delivery to household ${householdId} — run ${deliveryRunId}`,
    performedById,
  });

  // Step 2: Create delivery receipt + mark household delivered
  const [receipt] = await prisma.$transaction([
    prisma.deliveryReceipt.create({
      data: {
        deliveryRunId,
        householdId,
        emkType,
        quantity,
        deliveredAt,
        notes: notes ?? null,
      },
      include: {
        household: {
          select: {
            address: true,
            totalScore: true,
            priorityBand: true,
          },
        },
      },
    }),
    prisma.household.update({
      where: { id: householdId },
      data: {
        delivered: true,
        deliveredAt,
      },
    }),
  ]);

  return receipt;
}

// ─── COMPLETE A DELIVERY RUN ──────────────────────────────────────────────────
// Section B.5: Team returns to sub-warehouse, submits signed receipts,
// reports new critical cases verbally.

export async function completeDeliveryRun(id: string, performedById: string) {
  const run = await prisma.deliveryRun.findUnique({
    where: { id },
    include: { receipts: true },
  });

  if (!run) throw new Error('Delivery run not found');
  if (run.status === DeliveryRunStatus.COMPLETE) {
    throw new Error('Delivery run is already complete');
  }
  if (run.status === DeliveryRunStatus.ABORTED) {
    throw new Error('Cannot complete an aborted run');
  }

  // Verify the person completing is the one who started it (or above — checked at route level)
  const updated = await prisma.deliveryRun.update({
    where: { id },
    data: {
      status: DeliveryRunStatus.COMPLETE,
      returnedAt: new Date(),
    },
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
      leadVolunteer: { select: { name: true, phone: true } },
      receipts: {
        include: {
          household: { select: { address: true, priorityBand: true } },
        },
      },
    },
  });

  return updated;
}

// ─── ABORT A DELIVERY RUN ─────────────────────────────────────────────────────
// Section A.4: Volunteer safety — if water exceeds 80cm mid-run, suspend delivery.
// Hub Manager can abort a run with a reason.

export async function abortDeliveryRun(id: string, reason: string) {
  const run = await prisma.deliveryRun.findUnique({ where: { id } });
  if (!run) throw new Error('Delivery run not found');
  if (run.status !== DeliveryRunStatus.IN_PROGRESS) {
    throw new Error(`Cannot abort run with status: ${run.status}`);
  }

  return prisma.deliveryRun.update({
    where: { id },
    data: {
      status: DeliveryRunStatus.ABORTED,
      returnedAt: new Date(),
    },
    include: {
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
      leadVolunteer: { select: { name: true } },
      receipts: true,
    },
  });
}``