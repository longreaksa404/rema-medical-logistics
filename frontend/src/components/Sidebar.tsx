import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  to: string;
  roles?: ReturnType<typeof useAuth>['user'] extends { role: infer R } ? R[] : never;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: '◈',
    // No roles = visible to all authenticated users
  },
  {
    label: 'Routing',
    to: '/routing',
    icon: '⟁',
    roles: ['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'SUPER_ADMIN'] as const,
  },
  {
    label: 'Prioritize',
    to: '/prioritize',
    icon: '⊞',
    roles: ['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'VOLUNTEER', 'SUPER_ADMIN'] as const,
  },
  {
    label: 'Stakeholder',
    to: '/stakeholders',
    icon: '⬢',
    // No roles = visible to all (static page, no ProtectedRoute role guard)
  },
  {
    label: 'Hub Portal',
    to: '/hub',
    icon: '⬡',
    roles: ['HUB_MANAGER', 'SUPER_ADMIN', 'EMERGENCY_COORDINATOR'] as const,
  },
  {
    label: 'Volunteer',
    to: '/volunteer',
    icon: '⊕',
    roles: ['VOLUNTEER', 'HUB_MANAGER', 'SUPER_ADMIN'] as const,
  },
  {
    label: 'Users',
    to: '/users',
    icon: '⊗',
    roles: ['SUPER_ADMIN'] as const,
  },
] as NavItem[];

export function Sidebar() {
  const { user, logout, isRole } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || isRole(...(item.roles as Parameters<typeof isRole>))
  );

  return (
    <>
      {/* ── Logout confirmation modal ── */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-bg-secondary border border-bg-border rounded-lg p-6 w-80 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-sans text-sm text-text-primary mb-1">Sign out of REMA?</p>
            <p className="font-mono text-[11px] text-text-muted mb-6">
              You are signed in as <span className="text-accent-blue">{user?.email}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded bg-accent-red/10 border border-accent-red/30 text-accent-red font-mono text-xs hover:bg-accent-red/20 transition-colors"
              >
                sign out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded bg-bg-elevated border border-bg-border text-text-secondary font-mono text-xs hover:text-text-primary transition-colors"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`flex-shrink-0 bg-bg-secondary border-r border-bg-border flex flex-col h-screen sticky top-0 transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* Logo + collapse toggle */}
        <div className={`border-b border-bg-border flex items-center ${collapsed ? 'px-3 py-5 flex-col gap-3' : 'px-5 py-5 justify-between'}`}>
          {collapsed && (
            <img
              src="/rema_logo_new.svg"
              alt="REMA"
              className="h-7 w-7 flex-shrink-0"
              title="REMA — Emergency Medical Access"
            />
          )}
          {!collapsed && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <img
                  src="/rema_logo_new.svg"
                  alt="REMA"
                  className="h-5 w-5 flex-shrink-0"
                />
                <span className="font-sans font-extrabold text-text-primary text-lg tracking-tight">
                  REMA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
              </div>
              <p className="font-mono text-[10px] text-text-muted">
                Emergency Medical Access
              </p>
            </div>
          )}

          <button
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-7 h-7 flex items-center justify-center rounded border border-bg-border text-text-primary hover:border-text-muted transition-colors duration-100 flex-shrink-0"
          >
            <span className="font-mono text-xs">
              {collapsed ? '→' : '←'}
            </span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-2 py-2.5 rounded text-sm transition-colors duration-100',
                  collapsed ? 'justify-center' : '',
                  isActive
                    ? 'bg-bg-elevated text-text-primary border border-bg-border'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50',
                ].join(' ')
              }
            >
              <span className="font-mono text-base w-5 flex-shrink-0 text-center">
                {item.icon}
              </span>
              {!collapsed && (
                <span className="font-sans text-sm">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        {collapsed ? (
          <div className="px-2 py-4 border-t border-bg-border flex flex-col items-center gap-2">
            <div
              title={`${user?.name} · ${user?.role}`}
              className="w-7 h-7 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center flex-shrink-0"
            >
              <span className="font-mono text-[10px] text-accent-blue font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign out"
              className="font-mono text-xs text-text-muted hover:text-accent-red transition-colors duration-100"
            >
              →
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 border-t border-bg-border">
            <div className="mb-3">
              <p className="font-sans text-sm text-text-primary truncate">{user?.name}</p>
              <p className="font-mono text-[10px] text-text-muted truncate">{user?.email}</p>
              <span className="inline-block mt-1 font-mono text-[10px] text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">
                {user?.role.replace('_', ' ')}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full text-left font-mono text-xs text-text-muted hover:text-accent-red transition-colors duration-100 py-1"
            >
              → sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}