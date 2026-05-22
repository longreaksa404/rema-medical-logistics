import { api } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'EMERGENCY_COORDINATOR' | 'HUB_MANAGER' | 'VOLUNTEER' | 'VIEWER';
  districtId: string | null;
  mustChangePassword?: boolean;
  avatarBase64?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface ActivityData {
  role: string;
  personal: {
    incidentsReported: number;
    radioCheckins: number;
    householdsAssessed?: number;
    deliveriesLed?: number;
  };
  district?: {
    completedDeliveries: number;
    householdsServed: number;
    openIncidents: number;
  };
  system?: {
    completedDeliveries: number;
    householdsServed: number;
  };
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
    return res.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
  },

  me: async (): Promise<UserProfile> => {
    const res = await api.get<UserProfile>('/api/auth/me');
    return res.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.patch('/api/users/me/password', { currentPassword, newPassword });
  },

  updateAvatar: async (avatarBase64: string): Promise<void> => {
    await api.patch('/api/users/me/avatar', { avatarBase64 });
  },

  updateProfile: async (data: { name?: string; phone?: string | null }): Promise<UserProfile> => {
    const res = await api.patch<UserProfile>('/api/users/me/profile', data);
    return res.data;
  },

  getActivity: async (): Promise<ActivityData> => {
    const res = await api.get<ActivityData>('/api/activity/me');
    return res.data;
  },
};  