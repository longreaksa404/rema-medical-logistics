import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── LIST ALL DISTRICTS ───────────────────────────────────────────────────────

export async function listDistricts() {
  return prisma.district.findMany({
    orderBy: { name: 'asc' },
    include: {
      subWarehouse: {
        select: {
          id: true,
          name: true,
          address: true,
          status: true,
          capacitySqm: true,
        },
      },
    },
  });
}

// ─── GET SINGLE DISTRICT ──────────────────────────────────────────────────────

export async function getDistrict(id: string) {
  const district = await prisma.district.findUnique({
    where: { id },
    include: {
      subWarehouse: {
        include: {
          stock: true,
        },
      },
    },
  });

  if (!district) throw new Error('District not found');
  return district;
}

// ─── GET DISTRICT SUMMARY ─────────────────────────────────────────────────────
// Used by V1 dashboard district cards and GET /api/dashboard/district/:id

export async function getDistrictSummary(id: string) {
  const district = await prisma.district.findUnique({
    where: { id },
    include: {
      subWarehouse: {
        include: { stock: true },
      },
    },
  });

  if (!district) throw new Error('District not found');

  const sw = district.subWarehouse;
  const stock = sw?.stock;

  // Stock percentage (average of EMK1 + EMK2; EMK3 only counts if total > 0)
  let stockPct = 0;
  if (stock) {
    const components = [
      stock.emk1Total > 0 ? (stock.emk1Remaining / stock.emk1Total) * 100 : null,
      stock.emk2Total > 0 ? (stock.emk2Remaining / stock.emk2Total) * 100 : null,
      stock.emk3Total > 0 ? (stock.emk3Remaining / stock.emk3Total) * 100 : null,
    ].filter((x): x is number => x !== null);

    stockPct = components.length > 0
      ? Math.round(components.reduce((a, b) => a + b, 0) / components.length)
      : 0;
  }

  const householdsAssessed = await prisma.household.count({
    where: { districtId: id },
  });

  const deliveredCount = await prisma.household.count({
    where: { districtId: id, delivered: true },
  });

  const openIncidents = await prisma.incident.count({
    where: { districtId: id, status: { in: ['OPEN', 'ESCALATED'] } },
  });

  return {
    districtId: id,
    name: district.name,
    population: district.population,
    subWarehouseId: sw?.id ?? null,
    subWarehouseStatus: sw?.status ?? null,
    stockPct,
    stock: stock ? {
      emk1Total: stock.emk1Total,
      emk1Remaining: stock.emk1Remaining,
      emk2Total: stock.emk2Total,
      emk2Remaining: stock.emk2Remaining,
      emk3Total: stock.emk3Total,
      emk3Remaining: stock.emk3Remaining,
    } : null,
    householdsAssessed,
    deliveredCount,
    openIncidents,
  };
}