import { PrismaClient } from '@prisma/client';
import { isInScarcity } from '../utils/stock.utils';

const prisma = new PrismaClient();

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AiBriefResult {
  summary: string;
  priorityAlert: string;
  nextStep: string;
  generatedAt: string;
  dataSnapshot: {
    phase: number;
    totalCritical: number;
    totalHigh: number;
    totalMedium: number;
    totalStandard: number;
    scarcityActive: boolean;
    activeDeliveryRuns: number;
    openIncidentCount: number;
    radioCompliancePct: number;
  };
}

// ─── MOCK BRIEF GENERATOR ─────────────────────────────────────────────────────
// Reads real aggregate data from the database (same as the live version).
// Generates a realistic brief based on actual current state — no API call needed.
// NOTE: In production, replace this function body with a real API call to
// OpenAI or Anthropic. The rest of the codebase (controller, routes, frontend)
// requires zero changes.

function generateMockBrief(snapshot: AiBriefResult['dataSnapshot']): {
  summary: string;
  priorityAlert: string;
  nextStep: string;
} {
  const phaseLabel = ['pre-activation', 'Phase 1 (Hours 0–24)', 'Phase 2 (Hours 24–48)'][snapshot.phase] ?? `Phase ${snapshot.phase}`;
  const totalUndelivered = snapshot.totalCritical + snapshot.totalHigh + snapshot.totalMedium + snapshot.totalStandard;

  // ── Summary ────────────────────────────────────────────────────────────────
  let summary = `REMA is operating in ${phaseLabel} with ${snapshot.activeDeliveryRuns} active delivery run${snapshot.activeDeliveryRuns !== 1 ? 's' : ''} across all districts. `;

  if (totalUndelivered === 0) {
    summary += `All assessed households have been delivered to — no pending queue. `;
  } else {
    summary += `${totalUndelivered} households remain in the delivery queue, including ${snapshot.totalCritical} CRITICAL and ${snapshot.totalHigh} HIGH priority. `;
  }

  if (snapshot.scarcityActive) {
    summary += `Stock scarcity is active in one or more districts — reallocation may be required.`;
  } else {
    summary += `Stock levels across all districts are above the 30% scarcity threshold.`;
  }

  // ── Priority Alert ─────────────────────────────────────────────────────────
  let priorityAlert: string;

  if (snapshot.totalCritical > 0 && snapshot.scarcityActive) {
    priorityAlert = `${snapshot.totalCritical} CRITICAL household${snapshot.totalCritical !== 1 ? 's' : ''} require immediate delivery, and at least one district is in stock scarcity — coordinate a reallocation before dispatching the next run.`;
  } else if (snapshot.totalCritical > 0) {
    priorityAlert = `${snapshot.totalCritical} CRITICAL household${snapshot.totalCritical !== 1 ? 's' : ''} must be delivered in the current or next run — do not defer.`;
  } else if (snapshot.scarcityActive) {
    priorityAlert = `One or more districts have fallen below 30% stock — initiate cross-district reallocation before stock reaches zero.`;
  } else if (snapshot.radioCompliancePct < 75) {
    priorityAlert = `Radio check-in compliance is at ${snapshot.radioCompliancePct}% today — ${Math.round((1 - snapshot.radioCompliancePct / 100) * 12)} scheduled check-ins have been missed. Volunteer contact required.`;
  } else if (snapshot.openIncidentCount > 0) {
    priorityAlert = `${snapshot.openIncidentCount} open incident${snapshot.openIncidentCount !== 1 ? 's' : ''} require review — check for any ESCALATED status that needs coordinator action.`;
  } else {
    priorityAlert = `No critical alerts at this time. Operations are within normal parameters — maintain current delivery pace to clear the HIGH priority queue.`;
  }

  // ── Next Step ──────────────────────────────────────────────────────────────
  let nextStep: string;

  if (snapshot.totalCritical > 0) {
    nextStep = `Confirm with Hub Managers that the ${snapshot.totalCritical} CRITICAL household${snapshot.totalCritical !== 1 ? 's' : ''} are assigned to the current delivery run and will be reached before the next radio check-in window.`;
  } else if (snapshot.scarcityActive) {
    nextStep = `Authorise a cross-district stock reallocation via the Stock Management screen — identify the district with the highest remaining stock and transfer to the scarce district.`;
  } else if (snapshot.radioCompliancePct < 75) {
    nextStep = `Contact Hub Managers in non-compliant districts to confirm volunteer status and log any missed check-ins as incidents if volunteers are unreachable.`;
  } else if (snapshot.activeDeliveryRuns === 0 && snapshot.totalHigh > 0) {
    nextStep = `No delivery runs are currently active but ${snapshot.totalHigh} HIGH priority households are waiting — instruct Hub Managers to dispatch the next team immediately.`;
  } else {
    nextStep = `Review the district stock charts for early warning signs of scarcity, and confirm that all ${snapshot.activeDeliveryRuns} active run${snapshot.activeDeliveryRuns !== 1 ? 's' : ''} are on schedule to return before the next check-in window.`;
  }

  return { summary, priorityAlert, nextStep };
}

