import { useState, useRef, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Avatar } from '../components/Avatar';
import { DashboardLayout } from '../components/DashboardLayout';
import { usePageTitle } from '../hooks/usePageTitle';

// ─── constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:           'Super Admin',
  EMERGENCY_COORDINATOR: 'Emergency Coordinator',
  HUB_MANAGER:           'Hub Manager',
  VOLUNTEER:             'Volunteer',
  VIEWER:                'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:           'text-accent-red    bg-accent-red/10    border-accent-red/30',
  EMERGENCY_COORDINATOR: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/30',
  HUB_MANAGER:           'text-accent-blue   bg-accent-blue/10   border-accent-blue/30',
  VOLUNTEER:             'text-accent-green  bg-accent-green/10  border-accent-green/30',
  VIEWER:                'text-text-muted    bg-bg-secondary     border-bg-border',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function resizeImage(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      const min = Math.min(img.width, img.height);
      const sx  = (img.width  - min) / 2;
      const sy  = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// ─── editable field ───────────────────────────────────────────────────────────

interface EditableFieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder?: string;
  onSave: (val: string) => Promise<void>;
  locked?: boolean;
  lockedReason?: string;
  type?: string;
}

function EditableField({
  label, icon, value, placeholder, onSave, locked, lockedReason, type = 'text',
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (locked) return;
    setDraft(value); setError(''); setSuccess(false); setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancel() { setEditing(false); setError(''); setDraft(value); }

  async function save() {
    if (draft.trim() === value.trim()) { setEditing(false); return; }
    setSaving(true); setError('');
    try {
      await onSave(draft.trim());
      setSuccess(true); setEditing(false);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save'
      );
    } finally { setSaving(false); }
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  await save();
    if (e.key === 'Escape') cancel();
  }

  return (
    <div className="group border-b border-bg-border last:border-0">
      <div className="flex items-center gap-4 py-3.5 px-6">
        <span className="text-text-muted text-sm w-4 shrink-0 text-center select-none">{icon}</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-text-muted w-14 shrink-0">
          {label}
        </span>
        {editing ? (
          <input
            ref={inputRef} type={type} value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown} disabled={saving}
            placeholder={placeholder} className="input flex-1 py-1 text-sm"
          />
        ) : (
          <span className={`flex-1 font-mono text-sm truncate ${value ? 'text-text-primary' : 'text-text-muted italic text-xs'}`}>
            {value || placeholder || 'Not set'}
          </span>
        )}
        <div className="flex items-center gap-2 shrink-0 min-w-[90px] justify-end">
          {editing ? (
            <>
              <button onClick={save} disabled={saving}
                className="font-mono text-[9px] text-accent-green px-2 py-1 rounded bg-accent-green/10 border border-accent-green/20">
                {saving ? '...' : 'save'}
              </button>
              <button onClick={cancel} disabled={saving}
                className="font-mono text-[9px] text-text-muted px-2 py-1 rounded bg-bg-secondary border border-bg-border">
                cancel
              </button>
            </>
          ) : locked ? (
            <span className="font-mono text-[9px] text-text-muted opacity-0 group-hover:opacity-50 transition-opacity text-right leading-tight">
              {lockedReason || 'admin only'}
            </span>
          ) : (
            <button onClick={startEdit}
              className="font-mono text-[9px] text-text-muted hover:text-accent-blue opacity-0 group-hover:opacity-100 px-2 py-1 rounded hover:bg-accent-blue/10 transition-all">
              edit
            </button>
          )}
        </div>
      </div>
      {error   && <p className="font-mono text-[9px] text-accent-red   pb-2 px-6 ml-[84px]">{error}</p>}
      {success && !editing && <p className="font-mono text-[9px] text-accent-green pb-2 px-6 ml-[84px]">saved</p>}
    </div>
  );
}

