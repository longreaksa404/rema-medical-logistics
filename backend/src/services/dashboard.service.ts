import { PrismaClient } from '@prisma/client';
import { isInScarcity } from '../utils/stock.utils';

const prisma = new PrismaClient();

// ─── CACHE CONFIGURATION ─────────────────────────────────────────────────────
// In-memory cache. Zero new dependencies.
// Architecture is Redis-ready: replace getCached/setCached with Redis calls
// and the rest of the code is unchanged.

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

/**
 * Invalidate specific cache keys or clear everything.
 * Called by alert.service on phase change and stock.service on dispatch/reallocate.
 */
export function invalidateCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// ─── EXPORTED SERVICES ───────────────────────────────────────────────────────

/**
 * GET /api/dashboard/summary
 * Cached for 15 seconds — heavy aggregation across all 3 districts.
 * Invalidated on phase change and stock dispatch/reallocate.
 */
export async function getDashboardSummary() {
  const CACHE_KEY = 'dashboard:summary';
  const cached = getCached<ReturnType<typeof buildSummary>>(CACHE_KEY);
  if (cached) return cached;

  const result = await buildSummary();
  setCached(CACHE_KEY, result, 15_000); // 15 second TTL
  return result;
}

/**
 * GET /api/dashboard/district/:id
 * Cached per district for 10 seconds.
 * Key format: dashboard:district:{id} — allows targeted invalidation.
 */
