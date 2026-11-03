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

  it('uses proposal snapshot when local costing/BOM blobs are light (empty items/rows)', () => {
    const full = customerWithStaleRoi(3, 3);
    const light: typeof full = {
      ...full,
      costing: full.costing
        ? { ...full.costing, items: [], itemCount: 1 }
        : null,
      bom: full.bom ? { ...full.bom, rows: [], rowCount: 1 } : null,
    };
    const withoutSnap = buildPreflightContext(light, { includeRoofLayout: false });
    expect(withoutSnap).not.toBeNull();
    expect(runProposalPreflight(withoutSnap!).findings.map((f) => f.id)).toEqual(
      expect.arrayContaining(['missing_costing', 'missing_bom']),
    );

    const withSnap = buildPreflightContext(light, {
      includeRoofLayout: false,
      proposalSnapshot: {
        sheet: {
          id: 'snap',
          name: full.costing!.sheetName,
          description: '',
          savedAt: full.costing!.savedAt,
          items: full.costing!.items,
          showGst: full.costing!.showGst,
          marginPercent: full.costing!.marginPercent,
          grandTotal: full.costing!.grandTotal,
          totalGst: full.costing!.totalGst,
          systemSizeKw: full.costing!.systemSizeKw,
        },
        bom: full.bom!.rows.map((r) => ({
          category: r.category,
          itemName: r.itemName,
          quantity: r.quantity,
          specification: r.specification ?? '',
        })),
        roi: full.roi!.result as any,
      },
    });
    expect(withSnap).not.toBeNull();
    const ids = runProposalPreflight(withSnap!).findings.map((f) => f.id);
    expect(ids).not.toContain('missing_costing');
    expect(ids).not.toContain('missing_bom');
    expect(ids).not.toContain('missing_roi');
  });
});
