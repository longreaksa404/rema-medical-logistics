import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { LiveAlerts } from './LiveAlerts';
import { OfflineSync } from './OfflineSync';
import { useI18n } from '../i18n';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { t } = useI18n();

  return (
    // Fixed-height shell: the content column scrolls on its own, so page
    // headers stay pinned and the sidebar never drifts with the document.
    <div className="flex h-[100dvh] overflow-hidden bg-bg-primary">
      <Sidebar mobileOpen={navOpen} onMobileClose={() => setNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* mobile top bar — sidebar becomes a drawer below md */}
        <div className="md:hidden flex items-center gap-3 px-4 h-12 border-b border-bg-border bg-bg-secondary flex-shrink-0">
          <button
            onClick={() => setNavOpen(true)}
            aria-label={t('sidebar.openNav')}
            className="w-9 h-9 -ml-2 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          >
            <Menu size={18} />
          </button>
          <img src="/rema_logo_new.svg" alt="" className="h-5 w-5" />
          <span className="font-display font-extrabold text-text-primary tracking-tight">REMA</span>
        </div>
        <OfflineSync />
        <Outlet />
      </div>
      <LiveAlerts />
    </div>
  );
}
