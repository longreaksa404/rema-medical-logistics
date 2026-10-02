import { z } from 'zod';
import { IncidentType, RadioCheckTime, RadioStatus, VolunteerRole, VolunteerStatus } from '@prisma/client';
import { id, int, optionalText, text } from './common';

// ─── ALERT ────────────────────────────────────────────────────────────────────

export const triggerBody = z.object({
  condition: z.enum(['warningLevelTwo', 'rainfallExceeds100mm', 'streetFloodingReport']),
});

export const phaseBody = z.object({
  phase: z.union([z.literal(1), z.literal(2)], { error: 'Phase must be 1 or 2' }),
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

export const routeUpdateBody = z.object({
  districtId: id,
  zone: text(50),
  waterDepthCm: int(0, 1000),
});

// ─── INCIDENTS / RADIO ────────────────────────────────────────────────────────

export const reportIncidentBody = z.object({
  districtId: id,
  type: z.enum(IncidentType),
  description: text(2000),
});

export const radioCheckinBody = z.object({
  districtId: id,
  scheduledTime: z.enum(RadioCheckTime),
  status: z.enum(RadioStatus),
  notes: optionalText(1000),
});

// ─── VOLUNTEERS ───────────────────────────────────────────────────────────────

const phone = text(30);

export const createVolunteerBody = z.object({
  districtId: id,
  name: text(120),
  phone,
});

export const updateVolunteerBody = z.object({
  name: text(120).optional(),
  phone: phone.optional(),
  status: z.enum(VolunteerStatus).optional(),
  role: z.undefined({ error: 'Use PATCH /api/volunteers/:id/role to change field role' }),
});

export const volunteerRoleBody = z.object({
  role: z.enum(VolunteerRole),
});

export const assignVolunteerBody = z.object({
  volunteerId: id,
  subWarehouseId: id,
  alertId: id,
  zone: text(50),
  teamNumber: int(1, 1000),
});

export const assignTeamBody = z.object({
  subWarehouseId: id,
  alertId: id,
  zone: text(50),
  teamNumber: int(1, 1000),
  leaderId: id,
  memberIds: z.array(id).max(50).default([]),
});

export const deleteTeamBody = z.object({
  districtId: id,
  alertId: id,
  teamNumber: int(1, 1000),
});
