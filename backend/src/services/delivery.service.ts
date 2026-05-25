import { DeliveryRunStatus, EmkType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { recordDelivery } from './stock.service';
import { invalidateQueueCache } from './household.service';
import { getCached, setCached, deleteCached } from '../utils/cache';

const KEY_ALL = 'delivery:runs:all';
const KEY_DISTRICT_PREFIX = 'delivery:runs:district:';
const TTL = 10_000;

function invalidateRunsCache(districtId?: string): void {
  deleteCached(KEY_ALL);
  if (districtId) {
    deleteCached(`${KEY_DISTRICT_PREFIX}${districtId}`);
  } else {
    deleteCached(KEY_DISTRICT_PREFIX);
  }
}

// reset all volunteers who were deployed under this team back to AVAILABLE
async function returnTeamToBase(subWarehouseId: string, teamNumber: number): Promise<void> {
  const sw = await prisma.subWarehouse.findUnique({ where: { id: subWarehouseId } });
  if (!sw) return;

  // find volunteers in this district who are DEPLOYED and whose most recent
  // assignment matches this team number — those are the ones returning
  const deployed = await prisma.volunteer.findMany({
    where: {
      districtId: sw.districtId,
      status: 'DEPLOYED',
    },
    include: {
      assignments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const returningIds = deployed
    .filter(v => v.assignments[0]?.teamNumber === teamNumber)
    .map(v => v.id);

  if (returningIds.length === 0) return;

  await prisma.volunteer.updateMany({
    where: { id: { in: returningIds } },
    data: { status: 'AVAILABLE' },
  });

  // bust volunteer roster cache for this district
  deleteCached(`volunteers:roster:${sw.districtId}`);
  deleteCached('volunteers:list');
}

// ─── START A DELIVERY RUN ────────────────────────────────────────────────────

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

export async function listDeliveryRuns(filters: {
  districtId?: string;
  status?: DeliveryRunStatus;
}) {
  if (filters.districtId) {
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
        select: { id: true, emkType: true, quantity: true, deliveredAt: true, householdId: true },
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
        select: { id: true, emkType: true, quantity: true, deliveredAt: true, householdId: true },
      },
    },
  });
}

// ─── GET SINGLE RUN WITH RECEIPTS ────────────────────────────────────────────

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

export async function createDeliveryReceipt(data: {
  deliveryRunId: string;
  householdId: string;
  kits: Array<{ emkType: EmkType; quantity: number }>;
  deliveredAt: Date;
  notes?: string;
  performedById: string;
}) {
  const { deliveryRunId, householdId, kits, deliveredAt, notes, performedById } = data;

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

  // deduct each EMK type from stock separately — this is the core fix
  for (const kit of kits) {
    await recordDelivery({
      subWarehouseId: run.subWarehouseId,
      emkType: kit.emkType,
      quantity: kit.quantity,
      reason: `Delivery to household ${householdId} — run ${deliveryRunId}`,
      performedById,
    });
  }

  // create one receipt row per kit type, mark household delivered once
  const receipts = await prisma.$transaction([
    ...kits.map(kit =>
      prisma.deliveryReceipt.create({
        data: {
          deliveryRunId,
          householdId,
          emkType: kit.emkType,
          quantity: kit.quantity,
          deliveredAt,
          notes: notes ?? null,
        },
      })
    ),
    prisma.household.update({
      where: { id: householdId },
      data: { delivered: true, deliveredAt },
    }),
  ]);

  // last item in transaction is the household update — receipts are everything before it
  const createdReceipts = receipts.slice(0, kits.length);

  invalidateQueueCache(household.districtId);
  const sw = await prisma.subWarehouse.findUnique({ where: { id: run.subWarehouseId } });
  if (sw) invalidateRunsCache(sw.districtId);

  return createdReceipts;
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

  // return team volunteers to AVAILABLE now that run is complete
  await returnTeamToBase(run.subWarehouseId, run.teamNumber);

  const sw = await prisma.subWarehouse.findUnique({ where: { id: run.subWarehouseId } });
  if (sw) invalidateRunsCache(sw.districtId);
  return updated;
}

// ─── ABORT A DELIVERY RUN ─────────────────────────────────────────────────────

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

  // return team volunteers to AVAILABLE — aborted run means team stood down
  await returnTeamToBase(run.subWarehouseId, run.teamNumber);

  const sw = await prisma.subWarehouse.findUnique({ where: { id: run.subWarehouseId } });
  if (sw) invalidateRunsCache(sw.districtId);
  return updated;
}