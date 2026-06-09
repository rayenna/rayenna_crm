import {
  MAX_ROOF_FACETS,
  ROOF_AZIMUTH_PRESETS,
  type RoofFacetState,
} from '../../lib/roofLayoutFacets';
import {
  ROOF_LAYOUT_DEFAULT_TILT_DEG,
  indiaFacetYieldFactor,
} from '../../lib/roofLayout/estimateRoofLayoutYield';

type Props = {
  facets: RoofFacetState[];
  activeFacetId: string;
  onSelectFacet: (id: string) => void;
  onAddFacet: () => void;
  onRemoveFacet: (id: string) => void;
  onAzimuthChange: (id: string, azimuthDeg: number) => void;
  disabled?: boolean;
};

export function RoofLayoutFacetBar({
  facets,
  activeFacetId,
  onSelectFacet,
  onAddFacet,
  onRemoveFacet,
  onAzimuthChange,
  disabled,
}: Props) {
  const active = facets.find((f) => f.id === activeFacetId);
  const canAdd = facets.length < MAX_ROOF_FACETS;
  const activeYieldFactor = active ? indiaFacetYieldFactor(active.azimuthDeg) : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">Roof sections</p>
        <span className="text-[10px] text-slate-500">
          {facets.length} / {MAX_ROOF_FACETS} · SolarEdge-style multi-facet
        </span>
      </div>
      <p className="text-[11px] text-slate-600 leading-snug">
        Add separate outlines for each roof face. Panels and azimuth are per section; totals roll up in the
        status bar.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {facets.map((f) => {
          const isActive = f.id === activeFacetId;
          const panelN = f.panels.length;
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectFacet(f.id)}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors touch-manipulation ${
                isActive
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {f.label}
              {panelN > 0 && (
                <span className={`ml-1 tabular-nums ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                  ({panelN})
                </span>
              )}
            </button>
          );
        })}
        {canAdd && (
          <button
            type="button"
            disabled={disabled}
            onClick={onAddFacet}
            className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 touch-manipulation"
          >
            + Add section
          </button>
        )}
      </div>
      {active && facets.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <label className="text-[11px] font-medium text-slate-600 shrink-0" htmlFor="facet-azimuth">
            Azimuth ({active.label})
          </label>
          <select
            id="facet-azimuth"
            disabled={disabled}
            value={String(
              ROOF_AZIMUTH_PRESETS.find((p) => p.deg === active.azimuthDeg)?.deg ?? active.azimuthDeg,
            )}
            onChange={(e) => onAzimuthChange(active.id, Number(e.target.value))}
            className="min-h-[36px] flex-1 min-w-[8rem] max-w-[12rem] rounded-lg border border-slate-200 text-xs px-2 bg-white"
          >
            {ROOF_AZIMUTH_PRESETS.map((p) => (
              <option key={p.deg} value={p.deg}>
                {p.label} ({p.deg}°)
              </option>
            ))}
          </select>
          {activeYieldFactor != null && (
            <span
              className="text-[10px] text-slate-500 tabular-nums"
              title={`Simplified India estimate at ${ROOF_LAYOUT_DEFAULT_TILT_DEG}° tilt. Not a production guarantee.`}
            >
              ≈ {(activeYieldFactor * 100).toFixed(0)}% of south yield
            </span>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemoveFacet(active.id)}
            className="text-[11px] font-semibold text-red-700 hover:text-red-800 px-2 py-1 rounded touch-manipulation"
          >
            Remove section
          </button>
        </div>
      )}
    </div>
  );
}
