// queryKeys.ts — single source of truth for all React Query cache keys

export const queryKeys = {
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    district: (id: string) => ['dashboard', 'district', id] as const,
  },
  alert: {
    status: () => ['alert', 'status'] as const,
  },
  districts: {
    list: () => ['districts'] as const,
    detail: (id: string) => ['districts', id] as const,
  },
  hub: {
    all:              (districtId: string) => ['hub', districtId] as const,
    centralStock:     ()                   => ['hub', 'central-stock'] as const,
    centralMovements: ()                   => ['hub', 'central-movements'] as const,
    stock:            (districtId: string) => ['hub', districtId, 'stock'] as const,
    movements:        (districtId: string) => ['hub', districtId, 'movements'] as const,
    volunteers:       (districtId: string) => ['hub', districtId, 'volunteers'] as const,
    deliveries:       (districtId: string) => ['hub', districtId, 'deliveries'] as const,
    incidents:        (districtId: string) => ['hub', districtId, 'incidents'] as const,
    radio:            (districtId: string) => ['hub', districtId, 'radio'] as const,
  },
  households: {
    queue: (districtId: string) => ['households', 'queue', districtId] as const,
    list:  (districtId: string) => ['households', 'list',  districtId] as const,
  },
  routes: {
    district: (districtId: string)  => ['routes', districtId] as const,
    logs:     (districtId?: string) => ['routes', 'logs', districtId ?? 'all'] as const,
  },
  radio: {
    compliance: ()                   => ['radio', 'compliance'] as const,
    checkins:   (districtId: string) => ['radio', 'checkins', districtId] as const,
  },
  users: {
    list: () => ['users'] as const,
  },
};