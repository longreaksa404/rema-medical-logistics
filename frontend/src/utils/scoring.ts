// ─── REMA HOUSEHOLD SCORING ENGINE (CLIENT-SIDE) ─────────────────────────────
// Mirrors backend/src/utils/scoring.ts exactly.
// Allows live score preview without an API call — Section C.5

export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STANDARD';
export type EmkRecommendation = 'EMK1' | 'EMK2' | 'EMK3';

export interface ScoreInput {
  cat1: number; // Medical urgency: 0, 2, 5, or 8
  cat2: number; // Vulnerability: 0-5 (sum of flags, capped at 5)
  cat3: number; // Flood exposure: 0, 1, 3, or 4
  cat4: number; // Self-sufficiency: 0, 1, or 2
  cat5: number; // Isolation: 0 or 1
  householdSize?: number;        // default 4
  hasVulnerableMember?: boolean; // default false
}

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

// ─── VALID VALUES ─────────────────────────────────────────────────────────────
export const VALID_CAT1 = [0, 2, 5, 8] as const;
export const VALID_CAT3 = [0, 1, 3, 4] as const;

// ─── CAT1 LABELS ─────────────────────────────────────────────────────────────
export const CAT1_OPTIONS = [
  { value: 8, label: 'Medication run out or <24h remaining', sublabel: 'Life-sustaining medication critically low' },
  { value: 5, label: 'Medication low (1-2 days remaining)',  sublabel: 'Chronic illness, running low'             },
  { value: 2, label: 'Medication currently adequate',        sublabel: 'Chronic illness, supply OK'              },
  { value: 0, label: 'No chronic illness reported',          sublabel: 'No medication dependency'                },
] as const;

// ─── CAT3 LABELS ─────────────────────────────────────────────────────────────
export const CAT3_OPTIONS = [
  { value: 4, label: 'Water inside household / structurally unsafe', sublabel: 'Immediate danger'     },
  { value: 3, label: 'Water at doorstep (within 10cm)',              sublabel: 'Doorstep flooding'    },
  { value: 1, label: 'Water in street but not reaching household',   sublabel: 'Street flooding only' },
  { value: 0, label: 'Household is dry and elevated',                sublabel: 'No flood exposure'    },
] as const;

// ─── CAT4 LABELS ─────────────────────────────────────────────────────────────
export const CAT4_OPTIONS = [
  { value: 2, label: 'No clean water, no food, no sanitation', sublabel: 'Fully cut off'          },
  { value: 1, label: 'Partial access',                          sublabel: 'Some supplies available' },
  { value: 0, label: 'Adequate access to basic necessities',    sublabel: 'Self-sufficient'        },
] as const;

// ─── CAT2 FLAGS (sum, capped at 5) ───────────────────────────────────────────
export const CAT2_FLAGS = [
  { id: 'infant',   label: 'Infant under 2 years present',                 points: 2 },
  { id: 'pregnant', label: 'Pregnant woman present',                       points: 2 },
  { id: 'elderly',  label: 'Elderly person (65+) living alone',            points: 2 },
  { id: 'disabled', label: 'Person with physical or cognitive disability', points: 2 },
] as const;

export type Cat2FlagId = typeof CAT2_FLAGS[number]['id'];

export function computeCat2(flags: Set<Cat2FlagId>): number {
  const sum = CAT2_FLAGS
    .filter(f => flags.has(f.id))
    .reduce((acc, f) => acc + f.points, 0);
  return Math.min(sum, 5);
}

// ─── BAND ASSIGNMENT ─────────────────────────────────────────────────────────
export function assignBand(totalScore: number): PriorityBand {
  if (totalScore >= 15) return 'CRITICAL';
  if (totalScore >= 10) return 'HIGH';
  if (totalScore >= 5)  return 'MEDIUM';
  return 'STANDARD';
}

// ─── EMK TYPE RECOMMENDATION ──────────────────────────────────────────────────
export function recommendEmk(input: ScoreInput): EmkRecommendation {
  if (input.cat1 >= 5) return 'EMK3';
  if (input.cat2 >= 1) return 'EMK2';
  return 'EMK1';
}

// ─── EMK QUANTITY CALCULATION ─────────────────────────────────────────────────
// EMK3 = 1 if cat1 >= 5 (medication lost or low), else 0
// EMK2 = 1 if hasVulnerableMember, else 0  — independent of EMK3
// EMK1 = ceil(remaining people / 4)
//
// EMK3 and EMK2 are independent needs — a household with both a chronic illness
// patient and a vulnerable member (infant, elderly, pregnant, disabled) gets both.
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
  // EMK2 is independent of EMK3 — a household can need both.
  // EMK3 covers chronic illness, EMK2 covers vulnerable members (infant/elderly/pregnant/disabled).
  const emk2 = hasVulnerableMember ? 1 : 0;

  const coveredByHigherKits = (emk3 + emk2) * 4;
  const remaining = Math.max(0, householdSize - coveredByHigherKits);
  const emk1 = Math.ceil(remaining / 4);

  return { emk3, emk2, emk1, total: emk3 + emk2 + emk1 };
}

// ─── MAIN SCORING FUNCTION ────────────────────────────────────────────────────
export function scoreHousehold(input: ScoreInput): ScoreResult {
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

// ─── DEFAULT EMPTY INPUT ──────────────────────────────────────────────────────
export function emptyScoreInput(): ScoreInput {
  return { cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 };
}