// ─── MAIN SERVICE FUNCTION ────────────────────────────────────────────────────

export async function generateAiBrief(): Promise<AiBriefResult> {
  // Read real aggregate state from DB — same logic as dashboard.service.ts
  const [
    alert,
    districts,
    householdCounts,
    incidentCount,
    todayCheckins,
  ] = await Promise.all([
    prisma.floodAlert.findFirst({ orderBy: { createdAt: 'desc' } }),

    prisma.district.findMany({
      orderBy: { name: 'asc' },
      include: { subWarehouse: { include: { stock: true } } },
    }),

    prisma.household.groupBy({
      by: ['priorityBand', 'delivered'],
      _count: { _all: true },
    }),

    prisma.incident.count({
      where: { status: { in: ['OPEN', 'ESCALATED'] } },
    }),

    (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return prisma.radioCheckin.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      });
    })(),
  ]);

  // Derive aggregate counts
  let critical = 0, high = 0, medium = 0, standard = 0;
  for (const row of householdCounts) {
    if (row.delivered) continue;
    switch (row.priorityBand) {
      case 'CRITICAL': critical += row._count._all; break;
      case 'HIGH':     high    += row._count._all; break;
      case 'MEDIUM':   medium  += row._count._all; break;
      case 'STANDARD': standard += row._count._all; break;
    }
  }

  // Scarcity check
  let scarcityActive = false;
  for (const d of districts) {
    const stock = d.subWarehouse?.stock;
    if (!stock) continue;
    if (
      isInScarcity(stock.emk1Remaining, stock.emk1Total) ||
      isInScarcity(stock.emk2Remaining, stock.emk2Total) ||
      isInScarcity(stock.emk3Remaining, stock.emk3Total)
    ) {
      scarcityActive = true;
      break;
    }
  }

  // Radio compliance
  const expectedCheckins = districts.length * 4;
  const radioCompliancePct = expectedCheckins > 0
    ? Math.round((todayCheckins / expectedCheckins) * 100)
    : 100;

  // Active delivery runs
  const activeDeliveryRuns = await prisma.deliveryRun.count({
    where: { status: 'IN_PROGRESS' },
  });

  const snapshot: AiBriefResult['dataSnapshot'] = {
    phase: alert?.phase ?? 0,
    totalCritical: critical,
    totalHigh: high,
    totalMedium: medium,
    totalStandard: standard,
    scarcityActive,
    activeDeliveryRuns,
    openIncidentCount: incidentCount,
    radioCompliancePct,
  };

  // Generate brief from real data — no API call
  const { summary, priorityAlert, nextStep } = generateMockBrief(snapshot);

  // Simulate a brief network delay so the loading state is visible in the UI
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return {
    summary,
    priorityAlert,
    nextStep,
    generatedAt: new Date().toISOString(),
    dataSnapshot: snapshot,
  };
}