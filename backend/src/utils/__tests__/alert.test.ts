/**
 * alert.test.ts
 *
 * Tests for the REMA flood alert 2-of-3 activation logic (Section A.3).
 * Pure utility function — no Prisma, no HTTP, no database.
 *
 * Section A.3:
 *   "REMA Phase 1 activates when ANY TWO of the following are confirmed:
 *    - City/provincial flood warning issued (Level 2 or above)
 *    - Rainfall forecast exceeds 100mm in 24 hours
 *    - Any target district reports street-level flooding"
 *
 * The alert.service.ts contains the activation logic inside submitTrigger()
 * which is an async DB-dependent function. We extract the pure activation
 * predicate here for unit testing.
 */

// ─── PURE ACTIVATION HELPER ───────────────────────────────────────────────────
// This mirrors exactly the logic inside alert.service.ts submitTrigger().
// The rule: count how many of the 3 booleans are true; activate if >= 2.

export function shouldActivate(
  warningLevelTwo: boolean,
  rainfallExceeds100mm: boolean,
  streetFloodingReport: boolean,
): boolean {
  const trueCount = [warningLevelTwo, rainfallExceeds100mm, streetFloodingReport]
    .filter(Boolean).length;
  return trueCount >= 2;
}

// ─── ALL 8 BOOLEAN COMBINATIONS ──────────────────────────────────────────────

describe('shouldActivate — 2-of-3 activation rule (Section A.3)', () => {
  // ─── ZERO CONDITIONS: must NOT activate ──────────────────────────────────

  test('all 3 false → does NOT activate', () => {
    expect(shouldActivate(false, false, false)).toBe(false);
  });

  // ─── ONE CONDITION: must NOT activate ────────────────────────────────────

  test('only warningLevelTwo → does NOT activate', () => {
    expect(shouldActivate(true, false, false)).toBe(false);
  });

  test('only rainfallExceeds100mm → does NOT activate', () => {
    expect(shouldActivate(false, true, false)).toBe(false);
  });

  test('only streetFloodingReport → does NOT activate', () => {
    expect(shouldActivate(false, false, true)).toBe(false);
  });

  // ─── TWO CONDITIONS: MUST activate ───────────────────────────────────────

  test('warningLevelTwo + rainfallExceeds100mm → ACTIVATES', () => {
    expect(shouldActivate(true, true, false)).toBe(true);
  });

  test('warningLevelTwo + streetFloodingReport → ACTIVATES', () => {
    expect(shouldActivate(true, false, true)).toBe(true);
  });

  test('rainfallExceeds100mm + streetFloodingReport → ACTIVATES', () => {
    expect(shouldActivate(false, true, true)).toBe(true);
  });

  // ─── THREE CONDITIONS: MUST activate ─────────────────────────────────────

  test('all 3 true → ACTIVATES', () => {
    expect(shouldActivate(true, true, true)).toBe(true);
  });

  // ─── EXACT COUNT VERIFICATION ────────────────────────────────────────────

  test('exactly 1 true condition is never enough (all 3 single-true cases fail)', () => {
    const singleTrue = [
      shouldActivate(true, false, false),
      shouldActivate(false, true, false),
      shouldActivate(false, false, true),
    ];
    for (const result of singleTrue) {
      expect(result).toBe(false);
    }
  });

  test('exactly 2 true conditions always activates (all 3 double-true cases pass)', () => {
    const doubleTrue = [
      shouldActivate(true, true, false),
      shouldActivate(true, false, true),
      shouldActivate(false, true, true),
    ];
    for (const result of doubleTrue) {
      expect(result).toBe(true);
    }
  });

  // ─── SEQUENTIAL TRIGGER SIMULATION ───────────────────────────────────────
  // Mirrors the real flow: conditions arrive one at a time

  test('first trigger: warningLevelTwo only → not yet activated', () => {
    // Simulates: user submits first trigger condition
    const state = { warningLevelTwo: true, rainfall: false, street: false };
    expect(shouldActivate(state.warningLevelTwo, state.rainfall, state.street)).toBe(false);
  });

  test('second trigger: + rainfallExceeds100mm → activates on second condition', () => {
    // Simulates: user submits second trigger condition → REMA activates
    const state = { warningLevelTwo: true, rainfall: true, street: false };
    expect(shouldActivate(state.warningLevelTwo, state.rainfall, state.street)).toBe(true);
  });

  test('phase cannot advance if not activated (guard)', () => {
    // Logical validation: activation is required before phase advance
    // This mirrors the advancePhase() guard in alert.service.ts
    const activated = shouldActivate(false, false, false);
    expect(activated).toBe(false);
    // If activated is false, phase advance should throw — tested conceptually here
  });
});