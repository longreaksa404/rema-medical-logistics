/**
 * scoring.test.ts
 *
 * Tests for the REMA 20-point household scoring engine (Section C).
 * Pure utility functions only — no Prisma, no HTTP, no database.
 *
 * Key references:
 *   - Section C.5: Scoring criteria (5 categories)
 *   - Section C.5: Score bands (CRITICAL/HIGH/MEDIUM/STANDARD)
 *   - Section C.4: EMK recommendation logic
 *   - Section C.8: Worked example (6 households)
 */

import {
  scoreHousehold,
  assignBand,
  recommendEmk,
  validateScoreInput,
  calculateEmkQuantity,
  WORKED_EXAMPLE_CASES,
  type ScoreInput,
} from '../scoring';

// ─── VALIDATION ───────────────────────────────────────────────────────────────

describe('validateScoreInput', () => {
  test('returns null for valid input', () => {
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).toBeNull();
    expect(validateScoreInput({ cat1: 8, cat2: 5, cat3: 4, cat4: 2, cat5: 1 })).toBeNull();
    expect(validateScoreInput({ cat1: 2, cat2: 3, cat3: 1, cat4: 1, cat5: 0 })).toBeNull();
    expect(validateScoreInput({ cat1: 5, cat2: 2, cat3: 3, cat4: 0, cat5: 1 })).toBeNull();
  });

  test('rejects invalid cat1 values (must be 0, 2, 5, or 8)', () => {
    expect(validateScoreInput({ cat1: 1, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 3, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 4, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 6, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 7, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 9, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
  });

  test('rejects invalid cat3 values (must be 0, 1, 3, or 4)', () => {
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: 2,  cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: 5,  cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: -1, cat4: 0, cat5: 0 })).not.toBeNull();
  });

  test('rejects cat2 out of 0-5 range', () => {
    expect(validateScoreInput({ cat1: 0, cat2: -1, cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 0, cat2: 6,  cat3: 0, cat4: 0, cat5: 0 })).not.toBeNull();
  });

  test('rejects cat4 out of 0-2 range', () => {
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: 0, cat4: -1, cat5: 0 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: 0, cat4: 3,  cat5: 0 })).not.toBeNull();
  });

  test('rejects cat5 out of 0-1 range', () => {
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: -1 })).not.toBeNull();
    expect(validateScoreInput({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 2  })).not.toBeNull();
  });
});

// ─── HOUSEHOLDSIZE VALIDATION ─────────────────────────────────────────────────

describe('validateScoreInput — householdSize', () => {
  const base = { cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 };

  test('valid householdSize → null', () => {
    expect(validateScoreInput({ ...base, householdSize: 1  })).toBeNull();
    expect(validateScoreInput({ ...base, householdSize: 4  })).toBeNull();
    expect(validateScoreInput({ ...base, householdSize: 20 })).toBeNull();
  });

  test('householdSize < 1 → error', () => {
    expect(validateScoreInput({ ...base, householdSize: 0  })).not.toBeNull();
    expect(validateScoreInput({ ...base, householdSize: -1 })).not.toBeNull();
  });

  test('householdSize non-integer → error', () => {
    expect(validateScoreInput({ ...base, householdSize: 2.5 })).not.toBeNull();
  });

  test('omitting householdSize uses default of 4 — no error', () => {
    expect(validateScoreInput({ ...base })).toBeNull();
  });
});

// ─── CATEGORY 1: MEDICAL URGENCY (max 8 pts) ─────────────────────────────────

describe('Category 1 — Medical Urgency', () => {
  test('life-sustaining medication run out (<24h remaining) → 8 pts', () => {
    const result = scoreHousehold({ cat1: 8, cat2: 0, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat1).toBe(8);
  });

  test('chronic illness — medication low (1-2 days remaining) → 5 pts', () => {
    const result = scoreHousehold({ cat1: 5, cat2: 0, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat1).toBe(5);
  });

  test('chronic illness — medication currently adequate → 2 pts', () => {
    const result = scoreHousehold({ cat1: 2, cat2: 0, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat1).toBe(2);
  });

  test('no chronic illness → 0 pts', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat1).toBe(0);
  });
});

// ─── CATEGORY 2: HOUSEHOLD VULNERABILITY (max 5 pts, capped) ─────────────────

describe('Category 2 — Household Vulnerability', () => {
  test('single vulnerability flag → correct score', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 2, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat2).toBe(2);
  });

  test('two vulnerability flags → combined score', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 4, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat2).toBe(4);
  });

  test('three vulnerability flags → capped at 5', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 5, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat2).toBe(5);
  });

  test('no vulnerability → 0 pts', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat2).toBe(0);
  });

  test('maximum cat2 value is 5', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 5, cat3: 0, cat4: 0, cat5: 0 });
    expect(result.cat2).toBeLessThanOrEqual(5);
  });
});

