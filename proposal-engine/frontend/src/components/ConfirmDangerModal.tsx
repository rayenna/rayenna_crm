import type { ReactNode } from 'react';

/** Destructive-action confirm — matches Customers / ProjectCard delete modals in PE. */
export function ConfirmDangerModal({
  open,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  confirming = false,
}: {
  open: boolean;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-secondary-900/70 backdrop-blur-sm"
        onClick={confirming ? undefined : onCancel}
        aria-hidden
      />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border-2 border-red-200/80 max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-danger-title"
      >
        <p id="confirm-danger-title" className="text-sm text-secondary-800 font-medium">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {confirming ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
