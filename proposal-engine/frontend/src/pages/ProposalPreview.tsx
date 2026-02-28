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
        <h2 className="text-base font-bold text-white uppercase tracking-widest">
          {section.title}
        </h2>
        <span
          className={`text-[10px] px-2 py-0.5 rounded border ${
            section.source === 'ai'
              ? 'bg-violet-950/60 text-violet-300 border-violet-800/50'
              : 'bg-gray-800/60 text-gray-400 border-gray-700/50'
          }`}
        >
          {section.source === 'ai' ? 'AI enhanced' : 'template'}
        </span>
      </div>
      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
        {section.content}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-800 my-8" />;
}

function KpiStrip({ roi }: { roi: ROISnapshot }) {
  const kpis = [
    { label: 'Annual Generation', value: `${roi.annualGeneration.toLocaleString('en-IN')} kWh`, color: 'text-blue-300' },
    { label: 'Year-1 Savings',    value: fmtINR(roi.annualSavings),                             color: 'text-emerald-300' },
    { label: 'Payback Period',    value: `${roi.paybackYears.toFixed(1)} yrs`,                  color: 'text-amber-300' },
    { label: '25-Year Savings',   value: fmtINR(roi.totalSavings25Years),                       color: 'text-indigo-300' },
    { label: 'ROI',               value: `${roi.roiPercent.toFixed(1)}%`,                       color: 'text-violet-300' },
    { label: 'CO₂ Offset',        value: `${roi.co2OffsetTons.toFixed(1)} T`,                   color: 'text-green-300' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-8">
      {kpis.map((k) => (
        <div key={k.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
          <p className={`text-lg font-bold tabular-nums ${k.color}`}>{k.value}</p>
          <p className="text-xs text-gray-500 mt-1">{k.label}</p>
        </div>
      ))}
    </div>
  );
}

function BOMTable({ items }: { items: BOMItem[] }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-white uppercase tracking-widest mb-4">
        Bill of Quantities
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/40">
              <th className="px-3 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide w-8">Sl</th>
              <th className="px-3 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide">Item</th>
              <th className="px-3 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide">Specification</th>
              <th className="px-3 py-2.5 text-right text-xs text-gray-400 uppercase tracking-wide w-16">Qty</th>
              <th className="px-3 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide w-36">Brand</th>
              <th className="px-3 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide w-28">Warranty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-800/60 hover:bg-gray-800/20">
                <td className="px-3 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                <td className="px-3 py-2.5 text-white font-medium">{item.itemName}</td>
                <td className="px-3 py-2.5 text-gray-400 text-xs">{item.specification}</td>
                <td className="px-3 py-2.5 text-white text-right tabular-nums">{item.quantity}</td>
                <td className="px-3 py-2.5 text-gray-300 text-xs">{item.brand}</td>
                <td className="px-3 py-2.5 text-gray-300 text-xs">{item.warranty}</td>
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
      <h2 className="text-base font-bold text-white uppercase tracking-widest mb-4">
        Commercials
      </h2>
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[340px]">
          <tbody>
            <tr className="border-b border-gray-700/50">
              <td className="px-5 py-3 text-gray-400">
                Design, Supply, Installation & Commissioning of {' '}
                <span className="text-white font-medium">system</span> including electrical and structural work
              </td>
              <td className="px-5 py-3 text-right text-white font-medium tabular-nums w-40">
                {fmtINR(c.projectCost)}
              </td>
            </tr>
            <tr className="border-b border-gray-700/50 bg-gray-800/20">
              <td className="px-5 py-3 text-gray-400">GST ({c.gstPercent}%)</td>
              <td className="px-5 py-3 text-right text-amber-300 tabular-nums">{fmtINR(c.gstAmount)}</td>
            </tr>
            <tr className="bg-indigo-950/30">
              <td className="px-5 py-3 text-white font-bold uppercase tracking-wide text-xs">
                Total Project Cost (incl. GST)
              </td>
              <td className="px-5 py-3 text-right text-indigo-300 font-bold text-base tabular-nums">
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
      <h2 className="text-base font-bold text-white uppercase tracking-widest mb-4">{title}</h2>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
            <span className="text-indigo-400 font-medium tabular-nums flex-shrink-0 mt-0.5">
              {i + 1}.
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
      {/* Page header — stacks on mobile */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Proposal Generator</h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate a full proposal document from costing, BOM, and ROI data.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors self-start sm:self-auto flex-shrink-0"
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

      {error && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl px-5 py-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {!proposal && !loading && !error && (
        <div className="flex items-center justify-center h-72 bg-gray-900/40 border border-gray-800 rounded-xl border-dashed">
          <div className="text-center">
            <p className="text-5xl mb-4">📄</p>
            <p className="text-gray-400 text-sm mb-1">No proposal generated yet</p>
            <p className="text-gray-600 text-xs">
              Click <strong className="text-gray-400">Generate Proposal</strong> to create a full document
            </p>
          </div>
        </div>
      )}

      {proposal && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Document header — mimics Rayenna letterhead */}
          <div className="bg-gradient-to-r from-indigo-950 to-gray-900 border-b border-indigo-800/40 px-4 sm:px-8 py-6 sm:py-8">
            {/* Letterhead: stacks on mobile, side-by-side on sm+ */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    RE
                  </div>
                  <div>
                    <p className="text-white font-bold text-base sm:text-lg tracking-tight">
                      Rayenna Energy Private Limited
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Door No 3324/52, Ray Bhavan, NH Bypass,<br className="sm:hidden" /> Thykoodam, Kochi - 682019
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Tel: +91 7907 369 304 · sales@rayenna.energy<br className="sm:hidden" />
                  <span className="hidden sm:inline"> · </span>www.rayennaenergy.com · GST: 32AANCR8677A1Z6
                </p>
              </div>

              <div className="sm:text-right flex-shrink-0">
                <p className="text-xs text-gray-500 mb-1">Reference</p>
                <p className="text-white font-mono text-sm font-medium">{proposal.refNumber}</p>
                <p className="text-xs text-gray-500 mt-2">Date</p>
                <p className="text-white text-sm">
                  {new Date(proposal.generatedAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-indigo-800/30">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Proposal For</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {proposal.systemSizeKw} kW On-Grid Solar Power Plant
              </h2>
              <p className="text-gray-400 mt-1">
                Prepared for: <span className="text-white font-medium">{proposal.customerName}</span>
                {proposal.location && (
                  <span className="text-gray-500"> · {proposal.location}</span>
                )}
              </p>
            </div>

            {/* Mode badge */}
            <div className="mt-4">
              <span
                className={`text-xs px-3 py-1 rounded-full border ${
                  proposal.mode === 'ai-enhanced'
                    ? 'bg-violet-950/60 text-violet-300 border-violet-800/50'
                    : 'bg-gray-800/60 text-gray-400 border-gray-700/50'
                }`}
              >
                {proposal.mode === 'ai-enhanced' ? '✦ AI-enhanced narrative' : 'Template mode'}
              </span>
            </div>
          </div>

          {/* Document body — responsive padding */}
          <div className="px-4 sm:px-8 py-6 sm:py-8">
            {/* KPI strip */}
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
          <div className="border-t border-gray-800 bg-gray-900/60 px-8 py-4 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Generated {new Date(proposal.generatedAt).toLocaleString('en-IN')} ·{' '}
              Proposal #{proposal.proposalId}
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
