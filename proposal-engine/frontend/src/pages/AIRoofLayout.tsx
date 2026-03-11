import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { generateAiRoofLayout, AiRoofLayoutResponse, fetchCrmProjectForAiLayout } from '../lib/apiClient';
import { getActiveCustomer } from '../lib/customerStore';

export default function AIRoofLayout() {
  const activeProject = getActiveCustomer();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiRoofLayoutResponse | null>(null);
  const [lastLatitude, setLastLatitude] = useState<number | null>(null);
  const [lastLongitude, setLastLongitude] = useState<number | null>(null);
  const [mapsLinkOverride, setMapsLinkOverride] = useState('');
  const [panelWOverride, setPanelWOverride] = useState('');
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!activeProject) {
      setError('Please open a project from Customers dashboard first.');
      return;
    }

    const { master } = activeProject;
    const crmProjectId = master.crmProjectId;

    if (!crmProjectId) {
      setError('This proposal is not linked to a Rayenna CRM project yet.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const crmProject = await fetchCrmProjectForAiLayout(crmProjectId);

      // Prefer Rayenna CRM as the single source of truth, but fall back to
      // Proposal Engine master fields if some values are not present yet.
      let latitude: number | null =
        (crmProject.customer && (crmProject.customer as any).latitude != null
          ? Number((crmProject.customer as any).latitude)
          : master.latitude ?? null);
      let longitude: number | null =
        (crmProject.customer && (crmProject.customer as any).longitude != null
          ? Number((crmProject.customer as any).longitude)
          : master.longitude ?? null);
      let systemSizeKw: number | null =
        crmProject.systemCapacity != null
          ? Number(crmProject.systemCapacity)
          : master.systemSizeKw ?? null;
      let panelWattage: number | null =
        crmProject.panelCapacityW != null
          ? Number(crmProject.panelCapacityW)
          : master.panelWattage ?? null;

      // Allow manual overrides when CRM / Proposal Engine data is missing or needs correction.
      // 1) Google Maps link override → extract first "lat,lng" pair we find.
      if (mapsLinkOverride.trim() !== '') {
        const m = mapsLinkOverride.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
        if (m) {
          const lat = Number(m[1]);
          const lng = Number(m[3]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            latitude = lat;
            longitude = lng;
          }
        }
      }
      // 2) Panel wattage override
      if (panelWOverride.trim() !== '') {
        const v = Number(panelWOverride.trim());
        if (!Number.isNaN(v)) panelWattage = v;
      }

      if (
        latitude == null ||
        Number.isNaN(latitude) ||
        longitude == null ||
        Number.isNaN(longitude) ||
        systemSizeKw == null ||
        Number.isNaN(systemSizeKw) ||
        panelWattage == null ||
        Number.isNaN(panelWattage)
      ) {
        setError('Missing required details even after overrides: please provide a valid Google Maps location and panel capacity (W).');
        return;
      }

      setLastLatitude(latitude);
      setLastLongitude(longitude);

      const data = await generateAiRoofLayout({
        projectId: crmProject.id,
        latitude,
        longitude,
        systemSizeKw,
        panelWattage,
      });
      // Normalize and validate so we never render with undefined numbers (avoids "reading 'toFixed' of undefined")
      const roof = data?.roof_area_m2;
      const usable = data?.usable_area_m2;
      const panels = data?.panel_count;
      if (!Number.isFinite(roof) || !Number.isFinite(usable) || !Number.isFinite(panels)) {
        setError('The layout service returned incomplete data. Please try again or check the backend.');
        return;
      }
      setResult({
        roof_area_m2: Number(roof),
        usable_area_m2: Number(usable),
        panel_count: Number(panels),
        layout_image_url: data?.layout_image_url && String(data.layout_image_url).trim() ? data.layout_image_url : '',
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to generate AI layout');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLayoutImage = async (format: 'png' | 'jpeg') => {
    if (!exportRef.current || !result) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? 'png' : 'jpg';
      const dataUrl = canvas.toDataURL(mime, format === 'jpeg' ? 0.92 : undefined);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ai-roof-layout.${ext}`;
      a.click();
    } catch (e) {
      if (import.meta.env.DEV) console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              AI Roof Segmentation & Solar Layout
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Uses project coordinates and system size to generate a draft solar panel layout for proposals.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-400 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Generating…' : 'Generate AI Layout'}
          </button>
        </div>

        {!activeProject && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Open a project from <span className="font-semibold">Customers → Dashboard</span> to use AI layout.
          </div>
        )}

        {(error || activeProject) && (
          <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900 space-y-2">
            {error && <p className="text-[11px] text-red-700 font-medium">{error}</p>}
            <p className="font-semibold text-[11px] uppercase tracking-wide text-sky-700">
              Override Google Maps location / panel wattage (optional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-sky-700 mb-0.5">
                  Google Maps link
                </label>
                <input
                  type="text"
                  value={mapsLinkOverride}
                  onChange={(e) => setMapsLinkOverride(e.target.value)}
                  placeholder="Paste any Google Maps URL or lat,lng"
                  className="w-full rounded-md border border-sky-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-sky-700 mb-0.5">
                  Panel wattage (W)
                </label>
                <input
                  type="text"
                  value={panelWOverride}
                  onChange={(e) => setPanelWOverride(e.target.value)}
                  placeholder="e.g. 540"
                  className="w-full rounded-md border border-sky-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-sky-700">
              When filled, these values are used for this AI run without changing data stored in Rayenna CRM.
            </p>
          </div>
        )}

        {result && (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Export layout</span>
              <button
                type="button"
                onClick={() => handleExportLayoutImage('png')}
                disabled={exporting}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60 border border-gray-300"
              >
                {exporting ? '…' : 'PNG'}
              </button>
              <button
                type="button"
                onClick={() => handleExportLayoutImage('jpeg')}
                disabled={exporting}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60 border border-gray-300"
              >
                {exporting ? '…' : 'JPG'}
              </button>
            </div>
            <div ref={exportRef} className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] items-start bg-white p-4 rounded-xl border border-gray-100">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Layout summary
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Roof area
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {Number.isFinite(result.roof_area_m2) ? Number(result.roof_area_m2).toFixed(1) : '—'} m²
                  </dd>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Usable area
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {Number.isFinite(result.usable_area_m2) ? Number(result.usable_area_m2).toFixed(1) : '—'} m²
                  </dd>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Panel count
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {Number.isFinite(result.panel_count) ? result.panel_count : '—'}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Layout preview
                </h2>
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  <span className="hidden sm:inline">Zoom</span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.75, Math.round((z - 0.25) * 4) / 4))}
                    className="h-6 w-6 flex items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] text-center font-medium">{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 4) / 4))}
                    className="h-6 w-6 flex items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
              {(() => {
                const panelCount = Math.max(1, Number.isFinite(result.panel_count) ? result.panel_count : 0);
                const cols = Math.max(1, Math.ceil(Math.sqrt(panelCount)));
                const panels = Array.from({ length: panelCount });
                const imageUrl = result.layout_image_url && String(result.layout_image_url).trim() ? result.layout_image_url : null;

                return (
                  <div className="aspect-square sm:aspect-video rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden">
                    <div className="w-full h-full overflow-auto">
                      <div
                        className="relative w-full h-full origin-center"
                        style={{ transform: `scale(${zoom})` }}
                      >
                        {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt="AI generated solar layout"
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">No layout image returned</div>
                        )}
                        {imageUrl && (
                        <div
                          className="absolute inset-0 grid gap-[1px] pointer-events-none"
                          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                        >
                          {panels.map((_, idx) => (
                            <div
                              // eslint-disable-next-line react/no-array-index-key
                              key={idx}
                              className="bg-emerald-400/25 border border-emerald-500/40"
                            />
                          ))}
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <p className="mt-2 text-xs text-gray-500">
                This is an early, AI-assisted draft. Please verify on-site measurements before finalizing proposals.
              </p>
              {lastLatitude != null && lastLongitude != null && (
                <p className="mt-2 text-[11px] text-gray-500 break-all">
                  Google Maps link:{' '}
                  <a
                    href={`https://www.google.com/maps?q=${lastLatitude},${lastLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline"
                  >
                    {`https://www.google.com/maps?q=${lastLatitude},${lastLongitude}`}
                  </a>
                </p>
              )}
            </div>
            </div>
          </div>
        )}

        {!result && (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            Once generated, the AI layout summary and preview image will appear here for inclusion in your proposal.
          </div>
        )}
      </div>
    </div>
  );
}

