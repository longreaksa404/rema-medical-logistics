// HubPage.tsx — V7 Hub Manager Portal
// Fixes applied:
//   1. Central warehouse stock row (GET /api/stock/status)
//   2. Reallocation form gated to EMERGENCY_COORDINATOR (POST /api/stock/reallocate)
//   3. Volunteer role filter: TEAM_LEADER only in delivery run lead dropdown
//   4. Civil defense escalation note on VOLUNTEER_SAFETY incidents
//   5. Radio tab subtitle clarified

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { hubApi } from '../api/hub';
import { queryKeys } from '../api/queryKeys';
import type {
  StockLevel,CentralStockLevel, StockMovement, DistrictRoster,
  Volunteer, DeliveryRun, Incident, RadioCheckin,
} from '../api/hub';
import type { DistrictCard } from '../api/dashboard.types';
import { usePageTitle } from '../hooks/usePageTitle';

type TabId = 'stock' | 'volunteers' | 'deliveries' | 'incidents' | 'radio';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString(); }
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-elevated rounded ${className}`} />;
}

function HubSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex gap-0.5 w-fit">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-24" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-sans font-bold text-text-primary">{children}</h3>
      {sub && <p className="font-mono text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
function Empty({ message }: { message: string }) {
  return <div className="py-10 text-center"><p className="font-mono text-xs text-text-muted">{message}</p></div>;
}
function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${color}`}>{label}</span>;
}
function ErrorBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-red">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[10px] text-accent-red flex-shrink-0">✕</button>
    </div>
  );
}
function SuccessBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-green">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[10px] text-accent-green flex-shrink-0">✕</button>
    </div>
  );
}

// ─── TAB: STOCK ───────────────────────────────────────────────────────────────

