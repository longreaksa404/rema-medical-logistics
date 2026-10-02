import { prisma } from '../lib/prisma';

// ─── FLOOD EVENT HISTORY (after-action reporting) ─────────────────────────────
// Every flood_alerts row is one event: it opens as standby, may be activated and
// advanced, and is archived when a SUPER_ADMIN closes it. Events never overlap,
// so an event's activity is everything recorded between its createdAt and its
// closedAt (or now, for the open event). Volunteer deployments link to the event
// directly through volunteer_assignments.alertId.

const MAX_EVENTS = 25;

export interface FloodEventSummary {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: Date;
  activatedAt: Date | null;
  phase2At: Date | null;
  closedAt: Date | null;
  closedBy: { name: string } | null;
  activated: boolean;
  phaseReached: number;
  conditions: { warningLevelTwo: boolean; rainfallExceeds100mm: boolean; streetFloodingReport: boolean };
  conditionReports: Array<{ condition: string; createdAt: Date; reportedBy: { name: string; role: string } }>;
  stats: {
    householdsAssessed: number;
    householdsDelivered: number;
    kitsDelivered: { EMK1: number; EMK2: number; EMK3: number };
    deliveryRuns: { total: number; complete: number; aborted: number; inProgress: number };
    incidents: { total: number; unresolved: number; byType: Record<string, number> };
    radioCheckins: { total: number; issuesReported: number };
    volunteersDeployed: number;
  };
}

export async function getEventHistory(): Promise<FloodEventSummary[]> {
  const events = await prisma.floodAlert.findMany({
    orderBy: { createdAt: 'desc' },
    take: MAX_EVENTS,
    include: {
      closedBy: { select: { name: true } },
      conditionReports: {
        orderBy: { createdAt: 'asc' },
        select: { condition: true, createdAt: true, reportedBy: { select: { name: true, role: true } } },
      },
    },
  });

  // A standby row with nothing triggered is not an "event" yet — only list the
  // open row (so the page always shows the current state) and real events.
  const relevant = events.filter((e) =>
    e.closedAt === null || e.activated || e.phase > 0 ||
    e.warningLevelTwo || e.rainfallExceeds100mm || e.streetFloodingReport
  );

  return Promise.all(relevant.map(async (event) => {
    const window = { gte: event.createdAt, ...(event.closedAt ? { lt: event.closedAt } : {}) };

    const [
      householdsAssessed,
      deliveredHouseholds,
      kits,
      runs,
      incidents,
      unresolvedIncidents,
      radioTotal,
      radioIssues,
      deployed,
    ] = await prisma.$transaction([
      prisma.household.count({ where: { createdAt: window } }),
      prisma.deliveryReceipt.findMany({ where: { deliveredAt: window }, distinct: ['householdId'], select: { householdId: true } }),
      prisma.deliveryReceipt.groupBy({ by: ['emkType'], where: { deliveredAt: window }, _sum: { quantity: true }, orderBy: { emkType: 'asc' } }),
      prisma.deliveryRun.groupBy({ by: ['status'], where: { departedAt: window }, _count: { _all: true }, orderBy: { status: 'asc' } }),
      prisma.incident.groupBy({ by: ['type'], where: { createdAt: window }, _count: { _all: true }, orderBy: { type: 'asc' } }),
      prisma.incident.count({ where: { createdAt: window, status: { not: 'RESOLVED' } } }),
      prisma.radioCheckin.count({ where: { createdAt: window } }),
      prisma.radioCheckin.count({ where: { createdAt: window, status: 'ISSUE_REPORTED' } }),
      prisma.volunteerAssignment.findMany({ where: { alertId: event.id }, distinct: ['volunteerId'], select: { volunteerId: true } }),
    ]);

    const kitsDelivered = { EMK1: 0, EMK2: 0, EMK3: 0 };
    for (const k of kits) kitsDelivered[k.emkType] = k._sum?.quantity ?? 0;

    const runCount = (status: string) => {
      const row = runs.find((r) => r.status === status);
      return typeof row?._count === 'object' ? row._count._all ?? 0 : 0;
    };
    const byType: Record<string, number> = {};
    for (const i of incidents) byType[i.type] = typeof i._count === 'object' ? i._count._all ?? 0 : 0;

    return {
      id: event.id,
      status: event.closedAt ? 'CLOSED' : 'OPEN',
      openedAt: event.createdAt,
      activatedAt: event.activatedAt,
      phase2At: event.phase2At,
      closedAt: event.closedAt,
      closedBy: event.closedBy,
      activated: event.activated,
      phaseReached: event.phase,
      conditions: {
        warningLevelTwo: event.warningLevelTwo,
        rainfallExceeds100mm: event.rainfallExceeds100mm,
        streetFloodingReport: event.streetFloodingReport,
      },
      conditionReports: event.conditionReports,
      stats: {
        householdsAssessed,
        householdsDelivered: deliveredHouseholds.length,
        kitsDelivered,
        deliveryRuns: {
          total: runCount('IN_PROGRESS') + runCount('COMPLETE') + runCount('ABORTED'),
          complete: runCount('COMPLETE'),
          aborted: runCount('ABORTED'),
          inProgress: runCount('IN_PROGRESS'),
        },
        incidents: {
          total: Object.values(byType).reduce((a, b) => a + b, 0),
          unresolved: unresolvedIncidents,
          byType,
        },
        radioCheckins: { total: radioTotal, issuesReported: radioIssues },
        volunteersDeployed: deployed.length,
      },
    } satisfies FloodEventSummary;
  }));
}
