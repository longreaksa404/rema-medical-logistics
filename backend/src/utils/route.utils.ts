// ─── ROUTE UTILITY FUNCTIONS ─────────────────────────────────────────────────
// Extracted from route.service.ts so the pure delivery-mode logic can be
// unit tested without importing PrismaClient.
//
// Section A.4 — LOCKED delivery mode tiers:
//   0–30 cm    → MOTORBIKE
//   30–60 cm   → BICYCLE_OR_FOOT   (note: <=30 is MOTORBIKE, so 31–60)
//   60–80 cm   → BOAT              (note: <=60 is BICYCLE, so 61–80)
//   > 80 cm    → SUSPENDED         (hard volunteer safety constraint)
//
// Source of truth: route.service.ts getDeliveryMode()
// These two files must stay in sync.

export type DeliveryModeResult = {
  deliveryMode: 'MOTORBIKE' | 'BICYCLE_OR_FOOT' | 'BOAT' | 'SUSPENDED';
  warning?: string;
};

/**
 * Returns the correct delivery mode for a given water depth in centimetres.
 * Implements the locked Section A.4 tiers — do NOT change without updating
 * the strategy document and route.service.ts simultaneously.
 */
export function getDeliveryModeForDepth(waterDepthCm: number): DeliveryModeResult {
  if (waterDepthCm <= 30) return { deliveryMode: 'MOTORBIKE' };
  if (waterDepthCm <= 60) return { deliveryMode: 'BICYCLE_OR_FOOT' };
  if (waterDepthCm <= 80) return { deliveryMode: 'BOAT' };
  return {
    deliveryMode: 'SUSPENDED',
    warning:
      'Water depth exceeds 80cm — all delivery suspended per Section A.4. ' +
      'Escalate to local civil defense for evacuation support. ' +
      'Volunteer safety is a hard constraint.',
  };
}