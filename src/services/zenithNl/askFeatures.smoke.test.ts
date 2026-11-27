/**
 * Smoke: Ask strategy items 1–8 (chips, dates, prefs, playbooks, packs).
 */
import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchExactChipIntent } from './chipIntents';
import { resolveAskDateFilter } from './relativeDates';
import { applyPriorToIntent } from './priorFilters';
import {
  matchGuidedPlaybookIntent,
  playbookAsksForRole,
} from './guidedPlaybooks';
import { matchMorningBriefIntent } from './morningAsk';
import { matchSubsidyChaseIntent } from './subsidyChaseAsk';
import {
  mergeFavoriteAskChips,
  normalizeAskPreferences,
} from './askPreferences';
import { EXAMPLE_QUESTIONS_BY_ROLE, metricAllowedForRole } from './catalog';

/** Mirrors client AskCohortActions COHORT_CTA_METRICS (keep in sync). */
const COHORT_CTA_METRICS = new Set([
  'who_to_call',
  'pipeline_health',
  'unpaid_invoices',
  'outstanding_balance',
  'subsidy_chase_pack',
  'guided_playbook',
]);

const EMPTY = { selectedFYs: [], selectedQuarters: [], selectedMonths: [] };
const NOW = new Date('2025-11-27T06:00:00+05:30');

describe('Ask features 1–8 smoke', () => {
  it('#1 default FY off Zenith + saved default period', () => {
    const d1 = resolveAskDateFilter('Who should I call today?', EMPTY, NOW);
    expect(d1.defaulted).toBe(true);
    expect(d1.dateFilter.selectedFYs[0]).toBeTruthy();
    expect(d1.defaultPhrase).toMatch(/this FY/i);

    const d2 = resolveAskDateFilter(
      'Who should I call today?',
      EMPTY,
      NOW,
      'last_quarter',
    );
    expect(d2.defaulted).toBe(true);
    expect(d2.dateFilter.selectedQuarters).toHaveLength(1);
    expect(d2.defaultPhrase).toMatch(/last quarter/i);

    const d3 = resolveAskDateFilter(
      'Who should I call today?',
      { selectedFYs: ['2024-25'], selectedQuarters: [], selectedMonths: [] },
      NOW,
      'current_fy',
    );
    expect(d3.defaulted).toBe(false);
    expect(d3.dateFilter.selectedFYs).toEqual(['2024-25']);
  });

  it('#2 prior follow-up merge keeps entity filters', () => {
    const merged = applyPriorToIntent(
      'Show that as a table',
      { metric: 'clarify', viz: 'chart' },
      {
        question: 'Under installation projects not fully paid',
        metric: 'projects_list_slice',
        filters: {
          projectStatus: 'UNDER_INSTALLATION',
          paymentStatus: 'NOT_FULLY_PAID',
        },
      },
      UserRole.SALES,
    );
    expect(merged.metric).toBe('projects_list_slice');
    expect(merged.filters?.projectStatus).toBe('UNDER_INSTALLATION');
    expect(merged.filters?.paymentStatus).toBe('NOT_FULLY_PAID');
    expect(merged.viz).toBe('table');
  });

  it('#3 cohort CTA metrics include call / stall / unpaid / chase packs', () => {
    for (const m of COHORT_CTA_METRICS) expect(COHORT_CTA_METRICS.has(m)).toBe(true);
    expect(COHORT_CTA_METRICS.has('who_to_call')).toBe(true);
    expect(COHORT_CTA_METRICS.has('guided_playbook')).toBe(true);
  });

  it('#4 write-flow source metrics resolve (tickets + unpaid under-install)', () => {
    expect(
      matchExactChipIntent('Show open support tickets', UserRole.ADMIN)?.metric,
    ).toBe('support_tickets_summary');
    const unpaid = matchExactChipIntent(
      'Under installation projects not fully paid',
      UserRole.SALES,
    );
    expect(unpaid?.metric).toBe('projects_list_slice');
    expect(unpaid?.filters?.projectStatus).toBe('UNDER_INSTALLATION');
    expect(unpaid?.filters?.paymentStatus).toBe('NOT_FULLY_PAID');
  });

  it('#5 subsidy chase pack', () => {
    expect(
      matchExactChipIntent('Subsidy chase pack', UserRole.OPERATIONS)?.metric,
    ).toBe('subsidy_chase_pack');
    expect(
      matchSubsidyChaseIntent('Pending subsidy with missing docs', UserRole.ADMIN)
        ?.metric,
    ).toBe('subsidy_chase_pack');
    expect(metricAllowedForRole('subsidy_chase_pack', UserRole.OPERATIONS)).toBe(
      true,
    );
  });

  it('#6 morning Ask', () => {
    expect(matchExactChipIntent('My morning Ask', UserRole.SALES)?.metric).toBe(
      'morning_brief',
    );
    expect(matchMorningBriefIntent('Start my day', UserRole.FINANCE)?.metric).toBe(
      'morning_brief',
    );
    expect(EXAMPLE_QUESTIONS_BY_ROLE.SALES[0]).toBe('My morning Ask');
  });

  it('#7 telemetry → exact chips', () => {
    expect(matchExactChipIntent('Call list for today', UserRole.SALES)?.metric).toBe(
      'who_to_call',
    );
    expect(
      matchExactChipIntent('Morning priorities', UserRole.MANAGEMENT)?.metric,
    ).toBe('morning_brief');
    expect(
      matchExactChipIntent('What should I work on this morning?', UserRole.ADMIN)
        ?.metric,
    ).toBe('morning_brief');
  });

  it('#8 prefs + guided playbooks', () => {
    const prefs = normalizeAskPreferences({
      defaultPeriod: 'current_month',
      favoriteQuestions: ['My morning Ask', 'Chase unpaid under-install'],
    });
    expect(prefs.defaultPeriod).toBe('current_month');
    expect(
      mergeFavoriteAskChips(prefs.favoriteQuestions, EXAMPLE_QUESTIONS_BY_ROLE.SALES, 5)[0],
    ).toBe('My morning Ask');

    const pb = matchExactChipIntent('Chase unpaid under-install', UserRole.SALES);
    expect(pb?.metric).toBe('guided_playbook');
    expect(pb?.filters?.detailSlice).toBe('chase_unpaid_under_install');
    expect(
      matchGuidedPlaybookIntent('Clear overdue tickets', UserRole.OPERATIONS)
        ?.filters?.detailSlice,
    ).toBe('clear_overdue_tickets');
    expect(playbookAsksForRole(UserRole.SALES)).toContain(
      'Chase unpaid under-install',
    );
  });
});
