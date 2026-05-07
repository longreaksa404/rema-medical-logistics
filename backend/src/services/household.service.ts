import { PrismaClient, PriorityBand, EmkType } from '@prisma/client';
import { scoreHousehold, ScoreInput } from '../utils/scoring';

const prisma = new PrismaClient();

// ─── LOCAL CACHE ──────────────────────────────────────────────────────────────
// getPriorityQueue is polled by V1 dashboard and V4 Prioritization Tool.
// It fetches and sorts all undelivered households per district — the sort is
// in-memory so the DB query itself is cheap, but frequent polling still adds up.
// TTL: 10 seconds, keyed per district. Invalidated on create, update, and
// delivery receipt so volunteers always see an accurate delivery order.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const QUEUE_TTL_MS = 10_000; // 10 seconds

function queueKey(districtId: string): string {
  return `household:queue:${districtId}`;
}

/**
 * Bust the priority queue cache for a specific district.
 * Called after any write that changes queue order or membership:
 *   createHousehold, updateHousehold, and delivery receipt recording.
 */
export function invalidateQueueCache(districtId: string): void {
  cache.delete(queueKey(districtId));
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

  // New household enters the queue — bust the cache for this district
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

  // Score change may reorder the queue — bust cache for this district
  invalidateQueueCache(existing.districtId);

  return { ...updated, scoreResult: result };
}

// ─── PRIORITY QUEUE ───────────────────────────────────────────────────────────
// Section C tiebreaker rules:
//   1. Higher cat1 score wins
//   2. Infant under 6 months (we don't have exact age data — use cat2 flag as proxy)
//   3. First form submitted (createdAt ASC)
//
// Sort order:
//   1. Band order (CRITICAL first)
//   2. totalScore DESC
//   3. medicalUrgencyScore DESC (cat1 tiebreaker)
//   4. createdAt ASC (first submitted)
//
// Cached per district for 10 seconds. Invalidated on create, update, and
// delivery receipt so volunteers always work from the correct order.

const BAND_ORDER: Record<PriorityBand, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  STANDARD: 3,
};

export async function getPriorityQueue(districtId: string) {
  const key = queueKey(districtId);
  const cached = getCached<Awaited<ReturnType<typeof buildPriorityQueue>>>(key);
  if (cached) return cached;

  const result = await buildPriorityQueue(districtId);
  setCached(key, result, QUEUE_TTL_MS);
  return result;
}

async function buildPriorityQueue(districtId: string) {
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