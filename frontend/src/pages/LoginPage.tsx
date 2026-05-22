import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export function LoginPage() {
  usePageTitle('Login');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // redirect already-logged-in users — but only on mount, not after login
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // empty deps — only runs on mount, never after login state changes

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const mustChange = await login(email.trim(), password);
      if (mustChange) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed. Check your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#58a6ff 1px, transparent 1px), linear-gradient(90deg, #58a6ff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow" />
            <span className="font-mono text-xs text-text-muted tracking-widest uppercase">
              System Online
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

          <h1 className="text-3xl font-sans font-extrabold text-text-primary tracking-tight mb-1">
            REMA
          </h1>
          <p className="font-mono text-xs text-text-muted">
            Rapid Emergency Medical Access
          </p>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            Viet Nam Red Cross
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
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
              Password
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
              <span className="font-mono">authenticating...</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-bg-border text-center">
          <p className="font-mono text-xs text-text-muted">
            Access restricted to authorised Red Cross personnel.
          </p>
          <p className="font-mono text-xs text-text-muted mt-1">
            Contact your Emergency Coordinator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}