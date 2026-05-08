import { PrismaClient, RadioCheckTime, RadioStatus } from '@prisma/client';
import { getCached, setCached, deleteCached } from '../utils/cache';

const prisma = new PrismaClient();

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
// Compliance summary is polled by the V1 dashboard every 30–60 s.
// 20 s TTL; busted immediately on every new check-in submission.

const KEY_COMPLIANCE = 'radio:compliance:today';
const TTL_COMPLIANCE = 20_000; // 20 s

// ─── SUBMIT CHECK-IN ─────────────────────────────────────────────────────────

export async function submitCheckin(data: {
  districtId: string;
  submittedById: string;
  scheduledTime: RadioCheckTime;
  status: RadioStatus;
  notes?: string;
}) {
  const { districtId, submittedById, scheduledTime, status, notes } = data;

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

  // New check-in must appear on the compliance panel within one poll cycle
  deleteCached(KEY_COMPLIANCE);

  return result;
}

// ─── LIST CHECK-INS ───────────────────────────────────────────────────────────
// Not cached — filtered queries called infrequently (Hub Manager log view).

export async function listCheckins(filters: {
  districtId?: string;
  date?: string; // ISO date string e.g. "2026-04-21"
}) {
  const where: Record<string, unknown> = {};

  if (filters.districtId) where.districtId = filters.districtId;

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
// Polled by V1 dashboard. Cached 20 s. Busted on submitCheckin.

export async function getTodayComplianceSummary() {
  const cached = getCached<Awaited<ReturnType<typeof buildComplianceSummary>>>(KEY_COMPLIANCE);
  if (cached) return cached;

  const result = await buildComplianceSummary();
  setCached(KEY_COMPLIANCE, result, TTL_COMPLIANCE);
  return result;
}

async function buildComplianceSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkins, districts] = await Promise.all([
    prisma.radioCheckin.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      include: { district: { select: { name: true } } },
    }),
    prisma.district.findMany({ select: { id: true, name: true } }),
  ]);

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