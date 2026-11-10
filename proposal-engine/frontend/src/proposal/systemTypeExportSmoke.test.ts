/**
 * Smoke contract: CRM system type must appear in every A–E surface used by
 * on-page render, DOCX, PPTX, PDF (DOM), and Link Share (DOM snapshot).
 */
import { describe, expect, it } from 'vitest';
import {
  execSummary,
  savingsText,
  scopeSectionsFor,
  scopeText,
} from './proposalCopy';
import { commercialsFromProposal } from './exportPpt';
import {
  proposalForHeading,
  rewriteSystemTypeInOverrides,
  systemTypeCapacityChip,
  systemTypeHeadingTerm,
  systemTypeInverterSupplyLabel,
} from './systemTypeLabel';
import type { ProposalData, ROIResult } from './types';

const roi: ROIResult = {
  inputs: {
    systemSizeKw: 15,
    projectCost: 1_000_000,
    tariff: 8,
    escalationPercent: 5,
    generationFactor: 1400,
  },
  annualGeneration: 21_000,
  annualSavings: 168_000,
  paybackYears: 6,
  totalSavings25Years: 5_000_000,
  roiPercent: 400,
  lcoe: 2.5,
  co2OffsetTons: 17.5,
};

function hybridProposal(): ProposalData {
  return {
    refNumber: 'REY/2026/11/PRJ-0001/CUST-TEST',
    generatedAt: '2026-11-10T00:00:00.000Z',
    customer: {
      customerName: 'Smoke Test',
      location: 'Kochi',
      contactPerson: '',
      phone: '',
      email: '',
    },
    systemSizeKw: 15,
    systemType: 'HYBRID',
    sheet: {
      id: 's1',
      name: 'Sheet',
      description: '',
      savedAt: '',
      items: [],
      showGst: true,
      marginPercent: 15,
      grandTotal: 1_180_000,
      totalGst: 180_000,
      systemSizeKw: 15,
    },
    bom: [],
    roi,
    roiAutofill: null,
  };
}

describe('system type smoke — sections A–E (HYBRID)', () => {
  const p = hybridProposal();
  const term = systemTypeHeadingTerm(p.systemType);

  it('A. Heading uses CRM Hybrid', () => {
    expect(proposalForHeading(p.systemSizeKw, p.systemType)).toBe(
      '15 kW Hybrid Solar Power Plant',
    );
    expect(term).toBe('Hybrid');
  });

  it('B. Financial Benefits / savings copy uses Hybrid', () => {
    expect(savingsText(p)).toContain('15 kW Hybrid Solar Power Plant');
    expect(systemTypeCapacityChip(15, p.systemType)).toBe('15 kW Hybrid Solar PV');
  });

  it('C. Scope of Work intro uses Hybrid', () => {
    expect(scopeText(p)).toContain('15 kW Hybrid Solar Power Plant');
    expect(execSummary(p)).toContain('15 kW Hybrid Solar Photovoltaic Power Plant');
  });

  it('D. Supply of Equipment inverter line uses Hybrid', () => {
    const supply = scopeSectionsFor(p.systemType).find(
      (s) => s.title === '2. Supply of Equipment',
    )!;
    expect(supply.items).toContain('Hybrid inverter(s)');
    expect(supply.items).not.toContain('On-grid string inverter(s)');
    expect(systemTypeInverterSupplyLabel(p.systemType)).toBe('Hybrid inverter(s)');
  });

  it('E. Commercials capacity + type match CRM', () => {
    const c = commercialsFromProposal(p);
    expect(c?.sizeKw).toBe(15);
    const commercialsLine = `Design, Supply, Installation & Commissioning of ${proposalForHeading(c!.sizeKw, p.systemType)} including all electrical and structural work`;
    expect(commercialsLine).toContain('15 kW Hybrid Solar Power Plant');
    expect(commercialsLine).not.toContain('On-Grid');
  });
});

describe('system type smoke — stale overrides (PDF / Share / DOCX / PPT)', () => {
  it('rewrites scope-intro and scope-section-1 inverter for exports and DOM-driven channels', () => {
    const stale = {
      'scope-intro':
        'The scope of work for the 15 kW On-Grid Solar Power Plant covers four key areas:',
      'scope-section-1':
        'Solar PV modules (as per BOM)\nOn-grid string inverter(s)\nMounting structure (GP)',
      'financial-hero':
        'The proposed 15 kW On-Grid Solar Power Plant is projected to generate 21000 kWh.',
      'exec-summary-p1':
        'commissioning of a 15 kW On-Grid Solar Photovoltaic Power Plant at your premises.',
    };
    const fixed = rewriteSystemTypeInOverrides(stale, 'HYBRID');
    expect(fixed['scope-intro']).toContain('Hybrid Solar Power Plant');
    expect(fixed['scope-section-1']).toContain('Hybrid inverter(s)');
    expect(fixed['scope-section-1']).not.toContain('On-grid string inverter(s)');
    expect(fixed['financial-hero']).toContain('Hybrid Solar Power Plant');
    expect(fixed['exec-summary-p1']).toContain('Hybrid Solar Photovoltaic');
  });

  it('keeps company boilerplate listing all three system types intact', () => {
    const about =
      'commissioning of On-Grid, Off-Grid, and Hybrid Solar Power Plants for residential clients';
    expect(rewriteSystemTypeInOverrides({ 'about-p1': about }, 'OFF_GRID')['about-p1']).toBe(
      about,
    );
  });
});

describe('system type smoke — Off-Grid + On-Grid labels', () => {
  it('maps CRM enums to the correct inverter wording', () => {
    expect(systemTypeInverterSupplyLabel('OFF_GRID')).toBe('Off-grid inverter(s)');
    expect(systemTypeInverterSupplyLabel('ON_GRID')).toBe('On-grid string inverter(s)');
    expect(proposalForHeading(10, 'OFF_GRID')).toBe('10 kW Off-Grid Solar Power Plant');
  });
});
