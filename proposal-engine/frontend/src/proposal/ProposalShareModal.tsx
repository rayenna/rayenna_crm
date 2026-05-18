/** Share-as-link modal — mobile-first bottom sheet, centered card on sm+. */

export interface ProposalShareModalProps {
  open: boolean;
  shareLink: string | null;
  shareCreating: boolean;
  shareError: string | null;
  shareUsePassword: boolean;
  sharePassword: string;
  shareUseCustomValidity: boolean;
  shareExpiryDate: string;
  shareLinkCopied: boolean;
  onClose: () => void;
  onUsePasswordChange: (v: boolean) => void;
  onPasswordChange: (v: string) => void;
  onUseCustomValidityChange: (v: boolean) => void;
  onExpiryDateChange: (v: string) => void;
  onCreateShare: () => void;
  onCopyLink: () => void;
}

export function ProposalShareModal({
  open,
  shareLink,
  shareCreating,
  shareError,
  shareUsePassword,
  sharePassword,
  shareUseCustomValidity,
  shareExpiryDate,
  shareLinkCopied,
  onClose,
  onUsePasswordChange,
  onPasswordChange,
  onUseCustomValidityChange,
  onExpiryDateChange,
  onCreateShare,
  onCopyLink,
}: ProposalShareModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-share-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 [touch-action:manipulation]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-xl bg-slate-900 text-white shadow-2xl
                   border border-slate-700 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-slate-600 sm:hidden" aria-hidden />
        <div className="px-4 pt-4 pb-4 sm:px-5 sm:py-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="proposal-share-title" className="text-lg font-semibold">
              Share proposal as link
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-9 w-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800
                         flex items-center justify-center [touch-action:manipulation]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {shareLink ? (
            <>
              <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Proposal link</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 min-h-[44px] rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={onCopyLink}
                  className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                    [touch-action:manipulation] ${
                    shareLinkCopied
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
                  }`}
                >
                  {shareLinkCopied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>
              <p className="text-xs text-slate-200">
                Anyone with this link can view the proposal (read-only) until it expires.
              </p>
            </>
          ) : (
            <>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer [touch-action:manipulation]">
                <input
                  type="checkbox"
                  checked={shareUsePassword}
                  onChange={(e) => onUsePasswordChange(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium text-slate-200">Password</span>
              </label>
              {shareUsePassword && (
                <input
                  type="password"
                  value={sharePassword}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Set a password for this link"
                  autoComplete="new-password"
                  className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-800 px-3 text-base sm:text-sm text-white placeholder-slate-400"
                />
              )}
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer [touch-action:manipulation]">
                <input
                  type="checkbox"
                  checked={shareUseCustomValidity}
                  onChange={(e) => onUseCustomValidityChange(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium text-slate-200">Custom validity</span>
              </label>
              {shareUseCustomValidity ? (
                <input
                  type="date"
                  value={shareExpiryDate}
                  onChange={(e) => onExpiryDateChange(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-800 px-3 text-base sm:text-sm text-white"
                />
              ) : (
                <p className="text-xs text-slate-300">Standard 48 hour expiry</p>
              )}
              {shareError && <p className="text-sm text-amber-300">{shareError}</p>}
              <button
                type="button"
                onClick={onCreateShare}
                disabled={shareCreating}
                className="w-full min-h-[44px] py-2.5 rounded-lg text-sm font-semibold bg-amber-400 text-slate-900
                           hover:bg-amber-300 border border-amber-300 disabled:opacity-60 transition-colors
                           [touch-action:manipulation]"
              >
                {shareCreating ? 'Generating…' : 'Generate link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
