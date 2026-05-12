import Anthropic from '@anthropic-ai/sdk';
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

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
// Zero PII — aggregate counts only. No names, addresses, or household IDs.

function buildPrompt(snapshot: AiBriefResult['dataSnapshot'], districtStockLines: string[]): string {
  const phaseLabel = ['Pre-activation (Phase 0)', 'Activation — Hours 0–24 (Phase 1)', 'Adaptive delivery — Hours 24–48 (Phase 2)'][snapshot.phase] ?? `Phase ${snapshot.phase}`;

  return `You are an operational AI assistant for REMA (Rapid Emergency Medical Access), a humanitarian medical logistics system operated by the Viet Nam Red Cross during urban flood events.

Current operational state:
- Response phase: ${phaseLabel}
- Active delivery runs: ${snapshot.activeDeliveryRuns}
- Open incidents: ${snapshot.openIncidentCount}
- Radio check-in compliance today: ${snapshot.radioCompliancePct}%
- Stock scarcity alert: ${snapshot.scarcityActive ? 'YES — one or more districts below 30% stock' : 'No'}

Undelivered household priority queue:
- CRITICAL (deliver in current run): ${snapshot.totalCritical}
- HIGH (deliver same day): ${snapshot.totalHigh}
- MEDIUM (deliver within 48h): ${snapshot.totalMedium}
- STANDARD (community collection): ${snapshot.totalStandard}

District stock levels (EMK-1 / EMK-2 / EMK-3 remaining vs. total):
${districtStockLines.join('\n')}

Your task: Produce a 3-part operational brief for the Emergency Coordinator.
Respond with ONLY a valid JSON object — no preamble, no markdown, no explanation. Format:
{
  "summary": "2–3 sentence situation overview covering delivery progress, stock status, and key risks",
  "priorityAlert": "The single most urgent issue the coordinator must address right now (one sentence)",
  "nextStep": "One concrete action the coordinator should take in the next 60 minutes (one sentence)"
}

Rules:
- Be specific and actionable. Reference actual numbers from the data.
- Do not mention any person's name or location.
- Do not recommend any action that overrides a volunteer's on-the-ground safety judgment.
- If scarcity is active, address it.
- If radio compliance is below 75%, flag it.
- If CRITICAL count is above zero, it must appear in priorityAlert or nextStep.`;
}

// ─── MAIN SERVICE FUNCTION ────────────────────────────────────────────────────

export async function generateAiBrief(): Promise<AiBriefResult> {
  // ── Step 1: Read aggregate state from DB (no PII) ──────────────────────────
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

  // ── Step 2: Derive aggregate counts ───────────────────────────────────────
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

  // ── Step 3: District stock lines and scarcity check ───────────────────────
  let scarcityActive = false;
  const districtStockLines: string[] = [];

  for (const d of districts) {
    const stock = d.subWarehouse?.stock;
    if (!stock) {
      districtStockLines.push(`  ${d.name}: No sub-warehouse stock data`);
      continue;
    }
    const scarce =
      isInScarcity(stock.emk1Remaining, stock.emk1Total) ||
      isInScarcity(stock.emk2Remaining, stock.emk2Total) ||
      isInScarcity(stock.emk3Remaining, stock.emk3Total);
    if (scarce) scarcityActive = true;

    districtStockLines.push(
      `  ${d.name}: EMK-1 ${stock.emk1Remaining}/${stock.emk1Total}, EMK-2 ${stock.emk2Remaining}/${stock.emk2Total}, EMK-3 ${stock.emk3Remaining}/${stock.emk3Total}${scarce ? ' [SCARCE]' : ''}`
    );
  }

  // ── Step 4: Radio compliance % ────────────────────────────────────────────
  // 4 scheduled slots × 3 districts = 12 expected check-ins per day
  const expectedCheckins = districts.length * 4;
  const radioCompliancePct = expectedCheckins > 0
    ? Math.round((todayCheckins / expectedCheckins) * 100)
    : 100;

  // ── Step 5: Active delivery runs ──────────────────────────────────────────
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

  // ── Step 6: Call Anthropic API ────────────────────────────────────────────
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = buildPrompt(snapshot, districtStockLines);

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    rawText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Anthropic API call failed';
    throw new Error(`AI Brief unavailable: ${message}`);
  }

  // ── Step 7: Parse JSON response ───────────────────────────────────────────
  let parsed: { summary: string; priorityAlert: string; nextStep: string };
  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error('AI Brief unavailable: Could not parse model response');
  }

  if (!parsed.summary || !parsed.priorityAlert || !parsed.nextStep) {
    throw new Error('AI Brief unavailable: Incomplete model response');
  }

  return {
    summary: parsed.summary,
    priorityAlert: parsed.priorityAlert,
    nextStep: parsed.nextStep,
    generatedAt: new Date().toISOString(),
    dataSnapshot: snapshot,
  };
}