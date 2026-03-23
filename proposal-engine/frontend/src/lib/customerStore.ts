/**
 * customerStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central data model for the Proposal Engine.
 *
 * Each CustomerRecord holds:
 *   - Customer master data  (name, location, contact, phone, email)
 *   - Costing Sheet snapshot
 *   - BOM snapshot
 *   - ROI result snapshot
 *   - Generated proposal snapshot
 *   - Metadata (createdAt, updatedAt, status)
 *
 * All data lives in localStorage under CUSTOMERS_KEY.
 * The "active customer" (the one currently being worked on) is stored
 * separately under ACTIVE_CUSTOMER_KEY so the four work pages know which
 * customer they belong to.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FUTURE RAYENNA CRM INTEGRATION PLAN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This module is intentionally designed to be a thin data layer that can be
 * swapped from localStorage to CRM API calls with minimal changes to the UI.
 *
 * 1. AUTHENTICATION
 *    Replace all localStorage reads/writes with JWT-authenticated API calls
 *    using the Rayenna CRM access token.  The token should be injected via
 *    a shared auth context (e.g. useAuth() hook from the CRM shell).
 *
 * 2. CUSTOMER MASTER AUTO-POPULATION
 *    CustomerMaster fields (name, location, contactPerson, phone, email,
 *    systemSizeKw, tariff, etc.) will be auto-populated from the CRM
 *    Customer Master record via:
 *      GET /api/crm/customers/:crmCustomerId
 *    The crmCustomerId is stored on CustomerRecord.master.crmCustomerId.
 *
 * 3. PROJECT SELECTION — REPLACES "NEW CUSTOMER"  ← KEY UX CHANGE
 *    The "+ New Customer" button on the Customers page will be replaced by a
 *    "Select Project" picker that lists only the CRM Projects assigned to the
 *    logged-in salesperson based on their access privileges.
 *
 *    API to fetch the salesperson's project list:
 *      GET /api/crm/projects?assignedTo=<userId>&status=active
 *    The picker should support search/filter by customer name or project name.
 *    On selection, the chosen CRM Project's data auto-populates CustomerMaster
 *    (see point 4 below) and sets crmProjectId on the record.
 *
 * 4. PROJECT LINKAGE  ← KEY INTEGRATION POINT
 *    In the CRM, proposals are linked to PROJECTS, not directly to customers.
 *    A customer can have multiple projects (e.g. Phase 1 rooftop, Phase 2 ground-mount).
 *    The mapping is:
 *
 *      Proposal Engine CustomerRecord  →  CRM Project record
 *      ─────────────────────────────────────────────────────
 *      CustomerRecord.id               →  crmProjectId (stored on master)
 *      CustomerRecord.master.name      →  Project.customer.name
 *      CustomerRecord.master.location  →  Project.siteAddress
 *      CustomerRecord.costing          →  Project.artifacts["costing-sheet"]
 *      CustomerRecord.bom              →  Project.artifacts["bom"]
 *      CustomerRecord.roi              →  Project.artifacts["roi"]
 *      CustomerRecord.proposal         →  Project.artifacts["proposal"]  ← primary link
 *
 *    When saving artifacts, the single-save call (saveAllArtifacts) should POST to:
 *      POST /api/crm/projects/:crmProjectId/artifacts
 *    with a payload containing all four artifact snapshots.
 *
 *    The generated Proposal document (PDF/DOCX) should be uploaded to:
 *      POST /api/crm/projects/:crmProjectId/documents
 *    and will then appear in the CRM Project → Documents / Artifacts tab.
 *
 * 5. PROJECT CAPACITY & SITE DATA AUTO-FILL
 *    When a CRM Project is selected, the following fields should be
 *    auto-populated into the Proposal Engine work pages:
 *      - System size (kW)        → ROI Calculator: systemSizeKw
 *      - Site address            → Proposal: location
 *      - Electricity tariff      → ROI Calculator: tariff (from Project.tariff)
 *      - Customer contact        → Proposal: contactPerson, phone, email
 *
 * 6. ACCESS PRIVILEGES
 *    The CRM JWT payload will include role/permission claims.
 *    The Proposal Engine should respect:
 *      - canCreateProposal  : show/hide "Generate Proposal" button
 *      - canEditCosting     : show/hide Save on Costing Sheet
 *      - canViewROI         : show/hide ROI Calculator page
 *    These can be checked via a shared usePermissions() hook from the CRM shell.
 *
 * 7. PROPOSAL DOCUMENT READINESS (Proposal Engine only)
 *    CustomerRecord.status reflects saved artifacts in this app — not CRM sales stages.
 *    Values (internal): not-started, draft, proposal-ready — same semantics as CRM labels:
 *    Not Yet Created, PE Draft, PE Ready. Project lifecycle / deal tracking is done in CRM only.
 *
 * 8. MIGRATION
 *    Existing localStorage data can be migrated to CRM on first login by
 *    reading CUSTOMERS_KEY and POSTing each record to the CRM API.
 *    After migration, clear localStorage and switch to API mode.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────
// Re-export types from costingConstants
// ─────────────────────────────────────────────

import type { Category, LineItem } from './costingConstants';
import { removeLocalStorageItem, setLocalStorageItem } from './safeLocalStorage';
export type { Category, LineItem };

export interface BomRow {
  itemName:        string;
  specification:   string;
  quantity:        string;
  brand:           string;
  isAutoGenerated: boolean;
}

export interface ROIInputs {
  systemSizeKw:      number;
  tariff:            number;
  generationFactor:  number;
  escalationPercent: number;
  projectCost:       number;
  /** Whether customer is eligible for govt subsidy (e.g. MNRE/State scheme) */
  subsidyEligible?:  boolean;
  /** Subsidy amount in ₹ (for proposal "Provision for Govt Subsidy"); ROI uses effectiveProjectCost when > 0 */
  subsidyAmount?:    number;
}