export async function getDistrictDashboard(districtId: string) {
  const CACHE_KEY = `dashboard:district:${districtId}`;
  const cached = getCached<Awaited<ReturnType<typeof buildDistrictDashboard>>>(CACHE_KEY);
  if (cached) return cached;

  const result = await buildDistrictDashboard(districtId);
  setCached(CACHE_KEY, result, 10_000); // 10 second TTL
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

  // FIX: Collapse 4 separate COUNT queries into 2 parallel queries.
  //
  // Before: 4 round-trips
  //   prisma.household.count({ where: { districtId } })
  //   prisma.household.count({ where: { districtId, delivered: true } })
  //   prisma.incident.count({ where: { districtId, status: { in: [...] } } })
  //   prisma.deliveryRun.count({ where: { subWarehouseId: sw?.id, status: 'IN_PROGRESS' } })
  //
  // After: 2 round-trips
  //   groupBy on household (districtId + delivered) → householdsAssessed + deliveredCount in one query
  //   incident count + deliveryRun count run in parallel (unchanged structure, but now only 2 trips)
  //
  // The household groupBy returns [{ delivered: false, _count: N }, { delivered: true, _count: M }]
  // which gives us both totals without a second query.

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

  // Extract totals from the groupBy result.
  // groupBy returns one row per distinct `delivered` value present in the data.
  // If there are zero delivered households, the `true` row won't exist — default to 0.
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
  // ─── BEFORE (14+ round-trips) ─────────────────────────────────────────────
  // Step 3 — 5 separate COUNT queries:
  //   count({ priorityBand: 'CRITICAL', delivered: false })
  //   count({ priorityBand: 'HIGH',     delivered: false })
  //   count({ priorityBand: 'MEDIUM',   delivered: false })
  //   count({ priorityBand: 'STANDARD', delivered: false })
  //   count({ delivered: true })
  //
  // Step 5 — districtCards map fires 3 queries per district × 3 districts = 9 queries:
  //   count({ districtId: d.id })
  //   count({ districtId: d.id, delivered: true })
  //   incident.count({ districtId: d.id, status: { in: ['OPEN','ESCALATED'] } })
  //
  // Total: 5 + 9 + alert + districts + activeRuns + todayCheckins = 14+ round-trips
  //
  // ─── AFTER (6 round-trips) ───────────────────────────────────────────────
  // 1. floodAlert (unchanged)
  // 2. districts with subWarehouse+stock (unchanged — single JOIN query)
  // 3. household groupBy(priorityBand, delivered) → replaces all 5 band COUNTs
  // 4. household groupBy(districtId, delivered) → replaces 2 queries × N districts
  // 5. incident groupBy(districtId) filtered to open/escalated → replaces 1 query × N districts
  // 6. deliveryRun count + radioCheckin count in parallel (unchanged)

  const [
    alert,
    districts,
    globalHouseholdCounts,
    districtHouseholdCounts,
    districtIncidentCounts,
    activeRuns,
    todayCheckins,
  ] = await Promise.all([
    // 1. Current flood alert state
    prisma.floodAlert.findFirst({
      orderBy: { createdAt: 'desc' },
    }),

    // 2. All districts with stock — single JOIN, no N+1
    prisma.district.findMany({
      orderBy: { name: 'asc' },
      include: {
        subWarehouse: {
          include: { stock: true },
        },
      },
    }),

    // 3. Global household counts by band + delivered status — 1 query replaces 5 COUNTs
    //
    // Returns rows like:
    //   { priorityBand: 'CRITICAL', delivered: false, _count: { _all: 42 } }
    //   { priorityBand: 'HIGH',     delivered: false, _count: { _all: 18 } }
    //   { priorityBand: null,       delivered: true,  _count: { _all: 100 } }
    //   ...
    //
    // Note: delivered households may have any priorityBand value, so we group by
    // both fields and sum where delivered=true for the delivered total.
    prisma.household.groupBy({
      by: ['priorityBand', 'delivered'],
      _count: { _all: true },
    }),

    // 4. Per-district household counts (total + delivered) — 1 query replaces 2 × N COUNTs
    prisma.household.groupBy({
      by: ['districtId', 'delivered'],
      _count: { _all: true },
    }),

    // 5. Per-district open incident counts — 1 query replaces 1 × N COUNTs
    prisma.incident.groupBy({
      by: ['districtId'],
      where: { status: { in: ['OPEN', 'ESCALATED'] } },
      _count: { _all: true },
    }),

    // 6a. Active delivery runs (unchanged)
    prisma.deliveryRun.count({
      where: { status: 'IN_PROGRESS' },
    }),

    // 6b. Today's radio check-ins (unchanged)
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

  // ─── DERIVE GLOBAL HOUSEHOLD BAND COUNTS FROM groupBy RESULT ──────────────
  //
  // globalHouseholdCounts is a flat array of { priorityBand, delivered, _count._all }.
  // We need: critical, high, medium, standard (all where delivered=false), and delivered total.

  let critical = 0;
  let high = 0;
  let medium = 0;
  let standard = 0;
  let delivered = 0;

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

  // ─── BUILD PER-DISTRICT LOOKUP MAPS FROM groupBy RESULTS ──────────────────
  //
  // districtHouseholdCounts: [{ districtId, delivered, _count._all }]
  // districtIncidentCounts:  [{ districtId, _count._all }]
  //
  // Convert to Maps keyed by districtId for O(1) lookup inside the district loop.

  // Map<districtId, { total: number; deliveredCount: number }>
  const householdMap = new Map<string, { total: number; deliveredCount: number }>();
  for (const row of districtHouseholdCounts) {
    const id = row.districtId;
    const existing = householdMap.get(id) ?? { total: 0, deliveredCount: 0 };
    existing.total += row._count._all;
    if (row.delivered) existing.deliveredCount += row._count._all;
    householdMap.set(id, existing);
  }

  // Map<districtId, openIncidentCount>
  const incidentMap = new Map<string, number>();
  for (const row of districtIncidentCounts) {
    incidentMap.set(row.districtId, row._count._all);
  }

  // ─── OPEN INCIDENTS LIST (unchanged — needs full rows with relations) ───────
  const openIncidents = await prisma.incident.findMany({
    where: { status: { in: ['OPEN', 'ESCALATED'] } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 10,
    include: {
      district: { select: { name: true } },
      reportedBy: { select: { name: true, role: true } },
    },
  });

  // ─── BUILD DISTRICT CARDS (no DB calls inside the loop) ───────────────────
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

    // Pull from pre-built maps — zero DB calls
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