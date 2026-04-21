import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  scoreOnly,
  create,
  list,
  priorityQueue,
  getOne,
  update,
} from '../controllers/household.controller';

// ─── SCORE ROUTER ─────────────────────────────────────────────────────────────
export const scoreRouter = Router();

// POST /api/score/household — score only, no DB write
scoreRouter.post('/household', requireAuth, scoreOnly);

// ─── HOUSEHOLD ROUTER ─────────────────────────────────────────────────────────
export const householdRouter = Router();

// IMPORTANT: /priority-queue must come BEFORE /:id
// Express matches routes top-to-bottom; if /:id is first,
// "priority-queue" would be treated as an ID.
householdRouter.get('/priority-queue', requireAuth, priorityQueue);

householdRouter.get('/', requireAuth, list);
householdRouter.post('/', requireAuth, create);
householdRouter.get('/:id', requireAuth, getOne);
householdRouter.patch('/:id', requireAuth, update);