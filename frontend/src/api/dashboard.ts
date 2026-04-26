import { api } from './client';
import { cacheSet, cacheGet } from './cache';
import type { DashboardSummary, DistrictCard } from './dashboard.types';

export type { DashboardSummary, DistrictCard };

const CACHE_TTL = 5 * 60 * 1000;

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
    // Cache the fresh result
    cacheSet('dashboard_summary', res.data, CACHE_TTL);
    return res.data;
  },

  getSummaryCached: async (): Promise<{
    data: DashboardSummary;
    fromCache: boolean;
    isStale: boolean;
  }> => {
    const cached = cacheGet<DashboardSummary>('dashboard_summary');

    if (cached) {
      // Return cache immediately, then revalidate in background
      return { data: cached.data, fromCache: true, isStale: cached.isStale };
    }

    // No cache — must wait for network
    const res = await api.get<DashboardSummary>('/api/dashboard/summary');
    cacheSet('dashboard_summary', res.data, CACHE_TTL);
    return { data: res.data, fromCache: false, isStale: false };
  },

  getDistrictDashboard: async (districtId: string) => {
    const res = await api.get(`/api/dashboard/district/${districtId}`);
    cacheSet(`dashboard_district_${districtId}`, res.data, CACHE_TTL);
    return res.data;
  },
};