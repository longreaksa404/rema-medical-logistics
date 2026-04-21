import { PrismaClient, PriorityBand, EmkType } from '@prisma/client';
import { scoreHousehold, ScoreInput } from '../utils/scoring';

const prisma = new PrismaClient();

// ─── SCORE ONLY (no DB write) ─────────────────────────────────────────────────

export function computeScore(input: ScoreInput) {
  return scoreHousehold(input);
}

// ─── CREATE HOUSEHOLD ─────────────────────────────────────────────────────────

export async function createHousehold(data: {
  address: string;
  districtId: string;
  scoreInput: ScoreInput;
  notes?: string;
  assessedById?: string;
}) {
  const result = scoreHousehold(data.scoreInput);

  const household = await prisma.household.create({
    data: {
      address: data.address,
      districtId: data.districtId,
      medicalUrgencyScore: result.cat1,
      vulnerabilityScore: result.cat2,
      floodExposureScore: result.cat3,
      selfSufficiencyScore: result.cat4,
      isolationScore: result.cat5,
      totalScore: result.totalScore,
      priorityBand: result.priorityBand as PriorityBand,
      recommendedEmk: result.recommendedEmk as EmkType,
      assessedById: data.assessedById ?? null,
    },
  });

  // Also create an assessment record for the audit trail
  if (data.assessedById) {
    await prisma.householdAssessment.create({
      data: {
        householdId: household.id,
        submittedById: data.assessedById,
        cat1Score: result.cat1,
        cat2Score: result.cat2,
        cat3Score: result.cat3,
        cat4Score: result.cat4,
        cat5Score: result.cat5,
        totalScore: result.totalScore,
        notes: data.notes ?? null,
      },
    });
  }

  return { ...household, scoreResult: result };
}

// ─── LIST HOUSEHOLDS ──────────────────────────────────────────────────────────

export async function listHouseholds(filters: {
  districtId?: string;
  band?: string;
  delivered?: boolean;
}) {
  const where: Record<string, unknown> = {};

  if (filters.districtId) where.districtId = filters.districtId;
  if (filters.delivered !== undefined) where.delivered = filters.delivered;
  if (filters.band) {
    const validBands: PriorityBand[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'STANDARD'];
    if (validBands.includes(filters.band as PriorityBand)) {
      where.priorityBand = filters.band as PriorityBand;
    }
  }

  return prisma.household.findMany({
    where,
    orderBy: [{ totalScore: 'desc' }, { createdAt: 'asc' }],
    include: {
      district: { select: { name: true } },
      assessedBy: { select: { name: true, email: true } },
    },
  });
}

// ─── GET SINGLE HOUSEHOLD ─────────────────────────────────────────────────────

export async function getHousehold(id: string) {
  const household = await prisma.household.findUnique({
    where: { id },
    include: {
      district: { select: { name: true } },
      assessedBy: { select: { name: true, email: true } },
      assessments: {
        orderBy: { createdAt: 'desc' },
        include: {
          submittedBy: { select: { name: true, email: true } },
        },
      },
      deliveryReceipts: {
        orderBy: { deliveredAt: 'desc' },
      },
    },
  });

  if (!household) throw new Error('Household not found');
  return household;
}

// ─── UPDATE HOUSEHOLD (triggers re-score) ─────────────────────────────────────

export async function updateHousehold(
  id: string,
  data: {
    scoreInput?: Partial<ScoreInput>;
    notes?: string;
    assessedById?: string;
  }
) {
  const existing = await prisma.household.findUnique({ where: { id } });
  if (!existing) throw new Error('Household not found');

  // Merge existing scores with updates
  const mergedInput: ScoreInput = {
    cat1: data.scoreInput?.cat1 ?? existing.medicalUrgencyScore,
    cat2: data.scoreInput?.cat2 ?? existing.vulnerabilityScore,
    cat3: data.scoreInput?.cat3 ?? existing.floodExposureScore,
    cat4: data.scoreInput?.cat4 ?? existing.selfSufficiencyScore,
    cat5: data.scoreInput?.cat5 ?? existing.isolationScore,
  };

  const result = scoreHousehold(mergedInput);

  const updated = await prisma.household.update({
    where: { id },
    data: {
      medicalUrgencyScore: result.cat1,
      vulnerabilityScore: result.cat2,
      floodExposureScore: result.cat3,
      selfSufficiencyScore: result.cat4,
      isolationScore: result.cat5,
      totalScore: result.totalScore,
      priorityBand: result.priorityBand as PriorityBand,
      recommendedEmk: result.recommendedEmk as EmkType,
      assessedById: data.assessedById ?? existing.assessedById,
    },
  });

  // Record updated assessment if assessor is provided
  if (data.assessedById) {
    await prisma.householdAssessment.create({
      data: {
        householdId: id,
        submittedById: data.assessedById,
        cat1Score: result.cat1,
        cat2Score: result.cat2,
        cat3Score: result.cat3,
        cat4Score: result.cat4,
        cat5Score: result.cat5,
        totalScore: result.totalScore,
        notes: data.notes ?? null,
      },
    });
  }

  return { ...updated, scoreResult: result };
}

// ─── PRIORITY QUEUE ───────────────────────────────────────────────────────────
// Section C tiebreaker rules:
//   1. Higher cat1 score wins
//   2. Infant under 6 months (we don't have exact age data — use cat2 flag as proxy)
//   3. First form submitted (createdAt ASC)
//
// For the queue, we sort by:
//   1. Band order (CRITICAL first)
//   2. totalScore DESC
//   3. medicalUrgencyScore DESC (cat1 tiebreaker)
//   4. createdAt ASC (first submitted)

const BAND_ORDER: Record<PriorityBand, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  STANDARD: 3,
};

export async function getPriorityQueue(districtId: string) {
  const households = await prisma.household.findMany({
    where: {
      districtId,
      delivered: false,
    },
    include: {
      district: { select: { name: true } },
    },
  });

  // Sort in-memory to apply multi-key tiebreakers
  return households.sort((a, b) => {
    // 1. Band order
    const bandDiff = BAND_ORDER[a.priorityBand] - BAND_ORDER[b.priorityBand];
    if (bandDiff !== 0) return bandDiff;

    // 2. Total score descending
    const scoreDiff = b.totalScore - a.totalScore;
    if (scoreDiff !== 0) return scoreDiff;

    // 3. Cat1 (medical urgency) descending
    const cat1Diff = b.medicalUrgencyScore - a.medicalUrgencyScore;
    if (cat1Diff !== 0) return cat1Diff;

    // 4. First submitted (createdAt ascending)
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}