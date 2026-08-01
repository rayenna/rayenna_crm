import {
  CATEGORY_GST,
  deriveSystemSizeKw,
  parseModuleWattageWatts,
  type Category,
  type LineItem,
} from '../costingConstants';
import {
  GEN_FACTOR_BAND_MAX,
  GEN_FACTOR_BAND_MIN,
  getSubsidyByCapacityKw,
  INVERTER_ARRAY_RATIO_MAX,
  INVERTER_ARRAY_RATIO_MIN,
  SYSTEM_SIZE_MISMATCH_TOLERANCE_KW,
  TARIFF_BAND_MAX,
  TARIFF_BAND_MIN,
} from '../roiAssumptions';
import type { PreflightContext, PreflightFinding, PreflightResult } from './types';

const INVERTER_KW_RE = /(\d+(?:\.\d+)?)\s*[Kk][Ww]\b/;

function asLineItems(
  items: PreflightContext['sheetItems'],
): LineItem[] {
  return items.map((r) => ({
    category: (r.category in CATEGORY_GST ? r.category : 'others') as Category,
    itemName: r.itemName,
    specification: r.specification ?? '',
    quantity: r.quantity,
    unitCost: '0',
    gstPercent: r.gstPercent ?? '',
  }));
}

/** Sum inverter AC kW from costing or BOM inverter rows (qty × kW parsed from name/spec). */
export function parseInverterKwTotal(
  rows: Array<{ category: string; itemName: string; quantity: string; specification?: string }>,
): number | null {
  const inverters = rows.filter((r) => r.category === 'inverters' && r.itemName.trim());
  if (inverters.length === 0) return null;
  let total = 0;
  let parsedAny = false;
  for (const row of inverters) {
    const qty = parseFloat(row.quantity) || 0;
    const fromName = row.itemName.match(INVERTER_KW_RE);
    const fromSpec = row.specification?.match(INVERTER_KW_RE);
    const match = fromName ?? fromSpec;
    if (!match) continue;
    parsedAny = true;
    total += qty * parseFloat(match[1]);
  }
  return parsedAny ? total : null;
}

/** Human-readable module qty × watts for the capacity choice UI. */
export function summarizeCostingModuleDerivation(
  items: PreflightContext['sheetItems'],
  crmPanelWattage?: number | null,
): { kw: number; detail: string } | null {
  const modules = items.filter((r) => r.category === 'pv-modules' && r.itemName.trim());
  if (modules.length === 0) return null;

  let totalWatts = 0;
  let totalQty = 0;
  const parts: string[] = [];

  for (const m of modules) {
    const qty = parseFloat(m.quantity) || 0;
    const watts = parseModuleWattageWatts(m.itemName, m.specification, crmPanelWattage);
    if (watts == null || qty <= 0) continue;
    totalWatts += qty * watts;
    totalQty += qty;
    parts.push(`${qty} × ${watts} W`);
  }

  if (totalWatts <= 0) return null;
  const kw = Math.round((totalWatts / 1000) * 100) / 100;
  const detail = parts.length === 1 ? parts[0] : `${totalQty} panels (${parts.join(', ')})`;
  return { kw, detail };
}

function categoryDefaultGst(category: string): number {
  const cat = category in CATEGORY_GST ? (category as Category) : 'others';
  return CATEGORY_GST[cat] ?? 18;
}

function gstNeedsNormalize(items: PreflightContext['sheetItems']): boolean {
  for (const r of items) {
    if (!r.itemName.trim()) continue;
    const raw = r.gstPercent != null ? String(r.gstPercent).trim() : '';
    const expected = categoryDefaultGst(r.category);
    if (raw === '') return true;
    const n = parseFloat(raw);
    if (Number.isNaN(n) || Math.abs(n - expected) > 0.001) return true;
  }
  return false;
}

/** Modules where wattage cannot be resolved from name, specification, or CRM panel W. */
function modulesMissingWattage(
  items: PreflightContext['sheetItems'],
  crmPanelWattage?: number | null,
): string[] {
  return items
    .filter((r) => r.category === 'pv-modules' && r.itemName.trim())
    .filter(
      (r) =>
        parseModuleWattageWatts(r.itemName, r.specification, crmPanelWattage) == null,
    )
    .map((r) => r.itemName.trim());
}

