/** Shared types and constants for the Customers / Projects list page. */

/** Server-backed PE artifact flags (GET /api/proposal-engine/projects). */
export interface PeProjectArtifacts {
  hasCosting: boolean;
  hasBom: boolean;
  hasRoi: boolean;
  hasProposal: boolean;
  hasRoofLayout: boolean;
}

export const EMPTY_PE_PROJECT_ARTIFACTS: PeProjectArtifacts = {
  hasCosting: false,
  hasBom: false,
  hasRoi: false,
  hasProposal: false,
  hasRoofLayout: false,
};

export interface ProjectOption {
  id: string;
  projectStage: string;
  peStatus?: 'not-started' | 'draft' | 'proposal-ready' | string;
  systemSizeKw?: number;
  customerName: string;
  city: string;
  contactPerson: string;
  phone: string;
  email: string;
  siteAddress: string;
  /** Internal CRM Customer ID (database primary key) */
  customerId: string;
  /** Human‑readable CRM Customer Number (e.g. "C000123") */
  customerNumber?: string;
  /** Human‑readable CRM Project Number (Project SL No, e.g. 120) */
  projectNumber?: number;
  consumerNumber?: string;
  segment?: string;
  salespersonName?: string;
  panelType?: string;
  orderValue?: number;
  confirmationDate?: string;
  createdAt?: string;
  /** True when Customer Master has valid Google Map lat/lng (AI Roof Layout ready). */
  hasMapCoordinates?: boolean;
  /** Authoritative artifact completion from CRM API (not browser localStorage). */
  peArtifacts: PeProjectArtifacts;
  /** PE selection or project update — shown on list cards. */
  listUpdatedAt?: string;
}

export const PROJECTS_PAGE_SIZE = 24;

export const CRM_STAGE_FILTER_OPTIONS: {
  value: string;
  label: string;
  summaryLabel?: string;
}[] = [
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'SITE_SURVEY', label: 'Site survey' },
  { value: 'UNDER_INSTALLATION', label: 'Under installation' },
  {
    value: 'COMPLETED',
    label: 'Completed + Subsidy Credited',
    summaryLabel: 'Completed',
  },
  { value: 'LOST', label: 'Lost' },
];

export const PROJECT_LIST_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'selectionUpdatedAt', label: 'Last updated (PE)' },
  { value: 'projectUpdatedAt', label: 'Project updated' },
  { value: 'createdAt', label: 'Project created' },
  { value: 'customerName', label: 'Customer name' },
  { value: 'systemCapacity', label: 'System size' },
  { value: 'projectCost', label: 'Order value' },
  { value: 'confirmationDate', label: 'Confirmation date' },
];
