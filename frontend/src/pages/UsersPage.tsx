// UsersPage.tsx — V9 User Management
// SUPER_ADMIN only: create, list, edit, deactivate, reset password
// Follows established REMA design system (font-mono, card, btn-primary, etc.)

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { api } from '../api/client';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'EMERGENCY_COORDINATOR' | 'HUB_MANAGER' | 'VOLUNTEER' | 'VIEWER';

interface District {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  districtId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  district?: { name: string } | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CREATABLE_ROLES: Role[] = [
  'EMERGENCY_COORDINATOR',
  'HUB_MANAGER',
  'VOLUNTEER',
  'VIEWER',
];

const ALL_FILTER_ROLES: Array<Role | ''> = [
  '',
  'EMERGENCY_COORDINATOR',
  'HUB_MANAGER',
  'VOLUNTEER',
  'VIEWER',
  'SUPER_ADMIN',
];

const DISTRICT_REQUIRED_ROLES: Role[] = ['HUB_MANAGER', 'VOLUNTEER'];

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'text-accent-red border-accent-red/30 bg-accent-red/5',
  EMERGENCY_COORDINATOR: 'text-accent-orange border-accent-orange/30 bg-accent-orange/5',
  HUB_MANAGER: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
  VOLUNTEER: 'text-accent-green border-accent-green/30 bg-accent-green/5',
  VIEWER: 'text-text-muted border-bg-border bg-bg-elevated',
};

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  EMERGENCY_COORDINATOR: 'Emergency Coord.',
  HUB_MANAGER: 'Hub Manager',
  VOLUNTEER: 'Volunteer',
  VIEWER: 'Viewer',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

// ─── SHARED: BADGE ────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
}

// ─── SHARED: ERROR / SUCCESS ──────────────────────────────────────────────────

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

// ─── PANEL: CREATE USER ───────────────────────────────────────────────────────

