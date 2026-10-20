import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  loadCustomers,
  getActiveCustomer,
  getCustomer,
  switchActiveCustomer,
  STATUS_LABELS,
  STATUS_COLORS,
  artifactSummary,
  formatEmailForDisplay,
  getResolvedRoofLayout,
  costingLineCount,
  bomLineCount,
} from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import {
  getCurrentUserRole,
} from '../lib/apiClient';
import { loadProjectFromServer } from '../lib/projectLoadPipeline';
import { getServerSyncStatus, clearServerSyncStatus } from '../lib/serverSyncStatus';
import { ServerSyncBanner } from '../components/ServerSyncBanner';
import { ProposalContinueBar } from '../components/ProposalContinue';
import {
  ARTIFACT_COLORS,
  IconBolt,
  IconFile,
  IconGrid,
  IconLayout,
  IconList,
  IconPhone,
  IconPin,
  IconTrend,
  pageBanner,
} from '../components/ui/chrome';
import type { ReactNode } from 'react';

const NAVY_GOLD = 'pe-banner';

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(() => getActiveCustomer()?.id ?? null);
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => loadCustomers());
  const role = getCurrentUserRole();
  // Seed from sessionStorage so a sync done in CustomerWorkspace shows here too.
  const [serverSyncedAt, setServerSyncedAt] = useState<string | null>(() => {
    const id = getActiveCustomer()?.id;
    return id ? (getServerSyncStatus(id)?.syncedAt ?? null) : null;
  });
  const canCreateOrEdit = role != null && ['ADMIN', 'SALES'].includes(String(role).toUpperCase());

  const allCustomers = useMemo(
    () =>
      customers
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [customers],
  );
  const recentCustomers = useMemo(() => allCustomers.slice(0, 3), [allCustomers]);

  const activeCustomer: CustomerRecord | null =
    allCustomers.find((c) => c.id === activeCustomerId) ?? null;

  // Pick up markServerSynced from artifact saves (Costing/BOM/ROI/Proposal/Roof) when returning to Dashboard.
  useEffect(() => {
    const id = activeCustomerId;
    if (!id) {
      setServerSyncedAt(null);
      return;
    }
    setServerSyncedAt(getServerSyncStatus(id)?.syncedAt ?? null);
  }, [activeCustomerId, location.pathname]);

  // Re-fetch CRM project + artifacts so `projectStage` (and other CRM fields) match CRM after edits elsewhere.
  useEffect(() => {
    const id = activeCustomerId;
    if (!id) return;
    const rec = getCustomer(id);
    if (!rec?.master?.crmProjectId) return;
    let cancelled = false;
    void (async () => {
      const result = await loadProjectFromServer(id, { activate: true });
      if (cancelled) return;
      if (result.ok && result.record) {
        setServerSyncedAt(getServerSyncStatus(id)?.syncedAt ?? null);
        setCustomers(loadCustomers());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCustomerId]);

  const resolvedRoofLayout = getResolvedRoofLayout(activeCustomer);

  const artifactTiles = [
    {
      icon: IconGrid,
      title: 'Costing Sheet',
      description: 'Line-item cost breakdown with GST & margin',
      to: '/costing',
      saved: !!activeCustomer?.costing,
      savedAt: activeCustomer?.costing?.savedAt,
      summary: activeCustomer?.costing
        ? `${costingLineCount(activeCustomer.costing)} items · ${fmtINR(
            activeCustomer.costing.grandTotal ?? 0,
          )} (incl. GST)`
        : undefined,
    },
    {
      icon: IconList,
      title: 'Bill of Materials',
      description: 'Equipment list with specifications',
      to: '/bom',
      saved: !!activeCustomer?.bom,
      savedAt: activeCustomer?.bom?.savedAt,
      summary: activeCustomer?.bom
        ? `${bomLineCount(activeCustomer.bom)} line items`
        : undefined,
    },
    {
      icon: IconTrend,
      title: 'ROI Calculator',
      description: 'Payback period, 25-year savings & LCOE',
      to: '/roi',
      saved: !!activeCustomer?.roi,
      savedAt: activeCustomer?.roi?.savedAt,
      summary: activeCustomer?.roi?.result
        ? `Payback ${activeCustomer.roi.result.paybackYears.toFixed(1)} yrs · 25-yr savings ${fmtINR(activeCustomer.roi.result.totalSavings25Years)} · ROI ${activeCustomer.roi.result.roiPercent.toFixed(1)}%`
        : undefined,
    },
    {
      icon: IconLayout,
      title: 'Roof Layout',
      description: 'Roof segmentation and solar panel placement for proposals',
      to: '/ai-layout',
      saved: !!resolvedRoofLayout,
      savedAt: resolvedRoofLayout?.savedAt,
      summary: resolvedRoofLayout
        ? `Roof ${Number(resolvedRoofLayout.roof_area_m2).toFixed(1)} m² · ${Number(resolvedRoofLayout.usable_area_m2).toFixed(1)} m² usable · ${resolvedRoofLayout.panel_count} panels`
        : undefined,
    },
    {
      icon: IconFile,
      title: 'Proposal',
      description: 'Full techno-commercial proposal document',
      to: '/proposal',
      saved: !!activeCustomer?.proposal,
      savedAt: activeCustomer?.proposal?.generatedAt,
      summary: activeCustomer?.proposal
        ? `Ref: ${activeCustomer.proposal.refNumber} · ${activeCustomer.proposal.summary.slice(0, 80)}…`
        : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page card — mimics CRM PageCard */}
      <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden">
        <div className={pageBanner}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-white/85">
                Costing, BOM, ROI, and the proposal for the open project.
              </p>
            </div>
            <Link
              to="/customers"
              className="text-sm self-start sm:self-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-white/40 bg-white/15 text-white font-semibold hover:bg-white/25 min-h-[36px]"
            >
              {canCreateOrEdit
                ? (allCustomers.length > 0 ? `${allCustomers.length} Customer${allCustomers.length !== 1 ? 's' : ''}` : 'New Customer')
                : 'Projects'}
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          {/* Server sync confirmation — shown after background refresh or cross-device navigation */}
          {activeCustomer && serverSyncedAt && (
            <ServerSyncBanner
              syncedAt={serverSyncedAt}
              onDismiss={() => {
                clearServerSyncStatus();
                setServerSyncedAt(null);
              }}
            />
          )}

          {/* Active customer quick-access */}
          {activeCustomer ? (
            <div className={`mb-6 rounded-xl p-4 sm:p-5 flex flex-col gap-3 text-white ${NAVY_GOLD}`}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-white/75 mb-1">Open project</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white truncate">
                      {activeCustomer.master.name || 'Unnamed customer'}
                    </h2>
                    {typeof activeCustomer.proposalIndex === 'number' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-amber-100 border border-amber-200/50 font-semibold flex-shrink-0">
                        Proposal #{activeCustomer.proposalIndex}
                      </span>
                    )}
                  </div>
                  {activeCustomer.master.location && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-white/85 min-w-0">
                      <IconPin size={12} />
                      <span className="truncate">{activeCustomer.master.location}</span>
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/80">
                    {typeof activeCustomer.master.systemSizeKw === 'number' && activeCustomer.master.systemSizeKw > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <IconBolt size={12} />
                        <span className="font-medium text-white">{activeCustomer.master.systemSizeKw} kW system</span>
                      </span>
                    )}
                    {activeCustomer.master.segment && (
                      <span>{activeCustomer.master.segment}</span>
                    )}
                    {activeCustomer.master.projectStage && (
                      <span>{activeCustomer.master.projectStage}</span>
                    )}
                  </div>
                  {activeCustomer.master.phone || activeCustomer.master.email ? (
                    <p className="mt-1 text-[11px] text-white/80 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {activeCustomer.master.phone && (
                        <span className="inline-flex items-center gap-1">
                          <IconPhone size={12} />
                          {activeCustomer.master.phone}
                        </span>
                      )}
                      {activeCustomer.master.email && <span>{formatEmailForDisplay(activeCustomer.master.email)}</span>}
                    </p>
                  ) : null}
                </div>

                {/* Right: quick CRM snapshot badges */}
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {activeCustomer.master.customerNumber && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-black/25 border border-white/25 text-white font-medium">
                      Customer ID: {activeCustomer.master.customerNumber}
                    </span>
                  )}
                  {typeof activeCustomer.master.projectNumber === 'number' && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-black/25 border border-white/25 text-white font-medium">
                      Project #: {activeCustomer.master.projectNumber}
                    </span>
                  )}
                  {activeCustomer.master.salespersonName && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-black/25 border border-white/25 text-white font-medium">
                      Sales: {activeCustomer.master.salespersonName}
                    </span>
                  )}
                  {activeCustomer.master.panelType && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-black/25 border border-white/25 text-white font-medium">
                      Panel: {activeCustomer.master.panelType}
                    </span>
                  )}
                  {(() => {
                    const status = activeCustomer.status;
                    const label = STATUS_LABELS[status];
                    const base = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border shadow-sm';
                    let theme = '';
                    switch (status) {
                      case 'proposal-ready':
                        theme = 'bg-emerald-400 text-slate-900 border-emerald-200';
                        break;
                      case 'draft':
                        theme = 'bg-slate-200 text-slate-800 border-slate-300';
                        break;
                      case 'not-started':
                        theme = 'bg-slate-300/90 text-slate-800 border-slate-400';
                        break;
                      default:
                        theme = STATUS_COLORS[status];
                    }
                    return (
                      <span className={`${base} ${theme}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                        <span>{label}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Proposal progress bar for active customer */}
              {(() => {
                const completed = [
                  !!activeCustomer.costing,
                  !!activeCustomer.bom,
                  !!activeCustomer.roi,
                  !!activeCustomer.proposal,
                ].filter(Boolean).length;
                const pct = (completed / 4) * 100;
                return (
                  <div className="mt-4 pt-3 border-t border-white/15">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] text-white/80 font-medium">Proposal progress</p>
                      <p className="text-[11px] text-white font-semibold">{completed} / 4 artifacts complete</p>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: 'linear-gradient(to right, #fde68a, #eab308)' }}
                      />
                    </div>
                  </div>
                );
              })()}

              <ProposalContinueBar
                record={activeCustomer}
                appearance="dark"
                onContinue={(path) => navigate(path)}
              />

              <div className="pt-2 border-t border-white/15 mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-white/80 mr-1">
                  {artifactSummary(activeCustomer)}
                </span>
                <Link to="/costing" className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/35 bg-white/10 text-white hover:bg-white/20">Costing</Link>
                <Link to="/bom" className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/35 bg-white/10 text-white hover:bg-white/20">BOM</Link>
                <Link to="/roi" className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/35 bg-white/10 text-white hover:bg-white/20">ROI</Link>
                <Link to="/ai-layout" className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/35 bg-white/10 text-white hover:bg-white/20">Roof Layout</Link>
                <Link to="/proposal" className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/35 bg-white/10 text-white hover:bg-white/20">Proposal</Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border-2 border-dashed border-secondary-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-secondary-600">No active customer</p>
                <p className="text-xs text-secondary-400 mt-0.5">
                  Create or select a customer to start a proposal workflow
                </p>
              </div>
              <Link
                to="/customers"
                className="text-sm text-white font-semibold px-4 py-2 rounded-lg self-start flex-shrink-0 bg-[#0A9E87] hover:bg-[#087A6A]"
              >
                {canCreateOrEdit ? '+ New Customer' : 'View Projects'}
              </Link>
            </div>
          )}

          {/* CRM Project status indicator for active customer */}
          {activeCustomer?.master.projectStage && (
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wide">
                  Project Status:
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-50 text-secondary-700 border border-secondary-300 font-semibold">
                  {(() => {
                    const raw = (activeCustomer.master.projectStage || '').toUpperCase();
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
                      default: return activeCustomer.master.projectStage || 'Not set';
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
                  const raw = (activeCustomer.master.projectStage || '').toUpperCase();
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
          )}

          {/* Artifact tiles (2x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {artifactTiles.map((tile) => (
              <DashboardArtifactCard
                key={tile.title}
                tile={tile}
                onOpen={() => navigate(tile.to)}
              />
            ))}
          </div>

          {/* Recent customers */}
          {recentCustomers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-secondary-700 font-semibold text-sm uppercase tracking-wide">Recent Customers</h2>
                <Link to="/customers" className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">
                  View all {allCustomers.length} →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recentCustomers.map((c) => (
                  <RecentCustomerCard
                    key={c.id}
                    record={c}
                    isActive={c.id === activeCustomerId}
                    onSelect={() => {
                      switchActiveCustomer(c.id);
                      setActiveCustomerId(c.id);
                      setCustomers(loadCustomers());
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Production info footer */}
          <div className="rounded-xl border border-secondary-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-secondary-400">
              For CRM-linked projects, artifacts are also synced to the Rayenna CRM backend; standalone drafts remain stored locally in this browser.
            </p>
            <p className="text-xs text-secondary-400 sm:text-right flex-shrink-0">
              v1.0 · Rayenna Energy Pvt Ltd
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type ArtifactTile = {
  icon: (props: { size?: number }) => ReactNode;
  title: string;
  description: string;
  to: string;
  saved: boolean;
  savedAt?: string;
  summary?: string;
};

function DashboardArtifactCard({
  tile,
  onOpen,
}: {
  tile: ArtifactTile;
  onOpen: () => void;
}) {
  const { icon: TileIcon, title, description, saved, savedAt, summary } = tile;
  const tone =
    title === 'Bill of Materials' ? ARTIFACT_COLORS.BOM
    : title === 'ROI Calculator' ? ARTIFACT_COLORS.ROI
    : title === 'Roof Layout' ? ARTIFACT_COLORS.Roof
    : title === 'Proposal' ? ARTIFACT_COLORS.Proposal
    : ARTIFACT_COLORS.Costing;

  return (
    <div
      className="bg-white rounded-xl border border-secondary-200 hover:border-secondary-300 transition-colors overflow-hidden cursor-pointer group"
      style={{ borderTopWidth: 3, borderTopColor: tone }}
      onClick={onOpen}
    >
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${tone}18`, color: tone }}
            >
              <TileIcon size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-secondary-900">{title}</p>
              <p className="text-xs text-secondary-500 mt-0.5">{description}</p>
            </div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
              saved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-secondary-50 text-secondary-500 border-secondary-200'
            }`}
          >
            {saved ? '✓ Saved' : 'Pending'}
          </span>
        </div>

        {saved && savedAt && (
          <p className="text-[10px] text-secondary-400 mb-2">Last saved: {fmtDate(savedAt)}</p>
        )}
        {saved && summary && (
          <p className="text-xs text-secondary-500 bg-secondary-50 rounded-lg px-3 py-2 line-clamp-2">
            {summary}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-secondary-100 flex items-center justify-between">
          <span className="text-xs text-secondary-400 group-hover:text-secondary-600 transition-colors">
            {saved ? 'Open & edit →' : 'Start →'}
          </span>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary-100">
            →
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentCustomerCard({
  record,
  isActive,
  onSelect,
}: {
  record: CustomerRecord;
  isActive: boolean;
  onSelect: () => void;
}) {
  const dots = [
    { done: !!record.costing, color: ARTIFACT_COLORS.Costing },
    { done: !!record.bom, color: ARTIFACT_COLORS.BOM },
    { done: !!record.roi, color: ARTIFACT_COLORS.ROI },
    { done: !!record.proposal, color: ARTIFACT_COLORS.Proposal },
  ];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`bg-white rounded-xl border transition-colors p-4 text-left w-full ${
        isActive ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200 hover:border-secondary-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-secondary-900 truncate">{record.master.name}</p>
          {typeof record.proposalIndex === 'number' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex-shrink-0">
              #{record.proposalIndex}
            </span>
          )}
        </div>
        {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-bold flex-shrink-0">Active</span>}
      </div>
      {record.master.location && (
        <p className="text-xs text-secondary-400 truncate mb-2">{record.master.location}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {dots.map((d, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full border"
              style={{ background: d.done ? d.color : 'transparent', borderColor: d.color }}
            />
          ))}
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[record.status]}`}>
          {STATUS_LABELS[record.status]}
        </span>
      </div>
    </button>
  );
}
