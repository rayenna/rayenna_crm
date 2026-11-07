import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  buildCoachChecklist,
  clearCoachDismiss,
  coachProgressKey,
  dismissCoach,
  isCoachDismissed,
} from '../lib/dashboardCoach';
import { setLocalStorageItem, removeLocalStorageItem } from '../lib/safeLocalStorage';
import type { CustomerRecord } from '../lib/customerStore';
import { getResolvedRoofLayout } from '../lib/customerStore';

const OPEN_LABEL: Record<string, string> = {
  costing: 'Open Costing',
  roi: 'Open ROI',
  proposal: 'Open Proposal',
  roof: 'Open Roof Layout',
};

export function DashboardCoach({
  customer,
  onContinue,
}: {
  customer: CustomerRecord;
  onContinue: (path: string) => void;
}) {
  const hasRoof = getResolvedRoofLayout(customer) != null;
  const progressKey = coachProgressKey(customer, hasRoof);
  const { items, continueStep, allCoreDone } = buildCoachChecklist(customer, hasRoof);

  const [dismissed, setDismissed] = useState(() =>
    isCoachDismissed(customer.id, progressKey),
  );

  useEffect(() => {
    setDismissed(isCoachDismissed(customer.id, progressKey));
  }, [customer.id, progressKey]);

  if (dismissed) {
    return (
      <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-secondary-200 bg-secondary-50/60 px-4 py-2.5">
        <p className="text-xs text-secondary-600">Proposal coach hidden for this step.</p>
        <button
          type="button"
          className="text-xs font-semibold text-indigo-700 hover:underline"
          onClick={() => {
            clearCoachDismiss(customer.id, removeLocalStorageItem);
            setDismissed(false);
          }}
        >
          Show coach
        </button>
      </div>
    );
  }

  const title = allCoreDone
    ? hasRoof
      ? 'You are PE Ready'
      : 'Core proposal is ready'
    : 'Do this next';

  const subtitle = allCoreDone
    ? hasRoof
      ? 'Costing, ROI, proposal, and roof layout are in place. Export or share when you are ready.'
      : 'Costing, ROI, and the proposal are saved. A roof layout is optional for the document.'
    : 'Follow the checklist for this open project. Press ? on any page for help on that screen.';

  return (
    <div
      className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-4 sm:px-5"
      data-testid="dashboard-coach"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-800">
            {title}
          </p>
          <p className="mt-1 text-sm text-secondary-700 leading-snug">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label="Hide coach for this step"
          className="shrink-0 text-xs font-medium text-secondary-500 hover:text-secondary-800"
          onClick={() => {
            dismissCoach(customer.id, progressKey, setLocalStorageItem);
            setDismissed(true);
          }}
        >
          Hide
        </button>
      </div>

      <ol className="mt-4 space-y-2">
        {items.map((item, index) => {
          const isCurrent = item.current;
          return (
            <li
              key={item.id}
              className={`flex gap-3 rounded-lg border px-3 py-2.5 ${
                isCurrent
                  ? 'border-indigo-400 bg-white shadow-sm'
                  : item.done
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-secondary-200 bg-white/70'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  item.done
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-indigo-600 text-white'
                      : 'bg-secondary-200 text-secondary-600'
                }`}
                aria-hidden
              >
                {item.done ? '✓' : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-secondary-900">{item.label}</p>
                  {item.optional ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary-500">
                      Optional
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                      Next
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-secondary-600 leading-snug">{item.detail}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo-700 hover:underline"
                    onClick={() => onContinue(item.path)}
                  >
                    {OPEN_LABEL[item.id] ?? 'Open'} →
                  </button>
                  <Link to={item.helpHref} className="text-xs font-semibold text-indigo-700 hover:underline">
                    Guide →
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
        <Link
          to={`/help#${allCoreDone ? 'proposal' : continueStep.id === 'costing' ? 'costing' : continueStep.id === 'roi' ? 'roi' : 'proposal'}`}
          className="text-xs font-medium text-secondary-600 hover:text-indigo-700 hover:underline"
        >
          Open full User Guide
        </Link>
        <button
          type="button"
          data-testid="dashboard-coach-continue"
          onClick={() => onContinue(continueStep.path)}
          className="inline-flex items-center justify-center text-sm font-semibold text-white px-4 py-2.5 rounded-lg min-h-[40px] bg-indigo-600 hover:bg-indigo-700"
        >
          {continueStep.button}
        </button>
      </div>
    </div>
  );
}
