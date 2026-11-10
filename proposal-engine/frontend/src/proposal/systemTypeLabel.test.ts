import { describe, expect, it } from 'vitest';
import {
  proposalForHeading,
  rewriteSystemTypeInOverrides,
  rewriteSystemTypeMentions,
  systemTypeArticle,
  systemTypeCapacityChip,
  systemTypeHeadingTerm,
  systemTypeInverterSupplyLabel,
} from './systemTypeLabel';
import { scopeSectionsFor, scopeText, execSummary, savingsText } from './proposalCopy';
import type { ProposalData, ROIResult } from './types';

describe('systemTypeHeadingTerm', () => {
  it('uses the CRM Sales & Commercial labels', () => {
    expect(systemTypeHeadingTerm('OFF_GRID')).toBe('Off-Grid');
    expect(systemTypeHeadingTerm('ON_GRID')).toBe('On-Grid');
    expect(systemTypeHeadingTerm('HYBRID')).toBe('Hybrid');
  });

  it('accepts spaced and hyphenated values', () => {
    expect(systemTypeHeadingTerm('Off-Grid')).toBe('Off-Grid');
    expect(systemTypeHeadingTerm('on grid')).toBe('On-Grid');
  });

  it('defaults to On-Grid when the CRM project has no system type', () => {
    expect(systemTypeHeadingTerm(null)).toBe('On-Grid');
    expect(systemTypeHeadingTerm('')).toBe('On-Grid');
    expect(systemTypeHeadingTerm('UNKNOWN')).toBe('On-Grid');
  });
});

describe('proposalForHeading', () => {
  it('includes capacity and the CRM system type', () => {
    expect(proposalForHeading(5, 'OFF_GRID')).toBe('5 kW Off-Grid Solar Power Plant');
    expect(proposalForHeading(0, 'HYBRID')).toBe('Hybrid Solar Power Plant');
    expect(proposalForHeading(15, 'HYBRID')).toBe('15 kW Hybrid Solar Power Plant');
  });
});

describe('systemTypeArticle / capacity chip / inverter supply', () => {
  it('uses an before Off-Grid / On-Grid (vowel) and a before Hybrid', () => {
    expect(systemTypeArticle('OFF_GRID')).toBe('an');
    expect(systemTypeArticle('ON_GRID')).toBe('an');
    expect(systemTypeArticle('HYBRID')).toBe('a');
  });

  it('builds capacity chips with the CRM type', () => {
    expect(systemTypeCapacityChip(15, 'HYBRID')).toBe('15 kW Hybrid Solar PV');
  });

  it('matches inverter wording to system type for Supply of Equipment', () => {
    expect(systemTypeInverterSupplyLabel('ON_GRID')).toBe('On-grid string inverter(s)');
    expect(systemTypeInverterSupplyLabel('OFF_GRID')).toBe('Off-grid inverter(s)');
    expect(systemTypeInverterSupplyLabel('HYBRID')).toBe('Hybrid inverter(s)');
  });
});

const minimalRoi: ROIResult = {
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

function proposalWithType(systemType: string | null): ProposalData {
  return {
    refNumber: 'PE-TEST',
    generatedAt: new Date().toISOString(),
    customer: {
      customerName: 'Test',
      location: 'Kochi',
      contactPerson: '',
      phone: '',
      email: '',
    },
    systemType,
    systemSizeKw: 15,
    roi: minimalRoi,
    roiAutofill: null,
    sheet: null,
    bom: [],
  };
}

describe('rewriteSystemTypeMentions', () => {
  it('updates plant phrases in saved scope-intro without touching company copy', () => {
    const scope =
      'The scope of work for the 10 kW On-Grid Solar Power Plant covers four key areas:';
    expect(rewriteSystemTypeMentions(scope, 'HYBRID')).toBe(
      'The scope of work for the 10 kW Hybrid Solar Power Plant covers four key areas:',
    );

    const about =
      'commissioning of On-Grid, Off-Grid, and Hybrid Solar Power Plants for residential';
    expect(rewriteSystemTypeMentions(about, 'HYBRID')).toBe(about);
  });

  it('rewrites On-grid string inverter(s) even when the line ends with (s)', () => {
    expect(rewriteSystemTypeMentions('On-grid string inverter(s)', 'HYBRID')).toBe(
      'Hybrid inverter(s)',
    );
    expect(rewriteSystemTypeMentions('On-grid string inverter(s)', 'OFF_GRID')).toBe(
      'Off-grid inverter(s)',
    );
  });

  it('rewrites overrides maps used by ProposalTextOverridesContext', () => {
    const next = rewriteSystemTypeInOverrides(
      { 'scope-intro': 'The scope of work for the 10 kW On-Grid Solar Power Plant covers four key areas:' },
      'OFF_GRID',
    );
    expect(next['scope-intro']).toContain('Off-Grid Solar Power Plant');
  });
});

describe('proposal copy uses CRM system type', () => {
  it('exec summary, scope intro, and savings mention Hybrid', () => {
    const p = proposalWithType('HYBRID');
    expect(execSummary(p)).toContain('15 kW Hybrid Solar Photovoltaic Power Plant');
    expect(scopeText(p)).toContain('15 kW Hybrid Solar Power Plant');
    expect(savingsText(p)).toContain('15 kW Hybrid Solar Power Plant');
  });

  it('Supply of Equipment inverter line follows CRM type', () => {
    const hybrid = scopeSectionsFor('HYBRID').find((s) => s.title === '2. Supply of Equipment')!;
    expect(hybrid.items).toContain('Hybrid inverter(s)');
    expect(hybrid.items).not.toContain('On-grid string inverter(s)');

    const offGrid = scopeSectionsFor('OFF_GRID').find((s) => s.title === '2. Supply of Equipment')!;
    expect(offGrid.items).toContain('Off-grid inverter(s)');
  });
});
