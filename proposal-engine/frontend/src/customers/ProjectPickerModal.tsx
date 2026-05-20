import { useState, useEffect, useMemo } from 'react';
import { AlertCard } from '../components/AlertCard';
import { formatEmailForDisplay } from '../lib/customerStore';
import type { ProjectOption } from './types';

export function ProjectPickerModal({
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'systemCapacity' | 'orderValue' | 'confirmationDate' | 'createdAt' | 'customerName'>('confirmationDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [stageFilter, setStageFilter] = useState<'both' | 'PROPOSAL' | 'CONFIRMED'>('both');
  const [salesFilter, setSalesFilter] = useState<string>('ALL');

  const PAGE_SIZE = 20;

  // Debounce search input to prevent re-filtering/re-sorting on every keystroke on large lists.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 180);
    return () => window.clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const salesQ = salesFilter.toLowerCase();
    return projects
      .filter((p) => {
        if (stageFilter === 'both') return true;
        return p.projectStage === stageFilter;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.customerName.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.siteAddress.toLowerCase().includes(q)
        );
      })
      .filter((p) => {
        if (salesFilter === 'ALL') return true;
        return (p.salespersonName || '').toLowerCase() === salesQ;
      });
  }, [projects, stageFilter, salesFilter, debouncedSearch]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const safe = (n: number | null | undefined) => (Number.isFinite(n as number) ? (n as number) : 0);
    const dateVal = (s?: string) => (s ? new Date(s).getTime() || 0 : 0);
    return [...filtered].sort((a, b) => {
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
  }, [filtered, sortBy, sortDir]);

  const total = sorted.length;
  const totalPages = useMemo(() => (total > 0 ? Math.ceil(total / PAGE_SIZE) : 1), [total]);
  const startIndex = useMemo(() => (page - 1) * PAGE_SIZE, [page]);
  const endIndex = useMemo(() => Math.min(startIndex + PAGE_SIZE, total), [startIndex, total]);
  const pageItems = useMemo(() => sorted.slice(startIndex, endIndex), [sorted, startIndex, endIndex]);

  const handleChangeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const selected = filtered.find((p) => p.id === selectedId) ?? projects.find((p) => p.id === selectedId) ?? null;

  // Unique salespersons – used to show Sales Person filter for non-sales roles.
  const salespersonOptions = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .map((p) => (p.salespersonName || '').trim())
            .filter((name) => name.length > 0),
        ),
      ),
    [projects],
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
