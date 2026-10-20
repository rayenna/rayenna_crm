import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchWhoToCallIntent } from './whoToCallAsk';
import {
  catalogHintsForRole,
  fillAskPlaceholders,
  followUpsForMetric,
  wowSuggestionsForRole,
} from './catalog';
import { matchExactChipIntent } from './chipIntents';
import { matchAskActionIntent } from './askActions';

describe('matchWhoToCallIntent', () => {
  it('maps who should I call today', () => {
    expect(matchWhoToCallIntent('Who should I call today?', UserRole.SALES)?.metric).toBe(
      'who_to_call',
    );
  });

  it('maps call list phrasing', () => {
    expect(matchWhoToCallIntent('who do I call this week', UserRole.FINANCE)?.metric).toBe(
      'who_to_call',
    );
  });

  it('does not steal stalled-pipeline questions', () => {
    expect(matchWhoToCallIntent('Why is my pipeline stalling?', UserRole.ADMIN)).toBeNull();
  });
});

describe('Ask chips vs actions', () => {
  it('list pending subsidy stays an analytics metric', () => {
    expect(matchAskActionIntent('List pending subsidy projects', UserRole.ADMIN)).toBeNull();
    expect(matchExactChipIntent('List pending subsidy projects', UserRole.ADMIN)?.metric).toBe(
      'pending_subsidy',
    );
  });

  it('open pending subsidy still navigates', () => {
    expect(matchAskActionIntent('Open Pending Subsidy Projects', UserRole.MANAGEMENT)?.action).toBe(
      'pending_subsidy',
    );
  });

  it('who should I call is a chip metric', () => {
    expect(matchExactChipIntent('Who should I call today?', UserRole.SALES)?.metric).toBe(
      'who_to_call',
    );
  });

  it('why is my pipeline stalling maps to pipeline health', () => {
    expect(matchExactChipIntent('Why is my pipeline stalling?', UserRole.ADMIN)?.metric).toBe(
      'pipeline_health',
    );
  });
});

describe('clarify catalog asks', () => {
  it('uses spoken questions not Title Case metric ids', () => {
    const hints = catalogHintsForRole(UserRole.ADMIN);
    const slice = hints.find((h) => h.metric === 'projects_list_slice');
    expect(slice?.ask).not.toBe('Projects List Slice');
    expect(slice?.ask.toLowerCase()).not.toBe(slice?.title.toLowerCase());
    const call = hints.find((h) => h.metric === 'who_to_call');
    expect(call?.ask).toBe('Who should I call today?');
  });

  it('wow suggestions lead with call list', () => {
    expect(wowSuggestionsForRole(UserRole.SALES)[0]).toBe('Who should I call today?');
  });

  it('call-list follow-ups stay role-true', () => {
    const admin = followUpsForMetric('who_to_call', UserRole.ADMIN);
    expect(admin[0]).toBe('Why is my pipeline stalling?');
    expect(admin).toContain('Show open support tickets');
    const finance = followUpsForMetric('who_to_call', UserRole.FINANCE);
    expect(finance).not.toContain('Show open support tickets');
    expect(finance).not.toContain('Why is my pipeline stalling?');
    expect(finance).toContain('Show projects with outstanding balance');
  });

  it('fills live customer placeholders and drops empty ones', () => {
    expect(
      fillAskPlaceholders(['Customer details for {customer}', 'Who should I call today?'], {
        customerName: 'VISWANATHAN',
      }),
    ).toEqual(['Customer details for VISWANATHAN', 'Who should I call today?']);
    expect(
      fillAskPlaceholders(['Customer details for {customer}'], { customerName: null }),
    ).toEqual([]);
  });
});
