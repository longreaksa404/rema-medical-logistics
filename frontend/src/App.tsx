import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoutingPage } from './pages/RoutingPage';
import { HubPage } from './pages/HubPage';
import { VolunteerPage } from './pages/VolunteerPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import {
  WarehouseLayoutPage,
  OperatingProtocolPage,
} from './pages/PlaceholderPages';
import StakeholderPage from './pages/StakeholderPage';
import { EventHistoryPage } from './pages/EventHistoryPage';
import { ThemeProvider } from './theme/ThemeProvider';
import { I18nProvider } from './i18n';

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* public */}
              <Route path="/login" element={<LoginPage />} />

              {/* any authenticated user — no shell */}
              <Route element={<ProtectedRoute />}>
                <Route path="/change-password" element={<ChangePasswordPage />} />
              </Route>

              {/* main app shell */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>

                  <Route element={<ProtectedRoute roles={['EMERGENCY_COORDINATOR', 'SUPER_ADMIN', 'VIEWER', 'HUB_MANAGER', 'VOLUNTEER']} />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'SUPER_ADMIN']} />}>
                    <Route path="/routing" element={<RoutingPage />} />
                  </Route>

                  <Route path="/warehouse"   element={<WarehouseLayoutPage />} />
                  <Route path="/stakeholders" element={<StakeholderPage />} />
                  <Route path="/protocol"    element={<OperatingProtocolPage />} />

                  <Route element={<ProtectedRoute roles={['HUB_MANAGER', 'EMERGENCY_COORDINATOR', 'SUPER_ADMIN']} />}>
                    <Route path="/hub" element={<HubPage />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={['VOLUNTEER', 'HUB_MANAGER', 'EMERGENCY_COORDINATOR', 'SUPER_ADMIN']} />}>
                    <Route path="/volunteer" element={<VolunteerPage />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
                    <Route path="/users" element={<UsersPage />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={['EMERGENCY_COORDINATOR', 'SUPER_ADMIN', 'VIEWER', 'HUB_MANAGER']} />}>
                    <Route path="/history" element={<EventHistoryPage />} />
                  </Route>

                  {/* profile — all authenticated users */}
                  <Route path="/profile" element={<ProfilePage />} />

                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />

                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}