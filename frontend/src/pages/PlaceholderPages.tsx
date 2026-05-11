// PlaceholderPages.tsx
// WarehouseLayoutPage — static draw.io embed
// OperatingProtocolPage — V6 PDF embed (Chat 17/18)

import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';

export function WarehouseLayoutPage() {
  return (
    <DashboardLayout title="Warehouse Layout (V3)">
      <div className="space-y-5">
        <div className="card px-5 py-3">
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">
            Static Diagram — draw.io
          </p>
          <p className="font-sans text-sm text-text-primary font-medium">
            Central Warehouse + Sub-Warehouse Floor Plans
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
              Central Warehouse (~200–250 sqm)
            </p>
            <img
              src="/visuals/central-warehouse.drawio.png"
              alt="Central Warehouse Floor Plan"
              className="w-full rounded border border-bg-border"
            />
          </div>
          <div className="card p-4">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
              Sub-Warehouse (~40–60 sqm)
            </p>
            <img
              src="/visuals/sub-warehouse.drawio.png"
              alt="Sub-Warehouse Floor Plan"
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

const PROTOCOL_SECTIONS = [
  { label: 'Phase 1 Activation Checklist', desc: 'Hours 0–3 / 3–8 / 8–16 / 16–24' },
  { label: 'Phase 2 Delivery Checklist',   desc: 'Adaptive last-mile operations' },
  { label: 'Radio Check-In Script',        desc: '08:00 / 12:00 / 16:00 / 20:00' },
  { label: 'Delivery Runsheet Template',   desc: '12-row household delivery log' },
  { label: 'Incident Log Template',        desc: 'Type codes: RT/VS/SS/BF/OT' },
  { label: 'Volunteer Assessment Form',    desc: 'Section C — 20-point scoring' },
];

const RADIO_SLOTS = [
  { time: '08:00', desc: 'Stock levels, overnight incidents, morning plan' },
  { time: '12:00', desc: 'Delivery progress, new critical cases, route issues' },
  { time: '16:00', desc: 'Afternoon delivery summary, resupply needs' },
  { time: '20:00', desc: 'End-of-day stock count, next-day plan' },
];

const DELIVERY_TIERS = [
  { depth: '0–30 cm',  mode: 'Motorbike',       color: 'text-accent-green'  },
  { depth: '30–60 cm', mode: 'Bicycle or foot',  color: 'text-accent-yellow' },
  { depth: '60–80 cm', mode: 'Small boat',        color: 'text-accent-orange' },
  { depth: '> 80 cm',  mode: 'SUSPENDED',         color: 'text-accent-red'    },
];

const FAILURE_PROTOCOLS = [
  { code: 'F1', desc: 'Hub Manager unreachable > 2 hours' },
  { code: 'F2', desc: 'Volunteer team overdue > 2 hours' },
  { code: 'F3', desc: 'Local authority withdraws site access' },
  { code: 'F4', desc: 'Logistics partner fails to deliver' },
];

const TRIGGER_CONDITIONS = [
  'City/provincial flood warning Level 2 or above',
  'Rainfall forecast exceeds 100mm in 24 hours',
  'Any target district reports street-level flooding',
];

export function OperatingProtocolPage() {
  const [pdfError, setPdfError] = useState(false);
  const [activeView, setActiveView] = useState<'pdf' | 'guide'>('pdf');

  const PDF_PATH = '/visuals/operating-protocol.pdf';

  return (
    <DashboardLayout title="Operating Protocol (V6)">
      <div className="space-y-5">

        {/* ── Header info strip ── */}
        <div className="card px-5 py-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">
              Field Reference Document
            </p>
            <p className="font-sans text-sm text-text-primary font-medium">
              REMA Operating Protocol — 8 pages, A4, designed to print double-sided
            </p>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">
              Classification: REMA INTERNAL — Viet Nam Red Cross Operations Staff Only
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={PDF_PATH}
              download="V6-operating-protocol.pdf"
              className="btn-primary text-xs py-1.5 px-4"
            >
              ↓ Download PDF
            </a>
            <a
              href={PDF_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs py-1.5 px-4"
            >
              Open in tab
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
              {v === 'pdf' ? '⬡ Embedded PDF' : '◈ Section Guide'}
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
                  <p className="font-sans font-bold text-text-primary">
                    PDF preview unavailable in this browser
                  </p>
                  <p className="font-mono text-[10px] text-text-muted max-w-sm mx-auto">
                    Use the download or open-in-tab buttons above to view the document.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <a
                      href={PDF_PATH}
                      download="V6-operating-protocol.pdf"
                      className="btn-primary text-sm"
                    >
                      ↓ Download PDF
                    </a>
                    <a
                      href={PDF_PATH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost text-sm"
                    >
                      Open in new tab
                    </a>
                  </div>
                </div>
              </object>
            ) : (
              <div className="py-20 text-center space-y-4 px-6">
                <p className="text-4xl">📄</p>
                <p className="font-sans font-bold text-text-primary">
                  PDF preview unavailable in this browser
                </p>
                <p className="font-mono text-[10px] text-text-muted max-w-sm mx-auto">
                  Use the download or open-in-tab buttons above to view the document.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <a
                    href={PDF_PATH}
                    download="V6-operating-protocol.pdf"
                    className="btn-primary text-sm"
                  >
                    ↓ Download PDF
                  </a>
                  <a
                    href={PDF_PATH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-sm"
                  >
                    Open in new tab
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
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
                Document Contents
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PROTOCOL_SECTIONS.map((s, i) => (
                  <div
                    key={s.label}
                    className="bg-bg-elevated rounded-lg border border-bg-border px-4 py-3"
                  >
                    <p className="font-mono text-[10px] text-text-muted mb-1">
                      Section {i + 1}
                    </p>
                    <p className="font-sans text-sm font-semibold text-text-primary">
                      {s.label}
                    </p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick reference cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Activation trigger */}
              <div className="card p-5 border-accent-orange/30 bg-accent-orange/5">
                <p className="font-mono text-[10px] text-accent-orange uppercase tracking-widest mb-2">
                  Activation Trigger (locked — 2 of 3)
                </p>
                <div className="space-y-2">
                  {TRIGGER_CONDITIONS.map((cond, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-accent-orange mt-0.5 flex-shrink-0">
                        {i + 1}.
                      </span>
                      <p className="font-mono text-[10px] text-text-secondary">{cond}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radio schedule */}
              <div className="card p-5">
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">
                  Radio Check-In Schedule (Section D.9)
                </p>
                <div className="space-y-2">
                  {RADIO_SLOTS.map((slot) => (
                    <div key={slot.time} className="flex items-start gap-3">
                      <span className="font-mono text-xs font-bold text-text-primary flex-shrink-0 w-12">
                        {slot.time}
                      </span>
                      <p className="font-mono text-[10px] text-text-secondary">{slot.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery tiers */}
              <div className="card p-5">
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">
                  Last-Mile Delivery Tiers (Section A.4)
                </p>
                <div className="space-y-2">
                  {DELIVERY_TIERS.map((t) => (
                    <div key={t.depth} className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-text-muted">{t.depth}</span>
                      <span className={`font-mono text-[10px] font-semibold ${t.color}`}>
                        {t.mode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordination failure protocols */}
              <div className="card p-5">
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">
                  Coordination Failure Protocols (Section D.10)
                </p>
                <div className="space-y-2">
                  {FAILURE_PROTOCOLS.map((f) => (
                    <div key={f.code} className="flex items-start gap-3">
                      <span className="font-mono text-[10px] font-bold text-accent-orange flex-shrink-0">
                        {f.code}
                      </span>
                      <p className="font-mono text-[10px] text-text-secondary">{f.desc}</p>
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