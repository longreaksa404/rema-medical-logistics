import { api } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'EMERGENCY_COORDINATOR' | 'HUB_MANAGER' | 'VOLUNTEER' | 'VIEWER';
  districtId: string | null;
  mustChangePassword?: boolean;  // present on login response, absent on /me
  avatarBase64?: string | null;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
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
};