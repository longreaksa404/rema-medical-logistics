import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n } from '../i18n';
import { PreferenceToggles } from '../components/PreferenceToggles';

export function LoginPage() {
  const { t } = useI18n();
  usePageTitle(t('login.title'));
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('login.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--accent-blue)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--accent-blue)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="absolute top-4 right-4">
        <PreferenceToggles />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow" />
            <span className="font-mono text-xs text-text-muted tracking-widest uppercase">
              {t('login.systemOnline')}
            </span>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/rema_logo_new.svg"
              alt="REMA"
              className="h-20 w-20"
            />
          </div>

          <h1 className="text-3xl font-display font-extrabold text-text-primary tracking-tight mb-1">
            REMA
          </h1>
          <p className="font-mono text-xs text-text-muted">
            {t('app.fullName')}
          </p>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            {t('login.org')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="coordinator@rema.kh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2 animate-slide-in">
              <p className="font-mono text-xs text-accent-red">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="btn-primary w-full mt-2"
          >
            {isLoading ? (
              <span className="font-mono">{t('login.authenticating')}</span>
            ) : (
              t('login.signIn')
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-bg-border text-center">
          <p className="font-mono text-xs text-text-muted">
            {t('login.restricted')}
          </p>
          <p className="font-mono text-xs text-text-muted mt-1">
            {t('login.contact')}
          </p>
        </div>
      </div>
    </div>
  );
}