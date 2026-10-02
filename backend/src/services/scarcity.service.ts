import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { io } from '../app';
import { EmkKey, StockLevels, levelOf, newlyScarce } from '../utils/stock.utils';

// ─── LIVE SCARCITY ALERTS (Section C.9) ───────────────────────────────────────
// When a stock change pushes an EMK type below 30% of its allocation:
//   - socket event `scarcity_triggered` → dashboards refresh and show a toast
//   - a SCARCITY notification for EC + SUPER_ADMIN, and the district's Hub Managers

export interface ScarcityAlert {
  scope: 'subWarehouse' | 'central';
  districtId: string | null;
  districtName: string | null;
  emkType: EmkKey;
  remaining: number;
  total: number;
  pct: number;
}

// null = central warehouse
type Location = { districtId: string; districtName: string } | null;

export function scarcityAlerts(location: Location, before: StockLevels, after: StockLevels): ScarcityAlert[] {
  return newlyScarce(before, after).map((emkType) => {
    const { remaining, total } = levelOf(after, emkType);
    return {
      scope: location ? 'subWarehouse' : 'central',
      districtId: location?.districtId ?? null,
      districtName: location?.districtName ?? null,
      emkType,
      remaining,
      total,
      pct: total > 0 ? Math.round((remaining / total) * 100) : 0,
    };
  });
}

function messageFor(a: ScarcityAlert): string {
  const where = a.scope === 'central' ? 'Central warehouse' : `${a.districtName} sub-warehouse`;
  return `Stock scarcity: ${where} ${a.emkType} is at ${a.pct}% (${a.remaining} of ${a.total}). ` +
    (a.scope === 'central' ? 'Arrange resupply.' : 'Reallocate or resupply before it runs out.');
}

// Never throws — a failed alert must not fail the stock change that caused it
export async function announceScarcity(location: Location, before: StockLevels, after: StockLevels): Promise<ScarcityAlert[]> {
  const alerts = scarcityAlerts(location, before, after);
  if (alerts.length === 0) return alerts;

  try {
    for (const alert of alerts) io.emit('scarcity_triggered', alert);

    const recipients = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: { in: [Role.EMERGENCY_COORDINATOR, Role.SUPER_ADMIN] } },
          ...(location ? [{ role: Role.HUB_MANAGER, districtId: location.districtId }] : []),
        ],
      },
      select: { id: true },
    });

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: alerts.flatMap((alert) =>
          recipients.map((u) => ({ userId: u.id, type: 'SCARCITY', message: messageFor(alert) }))
        ),
      });
    }
  } catch (err) {
    console.error('[scarcity] failed to announce', err);
  }
  return alerts;
}
