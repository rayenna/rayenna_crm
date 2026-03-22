import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle } from 'react-konva';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - use-image has ESM types that may not be picked up correctly here
import useImage from 'use-image';
import {
  generateAiRoofLayout,
  AiRoofLayoutResponse,
  fetchCrmProjectForAiLayout,
  fetchManualRoofLayout,
  getApiBaseUrl,
  saveManualRoofLayoutImage,
} from '../lib/apiClient';

/** Focal point in image pixel space for centering the scroll viewport (saved view: API geometry or image centre). */
function focalPointForSavedView(
  imageSize: { width: number; height: number },
  result: AiRoofLayoutResponse | null,
): { x: number; y: number } {
  const poly = result?.roof_polygon_coordinates;
  if (poly && poly.length >= 2) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p.x;
      sy += p.y;
    }
    const x = sx / poly.length;
    const y = sy / poly.length;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return {
        x: Math.max(0, Math.min(imageSize.width, x)),
        y: Math.max(0, Math.min(imageSize.height, y)),
      };
    }
  }
  const panels = result?.panel_coordinates;
  if (panels && panels.length) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of panels) {
      const x2 = r.x + r.width;
      const y2 = r.y + r.height;
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    }
    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      const x = (minX + maxX) / 2;
      const y = (minY + maxY) / 2;
      return {
        x: Math.max(0, Math.min(imageSize.width, x)),
        y: Math.max(0, Math.min(imageSize.height, y)),
      };
    }
  }
  return { x: imageSize.width / 2, y: imageSize.height / 2 };
}

function focalPointForEditingPolygon(
  imageSize: { width: number; height: number },
  polygon: { x: number; y: number }[],
): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  for (const p of polygon) {
    sx += p.x;
    sy += p.y;
  }
  const x = sx / polygon.length;
  const y = sy / polygon.length;
  return {
    x: Math.max(0, Math.min(imageSize.width, x)),
    y: Math.max(0, Math.min(imageSize.height, y)),
  };
}

function scrollLayoutPreviewToFocal(
  el: HTMLDivElement,
  focalImageX: number,
  focalImageY: number,
  zoom: number,
) {
  const cw = el.clientWidth;
  const ch = el.clientHeight;
  const sw = el.scrollWidth;
  const sh = el.scrollHeight;
  const cx = focalImageX * zoom;
  const cy = focalImageY * zoom;
  el.scrollLeft = Math.max(0, Math.min(Math.max(0, sw - cw), cx - cw / 2));
  el.scrollTop = Math.max(0, Math.min(Math.max(0, sh - ch), cy - ch / 2));
}
import { Link } from 'react-router-dom';
import { getActiveCustomer, getCustomer, getResolvedRoofLayout, upsertCustomer } from '../lib/customerStore';

