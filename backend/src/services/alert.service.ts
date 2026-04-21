import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── VALID TRIGGER CONDITIONS ─────────────────────────────────────────────────
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

// ─── GET OR CREATE ACTIVE ALERT ───────────────────────────────────────────────
// REMA operates on a single active FloodAlert record at a time.
// If none exists, create one in standby (phase 0, not activated).

async function getOrCreateActiveAlert() {
  // Find an existing non-resolved alert
  // We treat "not activated + phase 0" as standby, and "activated" as live.
  // Once a flood ends, a new alert would be created for the next event.
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
// Section A.3: REMA activates when ANY TWO of the three conditions are true.
// Conditions are additive — once set true, they stay true for the alert lifetime.

export async function submitTrigger(condition: TriggerCondition) {
  const alert = await getOrCreateActiveAlert();

  // Build the update — set the condition to true
  const update: Record<string, boolean | string | Date | number> = {
    [condition]: true,
  };

  // Count how many conditions will be true after this update
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

  // Auto-activate when 2 of 3 conditions met (Section A.3)
  if (!alert.activated && trueCount >= 2) {
    update.activated = true;
    update.activatedAt = new Date();
    update.phase = 1; // Automatically enter Phase 1
  }

  const updated = await prisma.floodAlert.update({
    where: { id: alert.id },
    data: update,
  });

  return updated;
}

// ─── GET CURRENT STATUS ───────────────────────────────────────────────────────

export async function getAlertStatus() {
  const alert = await getOrCreateActiveAlert();
  return alert;
}

// ─── ADVANCE PHASE ────────────────────────────────────────────────────────────
// Emergency Coordinator only. Phase advances 0→1→2 only (never backwards).
// Section A: Phase 1 = Hours 0–24, Phase 2 = Hours 24–48

export async function advancePhase(targetPhase: number) {
  const alert = await getOrCreateActiveAlert();

  // Validate progression
  if (!alert.activated) {
    throw new Error('Cannot advance phase — REMA is not yet activated');
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

  return updated;
}