// ─── section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-6 py-3 border-b border-bg-border bg-bg-secondary/60 flex items-center gap-2">
      <div className="w-0.5 h-3 bg-accent-blue rounded-full shrink-0" />
      <span className="font-mono text-[9px] uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function ProfilePage() {
  usePageTitle('My Profile');
  const { user, updateAvatar: ctxUpdateAvatar, updateProfile: ctxUpdateProfile } = useAuth();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [avatarError,   setAvatarError]   = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveName = useCallback(async (name: string) => {
    const updated = await authApi.updateProfile({ name });
    ctxUpdateProfile({ name: updated.name });
  }, [ctxUpdateProfile]);

  const savePhone = useCallback(async (phone: string) => {
    const updated = await authApi.updateProfile({ phone: phone || null });
    ctxUpdateProfile({ phone: updated.phone });
  }, [ctxUpdateProfile]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(''); setAvatarSuccess('');
    if (!file.type.startsWith('image/')) { setAvatarError('Please select an image file.'); return; }
    setAvatarLoading(true);
    try {
      const base64 = await resizeImage(file, 128);
      await authApi.updateAvatar(base64);
      ctxUpdateAvatar(base64);
      setAvatarSuccess('Profile picture updated.');
      setTimeout(() => setAvatarSuccess(''), 2500);
    } catch (err: unknown) {
      setAvatarError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to upload image.'
      );
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPw.length < 8)    { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw === currentPw) { setPwError('New password must differ from current.'); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwSuccess('Password updated successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      setPwError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to change password.'
      );
    } finally { setPwLoading(false); }
  }

  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? ROLE_COLORS['VIEWER'];
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role;

  return (
    <DashboardLayout title="My Profile">
      <div className="flex flex-col gap-4 w-[60%] mx-auto">

        {/* ── PROFILE CARD ─────────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">

          {/* horizontal hero — avatar left, identity + stats right */}
          <div className="flex gap-8 px-8 py-7 border-b border-bg-border">

            {/* avatar */}
            <div
              className="relative group/avatar shrink-0 cursor-pointer self-center"
              onClick={() => fileInputRef.current?.click()}
              title="Change profile picture"
            >
              <Avatar name={user?.name} avatarBase64={user?.avatarBase64} size="xl" />
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-white">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
                  <path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                </svg>
                <span className="font-mono text-[9px] text-white/80">
                  {avatarLoading ? 'uploading...' : 'change photo'}
                </span>
              </div>
              <div className="absolute inset-[-4px] rounded-full border border-dashed border-accent-blue/30 pointer-events-none" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* identity + stats */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-4">

              {/* name, email, role badge */}
              <div>
                <p className="font-sans text-xl font-semibold text-text-primary leading-tight truncate">
                  {user?.name}
                </p>
                <p className="font-mono text-xs text-text-muted mt-1 truncate">{user?.email}</p>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className={`font-mono text-[10px] px-2.5 py-0.5 rounded border ${roleColor}`}>
                    {roleLabel}
                  </span>
                  {user?.districtId && (
                    <span className="font-mono text-[10px] text-text-muted bg-bg-secondary border border-bg-border px-2.5 py-0.5 rounded">
                      {user.districtId}
                    </span>
                  )}
                </div>
                {avatarError   && <p className="font-mono text-[10px] text-accent-red   mt-2">{avatarError}</p>}
                {avatarSuccess && <p className="font-mono text-[10px] text-accent-green mt-2">{avatarSuccess}</p>}
              </div>

              {/* stats row — inline with identity */}
              <div className="grid grid-cols-3 divide-x divide-bg-border border border-bg-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 flex flex-col">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-1">Member since</p>
                  <p className="font-mono text-xs text-text-primary">{formatDate(user?.createdAt)}</p>
                </div>
                <div className="px-4 py-3 flex flex-col">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-1">Last login</p>
                  <p className="font-mono text-xs text-text-primary">{formatDateTime(user?.lastLoginAt)}</p>
                </div>
                <div className="px-4 py-3 flex flex-col">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-1">Status</p>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full self-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse shrink-0" />
                    Active
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* editable fields */}
          <EditableField
            label="Name" icon="◉"
            value={user?.name ?? ''} placeholder="Your name"
            onSave={saveName}
          />
          <EditableField
            label="Phone" icon="◈"
            value={user?.phone ?? ''} placeholder="+855 12 345 678"
            onSave={savePhone} type="tel"
          />
          <EditableField
            label="Email" icon="◎"
            value={user?.email ?? ''}
            locked lockedReason={user?.role === 'SUPER_ADMIN' ? undefined : 'contact admin to change'}
            onSave={async () => {}}
          />

          <div className="px-6 py-2.5 bg-bg-secondary/40 border-t border-bg-border">
            <p className="font-mono text-[9px] text-text-muted">
              Hover a field and click <span className="text-text-secondary">edit</span> to update.
              Role and district are managed by Super Admin.
            </p>
          </div>
        </div>

        {/* ── PASSWORD CARD ─────────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <SectionHeader label="Change Password" />
          <form onSubmit={handlePasswordSubmit} className="px-8 py-6">

            {/* all 3 password fields in one row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label" htmlFor="current">Current Password</label>
                <input id="current" type="password" className="input" placeholder="••••••••"
                  value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  required disabled={pwLoading} autoComplete="current-password" />
              </div>
              <div>
                <label className="label" htmlFor="new">New Password</label>
                <input id="new" type="password" className="input" placeholder="Min. 8 characters"
                  value={newPw} onChange={e => setNewPw(e.target.value)}
                  required disabled={pwLoading} autoComplete="new-password" />
              </div>
              <div>
                <label className="label" htmlFor="confirm">Confirm New</label>
                <input id="confirm" type="password" className="input" placeholder="Repeat password"
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  required disabled={pwLoading} autoComplete="new-password" />
              </div>
            </div>

            {/* hint + button row */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2.5 bg-bg-secondary/60 border border-bg-border rounded px-3.5 py-2.5 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-text-muted shrink-0">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" />
                  <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
                  <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
                </svg>
                <p className="font-mono text-[10px] text-text-muted leading-relaxed">
                  Min. 8 characters, different from current password.
                </p>
              </div>
              <button
                type="submit"
                disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                className="btn-primary shrink-0 px-8"
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            {pwError && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded px-4 py-2.5 mt-3">
                <p className="font-mono text-[10px] text-accent-red">{pwError}</p>
              </div>
            )}
            {pwSuccess && (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded px-4 py-2.5 mt-3">
                <p className="font-mono text-[10px] text-accent-green">{pwSuccess}</p>
              </div>
            )}

          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}