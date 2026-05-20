import { DeliveryMode } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCached, setCached, deleteCached } from '../utils/cache';

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
// Routes are polled by V2 Routing Map on every render.
// 20 s TTL — route depth updates during peak ops, but not on every request.
// Logs are not cached — they're an audit view, not a hot path.

const KEY_DISTRICT_PREFIX = 'routes:district:';
const TTL = 20_000; // 20 s

function invalidateRouteCache(districtId: string): void {
  deleteCached(`${KEY_DISTRICT_PREFIX}${districtId}`);
}

// ─── DELIVERY MODE TIERS (Section A.4 — LOCKED) ───────────────────────────────

export function getDeliveryMode(waterDepthCm: number): {
  deliveryMode: DeliveryMode;
  warning?: string;
} {
  if (waterDepthCm <= 30) return { deliveryMode: DeliveryMode.MOTORBIKE };
  if (waterDepthCm <= 60) return { deliveryMode: DeliveryMode.BICYCLE_OR_FOOT };
  if (waterDepthCm <= 80) return { deliveryMode: DeliveryMode.BOAT };
  return {
    deliveryMode: DeliveryMode.SUSPENDED,
    warning:
      'Water depth exceeds 80cm — all delivery suspended per Section A.4. ' +
      'Escalate to local civil defense for evacuation support. ' +
      'Volunteer safety is a hard constraint.',
  };
}

// ─── RECOMMEND DELIVERY MODE (stateless) ─────────────────────────────────────

export function recommendMode(waterDepthCm: number) {
  return { waterDepthCm, ...getDeliveryMode(waterDepthCm) };
}

// ─── RECOMMEND PER ZONE FOR A DISTRICT ───────────────────────────────────────
// Reads actual zone records from DB and returns one entry per zone.
// Falls back gracefully when no routes exist yet for the district.

export async function recommendByDistrict(districtId: string) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) throw new Error(`District not found: ${districtId}`);

  const routes = await prisma.route.findMany({
    where: { districtId, active: true },
    orderBy: { zone: 'asc' },
  });

  const zones = routes.map((r) => ({
    zone: r.zone,
    waterDepthCm: r.waterDepthCm,
    deliveryMode: r.deliveryMode,
    active: r.active,
    ...(r.deliveryMode === 'SUSPENDED'
      ? {
          warning:
            'Water depth exceeds 80cm - all delivery suspended per Section A.4. ' +
            'Escalate to civil defense. Volunteer safety is a hard constraint.',
        }
      : {}),
  }));

  return {
    districtId: district.id,
    districtName: district.name,
    zones,
  };
}

// ─── UPDATE WATER DEPTH FOR A ZONE ───────────────────────────────────────────

export async function updateRouteDepth(data: {
  districtId: string;
  zone: string;
  waterDepthCm: number;
  reportedById: string;
}) {
  const { districtId, zone, waterDepthCm, reportedById } = data;

  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) throw new Error(`District not found: ${districtId}`);

  const newMode = getDeliveryMode(waterDepthCm).deliveryMode;

  const existing = await prisma.route.findFirst({
    where: { districtId, zone, active: true },
  });

  let route;

  if (existing) {
    await prisma.routeLog.create({
      data: {
        routeId: existing.id,
        previousDepth: existing.waterDepthCm,
        newDepth: waterDepthCm,
        previousMode: existing.deliveryMode,
        newMode,
        reportedById,
      },
    });

    route = await prisma.route.update({
      where: { id: existing.id },
      data: { waterDepthCm, deliveryMode: newMode },
      include: { district: { select: { name: true } } },
    });
  } else {
    route = await prisma.route.create({
      data: { districtId, zone, waterDepthCm, deliveryMode: newMode, active: true },
      include: { district: { select: { name: true } } },
    });

    await prisma.routeLog.create({
      data: {
        routeId: route.id,
        previousDepth: 0,
        newDepth: waterDepthCm,
        previousMode: DeliveryMode.MOTORBIKE,
        newMode,
        reportedById,
      },
    });
  }

  invalidateRouteCache(districtId);

  return { route, ...getDeliveryMode(waterDepthCm) };
}

// ─── GET ROUTE LOGS ───────────────────────────────────────────────────────────
// Not cached — audit view, called infrequently.

export async function getRouteLogs(filters: { districtId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters.districtId) {
    where.route = { districtId: filters.districtId };
  }

  return prisma.routeLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      route: { include: { district: { select: { name: true } } } },
      reportedBy: { select: { name: true, email: true, role: true } },
    },
  });
}

// ─── GET CURRENT ROUTES FOR A DISTRICT ───────────────────────────────────────
// Cached per district for 20 s. Invalidated on updateRouteDepth.

export async function getDistrictRoutes(districtId: string) {
  const key = `${KEY_DISTRICT_PREFIX}${districtId}`;
  const cached = getCached<Awaited<ReturnType<typeof fetchDistrictRoutes>>>(key);
  if (cached) return cached;

  const result = await fetchDistrictRoutes(districtId);
  setCached(key, result, TTL);
  return result;
}

async function fetchDistrictRoutes(districtId: string) {
  return prisma.route.findMany({
    where: { districtId, active: true },
    orderBy: { zone: 'asc' },
    include: { district: { select: { name: true } } },
  });
}