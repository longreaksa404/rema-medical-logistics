import { DeliveryRunStatus, EmkType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { recordDelivery } from './stock.service';
import { invalidateQueueCache } from './household.service';
import { getCached, setCached, deleteCached } from '../utils/cache';

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
// Delivery runs list is polled by Hub Manager portal and the V1 dashboard.
// 10 s TTL — runs change state frequently (start/complete/abort) during active ops.
// Per-district keys allow targeted invalidation from the Hub Manager's district.

const KEY_ALL = 'delivery:runs:all';
const KEY_DISTRICT_PREFIX = 'delivery:runs:district:';
const TTL = 10_000; // 10 s

function invalidateRunsCache(districtId?: string): void {
  deleteCached(KEY_ALL);
  if (districtId) {
    deleteCached(`${KEY_DISTRICT_PREFIX}${districtId}`);
  } else {
    deleteCached(KEY_DISTRICT_PREFIX);
  }
}

// ─── START A DELIVERY RUN ────────────────────────────────────────────────────
// Section B.5: Team Leader collects household list, loads EMKs, departs.

export async function startDeliveryRun(data: {
  subWarehouseId: string;
  teamNumber: number;
  zone: string;
  leadVolunteerId: string;
  performedById: string;
}) {
  const { subWarehouseId, teamNumber, zone, leadVolunteerId, performedById } = data;

  const sw = await prisma.subWarehouse.findUnique({ where: { id: subWarehouseId } });
  if (!sw) throw new Error(`Sub-warehouse not found: ${subWarehouseId}`);

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
      subWarehouse: { include: { district: { select: { name: true } } } },
      leadVolunteer: { select: { name: true, phone: true, role: true } },
      receipts: true,
    },
  });

  invalidateRunsCache(sw.districtId);
  return run;
}

// ─── LIST DELIVERY RUNS ───────────────────────────────────────────────────────
// Cached 10 s. Status filter applied in-memory when using cached data.

export async function listDeliveryRuns(filters: {
  districtId?: string;
  status?: DeliveryRunStatus;
}) {
  if (filters.districtId) {
    // District-scoped cache
    const key = `${KEY_DISTRICT_PREFIX}${filters.districtId}`;
    const sw = await prisma.subWarehouse.findUnique({
      where: { districtId: filters.districtId },
    });

    if (!sw) return [];

    const cached = getCached<Awaited<ReturnType<typeof fetchRunsByWarehouse>>>(key);
    const all = cached ?? await (async () => {
      const result = await fetchRunsByWarehouse(sw.id);
      setCached(key, result, TTL);
      return result;
    })();

    return filters.status ? all.filter(r => r.status === filters.status) : all;
  }

  // All-runs cache (used by dashboard)
  const cached = getCached<Awaited<ReturnType<typeof fetchAllRuns>>>(KEY_ALL);
  const all = cached ?? await (async () => {
    const result = await fetchAllRuns();
    setCached(KEY_ALL, result, TTL);
    return result;
  })();

  return filters.status ? all.filter(r => r.status === filters.status) : all;
}

async function fetchAllRuns() {
  return prisma.deliveryRun.findMany({
    orderBy: { departedAt: 'desc' },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
      leadVolunteer: { select: { name: true, phone: true } },
      receipts: {
        select: { id: true, emkType: true, quantity: true, deliveredAt: true },
      },
    },
  });
}

async function fetchRunsByWarehouse(subWarehouseId: string) {
  return prisma.deliveryRun.findMany({
    where: { subWarehouseId },
    orderBy: { departedAt: 'desc' },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
      leadVolunteer: { select: { name: true, phone: true } },
      receipts: {
        select: { id: true, emkType: true, quantity: true, deliveredAt: true },
      },
    },
  });
}

// ─── GET SINGLE RUN WITH RECEIPTS ────────────────────────────────────────────
// Not cached — full detail view with receipt + household data; changes per receipt.

export async function getDeliveryRun(id: string) {
  const run = await prisma.deliveryRun.findUnique({
    where: { id },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
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
// Section B.5: Confirm household identity, deliver EMK, get signature.

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

  const run = await prisma.deliveryRun.findUnique({ where: { id: deliveryRunId } });
  if (!run) throw new Error('Delivery run not found');
  if (run.status !== DeliveryRunStatus.IN_PROGRESS) {
    throw new Error(`Cannot add receipts to a run with status: ${run.status}`);
  }

  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) throw new Error(`Household not found: ${householdId}`);
  if (household.delivered) {
    throw new Error(`Household ${householdId} has already been marked as delivered`);
  }

  await recordDelivery({
    subWarehouseId: run.subWarehouseId,
    emkType,
    quantity,
    reason: `Delivery to household ${householdId} — run ${deliveryRunId}`,
    performedById,
  });

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
          select: { address: true, totalScore: true, priorityBand: true },
        },
      },
    }),
    prisma.household.update({
      where: { id: householdId },
      data: { delivered: true, deliveredAt },
    }),
  ]);

  // Household is delivered — remove from priority queue cache
  invalidateQueueCache(household.districtId);
  // Run has a new receipt — bust runs list cache for this district
  const sw = await prisma.subWarehouse.findUnique({ where: { id: run.subWarehouseId } });
  if (sw) invalidateRunsCache(sw.districtId);

  return receipt;
}

// ─── COMPLETE A DELIVERY RUN ──────────────────────────────────────────────────

export async function completeDeliveryRun(id: string, performedById: string) {
  const run = await prisma.deliveryRun.findUnique({
    where: { id },
    include: { receipts: true },
  });

  if (!run) throw new Error('Delivery run not found');
  if (run.status === DeliveryRunStatus.COMPLETE) throw new Error('Delivery run is already complete');
  if (run.status === DeliveryRunStatus.ABORTED) throw new Error('Cannot complete an aborted run');

  const updated = await prisma.deliveryRun.update({
    where: { id },
    data: { status: DeliveryRunStatus.COMPLETE, returnedAt: new Date() },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
      leadVolunteer: { select: { name: true, phone: true } },
      receipts: {
        include: { household: { select: { address: true, priorityBand: true } } },
      },
    },
  });

  const sw = await prisma.subWarehouse.findUnique({ where: { id: run.subWarehouseId } });
  if (sw) invalidateRunsCache(sw.districtId);

  return updated;
}

// ─── ABORT A DELIVERY RUN ─────────────────────────────────────────────────────
// Section A.4: Volunteer safety — suspend delivery above 80cm water depth.

export async function abortDeliveryRun(id: string, reason: string) {
  const run = await prisma.deliveryRun.findUnique({ where: { id } });
  if (!run) throw new Error('Delivery run not found');
  if (run.status !== DeliveryRunStatus.IN_PROGRESS) {
    throw new Error(`Cannot abort run with status: ${run.status}`);
  }

  const updated = await prisma.deliveryRun.update({
    where: { id },
    data: { status: DeliveryRunStatus.ABORTED, returnedAt: new Date() },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
      leadVolunteer: { select: { name: true } },
      receipts: true,
    },
  });

  const sw = await prisma.subWarehouse.findUnique({ where: { id: run.subWarehouseId } });
  if (sw) invalidateRunsCache(sw.districtId);

  return updated;
}