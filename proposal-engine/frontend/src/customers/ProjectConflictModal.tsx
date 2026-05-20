import type { ProjectOption } from './types';

export function ProjectConflictModal({
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
