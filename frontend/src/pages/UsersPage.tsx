// UsersPage.tsx — V9 User Management — migrated to React Query
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../components/DashboardLayout';
import { api } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n, districtLabel, type MessageKey, type Translate } from '../i18n';

type Role = 'SUPER_ADMIN' | 'EMERGENCY_COORDINATOR' | 'HUB_MANAGER' | 'VOLUNTEER' | 'VIEWER';
interface District { id: string; name: string; }
interface User {
  id: string; email: string; name: string; role: Role;
  districtId: string | null; phone: string | null;
  active: boolean; createdAt: string; updatedAt: string;
  district?: { name: string } | null;
}

const CREATABLE_ROLES: Role[] = ['EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'VOLUNTEER', 'VIEWER'];
const ALL_FILTER_ROLES: Array<Role | ''> = ['', 'EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'VOLUNTEER', 'VIEWER', 'SUPER_ADMIN'];
const DISTRICT_REQUIRED_ROLES: Role[] = ['HUB_MANAGER', 'VOLUNTEER'];

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'text-accent-red border-accent-red/30 bg-accent-red/5',
  EMERGENCY_COORDINATOR: 'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
  HUB_MANAGER: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
  VOLUNTEER: 'text-accent-green border-accent-green/30 bg-accent-green/5',
  VIEWER: 'text-text-muted border-bg-border bg-bg-elevated',
};
const ROLE_LABELS: Record<Role, MessageKey> = {
  SUPER_ADMIN: 'role.SUPER_ADMIN', EMERGENCY_COORDINATOR: 'role.EMERGENCY_COORDINATOR.short',
  HUB_MANAGER: 'role.HUB_MANAGER', VOLUNTEER: 'role.VOLUNTEER', VIEWER: 'role.VIEWER',
};

function timeAgo(t: Translate, iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return t('time.today');
  if (d === 1) return t('time.yesterday');
  if (d < 30) return t('time.daysAgo', { n: d });
  return t('time.monthsAgo', { n: Math.floor(d / 30) });
}
function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${color}`}>{label}</span>;
}
function ErrorBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-red">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[11px] text-accent-red flex-shrink-0">✕</button>
    </div>
  );
}
function SuccessBox({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-2 flex items-start justify-between gap-2 animate-slide-in">
      <p className="font-mono text-xs text-accent-green">{msg}</p>
      <button onClick={onDismiss} className="font-mono text-[11px] text-accent-green flex-shrink-0">✕</button>
    </div>
  );
}

// ─── CREATE USER PANEL ────────────────────────────────────────────────────────

function CreateUserPanel({ districts, onSuccess, onClose }: {
  districts: District[]; onSuccess: (msg: string) => void; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('VOLUNTEER');
  const [districtId, setDistrictId] = useState('');
  const [phone, setPhone] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const needsDistrict = DISTRICT_REQUIRED_ROLES.includes(role);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/api/users', payload),
    onSuccess: (_, payload) => {
      onSuccess(t('users.created', { name: String(payload.name) }));
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      onClose();
    },
  });

  const handleSubmit = useCallback(() => {
    if (!email.trim() || !name.trim() || !tempPassword) return;
    if (tempPassword.length < 8) return;
    if (needsDistrict && !districtId) return;
    const payload: Record<string, unknown> = {
      email: email.trim(),
      name: name.trim(),
      role,
      temporaryPassword: tempPassword,
    };
    if (districtId) payload.districtId = districtId;
    if (phone.trim()) payload.phone = phone.trim();
    createMutation.mutate(payload);
  }, [email, name, tempPassword, role, districtId, phone, needsDistrict, createMutation]);

  const createError = (createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="font-display font-bold text-text-primary mb-0.5">{t('users.create')}</h3>
        <p className="font-mono text-[11px] text-text-muted">{t('users.createHint')}</p>
      </div>
      {createError && <ErrorBox msg={createError} onDismiss={() => createMutation.reset()} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name</label>
          <input type="text" className="input" placeholder={t('users.namePlaceholder')}
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="user@rema.vn"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Role</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CREATABLE_ROLES.map(r => (
            <button key={r} onClick={() => { setRole(r); if (!DISTRICT_REQUIRED_ROLES.includes(r)) setDistrictId(''); }}
              className={`font-mono text-[11px] py-2 px-2 rounded border transition-all text-left ${
                role === r ? ROLE_COLORS[r] : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
              }`}>
              {t(ROLE_LABELS[r])}
              {DISTRICT_REQUIRED_ROLES.includes(r) && (
                <span className="block text-[10px] text-text-muted mt-0.5">{t('users.needsDistrict')}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      {needsDistrict && (
        <div>
          <label className="label">{t('common.district')} <span className="text-accent-red">*</span></label>
          <select value={districtId} onChange={e => setDistrictId(e.target.value)} className="input">
            <option value="">{t('users.selectDistrict')}</option>
            {districts.map(d => <option key={d.id} value={d.id}>{districtLabel(t, d.name)}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">
          {t('profile.phone')} <span className="font-mono text-[10px] text-text-muted normal-case ml-1">({t('users.phoneOptionalField')})</span>
        </label>
        <input type="tel" className="input" placeholder="+855 12 345 678"
          value={phone} onChange={e => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label">{t('users.tempPassword')}</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} className="input pr-16"
            placeholder={t('password.minPlaceholder')}
            value={tempPassword} onChange={e => setTempPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors">
            {showPassword ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        {tempPassword && tempPassword.length < 8 && (
          <p className="font-mono text-[11px] text-accent-red mt-1">
            {t(8 - tempPassword.length === 1 ? 'users.moreChars.one' : 'users.moreChars.other', { count: 8 - tempPassword.length })}
          </p>
        )}
      </div>
      <div className="bg-bg-elevated border border-bg-border rounded px-3 py-2">
        <p className="font-mono text-[11px] text-text-muted">
          <span className="text-accent-orange">{t('users.note')}</span> {t('users.superAdminNote')}
        </p>
      </div>
      <button
        onClick={handleSubmit}
        disabled={
          createMutation.isPending || !email.trim() || !name.trim() ||
          !tempPassword || tempPassword.length < 8 || (needsDistrict && !districtId)
        }
        className="btn-primary w-full">
        {createMutation.isPending ? t('users.creating') : t('users.create')}
      </button>
    </div>
  );
}

// ─── EDIT USER PANEL ──────────────────────────────────────────────────────────

function EditUserPanel({ user, districts, currentUserId, onSuccess, onClose }: {
  user: User; districts: District[]; currentUserId: string;
  onSuccess: (msg: string) => void; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [districtId, setDistrictId] = useState(user.districtId ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [active, setActive] = useState(user.active);
  const [resetMode, setResetMode] = useState(false);
  const [newTempPwd, setNewTempPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [localError, setLocalError] = useState('');

  const isSelf = user.id === currentUserId;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const needsDistrict = DISTRICT_REQUIRED_ROLES.includes(role);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/api/users/${user.id}`, payload),
    onSuccess: () => {
      onSuccess(t('users.updated', { name }));
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      onClose();
    },
  });

  const resetMutation = useMutation({
    mutationFn: (pwd: string) => api.post(`/api/users/${user.id}/reset-password`, { temporaryPassword: pwd }),
    onSuccess: () => {
      onSuccess(t('users.pwReset', { email: user.email }));
      setResetMode(false); setNewTempPwd('');
    },
  });

  const updateError = (updateMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';
  const resetError = (resetMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '';
  const anyError = localError || updateError || resetError;

  return (
    <div className="card border-accent-blue/20 p-5 space-y-4 animate-slide-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-text-primary">{t('users.edit')}</h3>
          <p className="font-mono text-[11px] text-text-muted">{user.email}</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2 py-1 -mr-2 font-mono text-[11px] uppercase tracking-wider hover:text-accent-red hover:bg-accent-red/10 rounded transition-all duration-200 flex-shrink-0">
          <span className="text-xs">✕</span>
          <span>{t('common.close')}</span>
        </button>
      </div>

      {anyError && (
        <ErrorBox msg={anyError} onDismiss={() => { setLocalError(''); updateMutation.reset(); resetMutation.reset(); }} />
      )}

      {isSuperAdmin ? (
        <div className="bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2">
          <p className="font-mono text-[11px] text-accent-red">{t('users.superAdminLocked')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CREATABLE_ROLES.map(r => (
                <button key={r} onClick={() => { setRole(r); if (!DISTRICT_REQUIRED_ROLES.includes(r)) setDistrictId(''); }}
                  className={`font-mono text-[11px] py-2 px-2 rounded border transition-all ${
                    role === r ? ROLE_COLORS[r] : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                  }`}>
                  {t(ROLE_LABELS[r])}
                </button>
              ))}
            </div>
          </div>
          {(needsDistrict || districtId) && (
            <div>
              <label className="label">{t('common.district')} {needsDistrict && <span className="text-accent-red">*</span>}</label>
              <select value={districtId} onChange={e => setDistrictId(e.target.value)} className="input">
                <option value="">{t('users.noDistrict')}</option>
                {districts.map(d => <option key={d.id} value={d.id}>{districtLabel(t, d.name)}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">
              {t('profile.phone')} <span className="font-mono text-[10px] text-text-muted normal-case ml-1">({t('common.optional')})</span>
            </label>
            <input type="tel" className="input" placeholder="+855 12 345 678"
              value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="flex items-center justify-between bg-bg-elevated rounded-lg border border-bg-border px-4 py-3">
            <div>
              <p className="font-sans text-sm text-text-primary">{t('users.accountActive')}</p>
              <p className="font-mono text-[11px] text-text-muted">{t('users.inactiveHint')}</p>
            </div>
            <button
              onClick={() => {
                if (isSelf) { setLocalError(t('users.errSelfDeactivate')); return; }
                setActive(v => !v);
              }}
              className={`relative w-11 h-6 rounded-full border transition-all duration-200 flex-shrink-0 flex items-center px-0.5 ${
                active
                  ? 'bg-accent-green/20 border-accent-green/40 justify-end'
                  : 'bg-bg-primary border-bg-border justify-start'
              }`}>
              <span className={`absolute inset-y-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                active ? 'translate-x-5 bg-accent-green' : 'translate-x-0 bg-text-muted'
              }`} />
            </button>
          </div>
          <button
            onClick={() => {
              if (!name.trim() || !email.trim()) { setLocalError(t('users.errNameEmail')); return; }
              if (needsDistrict && !districtId) { setLocalError(t('users.errNeedsDistrict', { role: t(ROLE_LABELS[role]) })); return; }
              updateMutation.mutate({
                name: name.trim(),
                email: email.trim(),
                role,
                active,
                phone: phone.trim() || null,
                districtId: districtId || null,
              });
            }}
            disabled={updateMutation.isPending || !name.trim() || !email.trim() || (needsDistrict && !districtId)}
            className="btn-primary w-full">
            {updateMutation.isPending ? t('common.saving') : t('common.saveChanges')}
          </button>
          <div className="border-t border-bg-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-sans text-sm font-medium text-text-primary">{t('users.resetPassword')}</p>
                <p className="font-mono text-[11px] text-text-muted">{t('users.resetHint')}</p>
              </div>
              <button onClick={() => setResetMode(v => !v)}
                className="font-mono text-xs text-accent-orange hover:text-accent-orange/80 transition-colors">
                {resetMode ? t('common.cancel') : `${t('users.reset')} →`}
              </button>
            </div>
            {resetMode && (
              <div className="space-y-3 animate-slide-in">
                <div className="relative">
                  <input type={showNewPwd ? 'text' : 'password'} className="input pr-16"
                    placeholder={t('users.newTempPlaceholder')}
                    value={newTempPwd} onChange={e => setNewTempPwd(e.target.value)} />
                  <button type="button" onClick={() => setShowNewPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-text-muted hover:text-text-primary">
                    {showNewPwd ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <button
                  onClick={() => newTempPwd.length >= 8 && resetMutation.mutate(newTempPwd)}
                  disabled={resetMutation.isPending || newTempPwd.length < 8}
                  className="btn-ghost w-full text-accent-orange border-accent-orange/30 hover:bg-accent-orange/10">
                  {resetMutation.isPending ? t('users.resetting') : t('users.confirmReset')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN USERS PAGE ──────────────────────────────────────────────────────────

export function UsersPage() {
  const { t } = useI18n();
  usePageTitle(t('nav.users'));
  const [filterRole, setFilterRole] = useState<Role | ''>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [success, setSuccess] = useState('');

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('rema_user') ?? 'null') as { id: string } | null; }
    catch { return null; }
  }, []);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterRole) p.role = filterRole;
    if (filterActive !== 'all') p.active = filterActive === 'active' ? 'true' : 'false';
    return p;
  }, [filterRole, filterActive]);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: [...queryKeys.users.list(), params],
    queryFn: () => api.get('/api/users', { params }).then(r => r.data),
  });
  const { data: districts = [] } = useQuery({
    queryKey: queryKeys.districts.list(),
    queryFn: () => api.get('/api/districts').then(r => r.data.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }))),
  });

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u: User) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.district?.name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u: User) => u.active).length,
    inactive: users.filter((u: User) => !u.active).length,
    byRole: CREATABLE_ROLES.reduce((acc, r) => {
      acc[r] = users.filter((u: User) => u.role === r).length;
      return acc;
    }, {} as Record<Role, number>),
  }), [users]);

  const fetchError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (error ? t('users.loadFailed') : '');

  return (
    <DashboardLayout title={t('users.title')}>
      <div className="space-y-5">
        {fetchError && <ErrorBox msg={fetchError} onDismiss={() => {}} />}
        {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

        {/* stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card px-4 py-3"><p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">{t('common.total')}</p><p className="font-mono text-2xl font-bold text-text-primary">{stats.total}</p></div>
          <div className="card px-4 py-3"><p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">{t('profile.active')}</p><p className="font-mono text-2xl font-bold text-accent-green">{stats.active}</p></div>
          <div className="card px-4 py-3"><p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">{t('users.inactive')}</p><p className="font-mono text-2xl font-bold text-text-muted">{stats.inactive}</p></div>
          {CREATABLE_ROLES.slice(0, 3).map(r => (
            <div key={r} className="card px-4 py-3">
              <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">{t(ROLE_LABELS[r])}</p>
              <p className={`font-mono text-2xl font-bold ${ROLE_COLORS[r].split(' ')[0]}`}>{stats.byRole[r] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 border border-bg-border">
              {ALL_FILTER_ROLES.map(r => (
                <button key={r || 'all'} onClick={() => setFilterRole(r)}
                  className={`font-mono text-[11px] px-2.5 py-1 rounded transition-all ${
                    filterRole === r
                      ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}>
                  {r ? t(ROLE_LABELS[r as Role]) : t('common.all')}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 border border-bg-border">
              {(['all', 'active', 'inactive'] as const).map(f => (
                <button key={f} onClick={() => setFilterActive(f)}
                  className={`font-mono text-[11px] px-2.5 py-1 rounded transition-all ${
                    filterActive === f
                      ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}>
                  {t(f === 'all' ? 'common.all' : f === 'active' ? 'profile.active' : 'users.inactive')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" className="input text-xs py-1.5 w-48"
              placeholder={t('users.search')}
              value={search} onChange={e => setSearch(e.target.value)} />
            <button
              onClick={() => { setEditingUser(null); setShowCreate(v => !v); }}
              className={`btn-primary text-xs py-1.5 px-4 flex-shrink-0 ${showCreate ? 'opacity-60' : ''}`}>
              {showCreate ? `✕ ${t('common.cancel')}` : `+ ${t('users.new')}`}
            </button>
          </div>
        </div>

        {showCreate && (
          <CreateUserPanel
            districts={districts}
            onSuccess={msg => setSuccess(msg)}
            onClose={() => setShowCreate(false)}
          />
        )}

        {editingUser && (
          <EditUserPanel
            user={editingUser}
            districts={districts}
            currentUserId={currentUser?.id ?? ''}
            onSuccess={msg => setSuccess(msg)}
            onClose={() => setEditingUser(null)}
          />
        )}

        {/* table */}
        <div className="card overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center">
              <p className="font-mono text-xs text-text-muted animate-pulse">{t('users.loading')}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-mono text-xs text-text-muted">
                {search ? t('users.noMatch', { q: search }) : t('users.none')}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-border">
                  {[t('profile.name'), t('login.email'), t('users.col.role'), t('common.district'), t('profile.phone'), t('queue.col.status'), t('users.col.created'), t('users.col.actions')].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[11px] text-text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: User) => (
                  <tr key={u.id} className={`border-b border-bg-border transition-colors ${!u.active ? 'opacity-50 bg-bg-elevated/30' : 'hover:bg-bg-elevated/40'}`}>
                    <td className="px-4 py-3 font-sans text-sm text-text-primary whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{u.email}</td>
                    <td className="px-4 py-3"><Badge label={t(ROLE_LABELS[u.role])} color={ROLE_COLORS[u.role]} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{u.district?.name ? districtLabel(t, u.district.name) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{u.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      {u.active
                        ? <Badge label={t('profile.active')} color="text-accent-green border-accent-green/30 bg-accent-green/5" />
                        : <Badge label={t('users.inactive')} color="text-text-muted border-bg-border bg-bg-elevated" />}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-text-muted">{timeAgo(t, u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => { setShowCreate(false); setEditingUser(editingUser?.id === u.id ? null : u); }}
                          className={`font-mono text-xs transition-colors ${
                            editingUser?.id === u.id ? 'text-accent-blue' : 'text-text-muted hover:text-text-primary'
                          }`}>
                          {editingUser?.id === u.id ? `${t('users.editing')} ↑` : `${t('common.edit')} →`}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && filteredUsers.length > 0 && (
            <div className="px-4 py-2 border-t border-bg-border">
              <p className="font-mono text-[11px] text-text-muted">
                {t(filteredUsers.length === 1 ? 'users.count.one' : 'users.count.other', { count: filteredUsers.length })}
                {search && ` ${t('users.matching', { q: search })}`}
                {' · '}{t('users.policy')}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}