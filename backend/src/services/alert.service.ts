import { prisma } from '../lib/prisma';
import { invalidateCache } from './dashboard.service';
import { DeliveryRunStatus, Role, VolunteerStatus } from '@prisma/client';
import { io } from '../app';
import { deleteCached } from '../utils/cache';
import { ConflictError } from '../lib/errors';


export type TriggerCondition =
  | 'warningLevelTwo'
  | 'rainfallExceeds100mm'
  | 'streetFloodingReport';

const VALID_CONDITIONS: TriggerCondition[] = [
  'warningLevelTwo',
  'rainfallExceeds100mm',
  'streetFloodingReport',
];

export function isValidCondition(val: string): val is TriggerCondition {
  return VALID_CONDITIONS.includes(val as TriggerCondition);
}

// ─── NOTIFICATION HELPERS ─────────────────────────────────────────────────────

// Notify all users with a given role
async function notifyByRole(
  roles: Role[],
  type: string,
  message: string
): Promise<void> {
  const recipients = await prisma.user.findMany({
    where: { role: { in: roles }, active: true },
    select: { id: true },
  });

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((u) => ({ userId: u.id, type, message })),
  });
}

// ─── GET OR CREATE ACTIVE ALERT ───────────────────────────────────────────────

// Arbitrary constant key for a Postgres advisory lock — serialises creation of
// the alert row so concurrent first requests cannot each create their own.
const ALERT_CREATE_LOCK = 72_001;