export interface YearlyRow {
  year:              number;
  generation:        number;
  tariffRate:        number;
  savings:           number;
  cumulativeSavings: number;
  paybackReached:    boolean;
}

export interface ROIResult {
  inputs:             ROIInputs;
  annualGeneration:   number;
  annualSavings:      number;
  paybackYears:       number;
  totalSavings25Years: number;
  roiPercent:         number;
  lcoe:               number;
  co2OffsetTons:      number;
  yearlyBreakdown:    YearlyRow[];
  /** Project cost minus subsidy; used for payback/ROI when subsidy applied */
  effectiveProjectCost?: number;
}

// ─────────────────────────────────────────────
// Customer master
// ─────────────────────────────────────────────

export interface CustomerMaster {
  /** Company / customer name */
  name:          string;
  /** Site / project location */
  location:      string;
  /** Primary contact person */
  contactPerson: string;
  phone:         string;
  email:         string;

  // ── Future CRM integration fields ──────────────────────────────────────────
  // These will be auto-populated from the Rayenna CRM Customer Master and
  // Project record when the integration is live.

  /** CRM Customer Master ID — links this record to a CRM customer */
  crmCustomerId?: string;

  /**
   * CRM Project ID — the primary link for CRM integration.
   * All four artifacts (Costing, BOM, ROI, Proposal) will be saved as
   * documents under this Project in the CRM.
   * A single customer can have multiple projects (e.g. different phases or sites).
   */
  crmProjectId?:  string;

  /**
   * Human‑readable CRM Customer Number, e.g. "C000123".
   * This is distinct from crmCustomerId (the internal database ID) and is
   * used in proposal reference numbers and headers.
   */
  customerNumber?: string;

  /**
   * Human‑readable CRM Project Number (Project SL No), e.g. 120.
   * Used in proposal reference numbers and headers.
   */
  projectNumber?:  number;

  /** System capacity in kW — auto-populated from CRM Project when available */
  systemSizeKw?:  number;

  /** Electricity tariff (₹/kWh) — auto-populated from CRM Project when available */
  tariff?:        number;

  /** DISCOM / utility consumer number for the project, when available. */
  consumerNumber?: string;

  /** Customer or project segment, e.g. Residential, Apartment, Commercial. */
  segment?:        string;

  /** Primary salesperson name for this project, for display in Proposal. */
  salespersonName?: string;

