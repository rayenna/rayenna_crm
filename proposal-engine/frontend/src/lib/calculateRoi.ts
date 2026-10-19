import type { ROIInputs, ROIResult, YearlyRow } from './customerStore';

const PANEL_DEGRADATION = 0.005;
const LIFETIME = 25;
const CO2_FACTOR = 0.82;

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
function r4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/** Same payback engine the ROI page uses. */
export function calculateROI(inputs: ROIInputs): ROIResult {
  const {
    systemSizeKw,
    tariff,
    generationFactor,
    escalationPercent,
    projectCost,
    subsidyEligible,
    subsidyAmount,
  } = inputs;
  const effectiveCost = Math.max(
    0,
    projectCost - (subsidyEligible && (subsidyAmount ?? 0) > 0 ? (subsidyAmount ?? 0) : 0),
  );

  const escRate = escalationPercent / 100;
  const annualGeneration = r2(systemSizeKw * generationFactor);
  const annualSavings = r2(annualGeneration * tariff);

  let cumulative = 0;
  let paybackYears = LIFETIME;
  let paybackFound = false;
  let totalGen25 = 0;
  const yearlyBreakdown: YearlyRow[] = [];

  for (let y = 1; y <= LIFETIME; y++) {
    const degradFactor = y === 1 ? 1 : Math.pow(1 - PANEL_DEGRADATION, y - 1);
    const generation = r2(annualGeneration * degradFactor);
    const tariffRate = r4(tariff * Math.pow(1 + escRate, y - 1));
    const savings = r2(generation * tariffRate);
    cumulative = r2(cumulative + savings);
    totalGen25 += generation;

    if (!paybackFound && effectiveCost > 0 && cumulative >= effectiveCost) {
      const prev = cumulative - savings;
      paybackYears = r2(y - 1 + (effectiveCost - prev) / savings);
      paybackFound = true;
    }

    yearlyBreakdown.push({
      year: y,
      generation,
      tariffRate,
      savings,
      cumulativeSavings: cumulative,
      paybackReached: effectiveCost > 0 && cumulative >= effectiveCost,
    });
  }

  const totalSavings25Years = r2(cumulative);
  const roiPercent =
    effectiveCost > 0 ? r2(((totalSavings25Years - effectiveCost) / effectiveCost) * 100) : 0;
  const lcoe = totalGen25 > 0 ? r4(effectiveCost / totalGen25) : 0;
  const co2OffsetTons = r2((totalGen25 * CO2_FACTOR) / 1000);

  return {
    inputs: { ...inputs, subsidyEligible, subsidyAmount },
    annualGeneration,
    annualSavings,
    paybackYears,
    totalSavings25Years,
    roiPercent,
    lcoe,
    co2OffsetTons,
    yearlyBreakdown,
    effectiveProjectCost: effectiveCost > 0 && effectiveCost !== projectCost ? effectiveCost : undefined,
  };
}
