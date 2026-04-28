import { api } from './client';

export interface Household {
  id: string;
  address: string;
  districtId: string;
  district: { name: string };
  medicalUrgencyScore: number;
  vulnerabilityScore: number;
  floodExposureScore: number;
  selfSufficiencyScore: number;
  isolationScore: number;
  totalScore: number;
  priorityBand: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STANDARD';
  recommendedEmk: 'EMK1' | 'EMK2' | 'EMK3';
  delivered: boolean;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  assessedBy?: { name: string; email: string } | null;
}

export const householdsApi = {
  getPriorityQueue: async (districtId: string): Promise<Household[]> => {
    const res = await api.get<Household[]>('/api/households/priority-queue', {
      params: { districtId },
    });
    return res.data;
  },

  list: async (filters?: {
    districtId?: string;
    band?: string;
    delivered?: boolean;
  }): Promise<Household[]> => {
    const res = await api.get<Household[]>('/api/households', { params: filters });
    return res.data;
  },
};