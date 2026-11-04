import type {
  BomArtifact,
  CostingArtifact,
  CustomerMaster,
  CustomerRecord,
  ProposalArtifact,
  ProposalCustomSectionBeforeBoq,
  RoiArtifact,
  RoofLayoutArtifact,
} from '../customerStore';
import { deriveProposalStatusFromArtifacts, formatEmailForDisplay } from '../customerStore';
import { apiFetch } from './core';
import type { ProposalEngineProjectFromApi } from './proposalEngine';

interface ApiCostingArtifact {
  sheetName: string;
  items?: unknown;
  itemCount?: number;
  showGst: boolean;
  marginPct: number;
  grandTotal: number;
  systemSizeKw: number;
  savedAt: string;
}

interface ApiBomArtifact {
  rows?: unknown;
  rowCount?: number;
  savedAt: string;
}

interface ApiRoiArtifact {
  result: unknown;
  savedAt: string;
}

interface ApiProposalArtifact {
  refNumber: string;
  generatedAt: string;
  bomComments?: Record<string, string> | null;
  editedHtml?: string | null;
  textOverrides?: Record<string, string | undefined> | null;
  customSectionsBeforeBoq?: unknown;
  proposalView?: unknown;
  summary?: string | null;
  includeRoofLayout?: boolean | null;
  roofLayout?: {
    roof_area_m2: number;
    usable_area_m2: number;
    panel_count: number;
    layout_image_url: string;
    layout_image_3d_url?: string;
    prefer_3d_for_proposal?: boolean;
    savedAt?: string;
  } | null;
  savedAt: string;
}

export interface ProposalEngineProjectDetailResponse {
  project: ProposalEngineProjectFromApi;
  light?: boolean;
  artifacts: {
    costing: ApiCostingArtifact | null;
    bom: ApiBomArtifact | null;
    roi: ApiRoiArtifact | null;
    proposal: ApiProposalArtifact | null;
    roofLayout?: ApiProposalArtifact['roofLayout'] | null;
  };
}

export async function fetchProjectWithArtifacts(
  projectId: string,
): Promise<ProposalEngineProjectDetailResponse> {
  return apiFetch<ProposalEngineProjectDetailResponse>(
    `/api/proposal-engine/projects/${projectId}`,
  );
}

export async function fetchProjectCostingSheet(
  projectId: string,
): Promise<ApiCostingArtifact | null> {
  return apiFetch<ApiCostingArtifact | null>(
    `/api/proposal-engine/projects/${projectId}/costing`,
  );
}

export async function fetchProjectBomSheet(
  projectId: string,
): Promise<ApiBomArtifact | null> {
  return apiFetch<ApiBomArtifact | null>(`/api/proposal-engine/projects/${projectId}/bom`);
}

export async function fetchProjectRoiResult(
  projectId: string,
): Promise<ApiRoiArtifact | null> {
  return apiFetch<ApiRoiArtifact | null>(`/api/proposal-engine/projects/${projectId}/roi`);
}

export async function fetchProjectProposalArtifact(
  projectId: string,
): Promise<ApiProposalArtifact | null> {
  return apiFetch<ApiProposalArtifact | null>(
    `/api/proposal-engine/projects/${projectId}/proposal`,
  );
}

