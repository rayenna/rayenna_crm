type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
};

export function RoofLayoutUndoButtons({ canUndo, canRedo, onUndo, onRedo, className = '' }: Props) {
  return (
    <div
      className={`inline-flex items-center rounded-full border border-gray-300 bg-white p-0.5 ${className}`}
      role="group"
      aria-label="Polygon history"
    >
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="min-h-[44px] md:min-h-[32px] min-w-[3.25rem] md:min-w-[32px] px-3 md:px-2.5 rounded-full text-xs md:text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        title="Undo polygon edit (Ctrl+Z)"
        aria-label="Undo polygon edit"
      >
        <span className="md:hidden">Undo</span>
        <span className="hidden md:inline" aria-hidden>
          ↶
        </span>
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="min-h-[44px] md:min-h-[32px] min-w-[3.25rem] md:min-w-[32px] px-3 md:px-2.5 rounded-full text-xs md:text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        title="Redo polygon edit (Ctrl+Y or Ctrl+Shift+Z)"
        aria-label="Redo polygon edit"
      >
        <span className="md:hidden">Redo</span>
        <span className="hidden md:inline" aria-hidden>
          ↷
        </span>
      </button>
    </div>
  );
}
