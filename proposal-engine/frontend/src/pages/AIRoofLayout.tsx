import { Suspense, lazy, useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle, Text, Tag, Label } from 'react-konva';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - use-image has ESM types that may not be picked up correctly here
import useImage from 'use-image';
import {
  generateAiRoofLayout,
  deleteRoofLayout,
  AiRoofLayoutResponse,
  fetchCrmProjectForAiLayout,
  fetchManualRoofLayout,
  getApiBaseUrl,
  saveManualRoofLayoutImage,
  saveRoofLayout3dImage,
  setRoofLayoutEmbedPreference,
  buildRoofLayoutGeometry,
  parseRoofLayoutGeometry,
} from '../lib/apiClient';
import { parseGoogleMapsLatLng } from '../lib/parseGoogleMapsLink';
import {
  ROOF_LAYOUT_METERS_PER_PIXEL,
  ROOF_LAYOUT_PANEL_AREA_M2,
  ROOF_LAYOUT_PANEL_SPACING_FACTOR,
  ROOF_LAYOUT_PANEL_SPACING_M,
  ROOF_LAYOUT_USABLE_AREA_FACTOR,
  getOrientedPanelSizeM,
} from '../lib/roofLayoutConstants';

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

/** Scroll padding around the 2D Konva map was previously 300px for “pan past edges”.
 *  That created large grey scroll gutters; preview scroll is now exactly the scaled image. */
const SCROLL_BUFFER_PX = 0;

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
import { RoofLayoutDesignStepper } from '../components/roofLayout/RoofLayoutDesignStepper';
import { RoofLayoutStatusStrip } from '../components/roofLayout/RoofLayoutStatusStrip';
import { RoofLayoutMapChrome } from '../components/roofLayout/RoofLayoutMapChrome';
import { RoofLayoutUndoButtons } from '../components/roofLayout/RoofLayoutUndoButtons';
import { deriveRoofLayoutWorkflowStep } from '../components/roofLayout/roofLayoutWorkflow';
import { usePolygonHistory } from '../components/roofLayout/usePolygonHistory';
import { RoofLayoutPanelActions } from '../components/roofLayout/RoofLayoutPanelActions';
import { RoofLayoutAdjustPanel } from '../components/roofLayout/RoofLayoutAdjustPanel';
import { RoofLayoutFacetBar } from '../components/roofLayout/RoofLayoutFacetBar';
import { ConfirmDangerModal } from '../components/ConfirmDangerModal';
import {
  createRoofFacet,
  flattenFacetPanels,
  MAX_ROOF_FACETS,
  offsetPolygonForNewFacet,
  splitTargetKwAcrossFacets,
  totalFacetPanelCount,
  type RoofFacetState,
} from '../lib/roofLayoutFacets';
import {
  closestPolygonEdge,
  type PolygonEdgeInfo,
} from '../lib/roofLayoutEdgeMeasure';
import { isPlaceholderSatelliteBytes } from '../lib/roofLayoutSatelliteImage';
import { getKeralaMapGpsWarning } from '../lib/mapGpsValidation';

/** Visual gap between adjacent module rects on the 2D canvas (px, image space). */
const PANEL_VISUAL_INSET_PX = 0.85;

const METERS_PER_PIXEL = ROOF_LAYOUT_METERS_PER_PIXEL;

