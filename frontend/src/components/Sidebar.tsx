import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Map,
  Building2,
  UserCheck,
  Warehouse,
  GitFork,
  FileText,
  History,
  Users,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { useOutbox } from '../offline';
import { useMediaQuery } from '../hooks/useMediaQuery';

const COLLAPSE_KEY = 'rema.sidebar.collapsed';

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  EMERGENCY_COORDINATOR: 'Emergency Coord.',
  HUB_MANAGER: 'Hub Manager',
  VOLUNTEER: 'Volunteer',
  VIEWER: 'Viewer',
};

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
      { label: 'Dashboard', to: '/dashboard', Icon: LayoutDashboard },
      { label: 'Routing',   to: '/routing',   Icon: Map,       roles: ['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'SUPER_ADMIN'] },
      { label: 'Hub Portal',to: '/hub',       Icon: Building2, roles: ['HUB_MANAGER', 'SUPER_ADMIN', 'EMERGENCY_COORDINATOR'] },
      { label: 'Volunteer', to: '/volunteer', Icon: UserCheck,  roles: ['VOLUNTEER', 'HUB_MANAGER', 'SUPER_ADMIN'] },
      { label: 'Event History', to: '/history', Icon: History, roles: ['EMERGENCY_COORDINATOR', 'SUPER_ADMIN', 'VIEWER', 'HUB_MANAGER'] },
    ],
  },
  {
    label: 'Reference',
    collapsible: true,
    items: [
      { label: 'Warehouse',   to: '/warehouse',    Icon: Warehouse },
      { label: 'Stakeholder', to: '/stakeholders', Icon: GitFork },
      { label: 'Protocol',    to: '/protocol',     Icon: FileText },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users', to: '/users', Icon: Users, roles: ['SUPER_ADMIN'] },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout, isRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [collapsedPref, setCollapsedPref] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  // the drawer is always full width on mobile
  const collapsed = collapsedPref && isDesktop;
  function toggleCollapsed() {
    setCollapsedPref((prev) => {
      try { localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1'); } catch { /* storage unavailable */ }
      return !prev;
    });
  }
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [referenceOpen,     setReferenceOpen]     = useState(
    () => ['/warehouse', '/stakeholders', '/protocol'].includes(location.pathname),
  );
  const { pending: unsynced } = useOutbox(user?.id);

  // close the mobile drawer on navigation and on Escape
  useEffect(() => { onMobileClose(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  function handleLogout() {
    setShowLogoutConfirm(false);
    logout();
  }

  return (
    <>
      {/* logout confirmation modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="bg-bg-secondary border border-bg-border rounded-xl p-6 w-80 max-w-[calc(100vw-2rem)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-sans text-sm text-text-primary mb-1">Sign out of REMA?</p>
            <p className="font-mono text-[11px] text-text-muted mb-6">
              You are signed in as <span className="text-accent-blue">{user?.email}</span>
            </p>
            {unsynced.length > 0 && (
              <p className="font-mono text-[11px] text-accent-orange -mt-4 mb-5 leading-relaxed">
                {unsynced.length} item{unsynced.length === 1 ? '' : 's'} recorded offline {unsynced.length === 1 ? 'has' : 'have'} not
                synced yet. {unsynced.length === 1 ? 'It stays' : 'They stay'} on this device and will be sent the next time
                you sign in here.
              </p>
            )}
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

      {/* mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* sidebar */}
      <aside
        aria-label="Main navigation"
        className={[
          'bg-bg-secondary border-r border-bg-border flex flex-col h-[100dvh] flex-shrink-0',
          'fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:translate-x-0 md:shadow-none md:transition-[width]',
          collapsed ? 'md:w-16' : 'md:w-60',
        ].join(' ')}
      >
        {/* logo + collapse toggle */}
        <div
          className={`border-b border-bg-border flex items-center ${
            collapsed ? 'px-3 py-5 flex-col gap-3' : 'px-5 py-5 justify-between'
          }`}
        >
          {collapsed && (
            <img src="/rema_logo_new.svg" alt="REMA" className="h-7 w-7 flex-shrink-0" title="REMA" />
          )}
          {!collapsed && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <img src="/rema_logo_new.svg" alt="REMA" className="h-5 w-5 flex-shrink-0" />
                <span className="font-display font-extrabold text-text-primary text-lg tracking-tight">REMA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
              </div>
              <p className="font-mono text-[11px] text-text-muted">Emergency Medical Access</p>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-md border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors duration-100 flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="md:hidden w-9 h-9 -mr-2 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          >
            <X size={18} />
          </button>
        </div>

        {/* nav groups */}
        <nav
          className="flex-1 px-2 py-3 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          {NAV_GROUPS.map((group, gi) => {
            const visibleItems = group.items.filter(
              (item) => !item.roles || isRole(...(item.roles as Parameters<typeof isRole>))
            );
            if (visibleItems.length === 0) return null;

            const isCollapsible = group.collapsible === true;
            const itemsVisible  = collapsed || !isCollapsible || referenceOpen;

            return (
              <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
                {gi > 0 && <div className="h-px bg-bg-border mx-1 my-2" />}

                {!collapsed && (
                  isCollapsible ? (
                    <button
                      onClick={() => setReferenceOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-2 pt-2 pb-1 group"
                      aria-expanded={referenceOpen}
                    >
                      <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest select-none group-hover:text-text-secondary transition-colors duration-100">
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
                    <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest px-2 pt-2 pb-1 select-none">
                      {group.label}
                    </p>
                  )
                )}

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
                          'relative flex items-center gap-3 px-2.5 py-2 min-h-[38px] rounded-md text-sm transition-colors duration-100',
                          collapsed ? 'justify-center' : '',
                          isActive
                            ? 'bg-accent-blue/10 text-text-primary'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                        ].join(' ')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent-blue" aria-hidden="true" />
                          )}
                          <Icon
                            size={16}
                            className={`flex-shrink-0 ${isActive ? 'text-accent-blue' : 'text-text-muted'}`}
                            strokeWidth={1.75}
                          />
                          {!collapsed && <span className={`font-sans text-sm ${isActive ? 'font-medium' : ''}`}>{label}</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* user info + profile + logout */}
        {collapsed ? (
          <div className="px-2 py-4 border-t border-bg-border flex flex-col items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              title={`${user?.name} — My Profile`}
              className="hover:opacity-80 transition-opacity duration-100"
            >
              <Avatar name={user?.name} avatarBase64={user?.avatarBase64} size="sm" />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign out"
              className="text-text-muted hover:text-accent-red transition-colors duration-100"
            >
              <LogOut size={13} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 border-t border-bg-border">
            <button
              onClick={() => navigate('/profile')}
              className="w-full text-left rounded-lg px-3 py-2.5 mb-2 hover:bg-bg-elevated border border-transparent hover:border-bg-border transition-all duration-150 group"
            >
              <div className="flex items-center gap-3">
                <Avatar name={user?.name} avatarBase64={user?.avatarBase64} size="md" />
                <div className="min-w-0">
                  <p className="font-sans text-sm font-medium text-text-primary truncate group-hover:text-accent-blue transition-colors duration-150">
                    {user?.name}
                  </p>
                  {user?.role && (
                    <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider truncate">
                      {ROLE_LABEL[user.role as Role] ?? user.role}
                    </p>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-accent-red transition-colors duration-100 py-1 px-3"
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