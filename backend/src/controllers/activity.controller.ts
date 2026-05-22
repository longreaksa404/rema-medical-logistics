import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { getMyActivity } from '../services/activity.service';

export async function myActivity(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role, districtId } = req.user!;
    const data = await getMyActivity(userId, role as Role, districtId ?? null);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching activity';
    res.status(500).json({ error: message });
  }
}