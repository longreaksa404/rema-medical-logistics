import { IncidentType, IncidentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCached, setCached, deleteCached } from '../utils/cache';
import { io } from '../app';  

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
// Incidents are polled by V1 dashboard and Hub Manager portal.
// 20 s TTL balances freshness against DB load during active operations.
// All write paths (report, resolve) bust the cache immediately.

const KEY_ALL = 'incidents:all';
const KEY_DISTRICT_PREFIX = 'incidents:district:';
const TTL = 20_000; // 20 s

// ─── INCIDENT NOTIFICATION ────────────────────────────────────────────────────
// Notifies the hub manager for the affected district when an incident is reported.
// Also notifies EC for escalated types (VOLUNTEER_SAFETY, BUILDING_FLOODED).

async function notifyDistrictHub(
  districtId: string,
  type: string,
  description: string
): Promise<void> {
  const hubManagers = await prisma.user.findMany({
    where: { districtId, role: 'HUB_MANAGER', active: true },
    select: { id: true },
  });

  const escalated = type === 'VOLUNTEER_SAFETY' || type === 'BUILDING_FLOODED';

  // also pull EC + SUPER_ADMIN for high-severity incidents
  const ecRecipients = escalated
    ? await prisma.user.findMany({
        where: {
          role: { in: ['EMERGENCY_COORDINATOR', 'SUPER_ADMIN'] },
          active: true,
        },
        select: { id: true },
      })
    : [];

  const recipients = [...hubManagers, ...ecRecipients];
  if (recipients.length === 0) return;

  const shortDesc =
    description.length > 80 ? description.slice(0, 80) + '...' : description;

  await prisma.notification.createMany({
    data: recipients.map((u) => ({
      userId: u.id,
      type: 'INCIDENT_REPORTED',
      message: `${escalated ? '[ESCALATED] ' : ''}New incident reported: ${type.replace(/_/g, ' ')} - ${shortDesc}`,
    })),
  });
}

function invalidateIncidentCache(districtId?: string): void {
  deleteCached(KEY_ALL);
  if (districtId) {
    deleteCached(`${KEY_DISTRICT_PREFIX}${districtId}`);
  } else {
    deleteCached(KEY_DISTRICT_PREFIX);
  }
}

// ─── REPORT AN INCIDENT ───────────────────────────────────────────────────────
// Section B.6 contingency + Section A.4 volunteer safety

export async function reportIncident(data: {
  districtId: string;
  type: IncidentType;
  description: string;
  reportedById: string;
}) {
  const { districtId, type, description, reportedById } = data;

  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) throw new Error(`District not found: ${districtId}`);

  const incident = await prisma.incident.create({
    data: {
      districtId,
      type,
      description,
      status: IncidentStatus.OPEN,
      reportedById,
    },
    include: {
      district: { select: { name: true } },
      reportedBy: { select: { name: true, email: true, role: true } },
    },
  });

  invalidateIncidentCache(districtId);
  io.emit('incident_reported', { districtId, type, status: 'OPEN' });
  await notifyDistrictHub(districtId, type, description);


  // Auto-escalate VOLUNTEER_SAFETY incidents (Section A.4 hard constraint)
  if (type === IncidentType.VOLUNTEER_SAFETY) {
    await prisma.incident.update({
      where: { id: incident.id },
      data: { status: IncidentStatus.ESCALATED },
    });
    // Bust again after the status update
    invalidateIncidentCache(districtId);
    return {
      ...incident,
      status: IncidentStatus.ESCALATED,
      autoEscalated: true,
      escalationNote:
        'Volunteer safety incidents are automatically escalated per Section A.4. ' +
        'Notify civil defense if water exceeds 80cm.',
    };
  }

  return incident;
}

// ─── LIST INCIDENTS ───────────────────────────────────────────────────────────
// Cached 20 s. Filters applied post-cache (small dataset).

export async function listIncidents(filters: {
  districtId?: string;
  type?: IncidentType;
  status?: IncidentStatus;
}) {
  // Use district-scoped cache when filtering by district; global cache otherwise
  const key = filters.districtId
    ? `${KEY_DISTRICT_PREFIX}${filters.districtId}`
    : KEY_ALL;

  const cached = getCached<Awaited<ReturnType<typeof fetchIncidents>>>(key);
  const all = cached ?? await (async () => {
    const result = await fetchIncidents(filters.districtId);
    setCached(key, result, TTL);
    return result;
  })();

  // Apply remaining filters in-memory
  return all.filter(i => {
    if (filters.type && i.type !== filters.type) return false;
    if (filters.status && i.status !== filters.status) return false;
    return true;
  });
}

async function fetchIncidents(districtId?: string) {
  const where: Record<string, unknown> = {};
  if (districtId) where.districtId = districtId;

  return prisma.incident.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      district: { select: { name: true } },
      reportedBy: { select: { name: true, role: true } },
      resolvedBy: { select: { name: true, role: true } },
    },
  });
}

// ─── RESOLVE AN INCIDENT ──────────────────────────────────────────────────────

export async function resolveIncident(id: string, resolvedById: string) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) throw new Error('Incident not found');
  if (incident.status === IncidentStatus.RESOLVED) {
    throw new Error('Incident is already resolved');
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: {
      status: IncidentStatus.RESOLVED,
      resolvedById,
      resolvedAt: new Date(),
    },
    include: {
      district: { select: { name: true } },
      reportedBy: { select: { name: true, role: true } },
      resolvedBy: { select: { name: true, role: true } },
    },
  });

  invalidateIncidentCache(incident.districtId);
  return updated;
}