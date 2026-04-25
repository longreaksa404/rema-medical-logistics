import { api } from './client';

export interface DistrictCard {
  districtId: string;
  name: string;
  population: number;
  subWarehouseId: string | null;
  subWarehouseStatus: 'INACTIVE' | 'ACTIVE' | 'BACKUP_ACTIVATED' | null;
  stockPct: number;
  anyScarce: boolean;
  stock: {
    emk1Total: number;
    emk1Remaining: number;
    emk2Total: number;
    emk2Remaining: number;
    emk3Total: number;
    emk3Remaining: number;
  } | null;
  householdsAssessed: number;
  deliveredCount: number;
  openIncidents: number;
}

export interface DashboardSummary {
  phase: 0 | 1 | 2;
  activated: boolean;
  activatedAt: string | null;
  triggerConditions: {
    warningLevelTwo: boolean;
    rainfallExceeds100mm: boolean;
    streetFloodingReport: boolean;
  } | null;
  households: {
    critical: number;
    high: number;
    medium: number;
    standard: number;
    delivered: number;
    total: number;
    pendingDelivery: number;
  };
  activeDeliveryRuns: number;
  todayRadioCheckins: number;
  districts: DistrictCard[];
  openIncidents: {
    id: string;
    districtId: string;
    type: string;
    description: string;
    status: 'OPEN' | 'ESCALATED' | 'RESOLVED';
    createdAt: string;
  }[];
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await api.get<DashboardSummary>('/api/dashboard/summary');
    return res.data;
  },

  getDistrictDashboard: async (districtId: string) => {
    const res = await api.get(`/api/dashboard/district/${districtId}`);
    return res.data;
  },
};