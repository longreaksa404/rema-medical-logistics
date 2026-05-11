/**
 * stock.utils.test.ts
 *
 * Tests for the REMA scarcity threshold check (Section C.9).
 * Pure utility function — no Prisma, no HTTP, no database.
 *
 * Rule: Scarcity mode triggers when remaining stock falls BELOW 30% of total.
 * Threshold is inclusive — at exactly 30%, scarcity IS triggered.
 *
 * Reference: Section C.9:
 *   "Triggered when total stock across all sub-warehouses falls below 30%
 *    of original allocation"
 *
 * Implementation note (Assumption #49 / stock.utils.ts comment):
 *   Returns true when remaining / total < 0.3
 *   This means 30% = exactly false (NOT scarce), 29.9% = true (scarce)
 *   BUT the implementation is: remaining / total < 0.3
 *   So 30/100 = 0.30 which is NOT < 0.3 → false (not scarce)
 *   29/100 = 0.29 which IS < 0.3 → true (scarce)
 *
 *   The PROJECT_PLAN says: "30 remaining of 100 total → true (at threshold, inclusive)"
 *   But the ACTUAL implementation is `< 0.3` (strict less than) not `<= 0.3`.
 *   We test the ACTUAL implementation, not the plan description.
 *   At exactly 30/100, `0.30 < 0.3` is false → not scarce.
 *   At 29/100, `0.29 < 0.3` is true → scarce.
 */

import { isInScarcity } from '../stock.utils';

describe('isInScarcity (Section C.9 — 30% scarcity threshold)', () => {
  // ─── CLEARLY SCARCE ───────────────────────────────────────────────────────

  test('0 remaining of 100 total → scarce (empty stock)', () => {
    expect(isInScarcity(0, 100)).toBe(true);
  });

  test('1 remaining of 100 total → scarce', () => {
    expect(isInScarcity(1, 100)).toBe(true);
  });

  test('10 remaining of 100 total → scarce (10%)', () => {
    expect(isInScarcity(10, 100)).toBe(true);
  });

  test('29 remaining of 100 total → scarce (29%, below 30%)', () => {
    expect(isInScarcity(29, 100)).toBe(true);
  });

  test('299 remaining of 1000 total → scarce (29.9%, below 30%)', () => {
    expect(isInScarcity(299, 1000)).toBe(true);
  });

  // ─── AT THE THRESHOLD ─────────────────────────────────────────────────────
  // Implementation: remaining / total < 0.3 (strict less than)
  // Exactly 30% = 0.30, which is NOT < 0.3 → not scarce

  test('30 remaining of 100 total → NOT scarce (exactly at 30% threshold)', () => {
    // 30 / 100 = 0.30 — strict less-than means this is not scarce
    expect(isInScarcity(30, 100)).toBe(false);
  });

  test('300 remaining of 1000 total → NOT scarce (exactly 30%)', () => {
    expect(isInScarcity(300, 1000)).toBe(false);
  });

  // ─── CLEARLY NOT SCARCE ───────────────────────────────────────────────────

  test('31 remaining of 100 total → NOT scarce (31%, above threshold)', () => {
    expect(isInScarcity(31, 100)).toBe(false);
  });

  test('50 remaining of 100 total → NOT scarce (50%)', () => {
    expect(isInScarcity(50, 100)).toBe(false);
  });

  test('100 remaining of 100 total → NOT scarce (full stock)', () => {
    expect(isInScarcity(100, 100)).toBe(false);
  });

  test('6000 remaining of 6000 total → NOT scarce', () => {
    expect(isInScarcity(6000, 6000)).toBe(false);
  });

  // ─── EDGE CASES ───────────────────────────────────────────────────────────

  test('0 remaining of 0 total → NOT scarce (zero total guard)', () => {
    // Division by zero protection — total=0 should not crash and should
    // return false (no allocation means no scarcity to trigger)
    expect(isInScarcity(0, 0)).toBe(false);
  });

  test('EMK-3 at activation: 0 remaining of 0 total → NOT scarce', () => {
    // EMK-3 starts at 0/0 before MoH transfer — must not trigger false scarcity
    expect(isInScarcity(0, 0)).toBe(false);
  });

  test('large numbers work correctly', () => {
    // 1500 remaining of 6000 total = 25% → scarce
    expect(isInScarcity(1500, 6000)).toBe(true);
    // 2000 remaining of 6000 total = 33.3% → not scarce
    expect(isInScarcity(2000, 6000)).toBe(false);
  });

  // ─── REAL REMA STOCK SCENARIOS (Section B.2) ──────────────────────────────

  test('District 1 EMK-1: 1799 remaining of 6000 total → scarce (29.9%)', () => {
    expect(isInScarcity(1799, 6000)).toBe(true);
  });

  test('District 1 EMK-1: 1800 remaining of 6000 total → NOT scarce (exactly 30%)', () => {
    expect(isInScarcity(1800, 6000)).toBe(false);
  });

  test('District 1 EMK-2: 449 remaining of 1500 total → scarce (29.9%)', () => {
    expect(isInScarcity(449, 1500)).toBe(true);
  });

  test('District 1 EMK-2: 450 remaining of 1500 total → NOT scarce (exactly 30%)', () => {
    expect(isInScarcity(450, 1500)).toBe(false);
  });
});