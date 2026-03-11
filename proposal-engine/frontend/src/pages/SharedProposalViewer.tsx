import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedProposal } from '../lib/apiClient';

export default function SharedProposalViewer() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'password' | 'content' | 'expired' | 'error'>('loading');
  const [html, setHtml] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async (pwd?: string) => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid link.');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    try {
      const data = await getSharedProposal(token, pwd);
      setHtml(data.html);
      setRefNumber(data.refNumber ?? null);
      setStatus('content');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load proposal';
      setErrorMessage(msg);
      if (msg.toLowerCase().includes('password')) {
        setStatus('password');
      } else if (msg.toLowerCase().includes('expired')) {
        setStatus('expired');
      } else {
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    if (token) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(password);
  };

  if (status === 'password') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium">
            {status === 'expired' ? 'This link has expired.' : errorMessage ?? 'This link is invalid or has been removed.'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'content' && html) {
    return (
      <div className="min-h-screen bg-gray-100 py-4 px-2 sm:px-4">
        <style>{`.proposal-shared-content .print-hide { display: none !important; }`}</style>
        <div className="max-w-4xl mx-auto">
          {refNumber && (
            <p className="text-xs text-gray-500 mb-2 text-center">Ref: {refNumber} · Read-only shared view</p>
          )}
          <div
            className="bg-white rounded-2xl border shadow-sm overflow-hidden proposal-shared-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    );
  }

  return null;
}
