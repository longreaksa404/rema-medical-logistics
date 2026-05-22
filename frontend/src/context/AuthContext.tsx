import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io as socketIo, Socket } from 'socket.io-client';
import { authApi } from '../api/auth';
import type { UserProfile } from '../api/auth';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type SocketEventName = 'phase_changed' | 'scarcity_triggered' | 'incident_reported';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearMustChangePassword: () => void;
  isRole: (...roles: UserProfile['role'][]) => boolean;
  onSocketEvent: (event: SocketEventName, handler: (data: unknown) => void) => () => void;
  updateAvatar: (base64: string) => void;
  // syncs name + phone into user state + localStorage after a successful profile save
  updateProfile: (data: { name?: string; phone?: string | null }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                     = useState<UserProfile | null>(null);
  const [token, setToken]                   = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [mustChangePassword, setMustChange] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connectSocket = useCallback((authToken: string) => {
    if (socketRef.current?.connected) return;

    const socket = socketIo(BACKEND_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect_error', () => {});
    socketRef.current = socket;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // restore session on page load
  useEffect(() => {
    const storedToken      = localStorage.getItem('rema_token');
    const storedUser       = localStorage.getItem('rema_user');
    const storedMustChange = localStorage.getItem('rema_must_change');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setMustChange(storedMustChange === 'true');
        connectSocket(storedToken);
      } catch {
        localStorage.removeItem('rema_token');
        localStorage.removeItem('rema_user');
        localStorage.removeItem('rema_must_change');
      }
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const data = await authApi.login(email, password);
    const mustChange = data.user.mustChangePassword ?? false;
    localStorage.setItem('rema_token', data.token);
    localStorage.setItem('rema_user', JSON.stringify(data.user));
    localStorage.setItem('rema_must_change', String(mustChange));
    setToken(data.token);
    setUser(data.user);
    setMustChange(mustChange);
    connectSocket(data.token);
    return mustChange;
  }, [connectSocket]);

  const logout = useCallback(() => {
    localStorage.removeItem('rema_token');
    localStorage.removeItem('rema_user');
    localStorage.removeItem('rema_must_change');
    setToken(null);
    setUser(null);
    setMustChange(false);
    disconnectSocket();
    authApi.logout().catch(() => {});
  }, [disconnectSocket]);

  const clearMustChangePassword = useCallback(() => {
    localStorage.setItem('rema_must_change', 'false');
    setMustChange(false);
  }, []);

  const isRole = useCallback(
    (...roles: UserProfile['role'][]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const onSocketEvent = useCallback(
    (event: SocketEventName, handler: (data: unknown) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      socket.on(event, handler);
      return () => socket.off(event, handler);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  const updateAvatar = useCallback((base64: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, avatarBase64: base64 };
      localStorage.setItem('rema_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateProfile = useCallback((data: { name?: string; phone?: string | null }) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        ...(data.name  !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
      };
      localStorage.setItem('rema_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, mustChangePassword,
      login, logout, clearMustChangePassword, isRole,
      onSocketEvent, updateAvatar, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}