  /** Current CRM project stage, e.g. SURVEY, PROPOSAL, APPROVED, INSTALLATION, LIVE. */
  projectStage?:    string;

  /** Panel type from the CRM Project, e.g. DCR, Non-DCR, Mono PERC. */
  panelType?:       string;

  /** Latitude for site (e.g. for AI Roof Layout or maps). Filled from CRM customer when available. */
  latitude?:        number;

  /** Longitude for site. Filled from CRM customer when available. */
  longitude?:      number;

  /** Panel wattage in W (e.g. for AI Roof Layout). Filled from CRM project when available. */
  panelWattage?:   number;
}

/**
 * Format email for display: strip JSON array brackets and quotes.
 * Handles email stored as string, array of strings, or JSON-stringified array
 * (e.g. ["a@b.com"], ["c@d.com"] or '["a@b.com","c@d.com"]').
 */
export function formatEmailForDisplay(value: string | string[] | null | undefined): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((s) => String(s).trim()).join(', ');
  }
  const s = String(value).trim();
  if (!s) return '';
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((x) => String(x).trim()).join(', ');
      }
    } catch {
      // fall through
    }
  }
  return s;
}

// ─────────────────────────────────────────────
// Artifact snapshots
// ─────────────────────────────────────────────

export interface CostingArtifact {
  sheetName:     string;
  savedAt:       string;
  items:         LineItem[];
  showGst:       boolean;
  marginPercent: number;
  grandTotal:    number;
  totalGst:      number;  // actual GST on margin-inclusive prices (for Proposal display)
  systemSizeKw:  number;
}

export interface BomArtifact {
  savedAt:  string;
  rows:     BomRow[];
}

export interface RoiArtifact {
  savedAt:  string;
  result:   ROIResult;
}

/** Snapshot when the user saves from AI Roof Layout (server-backed image + metrics). */
export interface RoofLayoutArtifact {
  savedAt: string;
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
}

export interface ProposalArtifact {
  refNumber:   string;
  generatedAt: string;
  /** Plain-text summary stored for quick preview */
  summary:     string;
  /** Per-category notes typed in the Bill of Quantities section */
  bomComments?: Record<string, string>;
  /** Saved innerHTML of the proposal document body — captures inline edits */
  editedHtml?: string;
  /** Per-section text overrides extracted from the edited DOM — used for DOCX export */
  textOverrides?: Record<string, string | undefined>;

  /**
   * Full in-memory proposal view model (JSON snapshot) so the Proposal page can reopen
   * without clicking Generate again. Not synced to CRM in the current API payload.
   */
  proposalView?: unknown;

  /**
   * Roof layout inclusion state + cached layout metadata.
   * The actual image is stored server-side via /api/roof/save-layout-image.
   * We cache the latest resolved layout payload here so reopening the proposal
   * page can immediately show the section without forcing regeneration.
   */
  includeRoofLayout?: boolean;
  roofLayout?: {
    roof_area_m2: number;
    usable_area_m2: number;
    panel_count: number;
    layout_image_url: string;
  } | null;

  // ── Future CRM integration fields ──────────────────────────────────────────
  /**
   * URL of the uploaded proposal document in the CRM Project's Documents tab.
   * Set after POST /api/crm/projects/:crmProjectId/documents succeeds.
   * Will be null until CRM integration is live.
   */
  crmDocumentUrl?: string;

  /**
   * CRM artifact record ID returned after saving to the Project Artifacts endpoint.
   * POST /api/crm/projects/:crmProjectId/artifacts → returns { artifactId }
   */
  crmArtifactId?: string;
}

// ─────────────────────────────────────────────
// Customer record
// ─────────────────────────────────────────────

export type ProposalStatus = 'not-started' | 'draft' | 'proposal-ready';

