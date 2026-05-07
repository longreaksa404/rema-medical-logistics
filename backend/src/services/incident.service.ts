import { IncidentType, IncidentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─── REPORT AN INCIDENT ───────────────────────────────────────────────────────
// Section B.6 contingency + Section A.4 volunteer safety
// Types: ROUTE_BLOCKED | VOLUNTEER_SAFETY | STOCK_SCARCITY | BUILDING_FLOODED | OTHER

export async function reportIncident(data: {
  districtId: string;
  type: IncidentType;
  description: string;
  reportedById: string;
}) {
  const { districtId, type, description, reportedById } = data;

  // Verify district exists
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

  // Auto-escalate VOLUNTEER_SAFETY incidents
  // Section A.4: volunteer safety is a hard constraint — escalate immediately
  if (type === IncidentType.VOLUNTEER_SAFETY) {
    await prisma.incident.update({
      where: { id: incident.id },
      data: { status: IncidentStatus.ESCALATED },
    });
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

export async function listIncidents(filters: {
  districtId?: string;
  type?: IncidentType;
  status?: IncidentStatus;
}) {
  const where: Record<string, unknown> = {};
  if (filters.districtId) where.districtId = filters.districtId;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;

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

  return prisma.incident.update({
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
}