function StockTab({ districtId, subWarehouseId, allSubWarehouses }: { 
  districtId: string; 
  subWarehouseId: string | null;
  allSubWarehouses?: unknown;  // accepted but unused — central stock comes from API now
}) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const [dispEmkType, setDispEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [dispQty, setDispQty] = useState('');
  const [dispReason, setDispReason] = useState('');
  const [adjEmkType, setAdjEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
 
  // ── Three parallel queries ────────────────────────────────────────────────
  const { data: centralStock, isLoading: centralLoading } = useQuery({
    queryKey: queryKeys.hub.centralStock(),
    queryFn: () => hubApi.getCentralStock(),
    staleTime: 15_000,
  });
 
  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: queryKeys.hub.stock(districtId),
    queryFn: () => hubApi.getDistrictStock(districtId),
    enabled: !!districtId,
  });
 
  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: queryKeys.hub.movements(districtId),
    queryFn: () => hubApi.getMovements(districtId),
    enabled: !!districtId,
    select: (data: StockMovement[]) => data.slice(0, 50),
  });
 
  const isLoading = centralLoading || stockLoading || movementsLoading;
 
  // Invalidate central + sub-warehouse + dashboard on any write
  const invalidateStock = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.centralStock() });
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.stock(districtId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.movements(districtId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  }, [queryClient, districtId]);
 
  const dispatchMutation = useMutation({
    mutationFn: hubApi.dispatch,
    onSuccess: (_, vars) => {
      setSuccess(`Dispatched ${vars.quantity}× ${vars.emkType} from central warehouse to sub-warehouse.`);
      setDispQty(''); setDispReason('');
      invalidateStock();
    },
  });
 
  const adjustMutation = useMutation({
    mutationFn: hubApi.adjust,
    onSuccess: (_, vars) => {
      setSuccess(`Adjustment recorded: ${Number(vars.quantity) > 0 ? '+' : ''}${vars.quantity}× ${vars.emkType}.`);
      setAdjQty(''); setAdjReason('');
      invalidateStock();
    },
  });
 
  const EMK_TYPES: Array<'EMK1' | 'EMK2' | 'EMK3'> = ['EMK1', 'EMK2', 'EMK3'];
  const EMK_COLORS = { EMK1: 'text-accent-blue', EMK2: 'text-accent-green', EMK3: 'text-accent-yellow' };
  const MOVE_COLORS: Record<string, string> = {
    DISPATCH: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    MOH_TRANSFER: 'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/5',
    DELIVERY: 'text-text-muted border-bg-border bg-bg-elevated',
    REALLOCATION: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    ADJUSTMENT: 'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
  };
 
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
 
  const dispatchError = (dispatchMutation.error as { response?: { data?: { error?: string } } } | null)
    ?.response?.data?.error ?? '';
  const adjustError = (adjustMutation.error as { response?: { data?: { error?: string } } } | null)
    ?.response?.data?.error ?? '';
  const mutationError = dispatchError || adjustError;
 
  // Central availability for the currently selected EMK type
  const centralAvailable = centralStock
    ? (centralStock[`${dispEmkType.toLowerCase()}Remaining` as keyof CentralStockLevel] as number)
    : null;
 
  return (
    <div className="space-y-6">
      {mutationError && (
        <ErrorBox
          msg={mutationError}
          onDismiss={() => { dispatchMutation.reset(); adjustMutation.reset(); }}
        />
      )}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}
 
      {/* ── CENTRAL WAREHOUSE ─────────────────────────────────────────────── */}
      <div className="card p-5 border-accent-blue/20 bg-bg-elevated/40">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-sans font-bold text-text-primary">Central Warehouse</h3>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">
              Master stock — each dispatch reduces this balance
            </p>
          </div>
          <span className="font-mono text-[10px] text-text-muted bg-bg-elevated px-2 py-1 rounded border border-bg-border">
            30% reserve
          </span>
        </div>
 
        {centralStock ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMK_TYPES.map((type) => {
              const key = type.toLowerCase() as 'emk1' | 'emk2' | 'emk3';
              const rem    = centralStock[`${key}Remaining` as keyof CentralStockLevel] as number;
              const total  = centralStock[`${key}Total`     as keyof CentralStockLevel] as number;
              const pct    = centralStock[`${key}Pct`       as keyof CentralStockLevel] as number;
              const scarce = centralStock[`${key}Scarce`    as keyof CentralStockLevel] as boolean;
              return (
                <div key={type} className={`bg-bg-elevated rounded-lg border p-4 ${scarce ? 'border-accent-red/40' : 'border-bg-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-sm font-bold ${EMK_COLORS[type]}`}>{type}</span>
                    {scarce && (
                      <span className="font-mono text-[9px] text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded border border-accent-red/30 animate-pulse">
                        ⚠ SCARCE
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-2xl font-bold text-text-primary">{fmt(rem)}</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">of {fmt(total)} · {pct}%</p>
                  <div className="mt-2 h-1.5 bg-bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        scarce ? 'bg-accent-red' : pct > 60 ? 'bg-accent-blue' : pct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange'
                      }`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  {type === 'EMK3' && total === 0 && (
                    <p className="font-mono text-[9px] text-text-muted mt-1.5">
                      MoH cold storage — transferred at activation
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-accent-orange/10 border border-accent-orange/30 rounded px-3 py-2">
            <p className="font-mono text-xs text-accent-orange">
              Central warehouse not found. Run <code>npm run seed</code> on the backend.
            </p>
          </div>
        )}
      </div>
 
      {/* ── SUB-WAREHOUSE STOCK ───────────────────────────────────────────── */}
      <div>
        <SectionTitle sub="Current remaining / total dispatched to this sub-warehouse">
          Sub-Warehouse Stock Levels
        </SectionTitle>
        {stock ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMK_TYPES.map((type) => {
              const key    = type.toLowerCase() as 'emk1' | 'emk2' | 'emk3';
              const rem    = stock[`${key}Remaining` as keyof StockLevel] as number;
              const total  = stock[`${key}Total`     as keyof StockLevel] as number;
              const pct    = stock[`${key}Pct`       as keyof StockLevel] as number;
              const scarce = stock[`${key}Scarce`    as keyof StockLevel] as boolean;
              return (
                <div key={type} className={`card p-4 ${scarce ? 'border-accent-red/40' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-sm font-bold ${EMK_COLORS[type]}`}>{type}</span>
                    {scarce && (
                      <span className="font-mono text-[9px] text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded border border-accent-red/30 animate-pulse">
                        ⚠ SCARCE
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-2xl font-bold text-text-primary">{fmt(rem)}</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">of {fmt(total)} · {pct}%</p>
                  <div className="mt-2 h-1.5 bg-bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        scarce ? 'bg-accent-red' : pct > 60 ? 'bg-accent-green' : pct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange'
                      }`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  {type === 'EMK3' && total === 0 && (
                    <p className="font-mono text-[9px] text-text-muted mt-1.5">
                      MoH cold storage — transferred at activation
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty message="No stock record found for this district." />
        )}
      </div>
 
      {/* ── DISPATCH + ADJUST FORMS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle sub="Moves stock from central warehouse → this sub-warehouse">
            Record Dispatch
          </SectionTitle>
 
          {/* Live central availability hint for selected EMK type */}
          {centralAvailable !== null && (
            <div className="mb-3 bg-bg-elevated rounded px-3 py-2 border border-bg-border">
              <p className="font-mono text-[10px] text-text-muted">
                Central available —{' '}
                <span className={EMK_COLORS[dispEmkType]}>
                  {dispEmkType}: {fmt(centralAvailable)} units
                </span>
              </p>
            </div>
          )}
 
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">EMK Type</label>
                <select
                  value={dispEmkType}
                  onChange={e => setDispEmkType(e.target.value as 'EMK1' | 'EMK2' | 'EMK3')}
                  className="input"
                >
                  {EMK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input
                  type="number" min="1" className="input"
                  placeholder="e.g. 200"
                  value={dispQty}
                  onChange={e => setDispQty(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input
                type="text" className="input"
                placeholder="Phase 1 resupply..."
                value={dispReason}
                onChange={e => setDispReason(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                if (!subWarehouseId || !dispQty) return;
                dispatchMutation.mutate({
                  subWarehouseId,
                  emkType: dispEmkType,
                  quantity: Number(dispQty),
                  reason: dispReason || undefined,
                });
              }}
              disabled={dispatchMutation.isPending || !dispQty || !subWarehouseId}
              className="btn-primary w-full"
            >
              {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch to Sub-Warehouse'}
            </button>
            {!subWarehouseId && (
              <p className="font-mono text-[10px] text-accent-orange">
                No sub-warehouse assigned to this district.
              </p>
            )}
          </div>
        </div>
 
        <div className="card p-5">
          <SectionTitle sub="Manual correction with mandatory reason (Section B.7)">
            Manual Adjustment
          </SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">EMK Type</label>
                <select
                  value={adjEmkType}
                  onChange={e => setAdjEmkType(e.target.value as 'EMK1' | 'EMK2' | 'EMK3')}
                  className="input"
                >
                  {EMK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantity (+/−)</label>
                <input
                  type="number" className="input"
                  placeholder="-5 or +10"
                  value={adjQty}
                  onChange={e => setAdjQty(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Reason (required)</label>
              <input
                type="text" className="input"
                placeholder="e.g. Water-damaged kits removed"
                value={adjReason}
                onChange={e => setAdjReason(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                if (!subWarehouseId || !adjQty || !adjReason.trim()) return;
                adjustMutation.mutate({
                  subWarehouseId,
                  emkType: adjEmkType,
                  quantity: Number(adjQty),
                  reason: adjReason,
                });
              }}
              disabled={adjustMutation.isPending || !adjQty || !adjReason.trim() || !subWarehouseId}
              className="btn-ghost w-full"
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Record Adjustment'}
            </button>
          </div>
        </div>
      </div>
 
      {/* ── AUDIT LOG ─────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle sub="Last 50 stock movements for this district">Audit Log</SectionTitle>
        <div className="card divide-y divide-bg-border">
          {movements.length === 0 ? (
            <Empty message="No movements yet." />
          ) : (
            movements.map((m: StockMovement) => (
              <div key={m.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${MOVE_COLORS[m.movementType] ?? 'text-text-muted border-bg-border'}`}>
                      {m.movementType}
                    </span>
                    <span className={`font-mono text-xs font-semibold ${EMK_COLORS[m.emkType]}`}>
                      {m.emkType}
                    </span>
                    <span className={`font-mono text-sm font-bold ${m.quantity > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {m.quantity > 0 ? '+' : ''}{fmt(m.quantity)}
                    </span>
                  </div>
                  {m.reason && (
                    <p className="font-mono text-[10px] text-text-muted truncate">{m.reason}</p>
                  )}
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">
                    by {m.performedBy?.name ?? '—'}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-text-muted flex-shrink-0">
                  {timeAgo(m.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: VOLUNTEERS ──────────────────────────────────────────────────────────

function VolunteersTab({ districtId, subWarehouseId }: { districtId: string; subWarehouseId: string | null }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState<'VOLUNTEER' | 'TEAM_LEADER'>('VOLUNTEER');
  const [assignVolId, setAssignVolId] = useState('');
  const [assignZone, setAssignZone] = useState('Zone A');
  const [assignTeam, setAssignTeam] = useState(1);

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: queryKeys.hub.volunteers(districtId),
    queryFn: () => hubApi.getRoster(districtId),
    enabled: !!districtId,
  });
  const { data: alertData } = useQuery({
    queryKey: queryKeys.alert.status(),
    queryFn: () => api.get('/api/alert/status').then(r => r.data),
  });
  const alertId = alertData?.id ?? '';

  const invalidateRoster = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.volunteers(districtId) });
  }, [queryClient, districtId]);

  const addMutation = useMutation({
    mutationFn: (vars: { districtId: string; name: string; phone: string; role: 'VOLUNTEER' | 'TEAM_LEADER' }) =>
      hubApi.createVolunteer(vars),
    onSuccess: (_, vars) => {
      setSuccess(`${vars.name} added to roster.`);
      setAddName(''); setAddPhone('');
      invalidateRoster();
    },
  });

  const assignMutation = useMutation({
    mutationFn: hubApi.assignVolunteer,
    onSuccess: () => {
      setSuccess('Volunteer assigned and marked DEPLOYED.');
      setAssignVolId('');
      invalidateRoster();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'INACTIVE' }) =>
      hubApi.updateVolunteer(id, { status }),
    onSuccess: (_, vars) => {
      setSuccess(`Volunteer → ${vars.status}`);
      invalidateRoster();
    },
  });

  const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    DEPLOYED: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    INACTIVE: 'text-text-muted border-bg-border bg-bg-elevated',
  };

  const availableVols = roster?.volunteers.filter((v: Volunteer) => v.status === 'AVAILABLE') ?? [];

  const addError = (addMutation.error as any)?.response?.data?.error ?? '';
  const assignError = (assignMutation.error as any)?.response?.data?.error ?? '';
  const statusError = (statusMutation.error as any)?.response?.data?.error ?? '';
  const mutationError = addError || assignError || statusError;

  if (rosterLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mutationError && <ErrorBox msg={mutationError} onDismiss={() => { addMutation.reset(); assignMutation.reset(); statusMutation.reset(); }} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      {roster && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Total</p>
            <p className={`font-mono text-2xl font-bold ${roster.belowMinimum ? 'text-accent-red' : 'text-text-primary'}`}>{roster.total}</p>
            <p className="font-mono text-[10px] text-text-muted">min. 12</p>
          </div>
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Team Leaders</p>
            <p className="font-mono text-2xl font-bold text-accent-blue">{roster.teamLeaders}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Available</p>
            <p className="font-mono text-2xl font-bold text-accent-green">{availableVols.length}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Deployed</p>
            <p className="font-mono text-2xl font-bold text-accent-orange">
              {roster.volunteers.filter((v: Volunteer) => v.status === 'DEPLOYED').length}
            </p>
          </div>
        </div>
      )}

      {roster?.belowMinimum && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded px-4 py-2">
          <p className="font-mono text-xs text-accent-red">{roster.minimumWarning}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle sub="Add to district roster">Add Volunteer</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" placeholder="Nguyen Van A"
                value={addName} onChange={e => setAddName(e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" placeholder="+84901234567"
                value={addPhone} onChange={e => setAddPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Role</label>
              <div className="flex gap-2">
                {(['VOLUNTEER', 'TEAM_LEADER'] as const).map(r => (
                  <button key={r} onClick={() => setAddRole(r)}
                    className={`flex-1 font-mono text-xs py-2 rounded border transition-all ${
                      addRole === r
                        ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                        : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                    }`}>
                    {r === 'TEAM_LEADER' ? 'Team Leader' : 'Volunteer'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => addName.trim() && addPhone.trim() && addMutation.mutate({
                districtId, name: addName.trim(), phone: addPhone.trim(), role: addRole,
              })}
              disabled={addMutation.isPending || !addName.trim() || !addPhone.trim()}
              className="btn-primary w-full">
              {addMutation.isPending ? 'Adding...' : 'Add to Roster'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle sub="Assign to zone + team (Section D.6 — cross-ward)">Assign to Zone</SectionTitle>
          {!alertId ? (
            <div className="bg-accent-orange/10 border border-accent-orange/30 rounded px-3 py-3">
              <p className="font-mono text-xs text-accent-orange">REMA must be activated before assigning volunteers to zones.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">Volunteer</label>
                <select value={assignVolId} onChange={e => setAssignVolId(e.target.value)} className="input">
                  <option value="">Select available volunteer...</option>
                  {availableVols.map((v: Volunteer) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.role === 'TEAM_LEADER' ? 'TL' : 'V'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Zone</label>
                  <select value={assignZone} onChange={e => setAssignZone(e.target.value)} className="input">
                    {['Zone A', 'Zone B', 'Zone C'].map(z => <option key={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Team #</label>
                  <select value={assignTeam} onChange={e => setAssignTeam(Number(e.target.value))} className="input">
                    {[1, 2, 3].map(n => <option key={n} value={n}>Team {n}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => assignVolId && subWarehouseId && assignMutation.mutate({
                  volunteerId: assignVolId, subWarehouseId, alertId, zone: assignZone, teamNumber: assignTeam,
                })}
                disabled={assignMutation.isPending || !assignVolId || !subWarehouseId}
                className="btn-primary w-full">
                {assignMutation.isPending ? 'Assigning...' : 'Assign & Deploy'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionTitle>Full Roster</SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-border">
                {['Name', 'Phone', 'Role', 'Status', 'Last Assignment', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] text-text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!roster || roster.volunteers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center">
                  <p className="font-mono text-xs text-text-muted">No volunteers in roster.</p>
                </td></tr>
              ) : roster.volunteers.map((v: Volunteer) => (
                <tr key={v.id} className="border-b border-bg-border hover:bg-bg-elevated/40 transition-colors">
                  <td className="px-4 py-3 font-sans text-sm text-text-primary">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{v.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[10px] ${v.role === 'TEAM_LEADER' ? 'text-accent-blue' : 'text-text-muted'}`}>
                      {v.role === 'TEAM_LEADER' ? 'TL' : 'V'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Badge label={v.status} color={STATUS_COLORS[v.status]} /></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-text-muted">
                    {v.assignments?.[0] ? `${v.assignments[0].zone} · T${v.assignments[0].teamNumber}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {v.status !== 'DEPLOYED' && (
                      <button
                        onClick={() => statusMutation.mutate({
                          id: v.id,
                          status: v.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE',
                        })}
                        className="font-mono text-[10px] text-text-muted hover:text-text-primary transition-colors">
                        {v.status === 'AVAILABLE' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DELIVERIES ──────────────────────────────────────────────────────────

function DeliveriesTab({ districtId, subWarehouseId }: { districtId: string; subWarehouseId: string | null }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const [zone, setZone] = useState('Zone A');
  const [team, setTeam] = useState(1);
  const [leadId, setLeadId] = useState('');
  const [abortId, setAbortId] = useState('');
  const [abortReason, setAbortReason] = useState('');

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: queryKeys.hub.deliveries(districtId),
    queryFn: () => hubApi.getDeliveryRuns(districtId),
    enabled: !!districtId,
    refetchInterval: 30_000,
  });
  const { data: roster } = useQuery({
    queryKey: queryKeys.hub.volunteers(districtId),
    queryFn: () => hubApi.getRoster(districtId),
    enabled: !!districtId,
  });

  // FIX: Only TEAM_LEADER role volunteers can lead a delivery run
  const teamLeads = useMemo(
    () => (roster?.volunteers ?? []).filter(
      (v: Volunteer) => v.role === 'TEAM_LEADER' &&
        (v.status === 'AVAILABLE' || v.status === 'DEPLOYED')
    ),
    [roster]
  );

  const invalidateDeliveries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.deliveries(districtId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  }, [queryClient, districtId]);

  const startMutation = useMutation({
    mutationFn: hubApi.startRun,
    onSuccess: (_, vars) => {
      setSuccess(`Team ${vars.teamNumber} departed for ${vars.zone}.`);
      setLeadId('');
      invalidateDeliveries();
    },
  });
  const completeMutation = useMutation({
    mutationFn: hubApi.completeRun,
    onSuccess: () => { setSuccess('Run marked complete.'); invalidateDeliveries(); },
  });
  const abortMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => hubApi.abortRun(id, reason),
    onSuccess: () => {
      setSuccess('Run aborted. Volunteers standing down.');
      setAbortId(''); setAbortReason('');
      invalidateDeliveries();
    },
  });

  const activeRuns = useMemo(() => runs.filter((r: DeliveryRun) => r.status === 'IN_PROGRESS'), [runs]);
  const pastRuns = useMemo(() => runs.filter((r: DeliveryRun) => r.status !== 'IN_PROGRESS'), [runs]);

  const STATUS_COLORS: Record<string, string> = {
    IN_PROGRESS: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    COMPLETE: 'text-text-muted border-bg-border bg-bg-elevated',
    ABORTED: 'text-accent-red border-accent-red/30 bg-accent-red/5',
  };

  const mutationError =
    (startMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (completeMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (abortMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  if (runsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mutationError && <ErrorBox msg={mutationError} onDismiss={() => { startMutation.reset(); completeMutation.reset(); abortMutation.reset(); }} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle sub="Fixed departure times: 07:00 / 11:00 / 15:00 (Section B.4)">Start Delivery Run</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Zone</label>
                <select value={zone} onChange={e => setZone(e.target.value)} className="input">
                  {['Zone A', 'Zone B', 'Zone C'].map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Team #</label>
                <select value={team} onChange={e => setTeam(Number(e.target.value))} className="input">
                  {[1, 2, 3].map(n => <option key={n} value={n}>Team {n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Team Lead</label>
              <select value={leadId} onChange={e => setLeadId(e.target.value)} className="input">
                <option value="">Select team lead...</option>
                {teamLeads.map((v: Volunteer) => (
                  // FIX: shows only TEAM_LEADER role, with status label
                  <option key={v.id} value={v.id}>{v.name} · {v.status}</option>
                ))}
              </select>
              {teamLeads.length === 0 && (
                <p className="font-mono text-[9px] text-accent-orange mt-1">
                  No team leaders available. Add volunteers with Team Leader role first.
                </p>
              )}
            </div>
            <button
              onClick={() => subWarehouseId && leadId && startMutation.mutate({
                subWarehouseId, teamNumber: team, zone, leadVolunteerId: leadId,
              })}
              disabled={startMutation.isPending || !leadId || !subWarehouseId}
              className="btn-primary w-full">
              {startMutation.isPending ? 'Departing...' : '▶ Start Run'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle sub={`${activeRuns.length} teams currently in field`}>Active Runs</SectionTitle>
          {activeRuns.length === 0 ? <Empty message="No active delivery runs." /> : (
            <div className="space-y-3">
              {activeRuns.map((r: DeliveryRun) => (
                <div key={r.id} className="bg-bg-elevated rounded-lg border border-accent-green/20 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-sans text-sm font-semibold text-text-primary">
                        Team {r.teamNumber} · {r.zone}
                      </p>
                      <p className="font-mono text-[10px] text-text-muted">
                        Lead: {r.leadVolunteer?.name ?? '—'} · Departed {fmtTime(r.departedAt)}
                      </p>
                    </div>
                    <Badge label="IN PROGRESS" color="text-accent-green border-accent-green/30 bg-accent-green/5" />
                  </div>
                  <p className="font-mono text-[10px] text-text-muted mb-2">
                    {r.receipts?.length ?? 0} deliveries recorded
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => completeMutation.mutate(r.id)} disabled={completeMutation.isPending}
                      className="flex-1 font-mono text-xs py-1.5 rounded border border-accent-green/40 text-accent-green hover:bg-accent-green/10 transition-colors">
                      ✓ Mark Complete
                    </button>
                    <button onClick={() => setAbortId(abortId === r.id ? '' : r.id)}
                      className="font-mono text-xs py-1.5 px-3 rounded border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-colors">
                      ⛔ Abort
                    </button>
                  </div>
                  {abortId === r.id && (
                    <div className="mt-2 space-y-2">
                      <input type="text" className="input text-xs"
                        placeholder="Abort reason (required — e.g. water >80cm)"
                        value={abortReason} onChange={e => setAbortReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button
                          onClick={() => abortReason.trim() && abortMutation.mutate({ id: r.id, reason: abortReason })}
                          disabled={!abortReason.trim() || abortMutation.isPending}
                          className="flex-1 btn-danger text-xs py-1.5">
                          Confirm Abort
                        </button>
                        <button onClick={() => { setAbortId(''); setAbortReason(''); }}
                          className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pastRuns.length > 0 && (
        <div>
          <SectionTitle sub="Completed and aborted runs">Run History</SectionTitle>
          <div className="card divide-y divide-bg-border">
            {pastRuns.map((r: DeliveryRun) => (
              <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-sm text-text-primary">Team {r.teamNumber} · {r.zone}</p>
                  <p className="font-mono text-[10px] text-text-muted">
                    {r.leadVolunteer?.name ?? '—'} · {fmtTime(r.departedAt)} → {r.returnedAt ? fmtTime(r.returnedAt) : '—'}
                    {' · '}{r.receipts?.length ?? 0} delivered
                  </p>
                </div>
                <Badge label={r.status} color={STATUS_COLORS[r.status]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB: INCIDENTS ───────────────────────────────────────────────────────────

function IncidentsTab({ districtId }: { districtId: string }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const [incType, setIncType] = useState<Incident['type']>('ROUTE_BLOCKED');
  const [incDesc, setIncDesc] = useState('');

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: queryKeys.hub.incidents(districtId),
    queryFn: () => hubApi.getIncidents(districtId),
    enabled: !!districtId,
  });

  const invalidateIncidents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.incidents(districtId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  }, [queryClient, districtId]);

  const reportMutation = useMutation({
    mutationFn: hubApi.reportIncident,
    onSuccess: (result) => {
      const autoMsg = (result as Incident).autoEscalated ? ' Auto-escalated to Operations Center.' : '';
      setSuccess(`Incident reported.${autoMsg}`);
      setIncDesc('');
      invalidateIncidents();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: hubApi.resolveIncident,
    onSuccess: () => { setSuccess('Incident marked resolved.'); invalidateIncidents(); },
  });

  const STATUS_COLORS: Record<string, string> = {
    OPEN: 'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
    ESCALATED: 'text-accent-red border-accent-red/30 bg-accent-red/5',
    RESOLVED: 'text-text-muted border-bg-border bg-bg-elevated',
  };
  const INCIDENT_TYPES: Incident['type'][] = [
    'ROUTE_BLOCKED', 'VOLUNTEER_SAFETY', 'STOCK_SCARCITY', 'BUILDING_FLOODED', 'OTHER',
  ];
  const open = useMemo(() => incidents.filter((i: Incident) => i.status !== 'RESOLVED'), [incidents]);
  const resolved = useMemo(() => incidents.filter((i: Incident) => i.status === 'RESOLVED'), [incidents]);

  const mutationError =
    (reportMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (resolveMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      {mutationError && <ErrorBox msg={mutationError} onDismiss={() => { reportMutation.reset(); resolveMutation.reset(); }} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      <div className="card p-5">
        <SectionTitle sub="VOLUNTEER_SAFETY incidents are auto-escalated to Operations Center (Section A.4)">
          Report Incident
        </SectionTitle>
        <div className="space-y-3">
          <div>
            <label className="label">Incident Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INCIDENT_TYPES.map(t => (
                <button key={t} onClick={() => setIncType(t)}
                  className={`font-mono text-[10px] py-2 px-2 rounded border transition-all text-left ${
                    incType === t
                      ? t === 'VOLUNTEER_SAFETY'
                        ? 'bg-accent-red/10 border-accent-red/40 text-accent-red'
                        : 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                      : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                  }`}>
                  {t.replace(/_/g, ' ')}
                  {t === 'VOLUNTEER_SAFETY' && (
                    <span className="block text-[9px] text-accent-red mt-0.5">Auto-escalates</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="input resize-none" placeholder="Describe the incident clearly..."
              value={incDesc} onChange={e => setIncDesc(e.target.value)} />
          </div>
          <button
            onClick={() => incDesc.trim() && reportMutation.mutate({ districtId, type: incType, description: incDesc.trim() })}
            disabled={reportMutation.isPending || !incDesc.trim()}
            className="btn-primary w-full">
            {reportMutation.isPending ? 'Reporting...' : 'Report Incident'}
          </button>
        </div>
      </div>

      <div>
        <SectionTitle sub={`${open.length} open or escalated`}>Active Incidents</SectionTitle>
        <div className="card divide-y divide-bg-border">
          {open.length === 0 ? <Empty message="No open incidents." /> : open.map((inc: Incident) => (
            <div key={inc.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge label={inc.status} color={STATUS_COLORS[inc.status]} />
                    <span className="font-mono text-[10px] text-text-muted">{inc.type.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-[10px] text-text-muted">{timeAgo(inc.createdAt)}</span>
                  </div>
                  <p className="font-sans text-sm text-text-primary">{inc.description}</p>
                  <p className="font-mono text-[10px] text-text-muted mt-1">
                    Reported by {inc.reportedBy?.name ?? '—'}
                  </p>
                </div>
                <button onClick={() => resolveMutation.mutate(inc.id)} disabled={resolveMutation.isPending}
                  className="flex-shrink-0 font-mono text-xs py-1.5 px-3 rounded border border-accent-green/40 text-accent-green hover:bg-accent-green/10 transition-colors">
                  ✓ Resolve
                </button>
              </div>

              {/* FIX: Civil defense escalation note for VOLUNTEER_SAFETY */}
              {inc.status === 'ESCALATED' && (
                <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 mt-2 space-y-1">
                  {(inc as Incident & { escalationNote?: string }).escalationNote && (
                    <p className="font-mono text-[10px] text-accent-red">
                      {(inc as Incident & { escalationNote?: string }).escalationNote}
                    </p>
                  )}
                  {inc.type === 'VOLUNTEER_SAFETY' && (
                    <p className="font-mono text-[10px] text-accent-red font-bold">
                      ⚡ Contact civil defense immediately for evacuation support.
                      Water may exceed 80cm — all volunteers must return to sub-warehouse or shelter in place.
                      Do NOT send more teams to this zone.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {resolved.length > 0 && (
        <div>
          <SectionTitle sub={`${resolved.length} resolved`}>Resolved Incidents</SectionTitle>
          <div className="card divide-y divide-bg-border">
            {resolved.slice(0, 10).map((inc: Incident) => (
              <div key={inc.id} className="px-4 py-3 opacity-60">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge label="RESOLVED" color={STATUS_COLORS.RESOLVED} />
                  <span className="font-mono text-[10px] text-text-muted">{inc.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="font-sans text-xs text-text-secondary">{inc.description}</p>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">
                  Resolved {inc.resolvedAt ? timeAgo(inc.resolvedAt) : '—'} by {inc.resolvedBy?.name ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB: RADIO ───────────────────────────────────────────────────────────────

function RadioTab({ districtId }: { districtId: string }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const [slot, setSlot] = useState<'T0800' | 'T1200' | 'T1600' | 'T2000'>('T0800');
  const [status, setStatus] = useState<'OK' | 'ISSUE_REPORTED'>('OK');
  const [notes, setNotes] = useState('');

  const SLOTS = [
    { value: 'T0800' as const, label: '08:00', desc: 'Stock levels, overnight incidents, morning plan' },
    { value: 'T1200' as const, label: '12:00', desc: 'Delivery progress, new critical cases, route issues' },
    { value: 'T1600' as const, label: '16:00', desc: 'Afternoon delivery summary, resupply needs' },
    { value: 'T2000' as const, label: '20:00', desc: 'End-of-day stock count, next-day plan' },
  ];

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: queryKeys.hub.radio(districtId),
    queryFn: () => hubApi.getCheckins(districtId),
    enabled: !!districtId,
  });

  const submitMutation = useMutation({
    mutationFn: hubApi.submitCheckin,
    onSuccess: (_, vars) => {
      setSuccess(`${SLOTS.find(s => s.value === vars.scheduledTime)?.label} check-in recorded — ${vars.status}.`);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.radio(districtId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.radio.compliance() });
    },
  });

  const completedSlots = useMemo(() => checkins.map((c: RadioCheckin) => c.scheduledTime), [checkins]);
  const mutationError = (submitMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mutationError && <ErrorBox msg={mutationError} onDismiss={() => submitMutation.reset()} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      {/* FIX: clarified subtitle explaining relationship to physical radio */}
      <div className="bg-bg-elevated border border-bg-border rounded px-4 py-3">
        <p className="font-mono text-[10px] text-text-muted">
          <span className="text-text-secondary font-bold">How this works:</span> At each scheduled time, make the real radio call to Operations Center first.
          Then log it here to record compliance. This is the digital record — the radio call is the actual communication.
        </p>
      </div>

      <div>
        <SectionTitle sub="Section D.9 — fixed schedule: 08:00, 12:00, 16:00, 20:00">Today's Check-in Schedule</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SLOTS.map(s => {
            const done = completedSlots.includes(s.value);
            const checkin = checkins.find((c: RadioCheckin) => c.scheduledTime === s.value);
            return (
              <div key={s.value} className={`card p-4 transition-colors ${done ? 'border-accent-green/30 bg-accent-green/5' : 'border-bg-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-base font-bold text-text-primary">{s.label}</span>
                  <span className={`font-mono text-sm ${done ? 'text-accent-green' : 'text-text-muted'}`}>
                    {done ? '✓' : '○'}
                  </span>
                </div>
                {done && checkin ? (
                  <>
                    <Badge
                      label={checkin.status === 'OK' ? 'OK' : 'ISSUE'}
                      color={checkin.status === 'OK'
                        ? 'text-accent-green border-accent-green/30 bg-accent-green/5'
                        : 'text-accent-red border-accent-red/30 bg-accent-red/5'}
                    />
                    {checkin.notes && (
                      <p className="font-mono text-[9px] text-text-muted mt-1.5 truncate">{checkin.notes}</p>
                    )}
                  </>
                ) : (
                  <p className="font-mono text-[9px] text-text-muted">{s.desc}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <SectionTitle sub="Submit after completing the real radio call">Submit Check-in</SectionTitle>
        <div className="space-y-4">
          <div>
            <label className="label">Scheduled Time</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SLOTS.map(s => {
                const done = completedSlots.includes(s.value);
                return (
                  <button key={s.value} onClick={() => setSlot(s.value)}
                    className={`font-mono text-xs py-2 rounded border transition-all ${
                      slot === s.value
                        ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                        : done
                          ? 'bg-accent-green/5 border-accent-green/20 text-accent-green'
                          : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                    }`}>
                    {s.label}{done && <span className="block text-[9px]">✓ done</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <div className="flex gap-2">
              {(['OK', 'ISSUE_REPORTED'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`flex-1 font-mono text-xs py-2.5 rounded border transition-all ${
                    status === s
                      ? s === 'OK'
                        ? 'bg-accent-green/10 border-accent-green/40 text-accent-green'
                        : 'bg-accent-red/10 border-accent-red/40 text-accent-red'
                      : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                  }`}>
                  {s === 'OK' ? '✓ All OK' : '⚠ Issue Reported'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">
              Notes {status === 'ISSUE_REPORTED' && <span className="text-accent-red">(describe issue)</span>}
            </label>
            <textarea rows={3} className="input resize-none"
              placeholder={
                status === 'OK'
                  ? 'e.g. EMK1: 4,800 remaining. 3 teams deployed. No overnight incidents.'
                  : 'Describe the issue clearly for Operations Center...'
              }
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button
            onClick={() => submitMutation.mutate({
              districtId, scheduledTime: slot, status, notes: notes.trim() || undefined,
            })}
            disabled={submitMutation.isPending}
            className="btn-primary w-full">
            {submitMutation.isPending
              ? 'Submitting...'
              : `Submit ${SLOTS.find(s => s.value === slot)?.label} Check-in`}
          </button>
          <p className="font-mono text-[10px] text-text-muted text-center">
            Section D.9: If internet/phone fails, submit retroactively when contact restored.
          </p>
        </div>
      </div>

      {checkins.length > 0 && (
        <div>
          <SectionTitle>Today's Submissions</SectionTitle>
          <div className="card divide-y divide-bg-border">
            {checkins.map((c: RadioCheckin) => (
              <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-sm font-bold text-text-primary">
                      {SLOTS.find(s => s.value === c.scheduledTime)?.label ?? c.scheduledTime}
                    </span>
                    <Badge
                      label={c.status === 'OK' ? 'OK' : 'ISSUE'}
                      color={c.status === 'OK' ? 'text-accent-green border-accent-green/30' : 'text-accent-red border-accent-red/30'}
                    />
                  </div>
                  {c.notes && <p className="font-mono text-[10px] text-text-secondary">{c.notes}</p>}
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">
                    by {c.submittedBy?.name ?? '—'} · {timeAgo(c.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN HUB PAGE ────────────────────────────────────────────────────────────

export function HubPage() {
  usePageTitle('Hub Portal');
  const { user, isRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('stock');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');

  const isManager = isRole('HUB_MANAGER');
  const canSelectDistrict = !isManager;

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => import('../api/dashboard').then(m => m.dashboardApi.getSummary()),
  });
  const { data: alertStatus } = useQuery({
    queryKey: queryKeys.alert.status(),
    queryFn: () => api.get('/api/alert/status').then(r => r.data),
  });

  const districts: DistrictCard[] = (summaryData?.districts ?? []).filter(
     d => d.name !== '__central__'
  );


  const resolvedDistrictId: string = useMemo(() => {
    if (selectedDistrictId) return selectedDistrictId;
    if (isManager && user?.districtId) return user.districtId!; // non-null assertion after guard
    return districts[0]?.districtId ?? '';
  }, [selectedDistrictId, isManager, user?.districtId, districts]);

  const selectedDistrict = useMemo(
    () => districts.find(d => d.districtId === resolvedDistrictId),
    [districts, resolvedDistrictId]
  );

  const subWarehouseId = selectedDistrict?.subWarehouseId ?? null;

  // Pass all sub-warehouses to StockTab for cross-district reallocation
  const allSubWarehouses = useMemo(
    () => districts
      .map(d => ({ ...d, subWarehouseId: d.subWarehouseId ?? '' }))
      .filter(d => d.subWarehouseId),
    [districts]
  );

  const TABS: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'stock',      label: 'Stock',      icon: '⬡' },
    { id: 'volunteers', label: 'Volunteers',  icon: '⊕' },
    { id: 'deliveries', label: 'Deliveries',  icon: '⟁' },
    { id: 'incidents',  label: 'Incidents',   icon: '⚠' },
    { id: 'radio',      label: 'Radio',       icon: '◈' },
  ];

  if (summaryLoading && districts.length === 0) {
    return <DashboardLayout title="Hub Manager Portal"><HubSkeleton /></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Hub Manager Portal">
      <div className="space-y-5">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {canSelectDistrict ? (
              <>
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">District</span>
                <div className="flex gap-1.5">
                  {districts.map(d => {
                    const districtId = d.districtId ?? '';
                    return (
                      <button 
                        key={districtId} 
                        onClick={() => setSelectedDistrictId(districtId)}
                        className={`font-mono text-xs px-3 py-1.5 rounded border transition-all ${
                          resolvedDistrictId === districtId
                            ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                            : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                        }`}>
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-text-primary">
                  {selectedDistrict?.name ?? 'Your District'}
                </span>
                <span className="font-mono text-[10px] text-text-muted">Hub Manager view</span>
              </div>
            )}
          </div>

          {alertStatus && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-xs ${
              alertStatus.activated
                ? alertStatus.phase === 2
                  ? 'bg-accent-red/10 border-accent-red/30 text-accent-red'
                  : 'bg-accent-orange/10 border-accent-orange/30 text-accent-orange'
                : 'bg-bg-elevated border-bg-border text-text-muted'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${alertStatus.activated ? 'bg-accent-orange animate-pulse-slow' : 'bg-text-muted'}`} />
              {alertStatus.activated ? `PHASE ${alertStatus.phase} ACTIVE` : 'STANDBY'}
            </div>
          )}
        </div>

        {!subWarehouseId && resolvedDistrictId && (
          <div className="bg-accent-orange/10 border border-accent-orange/30 rounded px-4 py-2">
            <p className="font-mono text-xs text-accent-orange">
              No sub-warehouse found for this district. Stock and delivery operations require a sub-warehouse record.
            </p>
          </div>
        )}

        <div className="flex gap-0.5 bg-bg-elevated rounded-lg p-1 border border-bg-border w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded font-sans text-sm font-medium transition-all duration-100 ${
                activeTab === tab.id
                  ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}>
              <span className="font-mono text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {resolvedDistrictId ? (
          <div className="animate-fade-in">
            {activeTab === 'stock' && (
              <StockTab
                districtId={resolvedDistrictId}
                subWarehouseId={subWarehouseId}
                allSubWarehouses={allSubWarehouses}
              />
            )}
            {activeTab === 'volunteers' && (
              <VolunteersTab districtId={resolvedDistrictId} subWarehouseId={subWarehouseId} />
            )}
            {activeTab === 'deliveries' && (
              <DeliveriesTab districtId={resolvedDistrictId} subWarehouseId={subWarehouseId} />
            )}
            {activeTab === 'incidents' && (
              <IncidentsTab districtId={resolvedDistrictId} />
            )}
            {activeTab === 'radio' && (
              <RadioTab districtId={resolvedDistrictId} />
            )}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="font-mono text-sm text-text-muted">Select a district to begin.</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}