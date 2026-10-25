import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchExactChipIntent } from './chipIntents';
import { matchCustomersListIntent } from './customerDetailAsk';
import {
  extractZenithDimensions,
  mergeDimensionsIntoIntent,
  salvageMetricFromDimensions,
} from './dimensionFilters';
import { matchProjectsListFilterIntent } from './listFilterAsk';

describe('matchProjectsListFilterIntent', () => {
  it('matches list/show projects filter questions', () => {
    expect(matchProjectsListFilterIntent('List residential projects', UserRole.ADMIN)?.metric).toBe(
      'projects_list_slice',
    );
    expect(
      matchProjectsListFilterIntent('Show all apartment projects in Kochi', UserRole.MANAGEMENT)
        ?.metric,
    ).toBe('projects_list_slice');
  });

  it('does not steal analytics mixes', () => {
    expect(
      matchProjectsListFilterIntent('Subsidy vs non-subsidy revenue mix', UserRole.ADMIN),
    ).toBeNull();
  });
});

describe('dimension + salvage for Projects list filters', () => {
  it('extracts apartment plural and pending subsidy / loan', () => {
    const dims = extractZenithDimensions('Show all apartments projects availing loan');
    expect(dims.customerType).toBe('APARTMENT');
    expect(dims.availingLoan).toBe(true);

    const pending = extractZenithDimensions('List pending subsidy projects');
    expect(pending.pendingSubsidy).toBe(true);
  });

  it('extracts status, payment, needs review, hub link', () => {
    expect(extractZenithDimensions('List under installation projects').projectStatus).toBe(
      'UNDER_INSTALLATION',
    );
    expect(extractZenithDimensions('List fully paid projects').paymentStatus).toBe('FULLY_PAID');
    expect(extractZenithDimensions('List projects needing review').dataSenseNeedsReview).toBe(true);
    expect(extractZenithDimensions('List hub unlinked projects').hubPlantLinked).toBe(false);
  });

  it('routes list + customer type to projects_list_slice not cohort', () => {
    const dims = extractZenithDimensions('List residential projects');
    const withFilters = {
      metric: 'clarify' as const,
      viz: 'table' as const,
      filters: { customerType: dims.customerType },
    };
    const salvaged = salvageMetricFromDimensions(
      withFilters,
      dims,
      () => true,
      'List residential projects',
    );
    expect(salvaged.metric).toBe('projects_list_slice');
    expect(salvaged.filters?.customerType).toBe('RESIDENTIAL');
  });

  it('does not treat customer master as a city', () => {
    const dims = extractZenithDimensions('show all apartments in customer master');
    expect(dims.city).toBeUndefined();
  });
});

describe('chip wiring for customer master types', () => {
  it('lists apartment customers', () => {
    const intent = matchExactChipIntent(
      'show all apartments in customer master',
      UserRole.ADMIN,
    );
    expect(intent?.metric).toBe('customers_list_slice');
    expect(intent?.filters?.customerType).toBe('APARTMENT');
  });
});

describe('system type + PE Ready is a project list, not Customer Master', () => {
  it('does not steal hybrid PE Ready questions into the customer list', () => {
    expect(
      matchCustomersListIntent(
        'list all my hybrid customers who have active proposals',
        UserRole.ADMIN,
      ),
    ).toBeNull();
  });

  it('routes hybrid/on-grid/off-grid + PE Ready to projects_list_slice', () => {
    const q = 'list all my hybrid customers who have active proposals';
    expect(matchProjectsListFilterIntent(q, UserRole.ADMIN)?.metric).toBe('projects_list_slice');
    expect(matchExactChipIntent(q, UserRole.ADMIN)?.metric).toBe('projects_list_slice');

    const dims = extractZenithDimensions(q);
    const merged = mergeDimensionsIntoIntent(matchExactChipIntent(q, UserRole.ADMIN)!, dims);
    expect(merged.filters?.systemType).toBe('HYBRID');
    expect(merged.filters?.peBucket).toBe('proposal-ready');

    const onGrid = matchExactChipIntent('Show PE Ready on-grid projects', UserRole.ADMIN);
    expect(onGrid?.metric).toBe('projects_list_slice');
    expect(extractZenithDimensions('Show PE Ready on-grid projects').peBucket).toBe(
      'proposal-ready',
    );
  });
});
