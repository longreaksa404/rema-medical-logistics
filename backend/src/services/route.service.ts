import { PrismaClient, DeliveryMode } from '@prisma/client';

const prisma = new PrismaClient();

// ─── DELIVERY MODE TIERS (Section A.4 — LOCKED) ───────────────────────────────
// 0–30 cm   → MOTORBIKE
// 30–60 cm  → BICYCLE_OR_FOOT
// 60–80 cm  → BOAT
// > 80 cm   → SUSPENDED (escalate to civil defense)

export function getDeliveryMode(waterDepthCm: number): {
  deliveryMode: DeliveryMode;
  warning?: string;
} {
  if (waterDepthCm <= 30) {
    return { deliveryMode: DeliveryMode.MOTORBIKE };
  }
  if (waterDepthCm <= 60) {
    return { deliveryMode: DeliveryMode.BICYCLE_OR_FOOT };
  }
  if (waterDepthCm <= 80) {
    return { deliveryMode: DeliveryMode.BOAT };
  }
  return {
    deliveryMode: DeliveryMode.SUSPENDED,
    warning:
      'Water depth exceeds 80cm — all delivery suspended per Section A.4. ' +
      'Escalate to local civil defense for evacuation support. ' +
      'Volunteer safety is a hard constraint.',
  };
}

// ─── RECOMMEND DELIVERY MODE (stateless) ─────────────────────────────────────
// Used by GET /api/route/recommend — no DB required.

export function recommendMode(waterDepthCm: number) {
  return {
    waterDepthCm,
    ...getDeliveryMode(waterDepthCm),
  };
}

// ─── UPDATE WATER DEPTH FOR A ZONE ───────────────────────────────────────────
// Creates or updates the Route record for a district+zone combination.
// Always creates a RouteLog entry for audit trail.

export async function updateRouteDepth(data: {
  districtId: string;
  zone: string;
  waterDepthCm: number;
  reportedById: string;
}) {
  const { districtId, zone, waterDepthCm, reportedById } = data;

  // Verify district exists
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) throw new Error(`District not found: ${districtId}`);

  const newMode = getDeliveryMode(waterDepthCm).deliveryMode;

  // Find existing route for this district+zone
  const existing = await prisma.route.findFirst({
    where: { districtId, zone, active: true },
  });

  let route;

  if (existing) {
    // Create log entry before updating
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

    // Update existing route
    route = await prisma.route.update({
      where: { id: existing.id },
      data: {
        waterDepthCm,
        deliveryMode: newMode,
      },
      include: {
        district: { select: { name: true } },
      },
    });
  } else {
    // Create new route record (first update for this zone)
    // Log entry: previous depth = 0, previous mode = MOTORBIKE (baseline)
    route = await prisma.route.create({
      data: {
        districtId,
        zone,
        waterDepthCm,
        deliveryMode: newMode,
        active: true,
      },
      include: {
        district: { select: { name: true } },
      },
    });

    await prisma.routeLog.create({
      data: {
        routeId: route.id,
        previousDepth: 0,
        newDepth: waterDepthCm,
        previousMode: DeliveryMode.MOTORBIKE, // baseline assumption
        newMode,
        reportedById,
      },
    });
  }

  return {
    route,
    ...getDeliveryMode(waterDepthCm),
  };
}

// ─── GET ROUTE LOGS ───────────────────────────────────────────────────────────

export async function getRouteLogs(filters: { districtId?: string }) {
  const where: Record<string, unknown> = {};

  if (filters.districtId) {
    // Filter through route → district
    where.route = { districtId: filters.districtId };
  }

  return prisma.routeLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      route: {
        include: {
          district: { select: { name: true } },
        },
      },
      reportedBy: { select: { name: true, email: true, role: true } },
    },
  });
}

// ─── GET CURRENT ROUTES FOR A DISTRICT ───────────────────────────────────────
// Returns current active route per zone — used by Hub Manager portal

export async function getDistrictRoutes(districtId: string) {
  return prisma.route.findMany({
    where: { districtId, active: true },
    orderBy: { zone: 'asc' },
    include: {
      district: { select: { name: true } },
    },
  });
}