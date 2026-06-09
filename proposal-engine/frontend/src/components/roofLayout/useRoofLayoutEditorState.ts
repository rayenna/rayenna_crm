import { useMemo } from 'react';
import type { AiRoofLayoutResponse } from '../../lib/apiClient';
import type { CustomerRecord } from '../../lib/customerStore';
import { ROOF_LAYOUT_METERS_PER_PIXEL } from '../../lib/roofLayoutConstants';
import {
  estimateRoofLayoutYield,
  roofLayoutYieldTooltip,
  yieldFacetsFromEditorState,
} from '../../lib/roofLayout/estimateRoofLayoutYield';
import { fingerprintRoofLayoutEditorState } from '../../lib/roofLayout/roofLayoutGeometryFingerprint';
import type { RoofLayoutKeepout } from '../../lib/roofLayout/roofLayoutTypes';
import {
  flattenFacetPanels,
  totalFacetPanelCount,
  type RoofFacetState,
} from '../../lib/roofLayoutFacets';
import type { ResolvedModuleDimensions } from '../../lib/roofLayout/resolveModuleDimensions';
import { deriveRoofLayoutWorkflowStep } from './roofLayoutWorkflow';

type Params = {
  activeProject: CustomerRecord | null;
  result: AiRoofLayoutResponse | null;
  facets: RoofFacetState[];
  keepouts: RoofLayoutKeepout[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  edgeSetbackM: number;
  effectiveWattage: number;
  resolvedModule: ResolvedModuleDimensions;
  orientedModuleSizeM: { widthM: number; heightM: number };
  imageSize: { width: number; height: number } | null;
  layoutMode: 'saved' | 'editing';
  isPolygonSummaryReady: boolean;
  lastSavedProjectId: string | null;
  savedLayoutFingerprint: string | null;
  mapEditTool: 'scroll' | 'roof' | 'keepout';
};

export function useRoofLayoutEditorState(params: Params) {
  const {
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
  } = params;

  const panelPackBase = useMemo(
    () => ({
      panelOrientation,
      panelSpacingMultiplier,
      panelWatts: effectiveWattage,
      keepoutRects: keepouts,
      edgeSetbackM,
      metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
      moduleSizeM: orientedModuleSizeM,
    }),
    [
      panelOrientation,
      panelSpacingMultiplier,
      effectiveWattage,
      keepouts,
      edgeSetbackM,
      orientedModuleSizeM,
    ],
  );

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

  const currentLayoutFingerprint = useMemo(
    () =>
      fingerprintRoofLayoutEditorState({
        facets,
        keepouts,
        panelOrientation,
        panelSpacingMultiplier,
        panelWatts: effectiveWattage,
        imageSize,
        metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
        edgeSetbackM,
        resolvedModule,
      }),
    [
      facets,
      keepouts,
      panelOrientation,
      panelSpacingMultiplier,
      effectiveWattage,
      imageSize,
      edgeSetbackM,
      resolvedModule,
    ],
  );

  const hasUnsavedLayoutChanges =
    isSavedForThisProject &&
    savedLayoutFingerprint != null &&
    currentLayoutFingerprint != null &&
    currentLayoutFingerprint !== savedLayoutFingerprint;

  const isLayoutSyncedToServer = isSavedForThisProject && !hasUnsavedLayoutChanges;

  const workflowStep = deriveRoofLayoutWorkflowStep({
    hasActiveProject: !!activeProject,
    hasLayoutResult: !!result,
    layoutMode,
    hasPolygon: facets.some((f) => f.polygon != null && f.polygon.length >= 3),
    isSavedForProject: isSavedForThisProject,
    mapTool: mapEditTool,
  });

  const layoutStateLabel: 'draft' | 'saved' | 'saved-dirty' | 'idle' = !result
    ? 'idle'
    : hasUnsavedLayoutChanges
      ? 'saved-dirty'
      : isSavedForThisProject
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
      : (result?.panel_count ?? null);

  const displayedSystemKw =
    displayedPanelCount != null && Number.isFinite(displayedPanelCount)
      ? (displayedPanelCount * effectiveWattage) / 1000
      : null;

  const layoutFillPercent = (() => {
    if (!isPolygonSummaryReady || !result?.usable_area_m2 || result.usable_area_m2 <= 0) return null;
    const { widthM, heightM } = orientedModuleSizeM;
    const placed = allPanelsFlat.length * widthM * heightM;
    return (placed / result.usable_area_m2) * 100;
  })();

  const kwVsTarget =
    displayedSystemKw != null && targetSystemKw != null
      ? targetSystemKw - displayedSystemKw
      : null;

  const panelCountReady = layoutMode !== 'editing' || isPolygonSummaryReady;

  const yieldEstimate = useMemo(() => {
    if (!panelCountReady || displayedPanelCount == null || displayedPanelCount <= 0) return null;

    const fromEditor = yieldFacetsFromEditorState(facets);
    const withPanels = fromEditor.filter((f) => f.panelCount > 0);
    const facetInputs =
      withPanels.length > 0
        ? withPanels
        : [
            {
              azimuthDeg: facets[0]?.azimuthDeg ?? 180,
              panelCount: displayedPanelCount,
            },
          ];

    return estimateRoofLayoutYield({
      facets: facetInputs,
      moduleWatts: effectiveWattage,
    });
  }, [facets, effectiveWattage, displayedPanelCount, panelCountReady]);

  const yieldTooltip = yieldEstimate ? roofLayoutYieldTooltip(yieldEstimate) : null;

  return {
    panelPackBase,
    allPanelsFlat,
    has3DRoofData,
    isSavedForThisProject,
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
  };
}
