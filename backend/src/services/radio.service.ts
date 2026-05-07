import { PrismaClient, RadioCheckTime, RadioStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ─── RADIO CHECK-IN SCHEDULE (Section D.9) ────────────────────────────────────
// Fixed times: 08:00, 12:00, 16:00, 20:00
// All Hub Managers report to Operations Center at each scheduled time.
// If internet/phone fails, check-ins are submitted retroactively when contact restored.
// Content: stock levels, incidents, delivery progress, resupply needs.

// ─── LOCAL CACHE ──────────────────────────────────────────────────────────────
// getTodayComplianceSummary is polled by the V1 dashboard every 30–60 seconds.
// It aggregates check-ins across all districts for the current day — moderately
// expensive. TTL: 30 seconds, invalidated immediately on every new check-in
// submission so the compliance panel stays accurate without hammering the DB.

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

const COMPLIANCE_KEY = 'radio:compliance:today';
const COMPLIANCE_TTL_MS = 30_000; // 30 seconds

// ─── SUBMIT CHECK-IN ─────────────────────────────────────────────────────────
// Every new submission invalidates the compliance cache immediately so the
// dashboard reflects the new check-in within one poll cycle.

export async function submitCheckin(data: {
  districtId: string;
  submittedById: string;
  scheduledTime: RadioCheckTime;
  status: RadioStatus;
  notes?: string;
}) {
  const { districtId, submittedById, scheduledTime, status, notes } = data;

  // Verify district exists
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) throw new Error(`District not found: ${districtId}`);

  const result = await prisma.radioCheckin.create({
    data: {
      districtId,
      submittedById,
      scheduledTime,
      status,
      notes: notes ?? null,
    },
    include: {
      district: { select: { name: true } },
      submittedBy: { select: { name: true, role: true } },
    },
  });

  // Bust compliance cache — new check-in must appear on next poll
  cache.delete(COMPLIANCE_KEY);

  return result;
}

// ─── LIST CHECK-INS ───────────────────────────────────────────────────────────
// Not cached — filtered queries, called infrequently (Hub Manager log view).

export async function listCheckins(filters: {
  districtId?: string;
  date?: string; // ISO date string e.g. "2026-04-21"
}) {
  const where: Record<string, unknown> = {};

  if (filters.districtId) where.districtId = filters.districtId;

  // Filter by date — check-ins created on that calendar day
  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  return prisma.radioCheckin.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      district: { select: { name: true } },
      submittedBy: { select: { name: true, role: true } },
    },
  });
}

// ─── GET CHECKIN COMPLIANCE SUMMARY ──────────────────────────────────────────
// Polled by V1 dashboard to show which districts have checked in today
// and which are missing — critical during active flood operations.
// Cached for 30 seconds. Invalidated immediately on submitCheckin.

export async function getTodayComplianceSummary() {
  const cached = getCached<Awaited<ReturnType<typeof buildComplianceSummary>>>(COMPLIANCE_KEY);
  if (cached) return cached;

  const result = await buildComplianceSummary();
  setCached(COMPLIANCE_KEY, result, COMPLIANCE_TTL_MS);
  return result;
}

async function buildComplianceSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const checkins = await prisma.radioCheckin.findMany({
    where: { createdAt: { gte: today, lt: tomorrow } },
    include: {
      district: { select: { name: true } },
    },
  });

  const districts = await prisma.district.findMany({
    select: { id: true, name: true },
  });

  const slots: RadioCheckTime[] = ['T0800', 'T1200', 'T1600', 'T2000'];

  return districts.map(district => {
    const districtCheckins = checkins.filter(c => c.districtId === district.id);
    const completed = slots.filter(slot =>
      districtCheckins.some(c => c.scheduledTime === slot)
    );
    const issues = districtCheckins.filter(c => c.status === 'ISSUE_REPORTED');

    return {
      districtId: district.id,
      districtName: district.name,
      completedSlots: completed,
      missingSlots: slots.filter(s => !completed.includes(s)),
      issuesReported: issues.length > 0,
      compliance: `${completed.length}/${slots.length}`,
    };
  });
}