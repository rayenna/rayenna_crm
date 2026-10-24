import { describe, expect, it } from 'vitest';
import { ProjectType } from '@prisma/client';
import {
  extractZenithDimensions,
  mergeDimensionsIntoIntent,
  parseCapacityBand,
  parsePanelType,
  parseProjectType,
  salvageMetricFromDimensions,
} from './dimensionFilters';
import type { ZenithNlIntent } from './catalog';

describe('dimensionFilters', () => {
  it('parses subsidy / non-subsidy', () => {
    expect(parseProjectType('non-subsidy')).toBe(ProjectType.NON_SUBSIDY);
    expect(parseProjectType('Subsidy')).toBe(ProjectType.SUBSIDY);
  });

  it('parses DCR', () => {
    expect(parsePanelType('non dcr')).toBe('Non-DCR');
    expect(parsePanelType('DCR')).toBe('DCR');
  });

  it('parses capacity bands from phrases', () => {
    expect(parseCapacityBand('projects under 3 kW')).toEqual({ max: 2 });
    expect(parseCapacityBand('5-10 kW systems')).toEqual({ min: 5, max: 10 });
  });

  it('does not filter to one side on subsidy vs mix questions', () => {
    const dims = extractZenithDimensions('Subsidy vs non-subsidy revenue');
    expect(dims.projectType).toBeUndefined();
    expect(dims.wantsProjectTypeMix).toBe(true);
  });

  it('filters subsidy-only questions', () => {
    const dims = extractZenithDimensions('How many subsidy projects?');
    expect(dims.projectType).toBe(ProjectType.SUBSIDY);
  });

  it('salvages list non-subsidy away from revenue mix / confirmed cohort', () => {
    const q = 'List all Non Subsidy Projects this FY';
    const dims = extractZenithDimensions(q);
    expect(dims.projectType).toBe(ProjectType.NON_SUBSIDY);
    const claudeWrong: ZenithNlIntent = {
      metric: 'revenue_by_project_type',
      viz: 'chart',
      chartType: 'pie',
      filters: { projectStatus: 'CONFIRMED', projectType: 'NON_SUBSIDY' },
    };
    const salvaged = salvageMetricFromDimensions(
      mergeDimensionsIntoIntent(claudeWrong, dims),
      dims,
      () => true,
      q,
    );
    expect(salvaged.metric).toBe('projects_list_slice');
    expect(salvaged.filters?.projectType).toBe(ProjectType.NON_SUBSIDY);
    expect(salvaged.filters?.projectStatus).toBeUndefined();
  });

  it('extracts DCR mix intent', () => {
    const dims = extractZenithDimensions('DCR vs Non-DCR mix');
    expect(dims.panelType).toBeUndefined();
    expect(dims.wantsPanelTypeMix).toBe(true);
  });

  it('extracts P1/P2 metric signals', () => {
    expect(extractZenithDimensions('Revenue by city').wantsCityMix).toBe(true);
    expect(extractZenithDimensions('Profit summary').wantsProfitSummary).toBe(true);
    expect(extractZenithDimensions('payment timeline for ops Ravi').opsName).toMatch(/ravi/i);
    expect(
      extractZenithDimensions('feasibility pending for salesperson Anoop').salespersonName,
    ).toMatch(/anoop/i);
    expect(
      extractZenithDimensions("Ravi's under-installation unpaid").salespersonName,
    ).toMatch(/ravi/i);
    expect(extractZenithDimensions("Ravi's ops workload").opsName).toMatch(/ravi/i);
    expect(extractZenithDimensions('Compliance backlog').wantsCompliance).toBe(true);
    expect(extractZenithDimensions('Unpaid invoices').wantsUnpaidInvoices).toBe(true);
    expect(extractZenithDimensions('AMCs expiring soon').wantsAmcExpiring).toBe(true);
    expect(extractZenithDimensions('SLA status indicators').wantsSlaMix).toBe(true);
    expect(extractZenithDimensions('projects in Kochi').city?.toLowerCase()).toContain('kochi');
  });

  it('extracts Lost deals and active PE Ready/Draft', () => {
    const lost = extractZenithDimensions(
      'List the Lost Deals that have Active Proposals in Proposal Engine',
    );
    expect(lost.projectStatus).toBe('LOST');
    expect(lost.peBucket).toBe('active');
    const anyStage = extractZenithDimensions(
      'List the Deals in (any stage) that have Active (PE Ready / Draft) proposals in Proposal engine',
    );
    expect(anyStage.projectStatus).toBeUndefined();
    expect(anyStage.peBucket).toBe('active');
    expect(anyStage.city).toBeUndefined();
  });
});
