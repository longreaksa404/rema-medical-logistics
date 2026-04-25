import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { DashboardLayout } from '../components/DashboardLayout';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to change password.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardLayout title="Change Password">
      <div className="max-w-md">
        <div className="card p-6">
          <p className="font-mono text-xs text-text-muted mb-6">
            Use this form to update your password. You must know your current password.
            Contact your SUPER_ADMIN if you are locked out.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="current">
                Current Password
              </label>
              <input
                id="current"
                type="password"
                className="input"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="label" htmlFor="new">
                New Password
              </label>
              <input
                id="new"
                type="password"
                className="input"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="label" htmlFor="confirm">
                Confirm New Password
              </label>
              <input
                id="confirm"
                type="password"
                className="input"
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 animate-slide-in">
                <p className="font-mono text-xs text-accent-red">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-2 animate-slide-in">
                <p className="font-mono text-xs text-accent-green">{success}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading || !currentPassword || !newPassword || !confirm}
                className="btn-primary"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-ghost"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}