import { useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Avatar } from '../components/Avatar';
import { DashboardLayout } from '../components/DashboardLayout';
import { usePageTitle } from '../hooks/usePageTitle';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:           'Super Admin',
  EMERGENCY_COORDINATOR: 'Emergency Coordinator',
  HUB_MANAGER:           'Hub Manager',
  VOLUNTEER:             'Volunteer',
  VIEWER:                'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:           'text-accent-red   bg-accent-red/10   border-accent-red/20',
  EMERGENCY_COORDINATOR: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20',
  HUB_MANAGER:           'text-accent-blue  bg-accent-blue/10  border-accent-blue/20',
  VOLUNTEER:             'text-accent-green bg-accent-green/10 border-accent-green/20',
  VIEWER:                'text-text-muted   bg-bg-secondary    border-bg-border',
};

// ─── inline editable field ────────────────────────────────────────────────────

interface EditableFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (val: string) => Promise<void>;
  locked?: boolean;
  lockedReason?: string;
  type?: string;
}

function EditableField({
  label, value, placeholder, onSave, locked, lockedReason, type = 'text',
}: EditableFieldProps) {
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(value);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (locked) return;
    setDraft(value);
    setError('');
    setSuccess(false);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancel() {
    setEditing(false);
    setError('');
    setDraft(value);
  }

  async function save() {
    if (draft.trim() === value.trim()) { setEditing(false); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(draft.trim());
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  await save();
    if (e.key === 'Escape') cancel();
  }

  return (
    <div className="group py-3 border-b border-bg-border last:border-0">
      <div className="flex items-center justify-between gap-3">
        {/* label */}
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted w-24 shrink-0">
          {label}
        </span>

        {/* value / input */}
        {editing ? (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            placeholder={placeholder}
            className="input flex-1 py-1 text-sm"
          />
        ) : (
          <span className="flex-1 font-mono text-sm text-text-primary truncate">
            {value || <span className="text-text-muted italic">{placeholder || 'Not set'}</span>}
          </span>
        )}

        {/* actions */}
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="font-mono text-[10px] text-accent-green hover:text-accent-green/80 transition-colors px-2 py-1 rounded bg-accent-green/10 border border-accent-green/20"
              >
                {saving ? 'saving...' : 'save'}
              </button>
              <button
                onClick={cancel}
                disabled={saving}
                className="font-mono text-[10px] text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded bg-bg-secondary border border-bg-border"
              >
                cancel
              </button>
            </>
          ) : locked ? (
            <span className="font-mono text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              {lockedReason || 'admin only'}
            </span>
          ) : (
            <button
              onClick={startEdit}
              className="font-mono text-[10px] text-text-muted hover:text-accent-blue transition-colors opacity-0 group-hover:opacity-100 px-2 py-1 rounded hover:bg-accent-blue/10"
            >
              edit
            </button>
          )}
        </div>
      </div>

      {/* inline feedback */}
      {error && (
        <p className="font-mono text-[10px] text-accent-red mt-1 ml-[6.5rem]">{error}</p>
      )}
      {success && !editing && (
        <p className="font-mono text-[10px] text-accent-green mt-1 ml-[6.5rem]">saved</p>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function ProfilePage() {
  usePageTitle('My Profile');
  const { user, updateAvatar: ctxUpdateAvatar, updateProfile: ctxUpdateProfile } = useAuth();

  // password form state
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwError,    setPwError]    = useState('');
  const [pwSuccess,  setPwSuccess]  = useState('');
  const [pwLoading,  setPwLoading]  = useState(false);

  // avatar state
  const [avatarError,   setAvatarError]   = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── profile field save handlers ──────────────────────────────────────────

  async function saveName(name: string) {
    const updated = await authApi.updateProfile({ name });
    ctxUpdateProfile({ name: updated.name });
  }

  async function savePhone(phone: string) {
    const updated = await authApi.updateProfile({ phone: phone || null });
    ctxUpdateProfile({ phone: updated.phone });
  }

  // ── avatar upload ────────────────────────────────────────────────────────

  function handleAvatarClick() { fileInputRef.current?.click(); }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    setAvatarSuccess('');

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.');
      return;
    }

    setAvatarLoading(true);
    try {
      const base64 = await resizeImage(file, 128);
      await authApi.updateAvatar(base64);
      ctxUpdateAvatar(base64);
      setAvatarSuccess('Profile picture updated.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to upload image.';
      setAvatarError(message);
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── password change ──────────────────────────────────────────────────────

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPw.length < 8)        { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw)      { setPwError('Passwords do not match.'); return; }
    if (newPw === currentPw)      { setPwError('New password must differ from current.'); return; }

    setPwLoading(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwSuccess('Password updated successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to change password.';
      setPwError(message);
    } finally {
      setPwLoading(false);
    }
  }

  // ── member since ─────────────────────────────────────────────────────────

  // user object from localStorage doesn't carry createdAt, so we omit it gracefully
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? ROLE_COLORS['VIEWER'];
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role;

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-xl space-y-4">

        {/* ── identity card ─────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">

          {/* avatar strip */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-bg-border">
            {/* clickable avatar */}
            <div className="relative group shrink-0 cursor-pointer" onClick={handleAvatarClick}>
              <Avatar name={user?.name} avatarBase64={user?.avatarBase64} size="lg" />
              <div className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                <span className="font-mono text-[9px] text-white leading-tight text-center px-1">
                  {avatarLoading ? '...' : 'change\nphoto'}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="font-sans text-base font-semibold text-text-primary leading-tight truncate">
                {user?.name}
              </p>
              <p className="font-mono text-xs text-text-muted mt-0.5 truncate">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${roleColor}`}>
                  {roleLabel}
                </span>
                {user?.districtId && (
                  <span className="font-mono text-[10px] text-text-muted bg-bg-secondary border border-bg-border px-2 py-0.5 rounded">
                    {user.districtId}
                  </span>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* avatar feedback */}
          {(avatarError || avatarSuccess) && (
            <div className={`px-6 py-2 border-b border-bg-border ${avatarError ? 'bg-accent-red/5' : 'bg-accent-green/5'}`}>
              <p className={`font-mono text-[10px] ${avatarError ? 'text-accent-red' : 'text-accent-green'}`}>
                {avatarError || avatarSuccess}
              </p>
            </div>
          )}

          {/* editable fields */}
          <div className="px-6 pt-1 pb-2">
            <EditableField
              label="Name"
              value={user?.name ?? ''}
              placeholder="Your name"
              onSave={saveName}
            />
            <EditableField
              label="Phone"
              value={user?.phone ?? ''}
              placeholder="e.g. +855 12 345 678"
              type="tel"
              onSave={savePhone}
            />
            <EditableField
              label="Email"
              value={user?.email ?? ''}
              locked
              lockedReason="contact admin to change"
              onSave={async () => {}}
            />
          </div>

          {/* footer note */}
          {/* <div className="px-6 py-3 border-t border-bg-border bg-bg-secondary/40">
            <p className="font-mono text-[10px] text-text-muted">
              Hover a field and click <span className="text-text-secondary">edit</span> to update.
              Role and district are managed by your SUPER_ADMIN.
            </p>
          </div> */}
        </div>

        {/* ── change password ───────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-bg-border">
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest">
              Change Password
            </h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="label" htmlFor="current">Current Password</label>
              <input id="current" type="password" className="input" placeholder="••••••••"
                value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                required disabled={pwLoading} autoComplete="current-password" />
            </div>
            <div>
              <label className="label" htmlFor="new">New Password</label>
              <input id="new" type="password" className="input" placeholder="Minimum 8 characters"
                value={newPw} onChange={e => setNewPw(e.target.value)}
                required disabled={pwLoading} autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm New Password</label>
              <input id="confirm" type="password" className="input" placeholder="Repeat new password"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                required disabled={pwLoading} autoComplete="new-password" />
            </div>

            {pwError && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
                <p className="font-mono text-xs text-accent-red">{pwError}</p>
              </div>
            )}
            {pwSuccess && (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-2">
                <p className="font-mono text-xs text-accent-green">{pwSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="btn-primary"
            >
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}

// ─── resize helper ────────────────────────────────────────────────────────────

function resizeImage(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;
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