// App.tsx — REMA single unified React app (Option A)
// Uses React Router nested routes + Outlet pattern (matches existing ProtectedRoute.tsx)
// All authenticated pages render INSIDE AppShell (sidebar + header).
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
// Pages — filenames matched to actual project structure
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoutingPage } from './pages/RoutingPage';
import { PrioritizePage } from './pages/PrioritizePage';
import { HubPage } from './pages/HubPage';
import { VolunteerPage } from './pages/VolunteerPage';
import { UsersPage } from './pages/UsersPage';
import {
  WarehouseLayoutPage,
  StakeholderFlowchartPage,
  OperatingProtocolPage,
} from './pages/PlaceholderPages';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Any authenticated user ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          {/* ── Main app shell (sidebar + header) — any authenticated user ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>

              {/* V1 — Operations Dashboard */}
              <Route element={<ProtectedRoute roles={['EMERGENCY_COORDINATOR', 'SUPER_ADMIN', 'VIEWER', 'HUB_MANAGER']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>

              {/* V2 — Routing Map */}
              <Route element={<ProtectedRoute roles={['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'SUPER_ADMIN']} />}>
                <Route path="/routing" element={<RoutingPage />} />
              </Route>

              {/* V3 — Warehouse Layout (static — Chat 15) */}
              <Route path="/warehouse" element={<WarehouseLayoutPage />} />

              {/* V4 — Prioritization Tool */}
              <Route element={<ProtectedRoute roles={['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'VOLUNTEER', 'SUPER_ADMIN']} />}>
                <Route path="/prioritize" element={<PrioritizePage />} />
              </Route>

              {/* V5 — Stakeholder Flowchart (static — Chat 16) */}
              <Route path="/stakeholders" element={<StakeholderFlowchartPage />} />

              {/* V6 — Operating Protocol (static — Chat 17) */}
              <Route path="/protocol" element={<OperatingProtocolPage />} />

              {/* V7 — Hub Manager Portal */}
              <Route element={<ProtectedRoute roles={['HUB_MANAGER', 'EMERGENCY_COORDINATOR', 'SUPER_ADMIN']} />}>
                <Route path="/hub" element={<HubPage />} />
              </Route>

              {/* V8 — Volunteer View */}
              <Route element={<ProtectedRoute roles={['VOLUNTEER', 'HUB_MANAGER', 'EMERGENCY_COORDINATOR', 'SUPER_ADMIN']} />}>
                <Route path="/volunteer" element={<VolunteerPage />} />
              </Route>

              {/* V9 — User Management (SUPER_ADMIN only) */}
              <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}