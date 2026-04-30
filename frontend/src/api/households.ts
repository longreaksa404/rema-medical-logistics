import { api } from './client';
import type { ScoreInput } from '../utils/scoring';

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
  scoreResult?: {
    totalScore: number;
    priorityBand: string;
    recommendedEmk: string;
  };
}

export interface CreateHouseholdPayload {
  address: string;
  districtId: string;
  cat1: number;
  cat2: number;
  cat3: number;
  cat4: number;
  cat5: number;
  notes?: string;
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

  create: async (payload: CreateHouseholdPayload): Promise<Household> => {
    const res = await api.post<Household>('/api/households', payload);
    return res.data;
  },

  // Score only — no DB write
  scoreOnly: async (input: ScoreInput) => {
    const res = await api.post('/api/score/household', input);
    return res.data;
  },
};