// ─── CATEGORY 3: FLOOD EXPOSURE (max 4 pts) ──────────────────────────────────

describe('Category 3 — Flood Exposure', () => {
  test('water inside household or structurally unsafe → 4 pts', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 4, cat4: 0, cat5: 0 }).cat3).toBe(4);
  });

  test('water at doorstep (within 10cm of entrance) → 3 pts', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 3, cat4: 0, cat5: 0 }).cat3).toBe(3);
  });

  test('water in street but not reaching household → 1 pt', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 1, cat4: 0, cat5: 0 }).cat3).toBe(1);
  });

  test('household is dry and elevated → 0 pts', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 }).cat3).toBe(0);
  });
});

// ─── CATEGORY 4: SELF-SUFFICIENCY (max 2 pts) ────────────────────────────────

describe('Category 4 — Self-Sufficiency', () => {
  test('no clean water, food, or sanitation → 2 pts', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 2, cat5: 0 }).cat4).toBe(2);
  });

  test('partial access → 1 pt', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 1, cat5: 0 }).cat4).toBe(1);
  });

  test('adequate access → 0 pts', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 }).cat4).toBe(0);
  });
});

// ─── CATEGORY 5: ISOLATION (max 1 pt) ────────────────────────────────────────

describe('Category 5 — Isolation', () => {
  test('completely isolated → 1 pt', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 1 }).cat5).toBe(1);
  });

  test('some contact or communication available → 0 pts', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 }).cat5).toBe(0);
  });
});

// ─── TOTAL SCORE CALCULATION ──────────────────────────────────────────────────

describe('Total score calculation', () => {
  test('total score = sum of all 5 categories', () => {
    const result = scoreHousehold({ cat1: 5, cat2: 3, cat3: 3, cat4: 2, cat5: 1 });
    expect(result.totalScore).toBe(14);
  });

  test('minimum total score = 0', () => {
    expect(scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 }).totalScore).toBe(0);
  });

  test('maximum total score = 20', () => {
    expect(scoreHousehold({ cat1: 8, cat2: 5, cat3: 4, cat4: 2, cat5: 1 }).totalScore).toBe(20);
  });

  test('all individual scores returned in result', () => {
    const input: ScoreInput = { cat1: 5, cat2: 2, cat3: 3, cat4: 1, cat5: 1 };
    const result = scoreHousehold(input);
    expect(result.cat1).toBe(5);
    expect(result.cat2).toBe(2);
    expect(result.cat3).toBe(3);
    expect(result.cat4).toBe(1);
    expect(result.cat5).toBe(1);
  });
});

// ─── SCORE BANDS (Section C.5) ────────────────────────────────────────────────

describe('assignBand — score band assignment (Section C.5)', () => {
  test('score 20 → CRITICAL', () => expect(assignBand(20)).toBe('CRITICAL'));
  test('score 15 → CRITICAL', () => expect(assignBand(15)).toBe('CRITICAL'));
  test('score 14 → HIGH',     () => expect(assignBand(14)).toBe('HIGH'));
  test('score 10 → HIGH',     () => expect(assignBand(10)).toBe('HIGH'));
  test('score 9  → MEDIUM',   () => expect(assignBand(9)).toBe('MEDIUM'));
  test('score 5  → MEDIUM',   () => expect(assignBand(5)).toBe('MEDIUM'));
  test('score 4  → STANDARD', () => expect(assignBand(4)).toBe('STANDARD'));
  test('score 0  → STANDARD', () => expect(assignBand(0)).toBe('STANDARD'));

  test('boundary: 14 is HIGH, 15 is CRITICAL', () => {
    expect(assignBand(14)).toBe('HIGH');
    expect(assignBand(15)).toBe('CRITICAL');
  });

  test('boundary: 9 is MEDIUM, 10 is HIGH', () => {
    expect(assignBand(9)).toBe('MEDIUM');
    expect(assignBand(10)).toBe('HIGH');
  });

  test('boundary: 4 is STANDARD, 5 is MEDIUM', () => {
    expect(assignBand(4)).toBe('STANDARD');
    expect(assignBand(5)).toBe('MEDIUM');
  });
});

// ─── EMK RECOMMENDATION (Section C.4) ────────────────────────────────────────

