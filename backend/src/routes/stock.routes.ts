import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getStatus,
  getByDistrict,
  dispatch,
  reallocate,
  adjust,
  getMovements,
  getMovementsByDistrictHandler,
} from '../controllers/stock.controller';

const router = Router();

// ─── IMPORTANT: Fixed paths must come BEFORE :districtId ─────────────────────
// Express matches top-to-bottom. If :districtId came first, "status" and
// "movements" would be treated as district IDs.

// GET /api/stock/status — all sub-warehouses
router.get('/status', requireAuth, getStatus);

// GET /api/stock/movements — full audit log
// Must be before /movements/:districtId and before /:districtId
router.get('/movements', requireAuth, getMovements);

// GET /api/stock/movements/:districtId — per-district audit log
router.get('/movements/:districtId', requireAuth, getMovementsByDistrictHandler);

// POST /api/stock/dispatch — central → sub-warehouse (any authenticated user can record)
router.post('/dispatch', requireAuth, dispatch);

// POST /api/stock/reallocate — Emergency Coordinator only
router.post('/reallocate', requireAuth, requireRole('EMERGENCY_COORDINATOR'), reallocate);

// POST /api/stock/adjust — Hub Manager or above
router.post('/adjust', requireAuth, requireRole('HUB_MANAGER'), adjust);

// GET /api/stock/:districtId — LAST, after all fixed paths
router.get('/:districtId', requireAuth, getByDistrict);

export default router;