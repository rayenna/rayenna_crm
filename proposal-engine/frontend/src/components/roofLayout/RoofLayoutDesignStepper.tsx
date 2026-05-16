import {
  ROOF_LAYOUT_WORKFLOW_STEPS,
  type RoofLayoutWorkflowStepId,
  workflowStepIndex,
} from './roofLayoutWorkflow';

type Props = {
  activeStep: RoofLayoutWorkflowStepId;
  compact?: boolean;
};

export function RoofLayoutDesignStepper({ activeStep, compact }: Props) {
  const activeIdx = workflowStepIndex(activeStep);

  return (
    <nav aria-label="Layout workflow" className="w-full">
      <ol className={`flex ${compact ? 'flex-col gap-2' : 'flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-1'}`}>
        {ROOF_LAYOUT_WORKFLOW_STEPS.map((step, idx) => {
          const state =
            idx < activeIdx ? 'done' : idx === activeIdx ? 'current' : 'upcoming';
          return (
            <li
              key={step.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                state === 'current'
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-900 font-semibold shadow-sm'
                  : state === 'done'
                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                    : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  state === 'current'
                    ? 'bg-indigo-600 text-white'
                    : state === 'done'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                }`}
                aria-hidden
              >
                {state === 'done' ? '✓' : idx + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{step.label}</span>
                {!compact && state === 'current' && (
                  <span className="block text-[10px] font-normal text-indigo-700/90 mt-0.5">
                    You are here
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
