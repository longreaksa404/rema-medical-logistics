// ─── REMA HOUSEHOLD SCORING ENGINE ───────────────────────────────────────────
// Implements the exact 5-category, 20-point scoring system from Section C.
// DO NOT change weights or bands without updating Section C documentation.
//
// Category 1 — Medical urgency      (max 8 pts)
// Category 2 — Household vulnerability (max 5 pts)
// Category 3 — Flood exposure        (max 4 pts)
// Category 4 — Self-sufficiency      (max 2 pts)
// Category 5 — Isolation             (max 1 pt)
// TOTAL max: 20 pts

export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STANDARD';
export type EmkRecommendation = 'EMK1' | 'EMK2' | 'EMK3';

export interface ScoreInput {
  cat1: number; // Medical urgency: 0, 2, 5, or 8
  cat2: number; // Vulnerability: 0–5 (sum of flags, capped at 5)
  cat3: number; // Flood exposure: 0, 1, 3, or 4
  cat4: number; // Self-sufficiency: 0, 1, or 2
  cat5: number; // Isolation: 0 or 1
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
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

const VALID_CAT1 = [0, 2, 5, 8];
const VALID_CAT3 = [0, 1, 3, 4];

export function validateScoreInput(input: ScoreInput): string | null {
  if (!VALID_CAT1.includes(input.cat1)) {
    return `cat1 must be one of ${VALID_CAT1.join(', ')} — got ${input.cat1}`;
  }
  if (input.cat2 < 0 || input.cat2 > 5) {
    return `cat2 must be 0–5 — got ${input.cat2}`;
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
  return null;
}

// ─── BAND ASSIGNMENT ─────────────────────────────────────────────────────────
// Section C.5 — Score Bands:
//   15–20 → CRITICAL  (deliver in current run)
//   10–14 → HIGH      (deliver same day)
//   5–9  → MEDIUM    (deliver within 48h)
//   0–4  → STANDARD  (community collection point)

export function assignBand(totalScore: number): PriorityBand {
  if (totalScore >= 15) return 'CRITICAL';
  if (totalScore >= 10) return 'HIGH';
  if (totalScore >= 5) return 'MEDIUM';
  return 'STANDARD';
}

// ─── EMK RECOMMENDATION ───────────────────────────────────────────────────────
// Logic:
//   cat1 >= 5 (medication critically low or run out) → EMK3
//   cat2 >= 1 (any vulnerability flag present) → EMK2
//   otherwise → EMK1
//
// Note: EMK3 takes priority over EMK2 (life-sustaining medication first).
// This aligns with Section C.4 Level 1 Supply Priority.

export function recommendEmk(input: ScoreInput): EmkRecommendation {
  if (input.cat1 >= 5) return 'EMK3';
  if (input.cat2 >= 1) return 'EMK2';
  return 'EMK1';
}

// ─── MAIN SCORING FUNCTION ────────────────────────────────────────────────────

export function scoreHousehold(input: ScoreInput): ScoreResult {
  const validationError = validateScoreInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const totalScore = input.cat1 + input.cat2 + input.cat3 + input.cat4 + input.cat5;
  const priorityBand = assignBand(totalScore);
  const recommendedEmk = recommendEmk(input);

  return {
    cat1: input.cat1,
    cat2: input.cat2,
    cat3: input.cat3,
    cat4: input.cat4,
    cat5: input.cat5,
    totalScore,
    priorityBand,
    recommendedEmk,
  };
}

// ─── SECTION C WORKED EXAMPLE VERIFICATION ───────────────────────────────────
// Run this to confirm scoring matches Section C.8 exactly.
// Expected results from the doc:
//
//  A: elderly 72, alone, no meds    → 0+2+3+2+1=8  MEDIUM  EMK1
//  B: family, infant 8m, doorstep   → 0+2+3+1+0=6  MEDIUM  EMK2
//  C: diabetic, insulin run out     → 8+0+1+0+0=9  MEDIUM  EMK3
//  D: pregnant, water inside        → 0+2+4+2+0=8  MEDIUM  EMK2
//  E: family 5, no illness, dry     → 0+0+0+1+0=1  STANDARD EMK1
//  F: elderly hypertension, med low → 5+2+1+1+1=10 HIGH    EMK3

export const WORKED_EXAMPLE_CASES = [
  { label: 'A — elderly 72, alone, no meds',        input: { cat1: 0, cat2: 2, cat3: 3, cat4: 2, cat5: 1 }, expectedScore: 8,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK1' },
  { label: 'B — family, infant 8m, doorstep',       input: { cat1: 0, cat2: 2, cat3: 3, cat4: 1, cat5: 0 }, expectedScore: 6,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK2' },
  { label: 'C — diabetic, insulin run out',          input: { cat1: 8, cat2: 0, cat3: 1, cat4: 0, cat5: 0 }, expectedScore: 9,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK3' },
  { label: 'D — pregnant, water inside household',   input: { cat1: 0, cat2: 2, cat3: 4, cat4: 2, cat5: 0 }, expectedScore: 8,  expectedBand: 'MEDIUM',   expectedEmk: 'EMK2' },
  { label: 'E — family 5, no illness, dry street',   input: { cat1: 0, cat2: 0, cat3: 0, cat4: 1, cat5: 0 }, expectedScore: 1,  expectedBand: 'STANDARD', expectedEmk: 'EMK1' },
  { label: 'F — elderly hypertension, med low',      input: { cat1: 5, cat2: 2, cat3: 1, cat4: 1, cat5: 1 }, expectedScore: 10, expectedBand: 'HIGH',     expectedEmk: 'EMK3' },
] as const;