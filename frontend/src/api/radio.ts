import { api } from './client';

export interface RadioComplianceEntry {
  districtId: string;
  districtName: string;
  completedSlots: string[];
  missingSlots: string[];
  issuesReported: boolean;
  compliance: string;
}

export const radioApi = {
  getCompliance: async (): Promise<RadioComplianceEntry[]> => {
    const res = await api.get<RadioComplianceEntry[]>('/api/radio/compliance');
    return res.data;
  },
};