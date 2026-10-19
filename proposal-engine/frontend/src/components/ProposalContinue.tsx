import { nextProposalStep } from '../lib/proposalContinue';

type ContinueRecord = {
  costing?: unknown | null;
  bom?: unknown | null;
  roi?: unknown | null;
  proposal?: unknown | null;
};

export function ProposalContinueBar({
  record,
  onContinue,
  appearance,
}: {
  record: ContinueRecord;
  onContinue: (path: string) => void;
  appearance: 'light' | 'dark';
}) {
  const step = nextProposalStep(record);

  if (appearance === 'dark') {
    return (
      <div className="pt-3 mt-1 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          data-testid="proposal-continue"
          onClick={() => onContinue(step.path)}
          className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 min-h-[40px] flex-shrink-0"
        >
          {step.button}
        </button>
        <p className="text-[12px] text-slate-100/90 leading-snug">{step.detail}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#0A9E87] uppercase tracking-wide">Next step</p>
        <p className="text-sm text-secondary-700 mt-1 leading-snug">{step.detail}</p>
      </div>
      <button
        type="button"
        data-testid="proposal-continue"
        onClick={() => onContinue(step.path)}
        className="inline-flex items-center justify-center text-sm font-semibold text-white px-4 py-2.5 rounded-lg min-h-[40px] flex-shrink-0 bg-[#0A9E87] hover:bg-[#087A6A]"
      >
        {step.button}
      </button>
    </div>
  );
}
