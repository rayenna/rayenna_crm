import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearToken, loginWithEmailPassword, setToken, setUserId, setUserRole, setUserName } from '../lib/apiClient';
import { AlertCard } from '../components/AlertCard';

const bgImageUrl = new URL('../assets/background.jpg', import.meta.url).href;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as any)?.from;
  const from =
    fromLocation && fromLocation.pathname && fromLocation.pathname !== '/login'
      ? `${fromLocation.pathname}${fromLocation.search ?? ''}`
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
      setUserId(result.user.id);
      setUserRole(result.user.role);
      setUserName(result.user.name || result.user.email);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900/70 bg-blend-multiply"
      style={{
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-slate-200 px-6 py-6 sm:py-8 space-y-6">
        <header className="space-y-3 text-center">
          <div className="flex justify-center items-center py-4 sm:py-6 px-2">
            <img
              src="/Proposals_Logo.jpg"
              alt="Proposal Engine"
              className="h-36 sm:h-40 md:h-44 w-auto max-w-[85vw] object-contain mx-auto drop-shadow-lg"
            />
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Sign in with your existing Rayenna CRM credentials.
          </p>
        </header>

        {error && (
          <AlertCard
            variant="error"
            title="Login failed"
            message={error}
          />
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

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            Forgot your Password? Contact your administrator
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            By signing in, you acknowledge and agree to the Credits, Copyright, intellectual property and Terms of Usage of this product. Refer the About section to know more
          </p>
        </div>
      </div>
    </div>
  );
}


