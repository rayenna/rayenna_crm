type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
};

export function RoofLayoutUndoButtons({ canUndo, canRedo, onUndo, onRedo, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="min-h-[36px] px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="min-h-[36px] px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        Redo
      </button>
    </div>
  );
}
