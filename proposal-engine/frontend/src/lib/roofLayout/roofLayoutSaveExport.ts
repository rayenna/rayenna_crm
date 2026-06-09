import type { RefObject } from 'react';
import type { AiRoofLayoutResponse } from '../api/roofLayout';
import {
  saveManualRoofLayoutImage,
  saveRoofLayout3dImage,
  setRoofLayoutEmbedPreference,
} from '../api/roofLayout';
import type { CustomerMaster } from '../customerStore';
import { formatEmailForDisplay } from '../customerStore';
import type { Solar3DViewHandle } from '../../components/Solar3DView';
import { exportRoofLayoutSitePlanPdf } from '../exportRoofLayoutSitePlanPdf';
import type { RoofFacetState } from '../roofLayoutFacets';
import { buildSavedRoofLayoutGeometry, pickPrimaryCropPolygon } from './roofLayoutGeometrySave';
import {
  captureLayoutImage,
  computeProposalExportCrop,
  waitForKonvaStageReady,
} from './roofLayoutCapture';
import { absolutizeLayoutImageUrl } from './roofLayoutPageUtils';
import type { RoofLayoutCaptureRefs, RoofLayoutKeepout, RoofLayoutPanelRect, RoofLayoutPoint } from './roofLayoutTypes';
import type { ResolvedModuleDimensions } from './resolveModuleDimensions';

export type LayoutMetrics = {
  roof_area_m2?: number;
  usable_area_m2?: number;
  panel_count?: number;
};

export function metricsFromResult(result: AiRoofLayoutResponse | null): LayoutMetrics {
  const r = result?.roof_area_m2;
  const u = result?.usable_area_m2;
  const p = result?.panel_count;
  return {
    ...(Number.isFinite(Number(r)) && { roof_area_m2: Number(r) }),
    ...(Number.isFinite(Number(u)) && { usable_area_m2: Number(u) }),
    ...(Number.isFinite(Number(p)) && { panel_count: Number(p) }),
  };
}

export async function captureProposalLayoutJpeg(params: {
  captureRefs: RoofLayoutCaptureRefs;
  stageRef: RefObject<{ batchDraw?: () => void } | null>;
  facets: RoofFacetState[];
  activePolygon: RoofLayoutPoint[] | null;
  allPanelsFlat: RoofLayoutPanelRect[];
  imageSize: { width: number; height: number };
  /** Call before waiting for stage (use flushSync + setRoofViewTab('2d') when switching from 3D). */
  switchTo2dForCapture?: () => void;
  quality?: number;
}): Promise<{ dataUrl: string; cropWidthPx: number } | { error: string }> {
  if (params.switchTo2dForCapture) {
    params.switchTo2dForCapture();
    const ready = await waitForKonvaStageReady(params.stageRef);
    if (!ready) {
      return { error: 'Could not prepare the 2D view for capture. Open the 2D tab, then try again.' };
    }
  }

  const cropPoly = pickPrimaryCropPolygon(params.facets, params.activePolygon);
  const proposalCrop =
    cropPoly && params.imageSize
      ? computeProposalExportCrop(cropPoly, params.allPanelsFlat, params.imageSize)
      : undefined;

  const dataUrl = await captureLayoutImage(params.captureRefs, {
    format: 'jpeg',
    quality: params.quality ?? 0.86,
    pixelRatio: 2,
    crop: proposalCrop,
  });
  if (!dataUrl) {
    return { error: 'Could not capture the 2D layout. Open the 2D tab, then try again.' };
  }

  return {
    dataUrl,
    cropWidthPx: proposalCrop?.width ?? params.imageSize.width,
  };
}

