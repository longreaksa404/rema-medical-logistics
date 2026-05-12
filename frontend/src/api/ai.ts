import { api } from './client';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AiBriefDataSnapshot {
  phase: number;
  totalCritical: number;
  totalHigh: number;
  totalMedium: number;
  totalStandard: number;
  scarcityActive: boolean;
  activeDeliveryRuns: number;
  openIncidentCount: number;
  radioCompliancePct: number;
}

export interface AiBriefResponse {
  summary: string;
  priorityAlert: string;
  nextStep: string;
  generatedAt: string;
  dataSnapshot: AiBriefDataSnapshot;
}

// ─── API CALL ─────────────────────────────────────────────────────────────────

export const aiApi = {
  /**
   * POST /api/ai/brief
   * Requires EMERGENCY_COORDINATOR or SUPER_ADMIN.
   * Returns a 3-part operational brief generated from live aggregate data.
   * On 503: throws with a user-friendly message — caller shows graceful fallback.
   */
  async generateBrief(): Promise<AiBriefResponse> {
    const response = await api.post<AiBriefResponse>('/api/ai/brief');
    return response.data;
  },
};