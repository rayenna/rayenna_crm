type Props = {
  panelCount: number | null;
  panelCountReady: boolean;
  systemKw: number | null;
  targetSystemKw: number | null;
  roofAreaM2: number | null;
  usableAreaM2: number | null;
  metricsReady: boolean;
  layoutState: 'draft' | 'saved' | 'saved-dirty' | 'idle';
  savedAt: string | null;
  moduleWatts: number;
  /** Oriented module width × height (m) when known from CRM SKU resolution. */
  moduleWidthM?: number | null;
  moduleHeightM?: number | null;
  moduleSizeSource?: string | null;
  /** Placed module area ÷ usable roof area (0–100+). */
  fillPercent?: number | null;
  /** systemKw − targetSystemKw when both known. */
  kwVsTarget?: number | null;
  /** When &gt; 1, multi-facet layout (Phase 4). */
  facetCount?: number;
  /** Panel-weighted effective kW after simplified orientation loss (India estimate). */
  effectiveSystemKw?: number | null;
  /** Percent loss from nameplate kW due to facet azimuth (0–100). */
  orientationLossPercent?: number | null;
  /** Tooltip for yield estimate disclaimer. */
  yieldTooltip?: string | null;
};

export function RoofLayoutStatusStrip({
  panelCount,
  panelCountReady,
  systemKw,
  targetSystemKw,
  roofAreaM2,
  usableAreaM2,
  metricsReady,
  layoutState,
  savedAt,
  moduleWatts,
  moduleWidthM,
  moduleHeightM,
  moduleSizeSource,
  fillPercent,
  kwVsTarget,
  facetCount = 1,
  effectiveSystemKw,
  orientationLossPercent,
  yieldTooltip,
}: Props) {
  const panelsLabel =
    !panelCountReady || panelCount == null ? '—' : String(panelCount);
  const kwLabel =
    !panelCountReady || systemKw == null || !Number.isFinite(systemKw)
      ? '—'
      : systemKw.toFixed(2);
  const targetLabel =
    targetSystemKw != null && Number.isFinite(targetSystemKw)
      ? `${targetSystemKw.toFixed(1)} kW target`
      : null;
  const showYieldLoss =
    orientationLossPercent != null &&
    Number.isFinite(orientationLossPercent) &&
    orientationLossPercent >= 0.5 &&
    effectiveSystemKw != null &&
    Number.isFinite(effectiveSystemKw);
  const effectiveKwLabel = showYieldLoss ? effectiveSystemKw.toFixed(2) : null;
  const lossLabel = showYieldLoss ? orientationLossPercent.toFixed(0) : null;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 sm:px-4 sm:py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
        <span className="font-semibold text-slate-800 tabular-nums">
          {panelsLabel}
          <span className="font-normal text-slate-600"> panels</span>
        </span>
        <span className="text-slate-300 hidden sm:inline" aria-hidden>
          ·
        </span>
        <span className="font-semibold text-slate-800 tabular-nums">
          {kwLabel}
          <span className="font-normal text-slate-600"> kW</span>
          {targetLabel && (
            <span className="ml-1 text-[11px] font-normal text-slate-500">({targetLabel})</span>
          )}
          {effectiveKwLabel && (
            <span
              className="ml-1 text-[11px] font-normal text-slate-600 tabular-nums"
              title={yieldTooltip ?? undefined}
            >
              · eff.{' '}
              <strong className="text-slate-700">{effectiveKwLabel} kW</strong>
              {lossLabel && (
                <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-900">
                  −{lossLabel}% orient.
                </span>
              )}
            </span>
          )}
        </span>
        <span className="text-slate-300 hidden sm:inline" aria-hidden>
          ·
        </span>
        <span className="text-slate-600 tabular-nums">
          {metricsReady && roofAreaM2 != null ? `${roofAreaM2.toFixed(1)} m² roof` : '— m² roof'}
        </span>
        <span className="text-slate-300 hidden sm:inline" aria-hidden>
          ·
        </span>
        <span className="text-slate-600 tabular-nums">
          {metricsReady && usableAreaM2 != null ? `${usableAreaM2.toFixed(1)} m² usable` : '— usable'}
        </span>
        {fillPercent != null && Number.isFinite(fillPercent) && metricsReady && (
          <>
            <span className="text-slate-300 hidden sm:inline" aria-hidden>
              ·
            </span>
            <span className="text-slate-600 tabular-nums">{fillPercent.toFixed(0)}% fill</span>
          </>
        )}
      </div>
      {kwVsTarget != null && Number.isFinite(kwVsTarget) && targetSystemKw != null && (
        <p className="text-[10px] text-slate-600">
          {kwVsTarget >= 0 ? (
            <>
              <span className="text-amber-700 font-medium">{kwVsTarget.toFixed(2)} kW below</span> CRM target (
              {targetSystemKw.toFixed(1)} kW)
            </>
          ) : (
            <>
              <span className="text-sky-700 font-medium">{Math.abs(kwVsTarget).toFixed(2)} kW above</span> CRM
              target ({targetSystemKw.toFixed(1)} kW)
            </>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500">
        <span
          title={
            moduleSizeSource
              ? `Module size from ${moduleSizeSource}`
              : undefined
          }
        >
          Module: <strong className="text-slate-700">{moduleWatts} W</strong>
          {moduleWidthM != null &&
            moduleHeightM != null &&
            Number.isFinite(moduleWidthM) &&
            Number.isFinite(moduleHeightM) && (
              <>
                {' '}
                ·{' '}
                <strong className="text-slate-700 tabular-nums">
                  {moduleWidthM.toFixed(2)} × {moduleHeightM.toFixed(2)} m
                </strong>
              </>
            )}
          {facetCount > 1 && (
            <>
              {' '}
              · <strong className="text-slate-700">{facetCount} roof sections</strong>
            </>
          )}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
            layoutState === 'saved'
              ? 'bg-emerald-100 text-emerald-800'
              : layoutState === 'saved-dirty'
                ? 'bg-amber-100 text-amber-900'
                : layoutState === 'draft'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-gray-100 text-gray-600'
          }`}
        >
          {layoutState === 'saved'
            ? savedAt
              ? `Saved ${new Date(savedAt).toLocaleString()}`
              : 'Saved to proposal'
            : layoutState === 'saved-dirty'
              ? 'Saved — unsaved changes'
              : layoutState === 'draft'
                ? 'Draft — not saved'
                : 'No layout'}
        </span>
      </div>
    </div>
  );
}
