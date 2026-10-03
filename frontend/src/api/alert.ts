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

export interface ResetResult {
  message: string;
  alert: AlertStatus;
  archivedEventId: string | null;
  runsAborted: number;
  volunteersStoodDown: number;
}

// One flood event (open or archived) with after-action stats
export interface FloodEvent {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  activatedAt: string | null;
  phase2At: string | null;
  closedAt: string | null;
  closedBy: { name: string } | null;
  activated: boolean;
  phaseReached: number;
  conditions: Record<TriggerCondition, boolean>;
  conditionReports: Array<{ condition: TriggerCondition; createdAt: string; reportedBy: { name: string; role: string } }>;
  stats: {
    householdsAssessed: number;
    householdsDelivered: number;
    kitsDelivered: { EMK1: number; EMK2: number; EMK3: number };
    deliveryRuns: { total: number; complete: number; aborted: number; inProgress: number };
    incidents: { total: number; unresolved: number; byType: Record<string, number> };
    radioCheckins: { total: number; issuesReported: number };
    volunteersDeployed: number;
  };
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

export const alertApi = {
  // Confirm a trigger condition — EMERGENCY_COORDINATOR+ only
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

  // Close + archive the current flood event and return to Phase 0 — SUPER_ADMIN only
  reset: async (): Promise<ResetResult> => {
    const res = await api.post('/api/alert/reset');
    return res.data;
  },

  // Past and current flood events with after-action stats
  getHistory: async (): Promise<FloodEvent[]> => {
    const res = await api.get('/api/alert/history');
    return res.data;
  },
};  