import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - use-image has ESM types that may not be picked up correctly here
import useImage from 'use-image';
import {
  deleteRoofLayout,
  AiRoofLayoutResponse,
  fetchManualRoofLayout,
} from '../lib/apiClient';
import {
  ROOF_LAYOUT_METERS_PER_PIXEL,
  ROOF_LAYOUT_PANEL_SPACING_M,
} from '../lib/roofLayoutConstants';
import { handleRoofLayout3dExportPng } from '../lib/roofLayout/roofLayout3dExport';
import { findPvModuleArtifactLine } from '../lib/roofLayout/pvModuleFromArtifacts';
import {
  orientModuleDimensions,
  resolveModuleDimensions,
} from '../lib/roofLayout/resolveModuleDimensions';
import {
  absolutizeLayoutImageUrl,
  initialPolygonHalfExtentsPx,
  ROOF_LAYOUT_MOBILE_FOOTER_CLEARANCE,
  roofLayoutScrollBufferPx,
} from '../lib/roofLayout/roofLayoutPageUtils';

const ROOF_LAYOUT_MOBILE_ADJUST_PANEL_ID = 'roof-layout-mobile-adjust-panel';
import {
  clearRoofLayoutFromActiveCustomer,
  persistRoofLayoutToActiveCustomer,
} from '../lib/roofLayout/roofLayoutCustomerSync';
import { computePanelsForPolygon } from '../lib/roofLayout/computePanelsForPolygon';
import { runGenerateRoofLayoutDraft } from '../lib/roofLayout/generateRoofLayoutDraft';
import { parseManualRoofLayoutHydrate } from '../lib/roofLayout/hydrateManualRoofLayout';
import {
  exportSitePlanPdfFromLayout,
  saveRoofLayoutForProposal,
} from '../lib/roofLayout/roofLayoutSaveExport';
import { fingerprintRoofLayoutEditorState } from '../lib/roofLayout/roofLayoutGeometryFingerprint';
import type { RoofLayoutKeepout, RoofLayoutPoint } from '../lib/roofLayout/roofLayoutTypes';
import {
  getActiveCustomer,
} from '../lib/customerStore';
import type { Solar3DOrbitSnapshot, Solar3DViewHandle } from '../components/Solar3DView';
import { RoofLayoutDesignStepper } from '../components/roofLayout/RoofLayoutDesignStepper';
import { RoofLayoutStatusStrip } from '../components/roofLayout/RoofLayoutStatusStrip';
import { RoofLayoutMapChrome } from '../components/roofLayout/RoofLayoutMapChrome';
import { RoofLayout3DPreviewShell } from '../components/roofLayout/RoofLayout3DPreviewShell';
import { RoofLayoutMobileMapTools } from '../components/roofLayout/RoofLayoutMobileMapTools';
import { usePolygonHistory } from '../components/roofLayout/usePolygonHistory';
import { useRoofLayout3DTab } from '../components/roofLayout/useRoofLayout3DTab';
import { useRoofLayoutEditorState } from '../components/roofLayout/useRoofLayoutEditorState';
import { useRoofLayoutScrollViewport } from '../components/roofLayout/useRoofLayoutScrollViewport';
import { useRoofLayoutViewport } from '../components/roofLayout/useRoofLayoutViewport';
import { RoofLayoutPanelActions } from '../components/roofLayout/RoofLayoutPanelActions';
import { RoofLayoutAdjustPanel } from '../components/roofLayout/RoofLayoutAdjustPanel';
import { RoofLayoutFacetBar } from '../components/roofLayout/RoofLayoutFacetBar';
import { RoofLayoutKonvaStage } from '../components/roofLayout/RoofLayoutKonvaStage';
import { RoofLayoutPageHeader } from '../components/roofLayout/RoofLayoutPageHeader';
import { RoofLayoutActiveCustomerBanner } from '../components/roofLayout/RoofLayoutActiveCustomerBanner';
import { RoofLayoutOverridePanel } from '../components/roofLayout/RoofLayoutOverridePanel';
import { RoofLayoutExportActions } from '../components/roofLayout/RoofLayoutExportActions';
import { RoofLayoutPreviewToolbar } from '../components/roofLayout/RoofLayoutPreviewToolbar';
import { ConfirmDangerModal } from '../components/ConfirmDangerModal';
import {
  createRoofFacet,
  MAX_ROOF_FACETS,
  offsetPolygonForNewFacet,
  splitTargetKwAcrossFacets,
  totalFacetPanelCount,
  type RoofFacetState,
} from '../lib/roofLayoutFacets';
import type { PolygonEdgeInfo } from '../lib/roofLayoutEdgeMeasure';
import { isPlaceholderSatelliteBytes } from '../lib/roofLayoutSatelliteImage';
import { getKeralaMapGpsWarning } from '../lib/mapGpsValidation';

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

  const pvModuleLine = useMemo(
    () => findPvModuleArtifactLine(activeProject?.costing, activeProject?.bom),
    [activeProject?.costing, activeProject?.bom],
  );

  const resolvedModule = useMemo(
    () =>
      resolveModuleDimensions({
        panelWattage: effectiveWattage,
        panelBrand: activeProject?.master?.panelBrand,
        artifactSpecification: pvModuleLine?.specification,
        artifactBrand: pvModuleLine?.brand,
      }),
    [
      effectiveWattage,
      activeProject?.master?.panelBrand,
      pvModuleLine?.specification,
      pvModuleLine?.brand,
    ],
  );

  // 75% zoom gives a good first view at zoom=19 (307 m coverage).
  const [zoom, setZoom] = useState(0.75);
  /** 3D layout preview zoom (separate from 2D Konva zoom). Scales scroll content so WebGL resizes — stays sharp. */
  const [zoom3d, setZoom3d] = useState(1);
  const [savingToProposal, setSavingToProposal] = useState(false);
  const [exportingSitePlan, setExportingSitePlan] = useState(false);
  const [lastSavedProjectId, setLastSavedProjectId] = useState<string | null>(null);
  const [loadedSavedAt, setLoadedSavedAt] = useState<string | null>(null);
  /** Fingerprint of geometry last persisted to the server (save or hydrate). */
  const [savedLayoutFingerprint, setSavedLayoutFingerprint] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'saved' | 'editing'>('editing');
  const [panelSpacingMultiplier, setPanelSpacingMultiplier] = useState(1.5);
  const [edgeSetbackM, setEdgeSetbackM] = useState(0);
  const [panelOrientation, setPanelOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const orientedModuleSizeM = useMemo(
    () => orientModuleDimensions(resolvedModule, panelOrientation),
    [resolvedModule, panelOrientation],
  );

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
  const polygonBaseRef = useRef<RoofLayoutPoint[] | null>(null); // polygon at drag start for imperative updates
  const recomputeTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  // When true, canvas captures touch (edit polygon); when false, touches pass through so map scroll works (mobile)
  const [mapEditTool, setMapEditTool] = useState<'scroll' | 'roof' | 'keepout'>('scroll');
  const [keepouts, setKeepouts] = useState<RoofLayoutKeepout[]>([]);
  const [satelliteOpacity, setSatelliteOpacity] = useState(1);
  const [satelliteContrast, setSatelliteContrast] = useState(0);
  const [hoveredEdge, setHoveredEdge] = useState<PolygonEdgeInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { isMobileView, isNarrowViewport, mobileControlsOpen, setMobileControlsOpen } =
    useRoofLayoutViewport();

  type Point = RoofLayoutPoint;

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

  const captureRefs = useMemo(
    () => ({
      stageRef,
      handlesLayerRef,
      polygonOutlineLayerRef,
      polygonDragLayerRef,
      keepoutLayerRef,
    }),
    [],
  );

  const layoutScrollBufferPx = roofLayoutScrollBufferPx(isMobileView);

  const {
    panelPackBase,
    allPanelsFlat,
    has3DRoofData,
    hasUnsavedLayoutChanges,
    isLayoutSyncedToServer,
    workflowStep,
    layoutStateLabel,
    targetSystemKw,
    displayedPanelCount,
    displayedSystemKw,
    layoutFillPercent,
    kwVsTarget,
    panelCountReady,
    yieldEstimate,
    yieldTooltip,
  } = useRoofLayoutEditorState({
    activeProject,
    result,
    facets,
    keepouts,
    panelOrientation,
    panelSpacingMultiplier,
    edgeSetbackM,
    effectiveWattage,
    resolvedModule,
    orientedModuleSizeM,
    imageSize,
    layoutMode,
    isPolygonSummaryReady,
    lastSavedProjectId,
    savedLayoutFingerprint,
    mapEditTool,
  });

  const { layoutScrollViewport, centerMapOnActiveRoof, invalidateScrollCenterCache } =
    useRoofLayoutScrollViewport({
    roofViewTab,
    layoutMode,
    has3DRoofData,
    layoutScrollRef,
    layoutPreviewMeasureRef,
    layout3dCanvasMeasureRef,
    imageSize,
    bgImage,
    bgImageUrl,
    result,
    polygon,
    zoom,
    layoutScrollBufferPx,
  });

  const {
    narrow3dLive,
    saved3dDisplayUrl,
    canToggle2d3dPreview,
    canChoose3dForProposal,
    layout3dBaseW,
    layout3dBaseH,
    layoutZoom3dActive,
    layoutZoomValue,
    layoutZoomMin,
  } = useRoofLayout3DTab({
    roofViewTab,
    setRoofViewTab,
    zoom,
    zoom3d,
    setZoom3d,
    last3dPngDataUrl,
    result,
    has3DRoofData,
    isNarrowViewport,
    layoutScrollViewport,
  });

  const setLayoutZoom = layoutZoom3dActive ? setZoom3d : setZoom;

  const handle3dExportPng = useCallback(
    (dataUrl: string) =>
      handleRoofLayout3dExportPng(dataUrl, {
        crmProjectId: activeProject?.master?.crmProjectId,
        result,
        setLast3dPngDataUrl,
        setProposalImageSource,
        setResult,
        setError,
      }),
    [activeProject?.master?.crmProjectId, result],
  );

  const setMapTool = (tool: 'scroll' | 'roof' | 'keepout') => {
    setMapEditTool(tool);
  };

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
      } else if (e.key === 'k' || e.key === 'K') {
        setMapTool('keepout');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [roofViewTab, layoutMode, polygon, polygonHistory.canUndo, polygonHistory.canRedo]);

  /** Mobile uses Scroll vs Edit tools; desktop always shows roof handles in editing mode. */
  const canEditRoofPolygon = layoutMode === 'editing' && (mapEditTool === 'roof' || !isMobileView);

  /** When satellite disk URL 404s, still show the persisted proposal JPEG from Cloudinary/DB. */
  const layoutPreviewFallbackUrl =
    roofViewTab === '2d' && !bgImage && result?.layout_image_url
      ? absolutizeLayoutImageUrl(result.layout_image_url)
      : null;

  // On open, if the project already has a saved manual layout image, pre-load it.
  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSavedLayout() {
      const crmProjectId = activeProject?.master?.crmProjectId;
      if (!crmProjectId) return;
      const hydrateGen = layoutHydrateGenerationRef.current;

      try {
        const manual = await fetchManualRoofLayout(String(crmProjectId));
        if (cancelled || hydrateGen !== layoutHydrateGenerationRef.current) return;

        const parsed = parseManualRoofLayoutHydrate(manual, String(crmProjectId));
        if (parsed.kind === 'none') return;
        if (hydrateGen !== layoutHydrateGenerationRef.current) return;

        setError(null);

        if (parsed.kind === 'editing') {
          const data = parsed.data;
          setResult(data.result);
          setLastSavedProjectId(String(crmProjectId));
          setLoadedSavedAt(data.savedAt);
          setSavedLayoutFingerprint(data.geometryFingerprint);
          if (data.layout3dUrl) setLast3dPngDataUrl(data.layout3dUrl);
          else setLast3dPngDataUrl(null);
          setProposalImageSource(data.proposalImageSource);
          setRoofViewTab(data.roofViewTab);

          persistRoofLayoutToActiveCustomer({
            roof_area_m2: data.result.roof_area_m2,
            usable_area_m2: data.result.usable_area_m2,
            panel_count: data.result.panel_count,
            layout_image_url: data.result.layout_image_url,
            layout_image_3d_url: data.result.layout_image_3d_url,
            prefer_3d_for_proposal: data.result.prefer_3d_for_proposal,
            savedAt: data.savedAt ?? undefined,
          });

          setPanelOrientation(data.panelOrientation);
          setPanelSpacingMultiplier(data.panelSpacingMultiplier);
          setEdgeSetbackM(data.edgeSetbackM);
          setKeepouts(data.keepouts);
          setFacets(data.facets);
          setActiveFacetId(data.activeFacetId);
          setBgImageUrl(data.bgImageUrl);
          satelliteEditorUrlRef.current = data.satelliteEditorBaseUrl;
          setLayoutMode('editing');
          setIsPolygonSummaryReady(true);
          polygonHistory.resetHistory();
          applyAggregatedMetrics(data.facets);
          setMapTool(isMobileView ? 'scroll' : 'roof');
          return;
        }

        const data = parsed.data;
        setResult(data.result);
        setLastSavedProjectId(String(crmProjectId));
        setLoadedSavedAt(data.savedAt);
        setSavedLayoutFingerprint(null);
        if (data.layout3dUrl) setLast3dPngDataUrl(data.layout3dUrl);
        else setLast3dPngDataUrl(null);
        setProposalImageSource(data.proposalImageSource);
        setRoofViewTab(data.roofViewTab);

        persistRoofLayoutToActiveCustomer({
          roof_area_m2: data.result.roof_area_m2,
          usable_area_m2: data.result.usable_area_m2,
          panel_count: data.result.panel_count,
          layout_image_url: data.result.layout_image_url,
          layout_image_3d_url: data.result.layout_image_3d_url,
          prefer_3d_for_proposal: data.result.prefer_3d_for_proposal,
          savedAt: data.savedAt ?? undefined,
        });

        setLayoutMode('saved');
        setIsPolygonSummaryReady(true);
        setBgImageUrl(data.bgImageUrl);
        resetFacetsToSingle();
        setKeepouts([]);
        setImageSize(null);
        satelliteEditorUrlRef.current = null;
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

  const resetLayoutEditorToBlank = () => {
    layoutHydrateGenerationRef.current += 1;
    solar3dPersistentLayoutKeyRef.current = '';
    solar3dOrbitRef.current = null;
    setResult(null);
    setError(null);
    setLastSavedProjectId(null);
    setLoadedSavedAt(null);
    setSavedLayoutFingerprint(null);
    setLayoutMode('editing');
    setIsPolygonSummaryReady(false);
    isDraggingRef.current = false;
    setIsDragging(false);
    polygonDragRef.current = null;
    polygonBaseRef.current = null;
    resetFacetsToSingle();
    polygonHistory.resetHistory();
    setKeepouts([]);
    setEdgeSetbackM(0);
    setMapTool(isMobileView ? 'scroll' : 'roof');
    setBgImageUrl(null);
    setImageSize(null);
    satelliteEditorUrlRef.current = null;
    setLast3dPngDataUrl(null);
    setProposalImageSource('2d');
    setRoofViewTab('2d');
    setSatelliteImageryWarning(null);
    invalidateScrollCenterCache();
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
    setLastSavedProjectId(null);
    setSavedLayoutFingerprint(null);
    setEdgeSetbackM(0);
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

    try {
      const outcome = await runGenerateRoofLayoutDraft({
        crmProjectId,
        master,
        mapsLinkOverride,
        panelWOverride,
      });
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      setLastLatitude(outcome.latitude);
      setLastLongitude(outcome.longitude);
      setResult(outcome.result);
      setLast3dPngDataUrl(null);
      setProposalImageSource('2d');
      setBgImageUrl(outcome.bgImageUrl);
      satelliteEditorUrlRef.current = outcome.satelliteEditorBaseUrl;
    } finally {
      setLoading(false);
    }
  };

  const switchTo2dForCapture = () => flushSync(() => setRoofViewTab('2d'));

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
    const needTemp2d = prevViewTab === '3d';

    setSavingToProposal(true);
    setError(null);

    try {
      const saved = await saveRoofLayoutForProposal({
        crmProjectId,
        layoutMode,
        captureRefs,
        stageRef,
        solar3dRef,
        result,
        facets,
        activePolygon: polygon,
        allPanelsFlat,
        imageSize,
        keepouts,
        panelOrientation,
        panelSpacingMultiplier,
        effectiveWattage,
        resolvedModule,
        edgeSetbackM,
        metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
        roofViewTab,
        proposalImageSource,
        last3dPngDataUrl,
        switchTo2dForCapture: needTemp2d ? switchTo2dForCapture : undefined,
        on3dCaptured: (dataUrl: string) => setLast3dPngDataUrl(dataUrl),
      });

      if (!saved.ok) {
        setError(saved.error);
        return;
      }

      if (saved.partialWarning) {
        setError(saved.partialWarning);
      }

      setResult((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          source: 'MANUAL' as const,
          layout_image_url: saved.layout_image_url,
          ...(saved.layout_image_3d_url != null && { layout_image_3d_url: saved.layout_image_3d_url }),
          prefer_3d_for_proposal: saved.prefer_3d_for_proposal,
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
      setLoadedSavedAt(new Date().toISOString());
      const savedFingerprint = fingerprintRoofLayoutEditorState({
        facets,
        keepouts,
        panelOrientation,
        panelSpacingMultiplier,
        panelWatts: effectiveWattage,
        imageSize,
        metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
        edgeSetbackM,
        resolvedModule,
      });
      if (savedFingerprint) setSavedLayoutFingerprint(savedFingerprint);

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

  const handleExportSitePlanPdf = async () => {
    if (!bgImage || !imageSize) {
      setError('Nothing to export yet. Generate a layout first.');
      return;
    }
    if (layoutMode === 'editing' && !isPolygonSummaryReady) {
      setError('Draw the roof outline and place panels before exporting a site plan.');
      return;
    }

    const prevViewTab = roofViewTab;
    const needTemp2d = prevViewTab === '3d';

    setExportingSitePlan(true);
    setError(null);

    try {
      const exported = await exportSitePlanPdfFromLayout({
        captureRefs,
        stageRef,
        facets,
        activePolygon: polygon,
        allPanelsFlat,
        imageSize,
        metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
        roofViewTab,
        switchTo2dForCapture: needTemp2d ? switchTo2dForCapture : undefined,
        master: activeProject?.master,
        displayedPanelCount,
        displayedSystemKw,
        targetSystemKw,
        layoutMode,
        isPolygonSummaryReady,
        result,
        effectiveWattage,
        moduleWidthM: orientedModuleSizeM.widthM,
        moduleHeightM: orientedModuleSizeM.heightM,
        moduleSizeSource: resolvedModule.sourceLabel,
        effectiveSystemKw: yieldEstimate?.effectiveKw ?? null,
        orientationLossPercent: yieldEstimate?.orientationLossPercent ?? null,
      });

      if (!exported.ok) {
        setError(exported.error);
      }
    } catch (e) {
      setError('Could not export site plan PDF. Try again.');
      if (import.meta.env.DEV) console.error('Site plan PDF export failed:', e);
    } finally {
      if (needTemp2d) setRoofViewTab(prevViewTab);
      setExportingSitePlan(false);
    }
  };

  const applyAggregatedMetrics = (facetList: RoofFacetState[]) => {
    let roofAreaM2 = 0;
    let usableAreaM2 = 0;
    for (const f of facetList) {
      if (!f.polygon?.length) continue;
      const m = computePanelsForPolygon(f.polygon, {
        ...panelPackBase,
        maxPanelsCap: 99999,
        targetKw: null,
      });
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

    const { widthM, heightM } = orientedModuleSizeM;
    const panelWidthPx = widthM / ROOF_LAYOUT_METERS_PER_PIXEL;
    const panelHeightPx = heightM / ROOF_LAYOUT_METERS_PER_PIXEL;
    const spacingPx = (ROOF_LAYOUT_PANEL_SPACING_M / ROOF_LAYOUT_METERS_PER_PIXEL) * panelSpacingMultiplier;
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
      const { panels: nextPanels } = computePanelsForPolygon(polygon, {
        ...panelPackBase,
        maxPanelsCap: maxCap,
        targetKw: kwEach,
      });

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
    const { panels: nextPanels } = computePanelsForPolygon(polygon, {
      ...panelPackBase,
      maxPanelsCap: maxCap,
      targetKw: kwEach,
    });
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
        const { panels: nextPanels } = computePanelsForPolygon(f.polygon, {
          ...panelPackBase,
          maxPanelsCap: maxCap,
          targetKw: kwEach,
        });
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
    const { widthM, heightM } = orientedModuleSizeM;
    const panelWidthPx = widthM / ROOF_LAYOUT_METERS_PER_PIXEL;
    const panelHeightPx = heightM / ROOF_LAYOUT_METERS_PER_PIXEL;
    const spacingPx = (ROOF_LAYOUT_PANEL_SPACING_M / ROOF_LAYOUT_METERS_PER_PIXEL) * panelSpacingMultiplier;
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

  const addRectKeepout = () => {
    if (!imageSize) return;
    let cx = imageSize.width / 2;
    let cy = imageSize.height / 2;
    if (polygon && polygon.length) {
      cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
      cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
    }
    const sizeM = 1.5;
    const w = sizeM / ROOF_LAYOUT_METERS_PER_PIXEL;
    const h = sizeM / ROOF_LAYOUT_METERS_PER_PIXEL;
    setKeepouts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), shape: 'rect', x: cx - w / 2, y: cy - h / 2, w, h },
    ]);
    setMapTool('keepout');
  };

  const addCircleKeepout = () => {
    if (!imageSize) return;
    let cx = imageSize.width / 2;
    let cy = imageSize.height / 2;
    if (polygon && polygon.length) {
      cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
      cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
    }
    const diameterM = 1.5;
    const r = diameterM / ROOF_LAYOUT_METERS_PER_PIXEL / 2;
    setKeepouts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), shape: 'circle', cx, cy, r },
    ]);
    setMapTool('keepout');
  };

  return (
    <div className="overflow-x-hidden">
      {/* Page card — matches Costing / BOM / ROI heading pattern */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        <RoofLayoutPageHeader
          layoutMode={layoutMode}
          hasResult={!!result}
          showDelete={
            !!(result ||
            (lastSavedProjectId &&
              activeProject?.master?.crmProjectId &&
              lastSavedProjectId === String(activeProject.master.crmProjectId)))
          }
          loading={loading}
          deleting={deleting}
          onDeleteClick={() => setDeleteConfirmOpen(true)}
          onGenerateClick={() => void handleGenerate()}
        />
        {/* Content */}
        <div className="px-2 sm:px-6 md:px-8 py-4 sm:py-8">
          <RoofLayoutActiveCustomerBanner />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 sm:p-6 lg:p-8 max-md:rounded-lg">
        {result && lastSavedProjectId && activeProject?.master?.crmProjectId && lastSavedProjectId === String(activeProject.master.crmProjectId) && (
          result.source === 'AI' ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">AI-assisted draft — draw the roof outline</div>
              <div className="mt-0.5 text-xs text-amber-800">
                Satellite image + a starting rectangle (not auto-traced). Drag green corners to match
                the roof, use <strong>Refill panels</strong>, then <strong>Save to Proposal</strong>.
              </div>
            </div>
          ) : hasUnsavedLayoutChanges ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">Saved layout — unsaved changes</div>
              <div className="mt-0.5 text-xs text-amber-800">
                {loadedSavedAt ? `Last saved: ${new Date(loadedSavedAt).toLocaleString()}. ` : ''}
                You edited the roof or panels since the last save. Click <strong>Save to Proposal</strong> to
                update the server copy.
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

        <RoofLayoutOverridePanel
          error={error}
          showPanel={!!(error || activeProject)}
          keralaMapGpsWarning={keralaMapGpsWarning}
          satelliteImageryWarning={satelliteImageryWarning}
          layoutMode={layoutMode}
          mapsLinkOverride={mapsLinkOverride}
          onMapsLinkOverrideChange={setMapsLinkOverride}
          crmPanelWattage={crmPanelWattage}
          panelWPreset={panelWPreset}
          panelWOverride={panelWOverride}
          effectiveWattage={effectiveWattage}
          onPanelWPresetChange={setPanelWPreset}
          onPanelWOverrideChange={setPanelWOverride}
        />


        {result && (
          <div
            ref={exportRef}
            className="mt-3 w-full max-w-none space-y-4"
            style={
              isMobileView ? { paddingBottom: ROOF_LAYOUT_MOBILE_FOOTER_CLEARANCE } : undefined
            }
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

              <section className="w-full min-w-0 max-w-full overflow-hidden flex flex-col gap-4">
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
                  metricsReady={panelCountReady}
                  layoutState={layoutStateLabel}
                  savedAt={loadedSavedAt}
                  moduleWatts={effectiveWattage}
                  moduleWidthM={orientedModuleSizeM.widthM}
                  moduleHeightM={orientedModuleSizeM.heightM}
                  moduleSizeSource={resolvedModule.sourceLabel}
                  fillPercent={layoutFillPercent}
                  kwVsTarget={kwVsTarget}
                  facetCount={facets.length}
                  effectiveSystemKw={yieldEstimate?.effectiveKw ?? null}
                  orientationLossPercent={yieldEstimate?.orientationLossPercent ?? null}
                  yieldTooltip={yieldTooltip}
                />

                <div className="w-full flex flex-col gap-4 min-w-0">
                  <RoofLayoutPreviewToolbar
                    canToggle2d3d={canToggle2d3dPreview}
                    canChoose3dForProposal={canChoose3dForProposal}
                    roofViewTab={roofViewTab}
                    onSelect2d={() => {
                      setRoofViewTab('2d');
                      setProposalImageSource('2d');
                    }}
                    onSelect3d={() => {
                      if (!canChoose3dForProposal) return;
                      setRoofViewTab('3d');
                      setProposalImageSource('3d');
                    }}
                    layoutMode={layoutMode}
                    canUndo={polygonHistory.canUndo}
                    canRedo={polygonHistory.canRedo}
                    onUndo={handleUndoPolygon}
                    onRedo={handleRedoPolygon}
                  />

                  {/* md–lg: export under preview. xl+ uses right sidebar instead. */}
                  <div className="hidden md:block xl:hidden max-w-xs">
                    <RoofLayoutExportActions
                      variant="desktop"
                      stacked
                      savingToProposal={savingToProposal}
                      exportingSitePlan={exportingSitePlan}
                      isSavedForProject={isLayoutSyncedToServer}
                      onExportSitePlan={() => void handleExportSitePlanPdf()}
                      onSaveForProposal={() => void handleSaveForProposal()}
                    />
                  </div>

                <div
                  className={`relative w-full max-w-full rounded-xl border border-gray-200 flex flex-col min-h-0 overflow-hidden ${
                    roofViewTab === '3d'
                      ? 'roof-layout-preview-3d bg-slate-200'
                      : 'roof-layout-preview-2d bg-white'
                  }`}
                >
                  {roofViewTab === '2d' && layoutMode === 'editing' && <RoofLayoutMapChrome />}
                  {roofViewTab === '3d' && has3DRoofData && polygon && imageSize ? (
                    <RoofLayout3DPreviewShell
                      narrow3dLive={narrow3dLive}
                      layoutScrollRef={layoutScrollRef}
                      layout3dCanvasMeasureRef={layout3dCanvasMeasureRef}
                      setSolar3dControlsHost={setSolar3dControlsHost}
                      solar3dControlsHost={solar3dControlsHost}
                      layout3dBaseW={layout3dBaseW}
                      layout3dBaseH={layout3dBaseH}
                      zoom3d={zoom3d}
                      solar3dRef={solar3dRef}
                      solar3dOrbitRef={solar3dOrbitRef}
                      solar3dPersistentLayoutKeyRef={solar3dPersistentLayoutKeyRef}
                      polygon={polygon}
                      allPanelsFlat={allPanelsFlat}
                      imageSize={imageSize}
                      bgImageUrl={bgImageUrl}
                      panelCount={result?.panel_count}
                      last3dPngDataUrl={last3dPngDataUrl}
                      onExportPNG={handle3dExportPng}
                      portraitModuleSizeM={{
                        widthM: resolvedModule.portraitWidthM,
                        heightM: resolvedModule.portraitHeightM,
                      }}
                    />
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
                        <div
                          className="relative flex-shrink-0 bg-white"
                        style={{
                          width: imageSize.width * zoom + 2 * layoutScrollBufferPx,
                          height: imageSize.height * zoom + 2 * layoutScrollBufferPx,
                          minWidth: imageSize.width * zoom + 2 * layoutScrollBufferPx,
                          minHeight: imageSize.height * zoom + 2 * layoutScrollBufferPx,
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
                            top: layoutScrollBufferPx,
                            left: layoutScrollBufferPx,
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
                          <RoofLayoutKonvaStage
                            imageSize={imageSize}
                            bgImage={bgImage}
                            satelliteOpacity={satelliteOpacity}
                            satelliteContrast={satelliteContrast}
                            layoutMode={layoutMode}
                            facets={facets}
                            activeFacetId={activeFacetId}
                            polygon={polygon}
                            panels={panels}
                            keepouts={keepouts}
                            mapEditTool={mapEditTool}
                            isDragging={isDragging}
                            hoveredEdge={hoveredEdge}
                            canEditRoofPolygon={canEditRoofPolygon}
                            polygonStrokeWidth={polygonStrokeWidth}
                            controlPointRadius={controlPointRadius}
                            controlPointHitStrokeWidth={controlPointHitStrokeWidth}
                            edgeSetbackM={edgeSetbackM}
                            refs={{
                              stageRef,
                              lineRef,
                              handlesLayerRef,
                              polygonOutlineLayerRef,
                              polygonDragLayerRef,
                              keepoutLayerRef,
                              polygonMoveStartRef,
                              polygonDragRef,
                              polygonBaseRef,
                              isDraggingRef,
                            }}
                            onApplyPolygon={applyPolygon}
                            onSetKeepouts={setKeepouts}
                            onSetHoveredEdge={setHoveredEdge}
                            onSetIsDragging={setIsDragging}
                          />
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
                    <RoofLayoutMobileMapTools
                      mapEditTool={mapEditTool}
                      layoutMode={layoutMode}
                      zoom={zoom}
                      setZoom={setZoom}
                      hasPolygon={!!polygon?.length}
                      onSetMapTool={setMapTool}
                      onCenterMap={centerMapOnActiveRoof}
                    />
                  )}

                  <div className="w-full flex flex-col gap-2 xl:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileControlsOpen((o) => !o)}
                      className="xl:hidden flex items-center justify-between w-full min-h-[48px] px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 touch-manipulation"
                      aria-expanded={mobileControlsOpen}
                      aria-controls={ROOF_LAYOUT_MOBILE_ADJUST_PANEL_ID}
                    >
                      <span>
                        {isMobileView && roofViewTab === '2d'
                          ? 'Layout tools (panels, density, keepouts)'
                          : 'Layout tools (zoom, density, keepouts)'}
                      </span>
                      <span className="text-gray-400" aria-hidden>
                        {mobileControlsOpen ? '▲' : '▼'}
                      </span>
                    </button>

                    <div
                      id={ROOF_LAYOUT_MOBILE_ADJUST_PANEL_ID}
                      role="region"
                      aria-label="Layout tools"
                      className={`flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 xl:hidden ${
                        !mobileControlsOpen ? 'hidden' : ''
                      } ${isMobileView ? 'scroll-mt-4' : ''}`}
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
                        edgeSetbackM={edgeSetbackM}
                        setEdgeSetbackM={setEdgeSetbackM}
                        panelOrientation={panelOrientation}
                        setPanelOrientation={setPanelOrientation}
                        satelliteOpacity={satelliteOpacity}
                        setSatelliteOpacity={setSatelliteOpacity}
                        satelliteContrast={satelliteContrast}
                        setSatelliteContrast={setSatelliteContrast}
                        hasPolygon={!!polygon}
                        onSnapToGrid={handleSnapOutlineToGrid}
                        keepouts={keepouts}
                        onAddRectKeepout={addRectKeepout}
                        onAddCircleKeepout={addCircleKeepout}
                        onRemoveKeepout={(id) => setKeepouts((prev) => prev.filter((k) => k.id !== id))}
                        onClearKeepouts={() => setKeepouts([])}
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
                    edgeSetbackM={edgeSetbackM}
                    setEdgeSetbackM={setEdgeSetbackM}
                    panelOrientation={panelOrientation}
                    setPanelOrientation={setPanelOrientation}
                    satelliteOpacity={satelliteOpacity}
                    setSatelliteOpacity={setSatelliteOpacity}
                    satelliteContrast={satelliteContrast}
                    setSatelliteContrast={setSatelliteContrast}
                    hasPolygon={!!polygon}
                    onSnapToGrid={handleSnapOutlineToGrid}
                    keepouts={keepouts}
                    onAddRectKeepout={addRectKeepout}
                    onAddCircleKeepout={addCircleKeepout}
                    onRemoveKeepout={(id) => setKeepouts((prev) => prev.filter((k) => k.id !== id))}
                    onClearKeepouts={() => setKeepouts([])}
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
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Proposal export
                  </h2>
                  <RoofLayoutExportActions
                    variant="desktop"
                    stacked
                    savingToProposal={savingToProposal}
                    exportingSitePlan={exportingSitePlan}
                    isSavedForProject={isLayoutSyncedToServer}
                    onExportSitePlan={() => void handleExportSitePlanPdf()}
                    onSaveForProposal={() => void handleSaveForProposal()}
                  />
                </div>
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
                  edgeSetbackM={edgeSetbackM}
                  setEdgeSetbackM={setEdgeSetbackM}
                  panelOrientation={panelOrientation}
                  setPanelOrientation={setPanelOrientation}
                  satelliteOpacity={satelliteOpacity}
                  setSatelliteOpacity={setSatelliteOpacity}
                  satelliteContrast={satelliteContrast}
                  setSatelliteContrast={setSatelliteContrast}
                  hasPolygon={!!polygon}
                  onSnapToGrid={handleSnapOutlineToGrid}
                  keepouts={keepouts}
                  onAddRectKeepout={addRectKeepout}
                  onAddCircleKeepout={addCircleKeepout}
                  onRemoveKeepout={(id) => setKeepouts((prev) => prev.filter((k) => k.id !== id))}
                  onClearKeepouts={() => setKeepouts([])}
                />
              </aside>
            </div>

            {isMobileView && (
              <RoofLayoutExportActions
                variant="mobile"
                savingToProposal={savingToProposal}
                exportingSitePlan={exportingSitePlan}
                isSavedForProject={isLayoutSyncedToServer}
                proposalImageSource={proposalImageSource}
                canChoose3dForProposal={canChoose3dForProposal}
                onExportSitePlan={() => void handleExportSitePlanPdf()}
                onSaveForProposal={() => void handleSaveForProposal()}
              />
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

