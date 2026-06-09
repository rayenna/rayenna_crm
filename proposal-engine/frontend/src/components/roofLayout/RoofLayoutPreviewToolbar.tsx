import { RoofLayoutUndoButtons } from './RoofLayoutUndoButtons';

type Props = {
  canToggle2d3d: boolean;
  canChoose3dForProposal: boolean;
  roofViewTab: '2d' | '3d';
  onSelect2d: () => void;
  onSelect3d: () => void;
  layoutMode: 'saved' | 'editing';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

/** Map chrome only — view toggle + polygon undo. Export lives in sidebar (xl) or below (md–lg). */
export function RoofLayoutPreviewToolbar({
  canToggle2d3d,
  canChoose3dForProposal,
  roofViewTab,
  onSelect2d,
  onSelect3d,
  layoutMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  const showUndo =
    layoutMode === 'editing' && roofViewTab === '2d' && (canUndo || canRedo);
  const hasControls = canToggle2d3d || showUndo;

  if (!hasControls) return null;

  const tabClass = (active: boolean, disabled?: boolean) =>
    `min-h-[44px] md:min-h-[32px] px-4 md:px-3 py-1 rounded-full text-xs font-semibold transition-colors touch-manipulation ${
      active ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600 hover:bg-gray-50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 min-w-0">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
        Layout preview
      </h2>

      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {canToggle2d3d && (
          <div
            className="inline-flex items-center rounded-full border border-gray-300 bg-white p-0.5 shrink-0"
            role="tablist"
            aria-label="Layout view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={roofViewTab === '2d'}
              onClick={onSelect2d}
              className={tabClass(roofViewTab === '2d')}
            >
              <span className="md:hidden">2D Layout</span>
              <span className="hidden md:inline">2D</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={roofViewTab === '3d'}
              onClick={onSelect3d}
              disabled={!canChoose3dForProposal}
              className={tabClass(roofViewTab === '3d', !canChoose3dForProposal)}
            >
              <span className="md:hidden">3D View</span>
              <span className="hidden md:inline">3D</span>
            </button>
          </div>
        )}

        {showUndo && (
          <RoofLayoutUndoButtons
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            className="shrink-0"
          />
        )}
      </div>
    </div>
  );
}
