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
    <div
      className="px-4 py-4 sm:px-8 sm:py-6"
      style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-lg sm:text-xl leading-none shrink-0">
            📐
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-white drop-shadow">AI Roof Layout</h1>
            <p className="mt-0.5 text-white/90 text-sm hidden sm:block">
              AI-assisted draft — you draw the roof outline; panels and keepouts follow your edits.
            </p>
          </div>
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
              <span className="text-xs px-3 py-1.5 rounded-full border font-semibold bg-white/20 text-white border-white/40">
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
                className="inline-flex items-center justify-center gap-1.5 bg-red-500/90 hover:bg-red-600 border-2 border-red-300/80 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete layout'}
              </button>
            )}
            <button
              type="button"
              onClick={onGenerateClick}
              disabled={loading || deleting}
              className="inline-flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating…' : hasResult ? 'Regenerate AI Layout' : 'Generate AI Layout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
