// ─── REMA HOUSEHOLD SCORING ENGINE ───────────────────────────────────────────
// Implements the exact 5-category, 20-point scoring system from Section C.
// DO NOT change weights or bands without updating Section C documentation.
//
// Category 1 — Medical urgency         (max 8 pts)
// Category 2 — Household vulnerability (max 5 pts)
// Category 3 — Flood exposure          (max 4 pts)
// Category 4 — Self-sufficiency        (max 2 pts)
// Category 5 — Isolation               (max 1 pt)
// TOTAL max: 20 pts

export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STANDARD';
export type EmkRecommendation = 'EMK1' | 'EMK2' | 'EMK3';

export interface ScoreInput {
  cat1: number; // Medical urgency: 0, 2, 5, or 8
  cat2: number; // Vulnerability: 0-5 (sum of flags, capped at 5)
  cat3: number; // Flood exposure: 0, 1, 3, or 4
  cat4: number; // Self-sufficiency: 0, 1, or 2
  cat5: number; // Isolation: 0 or 1
  // optional — defaults applied in scoreHousehold if omitted
  householdSize?: number;        // total people in household (min 1), default 4
  hasVulnerableMember?: boolean; // true if any cat2 flag checked, default false
}

// breakdown of how many of each EMK type to deliver
export interface EmkQuantity {
  emk3: number;
  emk2: number;
  emk1: number;
  total: number;
}

