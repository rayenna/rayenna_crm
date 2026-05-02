import { Suspense, lazy, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle, Text } from 'react-konva';
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
  saveRoofLayout3dImage,
  setRoofLayoutEmbedPreference,
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

/** Extra whitespace (px) added around the 2D map inside the scroll container — gives room to scroll past image edges. */
const SCROLL_BUFFER_PX = 300;

function scrollLayoutPreviewToFocal(
  el: HTMLDivElement,
  focalImageX: number,
  focalImageY: number,
  zoom: number,
  scrollBuffer = 0,
) {
  const cw = el.clientWidth;
  const ch = el.clientHeight;
  const sw = el.scrollWidth;
  const sh = el.scrollHeight;
  // Focal point in viewport pixels, offset by the extra buffer padding around the image.
  const cx = focalImageX * zoom + scrollBuffer;
  const cy = focalImageY * zoom + scrollBuffer;
  el.scrollLeft = Math.max(0, Math.min(Math.max(0, sw - cw), cx - cw / 2));
  el.scrollTop = Math.max(0, Math.min(Math.max(0, sh - ch), cy - ch / 2));
}
import { Link } from 'react-router-dom';
import { getActiveCustomer, getCustomer, getResolvedRoofLayout, upsertCustomer } from '../lib/customerStore';
import type { Solar3DOrbitSnapshot, Solar3DViewHandle } from '../components/Solar3DView';

function absolutizeLayoutImageUrl(raw: string | null | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim();
  if (s.startsWith('http')) return s;
  const base = getApiBaseUrl() || '';
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}

function persistRoofLayoutToActiveCustomer(params: {
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
  layout_image_3d_url?: string;
  prefer_3d_for_proposal?: boolean;
  savedAt?: string;
}) {
  const ac = getActiveCustomer();
  if (!ac?.id) return;
  const fresh = getCustomer(ac.id);
  if (!fresh) return;
  const roofLayout = {
    savedAt: params.savedAt ?? new Date().toISOString(),
    roof_area_m2: Number(params.roof_area_m2),
    usable_area_m2: Number(params.usable_area_m2),
    panel_count: Number(params.panel_count),
    layout_image_url: String(params.layout_image_url),
    ...(params.layout_image_3d_url != null && String(params.layout_image_3d_url).trim()
      ? { layout_image_3d_url: String(params.layout_image_3d_url) }
      : {}),
    ...(typeof params.prefer_3d_for_proposal === 'boolean'
      ? { prefer_3d_for_proposal: params.prefer_3d_for_proposal }
      : {}),
  };
  upsertCustomer({
    ...fresh,
    roofLayout,
    proposal: fresh.proposal
      ? {
          ...fresh.proposal,
          roofLayout:
            fresh.proposal.roofLayout || fresh.proposal.includeRoofLayout
              ? {
                  ...(fresh.proposal.roofLayout ?? {
                    roof_area_m2: roofLayout.roof_area_m2,
                    usable_area_m2: roofLayout.usable_area_m2,
                    panel_count: roofLayout.panel_count,
                    layout_image_url: roofLayout.layout_image_url,
                  }),
                  ...roofLayout,
                }
              : fresh.proposal.roofLayout,
        }
      : fresh.proposal,
  });
}