describe('recommendEmk — EMK type recommendation', () => {
  test('cat1 >= 5 → EMK3', () => {
    expect(recommendEmk({ cat1: 5, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).toBe('EMK3');
    expect(recommendEmk({ cat1: 8, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).toBe('EMK3');
  });

  test('cat1 >= 5 overrides cat2 — EMK3 takes priority over EMK2', () => {
    expect(recommendEmk({ cat1: 5, cat2: 5, cat3: 4, cat4: 2, cat5: 1 })).toBe('EMK3');
    expect(recommendEmk({ cat1: 8, cat2: 4, cat3: 3, cat4: 2, cat5: 0 })).toBe('EMK3');
  });

  test('cat1 < 5 and cat2 >= 1 → EMK2', () => {
    expect(recommendEmk({ cat1: 0, cat2: 1, cat3: 0, cat4: 0, cat5: 0 })).toBe('EMK2');
    expect(recommendEmk({ cat1: 2, cat2: 3, cat3: 0, cat4: 0, cat5: 0 })).toBe('EMK2');
  });

  test('cat1 < 5 and cat2 = 0 → EMK1', () => {
    expect(recommendEmk({ cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).toBe('EMK1');
    expect(recommendEmk({ cat1: 2, cat2: 0, cat3: 4, cat4: 2, cat5: 1 })).toBe('EMK1');
  });

  test('cat1 = 2 (adequate medication) → EMK1 not EMK3', () => {
    expect(recommendEmk({ cat1: 2, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).toBe('EMK1');
  });
});

// ─── SECTION C.8 WORKED EXAMPLE ──────────────────────────────────────────────

describe('Section C.8 Worked Example — all 6 households', () => {
  test('Household A — elderly 72, alone, no meds: score 8, MEDIUM, EMK2', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 2, cat3: 3, cat4: 2, cat5: 1 });
    expect(result.totalScore).toBe(8);
    expect(result.priorityBand).toBe('MEDIUM');
    expect(result.recommendedEmk).toBe('EMK2');
  });

  test('Household B — family, infant 8m, doorstep: score 6, MEDIUM, EMK2', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 2, cat3: 3, cat4: 1, cat5: 0 });
    expect(result.totalScore).toBe(6);
    expect(result.priorityBand).toBe('MEDIUM');
    expect(result.recommendedEmk).toBe('EMK2');
  });

  test('Household C — diabetic, insulin run out: score 9, MEDIUM, EMK3', () => {
    const result = scoreHousehold({ cat1: 8, cat2: 0, cat3: 1, cat4: 0, cat5: 0 });
    expect(result.totalScore).toBe(9);
    expect(result.priorityBand).toBe('MEDIUM');
    expect(result.recommendedEmk).toBe('EMK3');
  });

  test('Household D — pregnant, water inside: score 8, MEDIUM, EMK2', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 2, cat3: 4, cat4: 2, cat5: 0 });
    expect(result.totalScore).toBe(8);
    expect(result.priorityBand).toBe('MEDIUM');
    expect(result.recommendedEmk).toBe('EMK2');
  });

  test('Household E — family 5, no illness, dry: score 1, STANDARD, EMK1', () => {
    const result = scoreHousehold({ cat1: 0, cat2: 0, cat3: 0, cat4: 1, cat5: 0 });
    expect(result.totalScore).toBe(1);
    expect(result.priorityBand).toBe('STANDARD');
    expect(result.recommendedEmk).toBe('EMK1');
  });

  test('Household F — elderly hypertension, med low: score 10, HIGH, EMK3', () => {
    const result = scoreHousehold({ cat1: 5, cat2: 2, cat3: 1, cat4: 1, cat5: 1 });
    expect(result.totalScore).toBe(10);
    expect(result.priorityBand).toBe('HIGH');
    expect(result.recommendedEmk).toBe('EMK3');
  });

  test('all 6 WORKED_EXAMPLE_CASES — score and band match', () => {
    for (const { input, expectedScore, expectedBand } of WORKED_EXAMPLE_CASES) {
      const result = scoreHousehold(input);
      expect(result.totalScore).toBe(expectedScore);
      expect(result.priorityBand).toBe(expectedBand);
    }
  });
});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe('scoreHousehold — edge cases', () => {
  test('throws on invalid cat1 value', () => {
    expect(() => scoreHousehold({ cat1: 3, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })).toThrow();
  });

  test('throws on invalid cat3 value', () => {
    expect(() => scoreHousehold({ cat1: 0, cat2: 0, cat3: 2, cat4: 0, cat5: 0 })).toThrow();
  });

  test('score 20 → CRITICAL', () => {
    const result = scoreHousehold({ cat1: 8, cat2: 5, cat3: 4, cat4: 2, cat5: 1 });
    expect(result.priorityBand).toBe('CRITICAL');
    expect(result.totalScore).toBe(20);
  });

  test('score 15 is minimum for CRITICAL', () => {
    const result = scoreHousehold({ cat1: 8, cat2: 5, cat3: 1, cat4: 1, cat5: 0 });
    expect(result.priorityBand).toBe('CRITICAL');
    expect(result.totalScore).toBe(15);
  });
});