type KeepoutRect = { id: string; x: number; y: number; w: number; h: number };

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/** Same path is overwritten on regenerate — bust cache so the browser loads the new satellite. */
function cacheBustImageUrl(url: string | null, version?: number): string | null {
  if (!url || !String(url).trim()) return null;
  const v = version ?? Date.now();
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${v}`;
}

function initialPolygonHalfExtentsPx(
  systemSizeKw: number,
  panelWattage: number,
  imgCenter: number,
): { halfWPx: number; halfHPx: number } {
  const panelsForTarget = Math.max(
    4,
    Math.ceil((systemSizeKw * 1000) / Math.max(panelWattage, 1)),
  );
  const seedRoofAreaM2 =
    (panelsForTarget * ROOF_LAYOUT_PANEL_AREA_M2 * ROOF_LAYOUT_PANEL_SPACING_FACTOR) /
    ROOF_LAYOUT_USABLE_AREA_FACTOR;
  const areaPx = seedRoofAreaM2 / (METERS_PER_PIXEL * METERS_PER_PIXEL);
  const aspect = 1.12;
  const heightPx = Math.sqrt(areaPx / aspect);
  const widthPx = areaPx / heightPx;
  return {
    halfWPx: Math.round(Math.min(widthPx / 2, imgCenter - 40)),
    halfHPx: Math.round(Math.min(heightPx / 2, imgCenter - 40)),
  };
}

function absolutizeLayoutImageUrl(raw: string | null | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim();
  if (s.startsWith('http')) return s;
  const base = getApiBaseUrl() || '';
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}

function satelliteEditorUrlForProject(projectId: string): string | null {
  const base = getApiBaseUrl() || '';
  return `${base}/api/generated_layouts/${projectId}_satellite.png`;
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

function clearRoofLayoutFromActiveCustomer() {
  const ac = getActiveCustomer();
  if (!ac?.id) return;
  const fresh = getCustomer(ac.id);
  if (!fresh) return;
  upsertCustomer({
    ...fresh,
    roofLayout: null,
    proposal: fresh.proposal ? { ...fresh.proposal, roofLayout: null } : fresh.proposal,
  });
}

const LazySolar3DView = lazy(() => import('../components/Solar3DView'));

export default function AIRoofLayout() {
  const activeProject = getActiveCustomer();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiRoofLayoutResponse | null>(null);
  const [lastLatitude, setLastLatitude] = useState<number | null>(null);
  const [lastLongitude, setLastLongitude] = useState<number | null>(null);
  const [mapsLinkOverride, setMapsLinkOverride] = useState('');
  const [panelWOverride, setPanelWOverride] = useState('');
  /** 'custom' = show a free-text number input; '' = use CRM/project value; any numeric string = preset wattage. */
  const [panelWPreset, setPanelWPreset] = useState<string>('');

  // CRM panel wattage read from the active project's master data (synced from panelCapacityW).
  // Available immediately without an extra fetch.
  const crmPanelWattage: number | null =
    typeof activeProject?.master?.panelWattage === 'number' && activeProject.master.panelWattage > 0
      ? activeProject.master.panelWattage
      : null;

  // The wattage that WILL be used on the next Generate click (for display).
  const effectiveWattage: number = (() => {
    if (panelWOverride.trim() !== '') {
      const v = Number(panelWOverride.trim());
      if (!Number.isNaN(v) && v > 0) return v;
    }
    if (crmPanelWattage != null) return crmPanelWattage;
    return 550;
  })();
  // 75% zoom gives a good first view at zoom=19 (307 m coverage).
  const [zoom, setZoom] = useState(0.75);
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

  /** Full satellite URL for this editing session — proposal saves a separate cropped JPEG; editor must stay on satellite. */
  const satelliteEditorUrlRef = useRef<string | null>(null);
  /** Bumped on Regenerate so in-flight hydrate cannot overwrite the new draft with saved geometry. */
  const layoutHydrateGenerationRef = useRef(0);

  /** Recenters preview when URL / zoom / viewport changes (old editingDone flag left the map stuck in a corner after resize). */
  const scrollCenterMetaRef = useRef<{ url: string; lastSig: string }>({
    url: '',
    lastSig: '',
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
  const polygonOutlineLayerRef = useRef<any>(null);
  /** Whole-roof drag hit target (above panels); hidden with outline during proposal capture. */
  const polygonDragLayerRef = useRef<any>(null);
  const keepoutLayerRef = useRef<any>(null);
  /**
   * Tracks the pixel position where the move-rect drag started.
   * Used to detect accidental clicks (< 8 px travel) so the polygon is not
   * moved and panels do not flicker on simple taps inside the polygon area.
   */
  const polygonMoveStartRef = useRef<{ x: number; y: number } | null>(null);
  const polygonDragRef = useRef<{ x: number; y: number } | null>(null);
  const polygonBaseRef = useRef<Point[] | null>(null); // polygon at drag start for imperative updates
  const recomputeTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  // When true, canvas captures touch (edit polygon); when false, touches pass through so map scroll works (mobile)
  const [mapEditTool, setMapEditTool] = useState<'scroll' | 'roof' | 'keepout'>('scroll');
  const [keepouts, setKeepouts] = useState<KeepoutRect[]>([]);
  const [satelliteOpacity, setSatelliteOpacity] = useState(1);
  const [hoveredEdge, setHoveredEdge] = useState<PolygonEdgeInfo | null>(null);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (window.innerWidth >= 1024) setMobileControlsOpen(false);
    };
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

  const [facetSession] = useState(() => {
    const f = createRoofFacet(1);
    return { facets: [f] as RoofFacetState[], activeId: f.id };
  });
  const [facets, setFacets] = useState<RoofFacetState[]>(facetSession.facets);
  const [activeFacetId, setActiveFacetId] = useState(facetSession.activeId);
  const activeFacet = facets.find((f) => f.id === activeFacetId) ?? facets[0]!;
  const polygon = activeFacet.polygon;
  const panels = activeFacet.panels;
  const polygonHistory = usePolygonHistory();

  const patchActiveFacet = (patch: Partial<RoofFacetState>) => {
    setFacets((prev) =>
      prev.map((f) => (f.id === activeFacetId ? { ...f, ...patch } : f)),
    );
  };

  const resetFacetsToSingle = () => {
    const f = createRoofFacet(1);
    setFacets([f]);
    setActiveFacetId(f.id);
  };
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImage] = useImage(bgImageUrl ?? '', 'anonymous');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [satelliteImageryWarning, setSatelliteImageryWarning] = useState<string | null>(null);

  const keralaMapGpsWarning = useMemo(() => {
    const lat = activeProject?.master?.latitude;
    const lng = activeProject?.master?.longitude;
    if (lat == null || lng == null) return null;
    return getKeralaMapGpsWarning(Number(lat), Number(lng));
  }, [
    activeProject?.master?.crmProjectId,
    activeProject?.master?.latitude,
    activeProject?.master?.longitude,
  ]);

  // Konva redraw after zoom / viewport / tab / image changes. Only when 2D tab is active — the Stage
  // unmounts on the saved-3D tab; coming back to 2D otherwise left a torn / empty canvas until zoom nudged it.
  useEffect(() => {
    if (roofViewTab !== '2d') return;
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      try {
        stageRef.current?.batchDraw?.();
        stageRef.current?.draw?.();
      } catch {
        // Stage may not be mounted yet (e.g. tab switch).
      }
    };
    draw();
    const a = requestAnimationFrame(draw);
    const b = requestAnimationFrame(() => {
      requestAnimationFrame(draw);
    });
    const tid = window.setTimeout(draw, 100);
    return () => {
      cancelled = true;
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
      clearTimeout(tid);
    };
  }, [isMobileView, zoom, roofViewTab, imageSize, layoutMode, bgImage]);

  const allPanelsFlat = flattenFacetPanels(facets);
  const has3DRoofData =
    facets.some((f) => f.polygon != null && f.polygon.length >= 3) &&
    allPanelsFlat.length > 0 &&
    imageSize != null;

  const crmProjectId = activeProject?.master?.crmProjectId;
  const isSavedForThisProject =
    !!crmProjectId &&
    lastSavedProjectId != null &&
    String(lastSavedProjectId) === String(crmProjectId);

  const workflowStep = deriveRoofLayoutWorkflowStep({
    hasActiveProject: !!activeProject,
    hasLayoutResult: !!result,
    layoutMode,
    hasPolygon: facets.some((f) => f.polygon != null && f.polygon.length >= 3),
    isSavedForProject: isSavedForThisProject,
    mapTool: mapEditTool,
  });

  const setMapTool = (tool: 'scroll' | 'roof' | 'keepout') => {
    setMapEditTool(tool);
  };

  const layoutStateLabel: 'draft' | 'saved' | 'idle' = !result
    ? 'idle'
    : isSavedForThisProject && layoutMode === 'saved'
      ? 'saved'
      : 'draft';

  const targetSystemKw: number | null =
    typeof activeProject?.master?.systemSizeKw === 'number' &&
    activeProject.master.systemSizeKw > 0
      ? activeProject.master.systemSizeKw
      : null;

  const displayedPanelCount =
    layoutMode === 'editing' && isPolygonSummaryReady && result
      ? totalFacetPanelCount(facets)
      : result?.panel_count ?? null;

  const displayedSystemKw =
    displayedPanelCount != null && Number.isFinite(displayedPanelCount)
      ? (displayedPanelCount * effectiveWattage) / 1000
      : null;

  const layoutFillPercent = (() => {
    if (!isPolygonSummaryReady || !result?.usable_area_m2 || result.usable_area_m2 <= 0) return null;
    const { widthM, heightM } = getOrientedPanelSizeM(effectiveWattage, panelOrientation);
    const placed = allPanelsFlat.length * widthM * heightM;
    return (placed / result.usable_area_m2) * 100;
  })();

  const kwVsTarget =
    displayedSystemKw != null && targetSystemKw != null
      ? targetSystemKw - displayedSystemKw
      : null;

  const applyPolygon = (next: Point[] | null, opts?: { skipHistory?: boolean }) => {
    if (!opts?.skipHistory && polygon && next) {
      polygonHistory.commitChange(polygon, next);
    }
    patchActiveFacet({ polygon: next });
  };

  const handleUndoPolygon = () => {
    const next = polygonHistory.undo(polygon);
    if (next) patchActiveFacet({ polygon: next });
  };

  const handleRedoPolygon = () => {
    const next = polygonHistory.redo(polygon);
    if (next) patchActiveFacet({ polygon: next });
  };

  useEffect(() => {
    if (roofViewTab !== '2d' || layoutMode !== 'editing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndoPolygon();
        return;
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedoPolygon();
        return;
      }
      if (e.key === 'Escape') {
        setMapTool('scroll');
      } else if (e.key === 'e' || e.key === 'E') {
        setMapTool('roof');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [roofViewTab, layoutMode, polygon, polygonHistory.canUndo, polygonHistory.canRedo]);

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

  /** Mobile uses Scroll vs Edit tools; desktop always shows roof handles in editing mode. */
  const canEditRoofPolygon = layoutMode === 'editing' && (mapEditTool === 'roof' || !isMobileView);

  /** Proposal can use 3D when the live 3D scene exists or a 3D PNG is in memory / on the server. */
  const canChoose3dForProposal =
    has3DRoofData ||
    !!(last3dPngDataUrl && String(last3dPngDataUrl).trim()) ||
    !!(result?.layout_image_3d_url && String(result.layout_image_3d_url).trim());

  /** When satellite disk URL 404s, still show the persisted proposal JPEG from Cloudinary/DB. */
  const layoutPreviewFallbackUrl =
    roofViewTab === '2d' && !bgImage && result?.layout_image_url
      ? absolutizeLayoutImageUrl(result.layout_image_url)
      : null;

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
      const hydrateGen = layoutHydrateGenerationRef.current;

      try {
        const manual = await fetchManualRoofLayout(String(crmProjectId));
        if (cancelled || hydrateGen !== layoutHydrateGenerationRef.current) return;
        if (!manual?.layout_image_url || !String(manual.layout_image_url).trim()) return;

        const geom =
          parseRoofLayoutGeometry(manual.geometry) ??
          (manual.roof_polygon_coordinates && manual.roof_polygon_coordinates.length >= 3
            ? parseRoofLayoutGeometry({
                version: 1,
                imageWidth: 2048,
                imageHeight: 2048,
                metersPerPixel: METERS_PER_PIXEL,
                roofPolygon: manual.roof_polygon_coordinates,
                panelRects: (manual.panel_coordinates ?? []).map((r) => ({
                  x: r.x,
                  y: r.y,
                  width: r.width,
                  height: r.height,
                })),
                keepouts: [],
                panelOrientation: 'portrait',
                panelSpacingMultiplier: 1.5,
                panelWidthM: 1.1,
                panelHeightM: 2.2,
              })
            : null);

        const next: AiRoofLayoutResponse = {
          roof_area_m2: Number(manual.roof_area_m2),
          usable_area_m2: Number(manual.usable_area_m2),
          panel_count: Number(manual.panel_count),
          layout_image_url: String(manual.layout_image_url),
          source: (manual as any).source ?? 'MANUAL',
        };
        if (manual.layout_image_3d_url != null && String(manual.layout_image_3d_url).trim()) {
          next.layout_image_3d_url = String(manual.layout_image_3d_url);
        }
        if (typeof manual.prefer_3d_for_proposal === 'boolean') {
          next.prefer_3d_for_proposal = manual.prefer_3d_for_proposal;
        }
        if (geom) {
          const primary = geom.facets[0]!;
          next.roof_polygon_coordinates = primary.roofPolygon;
          next.panel_coordinates = geom.facets.flatMap((facet) =>
            facet.panelRects.map((r) => ({
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
            })),
          );
        }

        setError(null);
        setResult(next);
        setLastSavedProjectId(String(crmProjectId));
        setLoadedSavedAt(manual?.savedAt ? String(manual.savedAt) : null);

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

        if (geom) {
          setPanelOrientation(geom.panelOrientation);
          setPanelSpacingMultiplier(geom.panelSpacingMultiplier);
          setKeepouts(
            geom.keepouts.map((k) => ({
              id: k.id,
              x: k.x,
              y: k.y,
              w: k.width,
              h: k.height,
            })),
          );
          const loadedFacets: RoofFacetState[] = geom.facets.map((facet, i) => ({
            id: facet.id || `facet-${i}`,
            label: facet.label || `Roof ${i + 1}`,
            azimuthDeg: facet.azimuthDeg,
            polygon: facet.roofPolygon.map((p) => ({ x: p.x, y: p.y })),
            panels: facet.panelRects.map((r) => ({
              x: r.x,
              y: r.y,
              w: r.width,
              h: r.height,
            })),
          }));
          setFacets(loadedFacets);
          setActiveFacetId(loadedFacets[0]!.id);
          const satFromSaved =
            manual.satellite_image_url && String(manual.satellite_image_url).trim()
              ? absolutizeLayoutImageUrl(String(manual.satellite_image_url))
              : null;
          const satUrl = cacheBustImageUrl(
            satFromSaved ??
              absolutizeLayoutImageUrl(satelliteEditorUrlForProject(String(crmProjectId))),
          );
          if (hydrateGen !== layoutHydrateGenerationRef.current) return;
          if (!satUrl) return;
          setBgImageUrl(satUrl);
          satelliteEditorUrlRef.current = satFromSaved ? satUrl.split('?')[0] ?? satUrl : satUrl;
          setLayoutMode('editing');
          setIsPolygonSummaryReady(true);
          polygonHistory.resetHistory();
          applyAggregatedMetrics(loadedFacets);
          setMapTool(isMobileView ? 'scroll' : 'roof');
        } else {
          setLayoutMode('saved');
          setIsPolygonSummaryReady(true);
          const rawUrl = next.layout_image_url && String(next.layout_image_url).trim()
            ? next.layout_image_url
            : null;
          const imageUrl = rawUrl
            ? rawUrl.startsWith('http')
              ? rawUrl
              : `${getApiBaseUrl() || ''}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
            : null;
          setBgImageUrl(imageUrl);
          resetFacetsToSingle();
          setKeepouts([]);
          setImageSize(null);
          satelliteEditorUrlRef.current = null;
        }
      } catch {
        // If no layout exists yet, backend may respond 404; ignore and let user generate.
      }
    }

    hydrateFromSavedLayout();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.master?.crmProjectId]);

  // When the background image loads, capture its natural size.
  useEffect(() => {
    if (bgImage && (!imageSize || imageSize.width !== bgImage.width || imageSize.height !== bgImage.height)) {
      setImageSize({ width: bgImage.width, height: bgImage.height });
    }
  }, [bgImage, imageSize]);

  // Detect Google "no imagery" placeholder PNG (~11 KB) on disk.
  useEffect(() => {
    if (!bgImageUrl || layoutMode !== 'editing') {
      setSatelliteImageryWarning(null);
      return;
    }
    let cancelled = false;
    void fetch(bgImageUrl, { method: 'HEAD' })
      .then((res) => {
        if (cancelled || !res.ok) return;
        const len = Number(res.headers.get('content-length') || 0);
        if (isPlaceholderSatelliteBytes(len)) {
          setSatelliteImageryWarning(
            'Google Maps has no satellite imagery for this Map GPS pin. Open the location in Google Maps, confirm latitude/longitude in Customer Master, or paste a corrected Maps URL in the layout tools — then Regenerate.',
          );
        } else {
          setSatelliteImageryWarning(null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bgImageUrl, layoutMode]);

  // Saved view: centre the 2D scroll viewport on image/panel focal whenever the 2D tab is visible
  // (toggling 3D → 2D must re-run — scroll metrics and content size change between tabs).
  // Editing view: centre once per image on the polygon when it first exists (so the roof isn’t stuck top-left).
  useLayoutEffect(() => {
    if (!imageSize || !bgImage) return;

    // Invalidate cached scroll signature while not on 2D — coming back from 3D must recentre.
    if (roofViewTab !== '2d') {
      scrollCenterMetaRef.current.lastSig = '';
      return;
    }

    const urlKey = bgImageUrl ?? '';
    if (scrollCenterMetaRef.current.url !== urlKey) {
      scrollCenterMetaRef.current = { url: urlKey, lastSig: '' };
    }

    const vw = layoutScrollViewport.w;
    const vh = layoutScrollViewport.h;
    if (vw < 32 || vh < 32) return;

    if (layoutMode === 'saved') {
      const scrollSig = `saved|${zoom}|${Math.round(vw)}|${Math.round(vh)}`;
      if (scrollCenterMetaRef.current.lastSig === scrollSig) return;
      scrollCenterMetaRef.current.lastSig = scrollSig;
      const focal = focalPointForSavedView(imageSize, result);
      const run = () => {
        const el = layoutScrollRef.current;
        if (!el) return;
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom, SCROLL_BUFFER_PX);
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
      return;
    }

    if (layoutMode === 'editing' && polygon && polygon.length >= 2) {
      const scrollSig = `editing|${zoom}|${Math.round(vw)}|${Math.round(vh)}`;
      if (scrollCenterMetaRef.current.lastSig === scrollSig) return;
      scrollCenterMetaRef.current.lastSig = scrollSig;
      const focal = focalPointForEditingPolygon(imageSize, polygon);
      const run = () => {
        const el = layoutScrollRef.current;
        if (!el) return;
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom, SCROLL_BUFFER_PX);
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    }
  }, [layoutMode, roofViewTab, imageSize, bgImage, bgImageUrl, result, polygon, zoom, layoutScrollViewport.w, layoutScrollViewport.h]);

  const resetLayoutEditorToBlank = () => {
    layoutHydrateGenerationRef.current += 1;
    solar3dPersistentLayoutKeyRef.current = '';
    solar3dOrbitRef.current = null;
    setResult(null);
    setError(null);
    setLastSavedProjectId(null);
    setLoadedSavedAt(null);
    setLayoutMode('editing');
    setIsPolygonSummaryReady(false);
    isDraggingRef.current = false;
    setIsDragging(false);
    polygonDragRef.current = null;
    polygonBaseRef.current = null;
    resetFacetsToSingle();
    polygonHistory.resetHistory();
    setKeepouts([]);
    setMapTool(isMobileView ? 'scroll' : 'roof');
    setBgImageUrl(null);
    setImageSize(null);
    satelliteEditorUrlRef.current = null;
    setLast3dPngDataUrl(null);
    setProposalImageSource('2d');
    setRoofViewTab('2d');
    setSatelliteImageryWarning(null);
    scrollCenterMetaRef.current = { url: '', lastSig: '' };
  };

  const handleDeleteLayout = async () => {
    if (!activeProject?.master?.crmProjectId) {
      setError('This proposal is not linked to a Rayenna CRM project yet.');
      return;
    }

    setDeleting(true);
    setError(null);
    layoutHydrateGenerationRef.current += 1;

    const crmProjectId = String(activeProject.master.crmProjectId);

    try {
      await deleteRoofLayout(crmProjectId);
      clearRoofLayoutFromActiveCustomer();
      resetLayoutEditorToBlank();
      setDeleteConfirmOpen(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to delete roof layout';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

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
    layoutHydrateGenerationRef.current += 1;
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
    resetFacetsToSingle();
    polygonHistory.resetHistory();
    setKeepouts([]);
    setMapTool(isMobileView ? 'scroll' : 'roof');
    // Prevent the default polygon from initializing using the *previous* background image size
    // while the new AI layout is still loading (otherwise we get a brief "old AI" flash).
    setBgImageUrl(null);
    setImageSize(null);
    satelliteEditorUrlRef.current = null;

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
      if (mapsLinkOverride.trim() !== '') {
        const parsed = parseGoogleMapsLatLng(mapsLinkOverride);
        if (!parsed) {
          setError(
            'Could not read coordinates from that Google Maps link. Paste a full maps.google.com URL (with @lat,lng or !3d…!4d…), or enter coordinates as "12.97, 77.59". Short links (maps.app.goo.gl) must be opened in a browser and the full URL copied.',
          );
          return;
        }
        latitude = parsed.lat;
        longitude = parsed.lng;
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

      const keralaWarn = getKeralaMapGpsWarning(latitude as number, longitude as number);
      if (keralaWarn) {
        setError(keralaWarn);
        return;
      }

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
        ...(data?.roof_polygon_coordinates?.length ? { roof_polygon_coordinates: data.roof_polygon_coordinates } : {}),
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
      const aiUrl = rawUrl
        ? rawUrl.startsWith('http')
          ? rawUrl
          : `${getApiBaseUrl() || ''}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
        : null;
      const cacheVersion = Date.now();
      const satFromApi = data?.satellite_image_url
        ? absolutizeLayoutImageUrl(String(data.satellite_image_url))
        : null;
      const satBase =
        satFromApi ?? absolutizeLayoutImageUrl(satelliteEditorUrlForProject(String(crmProjectId)));
      const imageUrl = cacheBustImageUrl(satBase ?? aiUrl, cacheVersion);
      setBgImageUrl(imageUrl);
      if (imageUrl) satelliteEditorUrlRef.current = imageUrl.split('?')[0] ?? imageUrl;

      // polygon and panels will be initialised once the image size is known
    } catch (err: any) {
      setError(err?.message ?? 'Failed to generate AI layout');
    } finally {
      setLoading(false);
    }
  };

  async function captureLayoutImage(options?: {
    format?: 'png' | 'jpeg';
    quality?: number;
    pixelRatio?: number;
    /** Crop to this rect in stage pixel coordinates before export. */
    crop?: { x: number; y: number; width: number; height: number };
  }): Promise<string | null> {
    if (!stageRef.current) return null;
    const format = options?.format ?? 'png';
    const pixelRatio = options?.pixelRatio ?? 2;
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? (options?.quality ?? 0.82) : undefined;

    // Hide control-point handles, polygon outline, and whole-roof drag layer — saved image shows only panels on satellite.
    const handlesLayer = handlesLayerRef.current;
    const polygonOutlineLayer = polygonOutlineLayerRef.current;
    const polygonDragLayer = polygonDragLayerRef.current;
    const keepoutLayer = keepoutLayerRef.current;
    if (handlesLayer) handlesLayer.visible(false);
    if (polygonOutlineLayer) polygonOutlineLayer.visible(false);
    if (polygonDragLayer) polygonDragLayer.visible(false);
    if (keepoutLayer) keepoutLayer.visible(false);
    stageRef.current.batchDraw();
    const dataUrl = stageRef.current.toDataURL({
      pixelRatio,
      mimeType: mime,
      quality,
      ...(options?.crop ?? {}),
    });
    if (handlesLayer) handlesLayer.visible(true);
    if (polygonOutlineLayer) polygonOutlineLayer.visible(true);
    if (polygonDragLayer) polygonDragLayer.visible(true);
    if (keepoutLayer) keepoutLayer.visible(true);
    stageRef.current.batchDraw();
    return dataUrl;
  }

  /** Proposal JPEG: panels readable without cropping down to a blurry postage stamp.
   *  Uses bbox + generous pad + min/max fractions of full satellite for stable framing. */
  function computeProposalExportCrop(
    poly: Point[],
    panelRects: PanelRect[],
    imgSize: { width: number; height: number },
  ): { x: number; y: number; width: number; height: number } | undefined {
    if (!poly || poly.length < 3) return undefined;

    let bbMinX = Infinity,
      bbMaxX = -Infinity,
      bbMinY = Infinity,
      bbMaxY = -Infinity;
    if (panelRects.length) {
      for (const r of panelRects) {
        bbMinX = Math.min(bbMinX, r.x);
        bbMaxX = Math.max(bbMaxX, r.x + r.w);
        bbMinY = Math.min(bbMinY, r.y);
        bbMaxY = Math.max(bbMaxY, r.y + r.h);
      }
    } else {
      for (const p of poly) {
        bbMinX = Math.min(bbMinX, p.x);
        bbMaxX = Math.max(bbMaxX, p.x);
        bbMinY = Math.min(bbMinY, p.y);
        bbMaxY = Math.max(bbMaxY, p.y);
      }
    }
    if (!Number.isFinite(bbMinX)) return undefined;

    const bbW0 = Math.max(1, bbMaxX - bbMinX);
    const bbH0 = Math.max(1, bbMaxY - bbMinY);

    const padFrac = 0.2;
    let cropW = bbW0 * (1 + 2 * padFrac);
    let cropH = bbH0 * (1 + 2 * padFrac);

    const minFrac = 0.4;
    cropW = Math.max(cropW, imgSize.width * minFrac);
    cropH = Math.max(cropH, imgSize.height * minFrac);

    const maxFrac = 0.62;
    cropW = Math.min(imgSize.width * maxFrac, cropW);
    cropH = Math.min(imgSize.height * maxFrac, cropH);

    cropW = Math.min(imgSize.width, cropW);
    cropH = Math.min(imgSize.height, cropH);

    const focalX = panelRects.length ? (bbMinX + bbMaxX) / 2 : poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const focalY = panelRects.length ? (bbMinY + bbMaxY) / 2 : poly.reduce((s, p) => s + p.y, 0) / poly.length;

    let x = focalX - cropW / 2;
    let y = focalY - cropH / 2;
    x = Math.max(0, Math.min(x, imgSize.width - cropW));
    y = Math.max(0, Math.min(y, imgSize.height - cropH));

    if (cropW < 20 || cropH < 20) return undefined;
    return { x, y, width: cropW, height: cropH };
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

      // Tight crop around panels only — independent of preview zoom/viewport so embed stays consistent.
      const cropPoly =
        facets.find((f) => f.polygon && f.polygon.length >= 3)?.polygon ?? polygon;
      const proposalCrop =
        cropPoly && imageSize
          ? computeProposalExportCrop(cropPoly, allPanelsFlat, imageSize)
          : undefined;

      const dataUrl = await captureLayoutImage({
        format: 'jpeg',
        quality: 0.86,
        pixelRatio: 2,
        crop: proposalCrop,
      });
      if (!dataUrl) {
        setError('Could not capture the 2D layout. Open the 2D tab, then save again.');
        return;
      }

      const moduleSize = getOrientedPanelSizeM(effectiveWattage, panelOrientation);
      const geometry =
        imageSize && facets.some((f) => f.polygon && f.polygon.length >= 3)
          ? buildRoofLayoutGeometry({
              imageWidth: imageSize.width,
              imageHeight: imageSize.height,
              metersPerPixel: METERS_PER_PIXEL,
              facets: facets
                .filter((f) => f.polygon && f.polygon.length >= 3)
                .map((f) => ({
                  id: f.id,
                  label: f.label,
                  azimuthDeg: f.azimuthDeg,
                  roofPolygon: f.polygon!,
                  panelRects: f.panels.map((p) => ({
                    x: p.x,
                    y: p.y,
                    width: p.w,
                    height: p.h,
                  })),
                })),
              keepouts: keepouts.map((k) => ({
                id: k.id,
                x: k.x,
                y: k.y,
                width: k.w,
                height: k.h,
              })),
              panelOrientation,
              panelSpacingMultiplier,
              panelWidthM: moduleSize.widthM,
              panelHeightM: moduleSize.heightM,
            })
          : undefined;

      const saved2d = await saveManualRoofLayoutImage({
        projectId: crmProjectId,
        dataUrl,
        ...metrics,
        ...(geometry ? { geometry } : {}),
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

      // Cropped proposal JPEG must not replace the editing satellite — that shrunk the Stage/panels.
      const sat = satelliteEditorUrlRef.current;
      if (sat && layoutMode === 'editing') {
        setBgImageUrl(sat);
      }
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
    keepoutRects: KeepoutRect[] = [],
    targetKw: number | null = null,
    panelWatts: number = 550,
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
    const usableAreaM2 = roofAreaM2 * ROOF_LAYOUT_USABLE_AREA_FACTOR;

    const { widthM, heightM } = getOrientedPanelSizeM(panelWatts, panelOrientation);
    const panelAreaM2 = widthM * heightM;

    // Geometry-based ideal panel count (used for the numeric summary)
    const idealPanelCount = Math.max(
      0,
      Math.floor(usableAreaM2 / (panelAreaM2 * ROOF_LAYOUT_PANEL_SPACING_FACTOR)),
    );

    const panelWidthPx = widthM / METERS_PER_PIXEL;
    const panelHeightPx = heightM / METERS_PER_PIXEL;
    const spacingPx = (ROOF_LAYOUT_PANEL_SPACING_M / METERS_PER_PIXEL) * panelSpacingMultiplier;

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

    /** Require the whole panel rectangle inside the roof polygon so Konva clip does not slice panels. */
    const rectFullyInsidePolygon = (
      rx: number,
      ry: number,
      rw: number,
      rh: number,
      vertices: Point[],
    ): boolean => {
      const corners: Point[] = [
        { x: rx, y: ry },
        { x: rx + rw, y: ry },
        { x: rx + rw, y: ry + rh },
        { x: rx, y: ry + rh },
      ];
      return corners.every((c) => pointInPolygon(c, vertices));
    };

    const approxPanelArea = panelWidthPx * panelHeightPx;
    const targetPanelCap =
      targetKw != null && targetKw > 0
        ? Math.ceil((targetKw * 1000) / Math.max(panelWatts, 1))
        : maxPanelsCap;
    const maxPanelsRendered = Math.min(
      maxPanelsCap,
      targetPanelCap,
      idealPanelCount || Math.max(1, Math.floor(areaPx / approxPanelArea)),
    );

    const panelRect = { x: 0, y: 0, w: panelWidthPx, h: panelHeightPx };

    for (let y = minY; y + panelHeightPx <= maxY; y += stepY) {
      for (let x = minX; x + panelWidthPx <= maxX; x += stepX) {
        if (!rectFullyInsidePolygon(x, y, panelWidthPx, panelHeightPx, poly)) continue;

        panelRect.x = x;
        panelRect.y = y;
        if (keepoutRects.some((k) => rectsOverlap(panelRect, k))) continue;

        panels.push({ x, y, w: panelWidthPx, h: panelHeightPx });
        if (panels.length >= maxPanelsRendered) break;
      }
      if (panels.length >= maxPanelsRendered) break;
    }

    return {
      panels,
      roofAreaM2,
      usableAreaM2,
      // Match what the user sees — only full, unclipped panels (Konva clips to polygon).
      panelCount: panels.length,
    };
  }

  const applyAggregatedMetrics = (facetList: RoofFacetState[]) => {
    let roofAreaM2 = 0;
    let usableAreaM2 = 0;
    for (const f of facetList) {
      if (!f.polygon?.length) continue;
      const m = computePanelsForPolygon(f.polygon, 99999, keepouts, null, effectiveWattage);
      roofAreaM2 += m.roofAreaM2;
      usableAreaM2 += m.usableAreaM2;
    }
    const panelCount = totalFacetPanelCount(facetList);
    setIsPolygonSummaryReady(true);
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
  };

  const handleSelectFacet = (id: string) => {
    setActiveFacetId(id);
    polygonHistory.resetHistory();
    setMapTool(isMobileView ? 'scroll' : 'roof');
  };

  const handleAddFacet = () => {
    if (facets.length >= MAX_ROOF_FACETS || !imageSize) return;
    const index = facets.length + 1;
    const next = createRoofFacet(index);
    if (polygon && polygon.length >= 3) {
      next.polygon = offsetPolygonForNewFacet(polygon, imageSize, index);
    }
    setFacets((prev) => [...prev, next]);
    setActiveFacetId(next.id);
    polygonHistory.resetHistory();
    setMapTool('roof');
  };

  const handleRemoveFacet = (id: string) => {
    if (facets.length <= 1) return;
    const nextList = facets.filter((f) => f.id !== id);
    setFacets(nextList);
    if (activeFacetId === id) {
      setActiveFacetId(nextList[0]!.id);
      polygonHistory.resetHistory();
    }
    applyAggregatedMetrics(nextList);
  };

  const handleFacetAzimuth = (id: string, azimuthDeg: number) => {
    setFacets((prev) => prev.map((f) => (f.id === id ? { ...f, azimuthDeg } : f)));
  };

  // Initialise default polygon once we know the image size.
  // Prefer polygon coordinates returned by the AI layout API (if any) so the initial shape
  // is closer to the actual roof rather than a generic centred rectangle.
  useEffect(() => {
    if (layoutMode !== 'editing') return;
    if (!imageSize || polygon) return;

    const apiPoly = result?.roof_polygon_coordinates;
    if (apiPoly && apiPoly.length >= 3) {
      applyPolygon(apiPoly.map((p) => ({ x: p.x, y: p.y })), { skipHistory: true });
      return;
    }

    const systemKw =
      typeof activeProject?.master?.systemSizeKw === 'number' && activeProject.master.systemSizeKw > 0
        ? activeProject.master.systemSizeKw
        : 5;
    const cx = imageSize.width / 2;
    const cy = imageSize.height / 2;
    const { halfWPx, halfHPx } = initialPolygonHalfExtentsPx(systemKw, effectiveWattage, cx);

    const { widthM, heightM } = getOrientedPanelSizeM(effectiveWattage, panelOrientation);
    const panelWidthPx = widthM / METERS_PER_PIXEL;
    const panelHeightPx = heightM / METERS_PER_PIXEL;
    const spacingPx = (ROOF_LAYOUT_PANEL_SPACING_M / METERS_PER_PIXEL) * panelSpacingMultiplier;
    const stepX = panelWidthPx + spacingPx;
    const stepY = panelHeightPx + spacingPx;
    const snap = (v: number, step: number) => Math.round(v / step) * step;

    const minX = snap(cx - halfWPx, stepX);
    const maxX = snap(cx + halfWPx, stepX);
    const minY = snap(cy - halfHPx, stepY);
    const maxY = snap(cy + halfHPx, stepY);

    applyPolygon(
      [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
      { skipHistory: true },
    );
  }, [imageSize, panelSpacingMultiplier, polygon, layoutMode, result?.roof_polygon_coordinates]);

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
      const kwEach = splitTargetKwAcrossFacets(targetSystemKw, facets.length);
      const { panels: nextPanels } = computePanelsForPolygon(
        polygon,
        maxCap,
        keepouts,
        kwEach,
        effectiveWattage,
      );

      setFacets((prev) => {
        const updated = prev.map((f) =>
          f.id === activeFacetId ? { ...f, panels: nextPanels } : f,
        );
        applyAggregatedMetrics(updated);
        return updated;
      });
    }, 200);
    return () => {
      if (recomputeTimeoutRef.current != null) {
        window.clearTimeout(recomputeTimeoutRef.current);
      }
    };
  }, [
    polygon,
    activeFacetId,
    facets.length,
    panelSpacingMultiplier,
    panelOrientation,
    layoutMode,
    keepouts,
    targetSystemKw,
    effectiveWattage,
  ]);

  const applyPanelLayoutFromPolygon = () => {
    if (!polygon) return;
    const maxCap = typeof window !== 'undefined' && window.innerWidth < 768 ? 150 : 300;
    const kwEach = splitTargetKwAcrossFacets(targetSystemKw, facets.length);
    const { panels: nextPanels } = computePanelsForPolygon(
      polygon,
      maxCap,
      keepouts,
      kwEach,
      effectiveWattage,
    );
    setFacets((prev) => {
      const updated = prev.map((f) =>
        f.id === activeFacetId ? { ...f, panels: nextPanels } : f,
      );
      applyAggregatedMetrics(updated);
      return updated;
    });
  };

  const refillAllFacets = () => {
    const maxCap = typeof window !== 'undefined' && window.innerWidth < 768 ? 150 : 300;
    const kwEach = splitTargetKwAcrossFacets(targetSystemKw, facets.length);
    setFacets((prev) => {
      const updated = prev.map((f) => {
        if (!f.polygon?.length) return f;
        const { panels: nextPanels } = computePanelsForPolygon(
          f.polygon,
          maxCap,
          keepouts,
          kwEach,
          effectiveWattage,
        );
        return { ...f, panels: nextPanels };
      });
      applyAggregatedMetrics(updated);
      return updated;
    });
  };

  const clearPanelsOnMap = () => {
    setFacets((prev) => {
      const updated = prev.map((f) =>
        f.id === activeFacetId ? { ...f, panels: [] } : f,
      );
      applyAggregatedMetrics(updated);
      return updated;
    });
  };

  const handleSnapOutlineToGrid = () => {
    if (!polygon) return;
    const { widthM, heightM } = getOrientedPanelSizeM(effectiveWattage, panelOrientation);
    const panelWidthPx = widthM / METERS_PER_PIXEL;
    const panelHeightPx = heightM / METERS_PER_PIXEL;
    const spacingPx = (ROOF_LAYOUT_PANEL_SPACING_M / METERS_PER_PIXEL) * panelSpacingMultiplier;
    const stepX = panelWidthPx + spacingPx;
    const stepY = panelHeightPx + spacingPx;
    const snap = (v: number, step: number) => Math.round(v / step) * step;
    applyPolygon(
      polygon.map((p) => ({
        x: snap(p.x, stepX),
        y: snap(p.y, stepY),
      })),
    );
  };

  const addKeepout = () => {
    if (!imageSize) return;
    let cx = imageSize.width / 2;
    let cy = imageSize.height / 2;
    if (polygon && polygon.length) {
      cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
      cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
    }
    const sizeM = 1.5;
    const w = sizeM / METERS_PER_PIXEL;
    const h = sizeM / METERS_PER_PIXEL;
    setKeepouts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), x: cx - w / 2, y: cy - h / 2, w, h },
    ]);
    setMapTool('keepout');
  };

  return (
    <div className="overflow-x-hidden">
      {/* Page card — matches Costing / BOM / ROI heading pattern */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header strip */}
        <div
          className="px-4 py-4 sm:px-8 sm:py-6"
          style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-lg sm:text-xl leading-none shrink-0">
                📐
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-extrabold text-white drop-shadow">
                  AI Roof Layout
                </h1>
                <p className="mt-0.5 text-white/90 text-sm hidden sm:block">
                  Satellite-assisted draft — draw the roof outline, place panels, save to proposal.
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
              <div className="flex flex-wrap justify-start sm:justify-end gap-2">
                {(result ||
                  (lastSavedProjectId &&
                    activeProject?.master?.crmProjectId &&
                    lastSavedProjectId === String(activeProject.master.crmProjectId))) && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={loading || deleting}
                    className="inline-flex items-center justify-center gap-1.5 bg-red-500/90 hover:bg-red-600 border-2 border-red-300/80 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting…' : 'Delete layout'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || deleting}
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
          result.source === 'AI' ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">⚠ Layout not yet saved with panels</div>
              <div className="mt-0.5 text-xs text-amber-800">
                The outline starts as a sizing rectangle (not auto-traced). Drag corners to match the roof, use{' '}
                <strong>Refill panels</strong>, then <strong>Save to Proposal</strong>.
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <div className="font-semibold">✓ Saved layout loaded</div>
              <div className="mt-0.5 text-xs text-emerald-800">
                {loadedSavedAt ? `Last saved: ${new Date(loadedSavedAt).toLocaleString()}` : 'This project already has a saved roof layout with panels.'}
              </div>
            </div>
          )
        )}

        {(error || activeProject) && (
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
                <label className="text-[10px] font-medium text-sky-700 leading-5 min-h-5">
                  Google Maps link
                </label>
                <input
                  type="text"
                  value={mapsLinkOverride}
                  onChange={(e) => setMapsLinkOverride(e.target.value)}
                  placeholder="Paste any Google Maps URL or lat,lng"
                  className="w-full h-8 rounded-md border border-sky-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-h-5">
                  <label className="text-[10px] font-medium text-sky-700 leading-5 shrink-0">
                    Panel wattage (W)
                  </label>
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
                    <span className="text-[10px] text-indigo-600 font-medium shrink-0">
                      → {effectiveWattage} W
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 min-h-8 items-center">
                  <select
                    value={panelWPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPanelWPreset(val);
                      if (val !== 'custom') setPanelWOverride(val);
                      else setPanelWOverride('');
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
                      onChange={(e) => setPanelWOverride(e.target.value)}
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
        )}

        {result && (
          <div
            ref={exportRef}
            className={`mt-3 w-full max-w-none space-y-4 ${isMobileView ? 'pb-[max(5.5rem,env(safe-area-inset-bottom))]' : ''}`}
          >
            <div className="w-full grid grid-cols-1 gap-4 lg:grid-cols-[minmax(12rem,14rem)_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[minmax(12rem,14rem)_minmax(0,1fr)_minmax(16rem,18rem)] xl:gap-6 items-start">
              <aside className="hidden lg:block space-y-3 min-w-0">
                <div>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Design workflow
                  </h2>
                  <RoofLayoutDesignStepper activeStep={workflowStep} compact />
                </div>
                {layoutMode === 'editing' && (
                  <RoofLayoutFacetBar
                    facets={facets}
                    activeFacetId={activeFacetId}
                    onSelectFacet={handleSelectFacet}
                    onAddFacet={handleAddFacet}
                    onRemoveFacet={handleRemoveFacet}
                    onAzimuthChange={handleFacetAzimuth}
                  />
                )}
                <div className="md:max-lg:space-y-2 lg:hidden">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Layout summary
                </h2>
                <dl className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-lg sm:rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Roof area
                    </dt>
                    <dd className="mt-1 text-base font-semibold text-gray-900">
                      {(layoutMode === 'editing' && !isPolygonSummaryReady)
                        ? '—'
                        : (Number.isFinite(result.roof_area_m2) ? Number(result.roof_area_m2).toFixed(1) : '—')} m²
                    </dd>
                  </div>
                  <div className="rounded-lg sm:rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Usable area
                    </dt>
                    <dd className="mt-1 text-base font-semibold text-gray-900">
                      {(layoutMode === 'editing' && !isPolygonSummaryReady)
                        ? '—'
                        : (Number.isFinite(result.usable_area_m2) ? Number(result.usable_area_m2).toFixed(1) : '—')} m²
                    </dd>
                  </div>
                  <div className="rounded-lg sm:rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3">
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
                <p className="hidden lg:block text-[11px] text-gray-500 leading-snug">
                  Green outline = your roof (not AI-traced). Hover edges for length (m).
                </p>
              </aside>

              <section className="w-full min-w-0 max-w-none flex flex-col gap-4">
                <div className="md:hidden">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Design workflow
                  </h2>
                  <RoofLayoutDesignStepper activeStep={workflowStep} />
                </div>

                {layoutMode === 'editing' && result && (
                  <RoofLayoutFacetBar
                    facets={facets}
                    activeFacetId={activeFacetId}
                    onSelectFacet={handleSelectFacet}
                    onAddFacet={handleAddFacet}
                    onRemoveFacet={handleRemoveFacet}
                    onAzimuthChange={handleFacetAzimuth}
                  />
                )}

                <RoofLayoutStatusStrip
                  panelCount={displayedPanelCount}
                  panelCountReady={layoutMode !== 'editing' || isPolygonSummaryReady}
                  systemKw={displayedSystemKw}
                  targetSystemKw={targetSystemKw}
                  roofAreaM2={
                    layoutMode === 'editing' && !isPolygonSummaryReady ? null : result.roof_area_m2
                  }
                  usableAreaM2={
                    layoutMode === 'editing' && !isPolygonSummaryReady ? null : result.usable_area_m2
                  }
                  metricsReady={layoutMode !== 'editing' || isPolygonSummaryReady}
                  layoutState={layoutStateLabel}
                  savedAt={loadedSavedAt}
                  moduleWatts={effectiveWattage}
                  fillPercent={layoutFillPercent}
                  kwVsTarget={kwVsTarget}
                  facetCount={facets.length}
                />

                <div className="w-full flex flex-col gap-4 min-w-0">
                  <div className="w-full flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="space-y-2 min-w-0 flex-1">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Layout preview
                  </h2>
                  {canToggle2d3dPreview && (
                    <div className="flex items-center gap-2 flex-wrap">
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
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {layoutMode === 'editing' && roofViewTab === '2d' && (
                      <RoofLayoutUndoButtons
                        canUndo={polygonHistory.canUndo}
                        canRedo={polygonHistory.canRedo}
                        onUndo={handleUndoPolygon}
                        onRedo={handleRedoPolygon}
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleSaveForProposal}
                      disabled={savingToProposal}
                      className={`min-h-[40px] inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold border ${
                        lastSavedProjectId && activeProject?.master?.crmProjectId != null
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                          : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                      } disabled:opacity-60`}
                    >
                      {savingToProposal
                        ? 'Saving…'
                        : lastSavedProjectId && activeProject?.master?.crmProjectId != null
                          ? '✓ Saved for Proposal'
                          : 'Save to Proposal'}
                    </button>
                  </div>
                  </div>

                <div
                  className={`relative w-full max-w-full rounded-xl border border-gray-200 flex flex-col min-h-0 overflow-hidden ${
                    roofViewTab === '3d'
                      ? 'roof-layout-preview-3d bg-slate-200'
                      : 'roof-layout-preview-2d bg-white'
                  }`}
                >
                  {roofViewTab === '2d' && layoutMode === 'editing' && <RoofLayoutMapChrome />}
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
                                    panelCoordinates={allPanelsFlat.map((p) => ({
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
                                    panelCoordinates={allPanelsFlat.map((p) => ({
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
                      className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden w-full h-full"
                    >
                    <div
                      ref={layoutScrollRef}
                      className={`w-full h-full min-h-0 flex-1 min-w-0 overscroll-contain ${
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
                      <div
                        className="flex w-full justify-center items-start box-border"
                        style={{ minHeight: '100%' }}
                      >
                        {/* Scroll extent matches scaled map (SCROLL_BUFFER_PX = 0); centre below without flex on overflow parent (fixes Konva drag). */}
                        <div
                          className="relative flex-shrink-0 bg-white"
                        style={{
                          width: imageSize.width * zoom + 2 * SCROLL_BUFFER_PX,
                          height: imageSize.height * zoom + 2 * SCROLL_BUFFER_PX,
                          minWidth: imageSize.width * zoom + 2 * SCROLL_BUFFER_PX,
                          minHeight: imageSize.height * zoom + 2 * SCROLL_BUFFER_PX,
                          ...(layoutMode === 'editing' &&
                          bgImageUrl &&
                          imageSize.width >= 1800 &&
                          imageSize.height >= 1800 &&
                          Math.abs(imageSize.width / imageSize.height - 1) < 0.08
                            ? {
                                backgroundImage: `url('${bgImageUrl.replace(/'/g, "\\'")}')`,
                                backgroundSize: '100% 100%',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: '0 0',
                              }
                            : {}),
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
                            pointerEvents:
                              mapEditTool !== 'scroll' || !isMobileView ? 'auto' : 'none',
                            ...(mapEditTool !== 'scroll' || !isMobileView
                              ? ({ touchAction: 'none' } as const)
                              : {}),
                          }}
                        >
                          <Stage
                        ref={stageRef}
                        width={imageSize.width}
                        height={imageSize.height}
                        onMouseMove={(e) => {
                          if (layoutMode !== 'editing' || !polygon?.length) return;
                          const pos = e.target.getStage()?.getPointerPosition();
                          if (!pos) return;
                          setHoveredEdge(closestPolygonEdge(polygon, METERS_PER_PIXEL, pos));
                        }}
                        onMouseLeave={() => setHoveredEdge(null)}
                      >
                        {/* Base image */}
                        <Layer>
                          <KonvaImage
                            image={bgImage}
                            width={imageSize.width}
                            height={imageSize.height}
                            opacity={satelliteOpacity}
                          />
                        </Layer>

                        {/* Inactive roof sections (multi-facet). */}
                        {layoutMode === 'editing' &&
                          facets.map(
                            (f) =>
                              f.id !== activeFacetId &&
                              f.polygon &&
                              f.polygon.length >= 3 && (
                                <Layer key={f.id} listening={false}>
                                  <Line
                                    points={f.polygon.flatMap((p) => [p.x, p.y])}
                                    closed
                                    stroke="#64748b"
                                    strokeWidth={polygonStrokeWidth}
                                    dash={[10, 6]}
                                    fill="rgba(100,116,139,0.06)"
                                  />
                                  {f.panels.map((rect, idx) => (
                                    <Rect
                                      key={`${f.id}-p-${idx}`}
                                      x={rect.x + PANEL_VISUAL_INSET_PX}
                                      y={rect.y + PANEL_VISUAL_INSET_PX}
                                      width={Math.max(2, rect.w - PANEL_VISUAL_INSET_PX * 2)}
                                      height={Math.max(2, rect.h - PANEL_VISUAL_INSET_PX * 2)}
                                      fill="rgba(100,116,139,0.45)"
                                      stroke="#94a3b8"
                                      strokeWidth={1}
                                      listening={false}
                                    />
                                  ))}
                                </Layer>
                              ),
                          )}

                        {/* Active section outline (green). */}
                        {layoutMode === 'editing' && polygon && (
                          <Layer ref={polygonOutlineLayerRef}>
                            <Line
                              ref={lineRef}
                              points={polygon.flatMap((p) => [p.x, p.y])}
                              closed
                              stroke="#16a34a"
                              strokeWidth={polygonStrokeWidth}
                              fill="rgba(34,197,94,0.08)"
                              listening={false}
                            />
                          </Layer>
                        )}

                        {layoutMode === 'editing' && hoveredEdge && (
                          <Layer listening={false}>
                            <Label x={hoveredEdge.mid.x} y={hoveredEdge.mid.y - 16}>
                              <Tag fill="rgba(15,23,42,0.9)" cornerRadius={4} />
                              <Text
                                text={`${hoveredEdge.lengthM.toFixed(1)} m`}
                                fill="#ffffff"
                                fontSize={12}
                                padding={5}
                              />
                            </Label>
                          </Layer>
                        )}

                        {layoutMode === 'editing' && keepouts.length > 0 && (
                          <Layer ref={keepoutLayerRef}>
                            {keepouts.map((k) => (
                              <Rect
                                key={k.id}
                                x={k.x}
                                y={k.y}
                                width={k.w}
                                height={k.h}
                                fill="rgba(249,115,22,0.35)"
                                stroke="#ea580c"
                                strokeWidth={1.5}
                                draggable={mapEditTool === 'keepout'}
                                onDragEnd={(e) => {
                                  const node = e.target;
                                  setKeepouts((prev) =>
                                    prev.map((item) =>
                                      item.id === k.id
                                        ? { ...item, x: node.x(), y: node.y() }
                                        : item,
                                    ),
                                  );
                                }}
                              />
                            ))}
                          </Layer>
                        )}

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
                            {panels.map((rect, idx) => {
                              const inset = PANEL_VISUAL_INSET_PX;
                              return (
                              <Rect
                                key={idx}
                                x={rect.x + inset}
                                y={rect.y + inset}
                                width={Math.max(2, rect.w - inset * 2)}
                                height={Math.max(2, rect.h - inset * 2)}
                                fill="rgba(14,30,95,0.92)"
                                stroke="#c7d2e3"
                                strokeWidth={1.15}
                                cornerRadius={1}
                                listening={false}
                                perfectDrawEnabled={false}
                                shadowEnabled={false}
                              />
                              );
                            })}
                          </Layer>
                        )}

                        {/* Invisible bbox above panels — Konva still hit-tests panel rects unless drag layer is on top. */}
                        {canEditRoofPolygon && polygon && (
                          <Layer ref={polygonDragLayerRef}>
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
                                  fill="rgba(22,163,74,0.03)"
                                  draggable
                                  strokeEnabled={false}
                                  onMouseEnter={() => { document.body.style.cursor = 'move'; }}
                                  onMouseLeave={() => { document.body.style.cursor = 'default'; }}
                                  onDragStart={(e) => {
                                    polygonMoveStartRef.current = { x: e.target.x(), y: e.target.y() };
                                    polygonBaseRef.current = polygon ? polygon.map((p) => ({ ...p })) : null;
                                    polygonDragRef.current = { x: e.target.x(), y: e.target.y() };
                                  }}
                                  onDragMove={(e) => {
                                    if (!polygonDragRef.current || !polygonBaseRef.current || !lineRef.current) return;
                                    const start = polygonMoveStartRef.current;
                                    const nx = e.target.x();
                                    const ny = e.target.y();
                                    const totalDist = start
                                      ? Math.abs(nx - start.x) + Math.abs(ny - start.y)
                                      : 0;
                                    if (totalDist > 8 && !isDraggingRef.current) {
                                      isDraggingRef.current = true;
                                      setIsDragging(true);
                                      document.body.style.cursor = 'grabbing';
                                    }
                                    if (!isDraggingRef.current) return;
                                    const dragOrigin = polygonDragRef.current;
                                    const dx = nx - dragOrigin.x;
                                    const dy = ny - dragOrigin.y;
                                    const flat = polygonBaseRef.current.flatMap((p) => [p.x + dx, p.y + dy]);
                                    lineRef.current.points(flat);
                                    lineRef.current.getLayer()?.batchDraw();
                                  }}
                                  onDragEnd={(e) => {
                                    const start = polygonMoveStartRef.current;
                                    const nx = e.target.x();
                                    const ny = e.target.y();
                                    const totalDist = start
                                      ? Math.abs(nx - start.x) + Math.abs(ny - start.y)
                                      : 0;
                                    const didMove = totalDist > 8;

                                    document.body.style.cursor = 'move';
                                    polygonDragRef.current = null;
                                    polygonMoveStartRef.current = null;
                                    isDraggingRef.current = false;
                                    setIsDragging(false);

                                    if (didMove && lineRef.current) {
                                      const flat = lineRef.current.points();
                                      const next: Point[] = [];
                                      for (let i = 0; i < flat.length; i += 2)
                                        next.push({ x: flat[i]!, y: flat[i + 1]! });
                                      applyPolygon(next.length ? next : null);
                                    } else {
                                      if (start) e.target.position({ x: start.x, y: start.y });
                                      if (polygonBaseRef.current && lineRef.current) {
                                        lineRef.current.points(
                                          polygonBaseRef.current.flatMap((p) => [p.x, p.y]),
                                        );
                                        lineRef.current.getLayer()?.batchDraw();
                                      }
                                    }
                                    polygonBaseRef.current = null;
                                  }}
                                />
                              );
                            })()}
                          </Layer>
                        )}

                        {/* Draggable polygon control-point circles (corner handles).
                            Ref is attached so they can be hidden before toDataURL capture. */}
                        {canEditRoofPolygon && polygon && (
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
                                    applyPolygon(next.length ? next : null);
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
                      </div>
                    ) : layoutPreviewFallbackUrl ? (
                      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] p-4 gap-3">
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center max-w-md">
                          {layoutMode === 'editing'
                            ? 'Satellite map could not be loaded. Showing your last saved layout image. Use Regenerate AI Layout to restore full editing.'
                            : 'Showing your saved layout image.'}
                        </p>
                        <img
                          src={layoutPreviewFallbackUrl}
                          alt="Saved rooftop solar layout"
                          className="max-w-full max-h-[min(520px,70vh)] w-auto h-auto object-contain rounded-lg border border-slate-200 bg-white shadow-sm"
                          crossOrigin="anonymous"
                        />
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

                  {isNarrowViewport && roofViewTab !== '3d' && layoutMode === 'editing' && (
                    <div className="w-full lg:hidden space-y-2">
                      {mapEditTool === 'scroll' && layoutMode === 'editing' && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
                          Tap <strong>Edit polygon</strong> or <strong>Keepouts</strong> to adjust the map.
                        </p>
                      )}
                      <div className="flex items-stretch gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setMapTool('scroll')}
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
                          onClick={() => setMapTool('roof')}
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
                          onClick={() => setMapTool('keepout')}
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
                            onClick={() =>
                              setZoom((z) => Math.max(0.2, Math.round((z - 0.25) * 4) / 4))
                            }
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
                            onClick={() =>
                              setZoom((z) => Math.min(10, Math.round((z + 0.25) * 4) / 4))
                            }
                            className="h-11 w-10 flex items-center justify-center text-sm font-semibold touch-manipulation"
                            aria-label="Zoom in"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full flex flex-col gap-2 xl:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileControlsOpen((o) => !o)}
                      className="xl:hidden flex items-center justify-between w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 touch-manipulation"
                      aria-expanded={mobileControlsOpen}
                    >
                      <span>
                        {isMobileView && roofViewTab === '2d'
                          ? 'Adjust layout (density, orientation)'
                          : 'Adjust layout (zoom, density, orientation)'}
                      </span>
                      <span className="text-gray-400" aria-hidden>
                        {mobileControlsOpen ? '▲' : '▼'}
                      </span>
                    </button>

                    <div
                      className={`flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 xl:hidden ${
                        !mobileControlsOpen ? 'hidden' : ''
                      }`}
                    >
                      {layoutMode === 'editing' && (
                        <RoofLayoutPanelActions
                          disabled={!polygon}
                          panelCount={totalFacetPanelCount(facets)}
                          facetCount={facets.length}
                          onClear={clearPanelsOnMap}
                          onRefill={applyPanelLayoutFromPolygon}
                          onRefillAll={facets.length > 1 ? refillAllFacets : undefined}
                        />
                      )}
                      <RoofLayoutAdjustPanel
                        roofViewTab={roofViewTab}
                        layoutMode={layoutMode}
                        isMobileView={isMobileView}
                        narrow3dLive={narrow3dLive}
                        layoutZoomValue={layoutZoomValue}
                        layoutZoomMin={layoutZoomMin}
                        setLayoutZoom={setLayoutZoom}
                        panelSpacingMultiplier={panelSpacingMultiplier}
                        setPanelSpacingMultiplier={setPanelSpacingMultiplier}
                        panelOrientation={panelOrientation}
                        setPanelOrientation={setPanelOrientation}
                        satelliteOpacity={satelliteOpacity}
                        setSatelliteOpacity={setSatelliteOpacity}
                        hasPolygon={!!polygon}
                        onSnapToGrid={handleSnapOutlineToGrid}
                        keepouts={keepouts}
                        onAddKeepout={addKeepout}
                        onRemoveKeepout={(id) => setKeepouts((prev) => prev.filter((k) => k.id !== id))}
                        onClearKeepouts={() => setKeepouts([])}
                        mapEditTool={mapEditTool}
                        onMapToolChange={setMapTool}
                      />
                    </div>
                  </div>


                <div className="hidden lg:grid xl:hidden w-full lg:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  {layoutMode === 'editing' && (
                    <RoofLayoutPanelActions
                      disabled={!polygon}
                      panelCount={totalFacetPanelCount(facets)}
                      facetCount={facets.length}
                      onClear={clearPanelsOnMap}
                      onRefill={applyPanelLayoutFromPolygon}
                      onRefillAll={facets.length > 1 ? refillAllFacets : undefined}
                    />
                  )}
                  <RoofLayoutAdjustPanel
                    variant="inline"
                    roofViewTab={roofViewTab}
                    layoutMode={layoutMode}
                    isMobileView={isMobileView}
                    narrow3dLive={narrow3dLive}
                    layoutZoomValue={layoutZoomValue}
                    layoutZoomMin={layoutZoomMin}
                    setLayoutZoom={setLayoutZoom}
                    panelSpacingMultiplier={panelSpacingMultiplier}
                    setPanelSpacingMultiplier={setPanelSpacingMultiplier}
                    panelOrientation={panelOrientation}
                    setPanelOrientation={setPanelOrientation}
                    satelliteOpacity={satelliteOpacity}
                    setSatelliteOpacity={setSatelliteOpacity}
                    hasPolygon={!!polygon}
                    onSnapToGrid={handleSnapOutlineToGrid}
                    keepouts={keepouts}
                    onAddKeepout={addKeepout}
                    onRemoveKeepout={(id) => setKeepouts((prev) => prev.filter((k) => k.id !== id))}
                    onClearKeepouts={() => setKeepouts([])}
                    mapEditTool={mapEditTool}
                    onMapToolChange={setMapTool}
                  />
                </div>

                <p className="mt-1 text-[11px] text-gray-500 leading-snug">
                  Satellite-assisted draft — roof outline is drawn by you (not auto-traced). Verify on-site before
                  finalizing proposals.
                </p>
                {lastLatitude != null && lastLongitude != null && (
                  <p className="text-[11px] text-gray-500 truncate">
                    <span className="text-gray-400">Location: </span>
                    <a
                      href={`https://www.google.com/maps?q=${lastLatitude},${lastLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline"
                    >
                      Open in Google Maps
                    </a>
                  </p>
                )}
                </div>
              </section>

              <aside className="hidden xl:flex xl:flex-col gap-4 min-w-0 xl:sticky xl:top-4 self-start">
                {layoutMode === 'editing' && (
                  <RoofLayoutPanelActions
                    disabled={!polygon}
                    panelCount={totalFacetPanelCount(facets)}
                    facetCount={facets.length}
                    onClear={clearPanelsOnMap}
                    onRefill={applyPanelLayoutFromPolygon}
                    onRefillAll={facets.length > 1 ? refillAllFacets : undefined}
                  />
                )}
                <RoofLayoutAdjustPanel
                  roofViewTab={roofViewTab}
                  layoutMode={layoutMode}
                  isMobileView={isMobileView}
                  narrow3dLive={narrow3dLive}
                  layoutZoomValue={layoutZoomValue}
                  layoutZoomMin={layoutZoomMin}
                  setLayoutZoom={setLayoutZoom}
                  panelSpacingMultiplier={panelSpacingMultiplier}
                  setPanelSpacingMultiplier={setPanelSpacingMultiplier}
                  panelOrientation={panelOrientation}
                  setPanelOrientation={setPanelOrientation}
                  satelliteOpacity={satelliteOpacity}
                  setSatelliteOpacity={setSatelliteOpacity}
                  hasPolygon={!!polygon}
                  onSnapToGrid={handleSnapOutlineToGrid}
                  keepouts={keepouts}
                  onAddKeepout={addKeepout}
                  onRemoveKeepout={(id) => setKeepouts((prev) => prev.filter((k) => k.id !== id))}
                  onClearKeepouts={() => setKeepouts([])}
                  mapEditTool={mapEditTool}
                  onMapToolChange={setMapTool}
                />
              </aside>
            </div>

            {isMobileView && (
              <div
                className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                role="region"
                aria-label="Save layout"
              >
                <button
                  type="button"
                  onClick={handleSaveForProposal}
                  disabled={savingToProposal}
                  className={`w-full min-h-[48px] inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold border touch-manipulation ${
                    lastSavedProjectId && activeProject?.master?.crmProjectId != null
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                      : 'bg-emerald-600 text-white border-emerald-700'
                  } disabled:opacity-60`}
                >
                  {savingToProposal
                    ? 'Saving…'
                    : lastSavedProjectId && activeProject?.master?.crmProjectId != null
                      ? '✓ Saved for Proposal'
                      : 'Save to Proposal'}
                </button>
                <p className="mt-1.5 text-center text-[10px] text-gray-500">
                  Proposal embed:{' '}
                  <strong className="text-gray-700">
                    {proposalImageSource === '3d' && canChoose3dForProposal ? '3D render' : '2D layout'}
                  </strong>
                </p>
              </div>
            )}
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

      <ConfirmDangerModal
        open={deleteConfirmOpen}
        message={
          <>
            Delete the roof layout for{' '}
            <strong>{activeProject?.master?.name ?? 'this project'}</strong>? Saved layout images,
            satellite cache, and geometry on the server will be removed. You can generate a new layout
            afterward.
          </>
        }
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void handleDeleteLayout()}
        confirming={deleting}
      />
    </div>
  );
}

