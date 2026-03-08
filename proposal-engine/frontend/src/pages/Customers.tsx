import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  loadCustomers,
  createCustomer,
  deleteCustomer,
  switchActiveCustomer,
  getActiveCustomerId,
  getHiddenProjectIds,
  clearHiddenProjectIds,
  removeHiddenProjectId,
  STATUS_LABELS,
  STATUS_COLORS,
  artifactSummary,
  upsertCustomer,
  formatEmailForDisplay,
} from '../lib/customerStore';
import type { CustomerRecord, CustomerMaster, ProposalStatus } from '../lib/customerStore';
import { AlertCard } from '../components/AlertCard';
import {
  fetchProposalEngineProjects,
  fetchProposalEngineEligibleProjects,
  fetchProjectWithArtifacts,
  mapApiArtifactsToRecord,
  getCurrentUserRole,
  deleteProjectFromProposalEngine,
  selectProposalEngineProject,
  type ProposalEngineProjectFromApi,
} from '../lib/apiClient';

// ─────────────────────────────────────────────
// New Customer Modal (reserved for manual add flow)
// ─────────────────────────────────────────────

export function NewCustomerModal({
  onSave,
  onCancel,
}: {
  onSave:   (master: CustomerMaster) => void;
  onCancel: () => void;
}) {
  const [name,          setName]          = useState('');
  const [location,      setLocation]      = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone,         setPhone]         = useState('');
  const [email,         setEmail]         = useState('');
  const [err,           setErr]           = useState('');

  const handleSave = () => {
    if (!name.trim()) { setErr('Customer / Company name is required.'); return; }
    onSave({
      name:          name.trim(),
      location:      location.trim(),
      contactPerson: contactPerson.trim(),
      phone:         phone.trim(),
      email:         email.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onCancel} />
      {/* max-h + flex-col so the footer is always visible even on small portrait screens */}
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-lg flex flex-col" style={{ maxHeight: 'min(96vh, 640px)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">👤</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">New Customer</h2>
              <p className="text-white/80 text-xs">Enter customer details to start a proposal</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body — scrollable so form fields are reachable on small screens */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-secondary-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
            <strong className="text-blue-700">Standalone mode only.</strong>{' '}
            When integrated with Rayenna CRM, this form will be replaced by a{' '}
            <strong className="text-blue-700">Select Project</strong> dropdown showing the salesperson's
            assigned CRM Projects. All fields below will auto-populate from the selected Project record.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
                Customer / Company Name <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Sharma Industries Pvt Ltd"
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
              />
              {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Location / Site</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Ernakulam, Kerala"
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Contact Person</label>
              <input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Mr. Rajesh Sharma"
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajesh@company.com"
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Footer — flex-shrink-0 keeps it pinned at the bottom even on small screens */}
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/60 flex-shrink-0 flex flex-col-reverse xs:flex-row sm:flex-row items-stretch xs:items-center sm:items-center justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors text-center">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-sm text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all text-center"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
          >
            Create &amp; Open →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers for CRM Projects
// ─────────────────────────────────────────────

interface ProjectOption {
  id: string;
  projectStage: string;
  peStatus?: 'draft' | 'proposal-ready' | string;
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
}

function deriveCustomerName(c: ProposalEngineProjectFromApi['customer'] | null | undefined): string {
  if (!c) return 'Unnamed customer';
  if (c.customerName && c.customerName.trim()) return c.customerName.trim();
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const companyName = (c as any).companyName as string | undefined;
  if (companyName && companyName.trim()) return companyName.trim();
  return 'Unnamed customer';
}

function deriveContactNumber(c: ProposalEngineProjectFromApi['customer'] | null | undefined): string {
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

function mapApiProjectToProjectOption(p: ProposalEngineProjectFromApi): ProjectOption {
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
  };
}

function buildMasterFromProject(project: ProjectOption): CustomerMaster {
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

/** Operations, Management, Finance, Admin see all project proposals; Sales see only their own. */
const ROLES_VIEW_ALL_PROJECTS = new Set(['OPERATIONS', 'MANAGEMENT', 'FINANCE', 'ADMIN']);
/** Only Sales (own) and Admin can create/edit/delete proposals. */
const ROLES_CAN_EDIT = new Set(['SALES', 'ADMIN']);

function canViewAllProjects(role: string | null): boolean {
  return role != null && ROLES_VIEW_ALL_PROJECTS.has(role.toUpperCase());
}
void canViewAllProjects; // list is API-driven for all roles; keep helper for future gating

function canCreateOrEditProposals(role: string | null): boolean {
  return role != null && ROLES_CAN_EDIT.has(role.toUpperCase());
}

// ─────────────────────────────────────────────
// Project card (for API-driven list: Ops / Management / Finance / Admin)
// ─────────────────────────────────────────────

function ProjectCard({
  project,
  record,
  isActive,
  isReadOnly,
  onOpen,
  onRemoveFromList,
  onHideFromList,
}: {
  project:          ProjectOption;
  record:           CustomerRecord | null;
  isActive:         boolean;
  isReadOnly:       boolean;
  onOpen:           () => void;
  onRemoveFromList?: () => void;
  /** Hide from my list only (view-only roles); does not delete from system */
  onHideFromList?:  () => void;
}) {
  const name = project.customerName;
  const location = project.siteAddress || project.city || '';

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#0d1b3a' : '#e2e8f0' }}
      onClick={onOpen}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-sm font-bold text-secondary-900 truncate">{name}</p>
              {isReadOnly && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold flex-shrink-0">
                  View only
                </span>
              )}
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-semibold flex-shrink-0">
                  Active
                </span>
              )}
            </div>
            {location && (
              <p className="text-xs text-secondary-500 truncate">📍 {location}</p>
            )}
            {typeof project.systemSizeKw === 'number' && project.systemSizeKw > 0 && (
              <p className="text-[11px] text-secondary-400 mt-0.5">
                ⚡ {project.systemSizeKw} kW system
              </p>
            )}
            {(project.contactPerson || project.phone) && (
              <p className="text-xs text-secondary-400 mt-0.5 truncate">
                👤 {project.contactPerson || ''}{project.phone ? ` · ${project.phone}` : ''}
              </p>
            )}
            {project.salespersonName && (
              <p className="text-[10px] text-secondary-400 mt-0.5">Sales: {project.salespersonName}</p>
            )}
            {/* Show PE status when no local record (otherwise CustomerCard shows record.status) */}
            {!record && (project.peStatus === 'draft' || project.peStatus === 'proposal-ready') && (
              <p className="mt-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[project.peStatus as ProposalStatus] ?? 'bg-secondary-100 text-secondary-600 border-secondary-300'}`}>
                  {STATUS_LABELS[project.peStatus as ProposalStatus] ?? project.peStatus}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {onRemoveFromList && (
              <button
                onClick={onRemoveFromList}
                title="Remove from Proposal Engine (assigned salesperson or Admin)"
                className="p-2 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                🗑
              </button>
            )}
            {onHideFromList && (
              <button
                onClick={onHideFromList}
                title="Hide from my list (show again via link below)"
                className="text-[11px] font-medium px-2 py-1.5 rounded-lg text-secondary-500 hover:text-amber-700 hover:bg-amber-50 border border-secondary-200 hover:border-amber-300 transition-colors"
              >
                Hide
              </button>
            )}
            <button
              onClick={onOpen}
              title="Open project"
              className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg transition-all min-h-[32px]"
              style={{ background: '#0d1b3a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            >
              Open
            </button>
          </div>
        </div>
        {record && (
          <div className="mt-3 pt-3 border-t border-secondary-100 flex items-center justify-between gap-3">
            <ArtifactDots record={record} />
            <span className="text-[10px] text-secondary-400">{artifactSummary(record)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Project Picker Modal
// ─────────────────────────────────────────────

function ProjectPickerModal({
  projects,
  loading,
  error,
  onRetry,
  onSelect,
  onCancel,
  selectionLoading = false,
}: {
  projects: ProjectOption[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (p: ProjectOption) => void;
  onCancel: () => void;
  selectionLoading?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'systemCapacity' | 'orderValue' | 'confirmationDate' | 'createdAt' | 'customerName'>('confirmationDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [stageFilter, setStageFilter] = useState<'both' | 'PROPOSAL' | 'CONFIRMED'>('both');
  const [salesFilter, setSalesFilter] = useState<string>('ALL');

  const PAGE_SIZE = 20;

  const filtered = projects
    .filter((p) => {
      if (stageFilter === 'both') return true;
      return p.projectStage === stageFilter;
    })
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        p.customerName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.siteAddress.toLowerCase().includes(q)
      );
    })
    .filter((p) => {
      if (salesFilter === 'ALL') return true;
      return (p.salespersonName || '').toLowerCase() === salesFilter.toLowerCase();
    });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const safe = (n: number | null | undefined) => (Number.isFinite(n as number) ? (n as number) : 0);
    const dateVal = (s?: string) => (s ? new Date(s).getTime() || 0 : 0);
    switch (sortBy) {
      case 'systemCapacity':
        return (safe(a.systemSizeKw) - safe(b.systemSizeKw)) * dir;
      case 'orderValue':
        return (safe(a.orderValue) - safe(b.orderValue)) * dir;
      case 'confirmationDate':
        return (dateVal(a.confirmationDate) - dateVal(b.confirmationDate)) * dir;
      case 'createdAt':
        return (dateVal(a.createdAt) - dateVal(b.createdAt)) * dir;
      case 'customerName':
      default: {
        const an = a.customerName.toLowerCase();
        const bn = b.customerName.toLowerCase();
        if (an === bn) return 0;
        return (an < bn ? -1 : 1) * dir;
      }
    }
  });

  const total = sorted.length;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, total);
  const pageItems = sorted.slice(startIndex, endIndex);

  const handleChangeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const selected = filtered.find((p) => p.id === selectedId) ?? projects.find((p) => p.id === selectedId) ?? null;

  // Unique salespersons – used to show Sales Person filter for non-sales roles.
  const salespersonOptions = Array.from(
    new Set(
      projects
        .map((p) => (p.salespersonName || '').trim())
        .filter((name) => name.length > 0),
    ),
  );

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/60 w-full max-w-3xl flex flex-col" style={{ maxHeight: 'min(96vh, 640px)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📂</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Select CRM Project</h2>
              <p className="text-white/80 text-xs">
                Only projects in <span className="font-semibold">"Proposal"</span> or <span className="font-semibold">"Confirmed"</span> stages in the CRM are shown here.
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <AlertCard
              variant="error"
              title="Failed to load projects"
              message={error}
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              value={search}
              onChange={(e) => handleChangeSearch(e.target.value)}
              placeholder="Search by customer name, city, or site address…"
              className="flex-1 border border-secondary-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-secondary-300 text-secondary-600 hover:bg-secondary-50 disabled:opacity-50"
            >
              Refresh list
            </button>
          </div>

          {/* Sort & Stage / Sales filters row */}
          <div className="mt-3 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50/60 via-white to-amber-50/60 px-3 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-[11px] shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-secondary-600 font-semibold uppercase tracking-wide">
                <span className="text-[13px]">↕</span>
                Sort
              </span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
                className="border border-primary-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-secondary-800 shadow-sm focus:outline-none focus:ring-2 focus:border-primary-500"
              >
                <option value="confirmationDate">Confirmation Date</option>
                <option value="createdAt">Creation Date</option>
                <option value="systemCapacity">System Capacity (kW)</option>
                <option value="orderValue">Order Value (₹)</option>
                <option value="customerName">Customer Name</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary-200 bg-white/90 text-[11px] font-medium text-secondary-700 hover:bg-primary-50 transition-colors shadow-sm"
              >
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              {/* Stage filter – dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-secondary-600 font-semibold uppercase tracking-wide">
                  <span className="text-[13px]">🎯</span>
                  Stage
                </span>
                <select
                  value={stageFilter}
                  onChange={(e) => { setStageFilter(e.target.value as typeof stageFilter); setPage(1); }}
                  className="border border-primary-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-secondary-800 shadow-sm focus:outline-none focus:ring-2 focus:border-primary-500"
                >
                  <option value="both">Proposal + Confirmed</option>
                  <option value="PROPOSAL">Proposal only</option>
                  <option value="CONFIRMED">Confirmed only</option>
                </select>
              </div>

              {/* Sales Person filter – dropdown, only when multiple salespeople exist */}
              {salespersonOptions.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-secondary-600 font-semibold uppercase tracking-wide">
                    <span className="text-[13px]">👤</span>
                    Sales Person
                  </span>
                  <select
                    value={salesFilter}
                    onChange={(e) => { setSalesFilter(e.target.value); setPage(1); }}
                    className="border border-primary-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-secondary-800 shadow-sm focus:outline-none focus:ring-2 focus:border-primary-500 max-w-[200px]"
                  >
                    <option value="ALL">All</option>
                    {salespersonOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {!loading && !error && (
            <div className="flex items-center justify-between text-[11px] text-secondary-500 mt-1">
              <span>
                {total === 0
                  ? 'No projects found.'
                  : `Showing ${startIndex + 1}–${endIndex} of ${total} project${total === 1 ? '' : 's'}`}
              </span>
              {total > PAGE_SIZE && (
                <span className="text-secondary-400">
                  Page {page} of {totalPages}
                </span>
              )}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-10 text-secondary-500 text-sm gap-2">
              <span className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              Loading projects…
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="py-10 text-center text-secondary-400 text-sm">
              No matching projects in Proposal stage or higher.
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-2">
              {pageItems.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                    selectedId === p.id
                      ? 'border-amber-300 bg-amber-50/60 shadow-sm'
                      : 'border-secondary-200 hover:border-primary-300 hover:bg-primary-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-secondary-900 truncate">{p.customerName}</p>
                      <p className="text-xs text-secondary-500 truncate">
                        📍 {p.siteAddress || p.city || 'Location not set'}
                      </p>
                      {(p.contactPerson || p.phone || p.email) && (
                        <p className="text-[11px] text-secondary-400 truncate">
                          {p.contactPerson}
                          {p.phone ? ` · ${p.phone}` : ''}
                          {p.email ? ` · ${formatEmailForDisplay(p.email)}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {typeof p.systemSizeKw === 'number' && p.systemSizeKw > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-amber-400/70">
                          ⚡ {p.systemSizeKw} kW
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-secondary-700 border border-secondary-200">
                        Stage: {p.projectStage || '—'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/60 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Pagination controls */}
          <div className="flex items-center justify-between sm:justify-start gap-2 text-[11px] text-secondary-500">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-100 transition-colors"
            >
              ‹ Prev
            </button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-100 transition-colors"
            >
              Next ›
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse xs:flex-row sm:flex-row items-stretch xs:items-center sm:items-center justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={selectionLoading}
              className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors text-center disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected || selectionLoading}
              onClick={handleConfirm}
              className="text-sm text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all text-center disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#0d1b3a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            >
              {selectionLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Loading project…
                </>
              ) : (
                'Use Selected Project →'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Existing proposal conflict modal
// ─────────────────────────────────────────────

function ProjectConflictModal({
  project,
  existingCount,
  onOverwrite,
  onAppend,
  onCancel,
}: {
  project: ProjectOption;
  existingCount: number;
  onOverwrite: () => void;
  onAppend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-secondary-900/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-amber-400/70 bg-slate-950 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-400/60 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-600/60">
          <h2 className="text-sm font-bold tracking-wide text-amber-300 uppercase">
            Existing proposal found
          </h2>
          <p className="mt-1 text-xs text-slate-100/80">
            A proposal already exists for{' '}
            <span className="font-semibold">{project.customerName}</span>
            {project.projectNumber != null && (
              <>
                {' '}
                (Project #<span>{project.projectNumber}</span>)
              </>
            )}
            . You currently have {existingCount}{' '}
            {existingCount === 1 ? 'proposal' : 'proposals'} linked to this CRM
            project.
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 text-xs text-slate-100/90 bg-slate-950">
          <p>
            An existing proposal already exists. Do you want to continue?
          </p>
          <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/70 rounded-lg px-3 py-2 leading-relaxed">
            <span className="font-semibold text-amber-300">Note:</span>{' '}
            Overwrite will delete the existing proposal kit for this project.
            Data from deleted proposals cannot be recovered.
          </p>
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-3 border-t border-amber-400/60 bg-slate-950/95 flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onOverwrite}
            className="inline-flex justify-center items-center px-4 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-amber-300 hover:bg-amber-400 shadow-sm transition-colors"
          >
            Overwrite
          </button>
          <button
            type="button"
            onClick={onAppend}
            className="inline-flex justify-center items-center px-4 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-emerald-300 hover:bg-emerald-400 shadow-sm transition-colors"
          >
            Append
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center items-center px-4 py-2 rounded-lg text-xs font-semibold text-slate-100 border border-slate-600/80 hover:bg-slate-800/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Status change dropdown
// ─────────────────────────────────────────────

const STATUSES: ProposalStatus[] = ['draft', 'proposal-ready', 'sent', 'won', 'lost'];

function StatusBadge({ record, onChange }: { record: CustomerRecord; onChange: (s: ProposalStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[record.status]}`}
      >
        {STATUS_LABELS[record.status]} ▾
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-secondary-200 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-secondary-50 transition-colors ${record.status === s ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Artifact completion dots
// ─────────────────────────────────────────────

function ArtifactDots({ record }: { record: CustomerRecord }) {
  const dots = [
    { label: 'Costing', done: !!record.costing,  color: '#0ea5e9' },
    { label: 'BOM',     done: !!record.bom,       color: '#eab308' },
    { label: 'ROI',     done: !!record.roi,       color: '#10b981' },
    { label: 'Proposal',done: !!record.proposal,  color: '#8b5cf6' },
  ];
  return (
    <div className="flex items-center gap-2">
      {dots.map((d) => (
        <div key={d.label} className="flex items-center gap-1" title={`${d.label}: ${d.done ? 'saved' : 'pending'}`}>
          <span
            className="w-2.5 h-2.5 rounded-full border flex-shrink-0"
            style={{
              background:   d.done ? d.color : 'transparent',
              borderColor:  d.color,
              opacity:      d.done ? 1 : 0.4,
            }}
          />
          <span className="text-[10px] text-secondary-400 hidden sm:inline">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer card
// ─────────────────────────────────────────────

function CustomerCard({
  record,
  isActive,
  onOpen,
  onDelete,
  onStatusChange,
}: {
  record:         CustomerRecord;
  isActive:       boolean;
  onOpen:         () => void;
  onDelete:       () => void;
  onStatusChange: (s: ProposalStatus) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const date = new Date(record.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#0d1b3a' : '#e2e8f0' }}
      onClick={onOpen}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-secondary-900 truncate">{record.master.name}</p>
                {typeof record.proposalIndex === 'number' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex-shrink-0">
                    #{record.proposalIndex}
                  </span>
                )}
              </div>
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-semibold flex-shrink-0">
                  Active
                </span>
              )}
              <StatusBadge record={record} onChange={onStatusChange} />
            </div>
            {record.master.location && (
              <p className="text-xs text-secondary-500 truncate">📍 {record.master.location}</p>
            )}
            {typeof record.master.systemSizeKw === 'number' && record.master.systemSizeKw > 0 && (
              <p className="text-[11px] text-secondary-400 mt-0.5">
                ⚡ {record.master.systemSizeKw} kW system
              </p>
            )}
            {record.master.contactPerson && (
              <p className="text-xs text-secondary-400 mt-0.5 truncate">
                👤 {record.master.contactPerson}{record.master.phone ? ` · ${record.master.phone}` : ''}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onOpen}
              title="Open on Dashboard"
              className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg transition-all min-h-[32px]"
              style={{ background: '#0d1b3a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            >
              Open
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete customer"
              className="p-2 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              🗑
            </button>
          </div>
        </div>

        {/* Artifact dots + date */}
        <div className="mt-3 pt-3 border-t border-secondary-100 flex items-center justify-between gap-3">
          <ArtifactDots record={record} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-secondary-400">{artifactSummary(record)}</span>
            <span className="text-[10px] text-secondary-300">·</span>
            <span className="text-[10px] text-secondary-400">{date}</span>
          </div>
        </div>
      </div>

      {/* Delete confirm — Yes/No for Admin and Sales */}
      {confirmDelete && (
        <div
          className="border-t border-red-100 bg-red-50/80 px-4 py-3 flex items-center justify-between gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-red-700 font-medium">Delete proposal for <strong>{record.master.name}</strong>? All artifacts will be removed from Proposal Engine.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 transition-colors">No</button>
            <button onClick={onDelete} className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition-colors">Yes</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => loadCustomers());
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch]       = useState('');
  const activeId                  = getActiveCustomerId();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [eligibleProjects, setEligibleProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Conflict modal state when selecting a CRM project that already has proposals.
  const [conflictProject, setConflictProject] = useState<ProjectOption | null>(null);
  const [conflictExistingCount, setConflictExistingCount] = useState<number>(0);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [hydratingProjectId, setHydratingProjectId] = useState<string | null>(null);

  // Delete confirmation (ProjectCard trash): show Yes/No before removing from PE (Admin and Sales).
  const [removeConfirmProject, setRemoveConfirmProject] = useState<ProjectOption | null>(null);

  const userRole = getCurrentUserRole();
  // Per clarified requirement: the list view is always API-driven (selected projects).
  const viewAllMode = true;
  const canCreateProposal = canCreateOrEditProposals(userRole);
  const isReadOnlyRole = viewAllMode && userRole !== null && userRole.toUpperCase() !== 'ADMIN';
  const isAdmin = userRole != null && userRole.toUpperCase() === 'ADMIN';

  const [hiddenProjectIds, setHiddenProjectIds] = useState<string[]>(() => getHiddenProjectIds());

  const refresh = useCallback(() => setCustomers(loadCustomers()), []);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const apiProjects = await fetchProposalEngineProjects();
      if (!Array.isArray(apiProjects)) {
        throw new Error('Invalid projects response from server.');
      }

      const mapped: ProjectOption[] = apiProjects.map((p) => mapApiProjectToProjectOption(p));
      setProjects(mapped);

      // Keep local storage consistent with the server-selected list.
      // If a CRM-linked local record exists for a project that is no longer selected,
      // remove it so Dashboard/Customers stay consistent (fixes "active project" stuck in Dashboard).
      const selectedIds = new Set(mapped.map((x) => x.id));
      const locals = loadCustomers();
      const stale = locals.filter((c) => c?.master?.crmProjectId && !selectedIds.has(c.master.crmProjectId));
      stale.forEach((c) => deleteCustomer(c.id));
      if (stale.length > 0) setCustomers(loadCustomers());
    } catch (err: any) {
      setProjectsError(err?.message || 'Failed to load projects.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadEligibleProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const apiProjects = await fetchProposalEngineEligibleProjects();
      if (!Array.isArray(apiProjects)) {
        throw new Error('Invalid eligible projects response from server.');
      }
      const mapped: ProjectOption[] = apiProjects.map((p) => mapApiProjectToProjectOption(p));
      setEligibleProjects(mapped);
    } catch (err: any) {
      setProjectsError(err?.message || 'Failed to load eligible projects.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const handleRemoveFromList = useCallback(async (projectId: string) => {
    try {
      await deleteProjectFromProposalEngine(projectId);
      removeHiddenProjectId(projectId);
      setHiddenProjectIds(getHiddenProjectIds());
      // Remove any local records linked to this CRM project (so Dashboard + Customers are consistent).
      const locals = loadCustomers().filter((c) => c?.master?.crmProjectId === projectId);
      locals.forEach((c) => deleteCustomer(c.id));
      setCustomers(loadCustomers());
      await loadProjects();
    } catch (err) {
      setProjectsError((err as Error)?.message ?? 'Failed to remove project');
    }
  }, [loadProjects]);

  // Admin maintenance actions (restore/clear) are currently not exposed in the UI.
  // Keeping the functions commented-out here for possible future use.
  // const handleAdminClearAll = useCallback(async () => { ... }, [isAdmin, clearingAll, loadProjects]);
  // const handleAdminRestoreHidden = useCallback(async () => { ... }, [isAdmin, clearingAll, loadProjects]);

  const handleClearHiddenList = useCallback(() => {
    clearHiddenProjectIds();
    setHiddenProjectIds([]);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  /** Create local record from CRM project and hydrate with backend artifacts if any. */
  const createFromProjectAndHydrate = useCallback(
    async (project: ProjectOption, proposalIndex: number): Promise<CustomerRecord> => {
      let artifacts = {
        costing: null as CustomerRecord['costing'],
        bom: null as CustomerRecord['bom'],
        roi: null as CustomerRecord['roi'],
        proposal: null as CustomerRecord['proposal'],
      };
      try {
        const res = await fetchProjectWithArtifacts(project.id);
        artifacts = mapApiArtifactsToRecord(res.artifacts);
      } catch {
        // No backend data or network error — keep artifacts null
      }
      const master: CustomerMaster = buildMasterFromProject(project);
      const record = createCustomer(master);
      const indexed: CustomerRecord = { ...record, proposalIndex };
      const merged: CustomerRecord = { ...indexed, ...artifacts };
      upsertCustomer(merged);
      return merged;
    },
    [],
  );

  const handleCreateFromProject = useCallback(
    async (project: ProjectOption) => {
      const all = loadCustomers();
      setCustomers(all);
      const existingForProject = all.filter(
        (c) => c.master.crmProjectId === project.id,
      );

      if (existingForProject.length > 0) {
        setConflictProject(project);
        setConflictExistingCount(existingForProject.length);
        setShowPicker(false);
        setShowConflictModal(true);
        return;
      }

      setHydratingProjectId(project.id);
      try {
        // Persist selection server-side so it appears in lists for everyone.
        await selectProposalEngineProject(project.id);
        const merged = await createFromProjectAndHydrate(project, 1);
        switchActiveCustomer(merged.id);
        setShowPicker(false);
        await loadProjects();
        navigate('/dashboard');
      } finally {
        setHydratingProjectId(null);
      }
    },
    [createFromProjectAndHydrate, navigate, loadProjects],
  );

  const handleOpen = (id: string) => {
    switchActiveCustomer(id);
    navigate('/dashboard');
  };

  /** Open a project from the API list. Always fetches latest artifacts from backend and merges into
   *  local record so Sales (and others) see server-backed data even if their local copy was empty/stale. */
  const handleOpenProjectFromApi = useCallback(
    async (project: ProjectOption) => {
      setHydratingProjectId(project.id);
      try {
        const res = await fetchProjectWithArtifacts(project.id);
        const artifacts = mapApiArtifactsToRecord(res.artifacts);
        const now = new Date().toISOString();
        const all = loadCustomers();
        const existing = all.find((c) => c.master.crmProjectId === project.id);
        const record: CustomerRecord = existing
          ? {
              ...existing,
              updatedAt: now,
              costing: artifacts.costing ?? existing.costing,
              bom: artifacts.bom ?? existing.bom,
              roi: artifacts.roi ?? existing.roi,
              proposal: artifacts.proposal ?? existing.proposal,
            }
          : {
              id: `crm_${project.id}`,
              createdAt: now,
              updatedAt: now,
              status: 'draft',
              proposalIndex: 1,
              master: buildMasterFromProject(project),
              costing: artifacts.costing,
              bom: artifacts.bom,
              roi: artifacts.roi,
              proposal: artifacts.proposal,
            };
        upsertCustomer(record);
        switchActiveCustomer(record.id);
        setCustomers(loadCustomers());
        navigate('/dashboard');
      } catch {
        setProjectsError('Failed to load project. You may not have access.');
      } finally {
        setHydratingProjectId(null);
      }
    },
    [navigate],
  );

  const handleDelete = useCallback(async (record: CustomerRecord) => {
    const projectId = record.master.crmProjectId;
    if (projectId) {
      try {
        await deleteProjectFromProposalEngine(projectId);
      } catch {
        setProjectsError('Failed to remove project for everyone');
        return;
      }
    }
    deleteCustomer(record.id);
    refresh();
    if (projectId) {
      removeHiddenProjectId(projectId);
      setHiddenProjectIds(getHiddenProjectIds());
      await loadProjects();
    }
  }, [loadProjects]);

  const handleStatusChange = (record: CustomerRecord, status: ProposalStatus) => {
    upsertCustomer({ ...record, status, updatedAt: new Date().toISOString() });
    refresh();
  };

  // Deep link support: /customers?openProjectId=<CRM_PROJECT_ID>
  // Always fetch artifacts from backend and merge so Sales see server-backed data (no stale/blank local copy).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('openProjectId');
    if (!projectId) return;

    void (async () => {
      try {
        try {
          await selectProposalEngineProject(projectId);
        } catch {
          // Ignore selection errors – user may not have access; we'll surface a generic error below.
        }

        const detail = await fetchProjectWithArtifacts(projectId);
        const projectOption = mapApiProjectToProjectOption(detail.project);
        const artifacts = mapApiArtifactsToRecord(detail.artifacts);
        const now = new Date().toISOString();
        const existing = loadCustomers().find((c) => c.master.crmProjectId === projectId);
        const record: CustomerRecord = existing
          ? {
              ...existing,
              updatedAt: now,
              master: buildMasterFromProject(projectOption),
              costing: artifacts.costing ?? existing.costing,
              bom: artifacts.bom ?? existing.bom,
              roi: artifacts.roi ?? existing.roi,
              proposal: artifacts.proposal ?? existing.proposal,
            }
          : {
              id: `crm_${projectId}`,
              createdAt: now,
              updatedAt: now,
              status: 'draft',
              proposalIndex: 1,
              master: buildMasterFromProject(projectOption),
              costing: artifacts.costing,
              bom: artifacts.bom,
              roi: artifacts.roi,
              proposal: artifacts.proposal,
            };
        upsertCustomer(record);
        setCustomers(loadCustomers());
        switchActiveCustomer(record.id);
        navigate('/dashboard');
      } catch {
        setProjectsError('Unable to open this project in Proposal Engine. It might not be in Proposal/Confirmed stage or you may not have access.');
      }
    })();
    // We intentionally do not include navigate/setters in deps so the effect only runs on initial search change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const filtered = customers.filter((c) => {
    const m = c?.master;
    if (!m) return false;
    const q = search.toLowerCase();
    return (
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.location ?? '').toLowerCase().includes(q) ||
      (m.contactPerson ?? '').toLowerCase().includes(q)
    );
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const hiddenSet = new Set(hiddenProjectIds);
  const filteredProjects = projects
    .filter((p) => !hiddenSet.has(p.id))
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.siteAddress || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.contactPerson || '').toLowerCase().includes(q) ||
        (p.salespersonName || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

  // In viewAllMode, use effective status per project: local record status when present (matches card),
  // otherwise API peStatus, so counts match what is shown on cards (Admin sees CustomerCard with record.status).
  const statCounts = viewAllMode
    ? (() => {
        const locals = loadCustomers();
        const effectiveDraft = projects.filter((p) => {
          const rec = locals.find((c) => c.master.crmProjectId === p.id);
          const status = rec ? rec.status : (p.peStatus || '').toString().toLowerCase();
          return status === 'draft';
        }).length;
        const effectiveReady = projects.filter((p) => {
          const rec = locals.find((c) => c.master.crmProjectId === p.id);
          const status = rec ? rec.status : (p.peStatus || '').toString().toLowerCase();
          return status === 'proposal-ready';
        }).length;
        return {
          total:     projects.length,
          draft:     effectiveDraft,
          ready:     effectiveReady,
          confirmed: projects.filter((p) => (p.projectStage || '').toUpperCase() === 'CONFIRMED').length,
        };
      })()
    : {
        total:      customers.length,
        draft:      customers.filter((c) => c.status === 'draft').length,
        ready:      customers.filter((c) => c.status === 'proposal-ready').length,
        confirmed:  customers.filter((c) => (c.master.projectStage || '').toUpperCase() === 'CONFIRMED').length,
      };

  return (
    <>
      {showConflictModal && conflictProject && (
        <ProjectConflictModal
          project={conflictProject}
          existingCount={conflictExistingCount}
          onOverwrite={() => {
            const all = loadCustomers();
            const forProject = all.filter(
              (c) => c.master.crmProjectId === conflictProject.id,
            );
            if (forProject.length === 0) {
              setShowConflictModal(false);
              setConflictProject(null);
              setConflictExistingCount(0);
              // Fallback: treat as first-time selection.
              handleCreateFromProject(conflictProject);
              return;
            }

            // Normalise proposal indexes (Proposal #1, #2, ...) by createdAt.
            const sorted = [...forProject].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            sorted.forEach((rec, idx) => {
              if (rec.proposalIndex !== idx + 1) {
                upsertCustomer({ ...rec, proposalIndex: idx + 1 });
              }
            });
            const target = sorted[sorted.length - 1]!;
            const reset: CustomerRecord = {
              ...target,
              status: 'draft',
              costing: null,
              bom: null,
              roi: null,
              proposal: null,
            };
            upsertCustomer(reset);
            switchActiveCustomer(reset.id);
            setShowConflictModal(false);
            setConflictProject(null);
            setConflictExistingCount(0);
            navigate('/dashboard');
          }}
          onAppend={async () => {
            const all = loadCustomers();
            const forProject = all.filter(
              (c) => c.master.crmProjectId === conflictProject.id,
            );
            const sorted = [...forProject].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            sorted.forEach((rec, idx) => {
              if (rec.proposalIndex !== idx + 1) {
                upsertCustomer({ ...rec, proposalIndex: idx + 1 });
              }
            });
            const nextIndex = sorted.length + 1;
            setHydratingProjectId(conflictProject.id);
            try {
              const merged = await createFromProjectAndHydrate(
                conflictProject,
                nextIndex,
              );
              switchActiveCustomer(merged.id);
              setShowConflictModal(false);
              setConflictProject(null);
              setConflictExistingCount(0);
              navigate('/dashboard');
            } finally {
              setHydratingProjectId(null);
            }
          }}
          onCancel={() => {
            setShowConflictModal(false);
            setConflictProject(null);
            setConflictExistingCount(0);
            setShowPicker(true);
          }}
        />
      )}

      {/* Delete proposal confirmation — Yes/No for Admin and Sales (ProjectCard trash) */}
      {removeConfirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary-900/70 backdrop-blur-sm" onClick={() => setRemoveConfirmProject(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-red-200/80 max-w-md w-full p-6">
            <p className="text-sm text-secondary-800 font-medium">
              Remove proposal for <strong>{removeConfirmProject.customerName}</strong> from Proposal Engine? This will remove it for everyone. All artifacts (Costing, BOM, ROI, Proposal) will be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveConfirmProject(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = removeConfirmProject.id;
                  setRemoveConfirmProject(null);
                  await handleRemoveFromList(id);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <ProjectPickerModal
          projects={eligibleProjects}
          loading={projectsLoading}
          error={projectsError}
          onRetry={loadEligibleProjects}
          onSelect={handleCreateFromProject}
          onCancel={() => setShowPicker(false)}
          selectionLoading={hydratingProjectId != null}
        />
      )}

      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">👥</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">Customers / Projects</h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  Comprehensive module for solar costing, BOMs, proposals, and ROI.
                  <br />
                  Select a customer to start a proposal workflow — Costing → BOM → ROI → Proposal.
                </p>
              </div>
            </div>
            {canCreateProposal && (
              <button
                onClick={() => { void loadEligibleProjects(); setShowPicker(true); }}
                title="Pick from Rayenna CRM Projects in Proposal stage or higher."
                className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all w-full sm:w-auto flex-shrink-0"
              >
                + Select Project
              </button>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total',           value: statCounts.total,  color: 'text-secondary-700 bg-secondary-50 border-secondary-200' },
              { label: 'Drafts',          value: statCounts.draft,  color: 'text-secondary-600 bg-secondary-50 border-secondary-200' },
              { label: 'Proposal Ready',  value: statCounts.ready,  color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Confirmed',       value: statCounts.confirmed,    color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="mb-5 flex flex-col sm:flex-row gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or contact…"
              className="flex-1 border border-secondary-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
            {/* Admin maintenance buttons (restore/clear) intentionally hidden based on latest requirements */}
            {viewAllMode && hiddenProjectIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearHiddenList}
                className="text-sm text-secondary-600 hover:text-primary-600 font-medium whitespace-nowrap"
              >
                Show {hiddenProjectIds.length} hidden project{hiddenProjectIds.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* Customer / Project list */}
          {viewAllMode ? (
            projectsLoading ? (
              <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
                <p className="text-secondary-500 font-semibold text-sm">Loading all project proposals…</p>
              </div>
            ) : projectsError ? (
              <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
                <p className="text-red-600 font-semibold text-sm">{projectsError}</p>
                <button type="button" onClick={() => void loadProjects()} className="mt-3 text-sm text-primary-600 hover:underline">Retry</button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-secondary-500 font-semibold text-sm">
                  {search ? 'No projects match your search' : 'No projects in Proposal stage yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((p) => {
                  const localRecord = loadCustomers().find((c) => c.master.crmProjectId === p.id);
                  const effectiveId = localRecord?.id ?? `crm_${p.id}`;
                  if (isAdmin && localRecord) {
                    return (
                      <CustomerCard
                        key={localRecord.id}
                        record={localRecord}
                        isActive={activeId === localRecord.id}
                        onOpen={() => handleOpen(localRecord.id)}
                        onDelete={() => void handleDelete(localRecord)}
                        onStatusChange={(s) => handleStatusChange(localRecord, s)}
                      />
                    );
                  }
                  return (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      record={localRecord ?? null}
                      isActive={activeId === effectiveId}
                      isReadOnly={isReadOnlyRole}
                      onOpen={() => void handleOpenProjectFromApi(p)}
                      onRemoveFromList={canCreateProposal ? () => setRemoveConfirmProject(p) : undefined}
                    />
                  );
                })}
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-secondary-500 font-semibold text-sm">
                {search ? 'No customers match your search' : 'No customers yet'}
              </p>
              {!search && (
                <p className="text-xs text-secondary-400 mt-2">
                  Click <strong>+ Select Project</strong> to start from an existing Rayenna CRM Project.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <CustomerCard
                  key={c.id}
                  record={c}
                  isActive={c.id === activeId}
                  onOpen={() => handleOpen(c.id)}
                  onDelete={() => void handleDelete(c)}
                  onStatusChange={(s) => handleStatusChange(c, s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
