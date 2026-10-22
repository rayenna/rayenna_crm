import { describe, expect, it } from 'vitest';
import {
  applySalesProbabilityHygiene,
  defaultSalesProbabilityForStatus,
  isSalesProbabilityLocked,
  parseSalesProbabilityInput,
  resolveSalesProbabilityForSave,
} from './salesProbability';

describe('defaultSalesProbabilityForStatus', () => {
  it('maps each project status', () => {
    expect(defaultSalesProbabilityForStatus('LEAD')).toBe(10);
    expect(defaultSalesProbabilityForStatus('SITE_SURVEY')).toBe(20);
    expect(defaultSalesProbabilityForStatus('PROPOSAL')).toBe(30);
    expect(defaultSalesProbabilityForStatus('CONFIRMED')).toBe(75);
    expect(defaultSalesProbabilityForStatus('UNDER_INSTALLATION')).toBe(100);
    expect(defaultSalesProbabilityForStatus('SUBMITTED_FOR_SUBSIDY')).toBe(100);
    expect(defaultSalesProbabilityForStatus('COMPLETED')).toBe(100);
    expect(defaultSalesProbabilityForStatus('COMPLETED_SUBSIDY_CREDITED')).toBe(100);
    expect(defaultSalesProbabilityForStatus('LOST')).toBe(0);
  });
});

describe('hygiene locks', () => {
  it('locks Lost at 0 and Completed at 100', () => {
    expect(isSalesProbabilityLocked('LOST')).toBe(true);
    expect(isSalesProbabilityLocked('COMPLETED')).toBe(true);
    expect(isSalesProbabilityLocked('COMPLETED_SUBSIDY_CREDITED')).toBe(true);
    expect(isSalesProbabilityLocked('PROPOSAL')).toBe(false);
    expect(isSalesProbabilityLocked('UNDER_INSTALLATION')).toBe(false);
    expect(applySalesProbabilityHygiene('LOST', 40)).toBe(0);
    expect(applySalesProbabilityHygiene('COMPLETED', 40)).toBe(100);
    expect(applySalesProbabilityHygiene('PROPOSAL', 40)).toBe(40);
  });
});

describe('parseSalesProbabilityInput', () => {
  it('treats empty as not provided', () => {
    expect(parseSalesProbabilityInput(undefined)).toEqual({ provided: false });
    expect(parseSalesProbabilityInput('')).toEqual({ provided: false });
    expect(parseSalesProbabilityInput(null)).toEqual({ provided: false });
  });

  it('accepts 0–100 integers', () => {
    expect(parseSalesProbabilityInput(0)).toEqual({ provided: true, ok: true, value: 0 });
    expect(parseSalesProbabilityInput('75')).toEqual({ provided: true, ok: true, value: 75 });
    expect(parseSalesProbabilityInput(100)).toEqual({ provided: true, ok: true, value: 100 });
  });

  it('rejects out of range or fractions', () => {
    expect(parseSalesProbabilityInput(101).provided).toBe(true);
    expect(parseSalesProbabilityInput(101)).toMatchObject({ ok: false });
    expect(parseSalesProbabilityInput(-1)).toMatchObject({ ok: false });
    expect(parseSalesProbabilityInput(33.5)).toMatchObject({ ok: false });
  });
});

describe('resolveSalesProbabilityForSave', () => {
  it('keeps a custom probability when status is unchanged', () => {
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'PROPOSAL',
        nextStatus: 'PROPOSAL',
        requested: 45,
      }),
    ).toEqual({ ok: true, value: 45 });
  });

  it('does not rewrite when status is unchanged and no value is sent', () => {
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'PROPOSAL',
        nextStatus: 'PROPOSAL',
        requested: undefined,
      }),
    ).toEqual({ ok: true });
  });

  it('pre-populates the new status default when status changes and no value is sent', () => {
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'PROPOSAL',
        nextStatus: 'CONFIRMED',
        requested: undefined,
      }),
    ).toEqual({ ok: true, value: 75 });
  });

  it('forces Lost to 0% even if another value is sent', () => {
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'PROPOSAL',
        nextStatus: 'LOST',
        requested: 40,
      }),
    ).toEqual({ ok: true, value: 0 });
  });

  it('forces Completed / Subsidy Credited to 100%', () => {
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'UNDER_INSTALLATION',
        nextStatus: 'COMPLETED',
        requested: 80,
      }),
    ).toEqual({ ok: true, value: 100 });
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'COMPLETED',
        nextStatus: 'COMPLETED_SUBSIDY_CREDITED',
        requested: 0,
      }),
    ).toEqual({ ok: true, value: 100 });
  });

  it('rejects invalid custom values on unlocked stages', () => {
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'LEAD',
        nextStatus: 'LEAD',
        requested: 150,
      }),
    ).toMatchObject({ ok: false });
  });
});
