import { describe, expect, it } from 'vitest';
import { applyPreflightFixes } from './applyPreflightFixes';
import { parseInverterKwTotal, runProposalPreflight } from './runProposalPreflight';
import type { PreflightContext } from './types';

function baseCtx(over: Partial<PreflightContext> = {}): PreflightContext {
  return {
    crmSystemSizeKw: 5,
    sheetItems: [
      {
        category: 'pv-modules',
        itemName: 'Waaree 500W Mono',
        quantity: '10',
        gstPercent: '5',
      },
      {
        category: 'inverters',
        itemName: 'Growatt 5kW On-grid',
        quantity: '1',
        gstPercent: '5',
      },
      {
        category: 'dc-cable',
        itemName: 'DC Cable 4 sqmm',
        quantity: '100',
        gstPercent: '18',
      },
    ],
    sheetSystemSizeKw: 5,
    bomRows: [
      { category: 'pv-modules', itemName: 'Waaree 500W Mono', quantity: '10' },
      { category: 'inverters', itemName: 'Growatt 5kW On-grid', quantity: '1' },
    ],
    roi: {
      systemSizeKw: 5,
      tariff: 8.2,
      generationFactor: 1500,
      subsidyEligible: false,
    },
    roof: {
      includeRoofLayout: false,
      hasSavedLayout: false,
      hasValidGps: true,
    },
    ...over,
  };
}

