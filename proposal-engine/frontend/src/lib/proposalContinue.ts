/** Next incomplete step for the open project. BOM is not a stop: costing save writes it. */

export type ProposalContinueStep = {
  id: 'costing' | 'roi' | 'proposal';
  path: '/costing' | '/roi' | '/proposal';
  button: string;
  detail: string;
};

export function nextProposalStep(record: {
  costing?: unknown | null;
  bom?: unknown | null;
  roi?: unknown | null;
  proposal?: unknown | null;
}): ProposalContinueStep {
  if (!record.costing || !record.bom) {
    return {
      id: 'costing',
      path: '/costing',
      button: 'Continue to costing',
      detail:
        'Start with the price sheet. Saving it also stores the bill of materials and a payback calculation.',
    };
  }
  if (!record.roi) {
    return {
      id: 'roi',
      path: '/roi',
      button: 'Continue to ROI',
      detail:
        'The price sheet is saved. Open ROI to calculate payback, then continue to the proposal.',
    };
  }
  if (!record.proposal) {
    return {
      id: 'proposal',
      path: '/proposal',
      button: 'Continue to proposal',
      detail: 'Costing and ROI are saved. Generate the proposal next.',
    };
  }
  return {
    id: 'proposal',
    path: '/proposal',
    button: 'Review proposal',
    detail: 'Costing, ROI, and the proposal are saved. Open the document to export or share.',
  };
}
