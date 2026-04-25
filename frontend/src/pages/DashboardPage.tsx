import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PhaseBanner } from '../components/PhaseBanner';
import { dashboardApi } from '../api/dashboard';
import type { DashboardSummary } from '../api/dashboard';

// ─── DISTRICT CARD ────────────────────────────────────────────────────────────

function DistrictCard({ d }: { d: DashboardSummary['districts'][number] }) {
  const statusColors = {
    ACTIVE: 'text-accent-green border-accent-green/30 bg-accent-green/10',
    INACTIVE: 'text-text-muted border-bg-border bg-transparent',
    BACKUP_ACTIVATED: 'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/10',
  };
  const statusColor = d.subWarehouseStatus
    ? statusColors[d.subWarehouseStatus]
    : statusColors.INACTIVE;

  // Stock bar color
  const stockColor =
    d.anyScarce ? 'bg-accent-red' :
    d.stockPct > 60 ? 'bg-accent-green' :
    d.stockPct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange';

  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-text-muted/30 transition-colors duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-sans font-bold text-text-primary">{d.name}</h3>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            {d.population.toLocaleString()} households
          </p>
        </div>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${statusColor}`}>
          {d.subWarehouseStatus ?? 'NO WAREHOUSE'}
        </span>
      </div>

      {/* Stock level */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Stock Level
          </span>
          <span className={`font-mono text-xs ${d.anyScarce ? 'text-accent-red' : 'text-text-secondary'}`}>
            {d.stockPct}%{d.anyScarce ? ' ⚠ SCARCE' : ''}
          </span>
        </div>
        <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stockColor}`}
            style={{ width: `${Math.max(d.stockPct, 2)}%` }}
          />
        </div>
        {d.stock && (
          <div className="mt-2 grid grid-cols-3 gap-1">
            {(['emk1', 'emk2', 'emk3'] as const).map((type) => {
              const remaining = d.stock![`${type}Remaining`];
              const total = d.stock![`${type}Total`];
              return (
                <div key={type} className="bg-bg-elevated rounded px-2 py-1.5">
                  <p className="font-mono text-[9px] text-text-muted uppercase">{type.toUpperCase()}</p>
                  <p className="font-mono text-xs text-text-primary">
                    {remaining.toLocaleString()}
                    <span className="text-text-muted">/{total.toLocaleString()}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-bg-border">
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-text-primary">
            {d.householdsAssessed}
          </p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Assessed</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-accent-green">
            {d.deliveredCount}
          </p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Delivered</p>
        </div>
        <div className="text-center">
          <p className={`font-mono text-lg font-semibold ${d.openIncidents > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
            {d.openIncidents}
          </p>
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Incidents</p>
        </div>
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-text-primary' }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="card px-4 py-3">
      <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

// ─── MAIN DASHBOARD PAGE ──────────────────────────────────────────────────────

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const summary = await dashboardApi.getSummary();
      setData(summary);
      setLastUpdated(new Date());
      setError('');
    } catch {
      setError('Failed to load dashboard data. Retrying...');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-text-muted text-sm animate-pulse">
          loading operations data...
        </p>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Operations Dashboard"
      onRefresh={load}
      lastUpdated={lastUpdated}
    >
      {error && (
        <div className="mb-4 bg-accent-red/10 border border-accent-red/30 rounded px-4 py-2">
          <p className="font-mono text-xs text-accent-red">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6 animate-fade-in">
          {/* Phase banner */}
          <PhaseBanner
            phase={data.phase}
            activated={data.activated}
            activatedAt={data.activatedAt}
            triggerConditions={data.triggerConditions}
          />

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Active Runs"
              value={data.activeDeliveryRuns}
              color={data.activeDeliveryRuns > 0 ? 'text-accent-green' : 'text-text-muted'}
            />
            <StatCard
              label="Pending Delivery"
              value={data.households.pendingDelivery}
              color="text-accent-blue"
            />
            <StatCard
              label="Delivered"
              value={data.households.delivered}
              color="text-accent-green"
            />
            <StatCard
              label="Radio Check-ins Today"
              value={data.todayRadioCheckins}
            />
          </div>

          {/* Priority bands */}
          <div>
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
              Household Priority Queue
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { key: 'critical', label: 'Critical', color: 'text-accent-red', border: 'border-accent-red/20' },
                  { key: 'high', label: 'High', color: 'text-accent-orange', border: 'border-accent-orange/20' },
                  { key: 'medium', label: 'Medium', color: 'text-accent-yellow', border: 'border-accent-yellow/20' },
                  { key: 'standard', label: 'Standard', color: 'text-accent-green', border: 'border-accent-green/20' },
                ] as const
              ).map(({ key, label, color, border }) => (
                <div key={key} className={`card border ${border} px-4 py-3`}>
                  <p className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${color}`}>
                    {label}
                  </p>
                  <p className={`font-mono text-2xl font-semibold ${color}`}>
                    {data.households[key]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* District cards */}
          <div>
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
              Districts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.districts.map((d) => (
                <DistrictCard key={d.districtId} d={d} />
              ))}
            </div>
          </div>

          {/* Open incidents */}
          {data.openIncidents.length > 0 && (
            <div>
              <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                Open Incidents
              </h2>
              <div className="card divide-y divide-bg-border">
                {data.openIncidents.map((inc) => (
                  <div key={inc.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`font-mono text-[10px] ${
                            inc.status === 'ESCALATED' ? 'text-accent-red' : 'text-accent-orange'
                          }`}
                        >
                          {inc.status}
                        </span>
                        <span className="font-mono text-[10px] text-text-muted">
                          {inc.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-sans text-sm text-text-secondary truncate">
                        {inc.description}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-text-muted flex-shrink-0">
                      {new Date(inc.createdAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}