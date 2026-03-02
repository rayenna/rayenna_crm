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
 * 7. STATUS SYNC
 *    CustomerRecord.status maps to CRM Project.stage:
 *      draft           →  Project.stage = "Prospecting"
 *      proposal-ready  →  Project.stage = "Proposal Sent" (trigger on save)
 *      sent            →  Project.stage = "Negotiation"
 *      won             →  Project.stage = "Closed Won"
 *      lost            →  Project.stage = "Closed Lost"
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

  /** System capacity in kW — auto-populated from CRM Project when available */
  systemSizeKw?:  number;

  /** Electricity tariff (₹/kWh) — auto-populated from CRM Project when available */
  tariff?:        number;
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

export interface ProposalArtifact {
  refNumber:   string;
  generatedAt: string;
  /** Plain-text summary stored for quick preview */
  summary:     string;
  /** Per-category notes typed in the Bill of Quantities section */
  bomComments?: Record<string, string>;
  /** Saved innerHTML of the proposal document body — captures inline edits */
  editedHtml?: string;

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

export type ProposalStatus = 'draft' | 'proposal-ready' | 'sent' | 'won' | 'lost';

export interface CustomerRecord {
  id:        string;           // e.g. "cust_1717000000000"
  createdAt: string;           // ISO
  updatedAt: string;           // ISO
  status:    ProposalStatus;

  master:   CustomerMaster;

  /** Artifacts — null until saved */
  costing:  CostingArtifact  | null;
  bom:      BomArtifact      | null;
  roi:      RoiArtifact      | null;
  proposal: ProposalArtifact | null;
}

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────

const CUSTOMERS_KEY       = 'rayenna_customers_v1';
const ACTIVE_CUSTOMER_KEY = 'rayenna_active_customer_v1';

// ─────────────────────────────────────────────
// CRUD helpers
// ─────────────────────────────────────────────

export function loadCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomers(customers: CustomerRecord[]): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
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
}

export function deleteCustomer(id: string): void {
  saveCustomers(loadCustomers().filter((c) => c.id !== id));
  if (getActiveCustomerId() === id) clearActiveCustomer();
}

export function createCustomer(master: CustomerMaster): CustomerRecord {
  const now = new Date().toISOString();
  const record: CustomerRecord = {
    id:        `cust_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    status:    'draft',
    master,
    costing:  null,
    bom:      null,
    roi:      null,
    proposal: null,
  };
  upsertCustomer(record);
  return record;
}

// ─────────────────────────────────────────────
// Active customer helpers
// ─────────────────────────────────────────────

export function getActiveCustomerId(): string | null {
  return localStorage.getItem(ACTIVE_CUSTOMER_KEY);
}

export function getActiveCustomer(): CustomerRecord | null {
  const id = getActiveCustomerId();
  return id ? getCustomer(id) : null;
}

export function setActiveCustomer(id: string): void {
  localStorage.setItem(ACTIVE_CUSTOMER_KEY, id);
}

export function clearActiveCustomer(): void {
  localStorage.removeItem(ACTIVE_CUSTOMER_KEY);
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

  const updated: CustomerRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    status:    proposal ? 'proposal-ready' : record.status,
    costing:   costing  ?? record.costing,
    bom:       bom      ?? record.bom,
    roi:       roi      ?? record.roi,
    proposal:  proposal ?? record.proposal,
  };
  upsertCustomer(updated);
  return updated;
}

// ─────────────────────────────────────────────
// Status display helpers
// ─────────────────────────────────────────────

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  'draft':           'Draft',
  'proposal-ready':  'Proposal Ready',
  'sent':            'Sent',
  'won':             'Won',
  'lost':            'Lost',
};

export const STATUS_COLORS: Record<ProposalStatus, string> = {
  'draft':           'bg-secondary-100 text-secondary-600 border-secondary-300',
  'proposal-ready':  'bg-blue-50 text-blue-700 border-blue-200',
  'sent':            'bg-yellow-50 text-yellow-700 border-yellow-200',
  'won':             'bg-emerald-50 text-emerald-700 border-emerald-200',
  'lost':            'bg-red-50 text-red-600 border-red-200',
};

/** Returns a compact artifact completion summary, e.g. "3 / 4 artifacts" */
export function artifactSummary(r: CustomerRecord): string {
  const count = [r.costing, r.bom, r.roi, r.proposal].filter(Boolean).length;
  return `${count} / 4 artifacts`;
}
