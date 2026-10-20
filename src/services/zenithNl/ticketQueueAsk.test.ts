import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { ticketQueueSlice } from './ticketQueueAsk';
import { matchSupportTicketIntent } from './chipIntents';

describe('ticketQueueSlice', () => {
  it('reads oldest / overdue / mine / queue from intent', () => {
    expect(
      ticketQueueSlice({
        metric: 'support_tickets_summary',
        viz: 'table',
        filters: { detailSlice: 'oldest' },
      }),
    ).toBe('oldest');
    expect(
      ticketQueueSlice({
        metric: 'support_tickets_summary',
        viz: 'table',
        filters: { detailSlice: 'overdue' },
      }),
    ).toBe('overdue');
    expect(
      ticketQueueSlice({
        metric: 'support_tickets_summary',
        viz: 'chart',
      }),
    ).toBeNull();
  });

  it('treats table ticket summary as a queue when slice is omitted', () => {
    expect(
      ticketQueueSlice({
        metric: 'support_tickets_summary',
        viz: 'table',
      }),
    ).toBe('queue');
  });
});

describe('ticket queue chip phrasing', () => {
  it('maps mine tickets to mine slice', () => {
    expect(
      matchSupportTicketIntent('show open tickets I created', UserRole.OPERATIONS)?.filters
        ?.detailSlice,
    ).toBe('mine');
  });
});