interface CreatePanelProps {
  districts: District[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onRefresh: () => void;
}

function CreateUserPanel({ districts, onSuccess, onError, onRefresh }: CreatePanelProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('VOLUNTEER');
  const [districtId, setDistrictId] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const needsDistrict = DISTRICT_REQUIRED_ROLES.includes(role);

  const handleSubmit = async () => {
    if (!email.trim() || !name.trim() || !tempPassword) {
      onError('Email, name, and temporary password are required.');
      return;
    }
    if (tempPassword.length < 8) {
      onError('Temporary password must be at least 8 characters.');
      return;
    }
    if (needsDistrict && !districtId) {
      onError(`Role ${role} requires a district assignment.`);
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        email: email.trim(),
        name: name.trim(),
        role,
        temporaryPassword: tempPassword,
      };
      if (districtId) payload.districtId = districtId;

      await api.post('/api/users', payload);
      onSuccess(`User "${name.trim()}" created. They must change their password on first login.`);
      setEmail(''); setName(''); setTempPassword(''); setDistrictId('');
      setRole('VOLUNTEER');
      onRefresh();
    } catch (e: unknown) {
      onError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to create user.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="font-sans font-bold text-text-primary mb-0.5">Create User</h3>
        <p className="font-mono text-[10px] text-text-muted">
          New users log in with the temporary password and must change it immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name</label>
          <input
            type="text"
            className="input"
            placeholder="Nguyen Van A"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="user@rema.vn"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Role</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CREATABLE_ROLES.map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); if (!DISTRICT_REQUIRED_ROLES.includes(r)) setDistrictId(''); }}
              className={`font-mono text-[10px] py-2 px-2 rounded border transition-all text-left ${
                role === r
                  ? ROLE_COLORS[r]
                  : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {ROLE_LABELS[r]}
              {DISTRICT_REQUIRED_ROLES.includes(r) && (
                <span className="block text-[9px] text-text-muted mt-0.5">Needs district</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {needsDistrict && (
        <div>
          <label className="label">District <span className="text-accent-red">*</span></label>
          <select
            value={districtId}
            onChange={e => setDistrictId(e.target.value)}
            className="input"
          >
            <option value="">Select district...</option>
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Temporary Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="input pr-16"
            placeholder="Min. 8 characters"
            value={tempPassword}
            onChange={e => setTempPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted hover:text-text-primary transition-colors"
          >
            {showPassword ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        {tempPassword && tempPassword.length < 8 && (
          <p className="font-mono text-[10px] text-accent-red mt-1">
            {8 - tempPassword.length} more character{8 - tempPassword.length !== 1 ? 's' : ''} needed
          </p>
        )}
      </div>

      <div className="bg-bg-elevated border border-bg-border rounded px-3 py-2">
        <p className="font-mono text-[10px] text-text-muted">
          <span className="text-accent-orange">Note:</span> SUPER_ADMIN accounts can only be created via the seed script — never via this form. This is a deliberate security decision.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !email.trim() || !name.trim() || !tempPassword || (needsDistrict && !districtId)}
        className="btn-primary w-full"
      >
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </div>
  );
}

// ─── PANEL: EDIT USER ─────────────────────────────────────────────────────────

interface EditPanelProps {
  user: User;
  districts: District[];
  currentUserId: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
  onRefresh: () => void;
}

function EditUserPanel({ user, districts, currentUserId, onSuccess, onError, onClose, onRefresh }: EditPanelProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [districtId, setDistrictId] = useState(user.districtId ?? '');
  const [active, setActive] = useState(user.active);
  const [loading, setLoading] = useState(false);

  // Reset password state
  const [resetMode, setResetMode] = useState(false);
  const [newTempPwd, setNewTempPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const isSelf = user.id === currentUserId;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const needsDistrict = DISTRICT_REQUIRED_ROLES.includes(role);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { onError('Name and email required.'); return; }
    if (needsDistrict && !districtId) { onError(`Role ${role} requires a district.`); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        role,
        active,
        districtId: districtId || null,
      };
      await api.patch(`/api/users/${user.id}`, payload);
      onSuccess(`User "${name.trim()}" updated.`);
      onRefresh();
      onClose();
    } catch (e: unknown) {
      onError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Update failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newTempPwd.length < 8) { onError('Temporary password must be at least 8 characters.'); return; }
    setResetLoading(true);
    try {
      await api.post(`/api/users/${user.id}/reset-password`, { temporaryPassword: newTempPwd });
      onSuccess(`Password reset for ${user.email}. User must change it on next login.`);
      setResetMode(false);
      setNewTempPwd('');
    } catch (e: unknown) {
      onError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Password reset failed.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="card border-accent-blue/20 p-5 space-y-4 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-sans font-bold text-text-primary">Edit User</h3>
          <p className="font-mono text-[10px] text-text-muted">{user.email}</p>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
        >
          ✕ Close
        </button>
      </div>

      {isSuperAdmin && (
        <div className="bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2">
          <p className="font-mono text-[10px] text-accent-red">
            SUPER_ADMIN accounts cannot be modified via this interface.
          </p>
        </div>
      )}

      {!isSuperAdmin && (
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
                <button
                  key={r}
                  onClick={() => { setRole(r); if (!DISTRICT_REQUIRED_ROLES.includes(r)) setDistrictId(''); }}
                  className={`font-mono text-[10px] py-2 px-2 rounded border transition-all ${
                    role === r ? ROLE_COLORS[r] : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {(needsDistrict || districtId) && (
            <div>
              <label className="label">
                District {needsDistrict && <span className="text-accent-red">*</span>}
              </label>
              <select value={districtId} onChange={e => setDistrictId(e.target.value)} className="input">
                <option value="">No district</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between bg-bg-elevated rounded-lg border border-bg-border px-4 py-3">
            <div>
              <p className="font-sans text-sm text-text-primary">Account Active</p>
              <p className="font-mono text-[10px] text-text-muted">
                Inactive users cannot log in. Data is preserved.
              </p>
            </div>
            <button
              onClick={() => {
                if (isSelf) { onError("You cannot deactivate your own account."); return; }
                setActive(v => !v);
              }}
              // Use flex and items-center to vertically center the dot automatically
              className={`relative w-11 h-6 rounded-full border transition-all duration-200 flex-shrink-0 flex items-center px-0.5 ${
                active
                  ? 'bg-accent-green/20 border-accent-green/40 justify-end'
                  : 'bg-bg-primary border-bg-border justify-start'
              }`}
            >
              <span className={`w-5 h-5 rounded-full transition-all duration-200 ${
                active ? 'bg-accent-green' : 'bg-text-muted'
              }`} />
            </button>
          </div>
          {isSelf && (
            <p className="font-mono text-[10px] text-accent-orange -mt-2">
              You cannot deactivate your own account.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !email.trim() || (needsDistrict && !districtId)}
            className="btn-primary w-full"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Divider */}
          <div className="border-t border-bg-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-sans text-sm font-medium text-text-primary">Reset Password</p>
                <p className="font-mono text-[10px] text-text-muted">Admin override — no current password needed</p>
              </div>
              <button
                onClick={() => setResetMode(v => !v)}
                className="font-mono text-xs text-accent-orange hover:text-accent-orange/80 transition-colors"
              >
                {resetMode ? 'Cancel' : 'Reset →'}
              </button>
            </div>

            {resetMode && (
              <div className="space-y-3 animate-slide-in">
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    className="input pr-16"
                    placeholder="New temporary password (min. 8 chars)"
                    value={newTempPwd}
                    onChange={e => setNewTempPwd(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted hover:text-text-primary"
                  >
                    {showNewPwd ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <button
                  onClick={handleResetPassword}
                  disabled={resetLoading || newTempPwd.length < 8}
                  className="btn-ghost w-full text-accent-orange border-accent-orange/30 hover:bg-accent-orange/10"
                >
                  {resetLoading ? 'Resetting...' : 'Confirm Password Reset'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [filterRole, setFilterRole] = useState<Role | ''>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  // Panel state
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Current user (from localStorage — same pattern as rest of app)
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('rema_user');
      return raw ? JSON.parse(raw) as { id: string } : null;
    } catch { return null; }
  })();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterRole) params.role = filterRole;
      if (filterActive !== 'all') params.active = filterActive === 'active' ? 'true' : 'false';

      const [usersRes, districtsRes] = await Promise.all([
        api.get('/api/users', { params }),
        api.get('/api/districts'),
      ]);
      setUsers(usersRes.data);
      setDistricts(districtsRes.data.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterActive]);

  useEffect(() => { loadData(); }, [loadData]);

  // Client-side search filter
  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.district?.name?.toLowerCase().includes(q)
    );
  });

  // Stats
  const totalActive = users.filter(u => u.active).length;
  const totalInactive = users.filter(u => !u.active).length;
  const byRole = CREATABLE_ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {} as Record<Role, number>);

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-5">

        {/* ── Notifications ── */}
        {error && <ErrorBox msg={error} onDismiss={() => setError('')} />}
        {success && <SuccessBox msg={success} onDismiss={() => setSuccess('')} />}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Total</p>
            <p className="font-mono text-2xl font-bold text-text-primary">{users.length}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Active</p>
            <p className="font-mono text-2xl font-bold text-accent-green">{totalActive}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">Inactive</p>
            <p className="font-mono text-2xl font-bold text-text-muted">{totalInactive}</p>
          </div>
          {CREATABLE_ROLES.slice(0, 3).map(r => (
            <div key={r} className="card px-4 py-3">
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">
                {ROLE_LABELS[r].split(' ')[0]}
              </p>
              <p className={`font-mono text-2xl font-bold ${ROLE_COLORS[r].split(' ')[0]}`}>
                {byRole[r] ?? 0}
              </p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Role filter */}
            <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 border border-bg-border">
              {ALL_FILTER_ROLES.map(r => (
                <button
                  key={r || 'all'}
                  onClick={() => setFilterRole(r)}
                  className={`font-mono text-[10px] px-2.5 py-1 rounded transition-all ${
                    filterRole === r
                      ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {r ? ROLE_LABELS[r as Role].split(' ')[0].toUpperCase() : 'ALL'}
                </button>
              ))}
            </div>

            {/* Active filter */}
            <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 border border-bg-border">
              {(['all', 'active', 'inactive'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterActive(f)}
                  className={`font-mono text-[10px] px-2.5 py-1 rounded transition-all capitalize ${
                    filterActive === f
                      ? 'bg-bg-primary text-text-primary border border-bg-border shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <input
              type="text"
              className="input text-xs py-1.5 w-48"
              placeholder="Search name, email, district..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => { setEditingUser(null); setShowCreate(v => !v); }}
              className={`btn-primary text-xs py-1.5 px-4 flex-shrink-0 ${showCreate ? 'opacity-60' : ''}`}
            >
              {showCreate ? '✕ Cancel' : '+ New User'}
            </button>
          </div>
        </div>

        {/* ── Create panel (collapsible) ── */}
        {showCreate && (
          <CreateUserPanel
            districts={districts}
            onSuccess={msg => { setSuccess(msg); setShowCreate(false); }}
            onError={msg => setError(msg)}
            onRefresh={loadData}
          />
        )}

        {/* ── Edit panel ── */}
        {editingUser && (
          <EditUserPanel
            user={editingUser}
            districts={districts}
            currentUserId={currentUser?.id ?? ''}
            onSuccess={msg => setSuccess(msg)}
            onError={msg => setError(msg)}
            onClose={() => setEditingUser(null)}
            onRefresh={loadData}
          />
        )}

        {/* ── User table ── */}
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <p className="font-mono text-xs text-text-muted animate-pulse">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-mono text-xs text-text-muted">
                {search ? `No users matching "${search}".` : 'No users found.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-border">
                  {['Name', 'Email', 'Role', 'District', 'Status', 'Created', 'Actions'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left font-mono text-[10px] text-text-muted uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr
                    key={u.id}
                    className={`border-b border-bg-border transition-colors ${
                      !u.active
                        ? 'opacity-50 bg-bg-elevated/30'
                        : 'hover:bg-bg-elevated/40'
                    }`}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-sans text-sm text-text-primary whitespace-nowrap">{u.name}</p>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-text-secondary">{u.email}</p>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <Badge label={ROLE_LABELS[u.role]} color={ROLE_COLORS[u.role]} />
                    </td>

                    {/* District */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-text-muted">
                        {u.district?.name ?? <span className="text-text-muted/40">—</span>}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {u.active ? (
                        <Badge label="ACTIVE" color="text-accent-green border-accent-green/30 bg-accent-green/5" />
                      ) : (
                        <Badge label="INACTIVE" color="text-text-muted border-bg-border bg-bg-elevated" />
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-[10px] text-text-muted">{timeAgo(u.createdAt)}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {u.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => {
                            setShowCreate(false);
                            setEditingUser(editingUser?.id === u.id ? null : u);
                          }}
                          className={`font-mono text-xs transition-colors ${
                            editingUser?.id === u.id
                              ? 'text-accent-blue'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {editingUser?.id === u.id ? 'Editing ↑' : 'Edit →'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table footer */}
          {!loading && filteredUsers.length > 0 && (
            <div className="px-4 py-2 border-t border-bg-border">
              <p className="font-mono text-[10px] text-text-muted">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
                {' · '}Per REMA policy: accounts are deactivated, never deleted. Audit trail preserved.
              </p>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}