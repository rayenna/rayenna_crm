/** Reserved for the manual "add customer" flow (standalone mode without CRM integration). */
import { useState } from 'react';
import type { CustomerMaster } from '../lib/customerStore';

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
