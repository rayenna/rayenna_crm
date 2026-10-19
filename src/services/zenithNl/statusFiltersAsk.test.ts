import { describe, expect, it } from 'vitest';
import { extractCrmStatusFilters, extractZenithDimensions } from './dimensionFilters';

describe('extractCrmStatusFilters — three distinct status fields', () => {
  it('maps under installation to Project Status, not Installation Status', () => {
    const s = extractCrmStatusFilters('list under installation projects');
    expect(s.projectStatus).toBe('UNDER_INSTALLATION');
    expect(s.installationStatus).toBeUndefined();
    expect(s.paymentStatus).toBeUndefined();
  });

  it('maps installation pending to Installation Status, not payment or project', () => {
    const s = extractCrmStatusFilters('list projects with installation pending');
    expect(s.installationStatus).toBe('PENDING');
    expect(s.projectStatus).toBeUndefined();
    expect(s.paymentStatus).toBeUndefined();
  });

  it('maps installation in progress and completed', () => {
    expect(extractCrmStatusFilters('show installation in progress projects').installationStatus).toBe(
      'IN_PROGRESS',
    );
    expect(extractCrmStatusFilters('list installation completed projects').installationStatus).toBe(
      'COMPLETED',
    );
    expect(extractCrmStatusFilters('list installation completed projects').projectStatus).toBeUndefined();
  });

  it('maps payment phrases only to Payment Status', () => {
    expect(extractCrmStatusFilters('list fully paid projects').paymentStatus).toBe('FULLY_PAID');
    expect(extractCrmStatusFilters('list payment pending projects').paymentStatus).toBe('PENDING');
    expect(extractCrmStatusFilters('list not fully paid projects').paymentStatus).toBe(
      'NOT_FULLY_PAID',
    );
    expect(extractCrmStatusFilters('list fully paid projects').projectStatus).toBeUndefined();
  });

  it('maps completed projects to Project Status when not installation/payment cue', () => {
    expect(extractCrmStatusFilters('list completed projects').projectStatus).toBe('COMPLETED');
  });

  it('does not treat bare pending as payment', () => {
    expect(extractCrmStatusFilters('list pending projects').paymentStatus).toBeUndefined();
  });
});

describe('extractZenithDimensions status merge', () => {
  it('keeps under installation + not fully paid as two filters', () => {
    const dims = extractZenithDimensions(
      'List under installation projects not fully paid',
    );
    expect(dims.projectStatus).toBe('UNDER_INSTALLATION');
    expect(dims.paymentStatus).toBe('NOT_FULLY_PAID');
    expect(dims.installationStatus).toBeUndefined();
  });
});