/** Map legacy or API strings to the current three Proposal Engine readiness states. */
export function normalizeProposalStatus(raw: string | undefined | null): ProposalStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (
    s === 'not-started' ||
    s === 'notstarted' ||
    s === 'none' ||
    s === 'not-yet-created' ||
    s === 'notyetcreated'
  ) {
    return 'not-started';
  }
  if (s === 'draft' || s === 'pe-draft' || s === 'pedraft') return 'draft';
  if (
    s === 'proposal-ready' ||
    s === 'proposalready' ||
    s === 'pe-ready' ||
    s === 'peready'
  ) {
    return 'proposal-ready';
  }
  // Legacy PE statuses — sales tracking now lives in CRM only
  if (s === 'sent' || s === 'won') return 'proposal-ready';
  if (s === 'lost') return 'draft';
  return 'not-started';
}

/** Derive readiness from which core artifacts exist on the record. */
export function deriveProposalStatusFromArtifacts(r: {
  costing: unknown | null;
  bom: unknown | null;
  roi: unknown | null;
  proposal: unknown | null;
}): ProposalStatus {
  const hasAny =
    !!r.costing || !!r.bom || !!r.roi || !!r.proposal;
  const allFour =
    !!r.costing && !!r.bom && !!r.roi && !!r.proposal;
  if (allFour) return 'proposal-ready';
  if (hasAny) return 'draft';
  return 'not-started';
}

export interface CustomerRecord {
  id:        string;           // e.g. "cust_1717000000000"
  createdAt: string;           // ISO
  updatedAt: string;           // ISO
  status:    ProposalStatus;

  /**
   * Optional proposal index when multiple Proposal Engine records are linked
   * to the same CRM Project (crmProjectId). Used to label variants as
   * "Proposal #1", "Proposal #2", etc. on the Dashboard and Customers views.
   */
  proposalIndex?: number;

  master:   CustomerMaster;

  /** Artifacts — null until saved */
  costing:  CostingArtifact  | null;
  bom:      BomArtifact      | null;
  roi:      RoiArtifact      | null;
  /**
   * Roof layout saved from the AI Roof Layout page (or hydrated from the server).
   * Also see {@link getResolvedRoofLayout} — dashboard tiles fall back to `proposal.roofLayout`.
   */
  roofLayout: RoofLayoutArtifact | null;
  proposal: ProposalArtifact | null;
}

// ─────────────────────────────────────────────
// Storage keys — scoped by current user so each salesperson sees only their own data
// ─────────────────────────────────────────────

const PE_USER_ID_KEY = 'pe_user_id';
const PE_JWT_KEY = 'pe_jwt';

function getStorageSuffix(): string {
  try {
    if (typeof sessionStorage === 'undefined') return '';
    let uid = sessionStorage.getItem(PE_USER_ID_KEY);
    if (uid) return `_${uid}`;
    const token = sessionStorage.getItem(PE_JWT_KEY);
    if (!token) return '';
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { userId?: string; sub?: string };
    uid = payload.userId ?? payload.sub ?? null;
    if (uid) {
      sessionStorage.setItem(PE_USER_ID_KEY, uid);
      return `_${uid}`;
    }
    return '';
  } catch {
    return '';
  }
}

function getCustomersKey(): string {
  return `rayenna_customers_v1${getStorageSuffix()}`;
}

function getActiveCustomerKey(): string {
  return `rayenna_active_customer_v1${getStorageSuffix()}`;
}

function getHiddenProjectsKey(): string {
  return `rayenna_pe_hidden_projects_v1${getStorageSuffix()}`;
}

/** Project IDs the current user has chosen to hide from the "all projects" list (Admin / Ops / etc.). */
export function getHiddenProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(getHiddenProjectsKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHiddenProjectId(projectId: string): void {
  const ids = getHiddenProjectIds();
  if (ids.includes(projectId)) return;
  setLocalStorageItem(getHiddenProjectsKey(), JSON.stringify([...ids, projectId]));
}

export function removeHiddenProjectId(projectId: string): void {
  const ids = getHiddenProjectIds().filter((id) => id !== projectId);
  setLocalStorageItem(getHiddenProjectsKey(), JSON.stringify(ids));
}

export function clearHiddenProjectIds(): void {
  removeLocalStorageItem(getHiddenProjectsKey());
}

// ─────────────────────────────────────────────
// CRUD helpers
// ─────────────────────────────────────────────

export function loadCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(getCustomersKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomerRecord[];
    if (!Array.isArray(parsed)) return [];
    // Migrate older records before `roofLayout` existed on CustomerRecord
    return parsed.map((c) => ({
      ...c,
      roofLayout: c.roofLayout ?? null,
      status: normalizeProposalStatus((c as { status?: string }).status),
    }));
  } catch {
    return [];
  }
}

