import type { Dispatch, SetStateAction } from 'react';
import type { RoofLayoutKeepout } from '../../lib/roofLayout/roofLayoutTypes';
import { RoofLayoutKeepoutControls } from './RoofLayoutKeepoutControls';
import { RoofLayoutKeyboardHints } from './RoofLayoutKeyboardHints';

type Props = {
  roofViewTab: '2d' | '3d';
  layoutMode: 'saved' | 'editing';
  isMobileView: boolean;
  narrow3dLive: boolean;
  layoutZoomValue: number;
  layoutZoomMin: number;
  setLayoutZoom: Dispatch<SetStateAction<number>>;
  panelSpacingMultiplier: number;
  setPanelSpacingMultiplier: (v: number) => void;
  edgeSetbackM: number;
  setEdgeSetbackM: (v: number) => void;
  panelOrientation: 'portrait' | 'landscape';
  setPanelOrientation: Dispatch<SetStateAction<'portrait' | 'landscape'>>;
  satelliteOpacity: number;
  setSatelliteOpacity: (v: number) => void;
  hasPolygon: boolean;
  onSnapToGrid: () => void;
  keepouts: RoofLayoutKeepout[];
  onAddRectKeepout: () => void;
  onAddCircleKeepout: () => void;
  onRemoveKeepout: (id: string) => void;
  onClearKeepouts: () => void;
  /** Sidebar column vs inline row under the map (lg–xl). */
  variant?: 'sidebar' | 'inline';
};

export function RoofLayoutAdjustPanel({
  roofViewTab,
  layoutMode,
  isMobileView,
  narrow3dLive,
  layoutZoomValue,
  layoutZoomMin,
  setLayoutZoom,
  panelSpacingMultiplier,
  setPanelSpacingMultiplier,
  edgeSetbackM,
  setEdgeSetbackM,
  panelOrientation,
  setPanelOrientation,
  satelliteOpacity,
  setSatelliteOpacity,
  hasPolygon,
  onSnapToGrid,
  keepouts,
  onAddRectKeepout,
  onAddCircleKeepout,
  onRemoveKeepout,
  onClearKeepouts,
  variant = 'sidebar',
}: Props) {
  return (
    <div
      className={`flex flex-col text-sm ${variant === 'inline' ? 'gap-2.5' : 'gap-3'}`}
    >
      {variant === 'sidebar' && (
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Layout tools
        </h2>
      )}

      {(roofViewTab === '2d' || roofViewTab === '3d') &&
        (narrow3dLive ? (
          <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-gray-700">3D scene (phone / tablet)</p>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
              Pinch with two fingers to zoom the camera. Drag to orbit.
            </p>
          </div>
        ) : (
          !isMobileView || roofViewTab !== '2d' ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-600">
                Zoom{roofViewTab === '3d' ? ' (3D)' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLayoutZoom((z) => Math.max(layoutZoomMin, Math.round((z - 0.25) * 4) / 4))
                  }
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 touch-manipulation"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">
                  {Math.round(layoutZoomValue * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setLayoutZoom((z) => Math.min(10, Math.round((z + 0.25) * 4) / 4))
                  }
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 touch-manipulation"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
            </div>
          ) : null
        ))}

      {roofViewTab === '2d' && layoutMode === 'editing' && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600">Satellite opacity</span>
          <input
            type="range"
            min={0.35}
            max={1}
            step={0.05}
            value={satelliteOpacity}
            onChange={(e) => setSatelliteOpacity(Number(e.target.value))}
            aria-label="Satellite image opacity"
            className="w-full h-11 md:h-8 accent-slate-600 touch-manipulation"
          />
          <span className="text-[10px] text-gray-500">Lower to see panel grid over the map</span>
        </div>
      )}

      {roofViewTab === '2d' && layoutMode === 'editing' && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600">Edge setback</span>
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.1}
            value={edgeSetbackM}
            onChange={(e) => setEdgeSetbackM(Number(e.target.value))}
            aria-label="Edge setback distance in metres"
            className="w-full h-11 md:h-8 accent-amber-600 touch-manipulation"
          />
          <span className="text-[10px] text-gray-500 leading-snug">
            {edgeSetbackM <= 0
              ? 'Off — modules pack to the roof outline'
              : `${edgeSetbackM.toFixed(1)} m inset from edges · use Refill panels to apply`}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-gray-600">Panel density</span>
        <input
          type="range"
          min={0.8}
          max={2}
          step={0.2}
          value={panelSpacingMultiplier}
          onChange={(e) => setPanelSpacingMultiplier(Number(e.target.value))}
          aria-label="Panel spacing density"
          className="w-full h-11 md:h-8 accent-indigo-600 touch-manipulation"
        />
        <span className="text-xs text-gray-500">
          {panelSpacingMultiplier < 1.2 ? 'Tighter' : panelSpacingMultiplier > 1.6 ? 'Looser' : 'Medium'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600">Orientation</span>
        <button
          type="button"
          onClick={() =>
            setPanelOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))
          }
          className="min-h-[44px] md:min-h-[36px] px-4 md:px-3 rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50 touch-manipulation"
        >
          {panelOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
        </button>
      </div>

      {layoutMode === 'editing' && roofViewTab === '2d' && (
        <>
          <RoofLayoutKeepoutControls
            keepouts={keepouts}
            onAddRect={onAddRectKeepout}
            onAddCircle={onAddCircleKeepout}
            onRemove={onRemoveKeepout}
            onClear={onClearKeepouts}
          />
          <RoofLayoutKeyboardHints className="hidden xl:block" />
        </>
      )}

      {roofViewTab !== '3d' && hasPolygon && (
        <button
          type="button"
          onClick={onSnapToGrid}
          className="min-h-[44px] md:min-h-[36px] w-full px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50 touch-manipulation"
        >
          Snap outline to grid
        </button>
      )}
    </div>
  );
}
