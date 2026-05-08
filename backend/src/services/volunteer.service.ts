import { VolunteerRole, VolunteerStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCached, setCached, deleteCached } from '../utils/cache';

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
// Volunteer list is polled by the Hub Manager portal every 30–60 s.
// Roster is per-district, so we key by district. The flat list is separate.
// Both are busted on any volunteer write (create, update, assign).

const KEY_LIST = 'volunteers:list';
const KEY_ROSTER_PREFIX = 'volunteers:roster:';
const TTL = 30_000; // 30 s

function invalidateVolunteerCache(districtId?: string): void {
  deleteCached(KEY_LIST);
  if (districtId) {
    deleteCached(`${KEY_ROSTER_PREFIX}${districtId}`);
  } else {
    // Bust all roster keys (e.g. after a cross-district assign)
    deleteCached(KEY_ROSTER_PREFIX);
  }
}

// ─── LIST VOLUNTEERS ──────────────────────────────────────────────────────────
// Cached 30 s. Filters are applied post-cache because the full list is small
// enough to filter in-memory and avoids a separate cache entry per filter combo.

export async function listVolunteers(filters: {
  districtId?: string;
  status?: VolunteerStatus;
}) {
  const cached = getCached<Awaited<ReturnType<typeof fetchAllVolunteers>>>(KEY_LIST);
  const all = cached ?? await (async () => {
    const result = await fetchAllVolunteers();
    setCached(KEY_LIST, result, TTL);
    return result;
  })();

  // Apply filters in-memory
  return all.filter(v => {
    if (filters.districtId && v.districtId !== filters.districtId) return false;
    if (filters.status && v.status !== filters.status) return false;
    return true;
  });
}

async function fetchAllVolunteers() {
  return prisma.volunteer.findMany({
    orderBy: [{ districtId: 'asc' }, { role: 'asc' }, { name: 'asc' }],
    include: {
      assignments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          subWarehouse: { select: { name: true } },
        },
      },
    },
  });
}

// ─── ADD VOLUNTEER TO ROSTER ──────────────────────────────────────────────────

export async function createVolunteer(data: {
  districtId: string;
  name: string;
  phone: string;
  role?: VolunteerRole;
}) {
  const district = await prisma.district.findUnique({ where: { id: data.districtId } });
  if (!district) throw new Error(`District not found: ${data.districtId}`);

  const volunteer = await prisma.volunteer.create({
    data: {
      districtId: data.districtId,
      name: data.name,
      phone: data.phone,
      role: data.role ?? VolunteerRole.VOLUNTEER,
      status: VolunteerStatus.AVAILABLE,
    },
  });

  invalidateVolunteerCache(data.districtId);
  return volunteer;
}

// ─── UPDATE VOLUNTEER INFO OR STATUS ─────────────────────────────────────────

export async function updateVolunteer(
  id: string,
  data: {
    name?: string;
    phone?: string;
    status?: VolunteerStatus;
    role?: VolunteerRole;
  }
) {
  const existing = await prisma.volunteer.findUnique({ where: { id } });
  if (!existing) throw new Error('Volunteer not found');

  const updated = await prisma.volunteer.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      phone: data.phone ?? existing.phone,
      status: data.status ?? existing.status,
      role: data.role ?? existing.role,
    },
  });

  invalidateVolunteerCache(existing.districtId);
  return updated;
}

// ─── ASSIGN VOLUNTEER TO ZONE + TEAM ─────────────────────────────────────────
// Section D.6: cross-ward assignment reduces favoritism (Section C fairness safeguard).

export async function assignVolunteer(data: {
  volunteerId: string;
  subWarehouseId: string;
  alertId: string;
  zone: string;
  teamNumber: number;
}) {
  const { volunteerId, subWarehouseId, alertId, zone, teamNumber } = data;

  const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
  if (!volunteer) throw new Error('Volunteer not found');

  const sw = await prisma.subWarehouse.findUnique({ where: { id: subWarehouseId } });
  if (!sw) throw new Error('Sub-warehouse not found');

  const alert = await prisma.floodAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new Error('Flood alert not found');

  if (teamNumber < 1 || teamNumber > 3) {
    throw new Error('teamNumber must be 1, 2, or 3 (Section B.4: 3 teams per sub-warehouse)');
  }

  await prisma.volunteer.update({
    where: { id: volunteerId },
    data: { status: VolunteerStatus.DEPLOYED },
  });

  const assignment = await prisma.volunteerAssignment.create({
    data: { volunteerId, subWarehouseId, alertId, zone, teamNumber },
    include: {
      volunteer: { select: { name: true, phone: true, role: true } },
      subWarehouse: { include: { district: { select: { name: true } } } },
    },
  });

  invalidateVolunteerCache(volunteer.districtId);
  return assignment;
}

// ─── FULL ROSTER FOR A DISTRICT ───────────────────────────────────────────────
// Cached per district for 30 s.

export async function getDistrictRoster(districtId: string) {
  const key = `${KEY_ROSTER_PREFIX}${districtId}`;
  const cached = getCached<Awaited<ReturnType<typeof buildRoster>>>(key);
  if (cached) return cached;

  const result = await buildRoster(districtId);
  setCached(key, result, TTL);
  return result;
}

async function buildRoster(districtId: string) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) throw new Error('District not found');

  const volunteers = await prisma.volunteer.findMany({
    where: { districtId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: {
      assignments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          subWarehouse: { select: { name: true } },
          alert: { select: { activated: true, phase: true } },
        },
      },
    },
  });

  const teamLeaders = volunteers.filter(v => v.role === 'TEAM_LEADER');
  const general = volunteers.filter(v => v.role === 'VOLUNTEER');

  return {
    districtId,
    districtName: district.name,
    total: volunteers.length,
    teamLeaders: teamLeaders.length,
    generalVolunteers: general.length,
    belowMinimum: volunteers.length < 12,
    minimumWarning: volunteers.length < 12
      ? `District has ${volunteers.length}/12 minimum volunteers (Section D.6)`
      : null,
    volunteers,
  };
}