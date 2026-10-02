import { prisma } from '../lib/prisma';
import { invalidateCache } from './dashboard.service';
import { Role } from '@prisma/client';
import { io } from '../app';


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
    orderBy: { createdAt: 'desc' },
  });

  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ALERT_CREATE_LOCK})`;
    const again = await tx.floodAlert.findFirst({ orderBy: { createdAt: 'desc' } });
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

export async function advancePhase(targetPhase: number) {
  const alert = await getOrCreateActiveAlert();

  if (!alert.activated) {
    throw new Error('Cannot advance phase - REMA is not yet activated');
  }

  if (targetPhase !== alert.phase + 1) {
    throw new Error(
      `Invalid phase transition: current phase is ${alert.phase}, cannot jump to ${targetPhase}`
    );
  }

  if (targetPhase > 2) {
    throw new Error('Maximum phase is 2');
  }

  const updated = await prisma.floodAlert.update({
    where: { id: alert.id },
    data: { phase: targetPhase },
  });

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

// ─── RESET SYSTEM ─────────────────────────────────────────────────────────────

export async function resetSystem() {
  const alert = await getOrCreateActiveAlert();

  const updated = await prisma.floodAlert.update({
    where: { id: alert.id },
    data: {
      phase: 0,
      activated: false,
      activatedAt: null,
      warningLevelTwo: false,
      rainfallExceeds100mm: false,
      streetFloodingReport: false,
    },
  });

  invalidateCache();
  io.emit('phase_changed', { phase: 0, activated: false });
  return updated;
}