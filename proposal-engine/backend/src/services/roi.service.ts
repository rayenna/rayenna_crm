import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ROIInputs {
  systemSizeKw: number;       // kW
  tariff: number;             // ₹/kWh — year-1 electricity rate
  generationFactor: number;   // kWh/kW/year — location-based (e.g. 1400 for Pune)
  escalationPercent: number;  // annual tariff escalation % (e.g. 5)
  projectCost: number;        // total system cost from costing sheet (₹)
}

export interface YearlyRow {
  year: number;
  generation: number;         // kWh — degrades 0.5%/year after year 1
  tariffRate: number;         // ₹/kWh — escalates each year
  savings: number;            // ₹ — generation × tariffRate
  cumulativeSavings: number;  // ₹ — running total
  paybackReached: boolean;    // true from the year project cost is recovered
}

export interface ROIResult {
  // ── Inputs echoed back ──
  inputs: ROIInputs;

  // ── Key outputs ──
  annualGeneration: number;       // kWh/year (year 1)
  annualSavings: number;          // ₹/year (year 1)
  paybackYears: number;           // fractional, e.g. 4.7
  totalSavings25Years: number;    // ₹ — cumulative over 25 years with escalation

  // ── Derived metrics ──
  roiPercent: number;             // (totalSavings25Years - projectCost) / projectCost × 100
  lcoe: number;                   // ₹/kWh — Levelised Cost of Energy over 25 years
  co2OffsetTons: number;          // tonnes CO₂ avoided over 25 years (0.82 kg/kWh grid factor)

  // ── Year-by-year table ──
  yearlyBreakdown: YearlyRow[];
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PANEL_DEGRADATION_RATE = 0.005;   // 0.5% per year from year 2
const LIFETIME_YEARS         = 25;
const CO2_FACTOR_KG_PER_KWH  = 0.82;   // India grid emission factor (CEA 2023)

// ─────────────────────────────────────────────
// Pure calculation engine
// No DB calls — fully testable in isolation
// ─────────────────────────────────────────────

export function calculateROI(inputs: ROIInputs): ROIResult {
  const { systemSizeKw, tariff, generationFactor, escalationPercent, projectCost } = inputs;

  const escalationRate = escalationPercent / 100;

  // Year-1 generation (no degradation applied in year 1)
  const annualGeneration = round2(systemSizeKw * generationFactor);

  // Year-1 savings
  const annualSavings = round2(annualGeneration * tariff);

  // Build year-by-year table
  let cumulativeSavings = 0;
  let paybackYears = LIFETIME_YEARS; // default: not reached within lifetime
  let paybackFound = false;
  let totalGeneration25 = 0;
  const yearlyBreakdown: YearlyRow[] = [];

  for (let y = 1; y <= LIFETIME_YEARS; y++) {
    // Generation degrades 0.5%/year from year 2 onwards
    const degradationFactor = y === 1 ? 1 : Math.pow(1 - PANEL_DEGRADATION_RATE, y - 1);
    const generation = round2(annualGeneration * degradationFactor);

    // Tariff escalates each year
    const tariffRate = round4(tariff * Math.pow(1 + escalationRate, y - 1));

    const savings = round2(generation * tariffRate);
    cumulativeSavings = round2(cumulativeSavings + savings);
    totalGeneration25 += generation;

    // Detect payback crossing point (fractional year)
    if (!paybackFound && cumulativeSavings >= projectCost && projectCost > 0) {
      // Interpolate: how far into this year did we cross the threshold?
      const prevCumulative = cumulativeSavings - savings;
      const remaining = projectCost - prevCumulative;
      const fraction = remaining / savings;
      paybackYears = round2(y - 1 + fraction);
      paybackFound = true;
    }

    yearlyBreakdown.push({
      year: y,
      generation,
      tariffRate,
      savings,
      cumulativeSavings,
      paybackReached: cumulativeSavings >= projectCost && projectCost > 0,
    });
  }

  const totalSavings25Years = round2(cumulativeSavings);

  // ROI %: net profit over 25 years as % of project cost
  const roiPercent =
    projectCost > 0
      ? round2(((totalSavings25Years - projectCost) / projectCost) * 100)
      : 0;

  // LCOE: project cost ÷ total kWh generated over 25 years
  const lcoe =
    totalGeneration25 > 0 ? round4(projectCost / totalGeneration25) : 0;

  // CO₂ offset: total generation × grid emission factor
  const co2OffsetTons = round2((totalGeneration25 * CO2_FACTOR_KG_PER_KWH) / 1000);

  return {
    inputs,
    annualGeneration,
    annualSavings,
    paybackYears,
    totalSavings25Years,
    roiPercent,
    lcoe,
    co2OffsetTons,
    yearlyBreakdown,
  };
}

// ─────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────

/**
 * Calculate ROI for a proposal and persist the result.
 * Reads projectCost from the proposal's costing items if not supplied.
 * Uses upsert — calling again with updated inputs replaces the previous result.
 */
export async function calculateAndSaveROI(
  proposalId: number,
  overrideInputs: Partial<Pick<ROIInputs, 'generationFactor' | 'escalationPercent' | 'projectCost'>>
): Promise<ROIResult> {
  // Load proposal for systemSizeKw + tariff
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { costingItems: true },
  });
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

  // Derive project cost from costing items if not overridden
  const derivedProjectCost = proposal.costingItems.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );

  const inputs: ROIInputs = {
    systemSizeKw:       proposal.systemSizeKw,
    tariff:             proposal.tariff,
    generationFactor:   overrideInputs.generationFactor  ?? 1500,  // default: 1500 kWh/kW/yr
    escalationPercent:  overrideInputs.escalationPercent ?? 5,     // default: 5%
    projectCost:        overrideInputs.projectCost       ?? derivedProjectCost,
  };

  const result = calculateROI(inputs);

  // Upsert into DB
  await prisma.rOI.upsert({
    where: { proposalId },
    create: {
      proposalId,
      systemSizeKw:        inputs.systemSizeKw,
      tariff:              inputs.tariff,
      generationFactor:    inputs.generationFactor,
      escalationPercent:   inputs.escalationPercent,
      projectCost:         inputs.projectCost,
      annualGeneration:    result.annualGeneration,
      annualSavings:       result.annualSavings,
      paybackYears:        result.paybackYears,
      totalSavings25Years: result.totalSavings25Years,
    },
    update: {
      systemSizeKw:        inputs.systemSizeKw,
      tariff:              inputs.tariff,
      generationFactor:    inputs.generationFactor,
      escalationPercent:   inputs.escalationPercent,
      projectCost:         inputs.projectCost,
      annualGeneration:    result.annualGeneration,
      annualSavings:       result.annualSavings,
      paybackYears:        result.paybackYears,
      totalSavings25Years: result.totalSavings25Years,
    },
  });

  return result;
}

/**
 * Fetch saved ROI for a proposal and re-derive the full result
 * (including yearlyBreakdown) from the stored inputs.
 */
export async function getSavedROI(proposalId: number): Promise<ROIResult | null> {
  const saved = await prisma.rOI.findUnique({ where: { proposalId } });
  if (!saved) return null;

  return calculateROI({
    systemSizeKw:      saved.systemSizeKw,
    tariff:            saved.tariff,
    generationFactor:  saved.generationFactor,
    escalationPercent: saved.escalationPercent,
    projectCost:       saved.projectCost,
  });
}

// ─────────────────────────────────────────────
// Rounding helpers
// ─────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
