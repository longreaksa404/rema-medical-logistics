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
  },
  {
    label: 'Routing',
    to: '/routing',
    icon: '⟁',
  },
  {
    label: 'Prioritize',
    to: '/prioritize',
    icon: '⊞',
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

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || isRole(...(item.roles as Parameters<typeof isRole>))
  );

  return (
    <aside className="w-56 flex-shrink-0 bg-bg-secondary border-r border-bg-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-bg-border">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
          <span className="font-sans font-800 text-text-primary text-lg tracking-tight">
            REMA
          </span>
        </div>
        <p className="font-mono text-[10px] text-text-muted leading-tight">
          Emergency Medical Access
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors duration-100',
                isActive
                  ? 'bg-bg-elevated text-text-primary border border-bg-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50',
              ].join(' ')
            }
          >
            <span className="font-mono text-base w-5 flex-shrink-0 text-center">
              {item.icon}
            </span>
            <span className="font-sans text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-5 py-4 border-t border-bg-border">
        <div className="mb-3">
          <p className="font-sans text-sm text-text-primary truncate">{user?.name}</p>
          <p className="font-mono text-[10px] text-text-muted truncate">{user?.email}</p>
          <span className="inline-block mt-1 font-mono text-[10px] text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">
            {user?.role.replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left font-mono text-xs text-text-muted hover:text-accent-red transition-colors duration-100 py-1"
        >
          → sign out
        </button>
      </div>
    </aside>
  );
}