export function saveCustomers(customers: CustomerRecord[]): void {
  setLocalStorageItem(getCustomersKey(), JSON.stringify(customers));
}

// ─────────────────────────────────────────────
// Cache pruning: keep full artifacts only for active + recent N
// ─────────────────────────────────────────────

const MAX_FULL_ARTIFACT_RECORDS = 5;

function pruneCustomerArtifacts(activeId: string | null): void {
  const all = loadCustomers();
  if (all.length <= MAX_FULL_ARTIFACT_RECORDS + 1) return;

  const sorted = [...all].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const keepIds = new Set<string>();
  // Always keep the most recently updated N records at full fidelity
  sorted.slice(0, MAX_FULL_ARTIFACT_RECORDS).forEach((c) => keepIds.add(c.id));
  // And always keep the active customer (if any)
  if (activeId) keepIds.add(activeId);

  const pruned = all.map((c) => {
    if (keepIds.has(c.id)) return c;
    let next: CustomerRecord = { ...c };

    // Costing: drop heavy items array, keep summary fields
    if (next.costing) {
      next = {
        ...next,
        costing: {
          ...next.costing,
          items: [],
        },
      };
    }

    // BOM: drop rows, keep savedAt
    if (next.bom) {
      next = {
        ...next,
        bom: {
          ...next.bom,
          rows: [],
        },
      };
    }

    // Proposal: keep only lightweight fields; drop HTML, overrides, and heavy view snapshot
    if (next.proposal) {
      next = {
        ...next,
        proposal: {
          refNumber: next.proposal.refNumber,
          generatedAt: next.proposal.generatedAt,
          summary: next.proposal.summary,
          bomComments: undefined,
          editedHtml: undefined,
          textOverrides: undefined,
          proposalView: undefined,
          includeRoofLayout: next.proposal.includeRoofLayout,
          roofLayout: next.proposal.roofLayout ?? null,
          crmDocumentUrl: next.proposal.crmDocumentUrl,
          crmArtifactId: next.proposal.crmArtifactId,
        },
      };
    }

    return next;
  });

  saveCustomers(pruned);
}

export function getCustomer(id: string): CustomerRecord | null {
  return loadCustomers().find((c) => c.id === id) ?? null;
}

export function upsertCustomer(record: CustomerRecord): void {
  const all = loadCustomers();
  const idx = all.findIndex((c) => c.id === record.id);
  if (idx >= 0) {
    all[idx] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    all.push(record);
  }
  saveCustomers(all);
  pruneCustomerArtifacts(getActiveCustomerId());
}

export function deleteCustomer(id: string): void {
  saveCustomers(loadCustomers().filter((c) => c.id !== id));
  const activeId = getActiveCustomerId();
  if (activeId === id) {
    clearActiveCustomer();
    // When the active customer is deleted, clear all work-in-progress data so
    // Costing Sheet, BOM, ROI, and Proposal views reset to a blank state.
    getWipKeysList().forEach((key) => removeLocalStorageItem(key));
  }
}

