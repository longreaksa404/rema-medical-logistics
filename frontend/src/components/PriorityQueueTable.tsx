import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { householdsApi } from '../api/households';
import type { Household } from '../api/households';
import type { DashboardSummary } from '../api/dashboard';

interface PriorityQueueTableProps {
  districts: DashboardSummary['districts'];
}

const BAND_CONFIG = {
  CRITICAL: { label: 'CRITICAL', color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/20', dot: 'bg-accent-red' },
  HIGH:     { label: 'HIGH',     color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/20', dot: 'bg-accent-orange' },
  MEDIUM:   { label: 'MEDIUM',   color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20', dot: 'bg-accent-yellow' },
  STANDARD: { label: 'STANDARD', color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/20',  dot: 'bg-accent-green'  },
} as const;

const EMK_COLORS = {
  EMK1: 'text-accent-blue',
  EMK2: 'text-accent-green',
  EMK3: 'text-accent-red',
} as const;

function SkeletonRow() {
  return (
    <tr className="border-b border-bg-border">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-bg-elevated rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export const PriorityQueueTable = memo(function PriorityQueueTable({ districts }: PriorityQueueTableProps) {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    districts[0]?.districtId ?? ''
  );
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [bandFilter, setBandFilter] = useState<string>('ALL');

  const selectedDistrict = useMemo(
    () => districts.find(d => d.districtId === selectedDistrictId),
    [districts, selectedDistrictId]
  );

  const fetchQueue = useCallback(async () => {
    if (!selectedDistrictId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await householdsApi.getPriorityQueue(selectedDistrictId);
      setHouseholds(data);
    } catch {
      setError('Failed to load priority queue. Is there active flood data?');
      setHouseholds([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDistrictId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // useMemo: filtered list only recomputes when households or bandFilter changes
  const filtered = useMemo(
    () => bandFilter === 'ALL' ? households : households.filter(h => h.priorityBand === bandFilter),
    [households, bandFilter]
  );

  // useMemo: band counts only recompute when households changes
  const bandCounts = useMemo(() => ({
    CRITICAL: households.filter(h => h.priorityBand === 'CRITICAL').length,
    HIGH:     households.filter(h => h.priorityBand === 'HIGH').length,
    MEDIUM:   households.filter(h => h.priorityBand === 'MEDIUM').length,
    STANDARD: households.filter(h => h.priorityBand === 'STANDARD').length,
  }), [households]);

  return (
    <div className="card">
      {/* Header */}
      <div className="px-5 py-4 border-b border-bg-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-sans font-bold uppercase text-text-primary">Priority Queue</h2>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">
              Undelivered households — sorted by Section C tiebreaker rules
            </p>
          </div>

          {/* District selector */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              District
            </span>
            <div className="flex gap-1">
              {districts.map((d) => (
                <button
                  key={d.districtId}
                  onClick={() => setSelectedDistrictId(d.districtId)}
                  className={`font-mono text-xs px-2.5 py-1 rounded border transition-all duration-100 ${
                    selectedDistrictId === d.districtId
                      ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                      : 'bg-transparent border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted'
                  }`}
                >
                  {d.name.replace('District ', 'D')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Band filter tabs */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setBandFilter('ALL')}
            className={`font-mono text-[10px] px-2.5 py-1 rounded border transition-all ${
              bandFilter === 'ALL'
                ? 'bg-bg-elevated border-bg-border text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            ALL ({households.length})
          </button>
          {(Object.keys(BAND_CONFIG) as Array<keyof typeof BAND_CONFIG>).map((band) => {
            const cfg = BAND_CONFIG[band];
            return (
              <button
                key={band}
                onClick={() => setBandFilter(band)}
                className={`font-mono text-[10px] px-2.5 py-1 rounded border transition-all ${
                  bandFilter === band
                    ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                    : `border-transparent ${cfg.color} opacity-60 hover:opacity-100`
                }`}
              >
                {cfg.label} ({bandCounts[band]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-bg-border">
              {['Band', 'Address', 'Score', 'Cat.1', 'EMK', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left font-mono text-[10px] text-text-muted uppercase tracking-widest"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    {error
                      ? <p className="font-mono text-xs text-accent-red">{error}</p>
                      : <p className="font-mono text-xs text-text-muted">
                          {households.length === 0
                            ? `No households assessed in ${selectedDistrict?.name ?? 'this district'} yet.`
                            : 'No households match this filter.'}
                        </p>
                    }
                  </td>
                </tr>
              )
              : filtered.map((h) => {
                  const cfg = BAND_CONFIG[h.priorityBand];
                  return (
                    <tr
                      key={h.id}
                      className="border-b border-bg-border hover:bg-bg-elevated/50 transition-colors duration-75"
                    >
                      {/* Band */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <p className="font-sans text-xs text-text-primary truncate">{h.address}</p>
                      </td>

                      {/* Total score */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                h.totalScore >= 15 ? 'bg-accent-red' :
                                h.totalScore >= 10 ? 'bg-accent-orange' :
                                h.totalScore >= 5  ? 'bg-accent-yellow' : 'bg-accent-green'
                              }`}
                              style={{ width: `${(h.totalScore / 20) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-text-secondary">
                            {h.totalScore}/20
                          </span>
                        </div>
                      </td>

                      {/* Cat1 — medical urgency */}
                      <td className="px-4 py-2.5">
                        <span className={`font-mono text-xs ${
                          h.medicalUrgencyScore >= 8 ? 'text-accent-red font-semibold' :
                          h.medicalUrgencyScore >= 5 ? 'text-accent-orange' :
                          'text-text-muted'
                        }`}>
                          {h.medicalUrgencyScore}/8
                        </span>
                      </td>

                      {/* EMK */}
                      <td className="px-4 py-2.5">
                        <span className={`font-mono text-[10px] font-semibold ${EMK_COLORS[h.recommendedEmk]}`}>
                          {h.recommendedEmk}
                        </span>
                      </td>

                      {/* Delivered */}
                      <td className="px-4 py-2.5">
                        {h.delivered ? (
                          <span className="font-mono text-[10px] text-accent-green">✓ Delivered</span>
                        ) : (
                          <span className="font-mono text-[10px] text-text-muted">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 border-t border-bg-border flex items-center justify-between">
          <span className="font-mono text-[10px] text-text-muted">
            Showing {filtered.length} of {households.length} undelivered households
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            Sorted: band → score → cat.1 → submitted first
          </span>
        </div>
      )}
    </div>
  );
});