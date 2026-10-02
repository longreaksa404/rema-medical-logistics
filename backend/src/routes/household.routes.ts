import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireDistrictAccess, district } from '../middleware/district-access';
import {
  scoreOnly,
  create,
  list,
  priorityQueue,
  getOne,
  update,
} from '../controllers/household.controller';
import { validate } from '../middleware/validate';
import { scoreBody, createHouseholdBody, updateHouseholdBody } from '../schemas/household.schemas';

// ─── SCORE ROUTER ─────────────────────────────────────────────────────────────
export const scoreRouter = Router();

// POST /api/score/household — score only, no DB write
scoreRouter.post('/household', requireAuth, validate({ body: scoreBody }), scoreOnly);

// ─── HOUSEHOLD ROUTER ─────────────────────────────────────────────────────────
export const householdRouter = Router();

// IMPORTANT: /priority-queue must come BEFORE /:id
// Express matches routes top-to-bottom; if /:id is first,
// "priority-queue" would be treated as an ID.
householdRouter.get('/priority-queue', requireAuth, priorityQueue);

householdRouter.get('/', requireAuth, list);
// Assessments: VOLUNTEER+ in their own district (VIEWER is read-only)
householdRouter.post('/', requireAuth, requireRole('VOLUNTEER'), validate({ body: createHouseholdBody }),
  requireDistrictAccess(district.fromBody('districtId')), create);
householdRouter.get('/:id', requireAuth, getOne);
householdRouter.patch('/:id', requireAuth, requireRole('VOLUNTEER'), validate({ body: updateHouseholdBody }),
  requireDistrictAccess(district.ofHouseholdParam('id')), update);