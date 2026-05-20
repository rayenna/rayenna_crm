import React, { useState } from 'react';
import { CATEGORY_COLORS, snapCategory, sheetGrandTotal } from '../lib/costingConstants';
import type { Category, SavedSheet } from '../lib/costingConstants';
import type { CostingTemplate } from './types';
import { fmt } from './format';
import { templateTotal } from './builtInTemplates';

export function SaveSheetModal({
  onSave,
  onCancel,
  itemCount,
  defaultName,
}: {
  onSave:      (name: string, description: string) => void;
  onCancel:    () => void;
  itemCount:   number;
  defaultName: string;
}) {
  const [name, setName]   = useState(defaultName);
  const [desc, setDesc]   = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Please enter a sheet name.'); return; }
    onSave(name.trim(), desc.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Save Costing Sheet</h2>
              <p className="text-white/80 text-xs">{itemCount} line item{itemCount !== 1 ? 's' : ''} will be saved</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Sheet Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Sharma Residence — 5 kW"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Notes <span className="text-secondary-400 font-normal">(optional)</span>
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Revised quote after site visit"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/60 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-sm text-white font-semibold px-5 py-2 rounded-xl shadow-lg transition-all"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
          >
            Save Sheet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Saved Sheets Panel
// ─────────────────────────────────────────────

export function SavedSheetsPanel({
  sheets,
  onLoad,
  onDelete,
  onClose,
}: {
  sheets:   SavedSheet[];
  onLoad:   (s: SavedSheet, mode: 'append' | 'replace') => void;
  onDelete: (id: string) => void;
  onClose:  () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadTarget, setLoadTarget]       = useState<SavedSheet | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📂</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Saved Costing Sheets</h2>
              <p className="text-white/80 text-xs">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''} saved</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Sheet list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {sheets.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-secondary-200 p-8 text-center">
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm text-secondary-500 font-medium">No saved sheets yet</p>
              <p className="text-xs text-secondary-400 mt-1">
                Fill in your costing sheet and click <strong>Save Sheet</strong> to save it here
              </p>
            </div>
          ) : (
            sheets
              .slice()
              .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
              .map((s) => {
                const total = sheetGrandTotal(s.items, s.showGst);
                const date  = new Date(s.savedAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                });
                const time  = new Date(s.savedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                });
                const cats  = [...new Set(s.items.map((i) => i.category))];

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-xl border border-secondary-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    style={{ borderLeftWidth: '4px', borderLeftColor: '#0ea5e9' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary-800 truncate">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-secondary-500 mt-0.5 truncate">{s.description}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap mt-2">
                        <span className="text-xs text-secondary-400">{s.items.length} items</span>
                        {total > 0 && (
                          <span className="text-xs font-semibold tabular-nums" style={{ color: '#0d1b3a' }}>
                            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            {s.showGst && <span className="text-secondary-400 font-normal"> incl. GST</span>}
                          </span>
                        )}
                        <span className="text-xs text-secondary-400">{date} · {time}</span>
                        <div className="flex gap-1">
                          {cats.slice(0, 4).map((c) => (
                            <span key={c} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[c as Category] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {c}
                            </span>
                          ))}
                          {cats.length > 4 && <span className="text-[9px] text-secondary-400">+{cats.length - 4}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        title="Delete sheet"
                        className="p-1.5 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        🗑
                      </button>
                      <button
                        onClick={() => setLoadTarget(s)}
                        className="text-xs text-white font-semibold px-4 py-1.5 rounded-lg shadow transition-all"
                        style={{ background: '#0d1b3a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
                      >
                        Load →
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Load mode picker */}
        {loadTarget && (
          <div className="border-t border-primary-100 bg-primary-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-secondary-600 mb-3">
              Load <strong className="text-primary-800">{loadTarget.name}</strong> — how should it be added?
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setLoadTarget(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'append'); setLoadTarget(null); onClose(); }}
                className="text-sm text-secondary-700 font-medium px-4 py-1.5 rounded-lg border border-secondary-300 hover:bg-secondary-100 transition-colors"
              >
                + Append to existing
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'replace'); setLoadTarget(null); onClose(); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl shadow transition-all"
                style={{ background: '#0d1b3a' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
              >
                Replace all rows
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="border-t border-red-100 bg-red-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-red-700 mb-3 font-medium">Delete this sheet? This cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 shadow transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Save Template Modal
// ─────────────────────────────────────────────

export function SaveTemplateModal({
  onSave,
  onCancel,
  itemCount,
}: {
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
  itemCount: number;
}) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [error, setError]       = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Please enter a template name.'); return; }
    onSave(name.trim(), desc.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">💾</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Save as Template</h2>
              <p className="text-white/80 text-xs">{itemCount} line item{itemCount !== 1 ? 's' : ''} will be saved</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. 50 kW Commercial — Standard"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
              style={{ '--tw-ring-color': '#0d1b3a22' } as React.CSSProperties}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Description <span className="text-secondary-400 font-normal">(optional)</span>
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Rooftop system with Waaree modules and Solis inverter"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/60 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-sm text-white font-semibold px-5 py-2 rounded-xl shadow-lg transition-all"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Templates Panel
// ─────────────────────────────────────────────

export function TemplatesPanel({
  templates,
  onLoad,
  onDelete,
  onClose,
  canDeleteTemplates,
}: {
  templates: CostingTemplate[];
  onLoad: (t: CostingTemplate, mode: 'append' | 'replace') => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  canDeleteTemplates: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadTarget, setLoadTarget]       = useState<CostingTemplate | null>(null);

  const builtIn   = templates.filter((t) => t.isBuiltIn);
  const userSaved = templates.filter((t) => !t.isBuiltIn);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Costing Templates</h2>
              <p className="text-white/80 text-xs">
                {userSaved.length} saved · {builtIn.length} built-in starters
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Template list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">

          {/* User templates */}
          {userSaved.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-secondary-500 uppercase tracking-widest mb-3">Your Saved Templates</h3>
              <div className="space-y-3">
                {userSaved.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onLoad={() => setLoadTarget(t)}
                    onDelete={() => setConfirmDelete(t.id)}
                    canDeleteTemplates={canDeleteTemplates}
                  />
                ))}
              </div>
            </section>
          )}

          {userSaved.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-secondary-200 p-6 text-center">
              <p className="text-2xl mb-2">💾</p>
              <p className="text-sm text-secondary-500 font-medium">No saved templates yet</p>
              <p className="text-xs text-secondary-400 mt-1">Fill in your costing sheet and click <strong>Save as Template</strong></p>
            </div>
          )}

          {/* Built-in starters */}
          <section>
            <h3 className="text-xs font-bold text-secondary-500 uppercase tracking-widest mb-3">
              Built-in Starters
              <span className="ml-2 text-[10px] text-secondary-400 font-normal normal-case">Ready-made Rayenna solar templates</span>
            </h3>
            <div className="space-y-3">
              {builtIn.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onLoad={() => setLoadTarget(t)}
                  onDelete={() => {}}
                  canDeleteTemplates={false}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Load mode picker */}
        {loadTarget && (
          <div className="border-t border-primary-100 bg-primary-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-secondary-600 mb-3">
              Load <strong className="text-primary-800">{loadTarget.name}</strong> — how should it be added?
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setLoadTarget(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'append'); setLoadTarget(null); onClose(); }}
                className="text-sm text-secondary-700 font-medium px-4 py-1.5 rounded-lg border border-secondary-300 hover:bg-secondary-100 transition-colors"
              >
                + Append to existing
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'replace'); setLoadTarget(null); onClose(); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl shadow transition-all"
                style={{ background: '#0d1b3a' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
              >
                Replace all rows
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="border-t border-red-100 bg-red-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-red-700 mb-3 font-medium">Delete this template? This cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 shadow transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TemplateCard({
  template,
  onLoad,
  onDelete,
  canDeleteTemplates,
}: {
  template: CostingTemplate;
  onLoad: () => void;
  onDelete: () => void;
  canDeleteTemplates: boolean;
}) {
  const total    = templateTotal(template.items);
  const date     = new Date(template.savedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const cats     = [...new Set(template.items.map((i) => i.category))];

  return (
    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderLeftWidth: '4px', borderLeftColor: '#0d1b3a' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-secondary-800 truncate">{template.name}</p>
          {template.isBuiltIn && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 border border-primary-200 font-medium flex-shrink-0">
              Built-in
            </span>
          )}
        </div>
        {template.description && (
          <p className="text-xs text-secondary-500 mb-2 truncate">{template.description}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-secondary-400">{template.items.length} items</span>
          {total > 0 && (
            <span className="text-xs text-primary-700 font-semibold tabular-nums">
              ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          )}
          <span className="text-xs text-secondary-400">{date}</span>
          <div className="flex gap-1">
            {cats.slice(0, 4).map((c) => (
              <span key={c} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[c as Category] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {c}
              </span>
            ))}
            {cats.length > 4 && <span className="text-[9px] text-secondary-400">+{cats.length - 4}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!template.isBuiltIn && canDeleteTemplates && (
          <button
            onClick={onDelete}
            title="Delete template"
            className="p-1.5 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            🗑
          </button>
        )}
        <button
          onClick={onLoad}
          className="text-xs text-white font-semibold px-4 py-1.5 rounded-lg shadow transition-all"
          style={{ background: '#0d1b3a' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
        >
          Load →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Excel import types
// ─────────────────────────────────────────────

interface ImportRow {
  category:      string;
  itemName:      string;
  specification: string;
  quantity:      string;
  unitCost:      string;
  error?: string;   // set if row has a validation issue
}

export function ImportModal({
  rows,
  onConfirm,
  onCancel,
}: {
  rows: ImportRow[];
  onConfirm: (mode: 'append' | 'replace') => void;
  onCancel: () => void;
}) {
  const validCount   = rows.filter((r) => !r.error).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📥</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Import Preview</h2>
              <p className="text-white/80 text-xs">
                {validCount} valid row{validCount !== 1 ? 's' : ''}
                {invalidCount > 0 && (
                  <span className="text-amber-300 ml-2">· {invalidCount} with issues (will be skipped)</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white/70 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b-2 border-primary-200" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
                <th className="px-3 py-2.5 text-left font-semibold text-white uppercase tracking-wide w-28">Category</th>
                <th className="px-3 py-2.5 text-left font-semibold text-white uppercase tracking-wide">Item Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-white uppercase tracking-wide">Specification</th>
                <th className="px-3 py-2.5 text-right font-semibold text-white uppercase tracking-wide w-20">Qty</th>
                <th className="px-3 py-2.5 text-right font-semibold text-white uppercase tracking-wide w-28">Unit Cost</th>
                <th className="px-3 py-2.5 text-right font-semibold text-white uppercase tracking-wide w-28">Total</th>
                <th className="px-3 py-2.5 w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const snapped = snapCategory(row.category, row.itemName);
                const qty     = parseFloat(row.quantity) || 0;
                const uc      = parseFloat(row.unitCost)  || 0;
                const total   = qty * uc;
                const isErr   = !!row.error;

                return (
                  <tr
                    key={i}
                    className={`border-b border-secondary-100 ${isErr ? 'bg-amber-50/60' : 'hover:bg-primary-50/30'}`}
                  >
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[snapped]}`}>
                        {snapped}
                      </span>
                    </td>
                    <td className={`px-3 py-2 font-medium ${isErr ? 'text-amber-700' : 'text-secondary-800'}`}>
                      {row.itemName || <span className="text-secondary-400 italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-secondary-500 italic">
                      {row.specification || <span className="text-secondary-300 not-italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-secondary-700 tabular-nums">{row.quantity}</td>
                    <td className="px-3 py-2 text-right text-secondary-700 tabular-nums">
                      {uc > 0 ? `₹${fmt(uc)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-secondary-800 tabular-nums font-medium">
                      {total > 0 ? `₹${fmt(total)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isErr && (
                        <span className="text-amber-600 text-[10px] font-medium">{row.error}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-primary-100 bg-secondary-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-secondary-500">
            How should the imported rows be added?
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm('append')}
              disabled={validCount === 0}
              className="text-sm text-secondary-700 font-medium px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-100 transition-colors disabled:opacity-40"
            >
              + Append to existing
            </button>
            <button
              onClick={() => onConfirm('replace')}
              disabled={validCount === 0}
              className="text-sm text-white font-semibold px-5 py-2 rounded-xl shadow-lg transition-all disabled:opacity-40"
              style={{ background: '#0d1b3a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            >
              Replace all rows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}