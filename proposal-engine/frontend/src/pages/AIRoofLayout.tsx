import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle } from 'react-konva';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - use-image has ESM types that may not be picked up correctly here
import useImage from 'use-image';
import { generateAiRoofLayout, AiRoofLayoutResponse, fetchCrmProjectForAiLayout, getApiBaseUrl, saveManualRoofLayoutImage } from '../lib/apiClient';
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
  // Start at 50% zoom for an easier overview of the roof + layout
  const [zoom, setZoom] = useState(0.5);
  const [exporting, setExporting] = useState(false);
  const [savingToProposal, setSavingToProposal] = useState(false);
  const [lastSavedProjectId, setLastSavedProjectId] = useState<string | null>(null);
  const [panelSpacingMultiplier, setPanelSpacingMultiplier] = useState(1.5);
  const [panelOrientation, setPanelOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const exportRef = useRef<HTMLDivElement>(null);

  // Konva-based layout state (pure frontend, no native deps)
  const stageRef = useRef<any>(null);

  type Point = { x: number; y: number };
  type PanelRect = { x: number; y: number; w: number; h: number };

  const [polygon, setPolygon] = useState<Point[] | null>(null);
  const [panels, setPanels] = useState<PanelRect[]>([]);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImage] = useImage(bgImageUrl ?? '');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Geometry constants (approximate, tuned for visual realism)
  // Use a stable value here so area + panel counts remain in a sensible range.
  const METERS_PER_PIXEL = 0.15;
  const PANEL_WIDTH_M = 1.1;
  const PANEL_HEIGHT_M = 2.2;
  const PANEL_AREA_M2 = 2.42;
  const PANEL_SPACING_M = 0.2;
  const USABLE_AREA_FACTOR = 0.75;
  const PANEL_SPACING_FACTOR = 1.2;

  // When the background image loads, capture its natural size.
  useEffect(() => {
    if (bgImage && (!imageSize || imageSize.width !== bgImage.width || imageSize.height !== bgImage.height)) {
      setImageSize({ width: bgImage.width, height: bgImage.height });
    }
  }, [bgImage, imageSize]);

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

      // If panel wattage is still missing, fall back to a sensible default (550 W)
      if (panelWattage == null || Number.isNaN(panelWattage)) {
        panelWattage = 550;
      }

      const missingLatitude =
        latitude == null || Number.isNaN(latitude) || longitude == null || Number.isNaN(longitude);
      const missingSystemSize = systemSizeKw == null || Number.isNaN(systemSizeKw);

      if (missingLatitude || missingSystemSize) {
        const parts: string[] = [];
        if (missingLatitude) parts.push('Google Maps location');
        if (missingSystemSize) parts.push('system size (kW)');
        setError(
          parts.length
            ? `Missing required details: please provide ${parts.join(' and ')}.`
            : 'Missing required details.',
        );
        return;
      }

      setLastLatitude(latitude as number);
      setLastLongitude(longitude as number);

      const data = await generateAiRoofLayout({
        projectId: crmProject.id,
        latitude: latitude as number,
        longitude: longitude as number,
        systemSizeKw: systemSizeKw as number,
        panelWattage: panelWattage as number,
      });
      // Normalize and validate so we never render with undefined numbers (avoids "reading 'toFixed' of undefined")
      const roof = data?.roof_area_m2;
      const usable = data?.usable_area_m2;
      const panelCount = data?.panel_count;
      if (!Number.isFinite(roof) || !Number.isFinite(usable) || !Number.isFinite(panelCount)) {
        setError('The layout service returned incomplete data. Please try again or check the backend.');
        return;
      }
      const nextResult: AiRoofLayoutResponse = {
        roof_area_m2: Number(roof),
        usable_area_m2: Number(usable),
        panel_count: Number(panelCount),
        layout_image_url: data?.layout_image_url && String(data.layout_image_url).trim() ? data.layout_image_url : '',
      };
      setResult(nextResult);

      // Initialise frontend polygon + panel layout based on the latest image
      const rawUrl = nextResult.layout_image_url && String(nextResult.layout_image_url).trim()
        ? nextResult.layout_image_url
        : null;
      const imageUrl = rawUrl
        ? rawUrl.startsWith('http')
          ? rawUrl
          : `${getApiBaseUrl() || ''}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
        : null;
      setBgImageUrl(imageUrl);

      // polygon and panels will be initialised once the image size is known
    } catch (err: any) {
      setError(err?.message ?? 'Failed to generate AI layout');
    } finally {
      setLoading(false);
    }
  };

  async function captureLayoutImage(): Promise<string | null> {
    if (!stageRef.current) return null;
    const mime = 'image/png';
    // Use pixelRatio 2 for a good balance between quality and performance
    return stageRef.current.toDataURL({ pixelRatio: 2, mimeType: mime });
  }

  const handleExportLayoutImage = async (format: 'png' | 'jpeg') => {
    if (!stageRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await captureLayoutImage();
      if (!dataUrl) return;
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? 'png' : 'jpg';

      // If the user chose JPG, convert the PNG data URL using a temporary canvas.
      let finalUrl = dataUrl;
      if (mime === 'image/jpeg') {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          finalUrl = canvas.toDataURL('image/jpeg', 0.9);
        }
      }

      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = `ai-roof-layout.${ext}`;
      a.click();

      // Also persist this layout image for use in the proposal section (per‑project).
      try {
        const crmProjectId = activeProject?.master?.crmProjectId;
        if (crmProjectId) {
          await saveManualRoofLayoutImage({ projectId: crmProjectId, dataUrl: finalUrl });
          setLastSavedProjectId(String(crmProjectId));
        }
      } catch {
        // ignore backend save errors here; download already succeeded
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleSaveForProposal = async () => {
    if (!stageRef.current) return;
    setSavingToProposal(true);
    try {
      const dataUrl = await captureLayoutImage();
      if (!dataUrl) return;
      const crmProjectId = activeProject?.master?.crmProjectId;
      if (crmProjectId) {
        const saved = await saveManualRoofLayoutImage({
          projectId: crmProjectId,
          dataUrl,
          roof_area_m2: Number(result?.roof_area_m2),
          usable_area_m2: Number(result?.usable_area_m2),
          panel_count: Number(result?.panel_count),
        });
        if (saved?.layout_image_url) {
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  layout_image_url: saved.layout_image_url,
                }
              : prev,
          );
          setLastSavedProjectId(String(crmProjectId));
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Save for proposal failed:', e);
    } finally {
      setSavingToProposal(false);
    }
  };

  function computePanelsForPolygon(poly: Point[]): {
    panels: PanelRect[];
    roofAreaM2: number;
    usableAreaM2: number;
    panelCount: number;
  } {
    if (!poly.length) return { panels: [], roofAreaM2: 0, usableAreaM2: 0, panelCount: 0 };

    // ── Polygon area via Shoelace formula (in pixels²) ──
    const areaPx = Math.abs(
      poly.reduce((sum, p, idx) => {
        const next = poly[(idx + 1) % poly.length]!;
        return sum + p.x * next.y - next.x * p.y;
      }, 0) / 2,
    );

    const roofAreaM2 = areaPx * METERS_PER_PIXEL * METERS_PER_PIXEL;
    const usableAreaM2 = roofAreaM2 * USABLE_AREA_FACTOR;

    // Geometry-based ideal panel count (used for the numeric summary)
    const idealPanelCount = Math.max(
      0,
      Math.floor(usableAreaM2 / (PANEL_AREA_M2 * PANEL_SPACING_FACTOR)),
    );

    // Panel dimensions + spacing expressed in pixels (math size)
    const panelWidthM = panelOrientation === 'portrait' ? PANEL_WIDTH_M : PANEL_HEIGHT_M;
    const panelHeightM = panelOrientation === 'portrait' ? PANEL_HEIGHT_M : PANEL_WIDTH_M;
    const panelWidthPx = panelWidthM / METERS_PER_PIXEL;
    const panelHeightPx = panelHeightM / METERS_PER_PIXEL;
    // Panel density slider controls this multiplier: lower = tighter grid, higher = looser.
    const spacingPx = (PANEL_SPACING_M / METERS_PER_PIXEL) * panelSpacingMultiplier;

    let minX = poly[0]!.x;
    let maxX = poly[0]!.x;
    let minY = poly[0]!.y;
    let maxY = poly[0]!.y;
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const panels: PanelRect[] = [];

    const stepX = panelWidthPx + spacingPx;
    const stepY = panelHeightPx + spacingPx;

    const pointInPolygon = (pt: Point, vertices: Point[]): boolean => {
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i]!.x;
        const yi = vertices[i]!.y;
        const xj = vertices[j]!.x;
        const yj = vertices[j]!.y;
        const intersect =
          yi > pt.y !== yj > pt.y &&
          pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const approxPanelArea = panelWidthPx * panelHeightPx;
    // Cap the number of panels we attempt to draw so the UI stays responsive.
    const maxPanelsRendered = Math.min(
      200,
      idealPanelCount || Math.max(1, Math.floor(areaPx / approxPanelArea)),
    );

    for (let y = minY; y + panelHeightPx <= maxY; y += stepY) {
      for (let x = minX; x + panelWidthPx <= maxX; x += stepX) {
        const cx = x + panelWidthPx / 2;
        const cy = y + panelHeightPx / 2;
        if (!pointInPolygon({ x: cx, y: cy }, poly)) continue;

        panels.push({ x, y, w: panelWidthPx, h: panelHeightPx });
        if (panels.length >= maxPanelsRendered) break;
      }
      if (panels.length >= maxPanelsRendered) break;
    }

    return {
      panels,
      roofAreaM2,
      usableAreaM2,
      // For reporting, always use the geometry-based ideal count,
      // not the (possibly capped) number of rectangles we draw.
      panelCount: idealPanelCount,
    };
  }

  // Initialise default polygon once we know the image size
  useEffect(() => {
    if (!imageSize || polygon) return;
    // Start with a smaller default polygon so it matches the main roof more closely,
    // and align its edges to the underlying panel grid so rows/columns line up nicely.
    const margin = Math.min(imageSize.width, imageSize.height) * 0.3;
    let minX = margin;
    let maxX = imageSize.width - margin;
    let minY = margin;
    let maxY = imageSize.height - margin;

    // Compute the same grid step used for panel packing, so the polygon edges
    // fall on grid lines and the first/last panel rows align cleanly.
    const panelWidthPx = PANEL_WIDTH_M / METERS_PER_PIXEL;
    const panelHeightPx = PANEL_HEIGHT_M / METERS_PER_PIXEL;
    const spacingPx = (PANEL_SPACING_M / METERS_PER_PIXEL) * panelSpacingMultiplier;
    const stepX = panelWidthPx + spacingPx;
    const stepY = panelHeightPx + spacingPx;
    const snap = (v: number, step: number) => Math.round(v / step) * step;

    minX = snap(minX, stepX);
    maxX = snap(maxX, stepX);
    minY = snap(minY, stepY);
    maxY = snap(maxY, stepY);

    setPolygon([
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]);
  }, [imageSize, panelSpacingMultiplier, polygon]);

  // Recompute panels + metrics whenever polygon / density / orientation changes
  useEffect(() => {
    if (!polygon) return;
    const { panels: nextPanels, roofAreaM2, usableAreaM2, panelCount } =
      computePanelsForPolygon(polygon);
    setPanels(nextPanels);
    setResult((prev) =>
      prev
        ? {
            ...prev,
            roof_area_m2: roofAreaM2,
            usable_area_m2: usableAreaM2,
            panel_count: panelCount,
          }
        : prev,
    );
  }, [polygon, panelSpacingMultiplier, panelOrientation]);

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
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Layout actions</span>
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
              <button
                type="button"
                onClick={handleSaveForProposal}
                disabled={savingToProposal}
                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  lastSavedProjectId && activeProject?.master?.crmProjectId != null
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                    : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                } disabled:opacity-60`}
              >
                {savingToProposal
                  ? 'Saving…'
                  : lastSavedProjectId && activeProject?.master?.crmProjectId != null
                    ? 'Saved for proposal'
                    : 'Save for proposal'}
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
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Layout preview
                  </h2>
                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                    <span className="hidden sm:inline">Zoom</span>
                    <button
                      type="button"
                      onClick={() =>
                        setZoom((z) => Math.max(0.2, Math.round((z - 0.25) * 4) / 4))
                      }
                      className="h-6 w-6 flex items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="min-w-[3rem] text-center font-medium">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setZoom((z) => Math.min(10, Math.round((z + 0.25) * 4) / 4))
                      }
                      className="h-6 w-6 flex items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-wide">Panel density</span>
                    <input
                      type="range"
                      min={0.8}
                      max={2}
                      step={0.2}
                      value={panelSpacingMultiplier}
                      onChange={(e) => setPanelSpacingMultiplier(Number(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-[10px]">
                      {panelSpacingMultiplier < 1.2 ? 'Tighter' : panelSpacingMultiplier > 1.6 ? 'Looser' : 'Medium'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-wide">Orientation</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPanelOrientation((prev) =>
                          prev === 'portrait' ? 'landscape' : 'portrait',
                        )
                      }
                      className="px-2 py-1 rounded-full border border-gray-300 bg-white text-[10px] font-semibold hover:bg-gray-50"
                    >
                      {panelOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!imageSize) return;
                        // Rebuild a clean rectangular polygon aligned to the current panel grid.
                        const margin = Math.min(imageSize.width, imageSize.height) * 0.3;
                        let minX = margin;
                        let maxX = imageSize.width - margin;
                        let minY = margin;
                        let maxY = imageSize.height - margin;

                        const panelWidthPx = PANEL_WIDTH_M / METERS_PER_PIXEL;
                        const panelHeightPx = PANEL_HEIGHT_M / METERS_PER_PIXEL;
                        const spacingPx =
                          (PANEL_SPACING_M / METERS_PER_PIXEL) * panelSpacingMultiplier;
                        const stepX = panelWidthPx + spacingPx;
                        const stepY = panelHeightPx + spacingPx;
                        const snap = (v: number, step: number) =>
                          Math.round(v / step) * step;

                        minX = snap(minX, stepX);
                        maxX = snap(maxX, stepX);
                        minY = snap(minY, stepY);
                        maxY = snap(maxY, stepY);

                        setPolygon([
                          { x: minX, y: minY },
                          { x: maxX, y: minY },
                          { x: maxX, y: maxY },
                          { x: minX, y: maxY },
                        ]);
                      }}
                      className="px-2 py-1 rounded-full border border-gray-300 bg-white text-[10px] font-semibold hover:bg-gray-50"
                    >
                      Snap to grid
                    </button>
                  </div>
                </div>
              </div>
              <div className="aspect-square sm:aspect-video rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="w-full h-full overflow-auto flex items-center justify-center">
                  <div
                    className="relative origin-center inline-block"
                    style={{ transform: `scale(${zoom})` }}
                  >
                    {bgImage && imageSize ? (
                      <Stage
                        ref={stageRef}
                        width={imageSize.width}
                        height={imageSize.height}
                      >
                        {/* Base image */}
                        <Layer>
                          <KonvaImage
                            image={bgImage}
                            width={imageSize.width}
                            height={imageSize.height}
                          />
                        </Layer>

                        {/* Roof polygon boundary in green */}
                        {polygon && (
                          <Layer>
                            <Line
                              points={polygon.flatMap((p) => [p.x, p.y])}
                              closed
                              stroke="#16a34a"
                              strokeWidth={2}
                              fill="rgba(34,197,94,0.08)"
                            />
                          </Layer>
                        )}

                        {/* Panels clipped to polygon, with improved styling */}
                        {polygon && panels.length > 0 && (
                          <Layer
                            clipFunc={(ctx) => {
                              if (!polygon.length) return;
                              ctx.beginPath();
                              polygon.forEach((p, idx) => {
                                if (idx === 0) ctx.moveTo(p.x, p.y);
                                else ctx.lineTo(p.x, p.y);
                              });
                              ctx.closePath();
                            }}
                          >
                            {panels.map((rect, idx) => (
                              <Rect
                                // eslint-disable-next-line react/no-array-index-key
                                key={idx}
                                x={rect.x}
                                y={rect.y}
                                width={rect.w}
                                height={rect.h}
                                fill="rgba(37,99,235,0.35)" // blue fill, opacity 0.35
                                stroke="#1e3a8a" // dark blue stroke
                                strokeWidth={0.8}
                                shadowColor="rgba(15,23,42,0.55)"
                                shadowBlur={4}
                                shadowOpacity={0.6}
                                shadowOffset={{ x: 0, y: 1 }}
                              />
                            ))}
                          </Layer>
                        )}

                        {/* Draggable polygon control points */}
                        {polygon && (
                          <Layer>
                            {polygon.map((p, idx) => (
                              <Circle
                                // eslint-disable-next-line react/no-array-index-key
                                key={idx}
                                x={p.x}
                                y={p.y}
                                radius={7}
                                fill="#10b981"
                                stroke="#047857"
                                strokeWidth={1.5}
                                hitStrokeWidth={24}
                                draggable
                                onDragMove={(e) => {
                                  const nx = e.target.x();
                                  const ny = e.target.y();
                                  setPolygon((prev) => {
                                    if (!prev) return prev;
                                    const next = [...prev];
                                    next[idx] = { x: nx, y: ny };
                                    return next;
                                  });
                                }}
                              />
                            ))}
                          </Layer>
                        )}
                      </Stage>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                        No layout image returned
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

