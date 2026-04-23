import { PrismaClient } from '@prisma/client';
import { isInScarcity } from './stock.service';

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

// Cache invalidation — call this when data changes
export function invalidateCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear(); // clear everything on phase change
  }
}

const prisma = new PrismaClient();

// ─── FULL DASHBOARD SUMMARY ───────────────────────────────────────────────────
// Used by GET /api/dashboard/summary
// Powers V1 Operations Dashboard: phase banner, district cards, stock chart,
// priority queue, incidents, notifications aggregation.

export async function getDashboardSummary() {
  // 1. Current flood alert state
  const alert = await prisma.floodAlert.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  // 2. All districts with stock + households + incidents
  const districts = await prisma.district.findMany({
    orderBy: { name: 'asc' },
    include: {
      subWarehouse: {
        include: { stock: true },
      },
    },
  });

  // 3. Household band counts (global)
  const [critical, high, medium, standard, delivered] = await Promise.all([
    prisma.household.count({ where: { priorityBand: 'CRITICAL', delivered: false } }),
    prisma.household.count({ where: { priorityBand: 'HIGH', delivered: false } }),
    prisma.household.count({ where: { priorityBand: 'MEDIUM', delivered: false } }),
    prisma.household.count({ where: { priorityBand: 'STANDARD', delivered: false } }),
    prisma.household.count({ where: { delivered: true } }),
  ]);

  // 4. Global open incidents
  const openIncidents = await prisma.incident.findMany({
    where: { status: { in: ['OPEN', 'ESCALATED'] } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 10,
    include: {
      district: { select: { name: true } },
      reportedBy: { select: { name: true, role: true } },
    },
  });

  // 5. Per-district summary cards
  const districtCards = await Promise.all(
    districts.map(async (d) => {
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

      const [householdsAssessed, deliveredCount, openCount] = await Promise.all([
        prisma.household.count({ where: { districtId: d.id } }),
        prisma.household.count({ where: { districtId: d.id, delivered: true } }),
        prisma.incident.count({
          where: { districtId: d.id, status: { in: ['OPEN', 'ESCALATED'] } },
        }),
      ]);

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
        householdsAssessed,
        deliveredCount,
        openIncidents: openCount,
      };
    })
  );

  // 6. Active delivery runs count
  const activeRuns = await prisma.deliveryRun.count({
    where: { status: 'IN_PROGRESS' },
  });

  // 7. Today's radio check-in compliance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayCheckins = await prisma.radioCheckin.count({
    where: { createdAt: { gte: today, lt: tomorrow } },
  });

  return {
    // Alert/activation state
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

    // Household summary
    households: {
      critical,
      high,
      medium,
      standard,
      delivered,
      total: critical + high + medium + standard + delivered,
      pendingDelivery: critical + high + medium + standard,
    },

    // Operational
    activeDeliveryRuns: activeRuns,
    todayRadioCheckins: todayCheckins,

    // District cards (for dashboard district grid)
    districts: districtCards,

    // Open incidents (top 10, most urgent first)
    openIncidents,
  };
}

// ─── PER-DISTRICT SUMMARY (same as district.service but with scarcity flag) ───
// Used by GET /api/dashboard/district/:id and district cards

export async function getDistrictDashboard(districtId: string) {
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

  const [householdsAssessed, deliveredCount, openIncidents, activeRuns] = await Promise.all([
    prisma.household.count({ where: { districtId } }),
    prisma.household.count({ where: { districtId, delivered: true } }),
    prisma.incident.count({ where: { districtId, status: { in: ['OPEN', 'ESCALATED'] } } }),
    prisma.deliveryRun.count({
      where: {
        subWarehouseId: sw?.id,
        status: 'IN_PROGRESS',
      },
    }),
  ]);

  // Latest radio check-ins (last 4 scheduled slots)
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