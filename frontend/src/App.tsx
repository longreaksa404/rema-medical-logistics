import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import {
  RoutingPage,
  PrioritizePage,
  HubPage,
  VolunteerPage,
  UsersPage,
} from './pages/PlaceholderPages';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/routing" element={<RoutingPage />} />
              <Route path="/prioritize" element={<PrioritizePage />} />
              <Route path="/volunteer" element={<VolunteerPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>
          </Route>

          {/* Hub Manager and above */}
          <Route
            element={
              <ProtectedRoute
                roles={['HUB_MANAGER', 'EMERGENCY_COORDINATOR', 'SUPER_ADMIN']}
              />
            }
          >
            <Route element={<AppShell />}>
              <Route path="/hub" element={<HubPage />} />
            </Route>
          </Route>

          {/* Super Admin only */}
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}