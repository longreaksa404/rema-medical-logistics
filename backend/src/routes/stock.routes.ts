import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getCentral,
  getCentralMovementsHandler,
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

// ─── fixed paths BEFORE :districtId wildcard ─────────────────────────────────

// Central warehouse
router.get('/central',           requireAuth, getCentral);
router.get('/central/movements', requireAuth, getCentralMovementsHandler);
router.post('/central/replenish', requireAuth, requireRole('SUPER_ADMIN'), replenishCentral);
router.patch('/central',          requireAuth, requireRole('SUPER_ADMIN'), adjustCentral);

// Allocation management
router.patch('/allocation', requireAuth, requireRole('SUPER_ADMIN'), setAllocation);

// Sub-warehouse aggregate
router.get('/status', requireAuth, getStatus);

// Audit logs
router.get('/movements',              requireAuth, getMovements);
router.get('/movements/:districtId',  requireAuth, getMovementsByDistrictHandler);

// Write operations
router.post('/dispatch',   requireAuth, dispatch);
router.post('/reallocate', requireAuth, requireRole('EMERGENCY_COORDINATOR'), reallocate);
router.post('/adjust',     requireAuth, requireRole('HUB_MANAGER'), adjust);

// District stock — LAST
router.get('/:districtId', requireAuth, getByDistrict);

export default router;
