import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROI_AUTOFILL_KEY } from '../lib/costingConstants';
import type { RoiAutofill } from '../lib/costingConstants';
import { getActiveCustomer, upsertCustomer } from '../lib/customerStore';
import type { RoiArtifact } from '../lib/customerStore';
import { AlertCard } from '../components/AlertCard';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface YearlyRow {
  year: number;
  generation: number;
  tariffRate: number;
  savings: number;
  cumulativeSavings: number;
  paybackReached: boolean;
}

interface ROIResult {
  inputs: {
    systemSizeKw: number;
    tariff: number;
    generationFactor: number;
    escalationPercent: number;
    projectCost: number;
    subsidyEligible?: boolean;
    subsidyAmount?: number;
  };
  annualGeneration: number;
  annualSavings: number;
  paybackYears: number;
  totalSavings25Years: number;
  roiPercent: number;
  lcoe: number;
  co2OffsetTons: number;
  yearlyBreakdown: YearlyRow[];
  effectiveProjectCost?: number;
}

// ─────────────────────────────────────────────
// Pure client-side ROI engine
// ─────────────────────────────────────────────

const PANEL_DEGRADATION = 0.005;
const LIFETIME          = 25;
const CO2_FACTOR        = 0.82;

function r2(n: number) { return Math.round(n * 100) / 100; }
function r4(n: number) { return Math.round(n * 10000) / 10000; }

/**
 * Subsidy support as per PM-Surya Ghar / MNRE rooftop solar scheme
 * (myscheme.gov.in — Suitable Rooftop Solar Plant Capacity for households).
 * 0–150 units/mo → 1–2 kW → ₹30,000–₹60,000; 150–300 → 2–3 kW → ₹60,000–₹78,000; >300 → above 3 kW → ₹78,000.
 */
function getSubsidyByCapacityKw(kw: number): number {
  if (kw <= 0) return 0;
  if (kw <= 2) return Math.round(kw * 30000);
  if (kw <= 3) return Math.round(60000 + (kw - 2) * 18000);
  return 78000;
}

