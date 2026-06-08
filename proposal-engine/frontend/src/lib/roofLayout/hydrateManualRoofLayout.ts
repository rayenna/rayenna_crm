import { parseRoofLayoutGeometry, type AiRoofLayoutResponse } from '../api/roofLayout';
import { getApiBaseUrl } from '../api/core';
import type { RoofFacetState } from '../roofLayoutFacets';
import { ROOF_LAYOUT_METERS_PER_PIXEL } from '../roofLayoutConstants';
import {
  absolutizeLayoutImageUrl,
  cacheBustImageUrl,
  satelliteEditorUrlForProject,
} from './roofLayoutPageUtils';
import type { RoofLayoutKeepoutRect } from './roofLayoutTypes';

export type ManualLayoutApiResponse = {
  layout_image_url?: string;
  roof_area_m2?: number;
  usable_area_m2?: number;
  panel_count?: number;
  layout_image_3d_url?: string | null;
  prefer_3d_for_proposal?: boolean;
  savedAt?: string;
  source?: string;
  geometry?: unknown;
  roof_polygon_coordinates?: Array<{ x: number; y: number }>;
  panel_coordinates?: Array<{ x: number; y: number; width: number; height: number }>;
  satellite_image_url?: string | null;
};

export type HydratedEditingLayout = {
  mode: 'editing';
  result: AiRoofLayoutResponse;
  savedAt: string | null;
  proposalImageSource: '2d' | '3d';
  roofViewTab: '2d' | '3d';
  layout3dUrl: string | null;
  facets: RoofFacetState[];
  activeFacetId: string;
  keepouts: RoofLayoutKeepoutRect[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  bgImageUrl: string;
  satelliteEditorBaseUrl: string;
};

export type HydratedSavedLayout = {
  mode: 'saved';
  result: AiRoofLayoutResponse;
  savedAt: string | null;
  proposalImageSource: '2d' | '3d';
  roofViewTab: '2d' | '3d';
  layout3dUrl: string | null;
  bgImageUrl: string | null;
};

export type ParsedManualHydrate =
  | { kind: 'none' }
  | { kind: 'editing'; data: HydratedEditingLayout }
  | { kind: 'saved'; data: HydratedSavedLayout };

export function parseManualRoofLayoutHydrate(
  manual: ManualLayoutApiResponse,
  crmProjectId: string,
): ParsedManualHydrate {
  if (!manual?.layout_image_url || !String(manual.layout_image_url).trim()) {
    return { kind: 'none' };
  }

  const geom =
    parseRoofLayoutGeometry(manual.geometry) ??
    (manual.roof_polygon_coordinates && manual.roof_polygon_coordinates.length >= 3
      ? parseRoofLayoutGeometry({
          version: 1,
          imageWidth: 2048,
          imageHeight: 2048,
          metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
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
    source: (manual.source as AiRoofLayoutResponse['source']) ?? 'MANUAL',
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

  const savedAt = manual?.savedAt ? String(manual.savedAt) : null;
  const layout3dUrl = absolutizeLayoutImageUrl(manual.layout_image_3d_url);
  const proposalImageSource = manual.prefer_3d_for_proposal === true ? '3d' : '2d';
  const roofViewTab =
    layout3dUrl && manual.prefer_3d_for_proposal === true ? ('3d' as const) : ('2d' as const);

  if (geom) {
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
    const satFromSaved =
      manual.satellite_image_url && String(manual.satellite_image_url).trim()
        ? absolutizeLayoutImageUrl(String(manual.satellite_image_url))
        : null;
    const satUrl = cacheBustImageUrl(
      satFromSaved ?? absolutizeLayoutImageUrl(satelliteEditorUrlForProject(String(crmProjectId))),
    );
    if (!satUrl) return { kind: 'none' };

    return {
      kind: 'editing',
      data: {
        mode: 'editing',
        result: next,
        savedAt,
        proposalImageSource,
        roofViewTab,
        layout3dUrl,
        facets: loadedFacets,
        activeFacetId: loadedFacets[0]!.id,
        keepouts: geom.keepouts.map((k) => ({
          id: k.id,
          x: k.x,
          y: k.y,
          w: k.width,
          h: k.height,
        })),
        panelOrientation: geom.panelOrientation,
        panelSpacingMultiplier: geom.panelSpacingMultiplier,
        bgImageUrl: satUrl,
        satelliteEditorBaseUrl: satFromSaved ? satUrl.split('?')[0] ?? satUrl : satUrl,
      },
    };
  }

  const rawUrl =
    next.layout_image_url && String(next.layout_image_url).trim() ? next.layout_image_url : null;
  const imageUrl = rawUrl
    ? rawUrl.startsWith('http')
      ? rawUrl
      : `${getApiBaseUrl() || ''}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
    : null;

  return {
    kind: 'saved',
    data: {
      mode: 'saved',
      result: next,
      savedAt,
      proposalImageSource,
      roofViewTab,
      layout3dUrl,
      bgImageUrl: imageUrl,
    },
  };
}
