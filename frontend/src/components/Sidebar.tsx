import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Map,
  ListChecks,
  Building2,
  UserCheck,
  Warehouse,
  GitFork,
  FileText,
  Users,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

type Role = 'SUPER_ADMIN' | 'EMERGENCY_COORDINATOR' | 'HUB_MANAGER' | 'VOLUNTEER' | 'VIEWER';

interface NavItem {
  label: string;
  to: string;
  roles?: Role[];
  Icon: LucideIcon;
}

interface NavGroup {
  label: string;
  collapsible?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        Icon: LayoutDashboard,
      },
      {
        label: 'Routing',
        to: '/routing',
        Icon: Map,
        roles: ['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'SUPER_ADMIN'],
      },
      {
        label: 'Prioritize',
        to: '/prioritize',
        Icon: ListChecks,
        roles: ['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'VOLUNTEER', 'SUPER_ADMIN'],
      },
      {
        label: 'Hub Portal',
        to: '/hub',
        Icon: Building2,
        roles: ['HUB_MANAGER', 'SUPER_ADMIN', 'EMERGENCY_COORDINATOR'],
      },
      {
        label: 'Volunteer',
        to: '/volunteer',
        Icon: UserCheck,
        roles: ['VOLUNTEER', 'HUB_MANAGER', 'SUPER_ADMIN'],
      },
    ],
  },
  {
    label: 'Reference',
    collapsible: true,
    items: [
      {
        label: 'Warehouse',
        to: '/warehouse',
        Icon: Warehouse,
      },
      {
        label: 'Stakeholder',
        to: '/stakeholders',
        Icon: GitFork,
      },
      {
        label: 'Protocol',
        to: '/protocol',
        Icon: FileText,
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        label: 'Users',
        to: '/users',
        Icon: Users,
        roles: ['SUPER_ADMIN'],
      },
    ],
  },
];

export function Sidebar() {
  const { user, logout, isRole } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);

  function handleLogout() {
    setShowLogoutConfirm(false);
    logout();
  }

  return (
    <>
      {/* ── Logout confirmation modal ── */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
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
        <div
          className={`border-b border-bg-border flex items-center ${
            collapsed ? 'px-3 py-5 flex-col gap-3' : 'px-5 py-5 justify-between'
          }`}
        >
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
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-7 h-7 flex items-center justify-center rounded border border-bg-border text-text-primary hover:border-text-muted transition-colors duration-100 flex-shrink-0"
          >
            {collapsed
              ? <ChevronRight size={13} />
              : <ChevronLeft size={13} />
            }
          </button>
        </div>

        {/* Nav groups — thin custom scrollbar */}
        <nav
          className="flex-1 px-2 py-3 overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.08) transparent',
          }}
        >
          {NAV_GROUPS.map((group, gi) => {
            const visibleItems = group.items.filter(
              (item) => !item.roles || isRole(...(item.roles as Parameters<typeof isRole>))
            );

            if (visibleItems.length === 0) return null;

            const isCollapsible = group.collapsible === true;
            const itemsVisible = collapsed || !isCollapsible || referenceOpen;

            return (
              <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
                {/* Divider between groups */}
                {gi > 0 && <div className="h-px bg-bg-border mx-1 my-2" />}

                {/* Group label row */}
                {!collapsed && (
                  isCollapsible ? (
                    <button
                      onClick={() => setReferenceOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-2 pt-2 pb-1 group"
                      aria-expanded={referenceOpen}
                    >
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest select-none group-hover:text-text-secondary transition-colors duration-100">
                        {group.label}
                      </span>
                      <ChevronDown
                        size={11}
                        className={`text-text-muted group-hover:text-text-secondary transition-transform duration-200 ${
                          referenceOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                  ) : (
                    <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest px-2 pt-2 pb-1 select-none">
                      {group.label}
                    </p>
                  )
                )}

                {/* Nav items */}
                <div
                  className={`space-y-0.5 overflow-hidden transition-all duration-200 ease-in-out ${
                    itemsVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {visibleItems.map(({ label, to, Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      title={collapsed ? label : undefined}
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
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={15}
                            className={`flex-shrink-0 ${
                              isActive ? 'text-text-primary' : 'text-text-muted'
                            }`}
                            strokeWidth={1.75}
                          />
                          {!collapsed && (
                            <span className="font-sans text-sm">{label}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User info + logout */}
        {collapsed ? (
          <div className="px-2 py-4 border-t border-bg-border flex flex-col items-center gap-3">
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
              className="text-text-muted hover:text-accent-red transition-colors duration-100"
            >
              <LogOut size={13} strokeWidth={1.75} />
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
              className="flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-accent-red transition-colors duration-100 py-1"
            >
              <LogOut size={12} strokeWidth={1.75} />
              sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}