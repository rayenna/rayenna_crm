export type RoofLayoutWorkflowStepId = 'locate' | 'outline' | 'keepouts' | 'place' | 'review';

export type RoofLayoutWorkflowStep = {
  id: RoofLayoutWorkflowStepId;
  label: string;
  short: string;
};

export const ROOF_LAYOUT_WORKFLOW_STEPS: RoofLayoutWorkflowStep[] = [
  { id: 'locate', label: 'Locate site', short: 'Locate' },
  { id: 'outline', label: 'Draw roof outline', short: 'Outline' },
  { id: 'keepouts', label: 'Keepouts (optional)', short: 'Keepouts' },
  { id: 'place', label: 'Place panels', short: 'Panels' },
  { id: 'review', label: 'Review & save', short: 'Review' },
];

export function deriveRoofLayoutWorkflowStep(input: {
  hasActiveProject: boolean;
  hasLayoutResult: boolean;
  layoutMode: 'saved' | 'editing';
  hasPolygon: boolean;
  isSavedForProject: boolean;
  mapTool?: 'scroll' | 'roof' | 'keepout';
}): RoofLayoutWorkflowStepId {
  if (!input.hasActiveProject || !input.hasLayoutResult) return 'locate';
  if (input.isSavedForProject) return 'review';
  if (input.layoutMode === 'saved') return 'review';
  if (!input.hasPolygon) return 'outline';
  if (input.mapTool === 'keepout') return 'keepouts';
  return 'place';
}

export function workflowStepIndex(step: RoofLayoutWorkflowStepId): number {
  return ROOF_LAYOUT_WORKFLOW_STEPS.findIndex((s) => s.id === step);
}
