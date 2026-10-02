import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../types/auth';

// ─── DISTRICT SCOPING ─────────────────────────────────────────────────────────
// PROJECT_SCOPE §7: SUPER_ADMIN and EMERGENCY_COORDINATOR work across all
// districts; HUB_MANAGER and VOLUNTEER may only act on their own district.
//
// Usage (after requireAuth + requireRole):
//   router.post('/adjust', requireAuth, requireRole('HUB_MANAGER'),
//     requireDistrictAccess(district.ofSubWarehouse('subWarehouseId')), adjust);

const CROSS_DISTRICT_ROLES = new Set(['SUPER_ADMIN', 'EMERGENCY_COORDINATOR']);

export function canAccessDistrict(user: JwtPayload, districtId: string): boolean {
  if (CROSS_DISTRICT_ROLES.has(user.role)) return true;
  return !!user.districtId && user.districtId === districtId;
}

// A resolver returns the district(s) a request touches. undefined/null means the
// field is missing or the record does not exist — the handler then responds with
// its own 400/404, so we don't leak existence through a different status.
type Resolved = string | null | undefined;
type DistrictResolver = (req: Request) => Promise<Resolved | Resolved[]>;

export function requireDistrictAccess(...resolvers: DistrictResolver[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (CROSS_DISTRICT_ROLES.has(user.role)) return next();

    try {
      for (const resolve of resolvers) {
        const resolved = await resolve(req);
        const ids = Array.isArray(resolved) ? resolved : [resolved];
        if (ids.some((id) => id && !canAccessDistrict(user, id))) {
          res.status(403).json({ error: `${user.role} can only act on their own district` });
          return;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── RESOLVERS ────────────────────────────────────────────────────────────────

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

async function subWarehouseDistrict(id: string | undefined) {
  if (!id) return undefined;
  const sw = await prisma.subWarehouse.findUnique({ where: { id }, select: { districtId: true } });
  return sw?.districtId;
}

async function volunteerDistrict(id: string | undefined) {
  if (!id) return undefined;
  const v = await prisma.volunteer.findUnique({ where: { id }, select: { districtId: true } });
  return v?.districtId;
}

export const district = {
  fromBody: (field = 'districtId'): DistrictResolver =>
    async (req) => str(req.body?.[field]),

  fromParam: (param = 'districtId'): DistrictResolver =>
    async (req) => str(req.params[param]),

  ofSubWarehouse: (bodyField: string): DistrictResolver =>
    async (req) => subWarehouseDistrict(str(req.body?.[bodyField])),

  ofVolunteerParam: (param = 'id'): DistrictResolver =>
    async (req) => volunteerDistrict(str(req.params[param])),

  ofVolunteersInBody: (...fields: string[]): DistrictResolver =>
    async (req) => {
      const ids = fields.flatMap((f) => {
        const v = req.body?.[f];
        return Array.isArray(v) ? v.map(str) : [str(v)];
      });
      return Promise.all(ids.map(volunteerDistrict));
    },

  ofRun: (get: (req: Request) => unknown): DistrictResolver =>
    async (req) => {
      const id = str(get(req));
      if (!id) return undefined;
      const run = await prisma.deliveryRun.findUnique({
        where: { id },
        select: { subWarehouse: { select: { districtId: true } } },
      });
      return run?.subWarehouse.districtId;
    },

  ofHouseholdParam: (param = 'id'): DistrictResolver =>
    async (req) => {
      const id = str(req.params[param]);
      if (!id) return undefined;
      const h = await prisma.household.findUnique({ where: { id }, select: { districtId: true } });
      return h?.districtId;
    },

  ofIncidentParam: (param = 'id'): DistrictResolver =>
    async (req) => {
      const id = str(req.params[param]);
      if (!id) return undefined;
      const i = await prisma.incident.findUnique({ where: { id }, select: { districtId: true } });
      return i?.districtId;
    },
};
