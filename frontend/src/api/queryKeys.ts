// queryKeys.ts
// Single source of truth for all React Query cache keys.
// Using arrays so invalidateQueries can match by prefix.
//
// Example: invalidateQueries({ queryKey: queryKeys.hub.all(districtId) })
// invalidates every hub tab for that district at once.

export const queryKeys = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    district: (id: string) => ['dashboard', 'district', id] as const,
  },

  // ── Alert ──────────────────────────────────────────────────────────────────
  alert: {
    status: () => ['alert', 'status'] as const,
  },

  // ── Districts ──────────────────────────────────────────────────────────────
  districts: {
    list: () => ['districts'] as const,
    detail: (id: string) => ['districts', id] as const,
  },

  // ── Hub (all tabs) ─────────────────────────────────────────────────────────
  hub: {
    // Matches all hub queries for a district — useful for bulk invalidation
    all: (districtId: string) => ['hub', districtId] as const,
    stock: (districtId: string) => ['hub', districtId, 'stock'] as const,
    movements: (districtId: string) => ['hub', districtId, 'movements'] as const,
    volunteers: (districtId: string) => ['hub', districtId, 'volunteers'] as const,
    deliveries: (districtId: string) => ['hub', districtId, 'deliveries'] as const,
    incidents: (districtId: string) => ['hub', districtId, 'incidents'] as const,
    radio: (districtId: string) => ['hub', districtId, 'radio'] as const,
  },

  // ── Households ─────────────────────────────────────────────────────────────
  households: {
    queue: (districtId: string) => ['households', 'queue', districtId] as const,
    list: (districtId: string) => ['households', 'list', districtId] as const,
  },

  // ── Routes ─────────────────────────────────────────────────────────────────
  routes: {
    district: (districtId: string) => ['routes', districtId] as const,
    logs: (districtId?: string) => ['routes', 'logs', districtId ?? 'all'] as const,
  },

  // ── Radio ──────────────────────────────────────────────────────────────────
  radio: {
    compliance: () => ['radio', 'compliance'] as const,
    checkins: (districtId: string) => ['radio', 'checkins', districtId] as const,
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  users: {
    list: () => ['users'] as const,
  },
};