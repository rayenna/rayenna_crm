type Props = {
  disabled?: boolean;
  panelCount: number;
  facetCount?: number;
  onClear: () => void;
  onRefill: () => void;
  onRefillAll?: () => void;
};

export function RoofLayoutPanelActions({
  disabled,
  panelCount,
  facetCount = 1,
  onClear,
  onRefill,
  onRefillAll,
}: Props) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-900">Panel placement</p>
      <p className="text-[11px] text-indigo-800/90 leading-snug">
        Fills the active roof section up to CRM target kW (split across sections when multi-facet), skipping
        keepouts.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onRefill}
          className="min-h-[44px] md:min-h-[36px] px-3 rounded-lg bg-indigo-600 border border-indigo-700 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 touch-manipulation"
        >
          {facetCount > 1 ? 'Refill active section' : 'Refill panels'}
        </button>
        {facetCount > 1 && onRefillAll && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRefillAll}
            className="min-h-[44px] md:min-h-[36px] px-3 rounded-lg bg-indigo-500 border border-indigo-600 text-white text-xs font-semibold hover:bg-indigo-600 disabled:opacity-50 touch-manipulation"
          >
            Refill all sections
          </button>
        )}
        <button
          type="button"
          disabled={disabled || panelCount === 0}
          onClick={onClear}
          className="min-h-[44px] md:min-h-[36px] px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 touch-manipulation"
        >
          Clear panels
        </button>
      </div>
      {panelCount > 0 && (
        <p className="text-[10px] text-indigo-700 tabular-nums">{panelCount} modules on map</p>
      )}
    </div>
  );
}
