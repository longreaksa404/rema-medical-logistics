import { prisma } from '../lib/prisma';
import { getCached, setCached, deleteCached } from '../utils/cache';

const KEY_LIST   = 'districts:list';
const KEY_PREFIX = 'districts:';
const TTL        = 300_000;

function invalidateDistrictCache(id?: string): void {
  deleteCached(KEY_LIST);
  if (id) deleteCached(`${KEY_PREFIX}${id}`);
}

// ─── LIST ALL DISTRICTS ───────────────────────────────────────────────────────
// No filter needed — central warehouse now lives in its own table.

export async function listDistricts() {
  const cached = getCached<Awaited<ReturnType<typeof fetchDistricts>>>(KEY_LIST);
  if (cached) return cached;

  const result = await fetchDistricts();
  setCached(KEY_LIST, result, TTL);
  return result;
}

async function fetchDistricts() {
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
  const key = `${KEY_PREFIX}detail:${id}`;
  const cached = getCached<Awaited<ReturnType<typeof fetchDistrict>>>(key);
  if (cached) return cached;

  const result = await fetchDistrict(id);
  setCached(key, result, TTL);
  return result;
}

async function fetchDistrict(id: string) {
  const district = await prisma.district.findUnique({
    where: { id },
    include: { subWarehouse: { include: { stock: true } } },
  });
  if (!district) throw new Error('District not found');
  return district;
}

// ─── GET DISTRICT SUMMARY ─────────────────────────────────────────────────────

export async function getDistrictSummary(id: string) {
  const district = await prisma.district.findUnique({
    where: { id },
    include: { subWarehouse: { include: { stock: true } } },
  });
  if (!district) throw new Error('District not found');

  const sw    = district.subWarehouse;
  const stock = sw?.stock;

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

  const [householdsAssessed, deliveredCount, openIncidents] = await Promise.all([
    prisma.household.count({ where: { districtId: id } }),
    prisma.household.count({ where: { districtId: id, delivered: true } }),
    prisma.incident.count({ where: { districtId: id, status: { in: ['OPEN', 'ESCALATED'] } } }),
  ]);

  return {
    districtId: id,
    name: district.name,
    population: district.population,
    subWarehouseId: sw?.id ?? null,
    subWarehouseStatus: sw?.status ?? null,
    stockPct,
    stock: stock ? {
      emk1Total: stock.emk1Total, emk1Remaining: stock.emk1Remaining,
      emk2Total: stock.emk2Total, emk2Remaining: stock.emk2Remaining,
      emk3Total: stock.emk3Total, emk3Remaining: stock.emk3Remaining,
    } : null,
    householdsAssessed,
    deliveredCount,
    openIncidents,
  };
}

export { invalidateDistrictCache };