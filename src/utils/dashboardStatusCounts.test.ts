import { describe, expect, it } from 'vitest';
import { ProjectStatus } from '@prisma/client';
import { countFromStatusGroupBy } from './dashboardStatusCounts';

const rows = [
  { projectStatus: ProjectStatus.LEAD, _count: { id: 4 } },
  { projectStatus: ProjectStatus.SITE_SURVEY, _count: { id: 2 } },
  { projectStatus: ProjectStatus.PROPOSAL, _count: { id: 3 } },
  { projectStatus: ProjectStatus.CONFIRMED, _count: { id: 5 } },
];

describe('countFromStatusGroupBy', () => {
  it('counts a single status', () => {
    expect(countFromStatusGroupBy(rows, ProjectStatus.SITE_SURVEY)).toBe(2);
    expect(countFromStatusGroupBy(rows, ProjectStatus.CONFIRMED)).toBe(5);
  });

  it('counts open pipeline stages (Lead + Survey + Proposal)', () => {
    expect(
      countFromStatusGroupBy(rows, [
        ProjectStatus.LEAD,
        ProjectStatus.SITE_SURVEY,
        ProjectStatus.PROPOSAL,
      ]),
    ).toBe(9);
  });

  it('returns 0 for missing status or empty rows', () => {
    expect(countFromStatusGroupBy(rows, ProjectStatus.LOST)).toBe(0);
    expect(countFromStatusGroupBy(undefined, ProjectStatus.LEAD)).toBe(0);
    expect(countFromStatusGroupBy([], ProjectStatus.LEAD)).toBe(0);
  });
});
