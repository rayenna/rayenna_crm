import { describe, expect, it } from 'vitest';
import { buildRoiFromCosting, resolveRoiSystemSizeKw } from './roiFromCosting';
import type { ROIResult } from './customerStore';

const savedAt = '2026-10-19T00:00:00.000Z';

function existing(partial: Partial<ROIResult['inputs']>): ROIResult {
  return {
    inputs: {
      systemSizeKw: 3,
      tariff: 9.5,
      generationFactor: 1400,
      escalationPercent: 4,
      projectCost: 100000,
      ...partial,
    },
    annualGeneration: 0,
    annualSavings: 0,
    paybackYears: 0,
    totalSavings25Years: 0,
    roiPercent: 0,
    lcoe: 0,
    co2OffsetTons: 0,
    yearlyBreakdown: [],
  };
}

describe('resolveRoiSystemSizeKw', () => {
  it('rounds CRM capacity and ignores a decimal costing size', () => {
    expect(resolveRoiSystemSizeKw(3.2, 4.96)).toBe(3);
  });

  it('accepts a whole-number costing size only when CRM capacity is missing', () => {
    expect(resolveRoiSystemSizeKw(null, 3)).toBe(3);
    expect(resolveRoiSystemSizeKw(null, 3.0004)).toBe(3);
    expect(resolveRoiSystemSizeKw(null, 4.96)).toBeNull();
  });
});

describe('buildRoiFromCosting', () => {
  it('saves Kerala defaults and the household subsidy for a residential project', () => {
    const built = buildRoiFromCosting({
      grandTotal: 250000.4,
      costingSystemSizeKw: 4.8,
      crmSystemSizeKw: 5,
      segment: 'Residential',
      savedAt,
    });
    expect(built).not.toBeNull();
    expect(built!.artifact.result.inputs).toMatchObject({
      systemSizeKw: 5,
      tariff: 8.2,
      generationFactor: 1500,
      escalationPercent: 5,
      projectCost: 250000,
      subsidyEligible: true,
      subsidyAmount: 78000,
    });
    expect(built!.artifact.result.yearlyBreakdown).toHaveLength(25);
    expect(built!.artifact.result.effectiveProjectCost).toBe(172000);
    expect(built!.summary).toContain('ROI saved');
  });

  it('skips the household subsidy for a commercial segment', () => {
    const built = buildRoiFromCosting({
      grandTotal: 800000,
      costingSystemSizeKw: 10,
      crmSystemSizeKw: 10,
      segment: 'Commercial',
      savedAt,
    });
    expect(built!.artifact.result.inputs.subsidyEligible).toBeFalsy();
    expect(built!.summary).toContain('commercial');
  });

  it('keeps a previously saved tariff and subsidy override when costing is saved again', () => {
    const built = buildRoiFromCosting({
      grandTotal: 300000,
      costingSystemSizeKw: 3,
      crmSystemSizeKw: 3,
      segment: 'Residential',
      existing: existing({ subsidyEligible: true, subsidyAmount: 50000, systemSizeKw: 3 }),
      savedAt,
    });
    expect(built!.artifact.result.inputs.tariff).toBe(9.5);
    expect(built!.artifact.result.inputs.generationFactor).toBe(1400);
    expect(built!.artifact.result.inputs.subsidyAmount).toBe(50000);
    expect(built!.artifact.result.inputs.projectCost).toBe(300000);
  });

  it('leaves subsidy off when a previous ROI explicitly declined it', () => {
    const built = buildRoiFromCosting({
      grandTotal: 200000,
      costingSystemSizeKw: 3,
      crmSystemSizeKw: 3,
      segment: 'Residential',
      existing: existing({ subsidyEligible: false, subsidyAmount: undefined }),
      savedAt,
    });
    expect(built!.artifact.result.inputs.subsidyEligible).toBeFalsy();
  });

  it('does not invent ROI when there is no whole-kW size', () => {
    expect(
      buildRoiFromCosting({
        grandTotal: 100000,
        costingSystemSizeKw: 4.96,
        crmSystemSizeKw: null,
        savedAt,
      }),
    ).toBeNull();
  });
});
