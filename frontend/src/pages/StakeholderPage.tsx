import { usePageTitle } from '../hooks/usePageTitle';
import { DashboardLayout } from '../components/DashboardLayout';
import { useI18n } from '../i18n';

export default function StakeholderPage() {
  const { t } = useI18n();
  usePageTitle(t('nav.stakeholders'));
  return (
    <DashboardLayout title={t('stakeholder.title')}>
      <div className="space-y-5">
        <div className="card px-5 py-3">
          <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">
            {t('stakeholder.subtitle')}
          </p>
          <p className="font-sans text-sm text-text-primary font-medium">
            {t('stakeholder.desc')}
          </p>
        </div>
        <div className="card p-2 overflow-auto">
          {/* diagram is drawn on white; keep it on a light panel so lines stay legible */}
          <div className="bg-white rounded-lg">
            <img
              src="/visuals/REMA-stakeholder-flowchart.drawio.png"
              alt={t('stakeholder.alt')}
              className="w-full h-auto"
              style={{ minWidth: '1200px' }}
            />
          </div>
        </div>
        <p className="font-mono text-[11px] text-text-muted md:hidden">{t('stakeholder.scrollHint')}</p>
      </div>
    </DashboardLayout>
  );
}
