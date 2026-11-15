/**
 * Contract: Edit textOverrides that PDF sees via DOM must also drive DOCX/PPT builders.
 */
import { describe, expect, it } from 'vitest';
import { ov } from './textOverridesApply';
import { resolveScopeSectionsForExport } from './textOverridesApply';
import { rewriteSystemTypeInOverrides } from './systemTypeLabel';

describe('Edit → DOCX/PPT override parity', () => {
  const edited = {
    'financial-hero': 'EDITED: The proposed plant will save more than stock copy claims.',
    'scope-intro': 'EDITED scope intro for the 15 kW Hybrid Solar Power Plant.',
    'scope-section-1-title': '2. Supply of Equipment',
    'scope-section-1':
      'Solar PV modules (as per BOM)\nEDITED hybrid inverter line\nMounting structure (GP)',
    'about-highlight-0': 'EDITED about highlight zero',
    'offer-service-0-title': 'EDITED Domestic',
    'offer-service-0-desc': 'EDITED domestic description',
    'process-step-0-title': 'EDITED Consultation',
    'process-step-0-desc': 'EDITED consultation description',
    'env-intro': 'EDITED environmental intro',
    'env-bullet-0-title': 'EDITED Carbon title',
    'env-bullet-0-body': 'EDITED carbon body',
  };

  it('financial-hero and narrative keys resolve for exporters', () => {
    expect(ov(edited, 'financial-hero', 'stock')).toContain('EDITED:');
    expect(ov(edited, 'scope-intro', 'stock')).toContain('EDITED scope intro');
    expect(ov(edited, 'about-highlight-0', 'stock')).toBe('EDITED about highlight zero');
    expect(ov(edited, 'offer-service-0-title', 'stock')).toBe('EDITED Domestic');
    expect(ov(edited, 'process-step-0-desc', 'stock')).toBe('EDITED consultation description');
    expect(ov(edited, 'env-bullet-0-body', 'stock')).toBe('EDITED carbon body');
  });

  it('scope list edits win over CRM system-type stock wording', () => {
    const sections = resolveScopeSectionsForExport('ON_GRID', edited);
    expect(sections[1].items).toContain('EDITED hybrid inverter line');
    expect(sections[1].items).not.toContain('On-grid string inverter(s)');
  });

  it('system-type rewrite still runs on overrides before export consumption', () => {
    const stale = {
      'financial-hero': 'The proposed 10 kW On-Grid Solar Power Plant is great.',
      'scope-section-1': 'On-grid string inverter(s)\nCables',
    };
    const fixed = rewriteSystemTypeInOverrides(stale, 'HYBRID');
    expect(ov(fixed, 'financial-hero', '')).toContain('Hybrid Solar Power Plant');
    const sections = resolveScopeSectionsForExport('HYBRID', fixed);
    expect(sections[1].items[0]).toBe('Hybrid inverter(s)');
  });

  it('new FERT-lift override keys resolve for exporters', () => {
    const edited = {
      'commercials-desc': 'EDITED commercials package',
      'offer-validity': 'EDITED validity 15 days',
      'payment-milestone-0-trigger': 'EDITED advance trigger',
      'authority-fee-feasibility-amount': '₹ 1,500',
      'warranty-row-system-detail': 'EDITED system warranty',
      'raci-0-desc': 'EDITED raci row',
      'list-key-points': 'Point A\nPoint B',
      'list-exclusions': 'Exclusion A',
      'subsidy-credit-note': 'EDITED subsidy note',
      'tech-modules-manufacturer': 'EDITED modules brand',
    };
    expect(ov(edited, 'commercials-desc', 'stock')).toBe('EDITED commercials package');
    expect(ov(edited, 'offer-validity', 'stock')).toContain('15 days');
    expect(ov(edited, 'payment-milestone-0-trigger', 'stock')).toBe('EDITED advance trigger');
    expect(ov(edited, 'authority-fee-feasibility-amount', 'stock')).toBe('₹ 1,500');
    expect(ov(edited, 'warranty-row-system-detail', 'stock')).toBe('EDITED system warranty');
    expect(ov(edited, 'raci-0-desc', 'stock')).toBe('EDITED raci row');
    expect(ov(edited, 'list-key-points', 'stock')).toContain('Point A');
    expect(ov(edited, 'list-exclusions', 'stock')).toBe('Exclusion A');
    expect(ov(edited, 'subsidy-credit-note', 'stock')).toBe('EDITED subsidy note');
    expect(ov(edited, 'tech-modules-manufacturer', 'stock')).toBe('EDITED modules brand');
  });
});