export function mapApiArtifactsToRecord(artifacts: ProposalEngineProjectDetailResponse['artifacts']): {
  costing: CostingArtifact | null;
  bom: BomArtifact | null;
  roi: RoiArtifact | null;
  proposal: ProposalArtifact | null;
} {
  return {
    costing: artifacts.costing
      ? {
          sheetName: artifacts.costing.sheetName,
          savedAt: artifacts.costing.savedAt,
          items: Array.isArray(artifacts.costing.items)
            ? (artifacts.costing.items as CostingArtifact['items'])
            : [],
          itemCount:
            typeof artifacts.costing.itemCount === 'number'
              ? artifacts.costing.itemCount
              : Array.isArray(artifacts.costing.items)
                ? artifacts.costing.items.length
                : 0,
          showGst: artifacts.costing.showGst,
          marginPercent: artifacts.costing.marginPct,
          grandTotal: artifacts.costing.grandTotal,
          totalGst: 0,
          systemSizeKw: artifacts.costing.systemSizeKw ?? 0,
        }
      : null,
    bom: artifacts.bom
      ? {
          savedAt: artifacts.bom.savedAt,
          rows: Array.isArray(artifacts.bom.rows) ? (artifacts.bom.rows as BomArtifact['rows']) : [],
          rowCount:
            typeof artifacts.bom.rowCount === 'number'
              ? artifacts.bom.rowCount
              : Array.isArray(artifacts.bom.rows)
                ? artifacts.bom.rows.length
                : 0,
        }
      : null,
    roi: artifacts.roi
      ? {
          savedAt: artifacts.roi.savedAt,
          result: artifacts.roi.result as RoiArtifact['result'],
        }
      : null,
    proposal: artifacts.proposal
      ? {
          refNumber: artifacts.proposal.refNumber,
          generatedAt:
            typeof artifacts.proposal.generatedAt === 'string'
              ? artifacts.proposal.generatedAt
              : new Date(artifacts.proposal.generatedAt).toISOString(),
          summary: artifacts.proposal.summary ?? '',
          bomComments: artifacts.proposal.bomComments ?? undefined,
          editedHtml: artifacts.proposal.editedHtml ?? undefined,
          textOverrides: artifacts.proposal.textOverrides ?? undefined,
          customSectionsBeforeBoq: Array.isArray(artifacts.proposal.customSectionsBeforeBoq)
            ? (artifacts.proposal.customSectionsBeforeBoq as ProposalCustomSectionBeforeBoq[])
            : undefined,
          proposalView: artifacts.proposal.proposalView ?? undefined,
          includeRoofLayout: !!artifacts.proposal.includeRoofLayout,
          roofLayout: artifacts.proposal.roofLayout
            ? {
                roof_area_m2: artifacts.proposal.roofLayout.roof_area_m2,
                usable_area_m2: artifacts.proposal.roofLayout.usable_area_m2,
                panel_count: artifacts.proposal.roofLayout.panel_count,
                layout_image_url: artifacts.proposal.roofLayout.layout_image_url,
                layout_image_3d_url: artifacts.proposal.roofLayout.layout_image_3d_url,
                prefer_3d_for_proposal: artifacts.proposal.roofLayout.prefer_3d_for_proposal,
              }
            : null,
        }
      : null,
  };
}

function derivePeCustomerDisplayName(
  c: ProposalEngineProjectFromApi['customer'] | null | undefined,
): string {
  if (!c) return '';
  if (c.customerName && c.customerName.trim()) return c.customerName.trim();
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const companyName = (c as { companyName?: string }).companyName;
  if (companyName && companyName.trim()) return companyName.trim();
  return '';
}

function derivePeContactNumber(c: ProposalEngineProjectFromApi['customer'] | null | undefined): string {
  if (!c) return '';
  if (c.contactNumbers && c.contactNumbers.trim()) {
    try {
      const parsed = JSON.parse(c.contactNumbers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return String(parsed.join(', ')).trim();
      }
      return c.contactNumbers.trim();
    } catch {
      return c.contactNumbers.trim();
    }
  }
  return (c.phone ?? '').trim();
}