export type SaveRoofLayoutForProposalParams = {
  crmProjectId: string;
  layoutMode: 'saved' | 'editing';
  captureRefs: RoofLayoutCaptureRefs;
  stageRef: RefObject<{ batchDraw?: () => void } | null>;
  solar3dRef: RefObject<Solar3DViewHandle | null>;
  result: AiRoofLayoutResponse | null;
  facets: RoofFacetState[];
  activePolygon: RoofLayoutPoint[] | null;
  allPanelsFlat: RoofLayoutPanelRect[];
  imageSize: { width: number; height: number };
  keepouts: RoofLayoutKeepout[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  effectiveWattage: number;
  resolvedModule: ResolvedModuleDimensions;
  edgeSetbackM?: number;
  metersPerPixel: number;
  roofViewTab: '2d' | '3d';
  proposalImageSource: '2d' | '3d';
  last3dPngDataUrl: string | null;
  switchTo2dForCapture?: () => void;
  on3dCaptured?: (dataUrl: string) => void;
};

export type SaveRoofLayoutForProposalResult =
  | {
      ok: true;
      layout_image_url: string;
      layout_image_3d_url?: string;
      prefer_3d_for_proposal: boolean;
      partialWarning?: string;
      metrics: LayoutMetrics;
      geometry?: ReturnType<typeof buildSavedRoofLayoutGeometry>;
    }
  | { ok: false; error: string };

export async function saveRoofLayoutForProposal(
  params: SaveRoofLayoutForProposalParams,
): Promise<SaveRoofLayoutForProposalResult> {
  let captured3dForSave: string | null = null;

  if (params.roofViewTab === '3d' && params.proposalImageSource === '3d') {
    try {
      captured3dForSave = (await params.solar3dRef.current?.captureCurrentViewPng()) ?? null;
      if (captured3dForSave) params.on3dCaptured?.(captured3dForSave);
    } catch {
      /* keep existing last3dPngDataUrl */
    }
  }

  const captured = await captureProposalLayoutJpeg({
    captureRefs: params.captureRefs,
    stageRef: params.stageRef,
    facets: params.facets,
    activePolygon: params.activePolygon,
    allPanelsFlat: params.allPanelsFlat,
    imageSize: params.imageSize,
    switchTo2dForCapture: params.switchTo2dForCapture,
    quality: 0.86,
  });
  if ('error' in captured) return { ok: false, error: captured.error };

  const metrics = metricsFromResult(params.result);
  const geometry = buildSavedRoofLayoutGeometry({
    imageSize: params.imageSize,
    metersPerPixel: params.metersPerPixel,
    facets: params.facets,
    keepouts: params.keepouts,
    panelOrientation: params.panelOrientation,
    panelSpacingMultiplier: params.panelSpacingMultiplier,
    panelWatts: params.effectiveWattage,
    edgeSetbackM: params.edgeSetbackM ?? 0,
    resolvedModule: params.resolvedModule,
  });

  if (params.layoutMode === 'editing' && !geometry) {
    return {
      ok: false,
      error:
        'Could not build roof geometry for sync. Draw the roof outline (at least three corners), then save again.',
    };
  }

  const saved2d = await saveManualRoofLayoutImage({
    projectId: params.crmProjectId,
    dataUrl: captured.dataUrl,
    ...metrics,
    ...(geometry ? { geometry } : {}),
  });
  if (!saved2d?.layout_image_url) {
    return { ok: false, error: 'Server did not return a 2D layout URL.' };
  }

  const src3d =
    captured3dForSave ||
    params.last3dPngDataUrl ||
    absolutizeLayoutImageUrl(params.result?.layout_image_3d_url) ||
    '';

  let next3dUrl: string | undefined;
  let nextPrefer3d = false;
  let partialWarning: string | undefined;

  if (src3d.startsWith('data:')) {
    const saved3d = await saveRoofLayout3dImage({
      projectId: params.crmProjectId,
      dataUrl: src3d,
      setPreferForProposal: params.proposalImageSource === '3d',
      ...metrics,
    });
    next3dUrl = saved3d.layout_image_3d_url;
    nextPrefer3d = saved3d.prefer_3d_for_proposal;
  } else if (src3d.startsWith('http')) {
    await setRoofLayoutEmbedPreference(String(params.crmProjectId), params.proposalImageSource === '3d');
    nextPrefer3d = params.proposalImageSource === '3d';
  } else if (params.proposalImageSource === '3d') {
    partialWarning =
      '2D layout was saved. Open 3D view, export a PNG, then save again to store the 3D image for proposals.';
  }

  return {
    ok: true,
    layout_image_url: saved2d.layout_image_url,
    ...(next3dUrl != null && { layout_image_3d_url: next3dUrl }),
    prefer_3d_for_proposal: nextPrefer3d,
    partialWarning,
    metrics,
    geometry,
  };
}

export type ExportSitePlanParams = {
  captureRefs: RoofLayoutCaptureRefs;
  stageRef: RefObject<{ batchDraw?: () => void } | null>;
  facets: RoofFacetState[];
  activePolygon: RoofLayoutPoint[] | null;
  allPanelsFlat: RoofLayoutPanelRect[];
  imageSize: { width: number; height: number };
  metersPerPixel: number;
  roofViewTab: '2d' | '3d';
  switchTo2dForCapture?: () => void;
  master: CustomerMaster | undefined;
  displayedPanelCount: number | null;
  displayedSystemKw: number | null;
  targetSystemKw: number | null;
  layoutMode: 'saved' | 'editing';
  isPolygonSummaryReady: boolean;
  result: AiRoofLayoutResponse | null;
  effectiveWattage: number;
};

export async function exportSitePlanPdfFromLayout(
  params: ExportSitePlanParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const captured = await captureProposalLayoutJpeg({
    captureRefs: params.captureRefs,
    stageRef: params.stageRef,
    facets: params.facets,
    activePolygon: params.activePolygon,
    allPanelsFlat: params.allPanelsFlat,
    imageSize: params.imageSize,
    switchTo2dForCapture: params.switchTo2dForCapture,
    quality: 0.9,
  });
  if ('error' in captured) return { ok: false, error: captured.error };

  const master = params.master;
  const facetSummary =
    params.facets.length > 1
      ? params.facets
          .filter((f) => f.polygon && f.polygon.length >= 3)
          .map((f) => ({
            label: f.label,
            azimuthDeg: f.azimuthDeg,
            panelCount: f.panels.length,
          }))
      : undefined;

  const opened = exportRoofLayoutSitePlanPdf({
    layoutImageDataUrl: captured.dataUrl,
    imageWidthPx: captured.cropWidthPx,
    metersPerPixel: params.metersPerPixel,
    customerName: master?.name?.trim() || 'Customer',
    location: master?.location,
    contactPerson: master?.contactPerson,
    phone: master?.phone,
    email: formatEmailForDisplay(master?.email),
    customerNumber: master?.customerNumber,
    projectNumber: master?.projectNumber,
    latitude: master?.latitude ?? null,
    longitude: master?.longitude ?? null,
    panelCount: params.displayedPanelCount,
    systemKw: params.displayedSystemKw,
    targetSystemKw: params.targetSystemKw,
    roofAreaM2:
      params.layoutMode === 'editing' && !params.isPolygonSummaryReady
        ? null
        : (params.result?.roof_area_m2 ?? null),
    usableAreaM2:
      params.layoutMode === 'editing' && !params.isPolygonSummaryReady
        ? null
        : (params.result?.usable_area_m2 ?? null),
    moduleWatts: params.effectiveWattage,
    facetCount: params.facets.length,
    facets: facetSummary,
  });

  if (!opened) {
    return { ok: false, error: 'Pop-up blocked. Allow pop-ups for this site, then export again.' };
  }
  return { ok: true };
}
