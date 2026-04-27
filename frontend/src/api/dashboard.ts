import { api } from './client';
import { cacheSet, cacheGet } from './cache';
import type { DashboardSummary, DistrictCard } from './dashboard.types';

export type { DashboardSummary, DistrictCard };

const CACHE_TTL = 5 * 60 * 1000;

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await api.get<DashboardSummary>('/api/dashboard/summary');
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
      return { data: cached.data, fromCache: true, isStale: cached.isStale };
    }
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