export function applyProposalEngineProjectDetail(
  existing: CustomerRecord,
  detail: ProposalEngineProjectDetailResponse,
): CustomerRecord {
  const p = detail.project as ProposalEngineProjectFromApi;
  const cust = p.customer ?? ({} as NonNullable<ProposalEngineProjectFromApi['customer']>);
  const projectStageRaw = p.projectStatus ?? p.projectStage;
  const projectStage =
    projectStageRaw != null && String(projectStageRaw).trim() !== ''
      ? String(projectStageRaw).trim().toUpperCase()
      : existing.master.projectStage;

  const displayName = derivePeCustomerDisplayName(p.customer);
  const siteAddress =
    (p.siteAddress ?? '').trim() ||
    [cust.addressLine1, cust.addressLine2, cust.city, cust.state, cust.pinCode]
      .filter(Boolean)
      .map((part) => String(part).trim())
      .join(', ');

  const master: CustomerMaster = {
    ...existing.master,
    name: displayName || existing.master.name,
    location: siteAddress || (cust.city ?? '').trim() || existing.master.location,
    contactPerson: (cust.contactPerson ?? '').trim() || existing.master.contactPerson,
    phone: derivePeContactNumber(p.customer) || existing.master.phone,
    email: formatEmailForDisplay(cust.email ?? '') || existing.master.email,
    crmCustomerId: cust.id || existing.master.crmCustomerId,
    crmProjectId: p.id || existing.master.crmProjectId,
    systemSizeKw: typeof p.systemCapacity === 'number' ? p.systemCapacity : existing.master.systemSizeKw,
    systemType:
      typeof p.systemType === 'string' && p.systemType.trim()
        ? p.systemType.trim()
        : p.systemType === null
          ? undefined
          : existing.master.systemType,
    customerNumber: (cust.customerId ?? '').trim() || existing.master.customerNumber,
    projectNumber: typeof p.slNo === 'number' ? p.slNo : existing.master.projectNumber,
    consumerNumber: (cust.consumerNumber ?? '').trim() || existing.master.consumerNumber,
    segment: ((cust.customerType ?? p.type) ?? '').trim() || existing.master.segment,
    salespersonName: (p.salesperson?.name ?? '').trim() || existing.master.salespersonName,
    projectStage: projectStage ?? existing.master.projectStage,
    panelType: (p.panelType ?? '').trim() || existing.master.panelType,
    panelBrand: (p.panelBrand ?? '').trim() || existing.master.panelBrand,
    latitude: typeof cust.latitude === 'number' ? cust.latitude : existing.master.latitude,
    longitude: typeof cust.longitude === 'number' ? cust.longitude : existing.master.longitude,
    panelWattage: typeof p.panelCapacityW === 'number' ? p.panelCapacityW : existing.master.panelWattage,
  };

  const fromApi = mapApiArtifactsToRecord(detail.artifacts);
  const roofSrc = detail.artifacts.roofLayout ?? detail.artifacts.proposal?.roofLayout ?? null;
  const roofLayout: RoofLayoutArtifact | null = roofSrc
    ? {
        savedAt: roofSrc.savedAt ?? existing.roofLayout?.savedAt ?? new Date().toISOString(),
        roof_area_m2: roofSrc.roof_area_m2,
        usable_area_m2: roofSrc.usable_area_m2,
        panel_count: roofSrc.panel_count,
        layout_image_url: roofSrc.layout_image_url,
        layout_image_3d_url: roofSrc.layout_image_3d_url,
        prefer_3d_for_proposal: roofSrc.prefer_3d_for_proposal,
      }
    : existing.roofLayout;
  const merged: CustomerRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
    master,
    costing: fromApi.costing ?? existing.costing,
    bom: fromApi.bom ?? existing.bom,
    roi: fromApi.roi ?? existing.roi,
    roofLayout,
    // Light GET /projects/:id omits proposal document fields — never wipe local/full edits.
    proposal: mergeProposalArtifactPreservingDocumentFields(existing.proposal, fromApi.proposal),
  };
  return {
    ...merged,
    status: deriveProposalStatusFromArtifacts(merged),
  };
}

function proposalApiLooksLight(fromApi: ProposalArtifact): boolean {
  return (
    fromApi.proposalView == null &&
    fromApi.editedHtml == null &&
    fromApi.textOverrides == null &&
    fromApi.customSectionsBeforeBoq == null &&
    fromApi.bomComments == null
  );
}

