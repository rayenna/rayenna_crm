import {
  fetchCrmProjectForAiLayout,
  fetchManualRoofLayout,
  generateAiRoofLayout,
  type AiRoofLayoutResponse,
} from '../lib/apiClient';
import type { CustomerRecord } from '../lib/customerStore';

export type RoofLayoutAvailability =
  | 'idle'
  | 'checking'
  | 'no_crm_project'
  | 'not_saved_yet'
  | 'ready';

export type RoofLayoutFetchStatus = RoofLayoutAvailability | 'missing_crm_data' | 'failed';

function isNoManualLayoutError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return lower.includes('404') || lower.includes('no manual layout');
}

function manualToLayoutResponse(manual: Record<string, unknown>): AiRoofLayoutResponse | null {
  if (typeof manual.layout_image_url !== 'string' || !String(manual.layout_image_url).trim()) {
    return null;
  }
  const next: AiRoofLayoutResponse = {
    roof_area_m2: Number.isFinite(Number(manual.roof_area_m2)) ? Number(manual.roof_area_m2) : 0,
    usable_area_m2: Number.isFinite(Number(manual.usable_area_m2)) ? Number(manual.usable_area_m2) : 0,
    panel_count: Number.isFinite(Number(manual.panel_count)) ? Number(manual.panel_count) : 0,
    layout_image_url: String(manual.layout_image_url),
    source: (manual.source as AiRoofLayoutResponse['source']) ?? 'MANUAL',
  };
  if (manual.layout_image_3d_url != null && String(manual.layout_image_3d_url).trim()) {
    next.layout_image_3d_url = String(manual.layout_image_3d_url);
  }
  if (typeof manual.prefer_3d_for_proposal === 'boolean') {
    next.prefer_3d_for_proposal = manual.prefer_3d_for_proposal;
  }
  return next;
}

/** Check whether this CRM project has a saved roof layout (no auto-generate). */
export async function probeRoofLayoutAvailability(
  activeCustomer: CustomerRecord | null,
): Promise<{ availability: RoofLayoutAvailability; layout: AiRoofLayoutResponse | null }> {
  if (!activeCustomer?.master?.crmProjectId) {
    return { availability: 'no_crm_project', layout: null };
  }

  try {
    const manual = await fetchManualRoofLayout(activeCustomer.master.crmProjectId);
    const layout = manualToLayoutResponse(manual as Record<string, unknown>);
    if (layout) return { availability: 'ready', layout };
    return { availability: 'not_saved_yet', layout: null };
  } catch (err) {
    if (isNoManualLayoutError(err)) {
      return { availability: 'not_saved_yet', layout: null };
    }
    return { availability: 'not_saved_yet', layout: null };
  }
}

async function fetchSavedManualLayout(
  crmProjectId: string,
): Promise<AiRoofLayoutResponse | null> {
  try {
    const manual = await fetchManualRoofLayout(crmProjectId);
    return manualToLayoutResponse(manual as Record<string, unknown>);
  } catch (err) {
    if (isNoManualLayoutError(err)) return null;
    throw err;
  }
}

/**
 * Load roof layout for proposal embed.
 * - `allowAutoGenerate: false` (existing proposal toggle): saved layout only.
 * - `allowAutoGenerate: true` (first-time generate): saved layout, else AI satellite draft.
 */
export async function fetchRoofLayoutForCrmProject(
  activeCustomer: CustomerRecord,
  options?: { allowAutoGenerate?: boolean },
): Promise<{ layout: AiRoofLayoutResponse | null; error: string | null; status: RoofLayoutFetchStatus }> {
  const allowAutoGenerate = options?.allowAutoGenerate !== false;
  const crmProjectId = activeCustomer.master?.crmProjectId;
  if (!crmProjectId) {
    return {
      layout: null,
      error: 'This customer is not linked to a CRM project. Link a project before adding a roof layout.',
      status: 'no_crm_project',
    };
  }

  try {
    const fromManual = await fetchSavedManualLayout(crmProjectId);
    if (fromManual) return { layout: fromManual, error: null, status: 'ready' };
  } catch {
    return {
      layout: null,
      error: 'Could not check roof layout status. Try again or open AI Roof Layout.',
      status: 'failed',
    };
  }

  if (!allowAutoGenerate) {
    return {
      layout: null,
      error: null,
      status: 'not_saved_yet',
    };
  }

  try {
    const crmProject = await fetchCrmProjectForAiLayout(crmProjectId);

    const latitude: number | null =
      crmProject.customer && (crmProject.customer as { latitude?: number | null }).latitude != null
        ? Number((crmProject.customer as { latitude?: number | null }).latitude)
        : activeCustomer.master.latitude ?? null;
    const longitude: number | null =
      crmProject.customer && (crmProject.customer as { longitude?: number | null }).longitude != null
        ? Number((crmProject.customer as { longitude?: number | null }).longitude)
        : activeCustomer.master.longitude ?? null;
    const systemSizeKw: number | null =
      crmProject.systemCapacity != null
        ? Number(crmProject.systemCapacity)
        : activeCustomer.master.systemSizeKw ?? null;
    const panelWattage: number | null =
      crmProject.panelCapacityW != null
        ? Number(crmProject.panelCapacityW)
        : activeCustomer.master.panelWattage ?? null;

    if (
      latitude == null ||
      Number.isNaN(latitude) ||
      longitude == null ||
      Number.isNaN(longitude) ||
      systemSizeKw == null ||
      Number.isNaN(systemSizeKw) ||
      panelWattage == null ||
      Number.isNaN(panelWattage)
    ) {
      return {
        layout: null,
        error:
          'CRM project is missing location or system size. Open AI Roof Layout, save a layout, or complete CRM project details.',
        status: 'missing_crm_data',
      };
    }

    const data = await generateAiRoofLayout({
      projectId: crmProject.id,
      latitude,
      longitude,
      systemSizeKw,
      panelWattage,
    });

    const roof = data?.roof_area_m2;
    const usable = data?.usable_area_m2;
    const panels = data?.panel_count;
    if (!Number.isFinite(roof) || !Number.isFinite(usable) || !Number.isFinite(panels)) {
      return { layout: null, error: 'AI roof layout response was incomplete.', status: 'failed' };
    }

    return {
      layout: {
        roof_area_m2: Number(roof),
        usable_area_m2: Number(usable),
        panel_count: Number(panels),
        layout_image_url:
          data?.layout_image_url && String(data.layout_image_url).trim() ? data.layout_image_url : '',
        source: 'AI',
      },
      error: null,
      status: 'ready',
    };
  } catch {
    return {
      layout: null,
      error:
        'Roof layout could not be loaded. Open AI Roof Layout, adjust the map, click Save to Proposal, then try again.',
      status: 'failed',
    };
  }
}

/** User-facing copy for the proposal toggle when layout is not ready. */
export function roofLayoutAvailabilityMessage(
  availability: RoofLayoutAvailability,
  opts?: { forToggleAttempt?: boolean },
): string | null {
  switch (availability) {
    case 'no_crm_project':
      return 'This PE customer is not linked to a CRM project, so AI Roof Layout cannot be stored yet.';
    case 'not_saved_yet':
      return opts?.forToggleAttempt
        ? 'AI Roof Layout has not been created for this project yet. Open AI Roof Layout, generate or adjust the map, then click Save to Proposal before including it here.'
        : 'AI Roof Layout has not been created for this project yet. Open AI Roof Layout and click Save to Proposal when ready.';
    case 'ready':
      return 'A saved roof layout is available for this CRM project.';
    default:
      return null;
  }
}