const LazySolar3DView = lazy(() => import('../components/Solar3DView'));

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
  /** 3D layout preview zoom (separate from 2D Konva zoom). Scales scroll content so WebGL resizes — stays sharp. */
  const [zoom3d, setZoom3d] = useState(1);
  const [layoutScrollViewport, setLayoutScrollViewport] = useState({ w: 0, h: 0 });
  const [savingToProposal, setSavingToProposal] = useState(false);
  const [lastSavedProjectId, setLastSavedProjectId] = useState<string | null>(null);
  const [loadedSavedAt, setLoadedSavedAt] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'saved' | 'editing'>('editing');
  const [panelSpacingMultiplier, setPanelSpacingMultiplier] = useState(1.5);
  const [panelOrientation, setPanelOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [roofViewTab, setRoofViewTab] = useState<'2d' | '3d'>('2d');
  const [last3dPngDataUrl, setLast3dPngDataUrl] = useState<string | null>(null);
  // Controls which image we embed when the user clicks "Save for proposal".
  // Defaults to 2D; gets set to 3D whenever the 3D view exports a PNG.
  const [proposalImageSource, setProposalImageSource] = useState<'2d' | '3d'>('2d');

  // Summary (roof area / usable area / panel count) is recomputed from the polygon.
  // Immediately after regeneration, we temporarily have AI values in `result` but polygon-based
  // recompute hasn't run yet. To avoid showing ridiculous temporary numbers, we blank the UI
  // until the polygon-based recompute completes at least once.
  const [isPolygonSummaryReady, setIsPolygonSummaryReady] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const layoutScrollRef = useRef<HTMLDivElement>(null);
  /** 2D / saved-3D preview: stable width without inner scrollbars. */
  const layoutPreviewMeasureRef = useRef<HTMLDivElement>(null);
  /** Live 3D: canvas column only (excludes docked control column). */
  const layout3dCanvasMeasureRef = useRef<HTMLDivElement>(null);
  const solar3dRef = useRef<Solar3DViewHandle | null>(null);
  /** Survives 3D unmount during Save (brief 2D tab) so orbit is restored and layout key matches. */
  const solar3dPersistentLayoutKeyRef = useRef('');
  const solar3dOrbitRef = useRef<Solar3DOrbitSnapshot | null>(null);
  /** Mount node for 3D control panel (outside scroll canvas, like 2D toolbars). */
  const [solar3dControlsHost, setSolar3dControlsHost] = useState<HTMLDivElement | null>(null);

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
  /** Ref to the control-point circles Layer so it can be hidden before toDataURL capture. */
  const handlesLayerRef = useRef<any>(null);
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

  /** Phones + tablets (iPad portrait): 3D uses full-width viewport + resolutionScale instead of scroll-zoom. */
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const onResize = () => setIsNarrowViewport(window.innerWidth < 1024);
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

  // DevTools open/close can cause viewport reflow (scrollbars/layout changes).
  // Konva sometimes needs an explicit redraw after such changes to keep shapes visible.
  useEffect(() => {
    if (!stageRef.current) return;
    try {
      stageRef.current.batchDraw?.();
      stageRef.current.draw?.();
    } catch {
      // No-op: stageRef may not be ready during initial render.
    }
  }, [isMobileView, zoom, roofViewTab, imageSize]);

  const has3DRoofData =
    polygon != null && polygon.length >= 3 && panels.length > 0 && imageSize != null;

  useLayoutEffect(() => {
    const el =
      roofViewTab === '3d' && has3DRoofData
        ? layoutScrollRef.current ?? layout3dCanvasMeasureRef.current
        : layoutPreviewMeasureRef.current;
    if (!el) return;

    let roRaf: number | null = null;
    const HYST_PX = 3;

    const apply = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      setLayoutScrollViewport((prev) => {
        if (Math.abs(prev.w - w) < HYST_PX && Math.abs(prev.h - h) < HYST_PX) return prev;
        return { w, h };
      });
    };

    apply(el.clientWidth, el.clientHeight);

    const schedule = () => {
      if (roRaf != null) return;
      roRaf = requestAnimationFrame(() => {
        roRaf = null;
        apply(el.clientWidth, el.clientHeight);
      });
    };

    const ro = new ResizeObserver(() => schedule());
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (roRaf != null) cancelAnimationFrame(roRaf);
    };
  }, [roofViewTab, layoutMode, has3DRoofData]);

  const narrow3dLive = isNarrowViewport && roofViewTab === '3d' && has3DRoofData;

  // Narrow live 3D: layout zoom (>100%) caused ResizeObserver/WebGL thrash; orbit pinch-zoom is stable.
  useEffect(() => {
    if (narrow3dLive) setZoom3d(1);
  }, [narrow3dLive]);

  /** URL for showing a saved 3D PNG (server or in-memory data URL) when polygon/panels are not loaded (saved layout mode). */
  const saved3dDisplayUrl = (() => {
    const last = last3dPngDataUrl;
    if (last && last.startsWith('data:')) return last;
    return absolutizeLayoutImageUrl(last ?? result?.layout_image_3d_url);
  })();

  const canToggle2d3dPreview = has3DRoofData || !!saved3dDisplayUrl;

  /** Proposal can use 3D when the live 3D scene exists or a 3D PNG is in memory / on the server. */
  const canChoose3dForProposal =
    has3DRoofData ||
    !!(last3dPngDataUrl && String(last3dPngDataUrl).trim()) ||
    !!(result?.layout_image_3d_url && String(result.layout_image_3d_url).trim());

  function handleChooseProposalLayout2d() {
    setProposalImageSource('2d');
    setRoofViewTab('2d');
  }

  function handleChooseProposalLayout3d() {
    if (!canChoose3dForProposal) return;
    setProposalImageSource('3d');
    if (canToggle2d3dPreview) setRoofViewTab('3d');
  }

  const layout3dBaseW = Math.max(layoutScrollViewport.w, 360);
  const layout3dBaseH = Math.max(layoutScrollViewport.h, 280);
  const layoutZoom3dActive = roofViewTab === '3d';
  const layoutZoomValue = layoutZoom3dActive ? zoom3d : zoom;
  const layoutZoomMin = layoutZoom3dActive ? 0.25 : 0.2;
  const setLayoutZoom = layoutZoom3dActive ? setZoom3d : setZoom;

  useEffect(() => {
    // Without live geometry, only keep 3D tab if we have a persisted 3D image to show.
    if (roofViewTab === '3d' && !has3DRoofData && !saved3dDisplayUrl) setRoofViewTab('2d');
  }, [has3DRoofData, roofViewTab, saved3dDisplayUrl]);

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
        if (manual.layout_image_3d_url != null && String(manual.layout_image_3d_url).trim()) {
          next.layout_image_3d_url = String(manual.layout_image_3d_url);
        }
        if (typeof manual.prefer_3d_for_proposal === 'boolean') {
          next.prefer_3d_for_proposal = manual.prefer_3d_for_proposal;
        }

        setError(null);
        setResult(next);
        setLastSavedProjectId(String(crmProjectId));
        setLoadedSavedAt(manual?.savedAt ? String(manual.savedAt) : null);
        setLayoutMode('saved');
        setIsPolygonSummaryReady(true);

        const u3 = absolutizeLayoutImageUrl(manual.layout_image_3d_url);
        if (u3) setLast3dPngDataUrl(u3);
        else setLast3dPngDataUrl(null);
        setProposalImageSource(manual.prefer_3d_for_proposal === true ? '3d' : '2d');
        if (u3 && manual.prefer_3d_for_proposal === true) setRoofViewTab('3d');
        else setRoofViewTab('2d');

        persistRoofLayoutToActiveCustomer({
          roof_area_m2: next.roof_area_m2,
          usable_area_m2: next.usable_area_m2,
          panel_count: next.panel_count,
          layout_image_url: next.layout_image_url,
          layout_image_3d_url: next.layout_image_3d_url,
          prefer_3d_for_proposal: next.prefer_3d_for_proposal,
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
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom, SCROLL_BUFFER_PX);
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
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom, SCROLL_BUFFER_PX);
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
    solar3dPersistentLayoutKeyRef.current = '';
    solar3dOrbitRef.current = null;
    // Regenerate starts a new draft: clear prior "saved" visual state.
    setLastSavedProjectId(null);
    // Regenerate = switch to editing mode (show polygon + recompute metrics from polygon).
    setLayoutMode('editing');
    setIsPolygonSummaryReady(false);
    // Ensure the recompute effect doesn't early-return because we're stuck in a "dragging" state
    // from a previous interaction.
    isDraggingRef.current = false;
    setIsDragging(false);
    polygonDragRef.current = null;
    polygonBaseRef.current = null;
    setPolygon(null);
    setPanels([]);
    // Prevent the default polygon from initializing using the *previous* background image size
    // while the new AI layout is still loading (otherwise we get a brief "old AI" flash).
    setBgImageUrl(null);
    setImageSize(null);

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
      solar3dPersistentLayoutKeyRef.current = '';
      solar3dOrbitRef.current = null;
      setLast3dPngDataUrl(null);
      setProposalImageSource('2d');

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

    // Hide control-point handles and scale bar editing overlay before capture so the saved
    // image is clean — no green dots on polygon corners, no on-screen UI artefacts.
    const handlesLayer = handlesLayerRef.current;
    if (handlesLayer) {
      handlesLayer.visible(false);
      stageRef.current.batchDraw();
    }
    const dataUrl = stageRef.current.toDataURL({ pixelRatio, mimeType: mime, quality });
    if (handlesLayer) {
      handlesLayer.visible(true);
      stageRef.current.batchDraw();
    }
    return dataUrl;
  }

  const handleSaveForProposal = async () => {
    if (!activeProject?.master?.crmProjectId) {
      setError('This proposal is not linked to a Rayenna CRM project yet.');
      return;
    }
    if (!bgImage || !imageSize) {
      setError('Nothing to save yet. Generate a layout first.');
      return;
    }

    const crmProjectId = activeProject.master.crmProjectId;
    const prevViewTab = roofViewTab;
    // 3D tab never mounts the Konva Stage (interactive 3D or static PNG) — switch to 2D briefly to capture.
    const needTemp2d = prevViewTab === '3d';

    setSavingToProposal(true);
    setError(null);

    async function waitForStageAfterSwitch(): Promise<boolean> {
      const deadline = Date.now() + 900;
      while (Date.now() < deadline) {
        if (stageRef.current) {
          await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          );
          try {
            stageRef.current.batchDraw?.();
          } catch {
            /* ignore */
          }
          return true;
        }
        await new Promise((r) => setTimeout(r, 20));
      }
      return false;
    }

    /** Fresh capture from live WebGL (state updates are async; use this in src3d for the same tick). */
    let captured3dForSave: string | null = null;

    try {
      if (prevViewTab === '3d' && proposalImageSource === '3d') {
        try {
          captured3dForSave = (await solar3dRef.current?.captureCurrentViewPng()) ?? null;
          if (captured3dForSave) setLast3dPngDataUrl(captured3dForSave);
        } catch {
          /* keep existing last3dPngDataUrl */
        }
      }

      if (needTemp2d) {
        flushSync(() => setRoofViewTab('2d'));
        const ok = await waitForStageAfterSwitch();
        if (!ok) {
          setError('Could not prepare the 2D view for capture. Open the 2D tab, then save again.');
          return;
        }
      }

      const r = result?.roof_area_m2;
      const u = result?.usable_area_m2;
      const p = result?.panel_count;
      const metrics = {
        ...(Number.isFinite(Number(r)) && { roof_area_m2: Number(r) }),
        ...(Number.isFinite(Number(u)) && { usable_area_m2: Number(u) }),
        ...(Number.isFinite(Number(p)) && { panel_count: Number(p) }),
      };

      const dataUrl = await captureLayoutImage({
        format: 'jpeg',
        quality: 0.82,
        pixelRatio: 1.25,
      });
      if (!dataUrl) {
        setError('Could not capture the 2D layout. Open the 2D tab, then save again.');
        return;
      }

      const saved2d = await saveManualRoofLayoutImage({
        projectId: crmProjectId,
        dataUrl,
        ...metrics,
      });
      if (!saved2d?.layout_image_url) {
        setError('Server did not return a 2D layout URL.');
        return;
      }

      const src3d =
        captured3dForSave ||
        last3dPngDataUrl ||
        absolutizeLayoutImageUrl(result?.layout_image_3d_url) ||
        '';

      let next3dUrl: string | undefined;
      let nextPrefer3d = false;

      if (src3d.startsWith('data:')) {
        const saved3d = await saveRoofLayout3dImage({
          projectId: crmProjectId,
          dataUrl: src3d,
          setPreferForProposal: proposalImageSource === '3d',
          ...metrics,
        });
        next3dUrl = saved3d.layout_image_3d_url;
        nextPrefer3d = saved3d.prefer_3d_for_proposal;
        const abs = absolutizeLayoutImageUrl(saved3d.layout_image_3d_url);
        if (abs) setLast3dPngDataUrl(abs);
      } else if (src3d.startsWith('http')) {
        await setRoofLayoutEmbedPreference(String(crmProjectId), proposalImageSource === '3d');
        nextPrefer3d = proposalImageSource === '3d';
      } else if (proposalImageSource === '3d') {
        setError(
          '2D layout was saved. Open 3D view, export a PNG, then save again to store the 3D image for proposals.',
        );
      }

      setResult((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          layout_image_url: saved2d.layout_image_url,
          ...(next3dUrl != null && { layout_image_3d_url: next3dUrl }),
          prefer_3d_for_proposal: nextPrefer3d,
        };
        persistRoofLayoutToActiveCustomer({
          roof_area_m2: next.roof_area_m2,
          usable_area_m2: next.usable_area_m2,
          panel_count: next.panel_count,
          layout_image_url: next.layout_image_url,
          layout_image_3d_url: next.layout_image_3d_url,
          prefer_3d_for_proposal: next.prefer_3d_for_proposal,
        });
        return next;
      });
      setLastSavedProjectId(String(crmProjectId));
    } catch (e) {
      setError('Could not save to the server. Check your connection and try again.');
      if (import.meta.env.DEV) console.error('Save for proposal failed:', e);
    } finally {
      if (needTemp2d) setRoofViewTab(prevViewTab);
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
      const maxCap = typeof window !== 'undefined' && window.innerWidth < 768 ? 150 : 300;
      const { panels: nextPanels, roofAreaM2, usableAreaM2, panelCount } =
        computePanelsForPolygon(polygon, maxCap);

      // DEV diagnostics for debugging panel/area mismatches.
      if (import.meta.env.DEV) {
        const minX = polygon.reduce((m, p) => Math.min(m, p.x), Infinity);
        const maxX = polygon.reduce((m, p) => Math.max(m, p.x), -Infinity);
        const minY = polygon.reduce((m, p) => Math.min(m, p.y), Infinity);
        const maxY = polygon.reduce((m, p) => Math.max(m, p.y), -Infinity);
        console.log('[AIRoofLayout] recompute polygon px bounds:', { minX, maxX, minY, maxY });
        console.log(
          '[AIRoofLayout] METERS_PER_PIXEL:',
          METERS_PER_PIXEL,
          'area m2:',
          roofAreaM2,
          'usable m2:',
          usableAreaM2,
        );
        console.log(
          '[AIRoofLayout] panelCount ideal:',
          panelCount,
          'panels rendered (capped):',
          nextPanels.length,
          'panelOrientation:',
          panelOrientation,
        );
      }

      setPanels(nextPanels);
      setIsPolygonSummaryReady(true);
      setResult((prev) => {
        return prev
          ? {
              ...prev,
              roof_area_m2: roofAreaM2,
              usable_area_m2: usableAreaM2,
              panel_count: panelCount,
            }
          : prev;
      });
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
        <div className="px-2 sm:px-6 md:px-8 py-4 sm:py-8">
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 sm:p-6 lg:p-8 max-md:rounded-lg">
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
                      {(layoutMode === 'editing' && !isPolygonSummaryReady)
                        ? '—'
                        : (Number.isFinite(result.roof_area_m2) ? Number(result.roof_area_m2).toFixed(1) : '—')} m²
                    </dd>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Usable area
                    </dt>
                    <dd className="mt-1 text-base font-semibold text-gray-900">
                      {(layoutMode === 'editing' && !isPolygonSummaryReady)
                        ? '—'
                        : (Number.isFinite(result.usable_area_m2) ? Number(result.usable_area_m2).toFixed(1) : '—')} m²
                    </dd>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 col-span-2 sm:col-span-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Panel count
                    </dt>
                    <dd className="mt-1 text-base font-semibold text-gray-900">
                      {(layoutMode === 'editing' && !isPolygonSummaryReady)
                        ? '—'
                        : (Number.isFinite(result.panel_count) ? result.panel_count : '—')}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 2) Actions + Controls + Photo — second on mobile (right column on desktop) */}
              <div className="flex flex-col gap-4 order-2 lg:order-2 bg-white p-2 sm:p-4 rounded-xl border border-gray-100">
                {/* Layout actions — touch-friendly on mobile */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide w-full sm:w-auto">Actions</span>
                  <div className="w-full flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleChooseProposalLayout2d}
                      className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold border flex-1 ${
                        proposalImageSource === '2d'
                          ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Use 2D Layout
                    </button>
                    <button
                      type="button"
                      onClick={handleChooseProposalLayout3d}
                      disabled={!canChoose3dForProposal}
                      className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold border flex-1 ${
                        proposalImageSource === '3d'
                          ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Use 3D Render
                    </button>
                  </div>
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
                        ? 'Saved for Proposal'
                        : 'Save to Proposal'}
                  </button>
                  <p className="w-full text-[11px] text-gray-500 leading-snug">
                    These buttons switch the preview and set which image the proposal uses. Save stores both 2D and 3D when you have exported a 3D PNG (or it is already on the server).
                  </p>
                </div>

                {/* All controls — stacked on mobile for easy tap, inline on desktop */}
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Layout preview
                  </h2>
                  {canToggle2d3dPreview && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRoofViewTab('2d');
                          setProposalImageSource('2d');
                        }}
                        className={`min-h-[44px] px-4 py-2 rounded-full border text-xs font-semibold touch-manipulation ${
                          roofViewTab === '2d'
                            ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        2D Layout
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canChoose3dForProposal) return;
                          setRoofViewTab('3d');
                          setProposalImageSource('3d');
                        }}
                        disabled={!canChoose3dForProposal}
                        className={`min-h-[44px] px-4 py-2 rounded-full border text-xs font-semibold touch-manipulation ${
                          roofViewTab === '3d'
                            ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        3D View
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                    {(roofViewTab === '2d' || roofViewTab === '3d') &&
                      (narrow3dLive ? (
                        <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-xs font-medium text-gray-700">3D scene (phone / tablet)</p>
                          <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                            Pinch with two fingers to zoom the camera. Drag to orbit. Layout zoom is disabled here to
                            avoid glitches.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 sm:gap-2 w-full sm:w-auto">
                          <span className="text-xs font-medium text-gray-600 min-w-[4rem]">
                            Zoom{roofViewTab === '3d' ? ' (3D)' : ''}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setLayoutZoom((z) =>
                                  Math.max(layoutZoomMin, Math.round((z - 0.25) * 4) / 4),
                                )
                              }
                              className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 touch-manipulation"
                              aria-label="Zoom out"
                            >
                              −
                            </button>
                            <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
                              {Math.round(layoutZoomValue * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setLayoutZoom((z) =>
                                  Math.min(10, Math.round((z + 0.25) * 4) / 4),
                                )
                              }
                              className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 touch-manipulation"
                              aria-label="Zoom in"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
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
                    {roofViewTab !== '3d' && (
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
                        }}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:px-2 sm:py-1 rounded-full border border-gray-300 bg-white text-xs font-semibold hover:bg-gray-50 touch-manipulation w-full sm:w-auto"
                      >
                        Snap to grid
                      </button>
                    )}
                  </div>
                </div>

                {/* Photo / canvas — 2D: content-sized scroll; 3D: stable slate gutter + scrollbars (no white flash) */}
                <div
                  className={`min-h-[260px] sm:min-h-[320px] rounded-2xl border border-gray-200 flex flex-col min-h-0 overflow-hidden ${
                    roofViewTab === '3d'
                      ? // Fixed viewport on lg+: avoid flex-1 + stretch (was blowing out height, half-empty canvas + resize flicker).
                        'bg-slate-200 lg:min-h-[360px] lg:h-[min(72vh,720px)] lg:max-h-[min(72vh,720px)] lg:shrink-0'
                      : 'aspect-[4/3] sm:aspect-video bg-white'
                  }`}
                >
                  {/* Scroll vs Edit: when editMode is false, canvas doesn't capture touch so native scroll works on mobile */}
                  {isMobileView && roofViewTab !== '3d' && (
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
                  {roofViewTab === '3d' && has3DRoofData ? (
                    <div
                      className={`flex flex-1 min-h-0 min-w-0 gap-2 sm:gap-3 p-0 sm:p-2 lg:p-3 ${
                        narrow3dLive ? 'flex-col lg:flex-row' : 'flex-col'
                      }`}
                    >
                      {narrow3dLive && (
                        <div
                          ref={setSolar3dControlsHost}
                          className="w-full lg:w-[min(18rem,100%)] xl:w-80 shrink-0 order-2 lg:order-1 max-h-[min(44vh,22rem)] sm:max-h-[min(48vh,24rem)] lg:max-h-none overflow-y-auto overflow-x-hidden min-h-0"
                          aria-label="3D scene controls"
                        />
                      )}
                      <div
                        ref={layout3dCanvasMeasureRef}
                        className={`w-full min-h-0 min-w-0 flex flex-col overflow-hidden flex-1 ${
                          narrow3dLive ? 'order-1 lg:order-2' : ''
                        }`}
                      >
                        <div
                          ref={layoutScrollRef}
                          className={`w-full flex-1 min-h-0 min-w-0 overscroll-contain bg-slate-200 ${
                            narrow3dLive
                              ? 'overflow-y-auto overflow-x-hidden'
                              : 'layout-preview-scroll-3d overflow-x-scroll overflow-y-scroll'
                          }`}
                          style={{
                            WebkitOverflowScrolling: 'touch',
                            // Narrow live 3D: let the WebGL canvas receive pinch-zoom (OrbitControls); avoid pan-x/pan-y on the wrapper.
                            ...(narrow3dLive ? {} : { touchAction: 'pan-x pan-y' as const }),
                          }}
                        >
                          {narrow3dLive ? (
                            <div className="flex flex-col w-full min-w-0 items-stretch">
                              <div
                                className="w-full shrink-0 bg-slate-200"
                                style={{
                                  height: 'min(56vh, 480px)',
                                  minHeight: 220,
                                }}
                              >
                                <Suspense
                                  fallback={
                                    <div className="w-full h-full min-h-[220px] flex items-center justify-center text-gray-500 text-sm bg-slate-200">
                                      Loading 3D…
                                    </div>
                                  }
                                >
                                  <LazySolar3DView
                                    ref={solar3dRef}
                                    orbitStateRef={solar3dOrbitRef}
                                    persistentLayoutKeyRef={solar3dPersistentLayoutKeyRef}
                                    controlsPortalHost={solar3dControlsHost}
                                    fillParent
                                    resolutionScale={1}
                                    roofPolygon={polygon!}
                                    panelCoordinates={panels.map((p) => ({
                                      x: p.x,
                                      y: p.y,
                                      width: p.w,
                                      height: p.h,
                                    }))}
                                    imageSize={imageSize!}
                                    roofImageUrl={bgImageUrl ?? undefined}
                                    metersPerPixel={METERS_PER_PIXEL}
                                    panelCount={result?.panel_count}
                                    onExportPNG={async (dataUrl) => {
                                      setLast3dPngDataUrl(dataUrl);
                                      setProposalImageSource('3d');
                                      const crmId = activeProject?.master?.crmProjectId;
                                      if (!crmId || !dataUrl.startsWith('data:')) return;
                                      try {
                                        const out = await saveRoofLayout3dImage({
                                          projectId: String(crmId),
                                          dataUrl,
                                          setPreferForProposal: false,
                                          ...(Number.isFinite(Number(result?.roof_area_m2)) && {
                                            roof_area_m2: Number(result!.roof_area_m2),
                                          }),
                                          ...(Number.isFinite(Number(result?.usable_area_m2)) && {
                                            usable_area_m2: Number(result!.usable_area_m2),
                                          }),
                                          ...(Number.isFinite(Number(result?.panel_count)) && {
                                            panel_count: Number(result!.panel_count),
                                          }),
                                        });
                                        const abs = absolutizeLayoutImageUrl(out.layout_image_3d_url);
                                        if (abs) setLast3dPngDataUrl(abs);
                                        setResult((prev) => {
                                          if (!prev) return prev;
                                          const next = {
                                            ...prev,
                                            layout_image_3d_url: out.layout_image_3d_url,
                                            prefer_3d_for_proposal: out.prefer_3d_for_proposal,
                                          };
                                          persistRoofLayoutToActiveCustomer({
                                            roof_area_m2: next.roof_area_m2,
                                            usable_area_m2: next.usable_area_m2,
                                            panel_count: next.panel_count,
                                            layout_image_url: next.layout_image_url,
                                            layout_image_3d_url: out.layout_image_3d_url,
                                            prefer_3d_for_proposal: out.prefer_3d_for_proposal,
                                          });
                                          return next;
                                        });
                                      } catch (err) {
                                        setError(
                                          '3D image could not be saved to the server. It may not appear on other devices until saved.',
                                        );
                                        if (import.meta.env.DEV) console.error(err);
                                      }
                                    }}
                                  />
                                </Suspense>
                              </div>
                              {last3dPngDataUrl && (
                                <div className="mt-2 px-1 pb-2 shrink-0">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    3D Render (last exported)
                                  </div>
                                  <img
                                    src={last3dPngDataUrl}
                                    alt="3D render preview"
                                    className="w-full rounded-lg border border-gray-200 bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="min-w-full min-h-full flex justify-center items-start bg-slate-200">
                            <div
                              className="inline-block align-top box-border bg-slate-200"
                              style={{
                                width: layout3dBaseW * zoom3d,
                                minHeight: layout3dBaseH * zoom3d,
                              }}
                            >
                              <Suspense
                                fallback={
                                  <div
                                    className="flex items-center justify-center text-gray-500 text-sm bg-slate-200"
                                    style={{
                                      width: layout3dBaseW * zoom3d,
                                      height: layout3dBaseH * zoom3d,
                                    }}
                                  >
                                    Loading 3D...
                                  </div>
                                }
                              >
                                <div
                                  className="bg-slate-200"
                                  style={{
                                    width: layout3dBaseW * zoom3d,
                                    height: layout3dBaseH * zoom3d,
                                  }}
                                >
                                  <LazySolar3DView
                                    ref={solar3dRef}
                                    orbitStateRef={solar3dOrbitRef}
                                    persistentLayoutKeyRef={solar3dPersistentLayoutKeyRef}
                                    controlsPortalHost={narrow3dLive ? solar3dControlsHost : null}
                                    fillParent
                                    roofPolygon={polygon!}
                                    panelCoordinates={panels.map((p) => ({
                                      x: p.x,
                                      y: p.y,
                                      width: p.w,
                                      height: p.h,
                                    }))}
                                    imageSize={imageSize!}
                                    roofImageUrl={bgImageUrl ?? undefined}
                                    metersPerPixel={METERS_PER_PIXEL}
                                    panelCount={result?.panel_count}
                                    onExportPNG={async (dataUrl) => {
                                      setLast3dPngDataUrl(dataUrl);
                                      setProposalImageSource('3d');
                                      const crmId = activeProject?.master?.crmProjectId;
                                      if (!crmId || !dataUrl.startsWith('data:')) return;
                                      try {
                                        const out = await saveRoofLayout3dImage({
                                          projectId: String(crmId),
                                          dataUrl,
                                          setPreferForProposal: false,
                                          ...(Number.isFinite(Number(result?.roof_area_m2)) && {
                                            roof_area_m2: Number(result!.roof_area_m2),
                                          }),
                                          ...(Number.isFinite(Number(result?.usable_area_m2)) && {
                                            usable_area_m2: Number(result!.usable_area_m2),
                                          }),
                                          ...(Number.isFinite(Number(result?.panel_count)) && {
                                            panel_count: Number(result!.panel_count),
                                          }),
                                        });
                                        const abs = absolutizeLayoutImageUrl(out.layout_image_3d_url);
                                        if (abs) setLast3dPngDataUrl(abs);
                                        setResult((prev) => {
                                          if (!prev) return prev;
                                          const next = {
                                            ...prev,
                                            layout_image_3d_url: out.layout_image_3d_url,
                                            prefer_3d_for_proposal: out.prefer_3d_for_proposal,
                                          };
                                          persistRoofLayoutToActiveCustomer({
                                            roof_area_m2: next.roof_area_m2,
                                            usable_area_m2: next.usable_area_m2,
                                            panel_count: next.panel_count,
                                            layout_image_url: next.layout_image_url,
                                            layout_image_3d_url: out.layout_image_3d_url,
                                            prefer_3d_for_proposal: out.prefer_3d_for_proposal,
                                          });
                                          return next;
                                        });
                                      } catch (err) {
                                        setError(
                                          '3D image could not be saved to the server. It may not appear on other devices until saved.',
                                        );
                                        if (import.meta.env.DEV) console.error(err);
                                      }
                                    }}
                                  />
                                </div>
                              </Suspense>
                              {last3dPngDataUrl && (
                                <div className="mt-3 px-2 pb-2">
                                  <div className="text-xs font-medium text-gray-600 mb-2">
                                    3D Render (last exported)
                                  </div>
                                  <img
                                    src={last3dPngDataUrl}
                                    alt="3D render preview"
                                    className="w-full rounded-lg border border-gray-200 bg-white"
                                  />
                                </div>
                              )}
                            </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={layoutPreviewMeasureRef}
                      className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden w-full"
                    >
                    <div
                      ref={layoutScrollRef}
                      className={`w-full flex-1 min-h-0 min-w-0 overscroll-contain ${
                        roofViewTab === '3d'
                          ? 'layout-preview-scroll-3d overflow-x-scroll overflow-y-scroll bg-slate-200'
                          : 'overflow-auto'
                      }`}
                      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                    >
                    {roofViewTab === '3d' && saved3dDisplayUrl ? (
                      <div
                        className="inline-block align-top min-w-full box-border bg-slate-200 p-2"
                        style={{
                          width: layout3dBaseW * zoom3d,
                          minHeight: layout3dBaseH * zoom3d,
                        }}
                      >
                        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center">
                        <img
                          src={saved3dDisplayUrl}
                          alt="Saved 3D roof layout"
                          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg border border-slate-300 bg-white shadow-sm"
                          style={{ maxHeight: layout3dBaseH * zoom3d - 24 }}
                        />
                        {layoutMode === 'saved' && (
                          <p className="mt-3 text-xs text-gray-600 text-center max-w-md px-1">
                            Saved 3D render from your project. Regenerate the layout if you need to edit roof geometry or the live 3D scene.
                          </p>
                        )}
                        </div>
                      </div>
                    ) : bgImage && imageSize ? (
                      /* Extra SCROLL_BUFFER_PX of whitespace wraps the image on all sides so
                         users can scroll past the image edges for precise panel placement.
                         The Konva stage itself stays at native image-pixel size — coordinates
                         and toDataURL are unaffected. */
                      <div
                        className="relative flex-shrink-0"
                        style={{
                          width: imageSize.width * zoom + 2 * SCROLL_BUFFER_PX,
                          height: imageSize.height * zoom + 2 * SCROLL_BUFFER_PX,
                          minWidth: imageSize.width * zoom + 2 * SCROLL_BUFFER_PX,
                          minHeight: imageSize.height * zoom + 2 * SCROLL_BUFFER_PX,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: SCROLL_BUFFER_PX,
                            left: SCROLL_BUFFER_PX,
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
                              // Invisible bounding-box rect — drag anywhere inside polygon to move the whole roof outline
                              return (
                                <Rect
                                  x={minX}
                                  y={minY}
                                  width={w}
                                  height={h}
                                  opacity={0}
                                  draggable
                                  strokeEnabled={false}
                                  onMouseEnter={() => { document.body.style.cursor = 'move'; }}
                                  onMouseLeave={() => { document.body.style.cursor = 'default'; }}
                                  onDragStart={(e) => {
                                    document.body.style.cursor = 'grabbing';
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
                                    document.body.style.cursor = 'move';
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

                        {/* Panels clipped to polygon — listening={false} lets pointer events pass
                            through to the invisible drag-rect below so the whole polygon can be moved. */}
                        {layoutMode === 'editing' && polygon && panels.length > 0 && !isDragging && (
                          <Layer
                            listening={false}
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
                                fill="rgba(37,99,235,0.35)"
                                stroke="#1e3a8a"
                                strokeWidth={0.8}
                                shadowColor="rgba(15,23,42,0.55)"
                                shadowBlur={4}
                                shadowOpacity={0.6}
                                shadowOffset={{ x: 0, y: 1 }}
                              />
                            ))}
                          </Layer>
                        )}

                        {/* Draggable polygon control-point circles (corner handles).
                            Ref is attached so they can be hidden before toDataURL capture. */}
                        {layoutMode === 'editing' && polygon && (
                          <Layer ref={handlesLayerRef}>
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

                        {/* Scale bar — bottom-right corner of the canvas.
                            Renders in all modes (saved + editing) so the saved proposal image includes it. */}
                        {imageSize && (() => {
                          const scaleBarM = 20; // show a 20-metre reference bar
                          const scaleBarPx = scaleBarM / METERS_PER_PIXEL;
                          const margin = 16;
                          const barY = imageSize.height - margin - 4;
                          const barX = imageSize.width - margin - scaleBarPx;
                          const textY = barY - 16;
                          return (
                            <Layer listening={false}>
                              {/* White shadow for contrast on any background */}
                              <Line
                                points={[barX, barY, barX + scaleBarPx, barY]}
                                stroke="white"
                                strokeWidth={5}
                                lineCap="round"
                              />
                              <Line
                                points={[barX, barY, barX + scaleBarPx, barY]}
                                stroke="#1e293b"
                                strokeWidth={2.5}
                                lineCap="round"
                              />
                              {/* Tick marks at each end */}
                              <Line points={[barX, barY - 5, barX, barY + 5]} stroke="white" strokeWidth={4} />
                              <Line points={[barX, barY - 5, barX, barY + 5]} stroke="#1e293b" strokeWidth={2} />
                              <Line points={[barX + scaleBarPx, barY - 5, barX + scaleBarPx, barY + 5]} stroke="white" strokeWidth={4} />
                              <Line points={[barX + scaleBarPx, barY - 5, barX + scaleBarPx, barY + 5]} stroke="#1e293b" strokeWidth={2} />
                              {/* Label */}
                              <Text
                                x={barX}
                                y={textY}
                                width={scaleBarPx}
                                text={`${scaleBarM} m`}
                                align="center"
                                fontSize={13}
                                fontStyle="bold"
                                fill="white"
                                shadowColor="#0f172a"
                                shadowBlur={3}
                                shadowOffsetX={0}
                                shadowOffsetY={1}
                              />
                            </Layer>
                          );
                        })()}
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
                )}
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

