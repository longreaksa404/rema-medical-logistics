import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LiveAlerts } from './LiveAlerts';
import { OfflineSync } from './OfflineSync';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineSync />
        <Outlet />
      </div>
      <LiveAlerts />
    </div>
  );
}