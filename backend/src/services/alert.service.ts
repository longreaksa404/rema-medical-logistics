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

async function getOrCreateActiveAlert() {
  const existing = await prisma.floodAlert.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (existing) return existing;

  return prisma.floodAlert.create({
    data: {
      warningLevelTwo: false,
      rainfallExceeds100mm: false,
      streetFloodingReport: false,
      activated: false,
      phase: 0,
    },
  });
}

// ─── SUBMIT TRIGGER CONDITION ─────────────────────────────────────────────────

export async function submitTrigger(condition: TriggerCondition) {
  const alert = await getOrCreateActiveAlert();

  const update: Record<string, boolean | string | Date | number> = {
    [condition]: true,
  };

  const current = {
    warningLevelTwo: alert.warningLevelTwo,
    rainfallExceeds100mm: alert.rainfallExceeds100mm,
    streetFloodingReport: alert.streetFloodingReport,
    [condition]: true,
  };

  const trueCount = [
    current.warningLevelTwo,
    current.rainfallExceeds100mm,
    current.streetFloodingReport,
  ].filter(Boolean).length;

  let justActivated = false;

  if (!alert.activated && trueCount >= 2) {
    update.activated = true;
    update.activatedAt = new Date();
    update.phase = 1;
    justActivated = true;
    invalidateCache();
  }

  const updated = await prisma.floodAlert.update({
    where: { id: alert.id },
    data: update,
  });

  // Notify all hub managers and coordinators when REMA activates
  if (justActivated) {
    io.emit('phase_changed', { phase: 1, activated: true });
    await notifyByRole(
      [Role.HUB_MANAGER, Role.EMERGENCY_COORDINATOR, Role.SUPER_ADMIN],
      'ACTIVATION',
      'REMA has been activated - 2 of 3 trigger conditions met. Phase 1 is now active. Pre-position stock at sub-warehouses immediately.'
    );
  }

  return updated;
}

// ─── GET CURRENT STATUS ───────────────────────────────────────────────────────

export async function getAlertStatus() {
  return getOrCreateActiveAlert();
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
  return updated;
}