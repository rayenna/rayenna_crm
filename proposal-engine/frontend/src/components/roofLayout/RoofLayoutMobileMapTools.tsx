import type { Dispatch, SetStateAction } from 'react';
import { RoofLayoutKeyboardHints } from './RoofLayoutKeyboardHints';

type Props = {
  mapEditTool: 'scroll' | 'roof' | 'keepout';
  layoutMode: 'saved' | 'editing';
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  hasPolygon: boolean;
  onSetMapTool: (tool: 'scroll' | 'roof' | 'keepout') => void;
  onCenterMap: () => void;
};

export function RoofLayoutMobileMapTools({
  mapEditTool,
  layoutMode,
  zoom,
  setZoom,
  hasPolygon,
  onSetMapTool,
  onCenterMap,
}: Props) {
  return (
    <div className="w-full lg:hidden space-y-2">
      {mapEditTool === 'scroll' && layoutMode === 'editing' && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
          Drag the map to pan · use <strong>+/−</strong> to zoom · <strong>Center</strong> returns to the roof.
          Tap <strong>Edit polygon</strong> or <strong>Keepouts</strong> to adjust the layout.
        </p>
      )}
      <div className="flex items-stretch gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onSetMapTool('scroll')}
          className={`min-h-[44px] flex-1 min-w-[5.5rem] px-3 rounded-lg text-xs font-semibold border touch-manipulation ${
            mapEditTool === 'scroll'
              ? 'bg-indigo-600 border-indigo-700 text-white'
              : 'bg-white border-gray-300 text-gray-700'
          }`}
        >
          Scroll map
        </button>
        <button
          type="button"
          onClick={() => onSetMapTool('roof')}
          className={`min-h-[44px] flex-1 min-w-[5.5rem] px-3 rounded-lg text-xs font-semibold border touch-manipulation ${
            mapEditTool === 'roof'
              ? 'bg-indigo-600 border-indigo-700 text-white'
              : 'bg-white border-gray-300 text-gray-700'
          }`}
        >
          Edit polygon
        </button>
        <button
          type="button"
          onClick={() => onSetMapTool('keepout')}
          className={`min-h-[44px] flex-1 min-w-[5.5rem] px-3 rounded-lg text-xs font-semibold border touch-manipulation ${
            mapEditTool === 'keepout'
              ? 'bg-orange-600 border-orange-700 text-white'
              : 'bg-white border-gray-300 text-gray-700'
          }`}
        >
          Keepouts
        </button>
        <div className="flex items-center gap-0.5 shrink-0 rounded-lg border border-gray-200 bg-white px-0.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.2, Math.round((z - 0.25) * 4) / 4))}
            className="h-11 w-10 flex items-center justify-center text-sm font-semibold touch-manipulation"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="min-w-[2.75rem] text-center text-[11px] font-medium tabular-nums text-gray-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(10, Math.round((z + 0.25) * 4) / 4))}
            className="h-11 w-10 flex items-center justify-center text-sm font-semibold touch-manipulation"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onCenterMap}
          disabled={!hasPolygon}
          className="min-h-[44px] shrink-0 px-3 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-700 touch-manipulation disabled:opacity-50"
          title="Center map on the active roof outline"
          aria-label="Center map on roof outline"
        >
          Center
        </button>
      </div>
      <RoofLayoutKeyboardHints compact className="hidden sm:block lg:hidden px-0.5" />
    </div>
  );
}
