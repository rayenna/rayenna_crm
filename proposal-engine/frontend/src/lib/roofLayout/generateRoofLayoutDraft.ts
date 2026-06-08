import {
  generateAiRoofLayout,
  fetchCrmProjectForAiLayout,
  type AiRoofLayoutResponse,
} from '../api/roofLayout';
import { getApiBaseUrl } from '../api/core';
import type { CustomerMaster } from '../customerStore';
import { parseGoogleMapsLatLng } from '../parseGoogleMapsLink';
import { getKeralaMapGpsWarning } from '../mapGpsValidation';
import {
  absolutizeLayoutImageUrl,
  cacheBustImageUrl,
  satelliteEditorUrlForProject,
} from './roofLayoutPageUtils';

export type GenerateRoofLayoutInput = {
  crmProjectId: string;
  master: CustomerMaster;
  mapsLinkOverride: string;
  panelWOverride: string;
};

export type GenerateRoofLayoutSuccess = {
  ok: true;
  result: AiRoofLayoutResponse;
  latitude: number;
  longitude: number;
  bgImageUrl: string;
  satelliteEditorBaseUrl: string;
};

export type GenerateRoofLayoutFailure = { ok: false; error: string };

export type GenerateRoofLayoutOutcome = GenerateRoofLayoutSuccess | GenerateRoofLayoutFailure;

export async function runGenerateRoofLayoutDraft(
  input: GenerateRoofLayoutInput,
): Promise<GenerateRoofLayoutOutcome> {
  const { crmProjectId, master, mapsLinkOverride, panelWOverride } = input;

  try {
    const crmProject = await fetchCrmProjectForAiLayout(crmProjectId);

    let latitude: number | null =
      crmProject.customer && (crmProject.customer as { latitude?: number | null }).latitude != null
        ? Number((crmProject.customer as { latitude?: number | null }).latitude)
        : (master.latitude ?? null);
    let longitude: number | null =
      crmProject.customer && (crmProject.customer as { longitude?: number | null }).longitude != null
        ? Number((crmProject.customer as { longitude?: number | null }).longitude)
        : (master.longitude ?? null);
    let systemSizeKw: number | null =
      crmProject.systemCapacity != null
        ? Number(crmProject.systemCapacity)
        : (master.systemSizeKw ?? null);
    let panelWattage: number | null =
      crmProject.panelCapacityW != null
        ? Number(crmProject.panelCapacityW)
        : (master.panelWattage ?? null);

    if (mapsLinkOverride.trim() !== '') {
      const parsed = parseGoogleMapsLatLng(mapsLinkOverride);
      if (!parsed) {
        return {
          ok: false,
          error:
            'Could not read coordinates from that Google Maps link. Paste a full maps.google.com URL (with @lat,lng or !3d…!4d…), or enter coordinates as "12.97, 77.59". Short links (maps.app.goo.gl) must be opened in a browser and the full URL copied.',
        };
      }
      latitude = parsed.lat;
      longitude = parsed.lng;
    }

    if (panelWOverride.trim() !== '') {
      const v = Number(panelWOverride.trim());
      if (!Number.isNaN(v)) panelWattage = v;
    }

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
      return {
        ok: false,
        error: parts.length
          ? `Missing required details: please provide ${parts.join(' and ')}.`
          : 'Missing required details.',
      };
    }

    const keralaWarn = getKeralaMapGpsWarning(latitude as number, longitude as number);
    if (keralaWarn) {
      return { ok: false, error: keralaWarn };
    }

    const data = await generateAiRoofLayout({
      projectId: crmProject.id,
      latitude: latitude as number,
      longitude: longitude as number,
      systemSizeKw: systemSizeKw as number,
      panelWattage: panelWattage as number,
    });

    const roof = data?.roof_area_m2;
    const usable = data?.usable_area_m2;
    const panelCount = data?.panel_count;
    if (!Number.isFinite(roof) || !Number.isFinite(usable) || !Number.isFinite(panelCount)) {
      return {
        ok: false,
        error: 'The layout service returned incomplete data. Please try again or check the backend.',
      };
    }

    const nextResult: AiRoofLayoutResponse = {
      roof_area_m2: Number(roof),
      usable_area_m2: Number(usable),
      panel_count: Number(panelCount),
      layout_image_url:
        data?.layout_image_url && String(data.layout_image_url).trim() ? data.layout_image_url : '',
      ...(data?.roof_polygon_coordinates?.length
        ? { roof_polygon_coordinates: data.roof_polygon_coordinates }
        : {}),
    };

    const rawUrl =
      nextResult.layout_image_url && String(nextResult.layout_image_url).trim()
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
    if (!imageUrl) {
      return { ok: false, error: 'Could not resolve satellite image URL after generate.' };
    }

    return {
      ok: true,
      result: nextResult,
      latitude: latitude as number,
      longitude: longitude as number,
      bgImageUrl: imageUrl,
      satelliteEditorBaseUrl: imageUrl.split('?')[0] ?? imageUrl,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate AI layout';
    return { ok: false, error: msg };
  }
}
