import { api } from './client';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type TriggerCondition =
  | 'warningLevelTwo'
  | 'rainfallExceeds100mm'
  | 'streetFloodingReport';

export interface AlertStatus {
  id: number;
  phase: number;
  activated: boolean;
  activatedAt: string | null;
  warningLevelTwo: boolean;
  rainfallExceeds100mm: boolean;
  streetFloodingReport: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

export const alertApi = {
  // Submit a trigger condition (any authenticated user)
  trigger: async (condition: TriggerCondition): Promise<AlertStatus> => {
    const res = await api.post('/api/alert/trigger', { condition });
    return res.data;
  },

  // Get current alert status (any authenticated user)
  getStatus: async (): Promise<AlertStatus> => {
    const res = await api.get('/api/alert/status');
    return res.data;
  },

  // Advance phase — EMERGENCY_COORDINATOR+ only
  advancePhase: async (phase: 1 | 2): Promise<AlertStatus> => {
    const res = await api.patch('/api/alert/phase', { phase });
    return res.data;
  },

  // Reset system to Phase 0 — SUPER_ADMIN only
  reset: async (): Promise<AlertStatus> => {
    const res = await api.post('/api/alert/reset');
    return res.data;
  },
};  