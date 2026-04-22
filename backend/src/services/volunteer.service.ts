import { PrismaClient, VolunteerRole, VolunteerStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ─── LIST VOLUNTEERS ──────────────────────────────────────────────────────────

export async function listVolunteers(filters: {
  districtId?: string;
  status?: VolunteerStatus;
}) {
  const where: Record<string, unknown> = {};
  if (filters.districtId) where.districtId = filters.districtId;
  if (filters.status) where.status = filters.status;

  return prisma.volunteer.findMany({
    where,
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
  // Verify district exists
  const district = await prisma.district.findUnique({ where: { id: data.districtId } });
  if (!district) throw new Error(`District not found: ${data.districtId}`);

  return prisma.volunteer.create({
    data: {
      districtId: data.districtId,
      name: data.name,
      phone: data.phone,
      role: data.role ?? VolunteerRole.VOLUNTEER,
      status: VolunteerStatus.AVAILABLE,
    },
  });
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

  return prisma.volunteer.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      phone: data.phone ?? existing.phone,
      status: data.status ?? existing.status,
      role: data.role ?? existing.role,
    },
  });
}

// ─── ASSIGN VOLUNTEER TO ZONE + TEAM ─────────────────────────────────────────
// Section D.6: Volunteers assigned to wards they are NOT from — cross-ward assignment
// reduces favoritism (Section C fairness safeguard).
// Assumes 3 teams per sub-warehouse, 4 volunteers each.

export async function assignVolunteer(data: {
  volunteerId: string;
  subWarehouseId: string;
  alertId: string;
  zone: string;
  teamNumber: number;
}) {
  const { volunteerId, subWarehouseId, alertId, zone, teamNumber } = data;

  // Verify all references exist
  const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
  if (!volunteer) throw new Error('Volunteer not found');

  const sw = await prisma.subWarehouse.findUnique({ where: { id: subWarehouseId } });
  if (!sw) throw new Error('Sub-warehouse not found');

  const alert = await prisma.floodAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new Error('Flood alert not found');

  if (teamNumber < 1 || teamNumber > 3) {
    throw new Error('teamNumber must be 1, 2, or 3 (Section B.4: 3 teams per sub-warehouse)');
  }

  // Mark volunteer as DEPLOYED
  await prisma.volunteer.update({
    where: { id: volunteerId },
    data: { status: VolunteerStatus.DEPLOYED },
  });

  const assignment = await prisma.volunteerAssignment.create({
    data: {
      volunteerId,
      subWarehouseId,
      alertId,
      zone,
      teamNumber,
    },
    include: {
      volunteer: { select: { name: true, phone: true, role: true } },
      subWarehouse: {
        include: { district: { select: { name: true } } },
      },
    },
  });

  return assignment;
}

// ─── FULL ROSTER FOR A DISTRICT ───────────────────────────────────────────────
// Section D.6: 12 volunteers per sub-warehouse = 36 total across 3 districts
// 3 teams of 4 per sub-warehouse

export async function getDistrictRoster(districtId: string) {
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

  // Group by role for easier consumption
  const teamLeaders = volunteers.filter(v => v.role === 'TEAM_LEADER');
  const general = volunteers.filter(v => v.role === 'VOLUNTEER');

  return {
    districtId,
    districtName: district.name,
    total: volunteers.length,
    teamLeaders: teamLeaders.length,
    generalVolunteers: general.length,
    // Section D.6 minimum check: warn if below 12 per district
    belowMinimum: volunteers.length < 12,
    minimumWarning: volunteers.length < 12
      ? `District has ${volunteers.length}/12 minimum volunteers (Section D.6)`
      : null,
    volunteers,
  };
}