export interface ScoreResult {
  cat1: number;
  cat2: number;
  cat3: number;
  cat4: number;
  cat5: number;
  totalScore: number;
  priorityBand: PriorityBand;
  recommendedEmk: EmkRecommendation;
  emkQuantity: EmkQuantity;
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

const VALID_CAT1 = [0, 2, 5, 8];
const VALID_CAT3 = [0, 1, 3, 4];

export function validateScoreInput(input: ScoreInput): string | null {
  const householdSize = input.householdSize ?? 4;

  if (!VALID_CAT1.includes(input.cat1)) {
    return `cat1 must be one of ${VALID_CAT1.join(', ')} — got ${input.cat1}`;
  }
  if (input.cat2 < 0 || input.cat2 > 5) {
    return `cat2 must be 0-5 — got ${input.cat2}`;
  }
  if (!VALID_CAT3.includes(input.cat3)) {
    return `cat3 must be one of ${VALID_CAT3.join(', ')} — got ${input.cat3}`;
  }
  if (input.cat4 < 0 || input.cat4 > 2) {
    return `cat4 must be 0, 1, or 2 — got ${input.cat4}`;
  }
  if (input.cat5 < 0 || input.cat5 > 1) {
    return `cat5 must be 0 or 1 — got ${input.cat5}`;
  }
  if (!Number.isInteger(householdSize) || householdSize < 1) {
    return `householdSize must be an integer >= 1 — got ${householdSize}`;
  }
  return null;
}

// ─── BAND ASSIGNMENT ─────────────────────────────────────────────────────────
// Section C.5 — Score Bands:
//   15-20 → CRITICAL  (deliver in current run)
//   10-14 → HIGH      (deliver same day)
//   5-9   → MEDIUM    (deliver within 48h)
//   0-4   → STANDARD  (community collection point)

export function assignBand(totalScore: number): PriorityBand {
  if (totalScore >= 15) return 'CRITICAL';
  if (totalScore >= 10) return 'HIGH';
  if (totalScore >= 5)  return 'MEDIUM';
  return 'STANDARD';
}

// ─── EMK TYPE RECOMMENDATION ──────────────────────────────────────────────────
// cat1 >= 5 → EMK3 (life-sustaining medication need takes priority)
// cat2 >= 1 → EMK2 (vulnerable member present)
// otherwise → EMK1

export function recommendEmk(input: ScoreInput): EmkRecommendation {
  if (input.cat1 >= 5) return 'EMK3';
  if (input.cat2 >= 1) return 'EMK2';
  return 'EMK1';
}

// ─── EMK QUANTITY CALCULATION ─────────────────────────────────────────────────
// EMK3 = 1 if cat1 >= 5 (medication lost or low), else 0
// EMK2 = 1 if hasVulnerableMember, else 0
// EMK1 = ceil(remaining people / 4)
//
// One household never gets more than 1x EMK3 — it is a household bridge kit,
// not a per-person kit. Quantity is always 0 or 1.
//
// Each kit covers 4 people. Fill highest priority type first, then EMK1 for
// remaining people.
//
// Example: household of 9, medication lost, elderly present
//   emk3 = 1 (covers 4), emk2 = 1 (covers 4), remaining = 9-8 = 1
//   emk1 = ceil(1/4) = 1 → total = 3

export function calculateEmkQuantity(
  householdSize: number,
  cat1: number,
  hasVulnerableMember: boolean,
): EmkQuantity {
  const emk3 = cat1 >= 5 ? 1 : 0;
  // skip EMK2 if EMK3 already covers the household's highest need
  const emk2 = hasVulnerableMember && emk3 === 0 ? 1 : 0;

  const coveredByHigherKits = (emk3 + emk2) * 4;
  const remaining = Math.max(0, householdSize - coveredByHigherKits);
  const emk1 = Math.ceil(remaining / 4);

  return { emk3, emk2, emk1, total: emk3 + emk2 + emk1 };
}

// ─── MAIN SCORING FUNCTION ────────────────────────────────────────────────────

export function scoreHousehold(input: ScoreInput): ScoreResult {
  const validationError = validateScoreInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const householdSize       = input.householdSize       ?? 4;
  const hasVulnerableMember = input.hasVulnerableMember ?? false;

  const totalScore     = input.cat1 + input.cat2 + input.cat3 + input.cat4 + input.cat5;
  const priorityBand   = assignBand(totalScore);
  const recommendedEmk = recommendEmk(input);
  const emkQuantity    = calculateEmkQuantity(householdSize, input.cat1, hasVulnerableMember);

  return {
    cat1: input.cat1,
    cat2: input.cat2,
    cat3: input.cat3,
    cat4: input.cat4,
    cat5: input.cat5,
    totalScore,
    priorityBand,
    recommendedEmk,
    emkQuantity,
  };
}

// ─── SECTION C WORKED EXAMPLE VERIFICATION ───────────────────────────────────

export const WORKED_EXAMPLE_CASES = [
  { label: 'A — elderly 72, alone, no meds',       input: { cat1: 0, cat2: 2, cat3: 3, cat4: 2, cat5: 1, householdSize: 1, hasVulnerableMember: true  }, expectedScore: 8,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK1' },
  { label: 'B — family, infant 8m, doorstep',      input: { cat1: 0, cat2: 2, cat3: 3, cat4: 1, cat5: 0, householdSize: 4, hasVulnerableMember: true  }, expectedScore: 6,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK2' },
  { label: 'C — diabetic, insulin run out',         input: { cat1: 8, cat2: 0, cat3: 1, cat4: 0, cat5: 0, householdSize: 4, hasVulnerableMember: false }, expectedScore: 9,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK3' },
  { label: 'D — pregnant, water inside household',  input: { cat1: 0, cat2: 2, cat3: 4, cat4: 2, cat5: 0, householdSize: 4, hasVulnerableMember: true  }, expectedScore: 8,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK2' },
  { label: 'E — family 5, no illness, dry street',  input: { cat1: 0, cat2: 0, cat3: 0, cat4: 1, cat5: 0, householdSize: 5, hasVulnerableMember: false }, expectedScore: 1,  expectedBand: 'STANDARD', expectedEmk: 'EMK1' },
  { label: 'F — elderly hypertension, med low',     input: { cat1: 5, cat2: 2, cat3: 1, cat4: 1, cat5: 1, householdSize: 4, hasVulnerableMember: true  }, expectedScore: 10, expectedBand: 'HIGH',     expectedEmk: 'EMK3' },
] as const;