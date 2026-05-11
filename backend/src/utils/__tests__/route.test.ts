/**
 * route.test.ts
 *
 * Tests for the REMA delivery mode tier logic (Section A.4 — LOCKED).
 * Pure utility function — no Prisma, no HTTP, no database.
 *
 * Imports from route.utils.ts (extracted pure helper), NOT route.service.ts,
 * because route.service.ts imports PrismaClient at module level which would
 * fail in a pure unit test environment.
 *
 * Section A.4 locked tiers:
 *   0–30 cm    → MOTORBIKE
 *   31–60 cm   → BICYCLE_OR_FOOT
 *   61–80 cm   → BOAT
 *   > 80 cm    → SUSPENDED (volunteer safety hard constraint — ABSOLUTE)
 *
 * Implementation note (route.utils.ts, mirrors route.service.ts exactly):
 *   if (depth <= 30) → MOTORBIKE
 *   if (depth <= 60) → BICYCLE_OR_FOOT
 *   if (depth <= 80) → BOAT      ← 80 is inclusive (BOAT, not SUSPENDED)
 *   else             → SUSPENDED ← 81+ is SUSPENDED
 *
 * Section A.4 text: "Water 60–80cm → Small motorized boat"
 * Section A.4 text: "Water >80cm → Delivery suspended"
 * ">80" = strictly greater than 80 → 80 itself is still BOAT.
 */

import { getDeliveryModeForDepth } from '../route.utils';

