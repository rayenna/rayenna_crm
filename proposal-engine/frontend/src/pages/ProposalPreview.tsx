import { useState } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface BOMItem {
  itemName: string;
  specification: string;
  quantity: number;
  brand: string;
  warranty: string;
}

interface Section {
  title: string;
  content: string;
  source: 'ai' | 'template';
}

interface Commercials {
  projectCost: number;
  gstPercent: number;
  gstAmount: number;
  totalWithGst: number;
  currency: string;
}

interface ROISnapshot {
  annualGeneration: number;
  annualSavings: number;
  paybackYears: number;
  totalSavings25Years: number;
  roiPercent: number;
  lcoe: number;
  co2OffsetTons: number;
  projectCost: number;
}

interface GeneratedProposal {
  proposalId: number;
  refNumber: string;
  generatedAt: string;
  mode: 'ai-enhanced' | 'template-only';
  customerName: string;
  systemSizeKw: number;
  location: string;
  executiveSummary: Section;
  savingsExplanation: Section;
  environmentalImpact: Section;
  aboutRayenna: Section;
  scopeOfWork: Section;
  billOfQuantities: BOMItem[];
  commercials: Commercials;
  termsAndConditions: string[];
  paymentTerms: string[];
  closingNote: Section;
  roiSnapshot: ROISnapshot;
}

