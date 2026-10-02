// ─── STOCK UTILITY FUNCTIONS ──────────────────────────────────────────────────
// Shared between stock.service.ts and dashboard.service.ts.
// Extracted here to prevent circular dependency:
//   stock.service imports dashboard.service (invalidateCache)
//   dashboard.service imports stock.service (isInScarcity)
// Putting isInScarcity here breaks the cycle.

/**
 * Section C.9 — Scarcity mode.
 * Returns true when remaining stock falls below 30% of total allocation.
 */
export function isInScarcity(remaining: number, total: number): boolean {
  if (total === 0) return false;
  return remaining / total < 0.3;
}
// ─── SCARCITY TRANSITIONS ─────────────────────────────────────────────────────
// Alerts fire when a change pushes an EMK type INTO scarcity — not on every
// later change while it stays scarce, so hubs are not spammed.

export type EmkKey = 'EMK1' | 'EMK2' | 'EMK3';

export interface StockLevels {
  emk1Total: number; emk1Remaining: number;
  emk2Total: number; emk2Remaining: number;
  emk3Total: number; emk3Remaining: number;
}

const EMK_FIELDS: Array<[EmkKey, 'emk1Total' | 'emk2Total' | 'emk3Total', 'emk1Remaining' | 'emk2Remaining' | 'emk3Remaining']> = [
  ['EMK1', 'emk1Total', 'emk1Remaining'],
  ['EMK2', 'emk2Total', 'emk2Remaining'],
  ['EMK3', 'emk3Total', 'emk3Remaining'],
];

/** EMK types that were not scarce before the change and are scarce after it. */
export function newlyScarce(before: StockLevels, after: StockLevels): EmkKey[] {
  return EMK_FIELDS
    .filter(([, total, remaining]) =>
      !isInScarcity(before[remaining], before[total]) && isInScarcity(after[remaining], after[total]))
    .map(([emk]) => emk);
}

/** Reconstructs the levels before a change from the levels after it and the deltas applied to Remaining. */
export function levelsBefore(after: StockLevels, deltas: Partial<Record<EmkKey, number>>): StockLevels {
  const before = { ...after };
  for (const [emk, , remaining] of EMK_FIELDS) {
    before[remaining] = after[remaining] - (deltas[emk] ?? 0);
  }
  return before;
}

export function levelOf(levels: StockLevels, emk: EmkKey): { remaining: number; total: number } {
  const [, total, remaining] = EMK_FIELDS.find(([e]) => e === emk)!;
  return { remaining: levels[remaining], total: levels[total] };
}
