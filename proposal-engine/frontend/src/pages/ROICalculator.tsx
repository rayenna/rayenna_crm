import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface FormValues {
  systemSizeKw: string;
  tariff: string;
  generationFactor: string;
  escalationPercent: string;
  projectCost: string;
}

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
  };
  annualGeneration: number;
  annualSavings: number;
  paybackYears: number;
  totalSavings25Years: number;
  roiPercent: number;
  lcoe: number;
  co2OffsetTons: number;
  yearlyBreakdown: YearlyRow[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const PROPOSAL_ID = 2;

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCr(n: number): string {
  if (n >= 1_00_00_000) return `₹${fmt(n / 1_00_00_000)}Cr`;
  if (n >= 1_00_000)    return `₹${fmt(n / 1_00_000)}L`;
  return `₹${fmt(n, 0)}`;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function InputField({
  label,
  unit,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  unit?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-secondary-600 mb-1.5 font-semibold uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center bg-white border border-secondary-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
        <input
          {...props}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none tabular-nums"
        />
        {unit && (
          <span className="px-3 text-xs text-secondary-500 border-l border-secondary-200 py-2.5 bg-secondary-50 whitespace-nowrap font-medium">
            {unit}
          </span>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-secondary-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color = 'primary',
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
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
    <div className={`rounded-xl border-l-4 border border-r border-t border-b p-5 bg-white shadow-sm ${colors[color]} ${highlight ? 'ring-2 ring-primary-400/30 shadow-md' : ''}`}>
      <p className="text-xs text-secondary-500 mb-2 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colors[color].split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-xs text-secondary-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Mini bar chart — 25-year cumulative savings
// ─────────────────────────────────────────────

function SavingsChart({
  rows,
  projectCost,
}: {
  rows: YearlyRow[];
  projectCost: number;
}) {
  const maxCumulative = rows[rows.length - 1]?.cumulativeSavings ?? 1;
  const labelYears = new Set([1, 5, 10, 15, 20, 25]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-secondary-700 mb-4 uppercase tracking-wide">
        25-Year Cumulative Savings
      </h3>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-[3px] h-36 min-w-[320px]">
          {rows.map((row) => {
            const heightPct = (row.cumulativeSavings / maxCumulative) * 100;
            return (
              <div
                key={row.year}
                className="flex-1 flex flex-col items-center gap-1 group relative"
              >
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      row.paybackReached
                        ? 'bg-emerald-400/80 group-hover:bg-emerald-500'
                        : 'bg-primary-300/70 group-hover:bg-primary-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                  <div className="bg-white border border-primary-200 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl">
                    <p className="text-secondary-800 font-semibold">Year {row.year}</p>
                    <p className="text-secondary-500">Savings: {fmtCr(row.savings)}</p>
                    <p className="text-emerald-600 font-medium">Cumulative: {fmtCr(row.cumulativeSavings)}</p>
                  </div>
                  <div className="w-2 h-2 bg-white border-r border-b border-primary-200 rotate-45 -mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex items-center gap-[3px] mt-1 min-w-[320px]">
        {rows.map((row) => (
          <div key={row.year} className="flex-1 text-center">
            {labelYears.has(row.year) && (
              <span className="text-[9px] text-secondary-400">{row.year}</span>
            )}
          </div>
        ))}
      </div>

      {projectCost > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-secondary-400">
          <span className="w-3 h-3 rounded-sm bg-emerald-400/80 inline-block flex-shrink-0" />
          Green bars = payback recovered · Navy bars = pre-payback
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Year-by-year table
// ─────────────────────────────────────────────

function YearlyTable({ rows }: { rows: YearlyRow[]; projectCost: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">
          Year-by-Year Breakdown
        </h3>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
        >
          {expanded ? 'Show less' : 'Show all 25 years'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-primary-100 bg-primary-50/60">
              {['Year', 'Generation (kWh)', 'Tariff (₹/kWh)', 'Savings (₹)', 'Cumulative (₹)', 'Status'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-secondary-500 uppercase tracking-wide font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.year}
                className={`border-b border-primary-100/60 transition-colors ${
                  row.paybackReached ? 'bg-emerald-50/40' : ''
                } hover:bg-primary-50/40`}
              >
                <td className="px-3 py-2 text-secondary-700 font-semibold">{row.year}</td>
                <td className="px-3 py-2 text-secondary-500 tabular-nums">{fmt(row.generation, 0)}</td>
                <td className="px-3 py-2 text-secondary-500 tabular-nums">{fmt(row.tariffRate, 4)}</td>
                <td className="px-3 py-2 text-secondary-800 tabular-nums font-medium">{fmtCr(row.savings)}</td>
                <td className="px-3 py-2 text-secondary-800 tabular-nums font-semibold">{fmtCr(row.cumulativeSavings)}</td>
                <td className="px-3 py-2">
                  {row.paybackReached ? (
                    <span className="text-emerald-700 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-medium">
                      Recovered
                    </span>
                  ) : (
                    <span className="text-secondary-400 text-[10px]">—</span>
                  )}
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

export default function ROICalculator() {
  const [result, setResult] = useState<ROIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      systemSizeKw:       '50',
      tariff:             '8.20',
      generationFactor:   '1500',
      escalationPercent:  '5',
      projectCost:        '1881285',
    },
  });

  const onPreview = useCallback(
    async (data: FormValues) => {
      setLoading(true);
      setApiError(null);
      try {
        const res = await fetch(`/api/proposal/${PROPOSAL_ID}/roi/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemSizeKw:      parseFloat(data.systemSizeKw),
            tariff:            parseFloat(data.tariff),
            generationFactor:  parseFloat(data.generationFactor),
            escalationPercent: parseFloat(data.escalationPercent),
            projectCost:       parseFloat(data.projectCost),
          }),
        });
        if (!res.ok) {
          const e = (await res.json()) as { error: string };
          throw new Error(e.error);
        }
        const json = (await res.json()) as { data: ROIResult };
        setResult(json.data);
      } catch (e) {
        setApiError(e instanceof Error ? e.message : 'Calculation failed');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const onSave = useCallback(async () => {
    if (!result) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/proposal/${PROPOSAL_ID}/roi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationFactor:  result.inputs.generationFactor,
          escalationPercent: result.inputs.escalationPercent,
          projectCost:       result.inputs.projectCost,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [result]);

  return (
    <div>
      {/* Page card */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header strip */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">
              📈
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                ROI Calculator
              </h1>
              <p className="mt-0.5 text-white/90 text-sm">
                Enter system parameters to calculate payback period, annual savings, and 25-year returns.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left: Input form ── */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-6">
                <h2 className="text-xs font-bold text-secondary-600 mb-5 uppercase tracking-widest">
                  Inputs
                </h2>

                <form onSubmit={handleSubmit(onPreview)} className="space-y-4">
                  <InputField
                    label="System Size"
                    unit="kW"
                    hint="Installed capacity"
                    type="number"
                    step="0.1"
                    min="0.1"
                    error={errors.systemSizeKw?.message}
                    {...register('systemSizeKw', { required: 'Required' })}
                  />

                  <InputField
                    label="Electricity Tariff"
                    unit="₹/kWh"
                    hint="Current rate from electricity bill"
                    type="number"
                    step="0.01"
                    min="0.01"
                    error={errors.tariff?.message}
                    {...register('tariff', { required: 'Required' })}
                  />

                  <InputField
                    label="Generation Factor"
                    unit="kWh/kW/yr"
                    hint="1400–1600 for most of India; 1600+ for Rajasthan"
                    type="number"
                    step="10"
                    min="100"
                    max="3000"
                    error={errors.generationFactor?.message}
                    {...register('generationFactor', { required: 'Required' })}
                  />

                  <InputField
                    label="Tariff Escalation"
                    unit="% / year"
                    hint="Historical average: 5–7% in India"
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    error={errors.escalationPercent?.message}
                    {...register('escalationPercent', { required: 'Required' })}
                  />

                  <InputField
                    label="Project Cost"
                    unit="₹"
                    hint="Total system cost (auto-filled from costing sheet)"
                    type="number"
                    step="1000"
                    min="0"
                    error={errors.projectCost?.message}
                    {...register('projectCost', { required: 'Required' })}
                  />

                  {apiError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {apiError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {loading && (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    Calculate ROI
                  </button>
                </form>

                {/* Assumptions */}
                <div className="mt-5 pt-5 border-t border-primary-100 space-y-1.5 text-xs text-secondary-400">
                  <p className="text-secondary-500 font-semibold mb-2 uppercase tracking-wide text-[10px]">Assumptions</p>
                  <p>· Panel degradation: 0.5%/year from year 2</p>
                  <p>· CO₂ factor: 0.82 kg/kWh (CEA 2023)</p>
                  <p>· Lifetime: 25 years</p>
                  <p>· No O&M cost modelled</p>
                </div>
              </div>
            </div>

            {/* ── Right: Results ── */}
            <div className="lg:col-span-2 space-y-6">
              {!result && !loading && (
                <div className="flex items-center justify-center h-64 bg-white/60 border-2 border-dashed border-primary-200 rounded-xl">
                  <div className="text-center">
                    <p className="text-4xl mb-3">📈</p>
                    <p className="text-secondary-500 text-sm">
                      Fill in the inputs and click <strong className="text-primary-700">Calculate ROI</strong>
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-64 bg-white/60 border border-primary-100 rounded-xl">
                  <div className="flex items-center gap-3 text-secondary-500 text-sm">
                    <span className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    Calculating…
                  </div>
                </div>
              )}

              {result && !loading && (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <KpiCard
                      label="Annual Generation"
                      value={`${fmt(result.annualGeneration, 0)} kWh`}
                      sub="Year 1"
                      color="blue"
                    />
                    <KpiCard
                      label="Annual Savings"
                      value={fmtCr(result.annualSavings)}
                      sub="Year 1 (before escalation)"
                      color="emerald"
                    />
                    <KpiCard
                      label="Payback Period"
                      value={`${fmt(result.paybackYears)} yrs`}
                      sub={result.paybackYears < 8 ? 'Excellent' : result.paybackYears < 12 ? 'Good' : 'Fair'}
                      color={result.paybackYears < 8 ? 'emerald' : result.paybackYears < 12 ? 'amber' : 'primary'}
                      highlight
                    />
                    <KpiCard
                      label="25-Year Savings"
                      value={fmtCr(result.totalSavings25Years)}
                      sub="With escalation + degradation"
                      color="primary"
                    />
                    <KpiCard
                      label="ROI"
                      value={`${fmt(result.roiPercent)}%`}
                      sub="Net return over 25 years"
                      color="amber"
                    />
                    <KpiCard
                      label="CO₂ Offset"
                      value={`${fmt(result.co2OffsetTons, 1)} T`}
                      sub="Tonnes over 25 years"
                      color="green"
                    />
                  </div>

                  {/* LCOE strip */}
                  <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-secondary-500 uppercase tracking-wide font-medium">
                        Levelised Cost of Energy (LCOE)
                      </p>
                      <p className="text-xl font-bold text-primary-700 tabular-nums mt-0.5">
                        ₹{fmt(result.lcoe, 4)}/kWh
                      </p>
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

                  {/* Chart */}
                  <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-6">
                    <SavingsChart
                      rows={result.yearlyBreakdown}
                      projectCost={result.inputs.projectCost}
                    />
                  </div>

                  {/* Year-by-year table */}
                  <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-6">
                    <YearlyTable
                      rows={result.yearlyBreakdown}
                      projectCost={result.inputs.projectCost}
                    />
                  </div>

                  {/* Save button */}
                  <div className="flex items-center justify-end gap-3">
                    {saveStatus === 'saved' && (
                      <span className="text-xs text-emerald-600 font-medium">Saved to proposal ✓</span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-xs text-red-500">Save failed</span>
                    )}
                    <button
                      onClick={onSave}
                      disabled={saveStatus === 'saving'}
                      className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      {saveStatus === 'saving' && (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      Save to Proposal
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