function calculateROI(inputs: ROIResult['inputs']): ROIResult {
  const { systemSizeKw, tariff, generationFactor, escalationPercent, projectCost, subsidyEligible, subsidyAmount } = inputs;
  const effectiveCost = Math.max(0, projectCost - (subsidyEligible && (subsidyAmount ?? 0) > 0 ? (subsidyAmount ?? 0) : 0));

  const escRate          = escalationPercent / 100;
  const annualGeneration = r2(systemSizeKw * generationFactor);
  const annualSavings    = r2(annualGeneration * tariff);

  let cumulative = 0, paybackYears = LIFETIME, paybackFound = false, totalGen25 = 0;
  const yearlyBreakdown: YearlyRow[] = [];

  for (let y = 1; y <= LIFETIME; y++) {
    const degradFactor = y === 1 ? 1 : Math.pow(1 - PANEL_DEGRADATION, y - 1);
    const generation   = r2(annualGeneration * degradFactor);
    const tariffRate   = r4(tariff * Math.pow(1 + escRate, y - 1));
    const savings      = r2(generation * tariffRate);
    cumulative         = r2(cumulative + savings);
    totalGen25        += generation;

    if (!paybackFound && effectiveCost > 0 && cumulative >= effectiveCost) {
      const prev = cumulative - savings;
      paybackYears = r2(y - 1 + (effectiveCost - prev) / savings);
      paybackFound = true;
    }

    yearlyBreakdown.push({
      year: y, generation, tariffRate, savings,
      cumulativeSavings: cumulative,
      paybackReached: effectiveCost > 0 && cumulative >= effectiveCost,
    });
  }

  const totalSavings25Years = r2(cumulative);
  const roiPercent    = effectiveCost > 0 ? r2(((totalSavings25Years - effectiveCost) / effectiveCost) * 100) : 0;
  const lcoe          = totalGen25 > 0 ? r4(effectiveCost / totalGen25) : 0;
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

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCr(n: number): string {
  if (n >= 1_00_00_000) return `₹${fmt(n / 1_00_00_000)}Cr`;
  if (n >= 1_00_000)    return `₹${fmt(n / 1_00_000)}L`;
  return `₹${fmt(n, 0)}`;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Field({
  label, unit, hint, value, onChange, step = 'any', min,
}: {
  label: string; unit?: string; hint?: string;
  value: string; onChange: (v: string) => void;
  step?: string; min?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-secondary-600 mb-1.5 font-semibold uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center bg-white border border-secondary-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:border-primary-500 transition-all">
        <input
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none tabular-nums"
        />
        {unit && (
          <span className="px-3 text-xs text-secondary-500 border-l border-secondary-200 py-2.5 bg-secondary-50 whitespace-nowrap font-medium">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-secondary-400">{hint}</p>}
    </div>
  );
}

function KpiCard({ label, value, sub, color = 'primary', highlight = false }: {
  label: string; value: string; sub?: string;
  color?: 'primary' | 'emerald' | 'amber' | 'blue' | 'green';
  highlight?: boolean;
}) {
  const colors = {
    primary: 'text-primary-700 border-primary-200 bg-primary-50',
    emerald: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    amber:   'text-amber-700  border-amber-200  bg-amber-50',
    blue:    'text-blue-700   border-blue-200   bg-blue-50',
    green:   'text-green-700  border-green-200  bg-green-50',
  };
  return (
    <div className={`rounded-xl border-l-4 border p-5 bg-white shadow-sm ${colors[color]} ${highlight ? 'ring-2 ring-primary-400/30 shadow-md' : ''}`}>
      <p className="text-xs text-secondary-500 mb-2 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colors[color].split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-xs text-secondary-400 mt-1">{sub}</p>}
    </div>
  );
}

function SavingsChart({ rows, projectCost }: { rows: YearlyRow[]; projectCost: number }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; row: YearlyRow } | null>(null);

  const CHART_W  = 560;
  const CHART_H  = 160;
  const PAD_L    = 8;
  const PAD_R    = 8;
  const PAD_TOP  = 12;
  const PAD_BOT  = 24;
  const plotW    = CHART_W - PAD_L - PAD_R;
  const plotH    = CHART_H - PAD_TOP - PAD_BOT;

  const maxVal   = rows[rows.length - 1]?.cumulativeSavings ?? 1;
  const barW     = plotW / rows.length;
  const gap      = Math.max(1, barW * 0.18);
  const labelYrs = new Set([1, 5, 10, 15, 20, 25]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-secondary-700 mb-3 uppercase tracking-wide">
        25-Year Cumulative Savings
      </h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          style={{ minWidth: 320, display: 'block' }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Horizontal guide lines */}
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PAD_TOP + plotH * (1 - frac);
            return (
              <line
                key={frac}
                x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y}
                stroke="#e2e8f0" strokeWidth="1"
              />
            );
          })}

          {/* Bars */}
          {rows.map((row, i) => {
            const barH  = Math.max(2, (row.cumulativeSavings / maxVal) * plotH);
            const x     = PAD_L + i * barW + gap / 2;
            const y     = PAD_TOP + plotH - barH;
            const w     = barW - gap;
            const fill  = row.paybackReached ? '#34d399' : '#6b7db3';
            const hover = row.paybackReached ? '#10b981' : '#4f63a3';
            return (
              <rect
                key={row.year}
                x={x} y={y} width={w} height={barH}
                rx={2}
                fill={tooltip?.row.year === row.year ? hover : fill}
                style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
                onMouseEnter={(e) => {
                  const svg = (e.target as SVGRectElement).closest('svg')!;
                  const rect = svg.getBoundingClientRect();
                  const svgX = (x + w / 2) / CHART_W * rect.width + rect.left;
                  const svgY = y / CHART_H * rect.height + rect.top;
                  setTooltip({ x: svgX, y: svgY, row });
                }}
              />
            );
          })}

          {/* X-axis year labels */}
          {rows.map((row, i) => {
            if (!labelYrs.has(row.year)) return null;
            const cx = PAD_L + i * barW + barW / 2;
            return (
              <text
                key={row.year}
                x={cx} y={CHART_H - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
              >
                {row.year}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Tooltip rendered outside SVG so it can overflow */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -110%)' }}
        >
          <div className="bg-white border border-primary-200 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
            <p className="text-secondary-800 font-semibold mb-0.5">Year {tooltip.row.year}</p>
            <p className="text-secondary-500">Annual Savings: {fmtCr(tooltip.row.savings)}</p>
            <p className="text-emerald-600 font-medium">Cumulative: {fmtCr(tooltip.row.cumulativeSavings)}</p>
          </div>
          <div className="w-2 h-2 bg-white border-r border-b border-primary-200 rotate-45 mx-auto -mt-1" />
        </div>
      )}

      {projectCost > 0 && (
        <div className="mt-2 flex items-center gap-4 text-xs text-secondary-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: '#34d399' }} />
            Payback recovered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: '#6b7db3' }} />
            Pre-payback
          </span>
        </div>
      )}
    </div>
  );
}

