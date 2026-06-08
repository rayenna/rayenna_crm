type Props = {
  error: string | null;
  showPanel: boolean;
  keralaMapGpsWarning: string | null;
  satelliteImageryWarning: string | null;
  layoutMode: 'saved' | 'editing';
  mapsLinkOverride: string;
  onMapsLinkOverrideChange: (value: string) => void;
  crmPanelWattage: number | null;
  panelWPreset: string;
  panelWOverride: string;
  effectiveWattage: number;
  onPanelWPresetChange: (preset: string) => void;
  onPanelWOverrideChange: (value: string) => void;
};

export function RoofLayoutOverridePanel({
  error,
  showPanel,
  keralaMapGpsWarning,
  satelliteImageryWarning,
  layoutMode,
  mapsLinkOverride,
  onMapsLinkOverrideChange,
  crmPanelWattage,
  panelWPreset,
  panelWOverride,
  effectiveWattage,
  onPanelWPresetChange,
  onPanelWOverrideChange,
}: Props) {
  if (!showPanel) return null;

  return (
    <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900 space-y-2">
      {error && <p className="text-[11px] text-red-700 font-medium">{error}</p>}
      {(keralaMapGpsWarning || satelliteImageryWarning) && layoutMode === 'editing' && (
        <p className="text-[11px] text-amber-900 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {keralaMapGpsWarning ?? satelliteImageryWarning}
        </p>
      )}
      <p className="font-semibold text-[11px] uppercase tracking-wide text-sky-700">
        Override Google Maps location / panel wattage (optional)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <label className="text-[10px] font-medium text-sky-700 leading-5 min-h-5">Google Maps link</label>
          <input
            type="text"
            value={mapsLinkOverride}
            onChange={(e) => onMapsLinkOverrideChange(e.target.value)}
            placeholder="Paste any Google Maps URL or lat,lng"
            className="w-full h-8 rounded-md border border-sky-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-h-5">
            <label className="text-[10px] font-medium text-sky-700 leading-5 shrink-0">Panel wattage (W)</label>
            {crmPanelWattage != null ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 shrink-0">
                ✓ CRM project: {crmPanelWattage} W
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 shrink-0">
                Not set in CRM — 550 W default
              </span>
            )}
            {panelWOverride.trim() !== '' && (
              <span className="text-[10px] text-indigo-600 font-medium shrink-0">→ {effectiveWattage} W</span>
            )}
          </div>
          <div className="flex gap-1.5 min-h-8 items-center">
            <select
              value={panelWPreset}
              onChange={(e) => {
                const val = e.target.value;
                onPanelWPresetChange(val);
                if (val !== 'custom') onPanelWOverrideChange(val);
                else onPanelWOverrideChange('');
              }}
              className="flex-1 h-8 rounded-md border border-sky-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            >
              <option value="">
                {crmPanelWattage != null ? `Use CRM value (${crmPanelWattage} W)` : 'Use default (550 W)'}
              </option>
              <option value="400">400 W</option>
              <option value="440">440 W</option>
              <option value="480">480 W</option>
              <option value="500">500 W</option>
              <option value="530">530 W</option>
              <option value="540">540 W</option>
              <option value="550">550 W</option>
              <option value="580">580 W</option>
              <option value="600">600 W</option>
              <option value="650">650 W</option>
              <option value="custom">Custom…</option>
            </select>
            {panelWPreset === 'custom' && (
              <input
                type="number"
                min={1}
                value={panelWOverride}
                onChange={(e) => onPanelWOverrideChange(e.target.value)}
                placeholder="e.g. 570"
                className="w-20 h-8 rounded-md border border-sky-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-sky-700">
        When filled, these values are used for this AI run without changing data stored in Rayenna CRM.
      </p>
    </div>
  );
}
