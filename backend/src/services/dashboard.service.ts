import { PrismaClient } from '@prisma/client';
import { isInScarcity } from '../utils/stock.utils';
import { getCached, setCached, deleteCached } from '../utils/cache';

const prisma = new PrismaClient();

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
const KEY_SUMMARY = 'dashboard:summary';
const KEY_DISTRICT_PREFIX = 'dashboard:district:';

/**
 * Invalidate specific dashboard cache keys or clear all dashboard entries.
 * Called by alert.service on phase change and stock.service on dispatch/reallocate.
 *
 * @param key — optional specific key (e.g. 'dashboard:district:abc').
 *              Pass nothing to flush all dashboard:* entries.
 */
export function invalidateCache(key?: string): void {
  if (key) {
    deleteCached(key);
  } else {
    // Flush both summary and all per-district entries
    deleteCached(KEY_SUMMARY);
    deleteCached(KEY_DISTRICT_PREFIX); // prefix match — clears all district keys
  }
}

// ─── EXPORTED SERVICES ───────────────────────────────────────────────────────

/**
 * GET /api/dashboard/summary
 * Cached 15 s — heavy aggregation across all 3 districts.
 * Invalidated on phase change and stock dispatch/reallocate.
 */
export async function getDashboardSummary() {
  const cached = getCached<Awaited<ReturnType<typeof buildSummary>>>(KEY_SUMMARY);
  if (cached) return cached;

  const result = await buildSummary();
  setCached(KEY_SUMMARY, result, 15_000);
  return result;
}

/**
 * GET /api/dashboard/district/:id
 * Cached 10 s per district.
 * Key format: dashboard:district:{id} — allows targeted invalidation.
 */
export async function getDistrictDashboard(districtId: string) {
  const key = `${KEY_DISTRICT_PREFIX}${districtId}`;
  const cached = getCached<Awaited<ReturnType<typeof buildDistrictDashboard>>>(key);
  if (cached) return cached;

  const result = await buildDistrictDashboard(districtId);
  setCached(key, result, 10_000);
  return result;
}

// ─── PRIVATE BUILDERS ─────────────────────────────────────────────────────────

async function buildDistrictDashboard(districtId: string) {
  const district = await prisma.district.findUnique({
    where: { id: districtId },
    include: {
      subWarehouse: { include: { stock: true } },
    },
  });

  if (!district) throw new Error('District not found');

  const sw = district.subWarehouse;
  const stock = sw?.stock;

  let stockPct = 0;
  let anyScarce = false;

  if (stock) {
    const components = [
      stock.emk1Total > 0 ? (stock.emk1Remaining / stock.emk1Total) * 100 : null,
      stock.emk2Total > 0 ? (stock.emk2Remaining / stock.emk2Total) * 100 : null,
      stock.emk3Total > 0 ? (stock.emk3Remaining / stock.emk3Total) * 100 : null,
    ].filter((x): x is number => x !== null);

    stockPct = components.length > 0
      ? Math.round(components.reduce((a, b) => a + b, 0) / components.length)
      : 0;

    anyScarce =
      isInScarcity(stock.emk1Remaining, stock.emk1Total) ||
      isInScarcity(stock.emk2Remaining, stock.emk2Total) ||
      isInScarcity(stock.emk3Remaining, stock.emk3Total);
  }

  const [householdCounts, openIncidents, activeRuns] = await Promise.all([
    prisma.household.groupBy({
      by: ['delivered'],
      where: { districtId },
      _count: { _all: true },
    }),
    prisma.incident.count({
      where: { districtId, status: { in: ['OPEN', 'ESCALATED'] } },
    }),
    prisma.deliveryRun.count({
      where: {
        subWarehouseId: sw?.id,
        status: 'IN_PROGRESS',
      },
    }),
  ]);

  const householdsAssessed = householdCounts.reduce((sum, row) => sum + row._count._all, 0);
  const deliveredCount = householdCounts.find((r) => r.delivered === true)?._count._all ?? 0;

  const recentCheckins = await prisma.radioCheckin.findMany({
    where: { districtId },
    orderBy: { createdAt: 'desc' },
    take: 4,
    include: {
      submittedBy: { select: { name: true } },
    },
  });

  return {
    districtId,
    name: district.name,
    population: district.population,
    subWarehouseId: sw?.id ?? null,
    subWarehouseStatus: sw?.status ?? null,
    stockPct,
    anyScarce,
    stock: stock
      ? {
          emk1Total: stock.emk1Total,
          emk1Remaining: stock.emk1Remaining,
          emk2Total: stock.emk2Total,
          emk2Remaining: stock.emk2Remaining,
          emk3Total: stock.emk3Total,
          emk3Remaining: stock.emk3Remaining,
        }
      : null,
    householdsAssessed,
    deliveredCount,
    openIncidents,
    activeDeliveryRuns: activeRuns,
    recentRadioCheckins: recentCheckins,
  };
}