async function getOrCreateActiveAlert() {
  const existing = await prisma.floodAlert.findFirst({
    where: { closedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ALERT_CREATE_LOCK})`;
    const again = await tx.floodAlert.findFirst({ where: { closedAt: null }, orderBy: { createdAt: 'desc' } });
    if (again) return again;
    return tx.floodAlert.create({
      data: {
        warningLevelTwo: false,
        rainfallExceeds100mm: false,
        streetFloodingReport: false,
        activated: false,
        phase: 0,
      },
    });
  });
}

// ─── SUBMIT TRIGGER CONDITION ─────────────────────────────────────────────────
// Two steps, each a single atomic statement:
//   1. set the condition true (and log who confirmed it)
//   2. activate only if still inactive AND at least 2 of 3 conditions are true
// Step 2 re-reads the row under its own lock, so two coordinators confirming
// different conditions at the same time can neither both activate nor both
// miss the activation (which a read-then-compute approach allowed).

const TWO_OF_THREE = [
  { warningLevelTwo: true, rainfallExceeds100mm: true },
  { warningLevelTwo: true, streetFloodingReport: true },
  { rainfallExceeds100mm: true, streetFloodingReport: true },
];

export async function submitTrigger(condition: TriggerCondition, reportedById: string) {
  const alert = await getOrCreateActiveAlert();

  await prisma.$transaction([
    prisma.floodAlert.update({
      where: { id: alert.id },
      data: { [condition]: true },
    }),
    prisma.alertConditionReport.create({
      data: { alertId: alert.id, condition, reportedById },
    }),
  ]);

  const { count } = await prisma.floodAlert.updateMany({
    where: { id: alert.id, activated: false, OR: TWO_OF_THREE },
    data: { activated: true, activatedAt: new Date(), phase: 1 },
  });
  const justActivated = count === 1;

  invalidateCache();

  // Notify all hub managers and coordinators when REMA activates
  if (justActivated) {
    io.emit('phase_changed', { phase: 1, activated: true });
    await notifyByRole(
      [Role.HUB_MANAGER, Role.EMERGENCY_COORDINATOR, Role.SUPER_ADMIN],
      'ACTIVATION',
      'REMA has been activated - 2 of 3 trigger conditions met. Phase 1 is now active. Pre-position stock at sub-warehouses immediately.'
    );
  }

  return prisma.floodAlert.findUniqueOrThrow({ where: { id: alert.id } });
}

// ─── GET CURRENT STATUS ───────────────────────────────────────────────────────

export async function getAlertStatus() {
  const alert = await getOrCreateActiveAlert();
  const conditionReports = await prisma.alertConditionReport.findMany({
    where: { alertId: alert.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      condition: true,
      createdAt: true,
      reportedBy: { select: { name: true, role: true } },
    },
  });
  return { ...alert, conditionReports };
}

// ─── ADVANCE PHASE ────────────────────────────────────────────────────────────
// Forward only (0→1→2). The update is conditional on the current phase, so two
// coordinators pressing "advance" together cannot both succeed.

export async function advancePhase(targetPhase: number) {
  const alert = await getOrCreateActiveAlert();

  if (!alert.activated) {
    throw new Error('Cannot advance phase - REMA is not yet activated');
  }

  if (targetPhase > 2) {
    throw new Error('Maximum phase is 2');
  }

  const { count } = await prisma.floodAlert.updateMany({
    where: { id: alert.id, activated: true, phase: targetPhase - 1, closedAt: null },
    data: { phase: targetPhase, ...(targetPhase === 2 && { phase2At: new Date() }) },
  });
  if (count === 0) {
    const current = await prisma.floodAlert.findUniqueOrThrow({ where: { id: alert.id } });
    throw new Error(
      `Invalid phase transition: current phase is ${current.phase}, cannot jump to ${targetPhase}`
    );
  }
  const updated = await prisma.floodAlert.findUniqueOrThrow({ where: { id: alert.id } });

  invalidateCache();

  // Notify hub managers that phase has advanced - they need to act
  await notifyByRole(
    [Role.HUB_MANAGER, Role.EMERGENCY_COORDINATOR, Role.SUPER_ADMIN],
    'PHASE_CHANGE',
    `REMA has advanced to Phase ${targetPhase}. ${
      targetPhase === 1
        ? 'Begin pre-positioning stock at sub-warehouses. Community assessment required.'
        : 'Begin adaptive last-mile delivery from sub-warehouses. Priority queue is live.'
    }`
  );
  io.emit('phase_changed', { phase: targetPhase });

  return updated;
}

// ─── CLOSE EVENT / RESET SYSTEM ───────────────────────────────────────────────
// Archives the current flood event (it stays readable in Event History) and
// starts a fresh standby alert (Phase 0). Because the event is over:
//   - delivery runs still IN_PROGRESS are marked ABORTED ("Flood event closed")
//   - deployed volunteers are stood down to AVAILABLE
// A standby alert with nothing triggered has nothing to archive and is left as is.

export interface ResetResult {
  alert: Awaited<ReturnType<typeof getOrCreateActiveAlert>>;
  archivedEventId: string | null;
  runsAborted: number;
  volunteersStoodDown: number;
}

export async function resetSystem(closedById: string): Promise<ResetResult> {
  const alert = await getOrCreateActiveAlert();

  const hadActivity =
    alert.activated || alert.phase > 0 ||
    alert.warningLevelTwo || alert.rainfallExceeds100mm || alert.streetFloodingReport;

  if (!hadActivity) {
    return { alert, archivedEventId: null, runsAborted: 0, volunteersStoodDown: 0 };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    // only one concurrent reset can close the event
    const { count } = await tx.floodAlert.updateMany({
      where: { id: alert.id, closedAt: null },
      data: { closedAt: now, closedById },
    });
    if (count === 0) throw new ConflictError('This flood event has already been closed');

    const runs = await tx.deliveryRun.updateMany({
      where: { status: DeliveryRunStatus.IN_PROGRESS },
      data: { status: DeliveryRunStatus.ABORTED, returnedAt: now, abortReason: 'Flood event closed' },
    });
    const volunteers = await tx.volunteer.updateMany({
      where: { status: VolunteerStatus.DEPLOYED },
      data: { status: VolunteerStatus.AVAILABLE },
    });
    // starts exactly when the old one closed, so every record belongs to exactly one event
    const next = await tx.floodAlert.create({ data: { createdAt: now } });

    return { next, runsAborted: runs.count, volunteersStoodDown: volunteers.count };
  }, { timeout: 15_000 });

  // runs, rosters, queues and dashboards all changed — drop every cached view
  deleteCached();
  invalidateCache();
  io.emit('phase_changed', { phase: 0, activated: false });

  await notifyByRole(
    [Role.HUB_MANAGER, Role.EMERGENCY_COORDINATOR, Role.SUPER_ADMIN],
    'EVENT_CLOSED',
    'The flood event has been closed and archived. REMA is back on standby (Phase 0).' +
      (result.runsAborted > 0 ? ` ${result.runsAborted} delivery run(s) still in progress were marked aborted.` : ''),
  );

  return {
    alert: result.next,
    archivedEventId: alert.id,
    runsAborted: result.runsAborted,
    volunteersStoodDown: result.volunteersStoodDown,
  };
}
