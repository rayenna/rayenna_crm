import { Link } from 'react-router-dom';
import type { PreflightFinding, SystemSizeSource } from '../../lib/preflight/types';

export interface PreFlightModalProps {
  open: boolean;
  actionLabel: 'Generate' | 'Share';
  findings: PreflightFinding[];
  /** Finding ids currently selected (all by default). */
  selectedIds: Set<string>;
  /** CRM vs costing capacity choice (default crm). */
  systemSizeSource: SystemSizeSource;
  applying?: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSystemSizeSourceChange: (source: SystemSizeSource) => void;
  onApplySelected: () => void;
  onIgnoreAndProceed: () => void;
  onCancel: () => void;
}

function severityClass(severity: PreflightFinding['severity']): string {
  return severity === 'error'
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : 'bg-slate-100 text-slate-700 border-slate-200';
}

export function PreFlightModal({
  open,
  actionLabel,
  findings,
  selectedIds,
  systemSizeSource,
  applying = false,
  onToggle,
  onSelectAll,
  onSelectNone,
  onSystemSizeSourceChange,
  onApplySelected,
  onIgnoreAndProceed,
  onCancel,
}: PreFlightModalProps) {
  if (!open) return null;

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const selectedAutoFixable = findings.filter(
    (f) => f.autoFixable && selectedIds.has(f.id),
  ).length;
  const selectedCount = findings.filter((f) => selectedIds.has(f.id)).length;
  const sizeChoiceFinding = findings.find((f) => f.id === 'system_size_mismatch' && f.sizeChoice);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-preflight-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 [touch-action:manipulation]"
        aria-label="Close"
        onClick={applying ? undefined : onCancel}
        disabled={applying}
      />
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-xl bg-white text-slate-900 shadow-2xl
                   border border-amber-200/80 flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <div className="px-4 pt-4 pb-2 sm:px-5 sm:pt-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="proposal-preflight-title" className="text-lg font-semibold text-slate-900">
                Proposal pre-flight
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {errorCount > 0 || warningCount > 0
                  ? `${errorCount} issue${errorCount === 1 ? '' : 's'}, ${warningCount} warning${warningCount === 1 ? '' : 's'} before ${actionLabel.toLowerCase()}.`
                  : `Ready to ${actionLabel.toLowerCase()}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={applying}
              className="shrink-0 h-9 w-9 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                         flex items-center justify-center [touch-action:manipulation] disabled:opacity-60"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={applying}
              className="text-xs font-medium text-indigo-700 hover:underline disabled:opacity-60"
            >
              Select all
            </button>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={onSelectNone}
              disabled={applying}
              className="text-xs font-medium text-indigo-700 hover:underline disabled:opacity-60"
            >
              Select none
            </button>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 space-y-2">
          {findings.map((f) => {
            const checked = selectedIds.has(f.id);
            const isSizeChoice = f.id === 'system_size_mismatch' && !!f.sizeChoice;
            return (
              <li
                key={f.id + (f.sizeChoice ? ':choice' : '')}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <div className="flex gap-3">
                  {!isSizeChoice && (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={checked}
                      disabled={applying}
                      onChange={() => onToggle(f.id)}
                      aria-label={f.title}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${severityClass(f.severity)}`}
                      >
                        {f.severity}
                      </span>
                      {isSizeChoice ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border border-indigo-200 bg-indigo-50 text-indigo-800">
                          Choose
                        </span>
                      ) : f.autoFixable ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border border-emerald-200 bg-emerald-50 text-emerald-800">
                          Auto-fix
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border border-slate-200 bg-white text-slate-600">
                          Manual
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-900">{f.title}</span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-600 leading-relaxed">{f.detail}</span>

                    {isSizeChoice && f.sizeChoice && (
                      <fieldset className="mt-3 space-y-2" disabled={applying}>
                        <legend className="sr-only">Proposal system capacity</legend>
                        <label className="flex gap-2 items-start rounded-lg border border-slate-200 bg-white p-2.5 cursor-pointer has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/50">
                          <input
                            type="radio"
                            name="preflight-system-size"
                            className="mt-0.5"
                            checked={systemSizeSource === 'crm'}
                            onChange={() => onSystemSizeSourceChange('crm')}
                          />
                          <span className="text-xs text-slate-800 leading-snug">
                            <span className="font-semibold">CRM project capacity</span>
                            <span className="block text-slate-600 mt-0.5">
                              {f.sizeChoice.crmKw} kW — as entered on the Rayenna CRM project
                            </span>
                          </span>
                        </label>
                        <label className="flex gap-2 items-start rounded-lg border border-slate-200 bg-white p-2.5 cursor-pointer has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/50">
                          <input
                            type="radio"
                            name="preflight-system-size"
                            className="mt-0.5"
                            checked={systemSizeSource === 'costing'}
                            onChange={() => onSystemSizeSourceChange('costing')}
                          />
                          <span className="text-xs text-slate-800 leading-snug">
                            <span className="font-semibold">Costing-derived capacity</span>
                            <span className="block text-slate-600 mt-0.5">
                              {f.sizeChoice.costingKw} kW — {f.sizeChoice.costingDetail}
                            </span>
                          </span>
                        </label>
                      </fieldset>
                    )}

                    {f.navigateTo && !isSizeChoice && (
                      <Link
                        to={f.navigateTo}
                        onClick={onCancel}
                        className="mt-2 inline-block text-xs font-semibold text-indigo-700 hover:underline"
                      >
                        Go to {f.navigateTo.replace('/', '')} →
                      </Link>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="px-4 pt-2 pb-4 sm:px-5 sm:pb-5 border-t border-slate-100 space-y-3">
          <p className="text-xs text-slate-500">
            {sizeChoiceFinding
              ? `Capacity choice defaults to CRM. Apply / Ignore & proceed will use ${systemSizeSource === 'crm' ? 'CRM' : 'costing-derived'} capacity on the proposal. `
              : null}
            Apply runs auto-fixes for selected rows only ({selectedAutoFixable} auto-fix
            {selectedAutoFixable === 1 ? '' : 'es'} of {selectedCount} selected). Manual items need a visit to Costing / BOM / ROI / Roof.
            Ignore &amp; proceed continues {actionLabel.toLowerCase()} despite{' '}
            {findings.length} open item{findings.length === 1 ? '' : 's'}.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={applying}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 bg-white text-slate-700
                         hover:bg-slate-50 transition-colors disabled:opacity-60 [touch-action:manipulation]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onIgnoreAndProceed}
              disabled={applying}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-amber-300 bg-amber-50 text-amber-900
                         hover:bg-amber-100 transition-colors disabled:opacity-60 [touch-action:manipulation]"
            >
              Ignore &amp; proceed
            </button>
            <button
              type="button"
              onClick={onApplySelected}
              disabled={applying || (selectedAutoFixable === 0 && !sizeChoiceFinding)}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700
                         transition-colors disabled:opacity-60 [touch-action:manipulation]"
            >
              {applying ? 'Applying…' : 'Apply selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
