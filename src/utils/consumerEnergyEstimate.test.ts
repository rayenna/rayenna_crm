import { describe, expect, it } from 'vitest';
import {
  derivedTotalsFromGeneration,
  estimateMonthlyEnergy,
  estimateMonthlyGenerationKw,
  isEnergyPeriodInFuture,
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
});
