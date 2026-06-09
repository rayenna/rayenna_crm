type DesktopProps = {
  variant: 'desktop';
  savingToProposal: boolean;
  exportingSitePlan: boolean;
  isSavedForProject: boolean;
  onExportSitePlan: () => void;
  onSaveForProposal: () => void;
  /** Vertical stack for right sidebar (xl 3-column layout). */
  stacked?: boolean;
};

type MobileProps = {
  variant: 'mobile';
  savingToProposal: boolean;
  exportingSitePlan: boolean;
  isSavedForProject: boolean;
  proposalImageSource: '2d' | '3d';
  canChoose3dForProposal: boolean;
  onExportSitePlan: () => void;
  onSaveForProposal: () => void;
};

type Props = DesktopProps | MobileProps;

export function RoofLayoutExportActions(props: Props) {
  if (props.variant === 'mobile') {
    const embedLabel =
      props.proposalImageSource === '3d' && props.canChoose3dForProposal ? '3D render' : '2D layout';

    return (
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        role="region"
        aria-label="Export and save layout"
      >
        <div className="flex gap-2" role="group" aria-label="Layout actions">
          <button
            type="button"
            onClick={props.onExportSitePlan}
            disabled={props.exportingSitePlan || props.savingToProposal}
            aria-busy={props.exportingSitePlan}
            className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 touch-manipulation disabled:opacity-60"
          >
            <span aria-hidden>⬇</span>
            {props.exportingSitePlan ? 'Preparing…' : 'Site plan PDF'}
          </button>
          <button
            type="button"
            onClick={props.onSaveForProposal}
            disabled={props.savingToProposal || props.exportingSitePlan}
            aria-busy={props.savingToProposal}
            className={`min-h-[48px] flex-[1.35] inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold border touch-manipulation ${
              props.isSavedForProject
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                : 'bg-emerald-600 text-white border-emerald-700'
            } disabled:opacity-60`}
          >
            {props.savingToProposal
              ? 'Saving…'
              : props.isSavedForProject
                ? '✓ Saved'
                : 'Save to Proposal'}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-500" aria-live="polite">
          Proposal embed: <strong className="text-gray-700">{embedLabel}</strong>
        </p>
      </div>
    );
  }

  const stacked = props.stacked === true;
  const containerClass = stacked
    ? 'flex flex-col gap-2 w-full'
    : 'flex flex-wrap items-center gap-2';
  const btnClass = stacked
    ? 'w-full min-h-[40px] inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold'
    : 'min-h-[40px] inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold';

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={props.onExportSitePlan}
        disabled={props.exportingSitePlan || props.savingToProposal}
        className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60`}
        title="Opens a print dialog — choose Save as PDF. Enable Background graphics for best output."
      >
        {props.exportingSitePlan ? 'Preparing…' : '⬇ Site plan PDF'}
      </button>
      <button
        type="button"
        onClick={props.onSaveForProposal}
        disabled={props.savingToProposal || props.exportingSitePlan}
        className={`${btnClass} border ${
          props.isSavedForProject
            ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
            : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
        } disabled:opacity-60`}
      >
        {props.savingToProposal
          ? 'Saving…'
          : props.isSavedForProject
            ? '✓ Saved for Proposal'
            : 'Save to Proposal'}
      </button>
    </div>
  );
}
