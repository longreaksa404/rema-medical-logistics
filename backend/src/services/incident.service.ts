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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

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
  deleteCached(`${KEY_ALL}:open`);
  if (districtId) {
    deleteCached(`${KEY_DISTRICT_PREFIX}${districtId}`);
    deleteCached(`${KEY_DISTRICT_PREFIX}${districtId}:open`);
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
// Open/escalated incidents always returned in full — operationally critical.
// Resolved incidents are paginated — grow unbounded over a flood event.

export async function listIncidents(filters: {
  districtId?: string;
  type?: IncidentType;
  page?: number;
  pageSize?: number;
}): Promise<{ open: object[]; resolved: PaginatedResult<object> }> {
  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (filters.districtId) where.districtId = filters.districtId;
  if (filters.type)       where.type       = filters.type;

  const include = {
    district:   { select: { name: true } },
    reportedBy: { select: { name: true, role: true } },
    resolvedBy: { select: { name: true, role: true } },
  };

  // cache key still works — open incidents are the hot path
  const cacheKey = filters.districtId
    ? `${KEY_DISTRICT_PREFIX}${filters.districtId}`
    : KEY_ALL;

  // only cache open incidents — resolved are paginated and change less frequently
  const cachedOpen = getCached<object[]>(`${cacheKey}:open`);

  const [openData, resolvedData, resolvedTotal] = await Promise.all([
    cachedOpen
      ? Promise.resolve(cachedOpen)
      : prisma.incident.findMany({
          where: { ...where, status: { not: IncidentStatus.RESOLVED } },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          include,
        }).then(data => {
          setCached(`${cacheKey}:open`, data, TTL);
          return data;
        }),
    prisma.incident.findMany({
      where: { ...where, status: IncidentStatus.RESOLVED },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    }),
    prisma.incident.count({
      where: { ...where, status: IncidentStatus.RESOLVED },
    }),
  ]);

  return {
    open: openData,
    resolved: {
      data: resolvedData,
      total: resolvedTotal,
      page,
      pageSize,
      totalPages: Math.ceil(resolvedTotal / pageSize),
    },
  };
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