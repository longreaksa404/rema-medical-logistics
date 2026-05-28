// HubPage.tsx — V7 Hub Manager Portal
// Fixes applied:
//   1. Central warehouse stock row (GET /api/stock/status)
//   2. Reallocation form gated to EMERGENCY_COORDINATOR (POST /api/stock/reallocate)
//   3. Volunteer role filter: TEAM_LEADER only in delivery run lead dropdown
//   4. Civil defense escalation note on VOLUNTEER_SAFETY incidents
//   5. Radio tab subtitle clarified

import { useState, useCallback, useMemo, useEffect  } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { hubApi } from '../api/hub';
import { queryKeys } from '../api/queryKeys';
import type {
  StockLevel,CentralStockLevel, CentralMovement,  StockMovement, DistrictRoster,
  Volunteer, DeliveryRun, Incident, RadioCheckin,
} from '../api/hub';
import type { DistrictCard } from '../api/dashboard.types';
import { usePageTitle } from '../hooks/usePageTitle';

type TabId = 'central' | 'stock' | 'volunteers' | 'deliveries' | 'incidents' | 'radio';

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

// ─── StockTab ─────────────────────────────────────────────────────────────────
// Clean district-only version.
// Central warehouse display and management moved to CentralTab.
// This tab shows: dispatch form, sub-warehouse levels, adjust form, audit log.

