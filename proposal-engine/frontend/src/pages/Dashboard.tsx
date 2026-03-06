import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  loadCustomers,
  getActiveCustomer,
  switchActiveCustomer,
  STATUS_LABELS,
  STATUS_COLORS,
  artifactSummary,
} from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import { getCurrentUserRole } from '../lib/apiClient';

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
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(() => getActiveCustomer()?.id ?? null);
  const role = getCurrentUserRole();
  const canCreateOrEdit = role != null && ['ADMIN', 'SALES'].includes(String(role).toUpperCase());

  const allCustomers    = loadCustomers()
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const recentCustomers = allCustomers.slice(0, 3);

  const activeCustomer: CustomerRecord | null =
    allCustomers.find((c) => c.id === activeCustomerId) ?? null;

  const artifactTiles = [
    {
      icon: '📊',
      title: 'Costing Sheet',
      description: 'Line-item cost breakdown with GST & margin',
      accentColor: '#0ea5e9',
      to: '/costing',
      saved: !!activeCustomer?.costing,
      savedAt: activeCustomer?.costing?.savedAt,
      summary: activeCustomer?.costing
        ? `${activeCustomer.costing.items?.length ?? 0} items · ${fmtINR(
            activeCustomer.costing.grandTotal ?? 0,
          )} (incl. GST)`
        : undefined,
    },
    {
      icon: '🔩',
      title: 'Bill of Materials',
      description: 'Equipment list with brand & specification',
      accentColor: '#eab308',
      to: '/bom',
      saved: !!activeCustomer?.bom,
      savedAt: activeCustomer?.bom?.savedAt,
      summary: activeCustomer?.bom
        ? `${activeCustomer.bom.rows?.length ?? 0} line items`
        : undefined,
    },
    {
      icon: '📈',
      title: 'ROI Calculator',
      description: 'Payback period, 25-year savings & LCOE',
      accentColor: '#10b981',
      to: '/roi',
      saved: !!activeCustomer?.roi,
      savedAt: activeCustomer?.roi?.savedAt,
      summary: activeCustomer?.roi?.result
        ? `Payback ${activeCustomer.roi.result.paybackYears.toFixed(1)} yrs · 25-yr savings ${fmtINR(activeCustomer.roi.result.totalSavings25Years)} · ROI ${activeCustomer.roi.result.roiPercent.toFixed(1)}%`
        : undefined,
    },
    {
      icon: '📄',
      title: 'Proposal',
      description: 'Full techno-commercial proposal document',
      accentColor: '#8b5cf6',
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
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header strip */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-2xl leading-none">
                ⚡
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                  Proposal Command Center
                </h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  Manage costing, BOM, ROI, and proposal generation for your solar project.
                </p>
              </div>
            </div>
            <Link
              to="/customers"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all self-start sm:self-auto flex-shrink-0"
            >
              👥 {canCreateOrEdit
                ? (allCustomers.length > 0 ? `${allCustomers.length} Customer${allCustomers.length !== 1 ? 's' : ''}` : 'New Customer')
                : 'Projects'}
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 text-xs text-primary-700 bg-gradient-to-r from-white to-primary-50 px-3 py-1.5 rounded-full font-bold shadow border-2 border-white/50 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Rayenna Proposal Engine · Production
          </div>

          {/* Active customer quick-access */}
          {activeCustomer ? (
            <div className="mb-6 rounded-2xl border-2 border-sky-200 bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-600/80 p-4 sm:p-5 text-white flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                {/* Left: Name + core info */}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-sky-200 uppercase tracking-[0.2em] mb-1">Active Project</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight truncate">
                      {activeCustomer.master.name || 'Unnamed customer'}
                    </h2>
                    {typeof activeCustomer.proposalIndex === 'number' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-amber-200 border border-amber-300/70 font-semibold flex-shrink-0">
                        Proposal #{activeCustomer.proposalIndex}
                      </span>
                    )}
                  </div>
                  {activeCustomer.master.location && (
                    <p className="text-xs sm:text-[13px] text-slate-100/80 mt-0.5 truncate">
                      📍 {activeCustomer.master.location}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-200/80">
                    {typeof activeCustomer.master.systemSizeKw === 'number' && activeCustomer.master.systemSizeKw > 0 && (
                      <span className="inline-flex items-center gap-1">
                        ⚡ <span className="font-semibold">{activeCustomer.master.systemSizeKw} kW system</span>
                      </span>
                    )}
                    {activeCustomer.master.segment && (
                      <span className="inline-flex items-center gap-1">
                        🎯 <span>{activeCustomer.master.segment}</span>
                      </span>
                    )}
                    {activeCustomer.master.projectStage && (
                      <span className="inline-flex items-center gap-1">
                        📌 <span>{activeCustomer.master.projectStage}</span>
                      </span>
                    )}
                  </div>
                  {activeCustomer.master.phone || activeCustomer.master.email ? (
                    <p className="mt-1 text-[11px] text-slate-200/80 flex flex-wrap gap-x-3 gap-y-0.5">
                      {activeCustomer.master.phone && <span>📞 {activeCustomer.master.phone}</span>}
                      {activeCustomer.master.email && <span>✉ {activeCustomer.master.email}</span>}
                    </p>
                  ) : null}
                </div>

                {/* Right: quick CRM snapshot badges */}
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {activeCustomer.master.customerNumber && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-500/60 font-semibold">
                      Customer ID: {activeCustomer.master.customerNumber}
                    </span>
                  )}
                  {typeof activeCustomer.master.projectNumber === 'number' && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-500/60 font-semibold">
                      Project #: {activeCustomer.master.projectNumber}
                    </span>
                  )}
                  {activeCustomer.master.salespersonName && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-500/60 font-semibold">
                      Sales: {activeCustomer.master.salespersonName}
                    </span>
                  )}
                  {activeCustomer.master.panelType && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-500/60 font-semibold">
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
                      case 'sent':
                        theme = 'bg-sky-500 text-white border-sky-300';
                        break;
                      case 'won':
                        theme = 'bg-emerald-500 text-white border-emerald-300';
                        break;
                      case 'lost':
                        theme = 'bg-rose-500 text-white border-rose-300';
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
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] text-white/80 font-medium">Proposal Progress</p>
                      <p className="text-[11px] text-white/90 font-semibold">{completed} / 4 artifacts complete</p>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: 'linear-gradient(to right, #38bdf8, #eab308)' }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Bottom: shortcuts */}
              <div className="pt-2 border-t border-white/10 mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-200/80 mr-1">
                  {artifactSummary(activeCustomer)}
                </span>
                <span className="w-px h-4 bg-white/15 hidden sm:inline-block" />
                <Link to="/costing" className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-300/60 transition-colors">
                  Costing
                </Link>
                <Link to="/bom" className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300/60 transition-colors">
                  BOM
                </Link>
                <Link to="/roi" className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-300/60 transition-colors">
                  ROI
                </Link>
                <Link to="/proposal" className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-300/60 transition-colors">
                  Proposal
                </Link>
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
                className="text-sm text-white font-semibold px-4 py-2 rounded-xl shadow transition-all self-start flex-shrink-0"
                style={{ background: '#0d1b3a' }}
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-amber-400/70 font-semibold">
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
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Production info footer */}
          <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
  icon: string;
  title: string;
  description: string;
  accentColor: string;
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
  const { icon, title, description, accentColor, saved, savedAt, summary } = tile;

  return (
    <div
      className="bg-white rounded-xl border border-secondary-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
      onClick={onOpen}
    >
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${accentColor}18` }}
            >
              {icon}
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
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: accentColor }}
          >
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
    { done: !!record.costing,  color: '#0ea5e9' },
    { done: !!record.bom,      color: '#eab308' },
    { done: !!record.roi,      color: '#10b981' },
    { done: !!record.proposal, color: '#8b5cf6' },
  ];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 text-left w-full ${
        isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'
      }`}
      style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#0d1b3a' : '#e2e8f0' }}
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
      {record.master.location && <p className="text-xs text-secondary-400 truncate mb-2">📍 {record.master.location}</p>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {dots.map((d, i) => (
            <span key={i} className="w-2 h-2 rounded-full border" style={{ background: d.done ? d.color : 'transparent', borderColor: d.color, opacity: d.done ? 1 : 0.35 }} />
          ))}
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[record.status]}`}>
          {STATUS_LABELS[record.status]}
        </span>
      </div>
    </button>
  );
}