export function runProposalPreflight(ctx: PreflightContext): PreflightResult {
  const findings: PreflightFinding[] = [];
  const items = ctx.sheetItems.filter((r) => r.itemName.trim());
  const hasCosting = items.length > 0;
  const hasBom = ctx.bomRows.some((r) => r.itemName.trim());
  const hasRoi = ctx.roi != null;
  const crmPanelW =
    ctx.crmPanelWattage != null && Number.isFinite(ctx.crmPanelWattage) && ctx.crmPanelWattage > 0
      ? Number(ctx.crmPanelWattage)
      : null;

  if (!hasCosting) {
    findings.push({
      id: 'missing_costing',
      severity: 'error',
      title: 'Costing sheet missing',
      detail: 'Save a Costing Sheet before generating or sharing a proposal.',
      autoFixable: false,
      navigateTo: '/costing',
    });
  }

  if (!hasBom) {
    findings.push({
      id: 'missing_bom',
      severity: 'error',
      title: 'BOM missing',
      detail: 'No BOM rows found. Save Costing (auto-builds BOM) or open BOM and Save.',
      autoFixable: false,
      navigateTo: '/bom',
    });
  }

  if (!hasRoi) {
    findings.push({
      id: 'missing_roi',
      severity: 'error',
      title: 'ROI result missing',
      detail: 'Calculate ROI and click Save Result so savings figures appear in the proposal.',
      autoFixable: false,
      navigateTo: '/roi',
    });
  }

  const missingWattage = hasCosting ? modulesMissingWattage(items, crmPanelW) : [];
  if (missingWattage.length > 0) {
    findings.push({
      id: 'module_wattage_token',
      severity: 'error',
      title: 'Module wattage not found',
      detail:
        'Could not read module wattage from item name, specification (e.g. "590W" or "600-620W") in Costing Sheet PV Module Description OR CRM Project Lifecycle panel wattage field in CRM. Change this in Costing Sheet OR Rayenna CRM',
      autoFixable: false,
      navigateTo: '/costing',
    });
  }

  const derivedKw = hasCosting
    ? deriveSystemSizeKw(asLineItems(items), { fallbackPanelWattage: crmPanelW })
    : 0;
  const sheetKw =
    ctx.sheetSystemSizeKw != null && Number.isFinite(ctx.sheetSystemSizeKw)
      ? Number(ctx.sheetSystemSizeKw)
      : null;
  const crmKw =
    ctx.crmSystemSizeKw != null && Number.isFinite(ctx.crmSystemSizeKw)
      ? Number(ctx.crmSystemSizeKw)
      : null;
  const roiKw = ctx.roi?.systemSizeKw != null && Number.isFinite(ctx.roi.systemSizeKw)
    ? Number(ctx.roi.systemSizeKw)
    : null;

  const effectiveSize =
    (crmKw != null && crmKw > 0 ? crmKw : null) ??
    (derivedKw > 0 ? derivedKw : null) ??
    (sheetKw != null && sheetKw > 0 ? sheetKw : null) ??
    (roiKw != null && roiKw > 0 ? roiKw : null) ??
    0;

  if (hasCosting && derivedKw <= 0 && missingWattage.length === 0) {
    findings.push({
      id: 'system_size_zero',
      severity: 'error',
      title: 'System size is 0 kW',
      detail: 'Costing could not derive a positive system size from PV module lines.',
      autoFixable: false,
      navigateTo: '/costing',
    });
  } else if (hasRoi && (roiKw == null || roiKw <= 0)) {
    findings.push({
      id: 'system_size_zero',
      severity: 'error',
      title: 'ROI system size is 0 kW',
      detail: 'ROI was saved with system size ≤ 0. Open ROI, set capacity, Calculate, and Save Result.',
      autoFixable: false,
      navigateTo: '/roi',
    });
  }

  const costingSummary = hasCosting
    ? summarizeCostingModuleDerivation(items, crmPanelW)
    : null;
  const costingKwForChoice = costingSummary?.kw ?? (derivedKw > 0 ? derivedKw : null);

  if (
    !ctx.suppressSizeMismatch &&
    crmKw != null &&
    crmKw > 0 &&
    costingKwForChoice != null &&
    costingKwForChoice > 0 &&
    Math.abs(crmKw - costingKwForChoice) > SYSTEM_SIZE_MISMATCH_TOLERANCE_KW
  ) {
    findings.push({
      id: 'system_size_mismatch',
      severity: 'warning',
      title: 'Choose proposal system capacity',
      detail:
        `CRM project capacity is ${crmKw} kW. Costing implies ${costingKwForChoice} kW` +
        (costingSummary ? ` (${costingSummary.detail})` : '') +
        '. Pick which value the proposal should show. Costing line items stay unchanged.',
      autoFixable: true,
      autoFixId: 'system_size_mismatch',
      sizeChoice: {
        crmKw,
        costingKw: costingKwForChoice,
        costingDetail: costingSummary?.detail ?? `${costingKwForChoice} kW from costing`,
      },
    });
  }

  if (hasCosting && gstNeedsNormalize(items)) {
    findings.push({
      id: 'gst_category_default',
      severity: 'warning',
      title: 'GST % does not match category defaults',
      detail:
        'One or more costing lines have blank or non-standard GST. Apply sets PV modules & inverters to 5% and other categories to 18%.',
      autoFixable: true,
      autoFixId: 'gst_category_default',
      navigateTo: '/costing',
    });
  }

  const inverterSource = hasBom
    ? ctx.bomRows
    : items.map((r) => ({
        category: r.category,
        itemName: r.itemName,
        quantity: r.quantity,
      }));
  const inverterKw = parseInverterKwTotal(inverterSource);
  if (inverterKw != null && effectiveSize > 0) {
    const ratio = inverterKw / effectiveSize;
    if (ratio < INVERTER_ARRAY_RATIO_MIN || ratio > INVERTER_ARRAY_RATIO_MAX) {
      findings.push({
        id: 'inverter_array_ratio',
        severity: 'warning',
        title: 'Inverter / array ratio looks unusual',
        detail: `Inverter total ≈ ${inverterKw.toFixed(2)} kW vs array ≈ ${effectiveSize.toFixed(2)} kW (ratio ${ratio.toFixed(2)}; expected ${INVERTER_ARRAY_RATIO_MIN}–${INVERTER_ARRAY_RATIO_MAX}).`,
        autoFixable: false,
        navigateTo: hasBom ? '/bom' : '/costing',
      });
    }
  }

  if (ctx.roi) {
    const tariff = Number(ctx.roi.tariff);
    if (Number.isFinite(tariff) && (tariff < TARIFF_BAND_MIN || tariff > TARIFF_BAND_MAX)) {
      findings.push({
        id: 'tariff_out_of_band',
        severity: 'warning',
        title: 'Tariff outside typical band',
        detail: `Tariff is ₹${tariff}/kWh (typical ${TARIFF_BAND_MIN}–${TARIFF_BAND_MAX}). Confirm this matches the customer’s bill.`,
        autoFixable: false,
        navigateTo: '/roi',
      });
    }

    const gen = Number(ctx.roi.generationFactor);
    if (
      Number.isFinite(gen) &&
      (gen < GEN_FACTOR_BAND_MIN || gen > GEN_FACTOR_BAND_MAX)
    ) {
      findings.push({
        id: 'gen_factor_out_of_band',
        severity: 'warning',
        title: 'Generation factor outside typical band',
        detail: `Generation factor is ${gen} kWh/kW/year (typical ${GEN_FACTOR_BAND_MIN}–${GEN_FACTOR_BAND_MAX} for Kerala).`,
        autoFixable: false,
        navigateTo: '/roi',
      });
    }

    if (ctx.roi.subsidyEligible) {
      const sizeForSubsidy =
        crmKw != null && crmKw > 0
          ? Math.round(crmKw)
          : roiKw != null && roiKw > 0
            ? roiKw
            : effectiveSize;
      const scheme = getSubsidyByCapacityKw(sizeForSubsidy);
      const override = Number(ctx.roi.subsidyAmount ?? 0);
      if (scheme > 0 && override > scheme) {
        findings.push({
          id: 'subsidy_override_high',
          severity: 'warning',
          title: 'Subsidy override above PM-Surya Ghar scheme',
          detail: `Override ₹${override.toLocaleString('en-IN')} exceeds scheme amount ₹${scheme.toLocaleString('en-IN')} for ${sizeForSubsidy} kW. Apply resets to the scheme amount.`,
          autoFixable: true,
          autoFixId: 'subsidy_override_high',
          navigateTo: '/roi',
        });
      }
    }

    // ROI page / proposal capacity come from CRM Project System Capacity (whole kW).
    // A stale saved ROI may still hold a costing decimal — do not warn when CRM is set.
    if (roiKw != null && roiKw > 0 && !Number.isInteger(roiKw)) {
      const crmWhole =
        crmKw != null && crmKw > 0 && Number.isFinite(crmKw) ? Math.round(crmKw) : null;
      if (crmWhole == null || crmWhole <= 0) {
        const nearest = Math.round(roiKw);
        const close = Math.abs(roiKw - nearest) <= 0.05;
        findings.push({
          id: 'roi_not_integer_kw',
          severity: 'warning',
          title: 'ROI system size is not a whole kW',
          detail: close
            ? `ROI size is ${roiKw} kW. Apply rounds to ${nearest} kW (required for Calculate).`
            : `ROI size is ${roiKw} kW; Calculate requires a whole-number kW. Set CRM Project System Capacity or open ROI and correct it.`,
          autoFixable: close,
          autoFixId: close ? 'roi_not_integer_kw' : undefined,
          navigateTo: '/roi',
        });
      }
    }
  }

  if (ctx.roof.includeRoofLayout) {
    if (!ctx.roof.hasValidGps || !ctx.roof.hasSavedLayout) {
      const parts: string[] = [];
      if (!ctx.roof.hasValidGps) parts.push('Map GPS is missing or invalid');
      if (!ctx.roof.hasSavedLayout) parts.push('no saved roof layout image/geometry');
      findings.push({
        id: 'roof_include_missing',
        severity: 'warning',
        title: 'Roof layout included but not ready',
        detail: `${parts.join('; ')}. Open AI Roof Layout to locate the site and Save to Proposal, or uncheck Include roof layout.`,
        autoFixable: false,
        navigateTo: '/ai-layout',
      });
    }
  }

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  return { findings, errorCount, warningCount };
}
