import { Request, Response } from 'express';
import { VolunteerRole, VolunteerStatus } from '@prisma/client';
import {
  listVolunteers,
  createCommunityVolunteer,
  updateVolunteer,
  setVolunteerRole,
  assignVolunteer,
  getDistrictRoster,
} from '../services/volunteer.service';

// ─── GET /api/volunteers ──────────────────────────────────────────────────────

export async function list(req: Request, res: Response): Promise<void> {
  const { districtId, status } = req.query;

  const validStatuses: VolunteerStatus[] = ['AVAILABLE', 'DEPLOYED', 'INACTIVE'];
  if (status && !validStatuses.includes(status as VolunteerStatus)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const volunteers = await listVolunteers({
      districtId: districtId as string | undefined,
      status: status as VolunteerStatus | undefined,
    });
    res.json(volunteers);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching volunteers';
    res.status(500).json({ error: message });
  }
}

// ─── POST /api/volunteers ─────────────────────────────────────────────────────
// community volunteers only — no login account
// VOLUNTEER users are created via POST /api/users and auto-get a volunteer record

export async function createCommunity(req: Request, res: Response): Promise<void> {
  const { districtId, name, phone } = req.body;

  if (!districtId || !name || !phone) {
    res.status(400).json({ error: 'districtId, name, and phone are required' });
    return;
  }

  try {
    const volunteer = await createCommunityVolunteer({ districtId, name, phone });
    res.status(201).json(volunteer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creating volunteer';
    res.status(400).json({ error: message });
  }
}

// ─── PATCH /api/volunteers/:id ────────────────────────────────────────────────

export async function update(req: Request, res: Response): Promise<void> {
  const { name, phone, status } = req.body;

  // role changes go through PATCH /api/volunteers/:id/role
  if (req.body.role) {
    res.status(400).json({ error: 'Use PATCH /api/volunteers/:id/role to change field role' });
    return;
  }

  try {
    const volunteer = await updateVolunteer(req.params.id, { name, phone, status });
    res.json(volunteer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error updating volunteer';
    res.status(400).json({ error: message });
  }
}

// ─── PATCH /api/volunteers/:id/role ──────────────────────────────────────────
// promote or demote — Hub Manager sets who leads in the field

export async function updateRole(req: Request, res: Response): Promise<void> {
  const { role } = req.body;

  const validRoles: VolunteerRole[] = ['TEAM_LEADER', 'VOLUNTEER'];
  if (!role || !validRoles.includes(role)) {
    res.status(400).json({ error: 'role must be TEAM_LEADER or VOLUNTEER' });
    return;
  }

  try {
    const volunteer = await setVolunteerRole(req.params.id, role as VolunteerRole);
    res.json(volunteer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error updating role';
    res.status(400).json({ error: message });
  }
}

// ─── POST /api/volunteers/assign ──────────────────────────────────────────────

export async function assign(req: Request, res: Response): Promise<void> {
  const { volunteerId, subWarehouseId, alertId, zone, teamNumber } = req.body;

  if (!volunteerId || !subWarehouseId || !alertId || !zone || !teamNumber) {
    res.status(400).json({
      error: 'volunteerId, subWarehouseId, alertId, zone, and teamNumber are required',
    });
    return;
  }

  try {
    const assignment = await assignVolunteer({
      volunteerId,
      subWarehouseId,
      alertId,
      zone,
      teamNumber: Number(teamNumber),
    });
    res.status(201).json(assignment);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error assigning volunteer';
    res.status(400).json({ error: message });
  }
}

// ─── GET /api/volunteers/:districtId/roster ───────────────────────────────────

export async function roster(req: Request, res: Response): Promise<void> {
  try {
    const result = await getDistrictRoster(req.params.districtId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'District not found';
    res.status(404).json({ error: message });
  }
}