async function buildSummary() {
  const [
    alert,
    districts,
    globalHouseholdCounts,
    districtHouseholdCounts,
    districtIncidentCounts,
    activeRuns,
    todayCheckins,
  ] = await Promise.all([
    prisma.floodAlert.findFirst({ orderBy: { createdAt: 'desc' } }),

    prisma.district.findMany({
      orderBy: { name: 'asc' },
      include: { subWarehouse: { include: { stock: true } } },
    }),

    prisma.household.groupBy({
      by: ['priorityBand', 'delivered'],
      _count: { _all: true },
    }),

    prisma.household.groupBy({
      by: ['districtId', 'delivered'],
      _count: { _all: true },
    }),

    prisma.incident.groupBy({
      by: ['districtId'],
      where: { status: { in: ['OPEN', 'ESCALATED'] } },
      _count: { _all: true },
    }),

    prisma.deliveryRun.count({ where: { status: 'IN_PROGRESS' } }),

    (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return prisma.radioCheckin.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      });
    })(),
  ]);

  let critical = 0, high = 0, medium = 0, standard = 0, delivered = 0;

  for (const row of globalHouseholdCounts) {
    const n = row._count._all;
    if (row.delivered) {
      delivered += n;
    } else {
      switch (row.priorityBand) {
        case 'CRITICAL': critical += n; break;
        case 'HIGH':     high    += n; break;
        case 'MEDIUM':   medium  += n; break;
        case 'STANDARD': standard += n; break;
      }
    }
  }

  const householdMap = new Map<string, { total: number; deliveredCount: number }>();
  for (const row of districtHouseholdCounts) {
    const id = row.districtId;
    const existing = householdMap.get(id) ?? { total: 0, deliveredCount: 0 };
    existing.total += row._count._all;
    if (row.delivered) existing.deliveredCount += row._count._all;
    householdMap.set(id, existing);
  }

  const incidentMap = new Map<string, number>();
  for (const row of districtIncidentCounts) {
    incidentMap.set(row.districtId, row._count._all);
  }

  const openIncidents = await prisma.incident.findMany({
    where: { status: { in: ['OPEN', 'ESCALATED'] } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 10,
    include: {
      district: { select: { name: true } },
      reportedBy: { select: { name: true, role: true } },
    },
  });

  const districtCards = districts.map((d) => {
    const sw = d.subWarehouse;
    const stock = sw?.stock ?? null;

    let stockPct = 0;
    let anyScarce = false;

    if (stock) {
      const components = [
        stock.emk1Total > 0 ? (stock.emk1Remaining / stock.emk1Total) * 100 : null,
        stock.emk2Total > 0 ? (stock.emk2Remaining / stock.emk2Total) * 100 : null,
        stock.emk3Total > 0 ? (stock.emk3Remaining / stock.emk3Total) * 100 : null,
      ].filter((x): x is number => x !== null);

      stockPct = components.length > 0
        ? Math.round(components.reduce((a, b) => a + b, 0) / components.length)
        : 0;

      anyScarce =
        isInScarcity(stock.emk1Remaining, stock.emk1Total) ||
        isInScarcity(stock.emk2Remaining, stock.emk2Total) ||
        isInScarcity(stock.emk3Remaining, stock.emk3Total);
    }

    const householdData = householdMap.get(d.id) ?? { total: 0, deliveredCount: 0 };
    const openCount = incidentMap.get(d.id) ?? 0;

    return {
      districtId: d.id,
      name: d.name,
      population: d.population,
      subWarehouseId: sw?.id ?? null,
      subWarehouseStatus: sw?.status ?? null,
      stockPct,
      anyScarce,
      stock: stock
        ? {
            emk1Total: stock.emk1Total,
            emk1Remaining: stock.emk1Remaining,
            emk2Total: stock.emk2Total,
            emk2Remaining: stock.emk2Remaining,
            emk3Total: stock.emk3Total,
            emk3Remaining: stock.emk3Remaining,
          }
        : null,
      householdsAssessed: householdData.total,
      deliveredCount: householdData.deliveredCount,
      openIncidents: openCount,
    };
  });

  return {
    phase: alert?.phase ?? 0,
    activated: alert?.activated ?? false,
    activatedAt: alert?.activatedAt ?? null,
    triggerConditions: alert
      ? {
          warningLevelTwo: alert.warningLevelTwo,
          rainfallExceeds100mm: alert.rainfallExceeds100mm,
          streetFloodingReport: alert.streetFloodingReport,
        }
      : null,
    households: {
      critical,
      high,
      medium,
      standard,
      delivered,
      total: critical + high + medium + standard + delivered,
      pendingDelivery: critical + high + medium + standard,
    },
    activeDeliveryRuns: activeRuns,
    todayRadioCheckins: todayCheckins,
    districts: districtCards,
    openIncidents,
  };
}