describe('runProposalPreflight', () => {
  it('returns no findings for a clean assembly', () => {
    const result = runProposalPreflight(baseCtx());
    expect(result.findings).toEqual([]);
    expect(result.errorCount).toBe(0);
  });

  it('flags missing costing, bom, and roi', () => {
    const result = runProposalPreflight(
      baseCtx({
        sheetItems: [],
        sheetSystemSizeKw: null,
        bomRows: [],
        roi: null,
      }),
    );
    const ids = result.findings.map((f) => f.id);
    expect(ids).toContain('missing_costing');
    expect(ids).toContain('missing_bom');
    expect(ids).toContain('missing_roi');
    expect(result.errorCount).toBe(3);
  });

  it('flags module names without wattage when spec and CRM are also empty', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmPanelWattage: null,
        sheetItems: [
          {
            category: 'pv-modules',
            itemName: 'Waaree Mono Bifacial',
            quantity: '9',
            gstPercent: '5',
            specification: 'As per datasheet',
          },
        ],
        sheetSystemSizeKw: 0,
      }),
    );
    expect(result.findings.some((f) => f.id === 'module_wattage_token')).toBe(true);
    expect(result.findings.find((f) => f.id === 'module_wattage_token')?.autoFixable).toBe(false);
  });

  it('accepts wattage from specification range like 600-620', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmPanelWattage: null,
        crmSystemSizeKw: 4.96,
        sheetItems: [
          {
            category: 'pv-modules',
            itemName: 'TopCon Module',
            quantity: '8',
            gstPercent: '5',
            specification: 'ADANI/EMMVEE 600-620 DCR TOPC',
          },
          {
            category: 'inverters',
            itemName: 'Growatt 5kW On-grid',
            quantity: '1',
            gstPercent: '5',
          },
        ],
        sheetSystemSizeKw: 4.96,
        bomRows: [
          {
            category: 'pv-modules',
            itemName: 'TopCon Module',
            quantity: '8',
            specification: 'ADANI/EMMVEE 600-620 DCR TOPC',
          },
          { category: 'inverters', itemName: 'Growatt 5kW On-grid', quantity: '1' },
        ],
        roi: { systemSizeKw: 5, tariff: 8.2, generationFactor: 1500 },
      }),
    );
    expect(result.findings.some((f) => f.id === 'module_wattage_token')).toBe(false);
    expect(result.findings.some((f) => f.id === 'system_size_zero')).toBe(false);
  });

  it('accepts CRM panel wattage when name and spec have no wattage', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmPanelWattage: 550,
        crmSystemSizeKw: 4.95,
        sheetItems: [
          {
            category: 'pv-modules',
            itemName: 'TopCon Module',
            quantity: '9',
            gstPercent: '5',
            specification: 'As per datasheet',
          },
          {
            category: 'inverters',
            itemName: 'Growatt 5kW On-grid',
            quantity: '1',
            gstPercent: '5',
          },
        ],
        sheetSystemSizeKw: 4.95,
        bomRows: [
          { category: 'pv-modules', itemName: 'TopCon Module', quantity: '9' },
          { category: 'inverters', itemName: 'Growatt 5kW On-grid', quantity: '1' },
        ],
        roi: { systemSizeKw: 5, tariff: 8.2, generationFactor: 1500 },
      }),
    );
    expect(result.findings.some((f) => f.id === 'module_wattage_token')).toBe(false);
  });

  it('flags GST that does not match category defaults', () => {
    const result = runProposalPreflight(
      baseCtx({
        sheetItems: [
          {
            category: 'pv-modules',
            itemName: 'Waaree 590W',
            quantity: '9',
            gstPercent: '',
          },
          {
            category: 'installation',
            itemName: 'Labour',
            quantity: '1',
            gstPercent: '5',
          },
        ],
      }),
    );
    const gst = result.findings.find((f) => f.id === 'gst_category_default');
    expect(gst).toBeTruthy();
    expect(gst?.autoFixable).toBe(true);
  });

  it('flags tariff and generation factor out of band', () => {
    const result = runProposalPreflight(
      baseCtx({
        roi: {
          systemSizeKw: 5,
          tariff: 50,
          generationFactor: 5000,
        },
      }),
    );
    const ids = result.findings.map((f) => f.id);
    expect(ids).toContain('tariff_out_of_band');
    expect(ids).toContain('gen_factor_out_of_band');
  });

  it('flags subsidy override above scheme and offers auto-fix', () => {
    const result = runProposalPreflight(
      baseCtx({
        roi: {
          systemSizeKw: 5,
          tariff: 8.2,
          generationFactor: 1500,
          subsidyEligible: true,
          subsidyAmount: 200000,
        },
      }),
    );
    const f = result.findings.find((x) => x.id === 'subsidy_override_high');
    expect(f?.autoFixable).toBe(true);
    expect(f?.autoFixId).toBe('subsidy_override_high');
  });

  it('flags roof include without saved layout', () => {
    const result = runProposalPreflight(
      baseCtx({
        roof: {
          includeRoofLayout: true,
          hasSavedLayout: false,
          hasValidGps: false,
        },
      }),
    );
    expect(result.findings.some((f) => f.id === 'roof_include_missing')).toBe(true);
  });

  it('flags CRM vs costing capacity choice when they disagree', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmSystemSizeKw: 10,
        roi: { systemSizeKw: 5, tariff: 8.2, generationFactor: 1500 },
      }),
    );
    const f = result.findings.find((x) => x.id === 'system_size_mismatch' && x.sizeChoice);
    expect(f).toBeTruthy();
    expect(f?.sizeChoice?.crmKw).toBe(10);
    expect(f?.sizeChoice?.costingKw).toBe(5);
    expect(f?.autoFixable).toBe(true);
  });

  it('offers round for near-integer ROI kW', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmSystemSizeKw: null,
        roi: { systemSizeKw: 5.02, tariff: 8.2, generationFactor: 1500 },
      }),
    );
    const f = result.findings.find((x) => x.id === 'roi_not_integer_kw');
    expect(f?.autoFixable).toBe(true);
  });

  it('does not warn about non-integer ROI when CRM capacity is set', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmSystemSizeKw: 10,
        roi: { systemSizeKw: 10.46, tariff: 8.2, generationFactor: 1500 },
      }),
    );
    expect(result.findings.find((x) => x.id === 'roi_not_integer_kw')).toBeUndefined();
  });

  it('Cherian-like: CRM 10 kW + stale ROI 10.46 + costing 10.46 → no roi_not_integer warning', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmSystemSizeKw: 10,
        sheetSystemSizeKw: 10.46,
        sheetItems: [
          {
            category: 'pv-modules',
            itemName: 'Waaree 590W Mono',
            quantity: '18',
            gstPercent: '5',
            specification: '580-600',
          },
          {
            category: 'inverters',
            itemName: 'Growatt 10kW On-grid',
            quantity: '1',
            gstPercent: '5',
          },
        ],
        bomRows: [
          { category: 'pv-modules', itemName: 'Waaree 590W Mono', quantity: '18' },
          { category: 'inverters', itemName: 'Growatt 10kW On-grid', quantity: '1' },
        ],
        roi: { systemSizeKw: 10.46, tariff: 8.2, generationFactor: 1500 },
      }),
    );
    expect(result.findings.find((x) => x.id === 'roi_not_integer_kw')).toBeUndefined();
    // CRM vs costing mismatch may still appear — that is intentional
    const mismatch = result.findings.find((x) => x.id === 'system_size_mismatch');
    if (mismatch) {
      expect(mismatch.sizeChoice?.crmKw).toBe(10);
      expect(mismatch.autoFixable).toBe(true);
    }
  });

  it('uses CRM whole kW for subsidy band when saved ROI is a decimal', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmSystemSizeKw: 3,
        sheetItems: [],
        bomRows: [],
        sheetSystemSizeKw: null,
        roi: {
          systemSizeKw: 3.2,
          tariff: 8.2,
          generationFactor: 1500,
          subsidyEligible: true,
          subsidyAmount: 200000,
        },
      }),
    );
    const f = result.findings.find((x) => x.id === 'subsidy_override_high');
    expect(f).toBeTruthy();
    expect(f?.detail).toContain('3 kW');
    expect(result.findings.find((x) => x.id === 'roi_not_integer_kw')).toBeUndefined();
  });

  it('keeps far-from-integer ROI warning when CRM capacity is missing', () => {
    const result = runProposalPreflight(
      baseCtx({
        crmSystemSizeKw: null,
        roi: { systemSizeKw: 10.46, tariff: 8.2, generationFactor: 1500 },
      }),
    );
    const f = result.findings.find((x) => x.id === 'roi_not_integer_kw');
    expect(f?.autoFixable).toBe(false);
  });
});

