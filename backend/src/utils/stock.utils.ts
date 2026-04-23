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