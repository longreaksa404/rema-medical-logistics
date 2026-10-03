import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n } from '../i18n';

export function ChangePasswordPage() {
  const { t } = useI18n();
  usePageTitle(t('password.title'));
  const navigate = useNavigate();
  const { mustChangePassword, clearMustChangePassword } = useAuth();

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
      setError(t('password.errTooShort'));
      return;
    }
    if (newPassword !== confirm) {
      setError(t('password.errMismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t('password.errSame'));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      clearMustChangePassword();
      setSuccess(t('password.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('password.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardLayout title={t('password.title')}>
      <div className="max-w-md">
        {/* warning banner for forced change */}
        {mustChangePassword && (
          <div className="mb-4 bg-accent-yellow/10 border border-accent-yellow/30 rounded px-4 py-3">
            <p className="font-mono text-xs text-accent-yellow font-semibold">
              {t('password.requiredTitle')}
            </p>
            <p className="font-mono text-xs text-text-muted mt-1">
              {t('password.requiredBody')}
            </p>
          </div>
        )}

        <div className="card p-6">
          <p className="font-mono text-xs text-text-muted mb-6">
            {t('password.intro')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="current">{t('password.current')}</label>
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
              <label className="label" htmlFor="new">{t('password.new')}</label>
              <input
                id="new"
                type="password"
                className="input"
                placeholder={t('password.minPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="label" htmlFor="confirm">{t('password.confirm')}</label>
              <input
                id="confirm"
                type="password"
                className="input"
                placeholder={t('password.repeatPlaceholder')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
                <p className="font-mono text-xs text-accent-red">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-2">
                <p className="font-mono text-xs text-accent-green">{success}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading || !currentPassword || !newPassword || !confirm}
                className="btn-primary"
              >
                {isLoading ? t('password.updating') : t('password.update')}
              </button>
              {/* only show cancel if not a forced change */}
              {!mustChangePassword && (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-ghost"
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}