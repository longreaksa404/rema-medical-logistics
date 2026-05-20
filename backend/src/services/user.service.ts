import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

// ─── ROLE HIERARCHY ───────────────────────────────────────────────────────────
// SUPER_ADMIN can create/manage any role except another SUPER_ADMIN.
// SUPER_ADMIN accounts are only created via seed script — never via API.
// This is a deliberate security decision for real deployment.

const CREATABLE_ROLES: Role[] = [
  Role.EMERGENCY_COORDINATOR,
  Role.HUB_MANAGER,
  Role.VOLUNTEER,
  Role.VIEWER,
];

// ─── CREATE USER ──────────────────────────────────────────────────────────────
// SUPER_ADMIN only. Cannot create another SUPER_ADMIN.

export async function createUser(data: {
  email: string;
  name: string;
  role: Role;
  districtId?: string;
  temporaryPassword: string;
}) {
  const { email, name, role, districtId, temporaryPassword } = data;

  if (!CREATABLE_ROLES.includes(role)) {
    throw new Error(
      `Cannot create SUPER_ADMIN via API. ` +
      `Allowed roles: ${CREATABLE_ROLES.join(', ')}`
    );
  }

  // Roles that require a district assignment
  const districtRequiredRoles: Role[] = [Role.HUB_MANAGER, Role.VOLUNTEER];
  if (districtRequiredRoles.includes(role) && !districtId) {
    throw new Error(`Role ${role} requires a districtId`);
  }

  // Verify district exists if provided
  if (districtId) {
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) throw new Error(`District not found: ${districtId}`);
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error(`Email already in use: ${email}`);

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      districtId: districtId ?? null,
      active: true,
      mustChangePassword: true,   // force change on first login
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

  return user;  
}

// ─── LIST USERS ───────────────────────────────────────────────────────────────
// SUPER_ADMIN only. Never returns passwordHash.

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

// ─── UPDATE USER ──────────────────────────────────────────────────────────────
// SUPER_ADMIN only. Cannot change role to SUPER_ADMIN.
// Cannot deactivate yourself.

export async function updateUser(
  id: string,
  requestingUserId: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    districtId?: string | null;
    active?: boolean;
  }
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error('User not found');

  // Cannot deactivate yourself
  if (data.active === false && id === requestingUserId) {
    throw new Error('Cannot deactivate your own account');
  }

  // Cannot change role to SUPER_ADMIN
  if (data.role && !CREATABLE_ROLES.includes(data.role)) {
    throw new Error('Cannot assign SUPER_ADMIN role via API');
  }

  // Cannot modify another SUPER_ADMIN
  if (existing.role === Role.SUPER_ADMIN) {
    throw new Error('Cannot modify a SUPER_ADMIN account via API');
  }

  // Validate email uniqueness if changing email
  if (data.email && data.email !== existing.email) {
    const emailInUse = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailInUse) throw new Error(`Email already in use: ${data.email}`);
  }

  // Validate district if provided
  if (data.districtId) {
    const district = await prisma.district.findUnique({ where: { id: data.districtId } });
    if (!district) throw new Error(`District not found: ${data.districtId}`);
  }

  return prisma.user.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      email: data.email ?? existing.email,
      role: data.role ?? existing.role,
      districtId: data.districtId !== undefined ? data.districtId : existing.districtId,
      active: data.active !== undefined ? data.active : existing.active,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      districtId: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ─── CHANGE OWN PASSWORD ──────────────────────────────────────────────────────
// Any authenticated user can change their own password.
// Must provide current password to confirm identity.

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
    data: {
      passwordHash,
      mustChangePassword: false,  // clear the flag on successful change
    },
  });


  return { message: 'Password updated successfully' };
}

// ─── RESET USER PASSWORD ──────────────────────────────────────────────────────
// SUPER_ADMIN only. Sets a temporary password — user must change on next login.
// Does not require knowing the current password (admin override).

export async function resetUserPassword(
  targetUserId: string,
  temporaryPassword: string
) {
  if (temporaryPassword.length < 8) {
    throw new Error('Temporary password must be at least 8 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new Error('User not found');

  // Cannot reset SUPER_ADMIN password via API
  if (user.role === Role.SUPER_ADMIN) {
    throw new Error('Cannot reset a SUPER_ADMIN password via API');
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      mustChangePassword: true,   // force change after admin reset
    },
  });

  return {
    message: `Password reset for ${user.email}. User must change password on next login.`,
    userId: targetUserId,
    email: user.email,
    mustChangePassword: true,
  };
}

// ─── PUBLIC SYSTEM STATUS ─────────────────────────────────────────────────────
// No auth required. Returns only non-sensitive aggregate data.
// Safe to expose: phase, activation state, district count affected.
// Never exposes: household data, addresses, medical info, user info.

export async function getPublicStatus() {
  const alert = await prisma.floodAlert.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  // Count active districts (those with ACTIVE sub-warehouse)
  const activeDistricts = await prisma.subWarehouse.count({
    where: { status: 'ACTIVE' },
  });

  const totalDistricts = await prisma.district.count();

  // Active delivery runs (count only, no detail)
  const activeRuns = await prisma.deliveryRun.count({
    where: { status: 'IN_PROGRESS' },
  });

  // Total deliveries completed (count only)
  const deliveriesCompleted = await prisma.household.count({
    where: { delivered: true },
  });

  return {
    system: 'REMA — Rapid Emergency Medical Access',
    operatedBy: 'Viet Nam Red Cross',
    status: alert?.activated ? 'ACTIVE' : 'STANDBY',
    phase: alert?.phase ?? 0,
    phaseDescription:
      alert?.phase === 0 ? 'Standby — monitoring flood conditions' :
      alert?.phase === 1 ? 'Phase 1 — Activated: pre-positioning supplies' :
      'Phase 2 — Last-mile delivery in progress',
    activatedAt: alert?.activated ? alert.activatedAt : null,
    activeDistricts,
    totalDistricts,
    activeDeliveryTeams: activeRuns,
    householdsServed: deliveriesCompleted,
    lastUpdated: new Date().toISOString(),
  };
}