function mergeLightProposalMeta(
  existing: ProposalArtifact,
  fromApi: ProposalArtifact,
): ProposalArtifact {
  return {
    ...existing,
    refNumber: fromApi.refNumber || existing.refNumber,
    generatedAt: fromApi.generatedAt || existing.generatedAt,
    summary: fromApi.summary || existing.summary,
    includeRoofLayout: fromApi.includeRoofLayout,
    roofLayout: fromApi.roofLayout ?? existing.roofLayout ?? null,
    crmDocumentUrl: fromApi.crmDocumentUrl ?? existing.crmDocumentUrl,
    crmArtifactId: fromApi.crmArtifactId ?? existing.crmArtifactId,
  };
}

/**
 * Project detail is light (ref/summary only). Full GET /proposal has document blobs.
 * When the API omits document fields, keep whatever we already have locally so
 * Edit → Save → reopen / export does not lose textOverrides, BOQ notes, or custom sections.
 */
export function mergeProposalArtifactPreservingDocumentFields(
  existing: ProposalArtifact | null | undefined,
  fromApi: ProposalArtifact | null,
): ProposalArtifact | null {
  if (!fromApi) return existing ?? null;
  if (!existing) return fromApi;

  if (proposalApiLooksLight(fromApi)) {
    return mergeLightProposalMeta(existing, fromApi);
  }

  // Full server payload used by Dashboard merge / non-force hydrate.
  // Per-key: prefer non-empty local (may be mid-save); fill gaps from server.
  const mergedTextOverrides: Record<string, string | undefined> = {
    ...(fromApi.textOverrides ?? {}),
  };
  for (const [k, v] of Object.entries(existing.textOverrides ?? {})) {
    if (v != null && String(v).trim() !== '') mergedTextOverrides[k] = v;
  }
  const localBom = existing.bomComments;
  const apiBom = fromApi.bomComments;
  const bomComments =
    localBom && Object.keys(localBom).length > 0
      ? { ...(apiBom ?? {}), ...localBom }
      : apiBom ?? localBom;
  const localCustom = existing.customSectionsBeforeBoq;
  const apiCustom = fromApi.customSectionsBeforeBoq;
  const customSectionsBeforeBoq =
    localCustom && localCustom.length > 0 ? localCustom : apiCustom ?? localCustom;

  return {
    ...existing,
    ...fromApi,
    bomComments,
    editedHtml: existing.editedHtml?.trim()
      ? existing.editedHtml
      : fromApi.editedHtml ?? existing.editedHtml,
    textOverrides:
      Object.keys(mergedTextOverrides).length > 0 ? mergedTextOverrides : undefined,
    customSectionsBeforeBoq,
    proposalView: existing.proposalView ?? fromApi.proposalView,
    roofLayout: fromApi.roofLayout ?? existing.roofLayout ?? null,
  };
}

/**
 * Proposal page force-hydrate: server document fields win so Save is what you see
 * after reopen / other device. Light stubs still preserve local blobs.
 */
export function mergeProposalArtifactPreferringServerDocument(
  existing: ProposalArtifact | null | undefined,
  fromApi: ProposalArtifact | null,
): ProposalArtifact | null {
  if (!fromApi) return existing ?? null;
  if (!existing) return fromApi;
  if (proposalApiLooksLight(fromApi)) {
    return mergeLightProposalMeta(existing, fromApi);
  }
  return {
    ...existing,
    ...fromApi,
    bomComments: fromApi.bomComments ?? existing.bomComments,
    editedHtml: fromApi.editedHtml ?? existing.editedHtml,
    textOverrides: fromApi.textOverrides ?? existing.textOverrides,
    customSectionsBeforeBoq:
      fromApi.customSectionsBeforeBoq ?? existing.customSectionsBeforeBoq,
    proposalView: fromApi.proposalView ?? existing.proposalView,
    roofLayout: fromApi.roofLayout ?? existing.roofLayout ?? null,
  };
}
