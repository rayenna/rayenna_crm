import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadCustomers,
  createCustomer,
  deleteCustomer,
  switchActiveCustomer,
  getActiveCustomerId,
  STATUS_LABELS,
  STATUS_COLORS,
  artifactSummary,
  upsertCustomer,
} from '../lib/customerStore';
import type { CustomerRecord, CustomerMaster, ProposalStatus } from '../lib/customerStore';

// ─────────────────────────────────────────────
// New Customer Modal
// ─────────────────────────────────────────────

function NewCustomerModal({
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
  onSetActive,
  onDelete,
  onStatusChange,
}: {
  record:         CustomerRecord;
  isActive:       boolean;
  onOpen:         () => void;
  onSetActive:    () => void;
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
              <p className="text-sm font-bold text-secondary-900 truncate">{record.master.name}</p>
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-semibold flex-shrink-0">
                  Active
                </span>
              )}
              <StatusBadge record={record} onChange={onStatusChange} />
            </div>
            {record.master.location && (
              <p className="text-xs text-secondary-500 mb-2 truncate">📍 {record.master.location}</p>
            )}
            {record.master.contactPerson && (
              <p className="text-xs text-secondary-400 truncate">👤 {record.master.contactPerson}{record.master.phone ? ` · ${record.master.phone}` : ''}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isActive && (
              <button
                onClick={onSetActive}
                title="Set as active customer"
                className="text-xs text-primary-600 hover:text-primary-800 border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors font-semibold min-h-[32px]"
              >
                Select
              </button>
            )}
            <button
              onClick={onOpen}
              title="Open customer workspace"
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

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="border-t border-red-100 bg-red-50/80 px-4 py-3 flex items-center justify-between gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-red-700 font-medium">Delete <strong>{record.master.name}</strong>? All artifacts will be lost.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-secondary-500 px-3 py-1 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">Cancel</button>
            <button onClick={onDelete} className="text-xs text-white font-semibold px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 transition-colors">Delete</button>
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
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => loadCustomers());
  const [showNew, setShowNew]     = useState(false);
  const [search, setSearch]       = useState('');
  const activeId                  = getActiveCustomerId();

  const refresh = useCallback(() => setCustomers(loadCustomers()), []);

  const handleCreate = (master: CustomerMaster) => {
    const record = createCustomer(master);
    switchActiveCustomer(record.id);
    setShowNew(false);
    navigate(`/customers/${record.id}`);
  };

  const handleOpen = (id: string) => {
    navigate(`/customers/${id}`);
  };

  const handleSetActive = (id: string) => {
    switchActiveCustomer(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    refresh();
  };

  const handleStatusChange = (record: CustomerRecord, status: ProposalStatus) => {
    upsertCustomer({ ...record, status, updatedAt: new Date().toISOString() });
    refresh();
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.master.name.toLowerCase().includes(q) ||
      c.master.location.toLowerCase().includes(q) ||
      c.master.contactPerson.toLowerCase().includes(q)
    );
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const statCounts = {
    total:    customers.length,
    draft:    customers.filter((c) => c.status === 'draft').length,
    ready:    customers.filter((c) => c.status === 'proposal-ready').length,
    won:      customers.filter((c) => c.status === 'won').length,
  };

  return (
    <>
      {showNew && (
        <NewCustomerModal
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
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
                  Select a customer to start a proposal workflow — Costing → BOM → ROI → Proposal
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNew(true)}
              title="Standalone mode: manually enter customer details. In CRM mode this will be replaced by a Project picker filtered to your assigned accounts."
              className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all w-full sm:w-auto flex-shrink-0"
            >
              + New Customer
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total',           value: statCounts.total,  color: 'text-secondary-700 bg-secondary-50 border-secondary-200' },
              { label: 'Drafts',          value: statCounts.draft,  color: 'text-secondary-600 bg-secondary-50 border-secondary-200' },
              { label: 'Proposal Ready',  value: statCounts.ready,  color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Won',             value: statCounts.won,    color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="mb-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or contact…"
              className="w-full border border-secondary-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Future CRM integration note */}
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-700 space-y-1.5">
            <p className="font-semibold text-blue-800">Rayenna CRM Integration (planned)</p>
            <p>
              The <strong>+ New Customer</strong> button will be replaced by a <strong>Select Project</strong> picker
              that lists only the CRM Projects assigned to the logged-in salesperson based on their access privileges.
            </p>
            <p>
              Customer name, site address, system capacity, tariff, and contact details will auto-populate
              from the selected CRM Project. All four artifacts saved here will be written back to the
              CRM Project's Artifacts / Documents tab automatically.
            </p>
          </div>

          {/* Customer list */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-secondary-500 font-semibold text-sm">
                {search ? 'No customers match your search' : 'No customers yet'}
              </p>
              {!search && (
                <p className="text-xs text-secondary-400 mt-2">
                  Click <strong>+ New Customer</strong> to enter details manually.
                  <br />
                  <span className="text-blue-500">In CRM mode, this will be a Project picker showing your assigned accounts.</span>
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
                  onSetActive={() => handleSetActive(c.id)}
                  onDelete={() => handleDelete(c.id)}
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