function StockTab({ districtId, subWarehouseId }: {
  districtId: string;
  subWarehouseId: string | null;
}) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');

  // ── Dispatch form ─────────────────────────────────────────────────────────
  const [dispEmkType, setDispEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [dispQty,     setDispQty]     = useState('');
  const [dispReason,  setDispReason]  = useState('');

  // ── Adjust form ───────────────────────────────────────────────────────────
  const [adjEmkType, setAdjEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [adjQty,     setAdjQty]     = useState('');
  const [adjReason,  setAdjReason]  = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: centralStock } = useQuery({
    queryKey: queryKeys.hub.centralStock(),
    queryFn:  () => hubApi.getCentralStock(),
    staleTime: 15_000,
  });

  const { data: stock, isPending: stockPending } = useQuery({
    queryKey: queryKeys.hub.stock(districtId),
    queryFn:  () => hubApi.getDistrictStock(districtId),
    enabled:  !!districtId,
  });

  const { data: movements = [], isPending: movPending } = useQuery({
    queryKey: queryKeys.hub.movements(districtId),
    queryFn:  () => hubApi.getMovements(districtId),
    enabled:  !!districtId,
    select:   (data: StockMovement[]) => data.slice(0, 50),
  });

  // only true when no cached data exists at all
  const isLoading = (stockPending && !stock) || (movPending && movements.length === 0);

  const invalidateStock = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.centralStock() });
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.centralMovements() });
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.stock(districtId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.movements(districtId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  }, [queryClient, districtId]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const dispatchMutation = useMutation({
    mutationFn: hubApi.dispatch,
    onSuccess: (_, vars) => {
      setSuccess(`Dispatched ${vars.quantity}× ${vars.emkType} from central to sub-warehouse.`);
      setDispQty(''); setDispReason('');
      invalidateStock();
    },
  });

  const adjustMutation = useMutation({
    mutationFn: hubApi.adjust,
    onSuccess: (_, vars) => {
      setSuccess(`Adjustment: ${Number(vars.quantity) > 0 ? '+' : ''}${vars.quantity}× ${vars.emkType}.`);
      setAdjQty(''); setAdjReason('');
      invalidateStock();
    },
  });

  // ── Constants ─────────────────────────────────────────────────────────────
  const EMK_TYPES: Array<'EMK1' | 'EMK2' | 'EMK3'> = ['EMK1', 'EMK2', 'EMK3'];
  const EMK_COLORS = { EMK1: 'text-accent-blue', EMK2: 'text-accent-green', EMK3: 'text-accent-yellow' };
  const MOVE_COLORS: Record<string, string> = {
    DISPATCH:     'text-accent-green border-accent-green/30 bg-accent-green/5',
    MOH_TRANSFER: 'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/5',
    DELIVERY:     'text-text-muted border-bg-border bg-bg-elevated',
    REALLOCATION: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    ADJUSTMENT:   'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
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

  const dispError = (dispatchMutation.error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error ?? '';
  const adjError  = (adjustMutation.error  as { response?: { data?: { error?: string } } } | null)?.response?.data?.error ?? '';
  const mutationError = dispError || adjError;

  // Central available for selected dispatch EMK type
  const centralAvailable = centralStock
    ? (centralStock[`${dispEmkType.toLowerCase()}Remaining` as keyof CentralStockLevel] as number)
    : null;

  return (
    <div className="space-y-6">
      {mutationError && (
        <ErrorBox msg={mutationError} onDismiss={() => { dispatchMutation.reset(); adjustMutation.reset(); }} />
      )}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      {/* ── SUB-WAREHOUSE STOCK LEVELS ─────────────────────────────────────── */}
      <div>
        <SectionTitle sub="Remaining / Total allocation for this sub-warehouse">
          Sub-Warehouse Stock Levels
        </SectionTitle>
        {stock ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMK_TYPES.map((type) => {
              const key    = type.toLowerCase() as 'emk1' | 'emk2' | 'emk3';
              const rem    = stock[`${key}Remaining`        as keyof StockLevel] as number;
              const total  = stock[`${key}Total`            as keyof StockLevel] as number;
              const pct    = stock[`${key}Pct`              as keyof StockLevel] as number;
              const scarce = stock[`${key}Scarce`           as keyof StockLevel] as boolean;
              const above  = stock[`${key}AboveAllocation`  as keyof StockLevel] as boolean;
              return (
                <div key={type} className={`card p-4 ${scarce ? 'border-accent-red/40' : above ? 'border-accent-blue/30' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-sm font-bold ${EMK_COLORS[type]}`}>{type}</span>
                    {scarce && (
                      <span className="font-mono text-[9px] text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded border border-accent-red/30 animate-pulse">
                        ⚠ SCARCE
                      </span>
                    )}
                    {!scarce && above && (
                      <span className="font-mono text-[9px] text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded border border-accent-blue/30">
                        ↑ EXTRA
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-2xl font-bold text-text-primary">{fmt(rem)}</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">of {fmt(total)} · {pct}%</p>
                  <div className="mt-2 h-1.5 bg-bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        scarce ? 'bg-accent-red' : above ? 'bg-accent-blue' : pct > 60 ? 'bg-accent-green' : pct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange'
                      }`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  {above && (
                    <p className="font-mono text-[9px] text-accent-blue mt-1.5">
                      ↑ Above allocation — extra resupply received
                    </p>
                  )}
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

      {/* ── DISPATCH + ADJUST ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Dispatch */}
        <div className="card p-5">
          <SectionTitle sub="Moves stock from central warehouse → this sub-warehouse">
            Record Dispatch
          </SectionTitle>

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
                <select value={dispEmkType} onChange={e => setDispEmkType(e.target.value as 'EMK1' | 'EMK2' | 'EMK3')} className="input">
                  {EMK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="1" className="input" placeholder="e.g. 200"
                  value={dispQty} onChange={e => setDispQty(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input type="text" className="input" placeholder="Phase 1 resupply..."
                value={dispReason} onChange={e => setDispReason(e.target.value)} />
            </div>
            <button
              onClick={() => {
                if (!subWarehouseId || !dispQty) return;
                dispatchMutation.mutate({ subWarehouseId, emkType: dispEmkType, quantity: Number(dispQty), reason: dispReason || undefined });
              }}
              disabled={dispatchMutation.isPending || !dispQty || !subWarehouseId}
              className="btn-primary w-full">
              {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch to Sub-Warehouse'}
            </button>
            {!subWarehouseId && (
              <p className="font-mono text-[10px] text-accent-orange">No sub-warehouse assigned.</p>
            )}
          </div>
        </div>

        {/* Adjust */}
        <div className="card p-5">
          <SectionTitle sub="Manual correction with mandatory reason (Section B.7)">
            Manual Adjustment
          </SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">EMK Type</label>
                <select value={adjEmkType} onChange={e => setAdjEmkType(e.target.value as 'EMK1' | 'EMK2' | 'EMK3')} className="input">
                  {EMK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantity (+/−)</label>
                <input type="number" className="input" placeholder="-5 or +10"
                  value={adjQty} onChange={e => setAdjQty(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Reason (required)</label>
              <input type="text" className="input" placeholder="e.g. Water-damaged kits removed"
                value={adjReason} onChange={e => setAdjReason(e.target.value)} />
            </div>
            <button
              onClick={() => {
                if (!subWarehouseId || !adjQty || !adjReason.trim()) return;
                adjustMutation.mutate({ subWarehouseId, emkType: adjEmkType, quantity: Number(adjQty), reason: adjReason });
              }}
              disabled={adjustMutation.isPending || !adjQty || !adjReason.trim() || !subWarehouseId}
              className="btn-ghost w-full">
              {adjustMutation.isPending ? 'Adjusting...' : 'Record Adjustment'}
            </button>
          </div>
        </div>
      </div>

      {/* ── AUDIT LOG ──────────────────────────────────────────────────────── */}
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
                    <span className={`font-mono text-xs font-semibold ${EMK_COLORS[m.emkType]}`}>{m.emkType}</span>
                    <span className={`font-mono text-sm font-bold ${m.quantity > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {m.quantity > 0 ? '+' : ''}{fmt(m.quantity)}
                    </span>
                  </div>
                  {m.reason && <p className="font-mono text-[10px] text-text-muted truncate">{m.reason}</p>}
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">by {m.performedBy?.name ?? '—'}</p>
                </div>
                <span className="font-mono text-[10px] text-text-muted flex-shrink-0">{timeAgo(m.createdAt)}</span>
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

  const [selectedTeamNum, setSelectedTeamNum] = useState<number | 'new'>(1);
  const [selectedZone, setSelectedZone] = useState('Zone A');
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [communityName, setCommunityName] = useState('');
  const [communityPhone, setCommunityPhone] = useState('');
  const [localExtraTeams, setLocalExtraTeams] = useState<number[]>([]);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  const { data: alertData } = useQuery({
    queryKey: queryKeys.alert.status(),
    queryFn: () => api.get('/api/alert/status').then(r => r.data),
  });
  const alertId = alertData?.id ?? '';

  const { data: roster, isPending: rosterPending } = useQuery({
    queryKey: [...queryKeys.hub.volunteers(districtId), alertId],
    queryFn: () => hubApi.getRoster(districtId, alertId || undefined),
    enabled: !!districtId,
  });

  const { data: runs = [], isPending: runsPending } = useQuery({
    queryKey: queryKeys.hub.deliveries(districtId),
    queryFn: () => hubApi.getDeliveryRuns(districtId),
    enabled: !!districtId,
    refetchInterval: 30_000,
  });

  const invalidateRoster = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.hub.volunteers(districtId), alertId] });
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.deliveries(districtId) });
  }, [queryClient, districtId, alertId]);

  // derive existing team numbers from current alert assignments
  const existingTeamNumbers = useMemo(() => {
    const nums = new Set<number>();
    (roster?.volunteers ?? []).forEach((v: Volunteer) => {
      if (v.assignments?.[0]) nums.add(v.assignments[0].teamNumber);
    });
    return Array.from(nums).sort((a, b) => a - b);
  }, [roster]);

  const nextTeamNumber = useMemo(() => {
    const allNums = [1, 2, 3, ...existingTeamNumbers];
    return Math.max(...allNums) + 1;
  }, [existingTeamNumbers]);

  const resolvedTeamNum = selectedTeamNum === 'new' ? nextTeamNumber : selectedTeamNum;

  // active run for selected team
  const activeRunForTeam = useMemo(
    () => runs.find((r: DeliveryRun) => r.status === 'IN_PROGRESS' && r.teamNumber === resolvedTeamNum) ?? null,
    [runs, resolvedTeamNum]
  );
  const isTeamLocked = !!activeRunForTeam;

  // members of selected team from current alert assignments
  const existingTeamMembers = useMemo(() => {
    if (selectedTeamNum === 'new') return [];
    return (roster?.volunteers ?? []).filter(
      (v: Volunteer) => v.assignments?.[0]?.teamNumber === resolvedTeamNum
    );
  }, [roster, selectedTeamNum, resolvedTeamNum]);

  // team is "active" only if members are currently DEPLOYED
  // after run completes volunteers return to AVAILABLE so this becomes false
  const isTeamCurrentlyDeployed = existingTeamMembers.some(
    (v: Volunteer) => v.status === 'DEPLOYED'
  );

  const existingTeamTL = existingTeamMembers.find((v: Volunteer) => v.role === 'TEAM_LEADER');
  const existingTeamVols = existingTeamMembers.filter((v: Volunteer) => v.role === 'VOLUNTEER');
  const existingZone = existingTeamMembers[0]?.assignments?.[0]?.zone ?? '';

  const allVolunteers = roster?.volunteers ?? [];
  const availableVols = allVolunteers.filter((v: Volunteer) => v.status === 'AVAILABLE');
  const availableTLs = availableVols.filter((v: Volunteer) => v.role === 'TEAM_LEADER');
  const availableMembers = availableVols.filter((v: Volunteer) => v.role === 'VOLUNTEER');
  const deployedCount = allVolunteers.filter((v: Volunteer) => v.status === 'DEPLOYED').length;

  // reset form when team selection changes
  useEffect(() => {
    setSelectedLeaderId('');
    setSelectedMemberIds([]);
    if (selectedTeamNum !== 'new' && existingZone) {
      setSelectedZone(existingZone);
    } else if (selectedTeamNum === 'new') {
      setSelectedZone('Zone A');
    }
  }, [selectedTeamNum]);

  const deployTeamMutation = useMutation({
    mutationFn: () => hubApi.assignTeam({
      subWarehouseId: subWarehouseId!,
      alertId,
      zone: selectedZone,
      teamNumber: resolvedTeamNum,
      leaderId: selectedLeaderId,
      memberIds: selectedMemberIds,
    }),
    onSuccess: () => {
      setSuccess(`Team ${resolvedTeamNum} deployed to ${selectedZone}.`);
      setSelectedLeaderId('');
      setSelectedMemberIds([]);
      invalidateRoster();
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'TEAM_LEADER' | 'VOLUNTEER' }) =>
      hubApi.setVolunteerRole(id, role),
    onSuccess: (_, vars) => {
      setSuccess(vars.role === 'TEAM_LEADER' ? 'Promoted to Team Leader.' : 'Returned to Volunteer.');
      invalidateRoster();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'INACTIVE' }) =>
      hubApi.updateVolunteer(id, { status }),
    onSuccess: (_, vars) => {
      setSuccess(`Volunteer set to ${vars.status}.`);
      invalidateRoster();
    },
  });

  const communityMutation = useMutation({
    mutationFn: () => hubApi.createCommunityVolunteer({
      districtId,
      name: communityName.trim(),
      phone: communityPhone.trim(),
    }),
    onSuccess: () => {
      setSuccess(`${communityName.trim()} added as community volunteer.`);
      setCommunityName('');
      setCommunityPhone('');
      invalidateRoster();
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (teamNum: number) => hubApi.deleteTeam(districtId, alertId, teamNum),
    onSuccess: (_, teamNum) => {
      setSuccess(`Team ${teamNum} removed.`);
      // if deleted team was selected, fall back to team 1
      if (selectedTeamNum === teamNum) setSelectedTeamNum(1);
      invalidateRoster();
    },
  });

  const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    DEPLOYED:  'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    INACTIVE:  'text-text-muted border-bg-border bg-bg-elevated',
  };

  const mutationError =
    (deployTeamMutation.error as any)?.response?.data?.error ||
    (roleMutation.error as any)?.response?.data?.error ||
    (statusMutation.error as any)?.response?.data?.error ||
    (communityMutation.error as any)?.response?.data?.error ||
    (deleteTeamMutation.error as any)?.response?.data?.error || '';

  const canDeploy =
    !!alertId &&
    !!subWarehouseId &&
    !!selectedLeaderId &&
    !isTeamLocked &&
    !isTeamCurrentlyDeployed;

  // build team dropdown options
  const baseTeams = [1, 2, 3];
  const allTeamNums = Array.from(
    new Set([...baseTeams, ...existingTeamNumbers, ...localExtraTeams])
  ).sort((a, b) => a - b);

  const removableTeams = localExtraTeams.filter(n => !existingTeamNumbers.includes(n));

  const teamOptions: Array<{ label: string; value: number | 'new' }> = [
    ...allTeamNums.map(n => ({ label: `Team ${n}`, value: n as number })),
    { label: `+ New Team (Team ${nextTeamNumber})`, value: 'new' as const },
  ];

  if ((rosterPending && !roster) || (runsPending && runs.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-72" /><Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mutationError && (
        <ErrorBox
          msg={mutationError}
          onDismiss={() => {
            deployTeamMutation.reset();
            roleMutation.reset();
            statusMutation.reset();
            communityMutation.reset();
            deleteTeamMutation.reset();
          }}
        />
      )}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      {/* ── STAT CARDS ────────────────────────────────────────────────────── */}
      {roster && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Total</p>
            <p className={`font-mono text-2xl font-bold ${roster.belowMinimum ? 'text-accent-red' : 'text-text-primary'}`}>
              {roster.total}
            </p>
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
            <p className="font-mono text-2xl font-bold text-accent-orange">{deployedCount}</p>
          </div>
        </div>
      )}

      {roster?.belowMinimum && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded px-4 py-2">
          <p className="font-mono text-xs text-accent-red">{roster.minimumWarning}</p>
        </div>
      )}

      {/* ── TEAM SETUP + COMMUNITY VOLUNTEER 50/50 ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* team setup */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-sans font-bold text-text-primary">Team Setup</h3>
              <p className="font-mono text-[10px] text-text-muted mt-0.5">
                Assign a team leader and members before starting a delivery run
              </p>
            </div>
            {!alertId && (
              <span className="font-mono text-[9px] text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded border border-accent-orange/30 flex-shrink-0">
                Activate REMA first
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* team + zone row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="label">Team</label>
                {/* custom dropdown — needed so each row can have a delete button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTeamDropdownOpen(p => !p)}
                    className="input w-full text-left flex items-center justify-between">
                    <span>
                      {selectedTeamNum === 'new'
                        ? `+ New Team (Team ${nextTeamNumber})`
                        : `Team ${selectedTeamNum}`}
                    </span>
                    <span className="text-text-muted text-xs">▾</span>
                  </button>

                  {teamDropdownOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg-primary border border-bg-border rounded-lg shadow-lg overflow-hidden">
                      {allTeamNums.map(n => {
                        const isRemovable = !existingTeamNumbers.includes(n) && n > 3 && localExtraTeams.includes(n);
                        const isSelected = selectedTeamNum === n;
                        return (
                          <div key={n}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                              isSelected ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-bg-elevated text-text-primary'
                            }`}>
                            <span
                              className="flex-1 font-mono text-sm"
                              onClick={() => { setSelectedTeamNum(n); setTeamDropdownOpen(false); }}>
                              Team {n}
                            </span>
                            {isRemovable ? (
                              // locally added, not in DB yet
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setLocalExtraTeams(p => p.filter(x => x !== n));
                                  if (selectedTeamNum === n) setSelectedTeamNum(1);
                                  setTeamDropdownOpen(false);
                                }}
                                className="ml-2 font-mono text-[10px] text-accent-red hover:text-accent-red/70 px-1 py-0.5 rounded hover:bg-accent-red/10 transition-colors"
                                title="Remove team">
                                ✕
                              </button>
                            ) : n > 3 ? (
                              // in DB — call delete endpoint
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  deleteTeamMutation.mutate(n);
                                  setTeamDropdownOpen(false);
                                }}
                                disabled={deleteTeamMutation.isPending}
                                className="ml-2 font-mono text-[10px] text-accent-red hover:text-accent-red/70 px-1 py-0.5 rounded hover:bg-accent-red/10 transition-colors"
                                title="Remove team">
                                ✕
                              </button>
                            ) : null}
                          </div>
                        );
                      })}

                      {/* new team option */}
                      <div
                        onClick={() => {
                          setLocalExtraTeams(p => p.includes(nextTeamNumber) ? p : [...p, nextTeamNumber]);
                          setSelectedTeamNum(nextTeamNumber);
                          setTeamDropdownOpen(false);
                        }}
                        className="flex items-center px-3 py-2 cursor-pointer hover:bg-bg-elevated text-accent-green border-t border-bg-border transition-colors">
                        <span className="font-mono text-sm">+ New Team (Team {nextTeamNumber})</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Zone</label>
                <select
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  disabled={isTeamCurrentlyDeployed}
                  className="input">
                  {['Zone A', 'Zone B', 'Zone C'].map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
            </div>

            {/* removable teams — added this session, not yet in DB */}
            {removableTeams.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                {removableTeams.map(n => (
                  <span key={n}
                    className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border border-bg-border text-text-muted bg-bg-elevated">
                    Team {n}
                    <button
                      onClick={() => {
                        setLocalExtraTeams(p => p.filter(x => x !== n));
                        if (selectedTeamNum === n) setSelectedTeamNum(1);
                      }}
                      className="ml-0.5 text-accent-red hover:text-accent-red/80 transition-colors"
                      title="Remove team">
                      ✕
                    </button>
                  </span>
                ))}
                <p className="font-mono text-[9px] text-text-muted">
                  Unsaved — disappears on reload if not deployed
                </p>
              </div>
            )}

            {/* show existing team info OR setup form */}
            {selectedTeamNum !== 'new' && isTeamCurrentlyDeployed ? (
              // currently deployed — read-only view
              <div className="space-y-3">
                <div className={`rounded-lg border p-3 space-y-2 ${
                  isTeamLocked
                    ? 'border-accent-green/30 bg-accent-green/5'
                    : 'border-accent-blue/20 bg-accent-blue/5'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
                      Current Team {resolvedTeamNum}
                    </p>
                    {isTeamLocked && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-accent-green border-accent-green/30 bg-accent-green/5">
                        IN FIELD
                      </span>
                    )}
                  </div>
                  {existingTeamTL && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-accent-blue border-accent-blue/30 bg-accent-blue/5 flex-shrink-0">
                        TL
                      </span>
                      <span className="font-sans text-sm text-text-primary">{existingTeamTL.name}</span>
                    </div>
                  )}
                  {existingTeamVols.map((v: Volunteer) => (
                    <div key={v.id} className="flex items-center gap-2">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-text-muted border-bg-border flex-shrink-0">
                        V
                      </span>
                      <span className="font-sans text-sm text-text-secondary">{v.name}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-bg-border">
                    <p className="font-mono text-[9px] text-text-muted">
                      {existingZone}
                      {activeRunForTeam && (
                        ` · departed ${fmtTime(activeRunForTeam.departedAt)} · ${new Set(activeRunForTeam.receipts?.map(r => r.householdId) ?? []).size} delivered`
                      )}
                    </p>
                  </div>
                </div>
                {isTeamLocked && (
                  <div className="bg-accent-orange/10 border border-accent-orange/20 rounded px-3 py-2">
                    <p className="font-mono text-[10px] text-accent-orange">
                      Team {resolvedTeamNum} is in the field. Complete or abort their run in the Deliveries tab to redeploy.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // setup form — new team or team returned from field
              <div className="space-y-3">
                <div>
                  <label className="label">Team Leader</label>
                  {availableTLs.length === 0 ? (
                    <p className="font-mono text-[10px] text-accent-orange">
                      No available team leaders. Promote one in the roster below.
                    </p>
                  ) : (
                    <select
                      value={selectedLeaderId}
                      onChange={e => setSelectedLeaderId(e.target.value)}
                      className="input">
                      <option value="">Select team leader...</option>
                      {availableTLs.map((v: Volunteer) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="label">
                    Members
                    <span className="font-mono text-[9px] text-text-muted normal-case ml-2">
                      {selectedMemberIds.length} selected
                    </span>
                  </label>
                  {availableMembers.length === 0 ? (
                    <p className="font-mono text-[10px] text-text-muted">
                      No available volunteers.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {availableMembers.map((v: Volunteer) => {
                        const checked = selectedMemberIds.includes(v.id);
                        return (
                          <label key={v.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                              checked
                                ? 'border-accent-blue/30 bg-accent-blue/5'
                                : 'border-bg-border hover:bg-bg-elevated/60'
                            }`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                setSelectedMemberIds(p =>
                                  e.target.checked
                                    ? [...p, v.id]
                                    : p.filter(id => id !== v.id)
                                );
                              }}
                              className="accent-accent-blue"
                            />
                            <span className="font-sans text-xs text-text-primary">{v.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deployTeamMutation.mutate()}
                  disabled={!canDeploy || deployTeamMutation.isPending}
                  className="btn-primary w-full">
                  {deployTeamMutation.isPending
                    ? 'Deploying...'
                    : `Deploy Team ${resolvedTeamNum} → ${selectedZone}`}
                </button>

                {!alertId && (
                  <p className="font-mono text-[9px] text-text-muted text-center">
                    REMA must be activated before deploying teams
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* add community volunteer */}
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-sans font-bold text-text-primary">Add Community Volunteer</h3>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">
              Field helper with no login account
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="Nguyen Van A"
                value={communityName}
                onChange={e => setCommunityName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                className="input"
                placeholder="+84 901 234 567"
                value={communityPhone}
                onChange={e => setCommunityPhone(e.target.value)}
              />
            </div>
            <button
              onClick={() => communityMutation.mutate()}
              disabled={communityMutation.isPending || !communityName.trim() || !communityPhone.trim()}
              className="btn-primary w-full">
              {communityMutation.isPending ? 'Adding...' : 'Add to Roster'}
            </button>
            <p className="font-mono text-[10px] text-text-muted">
              Community volunteers appear in the roster but cannot log in to REMA.
              For full access, ask SUPER_ADMIN to create a VOLUNTEER account instead.
            </p>
          </div>
        </div>
      </div>

      {/* ── FULL ROSTER TABLE ─────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Full Roster</SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-border">
                {['Name', 'Phone', 'Field Role', 'Status', 'Last Assignment', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] text-text-muted uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allVolunteers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <p className="font-mono text-xs text-text-muted">
                      No volunteers yet. Ask SUPER_ADMIN to create VOLUNTEER accounts for this district.
                    </p>
                  </td>
                </tr>
              ) : allVolunteers.map((v: Volunteer) => (
                <tr key={v.id} className={`border-b border-bg-border transition-colors ${
                  v.status === 'INACTIVE' ? 'opacity-50' : 'hover:bg-bg-elevated/40'
                }`}>
                  <td className="px-4 py-3">
                    <p className="font-sans text-sm text-text-primary">{v.name}</p>
                    {v.user ? (
                      <p className="font-mono text-[9px] text-text-muted">{v.user.email}</p>
                    ) : (
                      <p className="font-mono text-[9px] text-text-muted italic">community volunteer</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{v.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {v.role === 'TEAM_LEADER' ? (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded border text-accent-blue border-accent-blue/30 bg-accent-blue/5">
                        Team Leader
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-text-muted">Volunteer</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={v.status} color={STATUS_COLORS[v.status]} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-text-muted">
                    {v.assignments?.[0]
                      ? `${v.assignments[0].zone} · T${v.assignments[0].teamNumber}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {v.status === 'DEPLOYED' ? (
                      <span className="font-mono text-[9px] text-text-muted">in field</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {v.role === 'TEAM_LEADER' ? (
                          <button
                            onClick={() => roleMutation.mutate({ id: v.id, role: 'VOLUNTEER' })}
                            disabled={roleMutation.isPending}
                            className="font-mono text-[10px] px-2 py-0.5 rounded border border-accent-orange/30 text-accent-orange hover:bg-accent-orange/10 transition-colors">
                            Demote
                          </button>
                        ) : (
                          <button
                            onClick={() => roleMutation.mutate({ id: v.id, role: 'TEAM_LEADER' })}
                            disabled={roleMutation.isPending}
                            className="font-mono text-[10px] px-2 py-0.5 rounded border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10 transition-colors">
                            Promote TL
                          </button>
                        )}
                        {v.status === 'AVAILABLE' ? (
                          <button
                            onClick={() => statusMutation.mutate({ id: v.id, status: 'INACTIVE' })}
                            disabled={statusMutation.isPending}
                            className="font-mono text-[10px] px-2 py-0.5 rounded border border-bg-border text-text-muted hover:border-accent-red/30 hover:text-accent-red transition-colors">
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => statusMutation.mutate({ id: v.id, status: 'AVAILABLE' })}
                            disabled={statusMutation.isPending}
                            className="font-mono text-[10px] px-2 py-0.5 rounded border border-accent-green/30 text-accent-green hover:bg-accent-green/10 transition-colors">
                            Reactivate
                          </button>
                        )}
                      </div>
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
  const [team, setTeam] = useState(1);
  const [abortId, setAbortId] = useState('');
  const [abortReason, setAbortReason] = useState('');

  const { data: alertData } = useQuery({
    queryKey: queryKeys.alert.status(),
    queryFn: () => api.get('/api/alert/status').then(r => r.data),
  });
  const alertId = alertData?.id ?? '';

  const { data: runs = [], isPending: runsPending } = useQuery({
    queryKey: queryKeys.hub.deliveries(districtId),
    queryFn: () => hubApi.getDeliveryRuns(districtId),
    enabled: !!districtId,
    refetchInterval: 30_000,
  });

  // fetch roster with current alertId so assignments reflect this deployment session
  const { data: roster } = useQuery({
    queryKey: [...queryKeys.hub.volunteers(districtId), alertId],
    queryFn: () => hubApi.getRoster(districtId, alertId || undefined),
    enabled: !!districtId && !!alertId,
  });

  // build team map from current alert assignments
  // teamMap[teamNumber] = { tl, zone }
  const teamMap = useMemo(() => {
    const map: Record<number, { tl: Volunteer; zone: string }> = {};
    (roster?.volunteers ?? []).forEach((v: Volunteer) => {
      if (v.role === 'TEAM_LEADER' && v.assignments?.[0]) {
        const a = v.assignments[0];
        map[a.teamNumber] = { tl: v, zone: a.zone };
      }
    });
    return map;
  }, [roster]);

  // available team numbers = teams with a TL assigned this alert
  const deployedTeamNumbers = useMemo(
    () => Object.keys(teamMap).map(Number).sort((a, b) => a - b),
    [teamMap]
  );

  // auto-select first available team on load
  useEffect(() => {
    if (deployedTeamNumbers.length > 0 && !deployedTeamNumbers.includes(team)) {
      setTeam(deployedTeamNumbers[0]);
    }
  }, [deployedTeamNumbers]);

  const selectedTeamData = teamMap[team] ?? null;

  const invalidateDeliveries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.deliveries(districtId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  }, [queryClient, districtId]);

  const startMutation = useMutation({
    mutationFn: hubApi.startRun,
    onSuccess: (_, vars) => {
      setSuccess(`Team ${vars.teamNumber} departed for ${selectedTeamData?.zone ?? ''}.`);
      invalidateDeliveries();
    },
  });
  const completeMutation = useMutation({
    mutationFn: hubApi.completeRun,
    onSuccess: () => {
      setSuccess('Run marked complete. Team returned to base.');
      invalidateDeliveries();
      // also bust roster so volunteer statuses update
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.volunteers(districtId) });
    },
  });
  const abortMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => hubApi.abortRun(id, reason),
    onSuccess: () => {
      setSuccess('Run aborted. Team standing down.');
      setAbortId(''); setAbortReason('');
      invalidateDeliveries();
      queryClient.invalidateQueries({ queryKey: queryKeys.hub.volunteers(districtId) });
    },
  });

  const activeRuns = useMemo(() => runs.filter((r: DeliveryRun) => r.status === 'IN_PROGRESS'), [runs]);
  const pastRuns   = useMemo(() => runs.filter((r: DeliveryRun) => r.status !== 'IN_PROGRESS'), [runs]);

  // team is locked if it already has an active run
  const activeRunForTeam = useMemo(
    () => activeRuns.find((r: DeliveryRun) => r.teamNumber === team) ?? null,
    [activeRuns, team]
  );

  const mutationError =
    (startMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (completeMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (abortMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  if (runsPending && runs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mutationError && (
        <ErrorBox msg={mutationError} onDismiss={() => {
          startMutation.reset(); completeMutation.reset(); abortMutation.reset();
        }} />
      )}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* start run */}
        <div className="card p-5">
          <SectionTitle sub="Fixed departure times: 07:00 / 11:00 / 15:00">Start Delivery Run</SectionTitle>
          <div className="space-y-3">

            <div>
              <label className="label">Team #</label>
              {deployedTeamNumbers.length === 0 ? (
                <div className="bg-accent-orange/10 border border-accent-orange/20 rounded px-3 py-2">
                  <p className="font-mono text-[10px] text-accent-orange">
                    No teams deployed yet. Go to Volunteers tab and deploy a team first.
                  </p>
                </div>
              ) : (
                <select
                  value={team}
                  onChange={e => setTeam(Number(e.target.value))}
                  className="input">
                  {deployedTeamNumbers.map(n => (
                    <option key={n} value={n}>Team {n}</option>
                  ))}
                </select>
              )}
            </div>

            {/* zone — auto-filled from team assignment, read only */}
            {selectedTeamData && (
              <div>
                <label className="label">Zone</label>
                <div className="bg-bg-elevated rounded border border-bg-border px-3 py-2">
                  <span className="font-mono text-sm text-text-primary">{selectedTeamData.zone}</span>
                  <span className="font-mono text-[10px] text-text-muted ml-2">from team assignment</span>
                </div>
              </div>
            )}

            {/* team lead — auto-filled from team assignment, read only */}
            <div>
              <label className="label">Team Lead</label>
              {selectedTeamData ? (
                <div className="bg-bg-elevated rounded border border-bg-border px-3 py-2 flex items-center justify-between">
                  <div>
                    <span className="font-sans text-sm text-text-primary">{selectedTeamData.tl.name}</span>
                    <span className={`ml-2 font-mono text-[10px] ${
                      selectedTeamData.tl.status === 'DEPLOYED' ? 'text-accent-blue' : 'text-accent-green'
                    }`}>· {selectedTeamData.tl.status}</span>
                  </div>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-accent-blue border-accent-blue/30 bg-accent-blue/5">
                    TL
                  </span>
                </div>
              ) : (
                <div className="bg-bg-elevated rounded border border-accent-orange/20 px-3 py-2">
                  <p className="font-mono text-[10px] text-accent-orange">
                    No team leader assigned to Team {team}.
                  </p>
                </div>
              )}
            </div>

            {activeRunForTeam ? (
              <div className="bg-accent-orange/10 border border-accent-orange/20 rounded px-3 py-2">
                <p className="font-mono text-[10px] text-accent-orange">
                  Team {team} already has an active run. Complete or abort it first.
                </p>
              </div>
            ) : (
              <button
                onClick={() => subWarehouseId && selectedTeamData && startMutation.mutate({
                  subWarehouseId,
                  teamNumber: team,
                  zone: selectedTeamData.zone,
                  leadVolunteerId: selectedTeamData.tl.id,
                })}
                disabled={startMutation.isPending || !selectedTeamData || !subWarehouseId}
                className="btn-primary w-full">
                {startMutation.isPending ? 'Departing...' : '▶ Start Run'}
              </button>
            )}
          </div>
        </div>

        {/* active runs */}
        <div className="card p-5">
          <SectionTitle sub={`${activeRuns.length} team${activeRuns.length !== 1 ? 's' : ''} currently in field`}>
            Active Runs
          </SectionTitle>
          {activeRuns.length === 0 ? (
            <Empty message="No active delivery runs." />
          ) : (
            <div className="space-y-3">
              {activeRuns.map((r: DeliveryRun) => (
                <div key={r.id} className="bg-bg-elevated rounded-lg border border-accent-green/20 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="font-sans text-sm font-semibold text-text-primary">
                        Team {r.teamNumber} · {r.zone}
                      </p>
                      <p className="font-mono text-[10px] text-text-muted">
                        {r.leadVolunteer?.name ?? '—'} · departed {fmtTime(r.departedAt)}
                      </p>
                    </div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-accent-green border-accent-green/30 bg-accent-green/5 flex-shrink-0">
                      IN PROGRESS
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-text-muted mb-3">
                    {new Set(r.receipts?.map(rec => rec.householdId) ?? []).size} deliveries recorded
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => completeMutation.mutate(r.id)}
                      disabled={completeMutation.isPending}
                      className="flex-1 font-mono text-xs py-2 rounded border border-accent-green/40 text-accent-green bg-accent-green/5 hover:bg-accent-green/15 transition-colors font-semibold">
                      ✓ Mark Complete
                    </button>
                    <button
                      onClick={() => setAbortId(abortId === r.id ? '' : r.id)}
                      className={`font-mono text-xs py-2 px-4 rounded border transition-colors ${
                        abortId === r.id
                          ? 'border-accent-red/40 text-accent-red bg-accent-red/10'
                          : 'border-bg-border text-text-muted hover:border-accent-red/30 hover:text-accent-red'
                      }`}>
                      Abort
                    </button>
                  </div>
                  {abortId === r.id && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-bg-border">
                      <input type="text" className="input text-xs"
                        placeholder="Abort reason — required (e.g. water depth >80cm)"
                        value={abortReason} onChange={e => setAbortReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button
                          onClick={() => abortReason.trim() && abortMutation.mutate({ id: r.id, reason: abortReason })}
                          disabled={!abortReason.trim() || abortMutation.isPending}
                          className="flex-1 font-mono text-xs py-1.5 rounded border border-accent-red/40 text-accent-red bg-accent-red/10 hover:bg-accent-red/20 transition-colors">
                          {abortMutation.isPending ? 'Aborting...' : 'Confirm Abort'}
                        </button>
                        <button
                          onClick={() => { setAbortId(''); setAbortReason(''); }}
                          className="font-mono text-xs py-1.5 px-3 rounded border border-bg-border text-text-muted hover:text-text-primary transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* run history */}
      {pastRuns.length > 0 && (
        <div>
          <SectionTitle sub="Completed and aborted runs">Run History</SectionTitle>
          <div className="card divide-y divide-bg-border">
            {pastRuns.map((r: DeliveryRun) => {
              const duration = r.returnedAt
                ? Math.round((new Date(r.returnedAt).getTime() - new Date(r.departedAt).getTime()) / 60000)
                : null;
              return (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-sans text-sm text-text-primary">
                        Team {r.teamNumber} · {r.zone}
                      </p>
                      {r.status === 'COMPLETE' ? (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-accent-green border-accent-green/30 bg-accent-green/5">
                          COMPLETE
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-accent-red border-accent-red/30 bg-accent-red/5">
                          ABORTED
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-text-muted">
                      {r.leadVolunteer?.name ?? '—'} · {fmtTime(r.departedAt)}
                      {r.returnedAt ? ` → ${fmtTime(r.returnedAt)}` : ''}
                      {duration !== null ? ` · ${duration}m` : ''}
                      {' · '}{new Set(r.receipts?.map(rec => rec.householdId) ?? []).size} delivered
                    </p>
                  </div>
                </div>
              );
            })}
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

  const { data: incidents = [], isPending } = useQuery({
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

  if (isPending && incidents.length === 0) {
    return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      {mutationError && <ErrorBox msg={mutationError} onDismiss={() => { reportMutation.reset(); resolveMutation.reset(); }} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      <div className="card p-5">
        <SectionTitle sub="VOLUNTEER_SAFETY incidents are auto-escalated to Operations Center">
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

  const { data: checkins = [], isPending } = useQuery({
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

  if (isPending && checkins.length === 0) {
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
        <SectionTitle sub="Fixed schedule: 08:00, 12:00, 16:00, 20:00">Today's Check-in Schedule</SectionTitle>
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
            If internet/phone fails, submit retroactively when contact restored.
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


// ─── CentralTab ───────────────────────────────────────────────────────────────
// Add this function to HubPage.tsx alongside the other Tab functions.
// Visible only to SUPER_ADMIN and EMERGENCY_COORDINATOR.
//
// Shows:
//   - Central stock levels (all 3 EMK types)
//   - Replenish form (SUPER_ADMIN only)
//   - Adjust form (SUPER_ADMIN only)
//   - Set Allocation form (SUPER_ADMIN only)
//   - Full central audit log

function CentralTab({ subWarehouseId, allSubWarehouses }: {
  subWarehouseId: string | null;
  allSubWarehouses: Array<{ subWarehouseId: string; name: string; districtName: string }>;
}) {
  const { isRole } = useAuth();
  const isSuperAdmin = isRole('SUPER_ADMIN');

  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');

  // ── Replenish form ────────────────────────────────────────────────────────
  const [repEmkType, setRepEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [repQty,    setRepQty]      = useState('');
  const [repReason, setRepReason]   = useState('');

  // ── Adjust form ───────────────────────────────────────────────────────────
  const [cadEmkType, setCadEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [cadQty,     setCadQty]     = useState('');
  const [cadReason,  setCadReason]  = useState('');

  // ── Allocation form ───────────────────────────────────────────────────────
  const [allocTarget,   setAllocTarget]   = useState<'central' | 'subWarehouse'>('central');
  const [allocSwId,     setAllocSwId]     = useState('');
  const [allocEmkType,  setAllocEmkType]  = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [allocNewTotal, setAllocNewTotal] = useState('');
  const [allocReason,   setAllocReason]   = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: centralStock, isPending: stockPending } = useQuery({
    queryKey: queryKeys.hub.centralStock(),
    queryFn:  () => hubApi.getCentralStock(),
    staleTime: 2 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,   // show old data while revalidating
  });

  const { data: movements, isPending: movPending } = useQuery({
    queryKey: queryKeys.hub.centralMovements(),
    queryFn:  () => hubApi.getCentralMovements(),
    staleTime: 2 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // isPending is only true when there is no cached data at all
  // isLoading (old behavior) was true even during background refetches
  const isLoading = !centralStock && stockPending;

  const invalidateCentral = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.centralStock() });
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.centralMovements() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  }, [queryClient]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const replenishMutation = useMutation({
    mutationFn: hubApi.replenishCentral,
    onSuccess: (_, vars) => {
      setSuccess(`Central replenished: +${vars.quantity}× ${vars.emkType}.`);
      setRepQty(''); setRepReason('');
      invalidateCentral();
    },
  });

  const adjustMutation = useMutation({
    mutationFn: hubApi.adjustCentral,
    onSuccess: (_, vars) => {
      setSuccess(`Central adjusted: ${Number(vars.quantity) > 0 ? '+' : ''}${vars.quantity}× ${vars.emkType}.`);
      setCadQty(''); setCadReason('');
      invalidateCentral();
    },
  });

  const allocationMutation = useMutation({
    mutationFn: hubApi.setAllocation,
    onSuccess: (_, vars) => {
      const target = vars.target === 'central' ? 'Central' : 'Sub-warehouse';
      setSuccess(`${target} ${vars.emkType} allocation set to ${vars.newTotal.toLocaleString()}.`);
      setAllocNewTotal(''); setAllocReason('');
      invalidateCentral();  // already invalidates centralMovements — this is sufficient
      if (vars.target === 'subWarehouse') {
        queryClient.invalidateQueries({ queryKey: ['hub'] });
      }
    },
  });

  // ── Constants ─────────────────────────────────────────────────────────────
  const EMK_TYPES: Array<'EMK1' | 'EMK2' | 'EMK3'> = ['EMK1', 'EMK2', 'EMK3'];
  const EMK_COLORS = { EMK1: 'text-accent-blue', EMK2: 'text-accent-green', EMK3: 'text-accent-yellow' };

  const MOV_COLORS: Record<string, string> = {
    DISPATCH:          'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
    MOH_TRANSFER:      'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/5',
    REPLENISH:         'text-accent-green border-accent-green/30 bg-accent-green/5',
    ADJUSTMENT:        'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    ALLOCATION_CHANGE: 'text-text-muted border-bg-border bg-bg-elevated',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-56" /><Skeleton className="h-56" />
        </div>
        <Skeleton className="h-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const allErrors = [
    (replenishMutation.error   as { response?: { data?: { error?: string } } } | null)?.response?.data?.error,
    (adjustMutation.error      as { response?: { data?: { error?: string } } } | null)?.response?.data?.error,
    (allocationMutation.error  as { response?: { data?: { error?: string } } } | null)?.response?.data?.error,
  ].filter(Boolean);
  const mutationError = allErrors[0] ?? '';

  // Current total hint for allocation form
  const currentAllocTotal = (() => {
    if (allocTarget === 'central' && centralStock) {
      return centralStock[`${allocEmkType.toLowerCase()}Total` as keyof CentralStockLevel] as number;
    }
    return null; // sub-warehouse total fetched separately — just show placeholder
  })();

  return (
    <div className="space-y-6">
      {mutationError && (
        <ErrorBox
          msg={mutationError}
          onDismiss={() => { replenishMutation.reset(); adjustMutation.reset(); allocationMutation.reset(); }}
        />
      )}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      {/* ── STOCK DISPLAY ────────────────────────────────────────────────── */}
      <div className="card p-5 border-accent-blue/20 bg-bg-elevated/40">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-sans font-bold text-text-primary">Central Warehouse — Stock Levels</h3>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">
              Remaining = available to dispatch · Total = allocation reference
            </p>
          </div>
          <span className="font-mono text-[10px] text-text-muted bg-bg-elevated px-2 py-1 rounded border border-bg-border">
            30% reserve
          </span>
        </div>

        {centralStock ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMK_TYPES.map((type) => {
              const key    = type.toLowerCase() as 'emk1' | 'emk2' | 'emk3';
              const rem    = centralStock[`${key}Remaining` as keyof CentralStockLevel] as number;
              const total  = centralStock[`${key}Total`     as keyof CentralStockLevel] as number;
              const pct    = centralStock[`${key}Pct`       as keyof CentralStockLevel] as number;
              const scarce = centralStock[`${key}Scarce`    as keyof CentralStockLevel] as boolean;
              const above  = rem > total;
              return (
                <div key={type} className={`bg-bg-elevated rounded-lg border p-4 ${scarce ? 'border-accent-red/40' : above ? 'border-accent-blue/30' : 'border-bg-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-sm font-bold ${EMK_COLORS[type]}`}>{type}</span>
                    {scarce && (
                      <span className="font-mono text-[9px] text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded border border-accent-red/30 animate-pulse">
                        ⚠ SCARCE
                      </span>
                    )}
                    {!scarce && above && (
                      <span className="font-mono text-[9px] text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded border border-accent-blue/30">
                        ↑ EXTRA
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-2xl font-bold text-text-primary">{fmt(rem)}</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">of {fmt(total)} · {pct}%</p>
                  <div className="mt-2 h-1.5 bg-bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        scarce ? 'bg-accent-red' : above ? 'bg-accent-blue' : pct > 60 ? 'bg-accent-blue' : pct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange'
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
              Central warehouse not found. Run <code>npm run seed</code>.
            </p>
          </div>
        )}
      </div>

      {/* ── MANAGEMENT FORMS (SUPER_ADMIN only) ──────────────────────────── */}
      {isSuperAdmin && (
        <>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              Stock Management
            </span>
            <span className="font-mono text-[9px] text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/30">
              SUPER_ADMIN
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Replenish */}
            <div className="card p-5 border-accent-green/20">
              <SectionTitle sub="New shipment — increases Remaining only. Total stays fixed.">
                Replenish Central Stock
              </SectionTitle>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">EMK Type</label>
                    <select value={repEmkType} onChange={e => setRepEmkType(e.target.value as 'EMK1' | 'EMK2' | 'EMK3')} className="input">
                      {EMK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Quantity</label>
                    <input type="number" min="1" className="input" placeholder="e.g. 1000"
                      value={repQty} onChange={e => setRepQty(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Reason (required)</label>
                  <input type="text" className="input" placeholder="e.g. UNICEF donation batch 3"
                    value={repReason} onChange={e => setRepReason(e.target.value)} />
                </div>
                <button
                  onClick={() => { if (!repQty || !repReason.trim()) return; replenishMutation.mutate({ emkType: repEmkType, quantity: Number(repQty), reason: repReason.trim() }); }}
                  disabled={replenishMutation.isPending || !repQty || !repReason.trim()}
                  className="btn-primary w-full">
                  {replenishMutation.isPending ? 'Recording...' : '+ Replenish'}
                </button>
              </div>
            </div>

            {/* Adjust */}
            <div className="card p-5">
              <SectionTitle sub="Signed correction — changes Remaining only (not Total)">
                Adjust Central Stock
              </SectionTitle>
              <p className="font-mono text-[10px] text-text-muted mb-3">
                For damaged, lost, or miscounted kits. Use Replenish for new stock.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">EMK Type</label>
                    <select value={cadEmkType} onChange={e => setCadEmkType(e.target.value as 'EMK1' | 'EMK2' | 'EMK3')} className="input">
                      {EMK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Quantity (+/−)</label>
                    <input type="number" className="input" placeholder="-10 or +5"
                      value={cadQty} onChange={e => setCadQty(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Reason (required)</label>
                  <input type="text" className="input" placeholder="e.g. 10 EMK2 kits water-damaged"
                    value={cadReason} onChange={e => setCadReason(e.target.value)} />
                </div>
                <button
                  onClick={() => { if (!cadQty || !cadReason.trim()) return; adjustMutation.mutate({ emkType: cadEmkType, quantity: Number(cadQty), reason: cadReason.trim() }); }}
                  disabled={adjustMutation.isPending || !cadQty || !cadReason.trim()}
                  className="btn-ghost w-full">
                  {adjustMutation.isPending ? 'Adjusting...' : 'Record Adjustment'}
                </button>
              </div>
            </div>
          </div>

          {/* Set Allocation */}
          <div className="card p-5 border-accent-orange/20">
            <SectionTitle sub="Changes Total reference only — Remaining is unaffected">
              Set Stock Allocation
            </SectionTitle>
            <p className="font-mono text-[10px] text-text-muted mb-4">
              Use when a formal capacity decision changes — new donor agreement, reallocation plan,
              or correcting seed data. Changes the <span className="text-text-primary">Total</span> used
              for the scarcity % bar.
            </p>
            <div className="space-y-3">
              {/* Target toggle */}
              <div>
                <label className="label">Target</label>
                <div className="flex gap-2">
                  {(['central', 'subWarehouse'] as const).map(t => (
                    <button key={t} onClick={() => setAllocTarget(t)}
                      className={`flex-1 font-mono text-xs py-2 rounded border transition-all ${
                        allocTarget === t
                          ? 'bg-accent-orange/10 border-accent-orange/40 text-accent-orange'
                          : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                      }`}>
                      {t === 'central' ? '🏛 Central Warehouse' : '🏪 Sub-Warehouse'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-warehouse selector — only shown when target = subWarehouse */}
              {allocTarget === 'subWarehouse' && (
                <div>
                  <label className="label">Sub-Warehouse</label>
                  <select value={allocSwId} onChange={e => setAllocSwId(e.target.value)} className="input">
                    <option value="">Select sub-warehouse...</option>
                    {allSubWarehouses.map(sw => (
                      <option key={sw.subWarehouseId} value={sw.subWarehouseId}>
                        {sw.districtName} — {sw.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">EMK Type</label>
                  <select value={allocEmkType} onChange={e => setAllocEmkType(e.target.value as 'EMK1' | 'EMK2' | 'EMK3')} className="input">
                    {EMK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">
                    New Total
                    {currentAllocTotal !== null && (
                      <span className="ml-2 font-mono text-[10px] text-text-muted normal-case">
                        current: {fmt(currentAllocTotal)}
                      </span>
                    )}
                  </label>
                  <input type="number" min="0" className="input" placeholder="e.g. 8000"
                    value={allocNewTotal} onChange={e => setAllocNewTotal(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Reason (required)</label>
                <input type="text" className="input"
                  placeholder="e.g. New donor agreement increases allocation to 8,000"
                  value={allocReason} onChange={e => setAllocReason(e.target.value)} />
              </div>

              {/* Warning if new total < current remaining */}
              {allocTarget === 'central' && allocNewTotal && centralStock && (() => {
                const newT   = Number(allocNewTotal);
                const curRem = centralStock[`${allocEmkType.toLowerCase()}Remaining` as keyof CentralStockLevel] as number;
                return newT < curRem ? (
                  <div className="bg-accent-orange/10 border border-accent-orange/30 rounded px-3 py-2">
                    <p className="font-mono text-[10px] text-accent-orange">
                      ⚠ New total ({fmt(newT)}) is less than current remaining ({fmt(curRem)}).
                      The ↑ EXTRA badge will appear until stock is consumed or adjusted.
                    </p>
                  </div>
                ) : null;
              })()}

              <button
                onClick={() => {
                  if (!allocNewTotal || !allocReason.trim()) return;
                  if (allocTarget === 'subWarehouse' && !allocSwId) return;
                  allocationMutation.mutate({
                    target:          allocTarget,
                    subWarehouseId:  allocTarget === 'subWarehouse' ? allocSwId : undefined,
                    emkType:         allocEmkType,
                    newTotal:        Number(allocNewTotal),
                    reason:          allocReason.trim(),
                  });
                }}
                disabled={
                  allocationMutation.isPending ||
                  !allocNewTotal ||
                  !allocReason.trim() ||
                  (allocTarget === 'subWarehouse' && !allocSwId)
                }
                className="w-full font-mono text-xs py-2.5 rounded border border-accent-orange/40 text-accent-orange hover:bg-accent-orange/10 transition-all disabled:opacity-40">
                {allocationMutation.isPending ? 'Updating...' : 'Set Allocation'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── CENTRAL AUDIT LOG ────────────────────────────────────────────── */}
      <div>
        <SectionTitle sub="All central warehouse operations — last 100 entries">
          Central Warehouse Audit Log
        </SectionTitle>
        <div className="card divide-y divide-bg-border">
          {(movements ?? []).length === 0 ? (
            <Empty message="No central warehouse movements yet." />
          ) : (
            (movements ?? []).map((m: CentralMovement) => {
              const isAlloc = m.movementType === 'ALLOCATION_CHANGE';
              return (
                <div key={m.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${MOV_COLORS[m.movementType] ?? 'text-text-muted border-bg-border'}`}>
                        {m.movementType.replace('_', ' ')}
                      </span>
                      <span className={`font-mono text-xs font-semibold ${EMK_COLORS[m.emkType]}`}>
                        {m.emkType}
                      </span>
                      {isAlloc ? (
                        <span className="font-mono text-sm font-bold text-text-muted">
                          → {fmt(m.quantity)} total
                        </span>
                      ) : (
                        <span className={`font-mono text-sm font-bold ${m.quantity > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {m.quantity > 0 ? '+' : ''}{fmt(m.quantity)}
                        </span>
                      )}
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN HUB PAGE ────────────────────────────────────────────────────────────

export function HubPage() {
  usePageTitle('Hub Portal');
  const { user, isRole } = useAuth();
  const isSuperAdminOrEC = isRole('SUPER_ADMIN') || isRole('EMERGENCY_COORDINATOR');
  const [activeTab, setActiveTab] = useState<TabId>(isSuperAdminOrEC ? 'central' : 'stock');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');

  const isManager = isRole('HUB_MANAGER');
  const canSelectDistrict = !isManager;
  const canSeeCentral = isRole('SUPER_ADMIN') || isRole('EMERGENCY_COORDINATOR');

  const { data: summaryData, isPending: summaryPending } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => import('../api/dashboard').then(m => m.dashboardApi.getSummary()),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
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
    if (isManager && user?.districtId) return user.districtId!;
    return districts[0]?.districtId ?? '';
  }, [selectedDistrictId, isManager, user?.districtId, districts]);

  const selectedDistrict = useMemo(
    () => districts.find(d => d.districtId === resolvedDistrictId),
    [districts, resolvedDistrictId]
  );

  const subWarehouseId = selectedDistrict?.subWarehouseId ?? null;

  const allSubWarehouses = useMemo(
    () => districts
      .filter(d => d.subWarehouseId)
      .map(d => ({
        subWarehouseId: d.subWarehouseId!,
        name: `Sub-Warehouse`,
        districtName: d.name,
      })),
    [districts]
  );

  const isCentralActive = activeTab === 'central';

  const SUB_TABS: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'stock',      label: 'Stock',      icon: '⬡' },
    { id: 'volunteers', label: 'Volunteers', icon: '⊕' },
    { id: 'deliveries', label: 'Deliveries', icon: '⟁' },
    { id: 'incidents',  label: 'Incidents',  icon: '⚠' },
    { id: 'radio',      label: 'Radio',      icon: '◈' },
  ];

  // clicking a district while Central is active switches to stock tab
  const handleDistrictSelect = (districtId: string) => {
    setSelectedDistrictId(districtId);
    if (isCentralActive) setActiveTab('stock');
  };

  if (summaryPending && !summaryData) {
    return <DashboardLayout title="Hub Manager Portal"><HubSkeleton /></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Hub Manager Portal">
      <div className="space-y-4">

        {/* ── ROW 1: scope selector ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">

            {/* Central button — EC/SUPER_ADMIN only */}
            {canSeeCentral && (
              <button
                onClick={() => setActiveTab('central')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-xs font-medium transition-all ${
                  isCentralActive
                    ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                    : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                }`}>
                🏛 Central
                <span className="font-mono text-[8px] text-accent-blue bg-accent-blue/10 px-1 py-0.5 rounded border border-accent-blue/20">
                  HQ
                </span>
              </button>
            )}

            {/* district buttons */}
            {canSelectDistrict ? (
              <>
                {canSeeCentral && (
                  <span className="font-mono text-[10px] text-bg-border select-none px-1">/</span>
                )}
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest mr-1">
                  District
                </span>
                {districts.map(d => {
                  const districtId = d.districtId ?? '';
                  const isSelected = resolvedDistrictId === districtId && !isCentralActive;
                  return (
                    <button
                      key={districtId}
                      onClick={() => handleDistrictSelect(districtId)}
                      className={`font-mono text-xs px-3 py-1.5 rounded border transition-all ${
                        isSelected
                          ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                          : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                      }`}>
                      {d.name}
                    </button>
                  );
                })}
              </>
            ) : (
              // HUB_MANAGER — fixed district, no switcher
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

        {/* ── ROW 2: district sub-tabs — only when NOT in Central mode ── */}
        {!isCentralActive && (
          <>
            {!subWarehouseId && resolvedDistrictId && (
              <div className="bg-accent-orange/10 border border-accent-orange/30 rounded px-4 py-2">
                <p className="font-mono text-xs text-accent-orange">
                  No sub-warehouse found for this district. Stock and delivery operations require a sub-warehouse record.
                </p>
              </div>
            )}
            <div className="flex gap-0.5 bg-bg-elevated rounded-lg p-1 border border-bg-border w-fit overflow-x-auto">
              {SUB_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded font-sans text-sm font-medium transition-all duration-100 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}>
                  <span className="text-xs">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── CONTENT ── */}
        <div className="animate-fade-in">
          {/* always mounted when accessible — hidden with CSS to preserve cache */}
          {canSeeCentral && (
            <div className={isCentralActive ? '' : 'hidden'}>
              <CentralTab
                subWarehouseId={subWarehouseId}
                allSubWarehouses={allSubWarehouses}
              />
            </div>
          )}

          {resolvedDistrictId && (
            <div className={!isCentralActive ? '' : 'hidden'}>
              <div className={activeTab === 'stock' ? '' : 'hidden'}>
                <StockTab districtId={resolvedDistrictId} subWarehouseId={subWarehouseId} />
              </div>
              <div className={activeTab === 'volunteers' ? '' : 'hidden'}>
                <VolunteersTab districtId={resolvedDistrictId} subWarehouseId={subWarehouseId} />
              </div>
              <div className={activeTab === 'deliveries' ? '' : 'hidden'}>
                <DeliveriesTab districtId={resolvedDistrictId} subWarehouseId={subWarehouseId} />
              </div>
              <div className={activeTab === 'incidents' ? '' : 'hidden'}>
                <IncidentsTab districtId={resolvedDistrictId} />
              </div>
              <div className={activeTab === 'radio' ? '' : 'hidden'}>
                <RadioTab districtId={resolvedDistrictId} />
              </div>
            </div>
          )}

          {!resolvedDistrictId && !isCentralActive && (
            <div className="py-20 text-center">
              <p className="font-mono text-sm text-text-muted">Select a district to begin.</p>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}