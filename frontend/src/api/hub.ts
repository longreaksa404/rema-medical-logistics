import { api } from './client';

// ─── STOCK ────────────────────────────────────────────────────────────────────

export interface StockLevel {
  subWarehouseId: string;
  districtId: string;
  districtName: string;
  emk1Total: number;
  emk1Remaining: number;
  emk1Pct: number;
  emk1Scarce: boolean;
  emk2Total: number;
  emk2Remaining: number;
  emk2Pct: number;
  emk2Scarce: boolean;
  emk3Total: number;
  emk3Remaining: number;
  emk3Pct: number;
  emk3Scarce: boolean;
  anyScarce: boolean;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  createdAt: string;
  emkType: 'EMK1' | 'EMK2' | 'EMK3';
  movementType: 'DISPATCH' | 'DELIVERY' | 'REALLOCATION' | 'ADJUSTMENT' | 'MOH_TRANSFER';
  quantity: number;
  reason: string | null;
  performedBy: { name: string; email: string; role: string };
}

// ─── VOLUNTEERS ───────────────────────────────────────────────────────────────

export interface Volunteer {
  id: string;
  districtId: string;
  name: string;
  phone: string;
  role: 'TEAM_LEADER' | 'VOLUNTEER';
  status: 'AVAILABLE' | 'DEPLOYED' | 'INACTIVE';
  createdAt: string;
  assignments: {
    id: string;
    zone: string;
    teamNumber: number;
    subWarehouse: { name: string };
  }[];
}

export interface DistrictRoster {
  districtId: string;
  districtName: string;
  total: number;
  teamLeaders: number;
  generalVolunteers: number;
  belowMinimum: boolean;
  minimumWarning: string | null;
  volunteers: Volunteer[];
}

// ─── DELIVERIES ───────────────────────────────────────────────────────────────

export interface DeliveryRun {
  id: string;
  subWarehouseId: string;
  teamNumber: number;
  zone: string;
  departedAt: string;
  returnedAt: string | null;
  status: 'IN_PROGRESS' | 'COMPLETE' | 'ABORTED';
  leadVolunteer: { name: string; phone: string };
  subWarehouse: { district: { name: string } };
  receipts: {
    id: string;
    emkType: string;
    quantity: number;
    deliveredAt: string;
  }[];
}

// ─── INCIDENTS ────────────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  districtId: string;
  type: 'ROUTE_BLOCKED' | 'VOLUNTEER_SAFETY' | 'STOCK_SCARCITY' | 'BUILDING_FLOODED' | 'OTHER';
  description: string;
  status: 'OPEN' | 'ESCALATED' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  district: { name: string };
  reportedBy: { name: string; role: string };
  resolvedBy: { name: string; role: string } | null;
  resolvedAt: string | null;
  autoEscalated?: boolean;
  escalationNote?: string;
}

// ─── RADIO ────────────────────────────────────────────────────────────────────

export interface RadioCheckin {
  id: string;
  districtId: string;
  scheduledTime: 'T0800' | 'T1200' | 'T1600' | 'T2000';
  status: 'OK' | 'ISSUE_REPORTED';
  notes: string | null;
  createdAt: string;
  district: { name: string };
  submittedBy: { name: string; role: string };
}

// ─── API METHODS ──────────────────────────────────────────────────────────────

export const hubApi = {
  // Stock
  getDistrictStock: async (districtId: string): Promise<StockLevel> => {
    const res = await api.get<StockLevel>(`/api/stock/${districtId}`);
    return res.data;
  },

  dispatch: async (data: {
    subWarehouseId: string;
    emkType: 'EMK1' | 'EMK2' | 'EMK3';
    quantity: number;
    reason?: string;
  }) => {
    const res = await api.post('/api/stock/dispatch', data);
    return res.data;
  },

  adjust: async (data: {
    subWarehouseId: string;
    emkType: 'EMK1' | 'EMK2' | 'EMK3';
    quantity: number;
    reason: string;
  }) => {
    const res = await api.post('/api/stock/adjust', data);
    return res.data;
  },

  getMovements: async (districtId: string): Promise<StockMovement[]> => {
    const res = await api.get<StockMovement[]>(`/api/stock/movements/${districtId}`);
    return res.data;
  },

  // Volunteers
  getRoster: async (districtId: string): Promise<DistrictRoster> => {
    const res = await api.get<DistrictRoster>(`/api/volunteers/${districtId}/roster`);
    return res.data;
  },

  createVolunteer: async (data: {
    districtId: string;
    name: string;
    phone: string;
    role?: 'TEAM_LEADER' | 'VOLUNTEER';
  }): Promise<Volunteer> => {
    const res = await api.post<Volunteer>('/api/volunteers', data);
    return res.data;
  },

  updateVolunteer: async (
    id: string,
    data: { status?: 'AVAILABLE' | 'DEPLOYED' | 'INACTIVE'; role?: 'TEAM_LEADER' | 'VOLUNTEER' }
  ) => {
    const res = await api.patch(`/api/volunteers/${id}`, data);
    return res.data;
  },

  assignVolunteer: async (data: {
    volunteerId: string;
    subWarehouseId: string;
    alertId: string;
    zone: string;
    teamNumber: number;
  }) => {
    const res = await api.post('/api/volunteers/assign', data);
    return res.data;
  },

  // Deliveries
  getDeliveryRuns: async (districtId: string): Promise<DeliveryRun[]> => {
    const res = await api.get<DeliveryRun[]>('/api/delivery/runs', {
      params: { districtId },
    });
    return res.data;
  },

  startRun: async (data: {
    subWarehouseId: string;
    teamNumber: number;
    zone: string;
    leadVolunteerId: string;
  }): Promise<DeliveryRun> => {
    const res = await api.post<DeliveryRun>('/api/delivery/runs', data);
    return res.data;
  },

  completeRun: async (id: string) => {
    const res = await api.patch(`/api/delivery/runs/${id}/complete`);
    return res.data;
  },

  abortRun: async (id: string, reason: string) => {
    const res = await api.patch(`/api/delivery/runs/${id}/abort`, { reason });
    return res.data;
  },

  // Incidents
  getIncidents: async (districtId: string): Promise<Incident[]> => {
    const res = await api.get<Incident[]>('/api/incidents', {
      params: { districtId },
    });
    return res.data;
  },

  reportIncident: async (data: {
    districtId: string;
    type: Incident['type'];
    description: string;
  }): Promise<Incident> => {
    const res = await api.post<Incident>('/api/incidents', data);
    return res.data;
  },

  resolveIncident: async (id: string) => {
    const res = await api.patch(`/api/incidents/${id}/resolve`);
    return res.data;
  },

  // Radio
  getCheckins: async (districtId: string, date?: string): Promise<RadioCheckin[]> => {
    const today = date ?? new Date().toISOString().split('T')[0];
    const res = await api.get<RadioCheckin[]>('/api/radio/checkins', {
      params: { districtId, date: today },
    });
    return res.data;
  },

  submitCheckin: async (data: {
    districtId: string;
    scheduledTime: 'T0800' | 'T1200' | 'T1600' | 'T2000';
    status: 'OK' | 'ISSUE_REPORTED';
    notes?: string;
  }): Promise<RadioCheckin> => {
    const res = await api.post<RadioCheckin>('/api/radio/checkin', data);
    return res.data;
  },
};