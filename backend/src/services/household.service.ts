import { PrismaClient, PriorityBand, EmkType } from '@prisma/client';
import { scoreHousehold, ScoreInput } from '../utils/scoring';
import { getCached, setCached, deleteCached } from '../utils/cache';

const prisma = new PrismaClient();

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────

const KEY_QUEUE_PREFIX = 'household:queue:';
const TTL_QUEUE = 15_000;

export function invalidateQueueCache(districtId: string): void {
  deleteCached(`${KEY_QUEUE_PREFIX}${districtId}`);
}

// ─── SCORE ONLY (no DB write) ─────────────────────────────────────────────────

export function computeScore(input: ScoreInput) {
  return scoreHousehold(input);
}

// ─── CREATE HOUSEHOLD ─────────────────────────────────────────────────────────

export async function createHousehold(data: {
  address: string;
  districtId: string;
  scoreInput: ScoreInput;
  chronicIllCount?: number;
  notes?: string;
  assessedById?: string;
}) {
  const result = scoreHousehold(data.scoreInput);

  const householdSize   = data.scoreInput.householdSize ?? 4;
  const chronicIllCount = data.chronicIllCount ?? 0;

  const household = await prisma.household.create({
    data: {
      address:              data.address,
      districtId:           data.districtId,
      medicalUrgencyScore:  result.cat1,
      vulnerabilityScore:   result.cat2,
      floodExposureScore:   result.cat3,
      selfSufficiencyScore: result.cat4,
      isolationScore:       result.cat5,
      totalScore:           result.totalScore,
      priorityBand:         result.priorityBand as PriorityBand,
      recommendedEmk:       result.recommendedEmk as EmkType,
      householdSize,
      chronicIllCount,
      emk1Quantity:         result.emkQuantity.emk1,
      emk2Quantity:         result.emkQuantity.emk2,
      emk3Quantity:         result.emkQuantity.emk3,
      totalEmkQuantity:     result.emkQuantity.total,
      assessedById:         data.assessedById ?? null,
    },
  });

  if (data.assessedById) {
    await prisma.householdAssessment.create({
      data: {
        householdId:   household.id,
        submittedById: data.assessedById,
        cat1Score:     result.cat1,
        cat2Score:     result.cat2,
        cat3Score:     result.cat3,
        cat4Score:     result.cat4,
        cat5Score:     result.cat5,
        totalScore:    result.totalScore,
        notes:         data.notes ?? null,
      },
    });
  }

  invalidateQueueCache(data.districtId);
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
      district:   { select: { name: true } },
      assessedBy: { select: { name: true, email: true } },
    },
  });
}

// ─── GET SINGLE HOUSEHOLD ─────────────────────────────────────────────────────

export async function getHousehold(id: string) {
  const household = await prisma.household.findUnique({
    where: { id },
    include: {
      district:   { select: { name: true } },
      assessedBy: { select: { name: true, email: true } },
      assessments: {
        orderBy: { createdAt: 'desc' },
        include: { submittedBy: { select: { name: true, email: true } } },
      },
      deliveryReceipts: { orderBy: { deliveredAt: 'desc' } },
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
    chronicIllCount?: number;
    notes?: string;
    assessedById?: string;
  }
) {
  const existing = await prisma.household.findUnique({ where: { id } });
  if (!existing) throw new Error('Household not found');

  const mergedInput: ScoreInput = {
    cat1: data.scoreInput?.cat1 ?? existing.medicalUrgencyScore,
    cat2: data.scoreInput?.cat2 ?? existing.vulnerabilityScore,
    cat3: data.scoreInput?.cat3 ?? existing.floodExposureScore,
    cat4: data.scoreInput?.cat4 ?? existing.selfSufficiencyScore,
    cat5: data.scoreInput?.cat5 ?? existing.isolationScore,
    householdSize:       data.scoreInput?.householdSize ?? existing.householdSize,
    hasVulnerableMember: data.scoreInput?.hasVulnerableMember
      ?? (existing.vulnerabilityScore > 0),
  };

  // chronicIllCount lives on the DB record, not in ScoreInput
  const chronicIllCount = data.chronicIllCount ?? existing.chronicIllCount;

  const result = scoreHousehold(mergedInput);

  const updated = await prisma.household.update({
    where: { id },
    data: {
      medicalUrgencyScore:  result.cat1,
      vulnerabilityScore:   result.cat2,
      floodExposureScore:   result.cat3,
      selfSufficiencyScore: result.cat4,
      isolationScore:       result.cat5,
      totalScore:           result.totalScore,
      priorityBand:         result.priorityBand as PriorityBand,
      recommendedEmk:       result.recommendedEmk as EmkType,
      householdSize:        mergedInput.householdSize,
      chronicIllCount,
      emk1Quantity:         result.emkQuantity.emk1,
      emk2Quantity:         result.emkQuantity.emk2,
      emk3Quantity:         result.emkQuantity.emk3,
      totalEmkQuantity:     result.emkQuantity.total,
      assessedById:         data.assessedById ?? existing.assessedById,
    },
  });

  if (data.assessedById) {
    await prisma.householdAssessment.create({
      data: {
        householdId:   id,
        submittedById: data.assessedById,
        cat1Score:     result.cat1,
        cat2Score:     result.cat2,
        cat3Score:     result.cat3,
        cat4Score:     result.cat4,
        cat5Score:     result.cat5,
        totalScore:    result.totalScore,
        notes:         data.notes ?? null,
      },
    });
  }

  invalidateQueueCache(existing.districtId);
  return { ...updated, scoreResult: result };
}

// ─── PRIORITY QUEUE ───────────────────────────────────────────────────────────

const BAND_ORDER: Record<PriorityBand, number> = {
  CRITICAL: 0,
  HIGH:     1,
  MEDIUM:   2,
  STANDARD: 3,
};

export async function getPriorityQueue(districtId: string) {
  const key = `${KEY_QUEUE_PREFIX}${districtId}`;
  const cached = getCached<Awaited<ReturnType<typeof buildPriorityQueue>>>(key);
  if (cached) return cached;

  const result = await buildPriorityQueue(districtId);
  setCached(key, result, TTL_QUEUE);
  return result;
}

async function buildPriorityQueue(districtId: string) {
  const households = await prisma.household.findMany({
    where: { districtId, delivered: false },
    include: { district: { select: { name: true } } },
  });

  return households.sort((a, b) => {
    const bandDiff = BAND_ORDER[a.priorityBand] - BAND_ORDER[b.priorityBand];
    if (bandDiff !== 0) return bandDiff;

    const scoreDiff = b.totalScore - a.totalScore;
    if (scoreDiff !== 0) return scoreDiff;

    const cat1Diff = b.medicalUrgencyScore - a.medicalUrgencyScore;
    if (cat1Diff !== 0) return cat1Diff;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}