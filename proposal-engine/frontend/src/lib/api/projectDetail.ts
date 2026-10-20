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
    proposal: fromApi.proposal ?? existing.proposal,
  };
  return {
    ...merged,
    status: deriveProposalStatusFromArtifacts(merged),
  };
}
