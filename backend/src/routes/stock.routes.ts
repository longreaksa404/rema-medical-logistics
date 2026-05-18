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
  replenishCentral,
  adjustCentral,
  setAllocation,
} from '../controllers/stock.controller';

const router = Router();

// ─── IMPORTANT: fixed paths BEFORE :districtId wildcard ──────────────────────

// GET /api/stock/central — central warehouse stock
router.get('/central', requireAuth, getCentral);

// POST /api/stock/central/replenish — new stock arriving (SUPER_ADMIN)
router.post('/central/replenish', requireAuth, requireRole('SUPER_ADMIN'), replenishCentral);

// PATCH /api/stock/central — manual correction at central (SUPER_ADMIN)
router.patch('/central', requireAuth, requireRole('SUPER_ADMIN'), adjustCentral);

// PATCH /api/stock/allocation — set Total allocation for central or sub-warehouse (SUPER_ADMIN)
router.patch('/allocation', requireAuth, requireRole('SUPER_ADMIN'), setAllocation);

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