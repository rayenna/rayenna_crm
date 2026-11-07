import { HELP_ANCHORS } from './helpContext';
import { nextProposalStep, type ProposalContinueStep } from './proposalContinue';

export type CoachStepId = 'costing' | 'roi' | 'proposal' | 'roof';

export type CoachChecklistItem = {
  id: CoachStepId;
  label: string;
  detail: string;
  path: string;
  helpHref: string;
  done: boolean;
  /** Soft step — does not block PE Ready. */
  optional?: boolean;
  /** Highlight as the next required action. */
  current: boolean;
};

export type CoachRecord = {
  costing?: unknown | null;
  bom?: unknown | null;
  roi?: unknown | null;
  proposal?: unknown | null;
};

/** Compact progress fingerprint so dismiss resets when the project moves forward. */
export function coachProgressKey(record: CoachRecord, hasRoofLayout: boolean): string {
  return [
    record.costing ? '1' : '0',
    record.bom ? '1' : '0',
    record.roi ? '1' : '0',
    record.proposal ? '1' : '0',
    hasRoofLayout ? '1' : '0',
  ].join('');
}

export function buildCoachChecklist(
  record: CoachRecord,
  hasRoofLayout: boolean,
): { items: CoachChecklistItem[]; continueStep: ProposalContinueStep; allCoreDone: boolean } {
  const continueStep = nextProposalStep(record);
  const hasCosting = !!record.costing && !!record.bom;
  const hasRoi = !!record.roi;
  const hasProposal = !!record.proposal;
  const allCoreDone = hasCosting && hasRoi && hasProposal;

  const items: CoachChecklistItem[] = [
    {
      id: 'costing',
      label: 'Save Costing Sheet',
      detail: 'Templates → edit → Save Sheet (also builds BOM + ROI).',
      path: '/costing',
      helpHref: `/help#${HELP_ANCHORS.costing}`,
      done: hasCosting,
      current: continueStep.id === 'costing' && !allCoreDone,
    },
    {
      id: 'roi',
      label: 'Confirm ROI',
      detail: 'Review tariff / subsidy if needed, then Calculate and Save Result.',
      path: '/roi',
      helpHref: `/help#${HELP_ANCHORS.roi}`,
      done: hasRoi,
      current: continueStep.id === 'roi' && !allCoreDone,
    },
    {
      id: 'proposal',
      label: 'Generate proposal',
      detail: 'Generate, handle pre-flight if asked, then Save / PDF / Share.',
      path: '/proposal',
      helpHref: `/help#${HELP_ANCHORS.proposal}`,
      done: hasProposal,
      current: continueStep.id === 'proposal' && !allCoreDone,
    },
    {
      id: 'roof',
      label: 'Roof layout (optional)',
      detail: 'Draw panels, Save to Proposal, then Include roof layout when generating.',
      path: '/ai-layout',
      helpHref: `/help#${HELP_ANCHORS.aiRoofLayout}`,
      done: hasRoofLayout,
      optional: true,
      current: allCoreDone && !hasRoofLayout,
    },
  ];

  return { items, continueStep, allCoreDone };
}

const DISMISS_PREFIX = 'rayenna_pe_coach_dismissed:';

export function coachDismissStorageKey(customerId: string): string {
  return `${DISMISS_PREFIX}${customerId}`;
}

export function isCoachDismissed(
  customerId: string,
  progressKey: string,
  readItem: (key: string) => string | null = (k) =>
    typeof localStorage === 'undefined' ? null : localStorage.getItem(k),
): boolean {
  return readItem(coachDismissStorageKey(customerId)) === progressKey;
}

export function dismissCoach(
  customerId: string,
  progressKey: string,
  writeItem: (key: string, value: string) => void = (k, v) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(k, v);
  },
): void {
  writeItem(coachDismissStorageKey(customerId), progressKey);
}

export function clearCoachDismiss(
  customerId: string,
  removeItem: (key: string) => void = (k) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(k);
  },
): void {
  removeItem(coachDismissStorageKey(customerId));
}
