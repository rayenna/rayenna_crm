import { describe, expect, it } from 'vitest';
import {
  buildCoachChecklist,
  coachProgressKey,
  dismissCoach,
  isCoachDismissed,
} from './dashboardCoach';

describe('coachProgressKey', () => {
  it('encodes core artifacts and roof', () => {
    expect(coachProgressKey({ costing: null, bom: null, roi: null, proposal: null }, false)).toBe(
      '00000',
    );
    expect(
      coachProgressKey({ costing: {}, bom: {}, roi: {}, proposal: {} }, true),
    ).toBe('11111');
  });
});

describe('buildCoachChecklist', () => {
  it('marks costing as current when nothing is saved', () => {
    const { items, continueStep, allCoreDone } = buildCoachChecklist(
      { costing: null, bom: null, roi: null, proposal: null },
      false,
    );
    expect(allCoreDone).toBe(false);
    expect(continueStep.path).toBe('/costing');
    expect(items.find((i) => i.id === 'costing')?.current).toBe(true);
    expect(items.find((i) => i.id === 'costing')?.done).toBe(false);
    expect(items.find((i) => i.id === 'roof')?.optional).toBe(true);
  });

  it('marks proposal as current after costing and ROI', () => {
    const { items } = buildCoachChecklist(
      { costing: {}, bom: {}, roi: {}, proposal: null },
      false,
    );
    expect(items.find((i) => i.id === 'proposal')?.current).toBe(true);
    expect(items.find((i) => i.id === 'costing')?.done).toBe(true);
  });

  it('highlights optional roof when core work is done', () => {
    const { items, allCoreDone } = buildCoachChecklist(
      { costing: {}, bom: {}, roi: {}, proposal: {} },
      false,
    );
    expect(allCoreDone).toBe(true);
    expect(items.find((i) => i.id === 'roof')?.current).toBe(true);
  });
});

describe('coach dismiss', () => {
  it('stores dismiss against the progress key', () => {
    const store: Record<string, string> = {};
    dismissCoach('cust-1', '11000', (k, v) => {
      store[k] = v;
    });
    expect(isCoachDismissed('cust-1', '11000', (k) => store[k] ?? null)).toBe(true);
    expect(isCoachDismissed('cust-1', '11100', (k) => store[k] ?? null)).toBe(false);
  });
});
