import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  applyPriorToIntent,
  isAskFollowUpQuestion,
  parseZenithNlPriorFilters,
} from './priorFilters';

describe('parseZenithNlPriorFilters', () => {
  it('keeps city, SLA, stage, and capacity from follow-up prior', () => {
    const filters = parseZenithNlPriorFilters({
      city: 'Kochi',
      statusIndicator: 'red',
      projectStage: 'INSTALLATION',
      capacityMin: 3,
      capacityMax: '5',
      unknownKey: 'drop-me',
    });
    expect(filters).toEqual({
      city: 'Kochi',
      statusIndicator: 'RED',
      projectStage: 'INSTALLATION',
      capacityMin: 3,
      capacityMax: 5,
    });
  });

  it('accepts peBucket only when valid', () => {
    expect(parseZenithNlPriorFilters({ peBucket: 'draft' })?.peBucket).toBe('draft');
    expect(parseZenithNlPriorFilters({ peBucket: 'active' })?.peBucket).toBe('active');
    expect(parseZenithNlPriorFilters({ peBucket: 'nope' })).toBeUndefined();
  });
});

describe('applyPriorToIntent', () => {
  it('detects follow-up phrasing', () => {
    expect(isAskFollowUpQuestion('Show that as a table')).toBe(true);
    expect(isAskFollowUpQuestion('by salesperson')).toBe(true);
    expect(isAskFollowUpQuestion('Who should I call today?')).toBe(false);
  });

  it('keeps prior metric and applies table viz on follow-up', () => {
    const next = applyPriorToIntent(
      'Show that as a table',
      { metric: 'clarify', viz: 'table' },
      {
        question: 'Which lead sources drove the most revenue?',
        metric: 'revenue_by_lead_source',
        filters: { city: 'Kochi' },
      },
      UserRole.MANAGEMENT,
    );
    expect(next.metric).toBe('revenue_by_lead_source');
    expect(next.viz).toBe('table');
    expect(next.filters?.city).toBe('Kochi');
  });

  it('refines to revenue_by_salesperson on by-salesperson follow-up', () => {
    const next = applyPriorToIntent(
      'by salesperson',
      { metric: 'clarify', viz: 'table' },
      {
        question: 'Revenue by lead source',
        metric: 'revenue_by_lead_source',
        filters: {},
      },
      UserRole.ADMIN,
    );
    expect(next.metric).toBe('revenue_by_salesperson');
  });
});
