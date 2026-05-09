// HubPage.tsx — V7 Hub Manager Portal
// Performance fixes:
// - Parallel initial fetch (districts + alert status via Promise.all)
// - Tab data has 30s staleness guard before refetching
// - useEffect cleanup (clearInterval) on unmount
// - Loading skeleton on initial load
// 5 tabs: Stock | Volunteers | Deliveries | Incidents | Radio

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { hubApi } from '../api/hub';
import type {
  StockLevel,
  StockMovement,
  DistrictRoster,
  Volunteer,
  DeliveryRun,
  Incident,
  RadioCheckin,
} from '../api/hub';
import type { DistrictCard } from '../api/dashboard.types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TabId = 'stock' | 'volunteers' | 'deliveries' | 'incidents' | 'radio';

interface AlertStatus {
  id: string;
  activated: boolean;
  phase: number;
}

// Cache entry with timestamp for staleness check
interface CacheEntry<T> {
  data: T;
  fetchedAt: number; // Date.now()
}

const STALE_MS = 30_000; // 30 seconds

function isStale<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return true;
  return Date.now() - entry.fetchedAt > STALE_MS;
}

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
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
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
  return (
    <div className="py-10 text-center">
      <p className="font-mono text-xs text-text-muted">{message}</p>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
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

function StockTab({
  districtId,
  subWarehouseId,
  cacheRef,
}: {
  districtId: string;
  subWarehouseId: string | null;
  cacheRef: React.MutableRefObject<Map<string, CacheEntry<unknown>>>;
}) {
  const [stock, setStock] = useState<StockLevel | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dispEmkType, setDispEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [dispQty, setDispQty] = useState('');
  const [dispReason, setDispReason] = useState('');
  const [dispLoading, setDispLoading] = useState(false);

  const [adjEmkType, setAdjEmkType] = useState<'EMK1' | 'EMK2' | 'EMK3'>('EMK1');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  const cacheKey = `stock:${districtId}`;

  const load = useCallback(async (force = false) => {
    if (!districtId) return;
    const cached = cacheRef.current.get(cacheKey) as CacheEntry<{ stock: StockLevel; movements: StockMovement[] }> | undefined;
    if (!force && cached && !isStale(cached)) {
      setStock(cached.data.stock);
      setMovements(cached.data.movements);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Parallel fetch stock + movements
      const [s, m] = await Promise.all([
        hubApi.getDistrictStock(districtId),
        hubApi.getMovements(districtId),
      ]);
      setStock(s);
      const slicedMovements = m.slice(0, 50);
      setMovements(slicedMovements);
      cacheRef.current.set(cacheKey, { data: { stock: s, movements: slicedMovements }, fetchedAt: Date.now() });
    } catch {
      setError('Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  }, [districtId, cacheKey, cacheRef]);

  useEffect(() => { load(); }, [load]);

  const handleDispatch = async () => {
    if (!subWarehouseId || !dispQty) { setError('Missing fields.'); return; }
    setDispLoading(true);
    try {
      await hubApi.dispatch({ subWarehouseId, emkType: dispEmkType, quantity: Number(dispQty), reason: dispReason || undefined });
      setSuccess(`Dispatched ${dispQty}× ${dispEmkType} to sub-warehouse.`);
      setDispQty(''); setDispReason('');
      cacheRef.current.delete(cacheKey); // invalidate cache
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Dispatch failed.');
    } finally { setDispLoading(false); }
  };

  const handleAdjust = async () => {
    if (!subWarehouseId || !adjQty || !adjReason.trim()) { setError('All adjustment fields required.'); return; }
    setAdjLoading(true);
    try {
      await hubApi.adjust({ subWarehouseId, emkType: adjEmkType, quantity: Number(adjQty), reason: adjReason });
      setSuccess(`Adjustment recorded: ${Number(adjQty) > 0 ? '+' : ''}${adjQty}× ${adjEmkType}.`);
      setAdjQty(''); setAdjReason('');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Adjustment failed.');
    } finally { setAdjLoading(false); }
  };

  const EMK_TYPES: Array<'EMK1' | 'EMK2' | 'EMK3'> = ['EMK1', 'EMK2', 'EMK3'];
  const EMK_COLORS = { EMK1: 'text-accent-blue', EMK2: 'text-accent-green', EMK3: 'text-accent-yellow' };
  const MOVE_COLORS: Record<string, string> = {
    DISPATCH: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    MOH_TRANSFER: 'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/5',
    DELIVERY: 'text-text-muted border-bg-border bg-bg-elevated',
    REALLOCATION: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    ADJUSTMENT: 'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      <div>
        <SectionTitle sub="Current remaining / total allocated at sub-warehouse">Stock Levels</SectionTitle>
        {stock ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMK_TYPES.map((type) => {
              const rem = stock[`${type.toLowerCase()}Remaining` as keyof StockLevel] as number;
              const total = stock[`${type.toLowerCase()}Total` as keyof StockLevel] as number;
              const pct = stock[`${type.toLowerCase()}Pct` as keyof StockLevel] as number;
              const scarce = stock[`${type.toLowerCase()}Scarce` as keyof StockLevel] as boolean;
              return (
                <div key={type} className={`card p-4 ${scarce ? 'border-accent-red/40' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-sm font-bold ${EMK_COLORS[type]}`}>{type}</span>
                    {scarce && <span className="font-mono text-[9px] text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded border border-accent-red/30 animate-pulse">⚠ SCARCE</span>}
                  </div>
                  <p className="font-mono text-2xl font-bold text-text-primary">{fmt(rem)}</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">of {fmt(total)} · {pct}%</p>
                  <div className="mt-2 h-1.5 bg-bg-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${scarce ? 'bg-accent-red' : pct > 60 ? 'bg-accent-green' : pct > 30 ? 'bg-accent-yellow' : 'bg-accent-orange'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  {type === 'EMK3' && total === 0 && (
                    <p className="font-mono text-[9px] text-text-muted mt-1.5">MoH cold storage — transferred at activation</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : <Empty message="No stock record found for this district." />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle sub="Record stock arriving from central warehouse">Record Dispatch</SectionTitle>
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
            <button onClick={handleDispatch} disabled={dispLoading || !dispQty || !subWarehouseId} className="btn-primary w-full">
              {dispLoading ? 'Recording...' : 'Record Dispatch'}
            </button>
            {!subWarehouseId && <p className="font-mono text-[10px] text-accent-orange">No sub-warehouse assigned to this district.</p>}
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle sub="Manual correction with mandatory reason (Section B.7)">Manual Adjustment</SectionTitle>
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
            <button onClick={handleAdjust} disabled={adjLoading || !adjQty || !adjReason.trim() || !subWarehouseId} className="btn-ghost w-full">
              {adjLoading ? 'Adjusting...' : 'Record Adjustment'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle sub="Last 50 stock movements for this district">Audit Log</SectionTitle>
        <div className="card divide-y divide-bg-border">
          {movements.length === 0 ? <Empty message="No movements yet." /> : movements.map((m) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: VOLUNTEERS ──────────────────────────────────────────────────────────

function VolunteersTab({
  districtId,
  subWarehouseId,
  cacheRef,
}: {
  districtId: string;
  subWarehouseId: string | null;
  cacheRef: React.MutableRefObject<Map<string, CacheEntry<unknown>>>;
}) {
  const [roster, setRoster] = useState<DistrictRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState<'VOLUNTEER' | 'TEAM_LEADER'>('VOLUNTEER');
  const [addLoading, setAddLoading] = useState(false);

  const [assignVolId, setAssignVolId] = useState('');
  const [assignZone, setAssignZone] = useState('Zone A');
  const [assignTeam, setAssignTeam] = useState(1);
  const [alertId, setAlertId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const cacheKey = `volunteers:${districtId}`;

  const load = useCallback(async (force = false) => {
    if (!districtId) return;
    const cached = cacheRef.current.get(cacheKey) as CacheEntry<{ roster: DistrictRoster; alertId: string }> | undefined;
    if (!force && cached && !isStale(cached)) {
      setRoster(cached.data.roster);
      setAlertId(cached.data.alertId);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Parallel fetch roster + alert status
      const [r, alertRes] = await Promise.all([
        hubApi.getRoster(districtId),
        api.get('/api/alert/status'),
      ]);
      const aid = alertRes.data?.id ?? '';
      setRoster(r);
      setAlertId(aid);
      cacheRef.current.set(cacheKey, { data: { roster: r, alertId: aid }, fetchedAt: Date.now() });
    } catch {
      setError('Failed to load roster.');
    } finally {
      setLoading(false);
    }
  }, [districtId, cacheKey, cacheRef]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addName.trim() || !addPhone.trim()) { setError('Name and phone required.'); return; }
    setAddLoading(true);
    try {
      await hubApi.createVolunteer({ districtId, name: addName.trim(), phone: addPhone.trim(), role: addRole });
      setSuccess(`${addName} added to roster.`);
      setAddName(''); setAddPhone('');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add volunteer.');
    } finally { setAddLoading(false); }
  };

  const handleAssign = async () => {
    if (!assignVolId || !subWarehouseId || !alertId) { setError('Select volunteer and ensure REMA is activated.'); return; }
    setAssignLoading(true);
    try {
      await hubApi.assignVolunteer({ volunteerId: assignVolId, subWarehouseId, alertId, zone: assignZone, teamNumber: assignTeam });
      setSuccess('Volunteer assigned and marked DEPLOYED.');
      setAssignVolId('');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Assignment failed.');
    } finally { setAssignLoading(false); }
  };

  const handleStatusToggle = async (v: Volunteer) => {
    const newStatus = v.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE';
    try {
      await hubApi.updateVolunteer(v.id, { status: newStatus });
      setSuccess(`${v.name} → ${newStatus}`);
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch {
      setError('Status update failed.');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    DEPLOYED: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
    INACTIVE: 'text-text-muted border-bg-border bg-bg-elevated',
  };

  const availableVols = roster?.volunteers.filter(v => v.status === 'AVAILABLE') ?? [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
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
              {roster.volunteers.filter(v => v.status === 'DEPLOYED').length}
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
                    className={`flex-1 font-mono text-xs py-2 rounded border transition-all ${addRole === r ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue' : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'}`}>
                    {r === 'TEAM_LEADER' ? 'Team Leader' : 'Volunteer'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleAdd} disabled={addLoading || !addName.trim() || !addPhone.trim()} className="btn-primary w-full">
              {addLoading ? 'Adding...' : 'Add to Roster'}
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
                  {availableVols.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.role === 'TEAM_LEADER' ? 'TL' : 'V'})</option>
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
              <button onClick={handleAssign} disabled={assignLoading || !assignVolId || !subWarehouseId} className="btn-primary w-full">
                {assignLoading ? 'Assigning...' : 'Assign & Deploy'}
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
                <tr><td colSpan={6} className="px-4 py-8 text-center"><p className="font-mono text-xs text-text-muted">No volunteers in roster.</p></td></tr>
              ) : roster.volunteers.map(v => (
                <tr key={v.id} className="border-b border-bg-border hover:bg-bg-elevated/40 transition-colors">
                  <td className="px-4 py-3 font-sans text-sm text-text-primary">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{v.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[10px] ${v.role === 'TEAM_LEADER' ? 'text-accent-blue' : 'text-text-muted'}`}>
                      {v.role === 'TEAM_LEADER' ? 'TL' : 'V'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={v.status} color={STATUS_COLORS[v.status]} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-text-muted">
                    {v.assignments?.[0] ? `${v.assignments[0].zone} · T${v.assignments[0].teamNumber}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {v.status !== 'DEPLOYED' && (
                      <button onClick={() => handleStatusToggle(v)}
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

function DeliveriesTab({
  districtId,
  subWarehouseId,
  cacheRef,
}: {
  districtId: string;
  subWarehouseId: string | null;
  cacheRef: React.MutableRefObject<Map<string, CacheEntry<unknown>>>;
}) {
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [zone, setZone] = useState('Zone A');
  const [team, setTeam] = useState(1);
  const [leadId, setLeadId] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [abortId, setAbortId] = useState('');
  const [abortReason, setAbortReason] = useState('');

  const cacheKey = `deliveries:${districtId}`;

  const load = useCallback(async (force = false) => {
    if (!districtId) return;
    const cached = cacheRef.current.get(cacheKey) as CacheEntry<{ runs: DeliveryRun[]; volunteers: Volunteer[] }> | undefined;
    if (!force && cached && !isStale(cached)) {
      setRuns(cached.data.runs);
      setVolunteers(cached.data.volunteers);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Parallel fetch runs + roster
      const [r, rosterData] = await Promise.all([
        hubApi.getDeliveryRuns(districtId),
        hubApi.getRoster(districtId),
      ]);
      const vols = rosterData.volunteers.filter(v => v.status === 'AVAILABLE' || v.status === 'DEPLOYED');
      setRuns(r);
      setVolunteers(vols);
      cacheRef.current.set(cacheKey, { data: { runs: r, volunteers: vols }, fetchedAt: Date.now() });
    } catch {
      setError('Failed to load delivery runs.');
    } finally {
      setLoading(false);
    }
  }, [districtId, cacheKey, cacheRef]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    if (!subWarehouseId || !leadId) { setError('Sub-warehouse and team lead required.'); return; }
    setStartLoading(true);
    try {
      await hubApi.startRun({ subWarehouseId, teamNumber: team, zone, leadVolunteerId: leadId });
      setSuccess(`Team ${team} departed for ${zone}.`);
      setLeadId('');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to start run.');
    } finally { setStartLoading(false); }
  };

  const handleComplete = async (id: string) => {
    try {
      await hubApi.completeRun(id);
      setSuccess('Run marked complete.');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to complete run.');
    }
  };

  const handleAbort = async (id: string) => {
    if (!abortReason.trim()) { setError('Abort reason required.'); return; }
    try {
      await hubApi.abortRun(id, abortReason);
      setSuccess('Run aborted. Volunteers standing down.');
      setAbortId(''); setAbortReason('');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Abort failed.');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    IN_PROGRESS: 'text-accent-green border-accent-green/30 bg-accent-green/5',
    COMPLETE: 'text-text-muted border-bg-border bg-bg-elevated',
    ABORTED: 'text-accent-red border-accent-red/30 bg-accent-red/5',
  };

  const activeRuns = runs.filter(r => r.status === 'IN_PROGRESS');
  const pastRuns = runs.filter(r => r.status !== 'IN_PROGRESS');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
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
                {volunteers.map(v => (
                  <option key={v.id} value={v.id}>{v.name} · {v.status}</option>
                ))}
              </select>
            </div>
            <button onClick={handleStart} disabled={startLoading || !leadId || !subWarehouseId} className="btn-primary w-full">
              {startLoading ? 'Departing...' : '▶ Start Run'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle sub={`${activeRuns.length} teams currently in field`}>Active Runs</SectionTitle>
          {activeRuns.length === 0 ? (
            <Empty message="No active delivery runs." />
          ) : (
            <div className="space-y-3">
              {activeRuns.map(r => (
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
                  <p className="font-mono text-[10px] text-text-muted mb-2">{r.receipts?.length ?? 0} deliveries recorded</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleComplete(r.id)}
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
                      <input type="text" className="input text-xs" placeholder="Abort reason (required — e.g. water >80cm)"
                        value={abortReason} onChange={e => setAbortReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => handleAbort(r.id)} disabled={!abortReason.trim()}
                          className="flex-1 btn-danger text-xs py-1.5">Confirm Abort</button>
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
            {pastRuns.map(r => (
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

function IncidentsTab({
  districtId,
  cacheRef,
}: {
  districtId: string;
  cacheRef: React.MutableRefObject<Map<string, CacheEntry<unknown>>>;
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [incType, setIncType] = useState<Incident['type']>('ROUTE_BLOCKED');
  const [incDesc, setIncDesc] = useState('');
  const [incLoading, setIncLoading] = useState(false);

  const cacheKey = `incidents:${districtId}`;

  const load = useCallback(async (force = false) => {
    if (!districtId) return;
    const cached = cacheRef.current.get(cacheKey) as CacheEntry<Incident[]> | undefined;
    if (!force && cached && !isStale(cached)) {
      setIncidents(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await hubApi.getIncidents(districtId);
      setIncidents(data);
      cacheRef.current.set(cacheKey, { data, fetchedAt: Date.now() });
    } catch {
      setError('Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  }, [districtId, cacheKey, cacheRef]);

  useEffect(() => { load(); }, [load]);

  const handleReport = async () => {
    if (!incDesc.trim()) { setError('Description required.'); return; }
    setIncLoading(true);
    try {
      const result = await hubApi.reportIncident({ districtId, type: incType, description: incDesc.trim() });
      const autoMsg = (result as Incident).autoEscalated ? ' Auto-escalated to ESCALATED (volunteer safety).' : '';
      setSuccess(`Incident reported.${autoMsg}`);
      setIncDesc('');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Report failed.');
    } finally { setIncLoading(false); }
  };

  const handleResolve = async (id: string) => {
    try {
      await hubApi.resolveIncident(id);
      setSuccess('Incident marked resolved.');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Resolve failed.');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    OPEN: 'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
    ESCALATED: 'text-accent-red border-accent-red/30 bg-accent-red/5',
    RESOLVED: 'text-text-muted border-bg-border bg-bg-elevated',
  };

  const INCIDENT_TYPES: Incident['type'][] = ['ROUTE_BLOCKED', 'VOLUNTEER_SAFETY', 'STOCK_SCARCITY', 'BUILDING_FLOODED', 'OTHER'];

  const open = incidents.filter(i => i.status !== 'RESOLVED');
  const resolved = incidents.filter(i => i.status === 'RESOLVED');

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      <div className="card p-5">
        <SectionTitle sub="VOLUNTEER_SAFETY incidents are auto-escalated (Section A.4)">Report Incident</SectionTitle>
        <div className="space-y-3">
          <div>
            <label className="label">Incident Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INCIDENT_TYPES.map(t => (
                <button key={t} onClick={() => setIncType(t)}
                  className={`font-mono text-[10px] py-2 px-2 rounded border transition-all text-left ${
                    incType === t
                      ? t === 'VOLUNTEER_SAFETY' ? 'bg-accent-red/10 border-accent-red/40 text-accent-red'
                        : 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                      : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                  }`}>
                  {t.replace(/_/g, ' ')}
                  {t === 'VOLUNTEER_SAFETY' && <span className="block text-[9px] text-accent-red mt-0.5">Auto-escalates</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="input resize-none" placeholder="Describe the incident clearly..."
              value={incDesc} onChange={e => setIncDesc(e.target.value)} />
          </div>
          <button onClick={handleReport} disabled={incLoading || !incDesc.trim()} className="btn-primary w-full">
            {incLoading ? 'Reporting...' : 'Report Incident'}
          </button>
        </div>
      </div>

      <div>
        <SectionTitle sub={`${open.length} open or escalated`}>Active Incidents</SectionTitle>
        <div className="card divide-y divide-bg-border">
          {open.length === 0 ? <Empty message="No open incidents." /> : open.map(inc => (
            <div key={inc.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge label={inc.status} color={STATUS_COLORS[inc.status]} />
                    <span className="font-mono text-[10px] text-text-muted">{inc.type.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-[10px] text-text-muted">{timeAgo(inc.createdAt)}</span>
                  </div>
                  <p className="font-sans text-sm text-text-primary">{inc.description}</p>
                  <p className="font-mono text-[10px] text-text-muted mt-1">Reported by {inc.reportedBy?.name ?? '—'}</p>
                </div>
                <button onClick={() => handleResolve(inc.id)}
                  className="flex-shrink-0 font-mono text-xs py-1.5 px-3 rounded border border-accent-green/40 text-accent-green hover:bg-accent-green/10 transition-colors">
                  ✓ Resolve
                </button>
              </div>
              {(inc as Incident & { escalationNote?: string }).escalationNote && (
                <div className="bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2 mt-2">
                  <p className="font-mono text-[10px] text-accent-red">{(inc as Incident & { escalationNote?: string }).escalationNote}</p>
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
            {resolved.slice(0, 10).map(inc => (
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

function RadioTab({
  districtId,
  cacheRef,
}: {
  districtId: string;
  cacheRef: React.MutableRefObject<Map<string, CacheEntry<unknown>>>;
}) {
  const [checkins, setCheckins] = useState<RadioCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [slot, setSlot] = useState<'T0800' | 'T1200' | 'T1600' | 'T2000'>('T0800');
  const [status, setStatus] = useState<'OK' | 'ISSUE_REPORTED'>('OK');
  const [notes, setNotes] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const SLOTS: Array<{ value: 'T0800' | 'T1200' | 'T1600' | 'T2000'; label: string; desc: string }> = [
    { value: 'T0800', label: '08:00', desc: 'Stock levels, overnight incidents, morning plan' },
    { value: 'T1200', label: '12:00', desc: 'Delivery progress, new critical cases, route issues' },
    { value: 'T1600', label: '16:00', desc: 'Afternoon delivery summary, resupply needs' },
    { value: 'T2000', label: '20:00', desc: 'End-of-day stock count, next-day plan' },
  ];

  const cacheKey = `radio:${districtId}`;

  const load = useCallback(async (force = false) => {
    if (!districtId) return;
    const cached = cacheRef.current.get(cacheKey) as CacheEntry<RadioCheckin[]> | undefined;
    if (!force && cached && !isStale(cached)) {
      setCheckins(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await hubApi.getCheckins(districtId);
      setCheckins(data);
      cacheRef.current.set(cacheKey, { data, fetchedAt: Date.now() });
    } catch {
      setError('Failed to load check-ins.');
    } finally {
      setLoading(false);
    }
  }, [districtId, cacheKey, cacheRef]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      await hubApi.submitCheckin({ districtId, scheduledTime: slot, status, notes: notes.trim() || undefined });
      setSuccess(`${SLOTS.find(s => s.value === slot)?.label} check-in recorded — ${status}.`);
      setNotes('');
      cacheRef.current.delete(cacheKey);
      load(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Check-in failed.');
    } finally { setSubmitLoading(false); }
  };

  const completedSlots = checkins.map(c => c.scheduledTime);

  if (loading) {
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
      {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

      <div>
        <SectionTitle sub="Section D.9 — fixed schedule: 08:00, 12:00, 16:00, 20:00">Today's Check-in Schedule</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SLOTS.map(s => {
            const done = completedSlots.includes(s.value);
            const checkin = checkins.find(c => c.scheduledTime === s.value);
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
                    <Badge label={checkin.status === 'OK' ? 'OK' : 'ISSUE'} color={checkin.status === 'OK' ? 'text-accent-green border-accent-green/30 bg-accent-green/5' : 'text-accent-red border-accent-red/30 bg-accent-red/5'} />
                    {checkin.notes && <p className="font-mono text-[9px] text-text-muted mt-1.5 truncate">{checkin.notes}</p>}
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
        <SectionTitle sub="Submit or retroactively log a missed check-in">Submit Check-in</SectionTitle>
        <div className="space-y-4">
          <div>
            <label className="label">Scheduled Time</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SLOTS.map(s => {
                const done = completedSlots.includes(s.value);
                return (
                  <button key={s.value} onClick={() => setSlot(s.value)}
                    className={`font-mono text-xs py-2 rounded border transition-all ${
                      slot === s.value ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue' :
                      done ? 'bg-accent-green/5 border-accent-green/20 text-accent-green' :
                      'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                    }`}>
                    {s.label}
                    {done && <span className="block text-[9px]">✓ done</span>}
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
                      ? s === 'OK' ? 'bg-accent-green/10 border-accent-green/40 text-accent-green' : 'bg-accent-red/10 border-accent-red/40 text-accent-red'
                      : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                  }`}>
                  {s === 'OK' ? '✓ All OK' : '⚠ Issue Reported'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes {status === 'ISSUE_REPORTED' && <span className="text-accent-red">(describe issue)</span>}</label>
            <textarea rows={3} className="input resize-none"
              placeholder={status === 'OK'
                ? 'e.g. EMK1: 4,800 remaining. 3 teams deployed. No overnight incidents.'
                : 'Describe the issue clearly for Operations Center...'}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button onClick={handleSubmit} disabled={submitLoading} className="btn-primary w-full">
            {submitLoading ? 'Submitting...' : `Submit ${SLOTS.find(s => s.value === slot)?.label} Check-in`}
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
            {checkins.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-sm font-bold text-text-primary">
                      {SLOTS.find(s => s.value === c.scheduledTime)?.label ?? c.scheduledTime}
                    </span>
                    <Badge label={c.status === 'OK' ? 'OK' : 'ISSUE'} color={c.status === 'OK' ? 'text-accent-green border-accent-green/30' : 'text-accent-red border-accent-red/30'} />
                  </div>
                  {c.notes && <p className="font-mono text-[10px] text-text-secondary">{c.notes}</p>}
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">by {c.submittedBy?.name ?? '—'} · {timeAgo(c.createdAt)}</p>
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
  const { user, isRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('stock');
  const [districts, setDistricts] = useState<DistrictCard[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [alertStatus, setAlertStatus] = useState<AlertStatus | null>(null);
  const [loadingDistricts, setLoadingDistricts] = useState(true);

  // Shared tab-level cache to enforce 30s staleness guard
  // Map key: `${tabName}:${districtId}` → CacheEntry
  const tabCacheRef = useRef<Map<string, CacheEntry<unknown>>>(new Map());

  const isManager = isRole('HUB_MANAGER');
  const canSelectDistrict = !isManager;

  // ── Parallel initial fetch: districts + alert status ────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingDistricts(true);
      try {
        const [summaryRes, alertRes] = await Promise.all([
          api.get('/api/dashboard/summary'),
          api.get('/api/alert/status'),
        ]);
        const dList: DistrictCard[] = summaryRes.data.districts ?? [];
        setDistricts(dList);
        setAlertStatus(alertRes.data);

        if (isManager && user?.districtId) {
          setSelectedDistrictId(user.districtId);
        } else if (dList.length > 0) {
          setSelectedDistrictId(dList[0].districtId);
        }
      } catch {
        // silent — tabs handle their own errors
      } finally {
        setLoadingDistricts(false);
      }
    };
    load();
  }, [isManager, user?.districtId]);

  // Clear tab cache when district changes so we always fetch fresh on switch
  const handleDistrictChange = useCallback((id: string) => {
    setSelectedDistrictId(id);
    // Don't clear the whole cache — new district's tabs just won't have entries
  }, []);

  const selectedDistrict = districts.find(d => d.districtId === selectedDistrictId);
  const subWarehouseId = selectedDistrict?.subWarehouseId ?? null;

  const TABS: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'stock', label: 'Stock', icon: '⬡' },
    { id: 'volunteers', label: 'Volunteers', icon: '⊕' },
    { id: 'deliveries', label: 'Deliveries', icon: '⟁' },
    { id: 'incidents', label: 'Incidents', icon: '⚠' },
    { id: 'radio', label: 'Radio', icon: '◈' },
  ];

  if (loadingDistricts) {
    return (
      <DashboardLayout title="Hub Manager Portal">
        <HubSkeleton />
      </DashboardLayout>
    );
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
                  {districts.map(d => (
                    <button key={d.districtId} onClick={() => handleDistrictChange(d.districtId)}
                      className={`font-mono text-xs px-3 py-1.5 rounded border transition-all ${
                        selectedDistrictId === d.districtId
                          ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                          : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                      }`}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-text-primary">{selectedDistrict?.name ?? 'Your District'}</span>
                <span className="font-mono text-[10px] text-text-muted">Hub Manager view</span>
              </div>
            )}
          </div>

          {alertStatus && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-xs ${
              alertStatus.activated
                ? alertStatus.phase === 2 ? 'bg-accent-red/10 border-accent-red/30 text-accent-red'
                  : 'bg-accent-orange/10 border-accent-orange/30 text-accent-orange'
                : 'bg-bg-elevated border-bg-border text-text-muted'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${alertStatus.activated ? 'bg-accent-orange animate-pulse-slow' : 'bg-text-muted'}`} />
              {alertStatus.activated ? `PHASE ${alertStatus.phase} ACTIVE` : 'STANDBY'}
            </div>
          )}
        </div>

        {!subWarehouseId && selectedDistrictId && (
          <div className="bg-accent-orange/10 border border-accent-orange/30 rounded px-4 py-2">
            <p className="font-mono text-xs text-accent-orange">No sub-warehouse found for this district. Stock and delivery operations require a sub-warehouse record.</p>
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

        {selectedDistrictId ? (
          <div className="animate-fade-in">
            {activeTab === 'stock' && (
              <StockTab districtId={selectedDistrictId} subWarehouseId={subWarehouseId} cacheRef={tabCacheRef} />
            )}
            {activeTab === 'volunteers' && (
              <VolunteersTab districtId={selectedDistrictId} subWarehouseId={subWarehouseId} cacheRef={tabCacheRef} />
            )}
            {activeTab === 'deliveries' && (
              <DeliveriesTab districtId={selectedDistrictId} subWarehouseId={subWarehouseId} cacheRef={tabCacheRef} />
            )}
            {activeTab === 'incidents' && (
              <IncidentsTab districtId={selectedDistrictId} cacheRef={tabCacheRef} />
            )}
            {activeTab === 'radio' && (
              <RadioTab districtId={selectedDistrictId} cacheRef={tabCacheRef} />
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