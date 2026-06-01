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




// real version
// import Anthropic from '@anthropic-ai/sdk';
// import { PrismaClient } from '@prisma/client';
// import { isInScarcity } from '../utils/stock.utils';

// const prisma = new PrismaClient();

// // init once at module level - not per request
// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// // ─── TYPES ────────────────────────────────────────────────────────────────────

// export interface AiBriefResult {
//   summary: string;
//   priorityAlert: string;
//   nextStep: string;
//   generatedAt: string;
//   dataSnapshot: {
//     phase: number;
//     totalCritical: number;
//     totalHigh: number;
//     totalMedium: number;
//     totalStandard: number;
//     scarcityActive: boolean;
//     activeDeliveryRuns: number;
//     openIncidentCount: number;
//     radioCompliancePct: number;
//   };
// }

// // ─── PROMPT BUILDER ───────────────────────────────────────────────────────────

// function buildPrompt(snapshot: AiBriefResult['dataSnapshot']): string {
//   const phaseLabel = ['pre-activation', 'Phase 1 (Hours 0-24)', 'Phase 2 (Hours 24-48)'][snapshot.phase] ?? `Phase ${snapshot.phase}`;
//   const totalUndelivered = snapshot.totalCritical + snapshot.totalHigh + snapshot.totalMedium + snapshot.totalStandard;

//   return `
// You are the operational AI assistant for REMA - a flood emergency medical kit distribution system run by the Red Cross.

// CURRENT SYSTEM STATE:
// - Phase: ${phaseLabel}
// - Undelivered households: CRITICAL=${snapshot.totalCritical}, HIGH=${snapshot.totalHigh}, MEDIUM=${snapshot.totalMedium}, STANDARD=${snapshot.totalStandard} (total: ${totalUndelivered})
// - Stock scarcity active in one or more districts: ${snapshot.scarcityActive}
// - Active delivery runs in progress: ${snapshot.activeDeliveryRuns}
// - Open/escalated incidents: ${snapshot.openIncidentCount}
// - Radio check-in compliance today: ${snapshot.radioCompliancePct}%

// SYSTEM CONTEXT:
// - 3 districts, each with a sub-warehouse and 12 volunteers
// - 4 priority bands: CRITICAL (deliver this run), HIGH (same day), MEDIUM (within 48h), STANDARD (collection point)
// - Scarcity triggers at below 30% stock remaining
// - Radio check-ins are scheduled at 4 fixed times per day per district (12 total expected)
// - Delivery suspends above 80cm water depth

// Produce a brief for the Emergency Coordinator.

// Respond with ONLY a valid JSON object - no preamble, no explanation, no markdown fences:
// {
//   "summary": "2-3 sentence situation overview covering phase, delivery queue, and stock status",
//   "priorityAlert": "the single most urgent issue right now, or confirm no critical alerts",
//   "nextStep": "one concrete action for the Emergency Coordinator to take in the next 60 minutes"
// }

// Rules:
// - No PII, no names, no addresses
// - Be direct and operational - this is an active emergency
// - Advisory only - never imply the system will act automatically
// - If everything is normal, say so clearly rather than manufacturing urgency
// `.trim();
// }

// // ─── AI CALL ──────────────────────────────────────────────────────────────────

// async function callAI(snapshot: AiBriefResult['dataSnapshot']): Promise<{
//   summary: string;
//   priorityAlert: string;
//   nextStep: string;
// }> {
//   const message = await anthropic.messages.create({
//     model: 'claude-haiku-4-5',  // fast + cheap for a dashboard brief
//     max_tokens: 500,
//     messages: [{ role: 'user', content: buildPrompt(snapshot) }],
//   });

//   const textBlock = message.content.find(b => b.type === 'text');
//   if (!textBlock || textBlock.type !== 'text') {
//     throw new Error('no text block in API response');
//   }

//   // strip markdown fences if the model adds them anyway
//   const clean = textBlock.text.replace(/```json|```/g, '').trim();
//   const parsed = JSON.parse(clean);

//   if (!parsed.summary || !parsed.priorityAlert || !parsed.nextStep) {
//     throw new Error('API response missing required fields');
//   }

//   return {
//     summary: parsed.summary,
//     priorityAlert: parsed.priorityAlert,
//     nextStep: parsed.nextStep,
//   };
// }

// // ─── MAIN SERVICE FUNCTION ────────────────────────────────────────────────────

// export async function generateAiBrief(): Promise<AiBriefResult> {
//   const [
//     alert,
//     districts,
//     householdCounts,
//     incidentCount,
//     todayCheckins,
//   ] = await Promise.all([
//     prisma.floodAlert.findFirst({ orderBy: { createdAt: 'desc' } }),

//     prisma.district.findMany({
//       orderBy: { name: 'asc' },
//       include: { subWarehouse: { include: { stock: true } } },
//     }),

//     prisma.household.groupBy({
//       by: ['priorityBand', 'delivered'],
//       _count: { _all: true },
//     }),

//     prisma.incident.count({
//       where: { status: { in: ['OPEN', 'ESCALATED'] } },
//     }),

//     (() => {
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
//       const tomorrow = new Date(today);
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       return prisma.radioCheckin.count({
//         where: { createdAt: { gte: today, lt: tomorrow } },
//       });
//     })(),
//   ]);

//   let critical = 0, high = 0, medium = 0, standard = 0;
//   for (const row of householdCounts) {
//     if (row.delivered) continue;
//     switch (row.priorityBand) {
//       case 'CRITICAL': critical += row._count._all; break;
//       case 'HIGH':     high    += row._count._all; break;
//       case 'MEDIUM':   medium  += row._count._all; break;
//       case 'STANDARD': standard += row._count._all; break;
//     }
//   }

//   let scarcityActive = false;
//   for (const d of districts) {
//     const stock = d.subWarehouse?.stock;
//     if (!stock) continue;
//     if (
//       isInScarcity(stock.emk1Remaining, stock.emk1Total) ||
//       isInScarcity(stock.emk2Remaining, stock.emk2Total) ||
//       isInScarcity(stock.emk3Remaining, stock.emk3Total)
//     ) {
//       scarcityActive = true;
//       break;
//     }
//   }

//   const expectedCheckins = districts.length * 4;
//   const radioCompliancePct = expectedCheckins > 0
//     ? Math.round((todayCheckins / expectedCheckins) * 100)
//     : 100;

//   const activeDeliveryRuns = await prisma.deliveryRun.count({
//     where: { status: 'IN_PROGRESS' },
//   });

//   const snapshot: AiBriefResult['dataSnapshot'] = {
//     phase: alert?.phase ?? 0,
//     totalCritical: critical,
//     totalHigh: high,
//     totalMedium: medium,
//     totalStandard: standard,
//     scarcityActive,
//     activeDeliveryRuns,
//     openIncidentCount: incidentCount,
//     radioCompliancePct,
//   };

//   const { summary, priorityAlert, nextStep } = await callAI(snapshot);

//   return {
//     summary,
//     priorityAlert,
//     nextStep,
//     generatedAt: new Date().toISOString(),
//     dataSnapshot: snapshot,
//   };
// }