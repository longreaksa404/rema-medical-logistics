import { usePageTitle } from '../hooks/usePageTitle';
import { DashboardLayout } from '../components/DashboardLayout';

export default function StakeholderPage() {
  usePageTitle('Stakeholder');
  return (
    <DashboardLayout title="Stakeholder Coordination">
      <div className="space-y-5">
        <div className="card px-5 py-3">
          <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">
            Coordination flowchart — draw.io
          </p>
          <p className="font-sans text-sm text-text-primary font-medium">
            Phase 0 → Phase 1 (Hours 0–24) → Phase 2 (Hours 24–48+) · 6 actor groups · All coordination failure protocols
          </p>
        </div>
        <div className="card p-2 overflow-auto">
          {/* diagram is drawn on white; keep it on a light panel so lines stay legible */}
          <div className="bg-white rounded-lg">
            <img
              src="/visuals/REMA-stakeholder-flowchart.drawio.png"
              alt="REMA Stakeholder Coordination Flowchart"
              className="w-full h-auto"
              style={{ minWidth: '1200px' }}
            />
          </div>
        </div>
        <p className="font-mono text-[11px] text-text-muted md:hidden">Scroll sideways to see the full diagram.</p>
      </div>
    </DashboardLayout>
  );
}
