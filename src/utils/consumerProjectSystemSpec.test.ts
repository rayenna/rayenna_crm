import { describe, expect, it } from 'vitest';
import { buildConsumerSystemSpec, buildPanelLabel, resolvePanelCount } from './consumerProjectSystemSpec';

describe('consumerProjectSystemSpec', () => {
  it('builds full labels from CRM project fields', () => {
    const spec = buildConsumerSystemSpec({
      systemCapacity: 5,
      panelBrand: 'Tata Power Solar',
      panelType: 'DCR',
      panelCapacityW: 550,
      inverterBrand: 'Growatt',
      inverterCapacityKw: 5,
    });

    expect(spec.systemKw).toBe(5);
    expect(spec.panelCount).toBe(9);
    expect(spec.panelLabel).toContain('9 × 550W');
    expect(spec.panelLabel).toContain('Tata Power Solar');
    expect(spec.inverterLabel).toBe('Growatt · 5 kW');
    expect(spec.equipmentSummary).toContain('5 kW');
  });

  it('uses fallbacks when CRM fields are empty', () => {
    const spec = buildConsumerSystemSpec({
      systemCapacity: null,
      panelBrand: null,
      panelType: null,
      panelCapacityW: null,
      inverterBrand: null,
      inverterCapacityKw: null,
    });

    expect(spec.panelLabel).toBe('Panel details pending');
    expect(spec.inverterLabel).toBe('Inverter details pending');
    expect(spec.equipmentSummary).toContain('Capacity pending');
  });

  it('resolvePanelCount rounds from kW and panel watts', () => {
    expect(resolvePanelCount(5.5, 550)).toBe(10);
  });

  it('buildPanelLabel formats count and brand', () => {
    expect(
      buildPanelLabel({
        panelCount: 12,
        panelCapacityW: 540,
        panelBrand: 'Waaree',
        panelType: 'DCR',
      }),
    ).toBe('12 × 540W · Waaree · DCR');
  });
});
