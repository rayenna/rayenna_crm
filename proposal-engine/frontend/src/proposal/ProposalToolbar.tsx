import {
  toolbarBtn,
  toolbarBtnCancel,
  toolbarBtnEdit,
  toolbarBtnExportDocx,
  toolbarBtnExportPdf,
  toolbarBtnExportPpt,
  toolbarBtnNavy,
  toolbarBtnPrimary,
  toolbarBtnRegenerate,
  toolbarBtnShare,
} from '../components/ui/chrome';

export type ProposalExportKind = 'pdf' | 'docx' | 'ppt';
export type ProposalSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ProposalToolbarProps {
  canWrite: boolean;
  isEditing: boolean;
  saveStatus: ProposalSaveStatus;
  exporting: ProposalExportKind | null;
  busy?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onExportPpt: () => void;
  onShare?: () => void;
  onRegenerate: () => void;
  onSave: () => void;
  onSaveAndClose: () => void;
}

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`w-3 h-3 border-2 rounded-full animate-spin ${
        light ? 'border-white/30 border-t-white' : 'border-slate-300 border-t-slate-700'
      }`}
    />
  );
}

type ActionVariant =
  | 'edit'
  | 'cancel'
  | 'share'
  | 'regenerate'
  | 'primary'
  | 'navy'
  | 'success'
  | 'danger'
  | 'export-pdf'
  | 'export-docx'
  | 'export-ppt';

function Action({
  label,
  title,
  onClick,
  disabled,
  busy,
  variant = 'cancel',
}: {
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: ActionVariant;
}) {
  const cls =
    variant === 'edit'
      ? toolbarBtnEdit
      : variant === 'cancel'
        ? toolbarBtnCancel
        : variant === 'share'
          ? toolbarBtnShare
          : variant === 'regenerate'
            ? toolbarBtnRegenerate
            : variant === 'primary'
              ? toolbarBtnPrimary
              : variant === 'navy'
                ? toolbarBtnNavy
                : variant === 'success'
                  ? `${toolbarBtn} bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm`
                  : variant === 'danger'
                    ? `${toolbarBtn} bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-sm`
                    : variant === 'export-pdf'
                      ? toolbarBtnExportPdf
                      : variant === 'export-docx'
                        ? toolbarBtnExportDocx
                        : variant === 'export-ppt'
                          ? toolbarBtnExportPpt
                          : toolbarBtnCancel;
  const spinnerLight =
    variant === 'edit' ||
    variant === 'share' ||
    variant === 'regenerate' ||
    variant === 'primary' ||
    variant === 'navy' ||
    variant === 'success' ||
    variant === 'danger';
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cls}>
      {busy ? <Spinner light={spinnerLight} /> : null}
      {label}
    </button>
  );
}

/**
 * Single compact action bar used at the top and bottom of the Proposal page.
 * Same buttons, same order, same chrome on every breakpoint.
 */
export function ProposalToolbar({
  canWrite,
  isEditing,
  saveStatus,
  exporting,
  busy,
  onEdit,
  onCancel,
  onExportPdf,
  onExportDocx,
  onExportPpt,
  onShare,
  onRegenerate,
  onSave,
  onSaveAndClose,
}: ProposalToolbarProps) {
  const locked = busy || saveStatus === 'saving' || !!exporting;
  const saveVariant: ActionVariant =
    saveStatus === 'saved' ? 'success' : saveStatus === 'error' ? 'danger' : 'primary';
  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving'
      : saveStatus === 'saved'
        ? 'Saved'
        : saveStatus === 'error'
          ? 'Sync failed'
          : 'Save';

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {canWrite &&
        (isEditing ? (
          <Action
            label="Cancel"
            title="Leave edit mode without saving"
            onClick={onCancel}
            disabled={saveStatus === 'saving'}
            variant="cancel"
          />
        ) : (
          <Action label="Edit" title="Edit proposal" onClick={onEdit} variant="edit" />
        ))}

      <div className="inline-flex items-center rounded-lg border border-slate-200/80 bg-white/80 p-0.5 gap-0.5 shadow-sm">
        <Action
          label="PDF"
          title="Export as PDF"
          onClick={onExportPdf}
          disabled={locked}
          busy={exporting === 'pdf'}
          variant="export-pdf"
        />
        <Action
          label="DOCX"
          title="Export as Word"
          onClick={onExportDocx}
          disabled={locked}
          busy={exporting === 'docx'}
          variant="export-docx"
        />
        <Action
          label="PPT"
          title="Export as PowerPoint"
          onClick={onExportPpt}
          disabled={locked}
          busy={exporting === 'ppt'}
          variant="export-ppt"
        />
      </div>

      {canWrite && onShare && (
        <Action
          label="Share"
          title="Share as link"
          onClick={onShare}
          disabled={locked}
          variant="share"
        />
      )}

      {canWrite && (
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          <Action
            label="Regenerate"
            title="Rebuild proposal from Costing, BOM, and ROI (keeps custom sections on this page)"
            onClick={onRegenerate}
            disabled={locked}
            variant="regenerate"
          />
          <Action
            label={saveLabel}
            title="Save proposal"
            onClick={onSave}
            disabled={locked}
            busy={saveStatus === 'saving'}
            variant={saveVariant}
          />
          <Action
            label="Save & Close"
            title="Save and return to the project"
            onClick={onSaveAndClose}
            disabled={locked}
            variant="navy"
          />
        </div>
      )}
    </div>
  );
}
