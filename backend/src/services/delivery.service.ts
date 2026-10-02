import { DeliveryRunStatus, EmkType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { recordDelivery, invalidateStockCache, TX_OPTIONS } from './stock.service';
import { ConflictError, NotFoundError } from '../lib/errors';
import { invalidateQueueCache } from './household.service';
import { getCached, setCached, deleteCached } from '../utils/cache';

const KEY_ALL = 'delivery:runs:all';
const KEY_DISTRICT_PREFIX = 'delivery:runs:district:';
const TTL = 10_000;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 10;

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
// Returns active runs in full + paginated history separately.
// Active runs are always needed whole — complete/abort buttons depend on them.
// History grows unbounded across flood events — paginated.

export async function listDeliveryRuns(filters: {
  districtId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ active: object[]; history: PaginatedResult<object> }> {
  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  if (filters.districtId) {
    const sw = await prisma.subWarehouse.findUnique({
      where: { districtId: filters.districtId },
    });
    if (!sw) return { active: [], history: { data: [], total: 0, page, pageSize, totalPages: 0 } };

    return fetchRunsByWarehouse(sw.id, page, pageSize);
  }

  return fetchAllRuns(page, pageSize);
}

async function fetchAllRuns(
  page: number,
  pageSize: number
): Promise<{ active: object[]; history: PaginatedResult<object> }> {
  const include = {
    subWarehouse: { include: { district: { select: { name: true } } } },
    leadVolunteer: { select: { name: true, phone: true } },
    receipts: {
      select: { id: true, emkType: true, quantity: true, deliveredAt: true, householdId: true },
    },
  };

  const [active, historyData, historyTotal] = await prisma.$transaction([
    prisma.deliveryRun.findMany({
      where: { status: 'IN_PROGRESS' },
      orderBy: { departedAt: 'desc' },
      include,
    }),
    prisma.deliveryRun.findMany({
      where: { status: { not: 'IN_PROGRESS' } },
      orderBy: { departedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    }),
    prisma.deliveryRun.count({ where: { status: { not: 'IN_PROGRESS' } } }),
  ]);

  return {
    active,
    history: {
      data: historyData,
      total: historyTotal,
      page,
      pageSize,
      totalPages: Math.ceil(historyTotal / pageSize),
    },
  };
}

async function fetchRunsByWarehouse(
  subWarehouseId: string,
  page: number,
  pageSize: number
): Promise<{ active: object[]; history: PaginatedResult<object> }> {
  const include = {
    subWarehouse: { include: { district: { select: { name: true } } } },
    leadVolunteer: { select: { name: true, phone: true } },
    receipts: {
      select: { id: true, emkType: true, quantity: true, deliveredAt: true, householdId: true },
    },
  };

  const [active, historyData, historyTotal] = await prisma.$transaction([
    prisma.deliveryRun.findMany({
      where: { subWarehouseId, status: 'IN_PROGRESS' },
      orderBy: { departedAt: 'desc' },
      include,
    }),
    prisma.deliveryRun.findMany({
      where: { subWarehouseId, status: { not: 'IN_PROGRESS' } },
      orderBy: { departedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    }),
    prisma.deliveryRun.count({
      where: { subWarehouseId, status: { not: 'IN_PROGRESS' } },
    }),
  ]);

  return {
    active,
    history: {
      data: historyData,
      total: historyTotal,
      page,
      pageSize,
      totalPages: Math.ceil(historyTotal / pageSize),
    },
  };
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
// Everything happens in ONE transaction: claim the household, deduct each kit
// from stock, write the movement logs and receipts. If any kit is short, nothing
// is deducted and the household stays undelivered.

export async function createDeliveryReceipt(data: {
  deliveryRunId: string;
  householdId: string;
  kits: Array<{ emkType: EmkType; quantity: number }>;
  deliveredAt: Date;
  notes?: string;
  performedById: string;
}) {
  const { deliveryRunId, householdId, kits, deliveredAt, notes, performedById } = data;

  const { receipts, districtId } = await prisma.$transaction(async (tx) => {
    // Touch the run row while it is IN_PROGRESS — this takes a row lock, so a
    // concurrent complete/abort waits for us instead of racing.
    const lockedRun = await tx.deliveryRun.updateMany({
      where: { id: deliveryRunId, status: DeliveryRunStatus.IN_PROGRESS },
      data:  { updatedAt: new Date() },
    });
    const run = await tx.deliveryRun.findUnique({ where: { id: deliveryRunId } });
    if (!run) throw new NotFoundError('Delivery run not found');
    if (lockedRun.count === 0) {
      throw new ConflictError(`Cannot add receipts to a run with status: ${run.status}`);
    }

    const household = await tx.household.findUnique({ where: { id: householdId } });
    if (!household) throw new NotFoundError(`Household not found: ${householdId}`);

    // Claim the household — only one concurrent request can flip delivered false → true
    const claimed = await tx.household.updateMany({
      where: { id: householdId, delivered: false },
      data:  { delivered: true, deliveredAt },
    });
    if (claimed.count === 0) {
      throw new ConflictError(`Household ${householdId} has already been marked as delivered`);
    }

    for (const kit of kits) {
      await recordDelivery(tx, {
        subWarehouseId: run.subWarehouseId,
        emkType: kit.emkType,
        quantity: kit.quantity,
        reason: `Delivery to ${household.address} - Team ${run.teamNumber} (${run.zone})`,
        performedById,
      });
    }

    const receipts = [];
    for (const kit of kits) {
      receipts.push(await tx.deliveryReceipt.create({
        data: {
          deliveryRunId,
          householdId,
          emkType: kit.emkType,
          quantity: kit.quantity,
          deliveredAt,
          notes: notes ?? null,
        },
      }));
    }

    return { receipts, districtId: household.districtId };
  }, TX_OPTIONS);

  invalidateQueueCache(districtId);
  invalidateRunsCache(districtId);
  invalidateStockCache(districtId);

  return receipts;
}


// ─── RUN STATUS TRANSITION ────────────────────────────────────────────────────
// IN_PROGRESS → COMPLETE | ABORTED. The conditional update means a run can only
// leave IN_PROGRESS once, even if complete and abort arrive at the same time.

async function closeRun(id: string, status: 'COMPLETE' | 'ABORTED') {
  const { count } = await prisma.deliveryRun.updateMany({
    where: { id, status: DeliveryRunStatus.IN_PROGRESS },
    data:  { status, returnedAt: new Date() },
  });

  const run = await prisma.deliveryRun.findUnique({
    where: { id },
    include: { subWarehouse: { select: { districtId: true } } },
  });
  if (!run) throw new NotFoundError('Delivery run not found');

  if (count === 0) {
    if (status === 'COMPLETE' && run.status === DeliveryRunStatus.COMPLETE) {
      throw new ConflictError('Delivery run is already complete');
    }
    if (status === 'COMPLETE' && run.status === DeliveryRunStatus.ABORTED) {
      throw new ConflictError('Cannot complete an aborted run');
    }
    throw new ConflictError(`Cannot abort run with status: ${run.status}`);
  }

  // return team volunteers to AVAILABLE — run is over either way
  await returnTeamToBase(run.subWarehouseId, run.teamNumber);
  invalidateRunsCache(run.subWarehouse.districtId);
}

// ─── COMPLETE A DELIVERY RUN ──────────────────────────────────────────────────

export async function completeDeliveryRun(id: string, _performedById: string) {
  await closeRun(id, 'COMPLETE');
  return prisma.deliveryRun.findUniqueOrThrow({
    where: { id },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
      leadVolunteer: { select: { name: true, phone: true } },
      receipts: {
        include: { household: { select: { address: true, priorityBand: true } } },
      },
    },
  });
}

// ─── ABORT A DELIVERY RUN ─────────────────────────────────────────────────────

export async function abortDeliveryRun(id: string, _reason: string) {
  await closeRun(id, 'ABORTED');
  return prisma.deliveryRun.findUniqueOrThrow({
    where: { id },
    include: {
      subWarehouse: { include: { district: { select: { name: true } } } },
      leadVolunteer: { select: { name: true } },
      receipts: true,
    },
  });
}
