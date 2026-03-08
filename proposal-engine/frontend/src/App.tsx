import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerWorkspace from './pages/CustomerWorkspace';
import CostingSheet from './pages/CostingSheet';
import BOMSheet from './pages/BOMSheet';
import ROICalculator from './pages/ROICalculator';
import ProposalPreview from './pages/ProposalPreview';
import HelpPage from './pages/HelpPage';
import AboutPage from './pages/AboutPage';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import { getToken, getApiBaseUrl, setToken, setUserId, setUserRole, setUserName } from './lib/apiClient';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Guard so only one SSO exchange runs (React Strict Mode runs effects twice in dev; ticket is one-time)
let ssoExchangeStarted = false;

/** SSO: exchange one-time ticket for JWT and remove ticket from URL. Runs once on load. */
function useSsoTicketExchange() {
  // If ticket is in URL on first paint, start as 'exchanging' so we never render RequireAuth before exchange completes
  const [status, setStatus] = useState<'idle' | 'exchanging' | 'done'>(() => {
    if (typeof window === 'undefined') return 'idle';
    const params = new URLSearchParams(window.location.search);
    return params.get('ticket') ? 'exchanging' : 'idle';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get('ticket');
    if (!ticket) {
      setStatus('done');
      return;
    }
    if (ssoExchangeStarted) return; // Strict Mode second run: leave status as-is, first run's fetch will finish
    ssoExchangeStarted = true;
    const base = getApiBaseUrl();
    const url = base ? `${base}/api/auth/sso-ticket/exchange` : '/api/auth/sso-ticket/exchange';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
      credentials: 'include',
    })
      .then(async (res) => {
        if (res.ok) return res.json();
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error || res.statusText || `HTTP ${res.status}`;
        return Promise.reject(new Error(msg));
      })
      .then((data: { token: string; user?: { id: string; email?: string; name?: string; role?: string } }) => {
        setToken(data.token);
        if (data.user) {
          setUserId(data.user.id);
          if (data.user.role) setUserRole(data.user.role);
          if (data.user.name) setUserName(data.user.name);
        }
        const keep = new URLSearchParams();
        const openProjectId = params.get('openProjectId');
        if (openProjectId) keep.set('openProjectId', openProjectId);
        const newSearch = keep.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[SSO] Ticket exchange failed:', err?.message ?? err);
        }
        const keep = new URLSearchParams();
        params.forEach((v, k) => { if (k !== 'ticket') keep.set(k, v); });
        const newSearch = keep.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      })
      .finally(() => setStatus('done'));
  }, []);

  return status;
}

export default function App() {
  const ssoStatus = useSsoTicketExchange();

  if (ssoStatus === 'exchanging') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary-600 font-medium">Signing you in…</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Customers />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/customers"
          element={
            <RequireAuth>
              <Customers />
            </RequireAuth>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <RequireAuth>
              <CustomerWorkspace />
            </RequireAuth>
          }
        />
        <Route
          path="/costing"
          element={
            <RequireAuth>
              <CostingSheet />
            </RequireAuth>
          }
        />
        <Route
          path="/bom"
          element={
            <RequireAuth>
              <BOMSheet />
            </RequireAuth>
          }
        />
        <Route
          path="/roi"
          element={
            <RequireAuth>
              <ROICalculator />
            </RequireAuth>
          }
        />
        <Route
          path="/proposal"
          element={
            <RequireAuth>
              <ProposalPreview />
            </RequireAuth>
          }
        />
        <Route
          path="/help"
          element={
            <RequireAuth>
              <HelpPage />
            </RequireAuth>
          }
        />
        <Route
          path="/about"
          element={
            <RequireAuth>
              <AboutPage />
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={
            <RequireAuth>
              <NotFound />
            </RequireAuth>
          }
        />
      </Routes>
    </Layout>
  );
}
