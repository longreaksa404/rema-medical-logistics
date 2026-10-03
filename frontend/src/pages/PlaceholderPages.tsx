// PlaceholderPages.tsx
// WarehouseLayoutPage — static draw.io embed
// OperatingProtocolPage — V6 PDF embed (Chat 17/18)

import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n, type MessageKey } from '../i18n';

export function WarehouseLayoutPage() {
  const { t } = useI18n();
  usePageTitle(t('nav.warehouse'));
  return (
    <DashboardLayout title={t('warehouse.title')}>
      <div className="space-y-5">
        <div className="card px-5 py-3">
          <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">
            {t('warehouse.static')}
          </p>
          <p className="font-sans text-sm text-text-primary font-medium">
            {t('warehouse.heading')}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">
              {t('warehouse.central')}
            </p>
            <img
              src="/visuals/central-warehouse.drawio.png"
              alt={t('warehouse.centralAlt')}
              className="w-full rounded border border-bg-border"
            />
          </div>
          <div className="card p-4">
            <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">
              {t('warehouse.sub')}
            </p>
            <img
              src="/visuals/sub-warehouse.drawio.png"
              alt={t('warehouse.subAlt')}
              className="w-full rounded border border-bg-border"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function StakeholderFlowchartPage() {
  return (
    <DashboardLayout title="Stakeholder Flowchart (V5)">
      <div className="py-20 text-center">
        <p className="font-mono text-sm text-text-muted">
          Coming soon — swimlane coordination diagram (Chat 16)
        </p>
      </div>
    </DashboardLayout>
  );
}

const PROTOCOL_SECTIONS: { label: MessageKey; desc: MessageKey }[] = [
  { label: 'protocol.sec.p1',       desc: 'protocol.sec.p1.desc' },
  { label: 'protocol.sec.p2',       desc: 'protocol.sec.p2.desc' },
  { label: 'protocol.sec.radio',    desc: 'protocol.sec.radio.desc' },
  { label: 'protocol.sec.runsheet', desc: 'protocol.sec.runsheet.desc' },
  { label: 'protocol.sec.incident', desc: 'protocol.sec.incident.desc' },
  { label: 'protocol.sec.assess',   desc: 'protocol.sec.assess.desc' },
];

const RADIO_SLOTS: { time: string; desc: MessageKey }[] = [
  { time: '08:00', desc: 'protocol.radio.0800' },
  { time: '12:00', desc: 'protocol.radio.1200' },
  { time: '16:00', desc: 'protocol.radio.1600' },
  { time: '20:00', desc: 'protocol.radio.2000' },
];

const DELIVERY_TIERS: { depth: string; mode: MessageKey; color: string }[] = [
  { depth: '0–30 cm',  mode: 'mode.MOTORBIKE',       color: 'text-accent-green'  },
  { depth: '30–60 cm', mode: 'mode.BICYCLE_OR_FOOT', color: 'text-accent-yellow' },
  { depth: '60–80 cm', mode: 'protocol.smallBoat',   color: 'text-accent-orange' },
  { depth: '> 80 cm',  mode: 'mode.SUSPENDED',       color: 'text-accent-red'    },
];

const FAILURE_PROTOCOLS: { code: string; desc: MessageKey }[] = [
  { code: 'F1', desc: 'protocol.fail.f1' },
  { code: 'F2', desc: 'protocol.fail.f2' },
  { code: 'F3', desc: 'protocol.fail.f3' },
  { code: 'F4', desc: 'protocol.fail.f4' },
];

const TRIGGER_CONDITIONS: MessageKey[] = [
  'trigger.warningLevelTwo.desc',
  'trigger.rainfall.desc',
  'trigger.streetFlooding.desc',
];

export function OperatingProtocolPage() {
  const { t } = useI18n();
  usePageTitle(t('nav.protocol'));
  const [pdfError, setPdfError] = useState(false);
  const [activeView, setActiveView] = useState<'pdf' | 'guide'>('pdf');

  const PDF_PATH = '/visuals/operating-protocol.pdf';

  return (
    <DashboardLayout title={t('protocol.title')}>
      <div className="space-y-5">

        {/* ── Header info strip ── */}
        <div className="card px-5 py-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">
              {t('protocol.fieldRef')}
            </p>
            <p className="font-sans text-sm text-text-primary font-medium">
              {t('protocol.docDesc')}
            </p>
            <p className="font-mono text-[11px] text-text-muted mt-0.5">
              {t('protocol.classification')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={PDF_PATH}
              download="V6-operating-protocol.pdf"
              className="btn-primary text-xs py-1.5 px-4"
            >
              ↓ {t('protocol.download')}
            </a>
            <a
              href={PDF_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs py-1.5 px-4"
            >
              {t('protocol.openTab')}
            </a>
          </div>
        </div>

        {/* ── View toggle ── */}
        <div className="flex gap-0.5 bg-bg-elevated rounded-lg p-1 border border-bg-border w-fit">
          {(['pdf', 'guide'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`font-mono text-xs px-4 py-1.5 rounded transition-all ${
                activeView === v
                  ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {v === 'pdf' ? `⬡ ${t('protocol.view.pdf')}` : `◈ ${t('protocol.view.guide')}`}
            </button>
          ))}
        </div>

        {activeView === 'pdf' ? (
          /* ── PDF embed ── */
          <div className="card overflow-hidden">
            {!pdfError ? (
              <object
                data={PDF_PATH}
                type="application/pdf"
                className="w-full"
                style={{ height: '80vh', minHeight: 600 }}
                onError={() => setPdfError(true)}
              >
                {/* Fallback for browsers that don't render <object> */}
                <div className="py-20 text-center space-y-4 px-6">
                  <p className="text-4xl">📄</p>
                  <p className="font-display font-bold text-text-primary">
                    {t('protocol.pdfUnavailable')}
                  </p>
                  <p className="font-mono text-[11px] text-text-muted max-w-sm mx-auto">
                    {t('protocol.pdfUnavailableHint')}
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <a
                      href={PDF_PATH}
                      download="V6-operating-protocol.pdf"
                      className="btn-primary text-sm"
                    >
                      ↓ {t('protocol.download')}
                    </a>
                    <a
                      href={PDF_PATH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost text-sm"
                    >
                      {t('protocol.openNewTab')}
                    </a>
                  </div>
                </div>
              </object>
            ) : (
              <div className="py-20 text-center space-y-4 px-6">
                <p className="text-4xl">📄</p>
                <p className="font-display font-bold text-text-primary">
                  {t('protocol.pdfUnavailable')}
                </p>
                <p className="font-mono text-[11px] text-text-muted max-w-sm mx-auto">
                  {t('protocol.pdfUnavailableHint')}
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <a
                    href={PDF_PATH}
                    download="V6-operating-protocol.pdf"
                    className="btn-primary text-sm"
                  >
                    ↓ {t('protocol.download')}
                  </a>
                  <a
                    href={PDF_PATH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-sm"
                  >
                    {t('protocol.openNewTab')}
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Section guide ── */
          <div className="space-y-4">

            {/* Document contents grid */}
            <div className="card px-5 py-4">
              <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-3">
                {t('protocol.contents')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PROTOCOL_SECTIONS.map((s, i) => (
                  <div
                    key={s.label}
                    className="bg-bg-elevated rounded-lg border border-bg-border px-4 py-3"
                  >
                    <p className="font-mono text-[11px] text-text-muted mb-1">
                      {t('protocol.sectionN', { n: i + 1 })}
                    </p>
                    <p className="font-sans text-sm font-semibold text-text-primary">
                      {t(s.label)}
                    </p>
                    <p className="font-mono text-[11px] text-text-muted mt-0.5">{t(s.desc)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick reference cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Activation trigger */}
              <div className="card p-5 border-accent-orange/30 bg-accent-orange/5">
                <p className="font-mono text-[11px] text-accent-orange uppercase tracking-widest mb-2">
                  {t('protocol.activationTrigger')}
                </p>
                <div className="space-y-2">
                  {TRIGGER_CONDITIONS.map((cond, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[11px] text-accent-orange mt-0.5 flex-shrink-0">
                        {i + 1}.
                      </span>
                      <p className="font-mono text-[11px] text-text-secondary">{t(cond)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radio schedule */}
              <div className="card p-5">
                <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-2">
                  {t('protocol.radioSchedule')}
                </p>
                <div className="space-y-2">
                  {RADIO_SLOTS.map((slot) => (
                    <div key={slot.time} className="flex items-start gap-3">
                      <span className="font-mono text-xs font-bold text-text-primary flex-shrink-0 w-12">
                        {slot.time}
                      </span>
                      <p className="font-mono text-[11px] text-text-secondary">{t(slot.desc)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery tiers */}
              <div className="card p-5">
                <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-2">
                  {t('protocol.tiers')}
                </p>
                <div className="space-y-2">
                  {DELIVERY_TIERS.map((tier) => (
                    <div key={tier.depth} className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-text-muted">{tier.depth}</span>
                      <span className={`font-mono text-[11px] font-semibold ${tier.color}`}>
                        {t(tier.mode)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordination failure protocols */}
              <div className="card p-5">
                <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-2">
                  {t('protocol.failures')}
                </p>
                <div className="space-y-2">
                  {FAILURE_PROTOCOLS.map((f) => (
                    <div key={f.code} className="flex items-start gap-3">
                      <span className="font-mono text-[11px] font-bold text-accent-orange flex-shrink-0">
                        {f.code}
                      </span>
                      <p className="font-mono text-[11px] text-text-secondary">{t(f.desc)}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}