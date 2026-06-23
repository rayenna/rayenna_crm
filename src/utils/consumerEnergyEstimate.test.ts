import { describe, expect, it } from 'vitest';
import { estimateMonthlyEnergy, estimateMonthlyGenerationKw } from './consumerEnergyEstimate';

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
});
