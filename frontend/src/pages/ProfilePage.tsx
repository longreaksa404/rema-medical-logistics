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

export function ProfilePage() {
  usePageTitle('My Profile');
  const { user, updateAvatar: ctxUpdateAvatar } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [pwError,         setPwError]         = useState('');
  const [pwSuccess,       setPwSuccess]       = useState('');
  const [pwLoading,       setPwLoading]       = useState(false);

  const [avatarError,   setAvatarError]   = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Avatar upload ──────────────────────────────────────────────────────────

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

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
      // resize to 128x128 before base64 encoding — keeps payload small
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
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Password change ────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setPwError('Passwords do not match.'); return; }
    if (newPassword === currentPassword) { setPwError('New password must differ from current.'); return; }

    setPwLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwSuccess('Password updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to change password.';
      setPwError(message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-xl space-y-6">

        {/* avatar + account info */}
        <div className="card p-6">
          <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-5">
            Account
          </h2>

          {/* avatar upload area */}
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-bg-border">
            <div className="relative group">
              <Avatar name={user?.name} avatarBase64={user?.avatarBase64} size="lg" />
              <button
                onClick={handleAvatarClick}
                disabled={avatarLoading}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center"
              >
                <span className="font-mono text-[10px] text-white">
                  {avatarLoading ? '...' : 'change'}
                </span>
              </button>
            </div>
            <div>
              <p className="font-sans text-base font-semibold text-text-primary">{user?.name}</p>
              <p className="font-mono text-xs text-text-muted mt-0.5">{user?.email}</p>
              <p className="font-mono text-[10px] text-text-muted mt-2">
                Click the avatar to upload a new photo.
              </p>
              {avatarError && (
                <p className="font-mono text-[10px] text-accent-red mt-1">{avatarError}</p>
              )}
              {avatarSuccess && (
                <p className="font-mono text-[10px] text-accent-green mt-1">{avatarSuccess}</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* account fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-bg-border">
              <span className="font-mono text-xs text-text-muted">Role</span>
              <span className="font-mono text-xs text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </span>
            </div>
            {user?.districtId && (
              <div className="flex items-center justify-between py-2">
                <span className="font-mono text-xs text-text-muted">District</span>
                <span className="font-mono text-xs text-text-secondary">{user.districtId}</span>
              </div>
            )}
          </div>
          <p className="font-mono text-[10px] text-text-muted mt-4">
            To update your name or email contact your SUPER_ADMIN.
          </p>
        </div>

        {/* change password */}
        <div className="card p-6">
          <h2 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">
            Change Password
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="current">Current Password</label>
              <input id="current" type="password" className="input" placeholder="••••••••"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                required disabled={pwLoading} autoComplete="current-password" />
            </div>
            <div>
              <label className="label" htmlFor="new">New Password</label>
              <input id="new" type="password" className="input" placeholder="Minimum 8 characters"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                required disabled={pwLoading} autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm New Password</label>
              <input id="confirm" type="password" className="input" placeholder="Repeat new password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
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
            <button type="submit"
              disabled={pwLoading || !currentPassword || !newPassword || !confirm}
              className="btn-primary">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}

// ── Image resize helper ────────────────────────────────────────────────────────
// draws to canvas at target size before base64 encoding

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
      // crop to square from center
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