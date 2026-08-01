import { describe, expect, it } from 'vitest';
import { buildPreflightContext } from './buildPreflightContext';
import { runProposalPreflight } from './runProposalPreflight';
import type { CustomerRecord } from '../customerStore';

function customerWithStaleRoi(crmKw: number, roiKw: number): CustomerRecord {
  return {
    id: 'cust_test_cherian',
    master: {
      name: 'Cherian',
      location: 'Kochi',
      contactPerson: '',
      phone: '',
      email: '',
      systemSizeKw: crmKw,
      panelWattage: 590,
      projectNumber: 139,
    },
    costing: {
      sheetName: 'Cherian — Costing',
      savedAt: new Date().toISOString(),
      items: [
        {
          id: '1',
          category: 'pv-modules',
          itemName: 'Waaree 590W',
          quantity: '18',
          unitCost: '10000',
          gstPercent: '5',
          specification: '580-600',
        },
      ],
      showGst: true,
      marginPercent: 0,
      grandTotal: 500000,
      totalGst: 0,
      systemSizeKw: roiKw,
    },
    bom: {
      savedAt: new Date().toISOString(),
      rows: [
        { category: 'pv-modules', itemName: 'Waaree 590W', quantity: '18', specification: '580-600' },
      ],
    },
    roi: {
      savedAt: new Date().toISOString(),
      result: {
        inputs: {
          systemSizeKw: roiKw,
          tariff: 8.2,
          generationFactor: 1500,
          escalationPercent: 5,
          projectCost: 500000,
        },
        annualGeneration: 15000,
        annualSavings: 100000,
        paybackYears: 4,
        totalSavings25Years: 1,
        roiPercent: 20,
        lcoe: 2,
        co2OffsetTons: 1,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as CustomerRecord;
}

describe('buildPreflightContext + runProposalPreflight (CRM capacity)', () => {
  it('end-to-end: CRM 10 kW with stale ROI 10.46 does not flag roi_not_integer_kw', () => {
    const ctx = buildPreflightContext(customerWithStaleRoi(10, 10.46), {
      includeRoofLayout: false,
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.crmSystemSizeKw).toBe(10);
    expect(ctx!.roi?.systemSizeKw).toBe(10.46);

    const result = runProposalPreflight(ctx!);
    expect(result.findings.find((f) => f.id === 'roi_not_integer_kw')).toBeUndefined();
  });

  it('end-to-end: without CRM capacity, stale decimal ROI still warns', () => {
    const rec = customerWithStaleRoi(10, 10.46);
    rec.master.systemSizeKw = 0;
    const ctx = buildPreflightContext(rec, { includeRoofLayout: false });
    expect(ctx).not.toBeNull();
    const result = runProposalPreflight({ ...ctx!, crmSystemSizeKw: null });
    expect(result.findings.find((f) => f.id === 'roi_not_integer_kw')).toBeTruthy();
  });
});
