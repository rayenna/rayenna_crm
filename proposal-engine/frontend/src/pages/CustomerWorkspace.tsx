import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getCustomer,
  upsertCustomer,
  switchActiveCustomer,
  getActiveCustomerId,
  clearProposalArtifact,
  getWipKeysForCurrentUser,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../lib/customerStore';
import type { CustomerRecord, CustomerMaster } from '../lib/customerStore';
import {
  fetchProjectWithArtifacts,
  applyProposalEngineProjectDetail,
  getCurrentUserRole,
  canDeleteProposalEngineArtifacts,
  clearProjectProposalArtifact,
} from '../lib/apiClient';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────
// Edit customer modal (reserved for edit flow)
// ─────────────────────────────────────────────

export function EditCustomerModal({
  record,
  onSave,
  onCancel,
}: {
  record:   CustomerRecord;
  onSave:   (master: CustomerMaster) => void;
  onCancel: () => void;
}) {
  const [name,          setName]          = useState(record.master.name);
  const [location,      setLocation]      = useState(record.master.location);
  const [contactPerson, setContactPerson] = useState(record.master.contactPerson);
  const [phone,         setPhone]         = useState(record.master.phone);
  const [email,         setEmail]         = useState(record.master.email);
  const [err,           setErr]           = useState('');

  const handleSave = () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    onSave({ name: name.trim(), location: location.trim(), contactPerson: contactPerson.trim(), phone: phone.trim(), email: email.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-lg flex flex-col" style={{ maxHeight: 'min(96vh, 600px)' }}>
        <div className="px-6 py-4 flex-shrink-0 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">✏️</span>
            <h2 className="text-white font-extrabold text-base drop-shadow">Edit Customer Details</h2>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Customer / Company Name <span className="text-red-400">*</span></label>
              <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(''); }}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all" />
              {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Location / Site</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Contact Person</label>
              <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/60 flex-shrink-0 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">Cancel</button>
          <button onClick={handleSave} className="text-sm text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Artifact card
// ─────────────────────────────────────────────

function ArtifactCard({
  icon, title, description, accentColor, saved, savedAt, summary, onOpen,
  footerActions,
  footerHint,
}: {
  icon:        string;
  title:       string;
  description: string;
  accentColor: string;
  saved:       boolean;
  savedAt?:    string;
  summary?:    string;
  onOpen:      () => void;
  footerActions?: ReactNode;
  footerHint?: string;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-secondary-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
      onClick={onOpen}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${accentColor}18` }}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-bold text-secondary-900">{title}</p>
              <p className="text-xs text-secondary-500 mt-0.5">{description}</p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
            saved
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-secondary-50 text-secondary-500 border-secondary-200'
          }`}>
            {saved ? '✓ Saved' : 'Pending'}
          </span>
        </div>

        {saved && savedAt && (
          <p className="text-[10px] text-secondary-400 mb-2">Last saved: {fmtDate(savedAt)}</p>
        )}
        {saved && summary && (
          <p className="text-xs text-secondary-500 bg-secondary-50 rounded-lg px-3 py-2 line-clamp-2">{summary}</p>
        )}

        <div className="mt-3 pt-3 border-t border-secondary-100 flex items-center justify-between gap-3">
          {footerActions ? (
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
              {footerActions}
            </div>
          ) : (
            <>
              <span className="text-xs text-secondary-400 group-hover:text-secondary-600 transition-colors">
                {footerHint ?? (saved ? 'Open & edit →' : 'Start →')}
              </span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: accentColor }}
              >
                →
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main workspace page
// ─────────────────────────────────────────────

export default function CustomerWorkspace() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const activeId  = getActiveCustomerId();

  const [record, setRecord]   = useState<CustomerRecord | null>(() => id ? getCustomer(id) : null);
  const [hydrating, setHydrating] = useState(false);

  const refresh = useCallback(() => {
    if (id) setRecord(getCustomer(id));
  }, [id]);

  // When opening a CRM-linked project, fetch backend artifacts and merge into local record (once per id).
  useEffect(() => {
    if (!id) return;
    const rec = getCustomer(id);
    const projectId = rec?.master?.crmProjectId;
    if (!projectId) return;
    let cancelled = false;
    setHydrating(true);
    void (async () => {
      try {
        const res = await fetchProjectWithArtifacts(projectId);
        if (cancelled) return;
        const latest = getCustomer(id) ?? rec;
        const merged = applyProposalEngineProjectDetail(latest, res);
        upsertCustomer(merged);
        switchActiveCustomer(merged.id);
        setRecord(getCustomer(id)!);
      } catch {
        // Network or auth error — keep local data
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (!record) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-secondary-500 font-semibold">Customer not found</p>
        <Link to="/customers" className="mt-4 inline-block text-sm text-primary-600 hover:underline">← Back to Customers</Link>
      </div>
    );
  }

  const isActive = record.id === activeId;

  const handleSetActive = () => {
    switchActiveCustomer(record.id);
    refresh();
  };

  // Navigate to a work page and ensure this customer is active,
  // flushing stale work-in-progress data from any previous customer.
  const openWorkPage = (path: string) => {
    switchActiveCustomer(record.id);
    navigate(path);
  };

  const role = getCurrentUserRole();
  const canWrite = role != null && ['ADMIN', 'SALES'].includes(String(role).toUpperCase());
  const canDeleteOnServer = canDeleteProposalEngineArtifacts();

  const handleClearProposal = async () => {
    if (!canDeleteOnServer) return;
    const ok = window.confirm('Clear the saved proposal for this project? This cannot be undone.');
    if (!ok) return;

    // Clear locally first so UI updates immediately.
    clearProposalArtifact(record.id);
    try {
      localStorage.removeItem(getWipKeysForCurrentUser().proposalHtml);
    } catch {
      // ignore
    }
    refresh();

    // Best-effort: clear server-side proposal for CRM-linked projects.
    if (record.master.crmProjectId) {
      try {
        await clearProjectProposalArtifact(record.master.crmProjectId);
      } catch {
        // ignore; backend enforcement still applies
      }
    }
  };

  const artifacts = [
    {
      icon:        '📊',
      title:       'Costing Sheet',
      description: 'Line-item cost breakdown with GST & margin',
      accentColor: '#0ea5e9',
      to:          '/costing',
      saved:       !!record.costing,
      savedAt:     record.costing?.savedAt,
      summary:     record.costing
        ? `${record.costing.items.length} items · ${record.costing.systemSizeKw > 0 ? `${record.costing.systemSizeKw} kW · ` : ''}${fmtINR(record.costing.grandTotal)} (incl. GST)`
        : undefined,
    },
    {
      icon:        '🔩',
      title:       'Bill of Materials',
      description: 'Equipment list with specifications',
      accentColor: '#eab308',
      to:          '/bom',
      saved:       !!record.bom,
      savedAt:     record.bom?.savedAt,
      summary:     record.bom
        ? `${record.bom.rows.length} line items`
        : undefined,
    },
    {
      icon:        '📈',
      title:       'ROI Calculator',
      description: 'Payback period, 25-year savings & LCOE',
      accentColor: '#10b981',
      to:          '/roi',
      saved:       !!record.roi,
      savedAt:     record.roi?.savedAt,
      summary:     record.roi
        ? `Payback ${record.roi.result.paybackYears.toFixed(1)} yrs · 25-yr savings ${fmtINR(record.roi.result.totalSavings25Years)} · ROI ${record.roi.result.roiPercent.toFixed(1)}%`
        : undefined,
    },
    {
      icon:        '📄',
      title:       'Proposal',
      description: 'Full techno-commercial proposal document',
      accentColor: '#8b5cf6',
      to:          '/proposal',
      saved:       !!record.proposal,
      savedAt:     record.proposal?.generatedAt,
      summary:     record.proposal
        ? `Ref: ${record.proposal.refNumber} · ${record.proposal.summary.slice(0, 80)}…`
        : undefined,
      footerHint:  canWrite ? 'Open & edit →' : 'View →',
      footerActions: record.proposal && canWrite ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openWorkPage('/proposal')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Edit
          </button>
          {canDeleteOnServer && (
            <button
              type="button"
              onClick={() => void handleClearProposal()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      ) : undefined,
    },
  ];

  const completedCount = artifacts.filter((a) => a.saved).length;
  const progressPct    = (completedCount / 4) * 100;

  return (
    <>
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none flex-shrink-0">👤</div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">{record.master.name}</h1>
                  {hydrating && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white/90 border border-white/30 font-medium flex items-center gap-1">
                      <span className="w-2.5 h-2.5 border border-white/50 border-t-white rounded-full animate-spin" />
                      Syncing from CRM…
                    </span>
                  )}
                  {isActive && !hydrating && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/40 font-semibold">Active</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[record.status]}`}>
                    {STATUS_LABELS[record.status]}
                  </span>
                </div>
                {record.master.location && (
                  <p className="text-white/80 text-sm">📍 {record.master.location}</p>
                )}
                {typeof record.master.systemSizeKw === 'number' && record.master.systemSizeKw > 0 && (
                  <p className="text-white/80 text-xs mt-0.5">
                    ⚡ {record.master.systemSizeKw} kW system
                  </p>
                )}
                {(record.master.contactPerson || record.master.phone) && (
                  <p className="text-white/70 text-xs mt-0.5">
                    {record.master.contactPerson}{record.master.phone ? ` · ${record.master.phone}` : ''}
                    {record.master.email ? ` · ${record.master.email}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 w-full sm:w-auto flex-shrink-0">
              {!isActive && (
                <button
                  onClick={handleSetActive}
                  className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-3 py-2 sm:py-1.5 rounded-lg transition-all min-h-[36px] sm:min-h-0"
                >
                  ⚡ Set Active
                </button>
              )}
              <Link
                to="/customers"
                className={`flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-3 py-2 sm:py-1.5 rounded-lg transition-all min-h-[36px] sm:min-h-0 ${!isActive ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                ← All Customers
              </Link>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/70 font-medium">Proposal Progress</p>
              <p className="text-xs text-white/90 font-semibold">{completedCount} / 4 artifacts complete</p>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(to right, #38bdf8, #eab308)' }}
              />
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

          {/* Project Status (from Rayenna CRM) */}
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wide">Project Status:</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-amber-400/70 font-semibold">
                {(() => {
                  const raw = (record.master.projectStage || '').toUpperCase();
                  switch (raw) {
                    case 'LEAD': return 'Lead';
                    case 'SITE_SURVEY': return 'Site Survey';
                    case 'PROPOSAL': return 'Proposal';
                    case 'CONFIRMED': return 'Confirmed Order';
                    case 'UNDER_INSTALLATION': return 'Under Installation';
                    case 'SUBMITTED_FOR_SUBSIDY': return 'Submitted for Subsidy';
                    case 'COMPLETED': return 'Completed';
                    case 'COMPLETED_SUBSIDY_CREDITED': return 'Completed – Subsidy Credited';
                    case 'LOST': return 'Lost';
                    default: return record.master.projectStage || 'Not set';
                  }
                })()}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[
                'LEAD',
                'SITE_SURVEY',
                'PROPOSAL',
                'CONFIRMED',
                'UNDER_INSTALLATION',
                'SUBMITTED_FOR_SUBSIDY',
                'COMPLETED',
                'COMPLETED_SUBSIDY_CREDITED',
                'LOST',
              ].map((s) => {
                const raw = (record.master.projectStage || '').toUpperCase();
                const isActiveStage = raw === s;
                const label =
                  s === 'LEAD' ? 'Lead' :
                  s === 'SITE_SURVEY' ? 'Site Survey' :
                  s === 'PROPOSAL' ? 'Proposal' :
                  s === 'CONFIRMED' ? 'Confirmed Order' :
                  s === 'UNDER_INSTALLATION' ? 'Under Installation' :
                  s === 'SUBMITTED_FOR_SUBSIDY' ? 'Submitted for Subsidy' :
                  s === 'COMPLETED' ? 'Completed' :
                  s === 'COMPLETED_SUBSIDY_CREDITED' ? 'Completed – Subsidy Credited' :
                  'Lost';
                return (
                  <span
                    key={s}
                    className={`text-[10px] px-3 py-1 rounded-full border font-semibold cursor-default ${
                      isActiveStage
                        ? 'bg-blue-50 text-blue-700 border-blue-400 ring-2 ring-blue-200'
                        : 'bg-secondary-50 text-secondary-400 border-secondary-200'
                    }`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Workflow hint */}
          {completedCount < 4 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">Recommended workflow</p>
              <div className="flex items-center gap-2 flex-wrap">
                {['1. Costing Sheet', '→ 2. BOM', '→ 3. ROI Calculator', '→ 4. Generate Proposal'].map((step, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded font-medium ${
                    i < completedCount ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{step}</span>
                ))}
              </div>
              <p className="mt-2 text-amber-700">
                Work through each step in order. When you click <strong>Generate &amp; Save Proposal</strong> on the Proposal page, all four artifacts are saved together under this customer.
              </p>
            </div>
          )}

          {completedCount === 4 && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              <p className="font-semibold">All artifacts saved ✓</p>
              <p className="mt-0.5">The complete proposal package is saved under this customer. Open the Proposal card below to view, regenerate, or export.</p>
            </div>
          )}

          {/* Active customer banner */}
          {!isActive && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> This is not the currently active customer. The four work pages (Costing, BOM, ROI, Proposal) will use the active customer's data.
              </p>
              <button
                onClick={handleSetActive}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg flex-shrink-0"
                style={{ background: '#0d1b3a' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
              >
                Make Active
              </button>
            </div>
          )}

          {/* Artifact cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {artifacts.map((a) => (
              <ArtifactCard
                key={a.title}
                {...a}
                onOpen={() => openWorkPage(a.to)}
              />
            ))}
          </div>

          {/* Metadata footer */}
          <div className="border-t border-primary-100 pt-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-secondary-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span>Created: {fmtDate(record.createdAt)}</span>
                <span>·</span>
                <span>Last updated: {fmtDate(record.updatedAt)}</span>
                <span>·</span>
                <span className="font-mono text-secondary-300">{record.id}</span>
              </div>
            </div>
            {/* CRM integration note */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] text-blue-600 leading-relaxed">
              <p className="font-semibold text-blue-700 mb-1">Rayenna CRM Integration (planned)</p>
              <p>
                When integrated, this workspace will be linked to a <strong>Rayenna CRM Project</strong>.
                Customer details (name, site, capacity, tariff) will auto-populate from the CRM Customer &amp; Project Master.
                All four artifacts — Costing Sheet, BOM, ROI, and Proposal — will be saved as documents under the CRM Project's Artifacts tab,
                accessible to all authorised users via their CRM access privileges.
                The generated Proposal PDF/DOCX will also appear in the Project Documents section.
              </p>
              {record.master.crmProjectId && (
                <p className="mt-1 font-mono text-blue-500">CRM Project ID: {record.master.crmProjectId}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
