import { describe, expect, it } from 'vitest';
import { ProjectType } from '@prisma/client';
import {
  extractZenithDimensions,
  parseCapacityBand,
  parsePanelType,
  parseProjectType,
} from './dimensionFilters';

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

  it('extracts DCR mix intent', () => {
    const dims = extractZenithDimensions('DCR vs Non-DCR mix');
    expect(dims.panelType).toBeUndefined();
    expect(dims.wantsPanelTypeMix).toBe(true);
  });

  it('extracts P1/P2 metric signals', () => {
    expect(extractZenithDimensions('Revenue by city').wantsCityMix).toBe(true);
    expect(extractZenithDimensions('Profit summary').wantsProfitSummary).toBe(true);
    expect(extractZenithDimensions('Compliance backlog').wantsCompliance).toBe(true);
    expect(extractZenithDimensions('Unpaid invoices').wantsUnpaidInvoices).toBe(true);
    expect(extractZenithDimensions('AMCs expiring soon').wantsAmcExpiring).toBe(true);
    expect(extractZenithDimensions('SLA status indicators').wantsSlaMix).toBe(true);
    expect(extractZenithDimensions('projects in Kochi').city?.toLowerCase()).toContain('kochi');
  });
});
