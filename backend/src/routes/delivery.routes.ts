import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  startRun,
  listRuns,
  getRun,
  addReceipt,
  completeRun,
  abortRun,
} from '../controllers/delivery.controller';

const router = Router();

// ─── IMPORTANT: Specific sub-paths before /:id ────────────────────────────────
// /receipts and /runs must be registered before /:id/complete or /:id/abort
// Express matches top-to-bottom.

// POST /api/delivery/receipts — record per-household delivery confirmation
router.post('/receipts', requireAuth, addReceipt);

// GET /api/delivery/runs — list all runs
router.get('/runs', requireAuth, listRuns);

// POST /api/delivery/runs — start a new delivery run
router.post('/runs', requireAuth, startRun);

// GET /api/delivery/runs/:id — single run with all receipts
router.get('/runs/:id', requireAuth, getRun);

// PATCH /api/delivery/runs/:id/complete — mark run complete
router.patch('/runs/:id/complete', requireAuth, completeRun);

// PATCH /api/delivery/runs/:id/abort — abort run (volunteer safety, Hub Manager)
router.patch('/runs/:id/abort', requireAuth, requireRole('HUB_MANAGER'), abortRun);

export default router;