// ─── EMK QUANTITY CALCULATION ─────────────────────────────────────────────────

describe('calculateEmkQuantity', () => {

  // ── EMK3 driven by cat1 ──────────────────────────────────────────────────

  test('cat1 >= 5 → 1x EMK3', () => {
    expect(calculateEmkQuantity(4, 5, false)).toEqual({ emk3: 1, emk2: 0, emk1: 0, total: 1 });
    expect(calculateEmkQuantity(4, 8, false)).toEqual({ emk3: 1, emk2: 0, emk1: 0, total: 1 });
  });

  test('cat1 < 5 → 0x EMK3', () => {
    expect(calculateEmkQuantity(4, 0, false)).toEqual({ emk3: 0, emk2: 0, emk1: 1, total: 1 });
    expect(calculateEmkQuantity(4, 2, false)).toEqual({ emk3: 0, emk2: 0, emk1: 1, total: 1 });
  });

  test('household of any size gets max 1x EMK3', () => {
    expect(calculateEmkQuantity(20, 8, false).emk3).toBe(1);
    expect(calculateEmkQuantity(1,  5, false).emk3).toBe(1);
  });

  // ── baseline: small households ──────────────────────────────────────────

  test('household 1-4, no vulnerability, no medication loss → 1x EMK1', () => {
    expect(calculateEmkQuantity(1, 0, false)).toEqual({ emk3: 0, emk2: 0, emk1: 1, total: 1 });
    expect(calculateEmkQuantity(4, 0, false)).toEqual({ emk3: 0, emk2: 0, emk1: 1, total: 1 });
  });

  test('household 5-8, no vulnerability, no medication loss → 2x EMK1', () => {
    expect(calculateEmkQuantity(5, 0, false)).toEqual({ emk3: 0, emk2: 0, emk1: 2, total: 2 });
    expect(calculateEmkQuantity(8, 0, false)).toEqual({ emk3: 0, emk2: 0, emk1: 2, total: 2 });
  });

  test('household 9-12, no vulnerability, no medication loss → 3x EMK1', () => {
    expect(calculateEmkQuantity(9,  0, false)).toEqual({ emk3: 0, emk2: 0, emk1: 3, total: 3 });
    expect(calculateEmkQuantity(12, 0, false)).toEqual({ emk3: 0, emk2: 0, emk1: 3, total: 3 });
  });

  // ── vulnerable member present ────────────────────────────────────────────

  test('household 4, vulnerable member → 1x EMK2, 0x EMK1', () => {
    expect(calculateEmkQuantity(4, 0, true)).toEqual({ emk3: 0, emk2: 1, emk1: 0, total: 1 });
  });

  test('household 5, vulnerable member → 1x EMK2 + 1x EMK1', () => {
    expect(calculateEmkQuantity(5, 0, true)).toEqual({ emk3: 0, emk2: 1, emk1: 1, total: 2 });
  });

  // ── medication lost + vulnerable ─────────────────────────────────────────

  test('household 9, medication lost, vulnerable → 1x EMK3 + 1x EMK2 + 1x EMK1', () => {
    expect(calculateEmkQuantity(9, 8, true)).toEqual({ emk3: 1, emk2: 1, emk1: 1, total: 3 });
  });

  test('household 4, medication lost, no vulnerable → 1x EMK3 only', () => {
    expect(calculateEmkQuantity(4, 5, false)).toEqual({ emk3: 1, emk2: 0, emk1: 0, total: 1 });
  });

  // ── edge cases ───────────────────────────────────────────────────────────

  test('higher kits cover more people than household size → emk1 = 0', () => {
    expect(calculateEmkQuantity(2, 8, false)).toEqual({ emk3: 1, emk2: 0, emk1: 0, total: 1 });
  });

  test('total always equals emk3 + emk2 + emk1', () => {
    const cases = [
      calculateEmkQuantity(1,  0, false),
      calculateEmkQuantity(5,  0, true),
      calculateEmkQuantity(9,  8, true),
      calculateEmkQuantity(12, 0, true),
    ];
    for (const qty of cases) {
      expect(qty.total).toBe(qty.emk3 + qty.emk2 + qty.emk1);
    }
  });
});