function YearlyTable({ rows }: { rows: YearlyRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">Year-by-Year Breakdown</h3>
        <button onClick={() => setExpanded((e) => !e)} className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">
          {expanded ? 'Show less' : 'Show all 25 years'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-primary-100 bg-primary-50/60">
              {['Year', 'Generation (kWh)', 'Tariff (₹/kWh)', 'Savings (₹)', 'Cumulative (₹)', 'Status'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-secondary-500 uppercase tracking-wide font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.year} className={`border-b border-primary-100/60 transition-colors ${row.paybackReached ? 'bg-emerald-50/40' : ''} hover:bg-primary-50/40`}>
                <td className="px-3 py-2 text-secondary-700 font-semibold">{row.year}</td>
                <td className="px-3 py-2 text-secondary-500 tabular-nums">{fmt(row.generation, 0)}</td>
                <td className="px-3 py-2 text-secondary-500 tabular-nums">{fmt(row.tariffRate, 4)}</td>
                <td className="px-3 py-2 text-secondary-800 tabular-nums font-medium">{fmtCr(row.savings)}</td>
                <td className="px-3 py-2 text-secondary-800 tabular-nums font-semibold">{fmtCr(row.cumulativeSavings)}</td>
                <td className="px-3 py-2">
                  {row.paybackReached
                    ? <span className="text-emerald-700 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-medium">Recovered</span>
                    : <span className="text-secondary-400 text-[10px]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

const ROI_STORAGE_KEY = 'rayenna_roi_result_v1';

export default function ROICalculator() {
  // Read autofill synchronously before any state init
  const autoFill: RoiAutofill | null = (() => {
    try {
      const raw = localStorage.getItem(ROI_AUTOFILL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  // ── Controlled input state — initialised directly from autofill / defaults ──
  const [systemSizeKw,      setSystemSizeKw]      = useState(autoFill && autoFill.systemSizeKw > 0 ? String(autoFill.systemSizeKw) : '');
  const [tariff,            setTariff]            = useState('8.20');
  const [generationFactor,  setGenerationFactor]  = useState('1500');
  const [escalationPercent, setEscalationPercent] = useState('5');
  const [projectCost,       setProjectCost]       = useState(autoFill && autoFill.grandTotal > 0 ? String(Math.round(autoFill.grandTotal)) : '');
  const [subsidyEligible,   setSubsidyEligible]   = useState(false);
  /** Optional override in ₹; when empty, use scheme amount from capacity (PM-Surya Ghar). */
  const [subsidyOverride,   setSubsidyOverride]   = useState('');

  const [formError,   setFormError]   = useState<string | null>(null);
  const [result,      setResult]      = useState<ROIResult | null>(null);
  const [saveStatus,  setSaveStatus]  = useState<'idle' | 'saved'>('idle');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Restore last saved result on mount — prefer active customer's ROI artifact
  useEffect(() => {
    const ac = getActiveCustomer();
    if (ac?.roi?.result) {
      const saved = ac.roi.result as ROIResult;
      setResult(saved);
      const inp = saved.inputs;
      if (inp) {
        if (inp.systemSizeKw > 0) setSystemSizeKw(String(inp.systemSizeKw));
        if (inp.tariff > 0)       setTariff(String(inp.tariff));
        if (inp.generationFactor > 0) setGenerationFactor(String(inp.generationFactor));
        if (inp.escalationPercent >= 0) setEscalationPercent(String(inp.escalationPercent));
        if (inp.projectCost > 0)  setProjectCost(String(Math.round(inp.projectCost)));
        if (inp.subsidyEligible) {
          setSubsidyEligible(true);
          const schemeAmt = getSubsidyByCapacityKw(inp.systemSizeKw);
          if ((inp.subsidyAmount ?? 0) > 0 && inp.subsidyAmount !== schemeAmt) {
            setSubsidyOverride(String(Math.round(inp.subsidyAmount!)));
          }
        }
      }
      return;
    }
    // Fall back to localStorage
    try {
      const raw = localStorage.getItem(ROI_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ROIResult;
        setResult(saved);
        const inp = saved.inputs;
        if (inp?.subsidyEligible) {
          setSubsidyEligible(true);
          const schemeAmt = getSubsidyByCapacityKw(inp.systemSizeKw ?? 0);
          if ((inp.subsidyAmount ?? 0) > 0 && inp.subsidyAmount !== schemeAmt) {
            setSubsidyOverride(String(Math.round(inp.subsidyAmount!)));
          }
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-populate fields if autofill key updates while page is open
  useEffect(() => {
    if (!autoFill) return;
    if (autoFill.systemSizeKw > 0) setSystemSizeKw(String(autoFill.systemSizeKw));
    if (autoFill.grandTotal > 0)   setProjectCost(String(Math.round(autoFill.grandTotal)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCalculate = () => {
    const sz  = parseFloat(systemSizeKw);
    const tr  = parseFloat(tariff);
    const gf  = parseFloat(generationFactor);
    const esc = parseFloat(escalationPercent);
    const pc  = parseFloat(projectCost) || 0;
    const overrideVal = subsidyOverride.trim() ? parseFloat(subsidyOverride) : NaN;

    if (!sz || sz <= 0 || !Number.isInteger(sz)) {
      setFormError('System Size is required and must be a whole number in kW (1, 2, 3, …).');
      return;
    }
    if (!tr  || tr  <= 0) { setFormError('Electricity Tariff is required and must be > 0'); return; }
    if (!gf  || gf  <= 0) { setFormError('Generation Factor is required and must be > 0'); return; }
    if (isNaN(esc))        { setFormError('Tariff Escalation is required'); return; }
    if (subsidyEligible && !isNaN(overrideVal) && overrideVal < 0) { setFormError('Subsidy override must be ≥ 0'); return; }

    setFormError(null);
    const schemeSubsidy = getSubsidyByCapacityKw(sz);
    const subsidyAmt = subsidyEligible
      ? (!isNaN(overrideVal) && overrideVal >= 0 ? Math.round(overrideVal) : schemeSubsidy)
      : 0;
    const res = calculateROI({
      systemSizeKw: sz,
      tariff: tr,
      generationFactor: gf,
      escalationPercent: esc,
      projectCost: pc,
      subsidyEligible: subsidyEligible && subsidyAmt > 0,
      subsidyAmount: subsidyAmt > 0 ? subsidyAmt : undefined,
    });
    setResult(res);
  };

  const handleSave = () => {
    if (!result) return;
    const now = new Date().toISOString();
    localStorage.setItem(ROI_STORAGE_KEY, JSON.stringify(result));

    // Persist ROI artifact to active customer record
    const activeCustomer = getActiveCustomer();
    if (activeCustomer) {
      const artifact: RoiArtifact = { savedAt: now, result };
      upsertCustomer({ ...activeCustomer, roi: artifact, updatedAt: now });
    }

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">📈</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">ROI Calculator</h1>
                <p className="mt-0.5 text-white/90 text-sm">Calculate payback period, annual savings, and 25-year returns.</p>
              </div>
            </div>
            {result && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {saveStatus === 'saved' && <span className="text-xs text-emerald-300 font-medium">✓ Saved</span>}
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px]"
                >
                  💾 Save Result
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

          {/* Active customer banner */}
          {(() => {
            const ac = getActiveCustomer();
            return ac ? (
              <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-sky-700">
                  <span className="font-semibold">Active customer:</span> {ac.master.name}
                  {ac.roi && <span className="ml-2 text-emerald-600 font-medium">· ROI saved ✓</span>}
                </p>
                <Link to={`/customers/${ac.id}`} className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap transition-colors">
                  View workspace →
                </Link>
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-amber-700">No active customer. ROI result will save to scratchpad only.</p>
                <Link to="/customers" className="text-xs text-amber-700 hover:text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap">
                  Select Customer →
                </Link>
              </div>
            );
          })()}

          {/* Auto-fill banner */}
          {autoFill && !bannerDismissed && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-lg flex-shrink-0">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Inputs auto-filled from {autoFill.source === 'bom' ? 'BOM' : 'Costing Sheet'}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Source: <strong>{autoFill.sourceName}</strong> ·{' '}
                    System Size: <strong>{autoFill.systemSizeKw} kW</strong> ·{' '}
                    Project Cost (incl. GST):{' '}
                    <strong>₹{autoFill.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-medium border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Inputs ── */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-6">
                <h2 className="text-xs font-bold text-secondary-600 mb-5 uppercase tracking-widest">Inputs</h2>

                <div className="space-y-4">
                  <Field
                    label="System Size"
                    unit="kW"
                    hint={autoFill && autoFill.systemSizeKw > 0 ? `⚡ Auto-filled from "${autoFill.sourceName}"` : 'Installed capacity (whole kW only)'}
                    value={systemSizeKw}
                    onChange={setSystemSizeKw}
                    step="1"
                    min="1"
                  />
                  <Field
                    label="Electricity Tariff"
                    unit="₹/kWh"
                    hint="Current rate from electricity bill"
                    value={tariff}
                    onChange={setTariff}
                    step="0.01"
                    min="0.01"
                  />
                  <Field
                    label="Generation Factor"
                    unit="kWh/kW/yr"
                    hint="1400–1600 for most of India; 1600+ for Rajasthan"
                    value={generationFactor}
                    onChange={setGenerationFactor}
                    step="10"
                    min="100"
                  />
                  <Field
                    label="Tariff Escalation"
                    unit="% / year"
                    hint="Historical average: 5–7% in India"
                    value={escalationPercent}
                    onChange={setEscalationPercent}
                    step="0.5"
                    min="0"
                  />
                  <Field
                    label="Project Cost"
                    unit="₹"
                    hint={autoFill && autoFill.grandTotal > 0 ? `⚡ Auto-filled from "${autoFill.sourceName}"` : 'Total system cost incl. GST'}
                    value={projectCost}
                    onChange={setProjectCost}
                    step="1000"
                    min="0"
                  />

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subsidyEligible}
                        onChange={(e) => setSubsidyEligible(e.target.checked)}
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs font-semibold text-secondary-700 uppercase tracking-wide">
                        Eligible for Govt subsidy (PM-Surya Ghar / MNRE rooftop solar)
                      </span>
                    </label>
                    {subsidyEligible && (
                      <>
                        {(() => {
                          const sz = parseFloat(systemSizeKw) || 0;
                          const schemeAmt = sz > 0 ? getSubsidyByCapacityKw(sz) : 0;
                          return (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 space-y-2">
                              <p className="text-xs text-amber-800">
                                As per <a href="https://www.myscheme.gov.in/schemes/pmsgmb" target="_blank" rel="noopener noreferrer" className="underline font-medium">myscheme.gov.in</a> (capacity-based): 1–2 kW → ₹30k–₹60k, 2–3 kW → ₹60k–₹78k, &gt;3 kW → ₹78,000 cap.
                              </p>
                              {sz > 0 && (
                                <p className="text-xs font-semibold text-amber-900">
                                  Scheme subsidy for {sz} kW: <span className="tabular-nums">₹{schemeAmt.toLocaleString('en-IN')}</span>
                                  {!subsidyOverride.trim() && ' (leave override blank to use)'}
                                </p>
                              )}
                              <Field
                                label="Override subsidy amount (₹)"
                                unit="₹"
                                hint="Optional. Leave blank to use scheme amount above. Subject to disbursement by DISCOM/agency."
                                value={subsidyOverride}
                                onChange={setSubsidyOverride}
                                step="1000"
                                min="0"
                              />
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {formError && (
                    <AlertCard
                      variant="error"
                      title="Please check your inputs"
                      message={formError}
                      className="mt-1"
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleCalculate}
                    className="w-full text-white text-sm font-semibold py-3 sm:py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl min-h-[44px]"
                    style={{ background: '#0d1b3a' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
                  >
                    Calculate ROI
                  </button>
                </div>

                <div className="mt-5 pt-5 border-t border-primary-100 space-y-1.5 text-xs text-secondary-400">
                  <p className="text-secondary-500 font-semibold mb-2 uppercase tracking-wide text-[10px]">Assumptions</p>
                  <p>· Panel degradation: 0.5%/year from year 2</p>
                  <p>· CO₂ factor: 0.82 kg/kWh (CEA 2023)</p>
                  <p>· Lifetime: 25 years</p>
                  <p>· No O&M cost modelled</p>
                </div>
              </div>
            </div>

            {/* ── Results ── */}
            <div className="lg:col-span-2 space-y-6">
              {!result && (
                <div className="flex items-center justify-center h-64 bg-white/60 border-2 border-dashed border-primary-200 rounded-xl">
                  <div className="text-center">
                    <p className="text-4xl mb-3">📈</p>
                    <p className="text-secondary-500 text-sm">
                      Fill in the inputs and click <strong className="text-primary-700">Calculate ROI</strong>
                    </p>
                  </div>
                </div>
              )}

              {result && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <KpiCard label="Annual Generation" value={`${fmt(result.annualGeneration, 0)} kWh`} sub="Year 1" color="blue" />
                    <KpiCard label="Annual Savings" value={fmtCr(result.annualSavings)} sub="Year 1 (before escalation)" color="emerald" />
                    <KpiCard
                      label="Payback Period"
                      value={`${fmt(result.paybackYears)} yrs`}
                      sub={result.paybackYears < 8 ? 'Excellent' : result.paybackYears < 12 ? 'Good' : 'Fair'}
                      color={result.paybackYears < 8 ? 'emerald' : result.paybackYears < 12 ? 'amber' : 'primary'}
                      highlight
                    />
                    <KpiCard label="25-Year Savings" value={fmtCr(result.totalSavings25Years)} sub="With escalation + degradation" color="primary" />
                    <KpiCard label="ROI" value={`${fmt(result.roiPercent)}%`} sub="Net return over 25 years" color="amber" />
                    <KpiCard label="CO₂ Offset" value={`${fmt(result.co2OffsetTons, 1)} T`} sub="Tonnes over 25 years" color="green" />
                  </div>

                  <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-secondary-500 uppercase tracking-wide font-medium">Levelised Cost of Energy (LCOE)</p>
                      <p className="text-xl font-bold text-primary-700 tabular-nums mt-0.5">₹{fmt(result.lcoe, 4)}/kWh</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs text-secondary-500">vs grid tariff</p>
                      <p className="text-sm text-emerald-600 font-semibold tabular-nums">
                        ₹{fmt(result.inputs.tariff, 2)}/kWh
                        {result.lcoe < result.inputs.tariff && (
                          <span className="ml-2 text-xs text-emerald-500">
                            ({fmt(((result.inputs.tariff - result.lcoe) / result.inputs.tariff) * 100, 1)}% cheaper)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-6">
                    <SavingsChart rows={result.yearlyBreakdown} projectCost={result.effectiveProjectCost ?? result.inputs.projectCost} />
                  </div>

                  <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-6">
                    <YearlyTable rows={result.yearlyBreakdown} />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                    {saveStatus === 'saved' && <span className="text-xs text-emerald-600 font-medium text-center sm:text-right">✓ Result saved</span>}
                    <button
                      onClick={handleSave}
                      className="w-full sm:w-auto text-white text-sm font-semibold px-6 py-3 sm:py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl min-h-[44px] sm:min-h-0"
                      style={{ background: '#0d1b3a' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
                    >
                      💾 Save Result
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
