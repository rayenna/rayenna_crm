import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearToken, loginWithEmailPassword, setToken } from '../lib/apiClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as any)?.from?.pathname && (location.state as any).from.pathname !== '/login'
      ? (location.state as any).from.pathname
      : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      clearToken();
      const result = await loginWithEmailPassword(email, password);
      setToken(result.token);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-500 px-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-slate-200 px-6 py-8 space-y-6">
        <header className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-amber-300 font-bold shadow-md">
            PE
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Proposal Engine Login
          </h1>
          <p className="text-sm text-slate-600">
            Sign in with your existing Rayenna CRM credentials.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:ring-offset-0 outline-none"
              placeholder="you@rayenna.in"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:ring-offset-0 outline-none"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-md hover:bg-amber-400 disabled:bg-amber-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-500">
          Forgot your password? Use the password reset flow in the main CRM.
        </p>
      </div>
    </div>
  );
}

