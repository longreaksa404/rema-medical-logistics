import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getCentral,
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
// Express matches top-to-bottom. If :districtId came first, "central", "status"
// and "movements" would be swallowed as district IDs.

// GET /api/stock/central — central warehouse stock (deducted on every dispatch)
router.get('/central', requireAuth, getCentral);

// GET /api/stock/status — all sub-warehouses aggregate
router.get('/status', requireAuth, getStatus);

// GET /api/stock/movements — full audit log
router.get('/movements', requireAuth, getMovements);

// GET /api/stock/movements/:districtId — per-district audit log
router.get('/movements/:districtId', requireAuth, getMovementsByDistrictHandler);

// POST /api/stock/dispatch — central → sub-warehouse
router.post('/dispatch', requireAuth, dispatch);

// POST /api/stock/reallocate — Emergency Coordinator only
router.post('/reallocate', requireAuth, requireRole('EMERGENCY_COORDINATOR'), reallocate);

// POST /api/stock/adjust — Hub Manager or above
router.post('/adjust', requireAuth, requireRole('HUB_MANAGER'), adjust);

// GET /api/stock/:districtId — LAST, after all fixed paths
router.get('/:districtId', requireAuth, getByDistrict);

export default router;