describe('parseInverterKwTotal', () => {
  it('parses kW from inverter item names', () => {
    expect(
      parseInverterKwTotal([
        { category: 'inverters', itemName: 'Deye 5kW Hybrid', quantity: '2' },
      ]),
    ).toBe(10);
  });
});

describe('applyPreflightFixes', () => {
  it('forces category GST defaults', () => {
    const result = applyPreflightFixes({
      selectedFixIds: ['gst_category_default'],
      sheetItems: [
        {
          category: 'pv-modules',
          itemName: 'Waaree 590W',
          quantity: '9',
          gstPercent: '',
        },
        {
          category: 'installation',
          itemName: 'Labour',
          quantity: '1',
          gstPercent: '5',
        },
      ],
      roi: null,
    });
    expect(result.costingChanged).toBe(true);
    expect(result.sheetItems[0].gstPercent).toBe('5');
    expect(result.sheetItems[1].gstPercent).toBe('18');
    expect(result.applied).toContain('gst_category_default');
  });

  it('resets subsidy override to scheme amount', () => {
    const result = applyPreflightFixes({
      selectedFixIds: ['subsidy_override_high'],
      sheetItems: [],
      roi: {
        systemSizeKw: 5,
        tariff: 8.2,
        generationFactor: 1500,
        subsidyEligible: true,
        subsidyAmount: 200000,
      },
    });
    expect(result.roiChanged).toBe(true);
    expect(result.roi?.subsidyAmount).toBe(78000);
  });

  it('applies CRM capacity choice without changing costing lines', () => {
    const result = applyPreflightFixes({
      selectedFixIds: ['system_size_mismatch'],
      sheetItems: [
        {
          category: 'pv-modules',
          itemName: 'Waaree 590W',
          quantity: '9',
          gstPercent: '5',
        },
      ],
      sheetSystemSizeKw: 5.31,
      systemSizeSource: 'crm',
      crmSystemSizeKw: 5,
      costingDerivedKw: 5.31,
      roi: { systemSizeKw: 5.31, tariff: 8.2, generationFactor: 1500 },
    });
    expect(result.proposalSystemSizeKw).toBe(5);
    expect(result.roi?.systemSizeKw).toBe(5);
    expect(result.costingChanged).toBe(false);
    expect(result.applied).toContain('system_size_mismatch');
  });

  it('applies costing-derived capacity choice', () => {
    const result = applyPreflightFixes({
      selectedFixIds: ['system_size_mismatch'],
      sheetItems: [
        {
          category: 'pv-modules',
          itemName: 'Waaree 590W',
          quantity: '9',
          gstPercent: '5',
        },
      ],
      sheetSystemSizeKw: 5.31,
      systemSizeSource: 'costing',
      crmSystemSizeKw: 5,
      costingDerivedKw: 5.31,
      roi: { systemSizeKw: 5, tariff: 8.2, generationFactor: 1500 },
    });
    expect(result.proposalSystemSizeKw).toBe(5.31);
    expect(result.roi?.systemSizeKw).toBe(5.31);
    expect(result.applied).toContain('system_size_mismatch');
  });

  it('rounds near-integer ROI kW', () => {
    const result = applyPreflightFixes({
      selectedFixIds: ['roi_not_integer_kw'],
      sheetItems: [],
      roi: { systemSizeKw: 5.02, tariff: 8.2, generationFactor: 1500 },
    });
    expect(result.roi?.systemSizeKw).toBe(5);
  });

  it('sets far-from-integer ROI kW to CRM capacity', () => {
    const result = applyPreflightFixes({
      selectedFixIds: ['roi_not_integer_kw'],
      sheetItems: [],
      crmSystemSizeKw: 10,
      roi: { systemSizeKw: 10.46, tariff: 8.2, generationFactor: 1500 },
    });
    expect(result.roi?.systemSizeKw).toBe(10);
    expect(result.applied).toContain('roi_not_integer_kw');
  });
});