export function createCustomer(master: CustomerMaster): CustomerRecord {
  const now = new Date().toISOString();
  const record: CustomerRecord = {
    id:        `cust_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    status:    'not-started',
    master,
    costing:    null,
    bom:        null,
    roi:        null,
    roofLayout: null,
    proposal:   null,
  };
  upsertCustomer(record);
  return record;
}

// ─────────────────────────────────────────────
// Active customer helpers
// ─────────────────────────────────────────────

export function getActiveCustomerId(): string | null {
  return localStorage.getItem(getActiveCustomerKey());
}

export function getActiveCustomer(): CustomerRecord | null {
  const id = getActiveCustomerId();
  return id ? getCustomer(id) : null;
}

export function setActiveCustomer(id: string): void {
  setLocalStorageItem(getActiveCustomerKey(), id);
}

export function clearActiveCustomer(): void {
  removeLocalStorageItem(getActiveCustomerKey());
}

// ─────────────────────────────────────────────
// Work-in-progress localStorage keys — scoped by user so WIP is per user
// ─────────────────────────────────────────────

const WIP_KEY_PREFIXES = {
  sheets:       'rayenna_costing_sheets_v1',
  bomCosting:   'rayenna_bom_from_costing_v1',
  bomOverrides: 'rayenna_bom_overrides_v1',
  roiResult:    'rayenna_roi_result_v1',
  roiAutofill:  'rayenna_roi_autofill_v1',
  bomComments:  'rayenna_bom_comments_v1',
  proposalHtml: 'rayenna_proposal_edited_html_v1',
} as const;

function getWipKeys(): Record<keyof typeof WIP_KEY_PREFIXES, string> {
  const suffix = getStorageSuffix();
  return {
    sheets:       WIP_KEY_PREFIXES.sheets + suffix,
    bomCosting:   WIP_KEY_PREFIXES.bomCosting + suffix,
    bomOverrides: WIP_KEY_PREFIXES.bomOverrides + suffix,
    roiResult:    WIP_KEY_PREFIXES.roiResult + suffix,
    roiAutofill:  WIP_KEY_PREFIXES.roiAutofill + suffix,
    bomComments:  WIP_KEY_PREFIXES.bomComments + suffix,
    proposalHtml: WIP_KEY_PREFIXES.proposalHtml + suffix,
  };
}

function getWipKeysList(): string[] {
  return Object.values(getWipKeys());
}

/** Per-user WIP localStorage keys. Use these in CostingSheet, BOMSheet, ROICalculator, ProposalPreview so each user sees only their own drafts. */
export function getWipKeysForCurrentUser(): Record<keyof typeof WIP_KEY_PREFIXES, string> {
  return getWipKeys();
}

/**
 * Switch the active customer and reload all work-in-progress localStorage keys
 * from the new customer's saved artifacts.
 *
 * This prevents stale data from a previous customer bleeding into the next
 * customer's Costing Sheet, BOM, ROI, and Proposal pages.
 *
 * Call this instead of setActiveCustomer() whenever the user explicitly
 * switches to a different customer.
 */
export function switchActiveCustomer(id: string): void {
  setLocalStorageItem(getActiveCustomerKey(), id);

  const wip = getWipKeys();
  getWipKeysList().forEach((key) => removeLocalStorageItem(key));

  const record = getCustomer(id);
  if (!record) return;

  // Restore costing sheet from saved artifact
  if (record.costing) {
    const sheet = {
      id:            `sheet_${id}`,
      name:          record.costing.sheetName,
      savedAt:       record.costing.savedAt,
      items:         record.costing.items,
      showGst:       record.costing.showGst,
      marginPercent: record.costing.marginPercent,
      grandTotal:    record.costing.grandTotal,
      totalGst:      record.costing.totalGst ?? 0,
      systemSizeKw:  record.costing.systemSizeKw,
    };
    setLocalStorageItem(wip.sheets, JSON.stringify([sheet]));

    // Restore ROI autofill from costing data
    const roiAutofill = {
      systemSizeKw: record.costing.systemSizeKw,
      grandTotal:   record.costing.grandTotal,
    };
    setLocalStorageItem(wip.roiAutofill, JSON.stringify(roiAutofill));
  }

  // Restore BOM from saved artifact
  if (record.bom) {
    const storedBom = { rows: record.bom.rows };
    setLocalStorageItem(wip.bomCosting, JSON.stringify(storedBom));
  }

  // Restore ROI result from saved artifact
  if (record.roi) {
    setLocalStorageItem(wip.roiResult, JSON.stringify(record.roi.result));
  }

  // Restore BOM comments from saved proposal artifact
  if (record.proposal?.bomComments) {
    setLocalStorageItem(wip.bomComments, JSON.stringify(record.proposal.bomComments));
  }

  // Restore edited proposal HTML from saved proposal artifact
  if (record.proposal?.editedHtml) {
    setLocalStorageItem(wip.proposalHtml, record.proposal.editedHtml);
  }

  // After switching, prune cache so only active + recent customers keep full artifacts
  pruneCustomerArtifacts(id);
}

// ─────────────────────────────────────────────
// Artifact save helpers
// ─────────────────────────────────────────────

/**
 * Single-save: persist all four artifacts to the customer record at once.
 * Called from ProposalPreview when "Generate Proposal" is clicked.
 *
 * FUTURE CRM INTEGRATION — replace this function body with:
 *
 *   const payload = { costing, bom, roi, proposal };
 *   const res = await fetch(
 *     `/api/crm/projects/${record.master.crmProjectId}/artifacts`,
 *     { method: 'POST', headers: { Authorization: `Bearer ${jwtToken}` }, body: JSON.stringify(payload) }
 *   );
 *   const { artifactId } = await res.json();
 *   // Store artifactId on proposal.crmArtifactId for future reference
 *
 * The generated PDF/DOCX should also be uploaded separately:
 *   POST /api/crm/projects/:crmProjectId/documents
 * which will make the proposal appear in the CRM Project → Artifacts / Documents tab.
 */
export function saveAllArtifacts(
  customerId: string,
  costing:  CostingArtifact  | null,
  bom:      BomArtifact      | null,
  roi:      RoiArtifact      | null,
  proposal: ProposalArtifact | null,
): CustomerRecord | null {
  const record = getCustomer(customerId);
  if (!record) return null;

  const nextCosting  = costing  ?? record.costing;
  const nextBom      = bom      ?? record.bom;
  const nextRoi      = roi      ?? record.roi;
  const nextProposal = proposal ?? record.proposal;

  const updated: CustomerRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    status: deriveProposalStatusFromArtifacts({
      costing: nextCosting,
      bom: nextBom,
      roi: nextRoi,
      proposal: nextProposal,
    }),
    costing:   nextCosting,
    bom:       nextBom,
    roi:       nextRoi,
    proposal:  nextProposal,
  };
  upsertCustomer(updated);
  return updated;
}

/** Clear only the saved Proposal artifact from a customer record. */
export function clearProposalArtifact(customerId: string): CustomerRecord | null {
  const record = getCustomer(customerId);
  if (!record) return null;

  const updated: CustomerRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    status: deriveProposalStatusFromArtifacts({
      costing: record.costing,
      bom: record.bom,
      roi: record.roi,
      proposal: null,
    }),
    proposal: null,
  };
  upsertCustomer(updated);
  return updated;
}

// ─────────────────────────────────────────────
// Status display helpers
// ─────────────────────────────────────────────

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  'not-started':    'Not Yet Created',
  'draft':          'PE Draft',
  'proposal-ready': 'PE Ready',
};

export const STATUS_COLORS: Record<ProposalStatus, string> = {
  'not-started':    'bg-slate-100 text-slate-600 border-slate-200',
  'draft':          'bg-secondary-100 text-secondary-600 border-secondary-300',
  'proposal-ready': 'bg-blue-50 text-blue-700 border-blue-200',
};

/** Returns a compact artifact completion summary, e.g. "3 / 4 artifacts" */
export function artifactSummary(r: CustomerRecord): string {
  const count = [r.costing, r.bom, r.roi, r.proposal].filter(Boolean).length;
  return `${count} / 4 artifacts`;
}

/**
 * Roof layout for dashboard / tiles: prefers dedicated `record.roofLayout`, else
 * a layout embedded on the saved proposal artifact.
 */
export function getResolvedRoofLayout(r: CustomerRecord | null): RoofLayoutArtifact | null {
  if (!r) return null;
  const direct = r.roofLayout;
  if (direct && String(direct.layout_image_url || '').trim()) {
    return direct;
  }
  const pr = r.proposal?.roofLayout;
  if (pr && String(pr.layout_image_url || '').trim()) {
    return {
      savedAt: r.proposal!.generatedAt,
      roof_area_m2: Number(pr.roof_area_m2),
      usable_area_m2: Number(pr.usable_area_m2),
      panel_count: Number(pr.panel_count),
      layout_image_url: String(pr.layout_image_url),
    };
  }
  return null;
}
