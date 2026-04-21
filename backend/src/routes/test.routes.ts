import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

// ─── TEST ROUTES ──────────────────────────────────────────────────────────────
// These exist only to verify that auth and role guards work correctly.
// Test sequence in Swagger:
//   1. Call without token → should get 401
//   2. Login as VIEWER, use token → /test/viewer should pass, /test/hub-manager should get 403
//   3. Login as HUB_MANAGER → /test/hub-manager should pass
//   4. Login as EMERGENCY_COORDINATOR → all pass except SUPER_ADMIN
//   5. Login as SUPER_ADMIN → all pass

const router = Router();

// Requires any valid token
router.get('/viewer', requireAuth, (_req: Request, res: Response) => {
  res.json({ message: 'Auth works — VIEWER level access confirmed', user: _req.user });
});

// Requires HUB_MANAGER or above
router.get(
  '/hub-manager',
  requireAuth,
  requireRole('HUB_MANAGER'),
  (_req: Request, res: Response) => {
    res.json({ message: 'Role guard works — HUB_MANAGER level confirmed', user: _req.user });
  }
);

// Requires EMERGENCY_COORDINATOR or above
router.get(
  '/coordinator',
  requireAuth,
  requireRole('EMERGENCY_COORDINATOR'),
  (_req: Request, res: Response) => {
    res.json({ message: 'Role guard works — EMERGENCY_COORDINATOR level confirmed', user: _req.user });
  }
);

// Requires SUPER_ADMIN only
router.get(
  '/admin',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  (_req: Request, res: Response) => {
    res.json({ message: 'Role guard works — SUPER_ADMIN level confirmed', user: _req.user });
  }
);

export default router;