const PROPOSAL_ID = 2;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-bold text-primary-800 uppercase tracking-widest">
          {section.title}
        </h2>
        <span
          className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
            section.source === 'ai'
              ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
              : 'bg-secondary-100 text-secondary-500 border-secondary-300'
          }`}
        >
          {section.source === 'ai' ? 'AI enhanced' : 'template'}
        </span>
      </div>
      <div className="text-secondary-700 text-sm leading-relaxed whitespace-pre-line">
        {section.content}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-primary-100 my-8" />;
}

function KpiStrip({ roi }: { roi: ROISnapshot }) {
  const kpis = [
    { label: 'Annual Generation', value: `${roi.annualGeneration.toLocaleString('en-IN')} kWh`, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Year-1 Savings',    value: fmtINR(roi.annualSavings),                             color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Payback Period',    value: `${roi.paybackYears.toFixed(1)} yrs`,                  color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    { label: '25-Year Savings',   value: fmtINR(roi.totalSavings25Years),                       color: 'text-primary-700 bg-primary-50 border-primary-200' },
    { label: 'ROI',               value: `${roi.roiPercent.toFixed(1)}%`,                       color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'CO₂ Offset',        value: `${roi.co2OffsetTons.toFixed(1)} T`,                   color: 'text-green-700 bg-green-50 border-green-200' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-8">
      {kpis.map((k) => (
        <div key={k.label} className={`border rounded-xl p-4 text-center ${k.color}`}>
          <p className="text-lg font-bold tabular-nums">{k.value}</p>
          <p className="text-xs mt-1 opacity-70">{k.label}</p>
        </div>
      ))}
    </div>
  );
}

function BOMTable({ items }: { items: BOMItem[] }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-primary-800 uppercase tracking-widest mb-4">
        Bill of Quantities
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-primary-100 bg-primary-50/60">
              <th className="px-3 py-2.5 text-left text-xs text-secondary-500 uppercase tracking-wide font-semibold w-8">Sl</th>
              <th className="px-3 py-2.5 text-left text-xs text-secondary-500 uppercase tracking-wide font-semibold">Item</th>
              <th className="px-3 py-2.5 text-left text-xs text-secondary-500 uppercase tracking-wide font-semibold">Specification</th>
              <th className="px-3 py-2.5 text-right text-xs text-secondary-500 uppercase tracking-wide font-semibold w-16">Qty</th>
              <th className="px-3 py-2.5 text-left text-xs text-secondary-500 uppercase tracking-wide font-semibold w-36">Brand</th>
              <th className="px-3 py-2.5 text-left text-xs text-secondary-500 uppercase tracking-wide font-semibold w-28">Warranty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-primary-100/60 hover:bg-primary-50/40 transition-colors">
                <td className="px-3 py-2.5 text-secondary-400 text-xs">{i + 1}</td>
                <td className="px-3 py-2.5 text-secondary-800 font-semibold">{item.itemName}</td>
                <td className="px-3 py-2.5 text-secondary-500 text-xs">{item.specification}</td>
                <td className="px-3 py-2.5 text-secondary-800 text-right tabular-nums font-medium">{item.quantity}</td>
                <td className="px-3 py-2.5 text-secondary-600 text-xs">{item.brand}</td>
                <td className="px-3 py-2.5 text-secondary-600 text-xs">{item.warranty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommercialsBlock({ c }: { c: Commercials }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-primary-800 uppercase tracking-widest mb-4">
        Commercials
      </h2>
      <div className="bg-white border border-primary-100 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[340px]">
          <tbody>
            <tr className="border-b border-primary-100">
              <td className="px-5 py-3 text-secondary-600">
                Design, Supply, Installation & Commissioning of{' '}
                <span className="text-secondary-800 font-semibold">system</span> including electrical and structural work
              </td>
              <td className="px-5 py-3 text-right text-secondary-800 font-semibold tabular-nums w-40">
                {fmtINR(c.projectCost)}
              </td>
            </tr>
            <tr className="border-b border-primary-100 bg-yellow-50/40">
              <td className="px-5 py-3 text-secondary-600">GST ({c.gstPercent}%)</td>
              <td className="px-5 py-3 text-right text-yellow-700 font-semibold tabular-nums">{fmtINR(c.gstAmount)}</td>
            </tr>
            <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
              <td className="px-5 py-3 text-white font-bold uppercase tracking-wide text-xs drop-shadow">
                Total Project Cost (incl. GST)
              </td>
              <td className="px-5 py-3 text-right text-white font-extrabold text-base tabular-nums drop-shadow">
                {fmtINR(c.totalWithGst)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-primary-800 uppercase tracking-widest mb-4">{title}</h2>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-secondary-700">
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 mt-0.5 tabular-nums">
              {i + 1}
            </span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function ProposalPreview() {
  const [proposal, setProposal] = useState<GeneratedProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposal/${PROPOSAL_ID}/generate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const e = (await res.json()) as { error: string };
        throw new Error(e.error);
      }
      const json = (await res.json()) as { data: GeneratedProposal };
      setProposal(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page card */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header strip */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">
                📄
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                  Proposal Generator
                </h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  Generate a full proposal document from costing, BOM, and ROI data.
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 hover:border-white/60 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all self-start sm:self-auto flex-shrink-0 shadow-lg"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <span className="text-base">✦</span>
                  Generate Proposal
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm mb-6">
              {error}
            </div>
          )}

          {!proposal && !loading && !error && (
            <div className="flex items-center justify-center h-72 bg-white/60 border-2 border-dashed border-primary-200 rounded-xl">
              <div className="text-center">
                <p className="text-5xl mb-4">📄</p>
                <p className="text-secondary-500 text-sm mb-1">No proposal generated yet</p>
                <p className="text-secondary-400 text-xs">
                  Click <strong className="text-primary-700">Generate Proposal</strong> to create a full document
                </p>
              </div>
            </div>
          )}

          {proposal && (
            <div className="bg-white rounded-2xl border border-primary-100 shadow-sm overflow-hidden">
              {/* Letterhead — navy→gold gradient matching CRM */}
              <div className="px-4 sm:px-8 py-6 sm:py-8" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/25 border border-white/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg backdrop-blur-md">
                        RE
                      </div>
                      <div>
                        <p className="text-white font-extrabold text-base sm:text-lg tracking-tight drop-shadow">
                          Rayenna Energy Private Limited
                        </p>
                        <p className="text-white/80 text-xs leading-relaxed">
                          Door No 3324/52, Ray Bhavan, NH Bypass,<br className="sm:hidden" /> Thykoodam, Kochi - 682019
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Tel: +91 7907 369 304 · sales@rayenna.energy<br className="sm:hidden" />
                      <span className="hidden sm:inline"> · </span>www.rayennaenergy.com · GST: 32AANCR8677A1Z6
                    </p>
                  </div>

                  <div className="sm:text-right flex-shrink-0">
                    <p className="text-xs text-white/60 mb-1">Reference</p>
                    <p className="text-white font-mono text-sm font-semibold">{proposal.refNumber}</p>
                    <p className="text-xs text-white/60 mt-2">Date</p>
                    <p className="text-white text-sm font-medium">
                      {new Date(proposal.generatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-white/20">
                  <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Proposal For</p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                    {proposal.systemSizeKw} kW On-Grid Solar Power Plant
                  </h2>
                  <p className="text-white/80 mt-1">
                    Prepared for: <span className="text-white font-semibold">{proposal.customerName}</span>
                    {proposal.location && (
                      <span className="text-white/60"> · {proposal.location}</span>
                    )}
                  </p>
                </div>

                {/* Mode badge */}
                <div className="mt-4">
                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-semibold ${
                      proposal.mode === 'ai-enhanced'
                        ? 'bg-white/20 text-white border-white/40'
                        : 'bg-white/10 text-white/80 border-white/30'
                    }`}
                  >
                    {proposal.mode === 'ai-enhanced' ? '✦ AI-enhanced narrative' : 'Template mode'}
                  </span>
                </div>
              </div>

              {/* Document body */}
              <div className="px-4 sm:px-8 py-6 sm:py-8">
                <KpiStrip roi={proposal.roiSnapshot} />

                <Divider />
                <SectionBlock section={proposal.executiveSummary} />
                <Divider />
                <SectionBlock section={proposal.aboutRayenna} />
                <Divider />
                <SectionBlock section={proposal.savingsExplanation} />
                <Divider />
                <SectionBlock section={proposal.environmentalImpact} />
                <Divider />
                <SectionBlock section={proposal.scopeOfWork} />
                <Divider />
                <BOMTable items={proposal.billOfQuantities} />
                <Divider />
                <CommercialsBlock c={proposal.commercials} />
                <Divider />
                <ListBlock title="Terms & Conditions" items={proposal.termsAndConditions} />
                <Divider />
                <ListBlock title="Payment Terms" items={proposal.paymentTerms} />
                <Divider />
                <SectionBlock section={proposal.closingNote} />
              </div>

              {/* Footer */}
              <div className="border-t border-primary-100 bg-gradient-to-br from-primary-50/30 to-transparent px-8 py-4 flex items-center justify-between">
                <p className="text-xs text-secondary-400">
                  Generated {new Date(proposal.generatedAt).toLocaleString('en-IN')} ·{' '}
                  Proposal #{proposal.proposalId}
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors disabled:opacity-50"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
