import { Link } from 'react-router-dom';
import {
  loadCustomers,
  getActiveCustomer,
  switchActiveCustomer,
  STATUS_LABELS,
  STATUS_COLORS,
  artifactSummary,
} from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';

const modules = [
  {
    title: 'Costing Sheets',
    description: 'Build detailed line-item cost breakdowns for any project or product.',
    icon: '📊',
    to: '/costing',
    accentColor: '#0ea5e9',   // sky blue
    iconBg: '#e0f2fe',
    hoverText: '#0369a1',
  },
  {
    title: 'Bill of Materials',
    description: 'Manage parts, quantities, suppliers, and unit prices in one place.',
    icon: '🔩',
    to: '/bom',
    accentColor: '#eab308',   // gold / amber
    iconBg: '#fef9c3',
    hoverText: '#a16207',
  },
  {
    title: 'AI Proposals',
    description: 'Generate professional client proposals with AI-assisted content.',
    icon: '🤖',
    to: '/proposal',
    accentColor: '#8b5cf6',   // violet
    iconBg: '#ede9fe',
    hoverText: '#6d28d9',
  },
  {
    title: 'ROI Calculator',
    description: 'Calculate payback period, NPV, and return on investment automatically.',
    icon: '📈',
    to: '/roi',
    accentColor: '#10b981',   // emerald
    iconBg: '#d1fae5',
    hoverText: '#065f46',
  },
];

export default function Dashboard() {
  const activeCustomer  = getActiveCustomer();
  const allCustomers    = loadCustomers()
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const recentCustomers = allCustomers.slice(0, 3);

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
                  Proposal Engine
                </h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  Standalone module for solar costing, BOMs, AI proposals, and ROI
                </p>
              </div>
            </div>
            <Link
              to="/customers"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all self-start sm:self-auto flex-shrink-0"
            >
              👥 {allCustomers.length > 0 ? `${allCustomers.length} Customer${allCustomers.length !== 1 ? 's' : ''}` : 'New Customer'}
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 text-xs text-primary-700 bg-gradient-to-r from-white to-primary-50 px-3 py-1.5 rounded-full font-bold shadow border-2 border-white/50 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Proposal Engine Dev Environment Running
          </div>

          {/* Active customer quick-access */}
          {activeCustomer ? (
            <div className="mb-6 rounded-xl border-2 border-sky-200 bg-sky-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-sky-700 uppercase tracking-wide mb-1">Active Customer</p>
                <p className="text-sm font-bold text-secondary-900">{activeCustomer.master.name}</p>
                {activeCustomer.master.location && (
                  <p className="text-xs text-secondary-500">📍 {activeCustomer.master.location}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[activeCustomer.status]}`}>
                    {STATUS_LABELS[activeCustomer.status]}
                  </span>
                  <span className="text-[10px] text-secondary-400">{artifactSummary(activeCustomer)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <Link to={`/customers/${activeCustomer.id}`}
                  className="text-xs text-white font-semibold px-4 py-2 rounded-xl shadow transition-all"
                  style={{ background: '#0d1b3a' }}
                >
                  Open Workspace →
                </Link>
                <Link to="/costing" className="text-xs text-sky-700 font-medium border border-sky-300 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
                  Costing
                </Link>
                <Link to="/bom" className="text-xs text-sky-700 font-medium border border-sky-300 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
                  BOM
                </Link>
                <Link to="/roi" className="text-xs text-sky-700 font-medium border border-sky-300 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
                  ROI
                </Link>
                <Link to="/proposal" className="text-xs text-sky-700 font-medium border border-sky-300 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
                  Proposal
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border-2 border-dashed border-secondary-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-secondary-600">No active customer</p>
                <p className="text-xs text-secondary-400 mt-0.5">Create or select a customer to start a proposal workflow</p>
              </div>
              <Link to="/customers"
                className="text-sm text-white font-semibold px-4 py-2 rounded-xl shadow transition-all self-start flex-shrink-0"
                style={{ background: '#0d1b3a' }}
              >
                + New Customer
              </Link>
            </div>
          )}

          {/* Module cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {modules.map((m) => (
              <Link
                key={m.title}
                to={m.to}
                className="relative bg-white rounded-xl border border-secondary-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 group overflow-hidden"
                style={{ borderLeftWidth: '4px', borderLeftColor: m.accentColor }}
              >
                <div
                  className="absolute top-0 left-0 w-20 h-20 rounded-br-full opacity-10 pointer-events-none"
                  style={{ background: m.accentColor }}
                />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 shadow-sm"
                  style={{ background: m.iconBg }}
                >
                  {m.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1.5" style={{ color: '#1e293b' }}>{m.title}</h3>
                <p className="text-secondary-500 text-xs leading-relaxed">{m.description}</p>
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: m.accentColor }}
                />
              </Link>
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
                  <RecentCustomerCard key={c.id} record={c} isActive={c.id === activeCustomer?.id} />
                ))}
              </div>
            </div>
          )}

          {/* Env status */}
          <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-5">
            <h2 className="text-secondary-700 font-semibold text-sm mb-4 uppercase tracking-wide">
              Environment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <EnvRow label="Frontend" value="localhost:5174" />
              <EnvRow label="Backend"  value="localhost:5001" />
              <EnvRow label="Database" value="SQLite · dev.db" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentCustomerCard({ record, isActive }: { record: CustomerRecord; isActive: boolean }) {
  const dots = [
    { done: !!record.costing,  color: '#0ea5e9' },
    { done: !!record.bom,      color: '#eab308' },
    { done: !!record.roi,      color: '#10b981' },
    { done: !!record.proposal, color: '#8b5cf6' },
  ];
  return (
    <Link
      to={`/customers/${record.id}`}
      onClick={() => switchActiveCustomer(record.id)}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 block ${isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#0d1b3a' : '#e2e8f0' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-secondary-900 truncate">{record.master.name}</p>
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
    </Link>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
      <div>
        <p className="text-secondary-400 text-xs uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-secondary-800 text-sm font-mono font-medium">{value}</p>
      </div>
    </div>
  );
}
