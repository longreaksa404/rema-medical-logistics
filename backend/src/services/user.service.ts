import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const CREATABLE_ROLES: Role[] = [
  Role.EMERGENCY_COORDINATOR,
  Role.HUB_MANAGER,
  Role.VOLUNTEER,
  Role.VIEWER,
];

// ─── CREATE USER ──────────────────────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  name: string;
  role: Role;
  districtId?: string;
  temporaryPassword: string;
  phone?: string;
}) {
  const { email, name, role, districtId, temporaryPassword, phone } = data;

  if (!CREATABLE_ROLES.includes(role)) {
    throw new Error(
      `Cannot create SUPER_ADMIN via API. ` +
      `Allowed roles: ${CREATABLE_ROLES.join(', ')}`
    );
  }

  const districtRequiredRoles: Role[] = [Role.HUB_MANAGER, Role.VOLUNTEER];
  if (districtRequiredRoles.includes(role) && !districtId) {
    throw new Error(`Role ${role} requires a districtId`);
  }

  if (districtId) {
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) throw new Error(`District not found: ${districtId}`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error(`Email already in use: ${email}`);

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // volunteer role — user + volunteer record in one transaction
  if (role === Role.VOLUNTEER) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          role,
          passwordHash,
          districtId: districtId ?? null,
          phone:      phone ?? null,
          active: true,
          mustChangePassword: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          districtId: true,
          active: true,
          createdAt: true,
          mustChangePassword: true,
        },
      });

      await tx.volunteer.create({
        data: {
          userId:     user.id,
          districtId: districtId!,
          name:       name,
          phone:      phone ?? '',
          role:       'VOLUNTEER',
          status:     'AVAILABLE',
        },
      });

      return user;
    });
  }

  return prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      districtId: districtId ?? null,
      phone:      phone ?? null,
      active: true,
      mustChangePassword: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      districtId: true,
      active: true,
      createdAt: true,
      mustChangePassword: true,
    },
  });
}

// ─── LIST USERS ───────────────────────────────────────────────────────────────

export async function listUsers(filters: {
  role?: Role;
  districtId?: string;
  active?: boolean;
}) {
  const where: Record<string, unknown> = {};

  if (filters.role) where.role = filters.role;
  if (filters.districtId) where.districtId = filters.districtId;
  if (filters.active !== undefined) where.active = filters.active;

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      districtId: true,
      phone: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      district: {
        select: { name: true },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
}

// ─── GET SINGLE USER ──────────────────────────────────────────────────────────

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      districtId: true,
      phone: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      district: {
        select: { name: true },
      },
    },
  });

  if (!user) throw new Error('User not found');
  return user;
}

// ─── UPDATE USER (SUPER_ADMIN) ────────────────────────────────────────────────

export async function updateUser(
  id: string,
  requestingUserId: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    districtId?: string | null;
    phone?: string | null;
    active?: boolean;
  }
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error('User not found');

  if (data.active === false && id === requestingUserId) {
    throw new Error('Cannot deactivate your own account');
  }

  if (data.role && !CREATABLE_ROLES.includes(data.role)) {
    throw new Error('Cannot assign SUPER_ADMIN role via API');
  }

  if (existing.role === Role.SUPER_ADMIN) {
    throw new Error('Cannot modify a SUPER_ADMIN account via API');
  }

  if (data.email && data.email !== existing.email) {
    const emailInUse = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailInUse) throw new Error(`Email already in use: ${data.email}`);
  }

  if (data.districtId) {
    const district = await prisma.district.findUnique({ where: { id: data.districtId } });
    if (!district) throw new Error(`District not found: ${data.districtId}`);
  }

  return prisma.user.update({
    where: { id },
    data: {
      name:       data.name       ?? existing.name,
      email:      data.email      ?? existing.email,
      role:       data.role       ?? existing.role,
      districtId: data.districtId !== undefined ? data.districtId : existing.districtId,
      phone:      data.phone      !== undefined ? data.phone      : existing.phone,
      active:     data.active     !== undefined ? data.active     : existing.active,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      districtId: true,
      phone: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ─── UPDATE OWN PROFILE (any auth user) ──────────────────────────────────────
// only name + phone — email and role are admin-only

export async function updateOwnProfile(
  userId: string,
  data: { name?: string; phone?: string | null }
) {
  if (data.name !== undefined && data.name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters');
  }

  // strip to null if empty string — consistent storage
  const phone = data.phone === '' ? null : data.phone;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.phone !== undefined && { phone }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      districtId: true,
      phone: true,
      active: true,
      updatedAt: true,
      avatarBase64: true,
      mustChangePassword: true,
    },
  });

  // keep volunteer record in sync if linked
  if (data.name !== undefined || data.phone !== undefined) {
    const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
    if (volunteer) {
      await prisma.volunteer.update({
        where: { userId },
        data: {
          ...(data.name  !== undefined && { name: data.name.trim() }),
          ...(phone      !== undefined && { phone: phone ?? volunteer.phone }),
        },
      });
    }
  }

  return updated;
}

// ─── CHANGE OWN PASSWORD ──────────────────────────────────────────────────────

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw new Error('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Current password is incorrect');

  if (currentPassword === newPassword) {
    throw new Error('New password must be different from current password');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

  return { message: 'Password updated successfully' };
}

// ─── RESET USER PASSWORD ──────────────────────────────────────────────────────

export async function resetUserPassword(
  targetUserId: string,
  temporaryPassword: string
) {
  if (temporaryPassword.length < 8) {
    throw new Error('Temporary password must be at least 8 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new Error('User not found');

  if (user.role === Role.SUPER_ADMIN) {
    throw new Error('Cannot reset a SUPER_ADMIN password via API');
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await prisma.user.update({
    where: { id: targetUserId },
    data: { passwordHash, mustChangePassword: true },
  });

  return {
    message: `Password reset for ${user.email}. User must change password on next login.`,
    userId: targetUserId,
    email: user.email,
    mustChangePassword: true,
  };
}

// ─── PUBLIC SYSTEM STATUS ─────────────────────────────────────────────────────

export async function getPublicStatus() {
  const alert = await prisma.floodAlert.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  const activeDistricts = await prisma.subWarehouse.count({
    where: { status: 'ACTIVE' },
  });

  const totalDistricts = await prisma.district.count();

  const activeRuns = await prisma.deliveryRun.count({
    where: { status: 'IN_PROGRESS' },
  });

  const deliveriesCompleted = await prisma.household.count({
    where: { delivered: true },
  });

  return {
    system: 'REMA - Rapid Emergency Medical Access',
    operatedBy: 'Viet Nam Red Cross',
    status: alert?.activated ? 'ACTIVE' : 'STANDBY',
    phase: alert?.phase ?? 0,
    phaseDescription:
      alert?.phase === 0 ? 'Standby - monitoring flood conditions' :
      alert?.phase === 1 ? 'Phase 1 - Activated: pre-positioning supplies' :
      'Phase 2 - Last-mile delivery in progress',
    activatedAt: alert?.activated ? alert.activatedAt : null,
    activeDistricts,
    totalDistricts,
    activeDeliveryTeams: activeRuns,
    householdsServed: deliveriesCompleted,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── UPDATE OWN AVATAR ────────────────────────────────────────────────────────

export async function updateOwnAvatar(userId: string, avatarBase64: string) {
  if (avatarBase64.length > 70_000) {
    throw new Error('Image too large. Please use an image under 50kb.');
  }

  if (!avatarBase64.startsWith('data:image/')) {
    throw new Error('Invalid image format.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarBase64 },
  });

  return { message: 'Avatar updated successfully' };
}