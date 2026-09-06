export type HubAlertTemplateId =
  | 'cleaning_due'
  | 'service_booked'
  | 'ticket_update'
  | 'custom';

export type HubAlertTemplate = {
  id: HubAlertTemplateId;
  label: string;
  description: string;
  defaultTitle: string;
  defaultBody: string;
  kind: string;
  hubPath: string;
};

export const HUB_ALERT_TEMPLATES: HubAlertTemplate[] = [
  {
    id: 'cleaning_due',
    label: 'Panel cleaning due',
    description: 'Remind the homeowner to schedule included cleaning.',
    defaultTitle: 'Panel cleaning is due',
    defaultBody:
      'Your next included panel cleaning is due. Open Maintain in Rayenna Solar Hub to schedule a visit.',
    kind: 'cleaning_due',
    hubPath: '/maintain',
  },
  {
    id: 'service_booked',
    label: 'Service booked / visit',
    description: 'Confirm a service visit or follow up on a request.',
    defaultTitle: 'Service update from Rayenna',
    defaultBody:
      'We have an update on your service request. Open Maintain in Rayenna Solar Hub for details.',
    kind: 'service_booked',
    hubPath: '/maintain',
  },
  {
    id: 'ticket_update',
    label: 'Support ticket update',
    description: 'Tell them we received or progressed their query.',
    defaultTitle: 'Update on your query',
    defaultBody:
      'There is an update on your support query. Open Support in Rayenna Solar Hub to see status.',
    kind: 'ticket_update',
    hubPath: '/support',
  },
  {
    id: 'custom',
    label: 'Custom message',
    description: 'Write your own title and body. Do not include Hub passwords.',
    defaultTitle: '',
    defaultBody: '',
    kind: 'crm_custom',
    hubPath: '/',
  },
];

export function hubPathForKind(kind: string): string {
  if (kind.startsWith('ticket_') || kind === 'ticket_update') return '/support';
  if (
    kind.startsWith('service_') ||
    kind === 'issue_reported' ||
    kind === 'cleaning_due'
  ) {
    return '/maintain';
  }
  return '/';
}

export function getHubAlertTemplate(id: string): HubAlertTemplate | undefined {
  return HUB_ALERT_TEMPLATES.find((t) => t.id === id);
}
