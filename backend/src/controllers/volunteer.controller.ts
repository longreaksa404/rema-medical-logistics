import { Request, Response } from 'express';
import { VolunteerStatus } from '@prisma/client';
// update the import at the top
import {
  listVolunteers,
  createCommunityVolunteer,
  updateVolunteer,
  setVolunteerRole,
  assignVolunteer,
  assignTeam,
  getDistrictRoster,
  deleteTeamAssignments,  // add this
} from '../services/volunteer.service';
import { sendError } from '../middleware/error-handler';

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
    sendError(res, err, 500);
  }
}

// community volunteers only — VOLUNTEER users created via POST /api/users
export async function createCommunity(req: Request, res: Response): Promise<void> {
  const { districtId, name, phone } = req.body;

  try {
    const volunteer = await createCommunityVolunteer({ districtId, name, phone });
    res.status(201).json(volunteer);
  } catch (err) {
    sendError(res, err, 400);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const { name, phone, status } = req.body;

  try {
    const volunteer = await updateVolunteer(req.params.id, { name, phone, status });
    res.json(volunteer);
  } catch (err) {
    sendError(res, err, 400);
  }
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const { role } = req.body;

  try {
    const volunteer = await setVolunteerRole(req.params.id, role);
    res.json(volunteer);
  } catch (err) {
    sendError(res, err, 400);
  }
}

export async function assign(req: Request, res: Response): Promise<void> {
  const { volunteerId, subWarehouseId, alertId, zone, teamNumber } = req.body;

  try {
    const assignment = await assignVolunteer({
      volunteerId,
      subWarehouseId,
      alertId,
      zone,
      teamNumber,
    });
    res.status(201).json(assignment);
  } catch (err) {
    sendError(res, err, 400);
  }
}

// deploy a full team — TL + members in one transaction
export async function assignTeamHandler(req: Request, res: Response): Promise<void> {
  const { subWarehouseId, alertId, zone, teamNumber, leaderId, memberIds } = req.body;

  try {
    const assignments = await assignTeam({
      subWarehouseId,
      alertId,
      zone,
      teamNumber,
      leaderId,
      memberIds,
    });
    res.status(201).json(assignments);
  } catch (err) {
    sendError(res, err, 400);
  }
}

export async function roster(req: Request, res: Response): Promise<void> {
  try {
    const alertId = req.query.alertId as string | undefined;
    const result = await getDistrictRoster(req.params.districtId, alertId);
    res.json(result);
  } catch (err) {
    sendError(res, err, 404);
  }
}

// add at the bottom
export async function deleteTeam(req: Request, res: Response): Promise<void> {
  const { districtId, alertId, teamNumber } = req.body;

  try {
    const result = await deleteTeamAssignments({
      districtId,
      alertId,
      teamNumber,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
}