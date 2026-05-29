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
  // household size and kit quantity fields
  householdSize?: number;
  chronicIllCount?: number;
  emk1Quantity?: number;
  emk2Quantity?: number;
  emk3Quantity?: number;
  totalEmkQuantity?: number;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateHouseholdPayload {
  address: string;
  districtId: string;
  cat1: number;
  cat2: number;
  cat3: number;
  cat4: number;
  cat5: number;
  householdSize?: number;
  hasVulnerableMember?: boolean;
  notes?: string;
}

export const householdsApi = {
  getPriorityQueue: async (districtId: string, page = 1): Promise<PaginatedResponse<Household>> => {
    const res = await api.get<PaginatedResponse<Household>>('/api/households/priority-queue', {
      params: { districtId, page, pageSize: 10 },
    });
    return res.data;
  },

  list: async (
    filters?: { districtId?: string; band?: string; delivered?: boolean },
    page = 1
  ): Promise<PaginatedResponse<Household>> => {
    const res = await api.get<PaginatedResponse<Household>>('/api/households', {
      params: { ...filters, page, pageSize: 10 },
    });
    return res.data;
  },

  create: async (payload: CreateHouseholdPayload): Promise<Household> => {
    const res = await api.post<Household>('/api/households', payload);
    return res.data;
  },

  // score only — no DB write
  scoreOnly: async (input: ScoreInput) => {
    const res = await api.post('/api/score/household', input);
    return res.data;
  },
};