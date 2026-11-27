import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedProposal } from '../lib/apiClient';
import { getApiBaseUrl, isTimeoutOrNetworkError } from '../lib/api/core';
import { PE_CUSTOM_LIST_STYLE_CSS } from '../lib/proposalEditorListStyles';
import { isPeProdApiConfigured, probePeHealthOk } from '../lib/peHealth';
import { ServerWakeupLoader } from '../components/serverWakeup';

/** Local/prod preview: `/share/:token?wakeup=1` forces the cold-start animation. */
const PREVIEW_COLD_MS = 15_000;
const forceWakeupPreview =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('wakeup') === '1';

type ViewerStatus = 'probing' | 'waking' | 'loading' | 'password' | 'content' | 'expired' | 'error';

export default function SharedProposalViewer() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<ViewerStatus>('probing');
  const [html, setHtml] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wakeEpoch, setWakeEpoch] = useState(0);
  const pendingPasswordRef = useRef<string | undefined>(undefined);
  const loadInFlight = useRef(false);

  const load = useCallback(async (pwd?: string) => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid link.');
      return;
    }
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    setStatus('loading');
    setErrorMessage(null);
    try {
      const data = await getSharedProposal(token, pwd);
      setHtml(data.html);
      setRefNumber(data.refNumber ?? null);
      setStatus('content');
    } catch (err: unknown) {
      // Cold / flaky API after a warm probe — show wake UI instead of a dead blank/error.
      if (isTimeoutOrNetworkError(err) && (isPeProdApiConfigured() || forceWakeupPreview)) {
        pendingPasswordRef.current = pwd;
        setWakeEpoch((n) => n + 1);
        setStatus('waking');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to load proposal';
      setErrorMessage(msg);
      if (msg.toLowerCase().includes('password')) {
        setStatus('password');
      } else if (msg.toLowerCase().includes('expired')) {
        setStatus('expired');
      } else {
        setStatus('error');
      }
    } finally {
      loadInFlight.current = false;
    }
  }, [token]);

  const startAfterWake = useCallback(() => {
    const pwd = pendingPasswordRef.current;
    pendingPasswordRef.current = undefined;
    void load(pwd);
  }, [load]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid link.');
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      // Dev preview: always show the wake animation, then load.
      if (forceWakeupPreview) {
        if (!cancelled) setStatus('waking');
        return;
      }

      // Production share links: probe health first so a sleeping Render API
      // shows the wake animation instead of a blank spinner for ~90s.
      if (isPeProdApiConfigured()) {
        const awake = await probePeHealthOk();
        if (cancelled) return;
        if (!awake) {
          setStatus('waking');
          return;
        }
      }

      if (!cancelled) void load();
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, load]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void load(password);
  };

  if (status === 'waking') {
    return (
      <ServerWakeupLoader
        key={wakeEpoch}
        apiUrl={getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '')}
        healthEndpoint="/api/health"
        appMode="proposal"
        initialDelayMs={0}
        previewDelayMs={forceWakeupPreview ? PREVIEW_COLD_MS : 0}
        backgroundImageUrl="/background.jpg"
        onReady={startAfterWake}
      />
    );
  }

  if (status === 'password') {
    return (
      <div className="pe-force-light min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 max-w-md w-full">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Password required</h1>
          <p className="text-sm text-gray-600 mb-4">This proposal link is protected. Enter the password to view.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View proposal
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (status === 'expired' || status === 'error') {
    return (
      <div className="pe-force-light min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium">
            {status === 'expired' ? 'This link has expired.' : errorMessage ?? 'This link is invalid or has been removed.'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'probing' || status === 'loading') {
    return (
      <div className="pe-force-light min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'content' && html) {
    return (
      <div className="pe-force-light min-h-screen bg-gray-100 py-4 px-2 sm:px-4">
        <style>{`
          /* Hide interactive-only elements (buttons, textareas, etc.) */
          .proposal-shared-content .print-hide { display: none !important; }
          /* Show BOM notes that were styled as hidden print-only in the original proposal */
          .proposal-shared-content .hidden.print\\:block { display: block !important; }
          /* Custom-section Numbering Library parenthesis markers */
          ${PE_CUSTOM_LIST_STYLE_CSS}
        `}</style>
        <div className="max-w-4xl mx-auto">
          {refNumber && (
            <p className="text-xs text-gray-500 mb-2 text-center">Ref: {refNumber} · Read-only shared view</p>
          )}
          <div
            className="bg-white rounded-2xl border shadow-sm overflow-hidden proposal-shared-content min-w-0 max-w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    );
  }

  return null;
}
