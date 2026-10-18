import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  matchProjectDetailLookupIntent,
  matchProjectsOpsDetailIntent,
} from './projectDetailAsk';

describe('matchProjectDetailLookupIntent', () => {
  it('parses SL No phrases', () => {
    expect(matchProjectDetailLookupIntent('status of SL 42', UserRole.SALES)?.filters?.search).toBe(
      'SL:42',
    );
    expect(
      matchProjectDetailLookupIntent('open project #99', UserRole.ADMIN)?.filters?.search,
    ).toBe('SL:99');
  });

  it('parses customer status phrases', () => {
    expect(
      matchProjectDetailLookupIntent('status of Ramesh Kumar', UserRole.MANAGEMENT)?.filters
        ?.search,
    ).toBe('ramesh kumar');
  });

  it('ignores bare show / hub phrases', () => {
    expect(matchProjectDetailLookupIntent('Show Solis IDs', UserRole.ADMIN)).toBeNull();
    expect(matchProjectDetailLookupIntent('Payment timeline', UserRole.FINANCE)).toBeNull();
  });
});

describe('matchProjectsOpsDetailIntent', () => {
  it('detects compliance and document slices', () => {
    expect(
      matchProjectsOpsDetailIntent('projects with feasibility pending', UserRole.OPERATIONS)
        ?.filters?.detailSlice,
    ).toBe('feasibility_pending');
    expect(
      matchProjectsOpsDetailIntent('projects missing MNRE documents', UserRole.ADMIN)?.filters
        ?.detailSlice,
    ).toBe('missing_doc_mnre');
    expect(
      matchProjectsOpsDetailIntent('projects missing site survey', UserRole.OPERATIONS)?.filters
        ?.detailSlice,
    ).toBe('missing_survey');
    const confirmed = matchProjectsOpsDetailIntent(
      'Confirmed projects with no documents',
      UserRole.ADMIN,
    );
    expect(confirmed?.filters?.detailSlice).toBe('missing_documents');
    expect(confirmed?.filters?.projectStatus).toBe('CONFIRMED');
  });

  it('detects payment schedule gaps, overdue commissioning, hub unlinked', () => {
    expect(
      matchProjectsOpsDetailIntent('projects with advance only', UserRole.FINANCE)?.filters
        ?.detailSlice,
    ).toBe('advance_only');
    expect(
      matchProjectsOpsDetailIntent('projects with no P2', UserRole.FINANCE)?.filters?.detailSlice,
    ).toBe('no_p2');
    expect(
      matchProjectsOpsDetailIntent('overdue commissioning this quarter', UserRole.OPERATIONS)
        ?.filters?.detailSlice,
    ).toBe('commissioning_overdue');
    expect(
      matchProjectsOpsDetailIntent('Hub unlinked projects', UserRole.ADMIN)?.filters?.detailSlice,
    ).toBe('hub_unlinked');
  });

  it('detects commissioning, remarks mentioning, incentive', () => {
    expect(
      matchProjectsOpsDetailIntent('show projects with commissioning dates', UserRole.ADMIN)
        ?.filters?.detailSlice,
    ).toBe('commissioning');
    const mentioning = matchProjectsOpsDetailIntent(
      'projects mentioning delay',
      UserRole.SALES,
    );
    expect(mentioning?.filters?.detailSlice).toBe('remarks');
    expect(mentioning?.filters?.search).toMatch(/delay/i);
    expect(
      matchProjectsOpsDetailIntent('incentive eligible projects', UserRole.FINANCE)?.filters
        ?.detailSlice,
    ).toBe('incentive_eligible');
  });
});

describe('matchProjectDetailLookupIntent remarks', () => {
  it('opens project for last remark on SL', () => {
    expect(
      matchProjectDetailLookupIntent('last remark on SL 42', UserRole.ADMIN)?.filters?.search,
    ).toBe('SL:42');
  });
});
