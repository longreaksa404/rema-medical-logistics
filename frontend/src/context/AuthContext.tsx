import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io as socketIo, Socket } from 'socket.io-client';
import { authApi } from '../api/auth';
import type { UserProfile } from '../api/auth';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// events the backend emits — components subscribe via onSocketEvent
export type SocketEventName = 'phase_changed' | 'scarcity_triggered' | 'incident_reported';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearMustChangePassword: () => void;
  isRole: (...roles: UserProfile['role'][]) => boolean;
  // subscribe to a socket event; returns unsubscribe fn
  onSocketEvent: (event: SocketEventName, handler: (data: unknown) => void) => () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // connect socket when token is available, disconnect on logout
  const connectSocket = useCallback((authToken: string) => {
    if (socketRef.current?.connected) return;

    const socket = socketIo(BACKEND_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect_error', () => {
      // silent — polling fallback handles connectivity
    });

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
    const storedToken = localStorage.getItem('rema_token');
    const storedUser = localStorage.getItem('rema_user');
    const storedMustChange = localStorage.getItem('rema_must_change');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setMustChangePassword(storedMustChange === 'true');
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

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    const mustChange = data.user.mustChangePassword ?? false;
    localStorage.setItem('rema_token', data.token);
    localStorage.setItem('rema_user', JSON.stringify(data.user));
    localStorage.setItem('rema_must_change', String(mustChange));
    setToken(data.token);
    setUser(data.user);
    setMustChangePassword(mustChange);
    connectSocket(data.token);
  }, [connectSocket]);

  const logout = useCallback(() => {
    localStorage.removeItem('rema_token');
    localStorage.removeItem('rema_user');
    localStorage.removeItem('rema_must_change');
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    disconnectSocket();
    authApi.logout().catch(() => {});
  }, [disconnectSocket]);

  const clearMustChangePassword = useCallback(() => {
    localStorage.setItem('rema_must_change', 'false');
    setMustChangePassword(false);
  }, []);

  const isRole = useCallback(
    (...roles: UserProfile['role'][]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  // components call this to subscribe to socket events
  // returns an unsubscribe function for useEffect cleanup
  const onSocketEvent = useCallback(
    (event: SocketEventName, handler: (data: unknown) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      socket.on(event, handler);
      return () => socket.off(event, handler);
    },
    // re-run when socket reference changes (login/logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  return (
    <AuthContext.Provider
      value={{
        user, token, isLoading, mustChangePassword,
        login, logout, clearMustChangePassword, isRole, onSocketEvent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}