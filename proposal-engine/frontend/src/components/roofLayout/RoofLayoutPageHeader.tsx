import { btnPrimary, pageBanner } from '../ui/chrome';

type Props = {
  layoutMode: 'saved' | 'editing';
  hasResult: boolean;
  showDelete: boolean;
  loading: boolean;
  deleting: boolean;
  onDeleteClick: () => void;
  onGenerateClick: () => void;
};

export function RoofLayoutPageHeader({
  layoutMode,
  hasResult,
  showDelete,
  loading,
  deleting,
  onDeleteClick,
  onGenerateClick,
}: Props) {
  return (
    <div className={pageBanner}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold text-white tracking-tight">AI Roof Layout</h1>
          <p className="mt-1 text-sm text-white/85 hidden sm:block">
            AI-assisted draft — you draw the roof outline; panels and keepouts follow your edits.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto flex-shrink-0">
          {layoutMode === 'saved' && (
            <div className="flex justify-start sm:justify-end">
              <span className="text-xs px-3 py-1.5 rounded-full border font-semibold bg-yellow-50 text-yellow-700 border-yellow-200">
                ✓ Saved layout loaded
              </span>
            </div>
          )}
          {layoutMode === 'editing' && hasResult && (
            <div className="flex justify-start sm:justify-end">
              <span className="text-xs px-3 py-1.5 rounded-full border font-semibold bg-secondary-50 text-secondary-700 border-secondary-200">
                AI-assisted draft
              </span>
            </div>
          )}
          <div className="flex flex-wrap justify-start sm:justify-end gap-2">
            {showDelete && (
              <button
                type="button"
                onClick={onDeleteClick}
                disabled={loading || deleting}
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete layout'}
              </button>
            )}
            <button
              type="button"
              onClick={onGenerateClick}
              disabled={loading || deleting}
              className={btnPrimary + ' text-sm min-h-[40px]'}
            >
              {loading ? 'Generating…' : hasResult ? 'Regenerate AI Layout' : 'Generate AI Layout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