describe('getDeliveryModeForDepth — Section A.4 locked delivery tiers', () => {
  // ─── MOTORBIKE: 0–30 cm ───────────────────────────────────────────────────

  test('depth 0 cm → MOTORBIKE (dry streets)', () => {
    expect(getDeliveryModeForDepth(0).deliveryMode).toBe('MOTORBIKE');
  });

  test('depth 15 cm → MOTORBIKE', () => {
    expect(getDeliveryModeForDepth(15).deliveryMode).toBe('MOTORBIKE');
  });

  test('depth 29 cm → MOTORBIKE', () => {
    expect(getDeliveryModeForDepth(29).deliveryMode).toBe('MOTORBIKE');
  });

  test('depth 30 cm → MOTORBIKE (inclusive upper boundary: <=30)', () => {
    expect(getDeliveryModeForDepth(30).deliveryMode).toBe('MOTORBIKE');
  });

  // ─── BICYCLE_OR_FOOT: 31–60 cm ────────────────────────────────────────────

  test('depth 31 cm → BICYCLE_OR_FOOT (just above motorbike boundary)', () => {
    expect(getDeliveryModeForDepth(31).deliveryMode).toBe('BICYCLE_OR_FOOT');
  });

  test('depth 45 cm → BICYCLE_OR_FOOT', () => {
    expect(getDeliveryModeForDepth(45).deliveryMode).toBe('BICYCLE_OR_FOOT');
  });

  test('depth 59 cm → BICYCLE_OR_FOOT', () => {
    expect(getDeliveryModeForDepth(59).deliveryMode).toBe('BICYCLE_OR_FOOT');
  });

  test('depth 60 cm → BICYCLE_OR_FOOT (inclusive upper boundary: <=60)', () => {
    expect(getDeliveryModeForDepth(60).deliveryMode).toBe('BICYCLE_OR_FOOT');
  });

  // ─── BOAT: 61–80 cm ───────────────────────────────────────────────────────

  test('depth 61 cm → BOAT (just above bicycle boundary)', () => {
    expect(getDeliveryModeForDepth(61).deliveryMode).toBe('BOAT');
  });

  test('depth 70 cm → BOAT', () => {
    expect(getDeliveryModeForDepth(70).deliveryMode).toBe('BOAT');
  });

  test('depth 79 cm → BOAT', () => {
    expect(getDeliveryModeForDepth(79).deliveryMode).toBe('BOAT');
  });

  test('depth 80 cm → BOAT (Section A.4: "60–80cm → boat", inclusive)', () => {
    // Section A.4: "Water 60–80cm → Small motorized boat"
    // SUSPENDED is ">80cm", so 80 itself stays BOAT per implementation
    expect(getDeliveryModeForDepth(80).deliveryMode).toBe('BOAT');
  });

  // ─── SUSPENDED: > 80 cm — VOLUNTEER SAFETY HARD CONSTRAINT ───────────────

  test('depth 81 cm → SUSPENDED (first depth that triggers suspension)', () => {
    expect(getDeliveryModeForDepth(81).deliveryMode).toBe('SUSPENDED');
  });

  test('depth 90 cm → SUSPENDED', () => {
    expect(getDeliveryModeForDepth(90).deliveryMode).toBe('SUSPENDED');
  });

  test('depth 100 cm → SUSPENDED', () => {
    expect(getDeliveryModeForDepth(100).deliveryMode).toBe('SUSPENDED');
  });

  test('depth 120 cm → SUSPENDED', () => {
    expect(getDeliveryModeForDepth(120).deliveryMode).toBe('SUSPENDED');
  });

  test('depth 200 cm → SUSPENDED (catastrophic flooding)', () => {
    expect(getDeliveryModeForDepth(200).deliveryMode).toBe('SUSPENDED');
  });

  // ─── WARNING MESSAGE FOR SUSPENDED ───────────────────────────────────────

  test('SUSPENDED mode includes a warning message (volunteer safety)', () => {
    const result = getDeliveryModeForDepth(90);
    expect(result.deliveryMode).toBe('SUSPENDED');
    expect(result.warning).toBeDefined();
    expect(typeof result.warning).toBe('string');
    expect(result.warning!.length).toBeGreaterThan(0);
  });

  test('non-SUSPENDED depths do NOT include a warning', () => {
    expect(getDeliveryModeForDepth(0).warning).toBeUndefined();
    expect(getDeliveryModeForDepth(30).warning).toBeUndefined();
    expect(getDeliveryModeForDepth(60).warning).toBeUndefined();
    expect(getDeliveryModeForDepth(80).warning).toBeUndefined();
  });

  // ─── TIER BOUNDARY PRECISION (critical for safe operations) ──────────────

  test('boundary: 30 → MOTORBIKE, 31 → BICYCLE_OR_FOOT', () => {
    expect(getDeliveryModeForDepth(30).deliveryMode).toBe('MOTORBIKE');
    expect(getDeliveryModeForDepth(31).deliveryMode).toBe('BICYCLE_OR_FOOT');
  });

  test('boundary: 60 → BICYCLE_OR_FOOT, 61 → BOAT', () => {
    expect(getDeliveryModeForDepth(60).deliveryMode).toBe('BICYCLE_OR_FOOT');
    expect(getDeliveryModeForDepth(61).deliveryMode).toBe('BOAT');
  });

  test('boundary: 80 → BOAT, 81 → SUSPENDED (safety threshold)', () => {
    expect(getDeliveryModeForDepth(80).deliveryMode).toBe('BOAT');
    expect(getDeliveryModeForDepth(81).deliveryMode).toBe('SUSPENDED');
  });

  // ─── FULL ASCENDING SEQUENCE ──────────────────────────────────────────────

  test('ascending depth sequence passes through all 4 tiers in correct order', () => {
    const sequence: Array<[number, string]> = [
      [0, 'MOTORBIKE'],
      [30, 'MOTORBIKE'],
      [31, 'BICYCLE_OR_FOOT'],
      [60, 'BICYCLE_OR_FOOT'],
      [61, 'BOAT'],
      [80, 'BOAT'],
      [81, 'SUSPENDED'],
      [120, 'SUSPENDED'],
    ];
    for (const [depth, expectedMode] of sequence) {
      expect(getDeliveryModeForDepth(depth).deliveryMode).toBe(expectedMode);
    }
  });
});