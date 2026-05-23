import type { ParsedRoofLayoutGeometry } from '../roofLayoutGeometry';
import { apiFetch } from './core';

export interface AiRoofLayoutPolygonPoint {
  x: number;
  y: number;
}

export interface AiRoofLayoutPanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type {
  RoofLayoutGeometryV1,
  RoofLayoutGeometryV2,
  ParsedRoofLayoutGeometry,
} from '../roofLayoutGeometry';
export { parseRoofLayoutGeometry, buildRoofLayoutGeometry } from '../roofLayoutGeometry';

export interface AiRoofLayoutResponse {
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
  satellite_image_url?: string;
  resolved_latitude?: number;
  resolved_longitude?: number;
  layout_image_3d_url?: string;
  prefer_3d_for_proposal?: boolean;
  roof_polygon_coordinates?: AiRoofLayoutPolygonPoint[];
  panel_coordinates?: AiRoofLayoutPanelRect[];
  source?: 'AI' | 'MANUAL';
  savedAt?: string;
  projectId?: string;
  geometry?: ParsedRoofLayoutGeometry;
}

export async function generateAiRoofLayout(params: {
  projectId: string;
  latitude: number;
  longitude: number;
  systemSizeKw: number;
  panelWattage: number;
}): Promise<AiRoofLayoutResponse> {
  return apiFetch<AiRoofLayoutResponse>('/api/roof/ai-layout', {
    method: 'POST',
    body: JSON.stringify({
      projectId: params.projectId,
      latitude: params.latitude,
      longitude: params.longitude,
      systemSizeKw: params.systemSizeKw,
      panelWattage: params.panelWattage,
    }),
  });
}

export async function saveManualRoofLayoutImage(params: {
  projectId: string;
  dataUrl: string;
  roof_area_m2?: number;
  usable_area_m2?: number;
  panel_count?: number;
  geometry?: ParsedRoofLayoutGeometry;
}): Promise<{ layout_image_url: string; geometry?: ParsedRoofLayoutGeometry }> {
  return apiFetch<{ layout_image_url: string; geometry?: ParsedRoofLayoutGeometry }>(
    '/api/roof/save-layout-image',
    {
      method: 'POST',
      body: JSON.stringify({
        projectId: params.projectId,
        dataUrl: params.dataUrl,
        roof_area_m2: params.roof_area_m2,
        usable_area_m2: params.usable_area_m2,
        panel_count: params.panel_count,
        ...(params.geometry ? { geometry: params.geometry } : {}),
      }),
    },
  );
}

export async function saveRoofLayout3dImage(params: {
  projectId: string;
  dataUrl: string;
  setPreferForProposal?: boolean;
  roof_area_m2?: number;
  usable_area_m2?: number;
  panel_count?: number;
}): Promise<{ layout_image_3d_url: string; prefer_3d_for_proposal: boolean }> {
  return apiFetch<{ layout_image_3d_url: string; prefer_3d_for_proposal: boolean }>(
    '/api/roof/save-3d-layout-image',
    {
      method: 'POST',
      body: JSON.stringify({
        projectId: params.projectId,
        dataUrl: params.dataUrl,
        set_prefer_for_proposal: params.setPreferForProposal === true,
        roof_area_m2: params.roof_area_m2,
        usable_area_m2: params.usable_area_m2,
        panel_count: params.panel_count,
      }),
    },
  );
}

export async function deleteRoofLayout(projectId: string): Promise<{ ok: boolean; projectId: string }> {
  return apiFetch<{ ok: boolean; projectId: string }>(
    `/api/roof/layout/${encodeURIComponent(projectId)}`,
    { method: 'DELETE' },
  );
}

export async function fetchManualRoofLayout(projectId: string): Promise<{
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
  satellite_image_url?: string;
  layout_image_3d_url?: string;
  prefer_3d_for_proposal?: boolean;
  savedAt?: string;
  source?: 'AI' | 'MANUAL';
  roof_polygon_coordinates?: AiRoofLayoutPolygonPoint[];
  panel_coordinates?: AiRoofLayoutPanelRect[];
  geometry?: ParsedRoofLayoutGeometry;
}> {
  return apiFetch(`/api/roof/manual-layout/${encodeURIComponent(projectId)}`);
}

export async function setRoofLayoutEmbedPreference(
  projectId: string,
  prefer3d: boolean,
): Promise<{ ok: boolean; prefer_3d_for_proposal: boolean }> {
  return apiFetch('/api/roof/set-layout-embed-preference', {
    method: 'POST',
    body: JSON.stringify({ projectId, prefer_3d_for_proposal: prefer3d }),
  });
}

export interface CrmProjectForAiLayout {
  id: string;
  systemCapacity?: number | null;
  panelCapacityW?: number | null;
  customer: {
    id: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export async function fetchCrmProjectForAiLayout(projectId: string): Promise<CrmProjectForAiLayout> {
  return apiFetch<CrmProjectForAiLayout>(`/api/projects/${projectId}`);
}
