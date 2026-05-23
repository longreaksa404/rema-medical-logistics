import { Request, Response } from 'express';
import { VolunteerRole, VolunteerStatus } from '@prisma/client';
import {
  listVolunteers,
  createCommunityVolunteer,
  updateVolunteer,
  setVolunteerRole,
  assignVolunteer,
  assignTeam,
  getDistrictRoster,
} from '../services/volunteer.service';

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

// community volunteers only — VOLUNTEER users created via POST /api/users
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

export async function update(req: Request, res: Response): Promise<void> {
  const { name, phone, status } = req.body;

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

// deploy a full team — TL + members in one transaction
export async function assignTeamHandler(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, alertId, zone, teamNumber, leaderId, memberIds } = req.body;

  if (!subWarehouseId || !alertId || !zone || !teamNumber || !leaderId) {
    res.status(400).json({
      error: 'subWarehouseId, alertId, zone, teamNumber, and leaderId are required',
    });
    return;
  }

  try {
    const assignments = await assignTeam({
      subWarehouseId,
      alertId,
      zone,
      teamNumber: Number(teamNumber),
      leaderId,
      memberIds: Array.isArray(memberIds) ? memberIds : [],
    });
    res.status(201).json(assignments);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error deploying team';
    res.status(400).json({ error: message });
  }
}

export async function roster(req: Request, res: Response): Promise<void> {
  try {
    const alertId = req.query.alertId as string | undefined;
    const result = await getDistrictRoster(req.params.districtId, alertId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'District not found';
    res.status(404).json({ error: message });
  }
}