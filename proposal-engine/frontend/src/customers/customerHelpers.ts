/**
 * Pure helpers for mapping CRM API data → ProjectOption / CustomerRecord,
 * plus role-based access constants.
 */
import { formatEmailForDisplay, deriveProposalStatusFromArtifacts } from '../lib/customerStore';
import type { CustomerRecord, CustomerMaster } from '../lib/customerStore';
import type { ProposalEngineProjectFromApi } from '../lib/apiClient';
import type { ProjectOption } from './types';

/** Customer Master Google Map coordinates (both required, finite, in range). */
export function hasValidMapCoordinates(
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  if (latitude == null || longitude == null) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // Treat exact 0,0 as unset (common data-entry mistake).
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function deriveCustomerName(
  c: ProposalEngineProjectFromApi['customer'] | null | undefined,
): string {
  if (!c) return 'Unnamed customer';
  if (c.customerName && c.customerName.trim()) return c.customerName.trim();
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const companyName = (c as any).companyName as string | undefined;
  if (companyName && companyName.trim()) return companyName.trim();
  return 'Unnamed customer';
}

export function deriveContactNumber(
  c: ProposalEngineProjectFromApi['customer'] | null | undefined,
): string {
  if (!c) return '';
  // Prefer structured contactNumbers JSON (used in CRM UI), fall back to phone.
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

export function mapApiProjectToProjectOption(p: ProposalEngineProjectFromApi): ProjectOption {
  const cust = p.customer ?? ({} as ProposalEngineProjectFromApi['customer']);
  return {
    id: p.id,
    projectStage: ((p.projectStatus ?? p.projectStage) ?? '').toString().toUpperCase(),
    peStatus: (p as any).peStatus ?? undefined,
    systemSizeKw: typeof p.systemCapacity === 'number' ? p.systemCapacity : undefined,
    customerName: deriveCustomerName(p.customer),
    city: (cust.city ?? '').trim(),
    contactPerson: (cust.contactPerson ?? '').trim(),
    phone: deriveContactNumber(p.customer),
    email: formatEmailForDisplay(cust.email ?? ''),
    siteAddress:
      (p.siteAddress ?? '').trim() ||
      [cust.addressLine1, cust.addressLine2, cust.city, cust.state, cust.pinCode]
        .filter(Boolean)
        .map((part) => String(part).trim())
        .join(', '),
    customerId: cust.id,
    customerNumber: (cust.customerId ?? '').trim() || undefined,
    projectNumber: typeof p.slNo === 'number' ? p.slNo : undefined,
    consumerNumber: (cust.consumerNumber ?? '').trim() || undefined,
    segment: (cust.customerType ?? p.type ?? '').trim() || undefined,
    salespersonName: (p.salesperson?.name ?? '').trim() || undefined,
    panelType: (p.panelType ?? '').trim() || undefined,
    orderValue: typeof p.projectCost === 'number' ? p.projectCost : undefined,
    confirmationDate: p.confirmationDate ?? undefined,
    createdAt: p.createdAt ?? undefined,
    hasMapCoordinates: hasValidMapCoordinates(cust.latitude, cust.longitude),
  };
}

export function buildMasterFromProject(project: ProjectOption): CustomerMaster {
  return {
    name: project.customerName,
    location: project.siteAddress || project.city,
    contactPerson: project.contactPerson,
    phone: project.phone,
    email: project.email,
    crmCustomerId: project.customerId,
    crmProjectId: project.id,
    systemSizeKw: project.systemSizeKw,
    customerNumber: project.customerNumber,
    projectNumber: project.projectNumber,
    consumerNumber: project.consumerNumber,
    segment: project.segment,
    salespersonName: project.salespersonName,
    projectStage: project.projectStage,
    panelType: project.panelType,
  };
}

/**
 * Empty local record when the detail API fails (e.g. server 500 / DB not migrated).
 * Dashboard still works because it never calls GET /projects/:id; Customers + CRM deep link do.
 */
export function buildShellCustomerRecordFromProject(project: ProjectOption): CustomerRecord {
  const now = new Date().toISOString();
  const next: CustomerRecord = {
    id: `crm_${project.id}`,
    createdAt: now,
    updatedAt: now,
    status: 'not-started',
    proposalIndex: 1,
    master: buildMasterFromProject(project),
    costing: null,
    bom: null,
    roi: null,
    roofLayout: null,
    proposal: null,
  };
  return {
    ...next,
    status: deriveProposalStatusFromArtifacts(next),
  };
}

/** When multiple Proposal Engine records share one CRM project, use the most recently updated (matches customersByCrmProjectId). */
export function getLatestLocalRecordForCrmProject(
  projectId: string,
  list: CustomerRecord[],
): CustomerRecord | null {
  let best: CustomerRecord | null = null;
  for (const c of list) {
    if (c?.master?.crmProjectId !== projectId) continue;
    if (
      !best ||
      new Date(c.updatedAt).getTime() >= new Date(best.updatedAt).getTime()
    ) {
      best = c;
    }
  }
  return best;
}

/** Operations, Management, Finance, Admin see all project proposals; Sales see only their own. */
export const ROLES_VIEW_ALL_PROJECTS = new Set(['OPERATIONS', 'MANAGEMENT', 'FINANCE', 'ADMIN']);
/** Sales (assigned) and Admin can create/edit proposals; only Admin can remove PE data from the server. */
export const ROLES_CAN_EDIT = new Set(['SALES', 'ADMIN']);
/** Operations, Management, Finance: view proposals only (no edit, no share, no generate). */
export const ROLES_VIEW_ONLY_PE = new Set(['OPERATIONS', 'MANAGEMENT', 'FINANCE']);

export function canViewAllProjects(role: string | null): boolean {
  return role != null && ROLES_VIEW_ALL_PROJECTS.has(role.toUpperCase());
}

export function canCreateOrEditProposals(role: string | null): boolean {
  return role != null && ROLES_CAN_EDIT.has(role.toUpperCase());
}