function persistRoofLayoutToActiveCustomer(params: {
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
  savedAt?: string;
}) {
  const ac = getActiveCustomer();
  if (!ac?.id) return;
  const fresh = getCustomer(ac.id);
  if (!fresh) return;
  upsertCustomer({
    ...fresh,
    roofLayout: {
      savedAt: params.savedAt ?? new Date().toISOString(),
      roof_area_m2: Number(params.roof_area_m2),
      usable_area_m2: Number(params.usable_area_m2),
      panel_count: Number(params.panel_count),
      layout_image_url: String(params.layout_image_url),
    },
  });
}

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
  const [loadedSavedAt, setLoadedSavedAt] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'saved' | 'editing'>('editing');
  const [panelSpacingMultiplier, setPanelSpacingMultiplier] = useState(1.5);
  const [panelOrientation, setPanelOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const exportRef = useRef<HTMLDivElement>(null);
  const layoutScrollRef = useRef<HTMLDivElement>(null);
  /** Per-image URL: centre saved view once, editing polygon once (don’t fight user scroll / drag). */
  const scrollCenterMetaRef = useRef<{ url: string; savedDone: boolean; editingDone: boolean }>({
    url: '',
    savedDone: false,
    editingDone: false,
  });

  // Konva shapes are rendered inside a container that's scaled via CSS `transform: scale(${zoom})`.
  // To keep the polygon outline and draggable points visible on mobile (especially when zoomed out),
  // we scale their visual sizes inversely to `zoom`.
  const polygonStrokeWidth = Math.max(1.5, 2 / zoom);
  const controlPointRadius = Math.max(6, 9 / zoom);
  const controlPointHitStrokeWidth = Math.max(24, 32 / zoom);

  // Konva-based layout state (pure frontend, no native deps)
  const stageRef = useRef<any>(null);
  const lineRef = useRef<any>(null);
  const polygonDragRef = useRef<{ x: number; y: number } | null>(null);
  const polygonBaseRef = useRef<Point[] | null>(null); // polygon at drag start for imperative updates
  const recomputeTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  // When true, canvas captures touch (edit polygon); when false, touches pass through so map scroll works (mobile)
  const [editMode, setEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  type Point = { x: number; y: number };
  type PanelRect = { x: number; y: number; w: number; h: number };

  const [polygon, setPolygon] = useState<Point[] | null>(null);
  const [panels, setPanels] = useState<PanelRect[]>([]);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  // Use crossOrigin='anonymous' so we can safely export the canvas to a data URL in production
  const [bgImage] = useImage(bgImageUrl ?? '', 'anonymous');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // On open, if the project already has a saved manual layout image, pre-load it
  // so the user immediately sees what was previously saved.
  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSavedLayout() {
      const crmProjectId = activeProject?.master?.crmProjectId;
      if (!crmProjectId) return;

      try {
        const manual = await fetchManualRoofLayout(String(crmProjectId));
        if (cancelled) return;
        if (!manual?.layout_image_url || !String(manual.layout_image_url).trim()) return;

        const next: AiRoofLayoutResponse = {
          roof_area_m2: Number(manual.roof_area_m2),
          usable_area_m2: Number(manual.usable_area_m2),
          panel_count: Number(manual.panel_count),
          layout_image_url: String(manual.layout_image_url),
        };

        setError(null);
        setResult(next);
        setLastSavedProjectId(String(crmProjectId));
        setLoadedSavedAt(manual?.savedAt ? String(manual.savedAt) : null);
        setLayoutMode('saved');

        persistRoofLayoutToActiveCustomer({
          roof_area_m2: next.roof_area_m2,
          usable_area_m2: next.usable_area_m2,
          panel_count: next.panel_count,
          layout_image_url: next.layout_image_url,
          savedAt: manual?.savedAt ? String(manual.savedAt) : undefined,
        });

        const rawUrl = next.layout_image_url && String(next.layout_image_url).trim()
          ? next.layout_image_url
          : null;
        const imageUrl = rawUrl
          ? rawUrl.startsWith('http')
            ? rawUrl
            : `${getApiBaseUrl() || ''}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
          : null;
        setBgImageUrl(imageUrl);

        // In saved mode, we do NOT show the editable polygon/panels overlay.
        setPolygon(null);
        setPanels([]);
        setImageSize(null);
      } catch {
        // If no layout exists yet, backend may respond 404; ignore and let user generate.
      }
    }

    hydrateFromSavedLayout();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.master?.crmProjectId]);

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

  // Saved view: centre the scroll viewport on roof/panels (API coords) or image centre.
  // Editing view: centre once per image on the polygon when it first exists (so the roof isn’t stuck top-left).
  useLayoutEffect(() => {
    if (!imageSize || !bgImage) return;

    const urlKey = bgImageUrl ?? '';
    if (scrollCenterMetaRef.current.url !== urlKey) {
      scrollCenterMetaRef.current = { url: urlKey, savedDone: false, editingDone: false };
    }

    if (layoutMode === 'saved') {
      if (scrollCenterMetaRef.current.savedDone) return;
      const focal = focalPointForSavedView(imageSize, result);
      const run = () => {
        const el = layoutScrollRef.current;
        if (!el) return;
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom);
        scrollCenterMetaRef.current.savedDone = true;
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
      return;
    }

    if (layoutMode === 'editing' && polygon && polygon.length >= 2) {
      if (scrollCenterMetaRef.current.editingDone) return;
      const focal = focalPointForEditingPolygon(imageSize, polygon);
      const run = () => {
        const el = layoutScrollRef.current;
        if (!el) return;
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom);
        scrollCenterMetaRef.current.editingDone = true;
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    }
  }, [layoutMode, imageSize, bgImage, bgImageUrl, result, polygon, zoom]);

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
    // Regenerate = switch to editing mode (show polygon + recompute metrics from polygon).
    setLayoutMode('editing');
    setPolygon(null);
    setPanels([]);

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

  async function captureLayoutImage(options?: { format?: 'png' | 'jpeg'; quality?: number; pixelRatio?: number }): Promise<string | null> {
    if (!stageRef.current) return null;
    const format = options?.format ?? 'png';
    const pixelRatio = options?.pixelRatio ?? 2;
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? (options?.quality ?? 0.82) : undefined;
    return stageRef.current.toDataURL({ pixelRatio, mimeType: mime, quality });
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
          const resp = await saveManualRoofLayoutImage({ projectId: crmProjectId, dataUrl: finalUrl });
          setLastSavedProjectId(String(crmProjectId));
          if (resp?.layout_image_url && result) {
            persistRoofLayoutToActiveCustomer({
              roof_area_m2: result.roof_area_m2,
              usable_area_m2: result.usable_area_m2,
              panel_count: result.panel_count,
              layout_image_url: resp.layout_image_url,
            });
          }
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
    if (!stageRef.current) {
      setError('Nothing to save yet. Generate a layout first.');
      return;
    }
    if (!activeProject?.master?.crmProjectId) {
      setError('This proposal is not linked to a Rayenna CRM project yet.');
      return;
    }
    setSavingToProposal(true);
    try {
      // Save a smaller JPEG to avoid 413 (Request Entity Too Large) in production.
      const dataUrl = await captureLayoutImage({ format: 'jpeg', quality: 0.82, pixelRatio: 1.25 });
      if (!dataUrl) return;
      const crmProjectId = activeProject?.master?.crmProjectId;
      if (crmProjectId) {
        const r = result?.roof_area_m2;
        const u = result?.usable_area_m2;
        const p = result?.panel_count;
        const saved = await saveManualRoofLayoutImage({
          projectId: crmProjectId,
          dataUrl,
          ...(Number.isFinite(Number(r)) && { roof_area_m2: Number(r) }),
          ...(Number.isFinite(Number(u)) && { usable_area_m2: Number(u) }),
          ...(Number.isFinite(Number(p)) && { panel_count: Number(p) }),
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
          if (result) {
            persistRoofLayoutToActiveCustomer({
              roof_area_m2: result.roof_area_m2,
              usable_area_m2: result.usable_area_m2,
              panel_count: result.panel_count,
              layout_image_url: saved.layout_image_url,
            });
          }
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Save for proposal failed:', e);
    } finally {
      setSavingToProposal(false);
    }
  };

  function computePanelsForPolygon(
    poly: Point[],
    maxPanelsCap: number = 120,
  ): {
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
    const maxPanelsRendered = Math.min(
      maxPanelsCap,
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
    if (layoutMode !== 'editing') return;
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
  }, [imageSize, panelSpacingMultiplier, polygon, layoutMode]);

  // Recompute panels + metrics whenever polygon / density / orientation changes,
  // but debounce and skip while actively dragging so interaction feels smooth.
  useEffect(() => {
    if (layoutMode !== 'editing') return;
    if (!polygon) return;
    if (isDraggingRef.current) return;
    if (recomputeTimeoutRef.current != null) {
      window.clearTimeout(recomputeTimeoutRef.current);
    }
    recomputeTimeoutRef.current = window.setTimeout(() => {
      const maxCap = typeof window !== 'undefined' && window.innerWidth < 768 ? 70 : 120;
      const { panels: nextPanels, roofAreaM2, usableAreaM2, panelCount } =
        computePanelsForPolygon(polygon, maxCap);
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
    }, 200);
    return () => {
      if (recomputeTimeoutRef.current != null) {
        window.clearTimeout(recomputeTimeoutRef.current);
      }
    };
  }, [polygon, panelSpacingMultiplier, panelOrientation, layoutMode]);

  return (
    <div className="overflow-x-hidden">
      {/* Page card — matches Costing / BOM / ROI heading pattern */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header strip */}
        <div
          className="px-6 py-5 sm:px-8 sm:py-6"
          style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">
                📐
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                  AI Roof Layout
                </h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  Uses project coordinates and system size to generate a draft solar panel layout for proposals.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto flex-shrink-0">
              {layoutMode === 'saved' && (
                <div className="flex justify-start sm:justify-end">
                  <span className="text-xs px-3 py-1.5 rounded-full border font-semibold bg-yellow-50 text-yellow-700 border-yellow-200">
                    ✓ Saved layout loaded
                  </span>
                </div>
              )}
              {layoutMode === 'editing' && result && (
                <div className="flex justify-start sm:justify-end">
                  <span className="text-xs px-3 py-1.5 rounded-full border font-semibold bg-white/20 text-white border-white/40">
                    ⚡ Layout draft
                  </span>
                </div>
              )}
              <div className="flex justify-start sm:justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating…' : result ? 'Regenerate AI Layout' : 'Generate AI Layout'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {/* Active customer banner — same pattern as BOM / Costing */}
          {(() => {
            const ac = getActiveCustomer();
            const roofSaved = ac ? !!getResolvedRoofLayout(ac) : false;
            return ac ? (
              <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-sky-700">
                  <span className="font-semibold">Active customer:</span> {ac.master.name}
                  {roofSaved && (
                    <span className="ml-2 text-emerald-600 font-medium">· Roof layout saved ✓</span>
                  )}
                </p>
                <Link
                  to="/"
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap transition-colors"
                >
                  View Dashboard →
                </Link>
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-amber-700">
                  No active customer. Open a project from Customers or Dashboard to use AI roof layout.
                </p>
                <Link
                  to="/customers"
                  className="text-xs text-amber-700 hover:text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
                >
                  Select Customer →
                </Link>
              </div>
            );
          })()}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8">
        {result && lastSavedProjectId && activeProject?.master?.crmProjectId && lastSavedProjectId === String(activeProject.master.crmProjectId) && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold">Saved layout loaded</div>
            <div className="mt-0.5 text-xs text-emerald-800">
              {loadedSavedAt ? `Last saved: ${new Date(loadedSavedAt).toLocaleString()}` : 'This project already has a saved roof layout.'}
            </div>
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
          <div ref={exportRef} className="mt-3 space-y-4">
            {/* Mobile: single column — Summary → Actions → Controls → Photo. Desktop: grid with summary left, preview right. */}
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.3fr)] lg:gap-6 lg:items-start">
              {/* 1) Layout summary — first on mobile and desktop left column */}
              <div className="space-y-3 order-1 lg:order-1">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Layout summary
                </h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 col-span-2 sm:col-span-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Panel count
                    </dt>
                    <dd className="mt-1 text-base font-semibold text-gray-900">
                      {Number.isFinite(result.panel_count) ? result.panel_count : '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 2) Actions + Controls + Photo — second on mobile (right column on desktop) */}
              <div className="space-y-4 order-2 lg:order-2 bg-white p-3 sm:p-4 rounded-xl border border-gray-100">
                {/* Layout actions — touch-friendly on mobile */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide w-full sm:w-auto">Actions</span>
                  <button
                    type="button"
                    onClick={() => handleExportLayoutImage('png')}
                    disabled={exporting}
                    className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60 border border-gray-300"
                  >
                    {exporting ? '…' : 'PNG'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportLayoutImage('jpeg')}
                    disabled={exporting}
                    className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60 border border-gray-300"
                  >
                    {exporting ? '…' : 'JPG'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveForProposal}
                    disabled={savingToProposal}
                    className={`min-h-[44px] sm:min-h-0 inline-flex items-center justify-center px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold border flex-1 sm:flex-initial ${
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

                {/* All controls — stacked on mobile for easy tap, inline on desktop */}
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Layout preview
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                    <div className="flex items-center justify-between gap-3 sm:gap-2">
                      <span className="text-xs font-medium text-gray-600 min-w-[4rem]">Zoom</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setZoom((z) => Math.max(0.2, Math.round((z - 0.25) * 4) / 4))
                          }
                          className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 touch-manipulation"
                          aria-label="Zoom out"
                        >
                          −
                        </button>
                        <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
                          {Math.round(zoom * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setZoom((z) => Math.min(10, Math.round((z + 0.25) * 4) / 4))
                          }
                          className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 touch-manipulation"
                          aria-label="Zoom in"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="text-xs font-medium text-gray-600">Panel density</span>
                      <input
                        type="range"
                        min={0.8}
                        max={2}
                        step={0.2}
                        value={panelSpacingMultiplier}
                        onChange={(e) => setPanelSpacingMultiplier(Number(e.target.value))}
                        className="w-full sm:w-32 h-8 accent-indigo-600"
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
                          setPanelOrientation((prev) =>
                            prev === 'portrait' ? 'landscape' : 'portrait',
                          )
                        }
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:px-2 sm:py-1 rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50 touch-manipulation"
                      >
                        {panelOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!imageSize) return;
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
                      className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:px-2 sm:py-1 rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50 touch-manipulation w-full sm:w-auto"
                    >
                      Snap to grid
                    </button>
                  </div>
                </div>

                {/* Photo / canvas — scrollable area is exactly the scaled image size (no blank space at any zoom) */}
                <div className="min-h-[260px] sm:min-h-[320px] aspect-[4/3] sm:aspect-video rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  {/* Scroll vs Edit: when editMode is false, canvas doesn't capture touch so native scroll works on mobile */}
                  {isMobileView && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">Map:</span>
                        <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold border touch-manipulation ${
                          !editMode ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'bg-white border-gray-300 text-gray-600'
                        }`}
                      >
                        Scroll map
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditMode(true)}
                        className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold border touch-manipulation ${
                          editMode ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'bg-white border-gray-300 text-gray-600'
                        }`}
                      >
                        Edit polygon
                      </button>
                    </div>
                    </div>
                  )}
                  <div
                    ref={layoutScrollRef}
                    className="w-full h-full overflow-auto overscroll-contain min-w-0 min-h-0"
                    style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                  >
                    {bgImage && imageSize ? (
                      <div
                        className="relative flex-shrink-0"
                        style={{
                          width: imageSize.width * zoom,
                          height: imageSize.height * zoom,
                          minWidth: imageSize.width * zoom,
                          minHeight: imageSize.height * zoom,
                        }}
                      >
                        <div
                          className="absolute top-0 left-0"
                          style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: '0 0',
                            width: imageSize.width,
                            height: imageSize.height,
                            pointerEvents: editMode || !isMobileView ? 'auto' : 'none',
                          }}
                        >
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

                        {/* Roof polygon boundary in green + drag-whole-roof helper (editing only) */}
                        {layoutMode === 'editing' && polygon && (
                          <Layer>
                            <Line
                              ref={lineRef}
                              points={polygon.flatMap((p) => [p.x, p.y])}
                              closed
                              stroke="#16a34a"
                              strokeWidth={polygonStrokeWidth}
                              fill="rgba(34,197,94,0.08)"
                              listening={false}
                            />
                            {(() => {
                              let minX = polygon[0]!.x;
                              let maxX = polygon[0]!.x;
                              let minY = polygon[0]!.y;
                              let maxY = polygon[0]!.y;
                              for (const p of polygon) {
                                if (p.x < minX) minX = p.x;
                                if (p.x > maxX) maxX = p.x;
                                if (p.y < minY) minY = p.y;
                                if (p.y > maxY) maxY = p.y;
                              }
                              const w = Math.max(10, maxX - minX);
                              const h = Math.max(10, maxY - minY);
                              return (
                                <Rect
                                  x={minX}
                                  y={minY}
                                  width={w}
                                  height={h}
                                  opacity={0}
                                  draggable
                                  strokeEnabled={false}
                                  onDragStart={(e) => {
                                    isDraggingRef.current = true;
                                    setIsDragging(true);
                                    polygonBaseRef.current = polygon ? polygon.map((p) => ({ ...p })) : null;
                                    polygonDragRef.current = {
                                      x: e.target.x(),
                                      y: e.target.y(),
                                    };
                                  }}
                                  onDragMove={(e) => {
                                    if (!polygonDragRef.current || !polygonBaseRef.current || !lineRef.current) return;
                                    const start = polygonDragRef.current;
                                    const nx = e.target.x();
                                    const ny = e.target.y();
                                    const dx = nx - start.x;
                                    const dy = ny - start.y;
                                    const flat = polygonBaseRef.current.flatMap((p) => [p.x + dx, p.y + dy]);
                                    lineRef.current.points(flat);
                                    lineRef.current.getLayer()?.batchDraw();
                                  }}
                                  onDragEnd={() => {
                                    polygonDragRef.current = null;
                                    isDraggingRef.current = false;
                                    setIsDragging(false);
                                    if (lineRef.current) {
                                      const flat = lineRef.current.points();
                                      const next: Point[] = [];
                                      for (let i = 0; i < flat.length; i += 2) next.push({ x: flat[i]!, y: flat[i + 1]! });
                                      setPolygon(next.length ? next : null);
                                    }
                                    polygonBaseRef.current = null;
                                  }}
                                />
                              );
                            })()}
                          </Layer>
                        )}

                        {/* Panels clipped to polygon, with improved styling — hidden during drag for performance */}
                        {layoutMode === 'editing' && polygon && panels.length > 0 && !isDragging && (
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

                        {/* Draggable polygon control points (bigger hit areas for easier touch/trackpad use) */}
                        {layoutMode === 'editing' && polygon && (
                          <Layer>
                            {polygon.map((p, idx) => (
                              <Circle
                                key={idx}
                                x={p.x}
                                y={p.y}
                                  radius={controlPointRadius}
                                fill="#10b981"
                                stroke="#047857"
                                strokeWidth={1.5}
                                  hitStrokeWidth={controlPointHitStrokeWidth}
                                draggable
                                onDragStart={() => {
                                  isDraggingRef.current = true;
                                  setIsDragging(true);
                                }}
                                onDragMove={(e) => {
                                  if (!lineRef.current || !polygon) return;
                                  const nx = e.target.x();
                                  const ny = e.target.y();
                                  const flat = polygon.flatMap((pt, i) =>
                                    i === idx ? [nx, ny] : [pt.x, pt.y],
                                  );
                                  lineRef.current.points(flat);
                                  lineRef.current.getLayer()?.batchDraw();
                                }}
                                onDragEnd={() => {
                                  isDraggingRef.current = false;
                                  setIsDragging(false);
                                  if (lineRef.current) {
                                    const flat = lineRef.current.points();
                                    const next: Point[] = [];
                                    for (let i = 0; i < flat.length; i += 2) next.push({ x: flat[i]!, y: flat[i + 1]! });
                                    setPolygon(next.length ? next : null);
                                  }
                                }}
                              />
                            ))}
                          </Layer>
                        )}
                          </Stage>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm min-h-[200px]">
                        No layout image returned
                      </div>
                    )}
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
      </div>
    </div>
  );
}

