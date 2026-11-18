import { describe, expect, it } from 'vitest';
import {
  derivedTotalsFromGeneration,
  estimateMonthlyEnergy,
  estimateMonthlyGenerationKw,
  isEnergyMonthBeforeNetMeter,
  isEnergyPeriodInFuture,
  netMeterMonthProrateFactor,
} from './consumerEnergyEstimate';

describe('consumerEnergyEstimate', () => {
  it('matches blueprint November example (~643 kWh for 5.5 kW)', () => {
    const kwh = estimateMonthlyGenerationKw(5.5, 2024, 11);
    expect(kwh).toBeGreaterThanOrEqual(630);
    expect(kwh).toBeLessThanOrEqual(660);
  });

  it('builds monthly totals with savings', () => {
    const est = estimateMonthlyEnergy(5.5, 2024, 11);
    expect(est.totalGenerated).toBeGreaterThan(0);
    expect(est.totalConsumed).toBeLessThanOrEqual(est.totalGenerated);
    expect(est.dailyReadings.length).toBe(15);
    expect(est.dailyReadings[0].hour).toBe(6);
  });

  it('derives typical split and savings from logged generation', () => {
    const totals = derivedTotalsFromGeneration(1000);
    expect(totals.totalGenerated).toBe(1000);
    expect(totals.totalConsumed).toBe(600);
    expect(totals.gridExport).toBe(300);
    expect(totals.totalSavings).toBe(Math.round(600 * 6.5 + 300 * 3.5));
  });

  it('rejects future year/month', () => {
    expect(isEnergyPeriodInFuture(2099, 1, new Date('2026-09-06'))).toBe(true);
    expect(isEnergyPeriodInFuture(2026, 9, new Date('2026-09-06'))).toBe(false);
    expect(isEnergyPeriodInFuture(2026, 8, new Date('2026-09-06'))).toBe(false);
  });

  it('blocks every month when net meter date is missing', () => {
    expect(isEnergyMonthBeforeNetMeter(2026, 11, null)).toBe(true);
    expect(netMeterMonthProrateFactor(2026, 11, null)).toBe(0);
  });

  it('only allows months from net meter install month onward', () => {
    expect(isEnergyMonthBeforeNetMeter(2026, 5, '2026-06-15')).toBe(true);
    expect(isEnergyMonthBeforeNetMeter(2026, 6, '2026-06-15')).toBe(false);
    expect(isEnergyMonthBeforeNetMeter(2026, 7, '2026-06-15')).toBe(false);
  });

  it('prorates the install month from the install day inclusive', () => {
    // June has 30 days; install on 16th → 15 days remaining inclusive = 15/30
    expect(netMeterMonthProrateFactor(2026, 6, '2026-06-16')).toBeCloseTo(0.5);
    expect(netMeterMonthProrateFactor(2026, 7, '2026-06-16')).toBe(1);
    expect(netMeterMonthProrateFactor(2026, 5, '2026-06-16')).toBe(0);
  });
});
