import { Fragment, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TIPS } from '../data/tipOfTheDay';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface AccordionProps {
  id: string;
  icon: string;
  title: string;
  accent: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/* ─── Back to top link ───────────────────────────────────────────────────── */
function BackToTop() {
  return (
    <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
      <a
        href="#toc"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors group"
      >
        <span className="transition-transform group-hover:-translate-y-0.5">↑</span>
        Back to top
      </a>
    </div>
  );
}

/* ─── Accordion wrapper (always open on md+, collapsible on mobile) ──────── */
function Section({ id, icon, title, accent, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left md:cursor-default"
        aria-expanded={open}
      >
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`}>
          {icon}
        </span>
        <span className="flex-1 font-bold text-gray-800 text-base sm:text-lg">{title}</span>
        <span className={`md:hidden text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {/* Body — always visible on md+ */}
      <div className={`${open ? 'block' : 'hidden'} md:block border-t border-gray-100 px-5 pb-5 pt-4`}>
        {children}
        <BackToTop />
      </div>
    </div>
  );
}

/* ─── Small reusable components ─────────────────────────────────────────── */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm mt-0.5">
        {n}
      </div>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <div className="text-sm text-gray-600 mt-0.5 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
      <span className="flex-shrink-0">💡</span>
      <span>{children}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-800">
      <span className="flex-shrink-0">ℹ️</span>
      <span>{children}</span>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800">
      <span className="flex-shrink-0">⚠️</span>
      <span>{children}</span>
    </div>
  );
}

function KbdRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex gap-1 flex-shrink-0">
        {keys.map((k) => (
          <kbd key={k} className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-700">
            {k}
          </kbd>
        ))}
      </div>
      <span className="text-sm text-gray-600">{desc}</span>
    </div>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800 text-sm">{q}</span>
        <span className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Tip category labels for the Help page tip list ────────────────────── */
const TIP_CATEGORIES: { label: string; icon: string; accent: string; bg: string; border: string }[] = [
  { label: 'Customers',      icon: '👥', accent: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
  { label: 'Costing Sheet',  icon: '📊', accent: '#059669', bg: '#f0fdf4', border: '#a7f3d0' },
  { label: 'BOM',            icon: '📦', accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: 'ROI Calculator', icon: '📈', accent: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  { label: 'Proposal',       icon: '📄', accent: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
  { label: 'Export & Data',  icon: '💾', accent: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { label: 'Workflow',       icon: '⚡', accent: '#0d1b3a', bg: '#f0f4ff', border: '#c7d2fe' },
];

// Tip count per category (matches order in tipOfTheDay.ts)
const TIP_COUNTS = [5, 7, 5, 5, 8, 4, 1];

/* ─── Table of Contents ─────────────────────────────────────────────────── */
const TOC = [
  { id: 'quickstart',     icon: '🚀', label: 'Quick Start'           },
  { id: 'customers',      icon: '👥', label: 'Managing Customers'    },
  { id: 'costing',        icon: '📊', label: 'Costing Sheet'         },
  { id: 'bom',            icon: '📦', label: 'Bill of Materials'     },
  { id: 'roi',            icon: '📈', label: 'ROI Calculator'        },
  { id: 'proposal',       icon: '📄', label: 'Proposal'              },
  { id: 'tips',           icon: '✨', label: 'Tips & Shortcuts'      },
  { id: 'tip-of-the-day', icon: '💡', label: 'Tip of the Day'        },
  { id: 'faq',            icon: '❓', label: 'FAQ'                   },
];

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function HelpPage() {
  const { pathname } = useLocation();

  // Build grouped tip list from the flat TIPS array using TIP_COUNTS
  const groupedTips: { category: typeof TIP_CATEGORIES[0]; tips: string[] }[] = [];
  let offset = 0;
  TIP_COUNTS.forEach((count, i) => {
    groupedTips.push({ category: TIP_CATEGORIES[i], tips: TIPS.slice(offset, offset + count) });
    offset += count;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* ── Hero ── */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0d1b3a 0%, #1e2848 60%, #eab308 100%)' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
            📘
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Guide</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">
              Rayenna Proposal Engine · Sales Team Edition
            </p>
            <p className="text-white/70 mt-2 text-sm leading-relaxed">
              Everything you need to create a professional solar proposal — from costing to customer delivery — in one place.
            </p>
          </div>
        </div>
      </div>

      {/* ── Table of Contents ── */}
      <div id="toc" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 scroll-mt-24">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Jump to section</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TOC.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 text-sm font-medium transition-colors border border-gray-100 hover:border-indigo-200"
            >
              <span>{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. QUICK START                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="quickstart" icon="🚀" title="Quick Start — 5 Steps to a Proposal" accent="bg-indigo-100 text-indigo-700" defaultOpen>

        <p className="text-sm text-gray-600 mb-5">
          Follow these five steps in order and you will have a complete, professional proposal ready to share with your customer.
        </p>

        {/* Visual workflow */}
        <div className="flex flex-wrap items-center gap-2 mb-6 text-xs font-semibold">
          {['1 Customer', '2 Costing', '3 BOM', '4 ROI', '5 Proposal'].map((s, i, arr) => (
            <Fragment key={s}>
              <span className="px-3 py-1.5 rounded-full bg-indigo-600 text-white shadow-sm">{s}</span>
              {i < arr.length - 1 && <span className="text-gray-400">→</span>}
            </Fragment>
          ))}
        </div>

        <div className="space-y-5">
          <Step n={1} title="Pick a CRM Project">
            Go to <Link to="/customers" className="text-indigo-600 underline font-medium">Customers / Projects</Link> and click <strong>+ Select Project</strong>. Use the filters to find a Rayenna CRM project in <em>Proposal</em> or <em>Confirmed</em> stage, then click <strong>Select</strong> in the picker. This creates a Proposal Engine record linked to that CRM project and makes it the <strong>active project</strong> on your Dashboard and in all four workflow pages.
          </Step>

          <Step n={2} title="Build the Costing Sheet">
            Go to <Link to="/costing" className="text-indigo-600 underline font-medium">Costing Sheet</Link>. Click <strong>📋 Templates</strong> and pick the template closest to your project size (e.g. <em>5KW DCR</em>). Adjust quantities and prices as needed, set your margin %, and click <strong>💾 Save Sheet</strong>. The BOM and ROI will be pre-filled automatically.
          </Step>

          <Step n={3} title="Review the Bill of Materials">
            Go to <Link to="/bom" className="text-indigo-600 underline font-medium">BOM</Link>. The equipment list is already generated from your costing sheet. Add brand names, adjust specifications if needed, and click <strong>💾 Save BOM</strong>.
          </Step>

          <Step n={4} title="Calculate ROI">
            Go to <Link to="/roi" className="text-indigo-600 underline font-medium">ROI Calculator</Link>. System size and project cost are already filled in. Adjust the electricity tariff and escalation rate if needed, then click <strong>Calculate</strong>. Review the results and click <strong>💾 Save Result</strong>.
          </Step>

          <Step n={5} title="Generate and Export the Proposal">
            Go to <Link to="/proposal" className="text-indigo-600 underline font-medium">Proposal</Link>. Click <strong>Generate Proposal</strong> to see the full document. Use the <strong>✏️ Edit</strong> button to make any inline changes directly on the proposal text. Add notes in the Bill of Quantities section, then click the <strong>💾 Save</strong> button (top-right or at the bottom) to lock everything in. Export as <strong>PDF</strong> or <strong>DOCX</strong> to share with your customer.
          </Step>
        </div>

        <div className="mt-5">
          <Tip>The entire workflow takes about 10–15 minutes once you are familiar with it. Built-in templates do most of the heavy lifting.</Tip>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. CUSTOMERS                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="customers" icon="👥" title="Managing Customers" accent="bg-sky-100 text-sky-700">

        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Creating a Customer</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              On the <strong>Customers / Projects</strong> page, click <strong>+ Select Project</strong> to open the CRM project picker. It shows Rayenna CRM projects that are in <em>Proposal</em> or <em>Confirmed</em> stages. When you pick a project, the Proposal Engine creates a linked customer record and pulls in master data such as customer ID, name, full address, contact numbers, email, consumer number, system capacity, segment, sales person, project stage, and panel type from the CRM.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Setting the Active Customer</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Costing Sheet, BOM, ROI, and Proposal pages all work on the <strong>active project</strong>. The active project is shown in the Dashboard (<em>Proposal Command Center</em>) banner at the top of the page and as a pulsing blue dot in the top navigation bar. To switch, either click a <strong>Recent project</strong> tile on the Dashboard or click the <strong>Open</strong> button on a tile in the Customers / Projects page — both actions make that project active and return you to the Dashboard.
            </p>
            <div className="mt-2">
              <Warn>Always check the active customer before saving any work. Saving to the wrong customer will overwrite their data.</Warn>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Tracking Proposal Status</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              Each customer has a status that you can update by clicking the coloured pills on the Customers / Projects page:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center">
              {[
                { label: 'Draft',          color: 'bg-gray-100 text-gray-600 border-gray-200' },
                { label: 'Proposal Ready', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                { label: 'Sent',           color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                { label: 'Won',            color: 'bg-green-100 text-green-700 border-green-200' },
                { label: 'Lost',           color: 'bg-red-100 text-red-700 border-red-200' },
              ].map((s) => (
                <span key={s.label} className={`px-2 py-1.5 rounded-full border font-semibold ${s.color}`}>{s.label}</span>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">Status is set to <em>Proposal Ready</em> automatically when you click <strong>💾 Save</strong> on the Proposal page.</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Proposal Progress</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Dashboard shows a <strong>Proposal Progress</strong> bar for the active project (0–4 artifacts complete). Each of the four large tiles (Costing Sheet, BOM, ROI, Proposal) shows a green <strong>✓ Saved</strong> badge and a short summary once it has been saved — click any tile to jump directly to that page with the project\'s data pre-loaded.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. COSTING SHEET                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="costing" icon="📊" title="Costing Sheet" accent="bg-emerald-100 text-emerald-700">

        <div className="space-y-5">

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Starting from a Template</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              Click <strong>📋 Templates</strong> to open the template picker. Six built-in templates cover the most common Rayenna project types:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Template</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">System</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['3KW DCR',            '3 kW, 1-Phase',  'On-Grid, DCR (Adani modules)'],
                    ['5KW DCR',            '5 kW, 1-Phase',  'On-Grid, DCR (Adani modules)'],
                    ['5KW Non DCR',        '5 kW, 1-Phase',  'On-Grid, Non-DCR (Waaree modules)'],
                    ['10KW Non DCR',       '10 kW, 3-Phase', 'On-Grid, Non-DCR'],
                    ['15KW Non DCR Hybrid','15 kW, 3-Phase', 'Hybrid + 7×100Ah Lithium Battery'],
                    ['25KW Non DCR',       '25 kW, 3-Phase', 'On-Grid, Non-DCR'],
                  ].map(([name, sys, type]) => (
                    <tr key={name} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-800">{name}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{sys}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 mt-2">When loading a template you can choose to <strong>Replace</strong> all rows or <strong>Append</strong> to existing ones.</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Editing Items</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Every row has six fields: <strong>Category</strong>, <strong>Item Name</strong>, <strong>Specification</strong>, <strong>Qty</strong>, <strong>Unit Cost (₹)</strong>, and <strong>GST %</strong>. The row total and grand total update automatically as you type. Hover over a row and click the <strong>×</strong> button to delete it. Use the <strong>+ [Category]</strong> buttons at the bottom of each group to add new rows.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">GST Toggle</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Use the <strong>Show GST</strong> toggle at the top of the page to show or hide GST columns. When enabled, the totals panel breaks down: subtotal (excl. GST), total GST, margin, and grand total (incl. GST). Default GST rates are <strong>5%</strong> for PV Modules and Inverters, and <strong>18%</strong> for all other items — you can override per row.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Setting the Margin</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The <strong>Margin %</strong> field (default 15%) is shown in the totals panel. Type a new value to update the grand total in real time. The margin is included in the proposal's commercials section but is not labelled separately — it is absorbed into the Equipment &amp; Installation line.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Importing from Excel</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
              <li>Click <strong>⬇ Template</strong> to download the Rayenna Excel import template.</li>
              <li>Fill in your data in the <em>Costing Sheet</em> tab. Use the <em>Category Reference</em> tab for valid category keys.</li>
              <li>Click <strong>📥 Import Excel</strong> and select your filled file.</li>
              <li>Review the preview — check that categories and unit costs look correct.</li>
              <li>Choose <strong>Replace</strong> (clear existing rows) or <strong>Append</strong> (add to existing).</li>
            </ol>
            <div className="mt-2 space-y-2">
              <Tip>Column headers are matched by name, not position. The column order in your file does not matter.</Tip>
              <Note>Valid category keys: <code className="bg-gray-100 px-1 rounded text-xs">pv-modules, inverters, mounting-structure, dc-db, ac-db, dc-cable, ac-cable, earthing, meter, installation, others</code></Note>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Saving the Sheet</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Click <strong>💾 Save Sheet</strong>. Enter a name (e.g. <em>5KW DCR – Mr. Sharma</em>) and optional notes, then confirm. Saving does three things automatically:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Saves the sheet against the active customer</li>
              <li>Auto-generates the BOM from the costing items</li>
              <li>Pre-fills the ROI Calculator with system size and total project cost</li>
            </ul>
            <div className="mt-2">
              <Note>Each customer has only one costing sheet. Saving again overwrites the previous one. To keep a reusable version, save it as a <strong>Template</strong> instead.</Note>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Saving as a Template</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              In the Save Sheet modal, check <strong>Save as Template</strong>. Templates are stored separately and can be reloaded for any future customer. They appear in the Templates picker alongside the six built-in templates.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Exporting</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Use <strong>⬇ XLSX</strong> to export to Excel (includes subtotals, GST rows, margin, and grand total) or <strong>⬇ CSV</strong> for a plain comma-separated file.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. BOM                                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="bom" icon="📦" title="Bill of Materials (BOM)" accent="bg-orange-100 text-orange-700">

        <div className="space-y-5">

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Auto-Generation</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The BOM is automatically created when you save the Costing Sheet. Items are grouped by category, duplicates are merged (quantities summed), and specifications are carried over. Auto-generated rows are tagged with an <strong>auto</strong> badge; rows you add manually show <strong>manual</strong>.
            </p>
            <div className="mt-2">
              <Tip>You do not need to enter the BOM manually. Just save the Costing Sheet and the BOM will be ready to review.</Tip>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Editing the BOM</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The main thing to add is <strong>Brand</strong> names for each item (e.g. Polycab, Havells, Adani). You can also edit specifications and quantities. Click <strong>+ Add Row</strong> inside any category group to add a manual item.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Grouping &amp; Collapsing</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Items are grouped by category with collapsible headers. Use the <strong>Collapse All / Expand All</strong> toggle above the table for a quick summary view. Each group header shows the item count and total quantity.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">GST Reference Panel</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The BOM page includes a GST reference panel showing which items attract 5% (PV Modules, On-Grid Inverters) vs 18% (all other equipment and services). This is for reference only — the BOM does not have unit costs.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Saving the BOM</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Click <strong>💾 Save BOM</strong>. Your edits (brand names, specifications, manual rows) are saved against the active customer. The BOM will appear in the Proposal's Bill of Quantities section.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Exporting</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Use <strong>⬇ XLSX</strong> or <strong>⬇ CSV</strong> to export the BOM. The export includes: Item #, Item Name, Specification, Quantity, Brand, and GST %.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 5. ROI CALCULATOR                                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="roi" icon="📈" title="ROI Calculator" accent="bg-purple-100 text-purple-700">

        <div className="space-y-5">

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Auto-Fill from Costing Sheet</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              When you save the Costing Sheet, <strong>System Size (kW)</strong> and <strong>Total Project Cost (₹)</strong> are automatically passed to the ROI Calculator. A blue banner at the top of the page confirms the source and values. You do not need to enter these manually.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Input Fields</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Field</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Default</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">What it means</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['System Size (kW)',       'From costing sheet',  'Total installed capacity in kilowatts'],
                    ['Electricity Tariff',     '₹8.20/kWh',          'Current rate your customer pays per unit'],
                    ['Generation Factor',      '1500 kWh/kW/year',   'Expected annual solar generation per kW installed (Kerala average)'],
                    ['Tariff Escalation',      '5% per year',        'Expected annual increase in electricity tariff'],
                    ['Total Project Cost (₹)', 'From costing sheet', 'Grand total from the costing sheet (incl. GST & margin)'],
                  ].map(([field, def, desc]) => (
                    <tr key={field} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-800">{field}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-500">{def}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Reading the Results</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Payback Period',        desc: 'Years to recover the full project cost from electricity savings' },
                { label: 'Annual Savings (Y1)',   desc: 'Rupee savings in the first year of operation' },
                { label: '25-Year Savings',       desc: 'Total cumulative savings over the system lifetime' },
                { label: 'ROI %',                 desc: 'Return on investment as a percentage of project cost' },
                { label: 'LCOE',                  desc: 'Levelised cost of energy — cost per kWh generated over 25 years' },
                { label: 'CO₂ Offset',            desc: 'Tonnes of carbon dioxide avoided over 25 years' },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="font-semibold text-gray-800 text-xs">{m.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">25-Year Chart</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The bar chart shows cumulative savings year by year. <strong>Blue bars</strong> represent years before the payback point; <strong>green bars</strong> represent years after payback (pure profit). Hover over any bar to see the annual savings and cumulative total for that year.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Saving the Result</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Click <strong>💾 Save Result</strong> after calculating. The result is saved against the active customer and will appear in the Proposal's Financial Benefits section.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 6. PROPOSAL                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="proposal" icon="📄" title="Proposal" accent="bg-rose-100 text-rose-700">

        <div className="space-y-5">

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Generating the Proposal</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              If an active customer is set, their details are pre-filled. Click <strong>Generate Proposal</strong> to assemble the full document. The proposal pulls data from the Costing Sheet, BOM, and ROI Calculator automatically.
            </p>
            <div className="mt-2">
              <Note>For best results, save the Costing Sheet, BOM, and ROI result before generating the proposal.</Note>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Proposal Sections</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                ['Letterhead',              'Company logo, reference number, customer address'],
                ['Executive Summary',       'Personalised letter with system size, cost, payback, savings'],
                ['About Rayenna',           'Company highlights and credentials'],
                ['What We Offer',           'Domestic, Commercial, and Consultation services'],
                ['Financial Benefits',      'Savings narrative, LCOE, 25-year chart and table'],
                ['Environmental Impact',    'CO₂ offset, clean energy generation, sustainability'],
                ['Our Process',             '5-step journey from consultation to ongoing support'],
                ['Scope of Work',           'Site survey, equipment supply, installation, documentation'],
                ['Bill of Quantities',      'Grouped equipment list with per-category comment fields'],
                ['Commercials',             'Project cost breakdown and ROI summary'],
                ['Client Scope',            'Customer responsibilities and charges'],
                ['Terms & Conditions',      '10 standard clauses including validity and jurisdiction'],
                ['Service Details',         '5-year monitoring and complaint support'],
                ['Payment Terms',           '70% / 15% / 10% / 5% milestone schedule'],
                ['Account Details',         'Rayenna bank account for payment'],
                ['Warranty',                'Module, inverter, and equipment warranty terms'],
                ['Material Delivery',       '7–15 working days from confirmed PO'],
              ].map(([section, desc]) => (
                <div key={section} className="flex gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-gray-400 flex-shrink-0">▸</span>
                  <div>
                    <span className="font-medium text-gray-800">{section}</span>
                    <span className="text-gray-500"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Editing the Proposal Inline</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Click the <strong>✏️ Edit</strong> button in the top-right of the proposal header. The entire proposal document becomes editable — click on any text (executive summary, scope of work, terms, any section) and type directly. An amber border and banner appear to confirm you are in edit mode. Click <strong>✏️ Editing…</strong> again to exit edit mode without saving, or click <strong>💾 Save</strong> at the bottom to save your changes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Adding BOM Comments</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              In the <strong>Bill of Quantities</strong> section of the proposal, each category has a comment field. Use this to add notes like <em>"Adani DCR modules as per MNRE approved list"</em> or <em>"Deye hybrid inverter with 5-year warranty"</em>. These are saved automatically when you click <strong>💾 Save</strong> and will be included in DOCX and PDF exports.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Saving Everything in One Shot</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Click <strong>💾 Save</strong> at the bottom of the proposal page. This single button saves everything together — BOM comments, any inline edits, and all four artifacts (Costing, BOM, ROI, Proposal) to the active customer record. The customer status is automatically updated to <em>Proposal Ready</em>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Exporting to PDF</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Click <strong>⬇ PDF</strong>. A new browser tab opens with the proposal formatted for A4 printing. Your browser's print dialog will appear — choose <strong>Save as PDF</strong> as the destination. Make sure <strong>Background graphics</strong> is enabled in the print options for the best result.
            </p>
            <div className="mt-2">
              <Tip>In Chrome: More settings → Background graphics → ON. In Edge: More settings → Print backgrounds → ON.</Tip>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Exporting to DOCX (Word)</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Click <strong>⬇ DOCX</strong>. A Word document is generated and downloaded directly to your device. It includes the Rayenna logo, all proposal sections, the BOM table, and the ROI summary. You can open it in Microsoft Word or Google Docs for any final edits before sending.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 7. TIPS & SHORTCUTS                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="tips" icon="✨" title="Tips & Shortcuts" accent="bg-yellow-100 text-yellow-700">

        <div className="space-y-5">

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Keyboard Shortcuts</h3>
            <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-2 divide-y divide-gray-100">
              <KbdRow keys={['Tab']}           desc="Move to the next input field in a row" />
              <KbdRow keys={['Shift', 'Tab']}  desc="Move to the previous input field" />
              <KbdRow keys={['Enter']}         desc="Confirm a modal or dialog" />
              <KbdRow keys={['Esc']}           desc="Close a modal or cancel an action" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Reusing Templates</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              After adjusting a template for a specific project type, save it as a custom template with a descriptive name (e.g. <em>5KW DCR – Flat Roof – Standard</em>). It will appear in the Templates picker for all future customers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Overwriting vs. New Sheet</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Each customer has <strong>one</strong> costing sheet. Saving again overwrites it. If you want to keep a version for reuse, save it as a Template before making changes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Collapsing Categories</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Use the <strong>Collapse All</strong> toggle above the costing table or BOM table to get a quick summary of category subtotals without scrolling through every line item.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Switching Customers Mid-Work</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              To work on a different project, either click one of the <strong>Recent customers</strong> on the Dashboard or go to <Link to="/customers" className="text-indigo-600 underline">Customers / Projects</Link> and click <strong>Open</strong> on the desired tile. The Dashboard\'s active project banner, Proposal Progress bar, and all four pages will immediately switch to that project.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Data Storage</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Proposals and artifacts are stored in the Rayenna CRM backend. Your browser's local storage is used only as a per-user workspace (for scratchpads, WIP edits, and templates). This means:
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Saved proposals and artifacts are available from any device once you log in</li>
              <li>Clearing browser data will remove unsaved scratch work and cached local templates, but not the CRM-stored proposals</li>
              <li>It is still good practice to export important proposals to PDF or DOCX for safe keeping and sharing</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 8. TIP OF THE DAY                                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="tip-of-the-day" icon="💡" title="Tip of the Day" accent="bg-amber-100 text-amber-700">

        {/* Launch button */}
        <div className="flex items-center justify-between mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <div>
            <p className="font-semibold text-gray-800 text-sm">Show today's tip</p>
            <p className="text-xs text-gray-500 mt-0.5">A new tip rotates every day. Use Next Tip to browse all {TIPS.length} tips.</p>
          </div>
          <a
            href={`${pathname}?showTip=1`}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848)' }}
          >
            <span>💡</span>
            Launch
          </a>
        </div>

        {/* All tips grouped by category */}
        <div className="space-y-6">
          {groupedTips.map(({ category, tips }) => (
            <div key={category.label}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-1 h-5 rounded-full flex-shrink-0"
                  style={{ background: category.accent }}
                />
                <span className="text-base leading-none">{category.icon}</span>
                <h3
                  className="text-xs font-extrabold uppercase tracking-widest"
                  style={{ color: category.accent }}
                >
                  {category.label}
                </h3>
                <span className="text-xs text-gray-400 font-medium">({tips.length})</span>
              </div>

              {/* Tip cards */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: category.border, background: category.bg }}
              >
                {tips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 text-sm text-gray-700 border-b last:border-b-0"
                    style={{ borderColor: `${category.border}80` }}
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white mt-0.5"
                      style={{ background: category.accent }}
                    >
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 9. FAQ                                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="faq" icon="❓" title="Frequently Asked Questions" accent="bg-teal-100 text-teal-700">

        <div className="space-y-2">

          <FaqItem q="Why is the ROI Calculator not auto-filling System Size and Project Cost?">
            The ROI Calculator is auto-filled when you <strong>save the Costing Sheet</strong> (not just edit it). Make sure you clicked <strong>💾 Save Sheet</strong> and that the same customer is active. If the values still don't appear, try saving the costing sheet again.
          </FaqItem>

          <FaqItem q="Why is the BOM empty when I open it?">
            The BOM is generated when you save the Costing Sheet. If the BOM is empty, go to the Costing Sheet, make sure your items are entered, and click <strong>💾 Save Sheet</strong>. The BOM will be populated automatically.
          </FaqItem>

          <FaqItem q="I saved a costing sheet but I can't see it in Saved Sheets. What happened?">
            Each customer has only one costing sheet — saving again overwrites the previous one. The sheet is saved against the <strong>active customer</strong>. Check that the correct customer is active (look for the pulsing blue dot in the navbar). You can also click <strong>📂 Saved Sheets</strong> to see the list.
          </FaqItem>

          <FaqItem q="How do I redo the costing sheet for a customer?">
            Open the Costing Sheet, make your changes, and click <strong>💾 Save Sheet</strong> again. The new version will overwrite the old one. The BOM and ROI autofill will also be updated.
          </FaqItem>

          <FaqItem q="My Excel import is showing wrong categories. How do I fix it?">
            Check the <em>Category Reference</em> tab in the downloaded template for the exact category keys to use (e.g. <code className="bg-gray-100 px-1 rounded text-xs">pv-modules</code>, not <code className="bg-gray-100 px-1 rounded text-xs">PV Modules</code>). The import does fuzzy-matching but exact keys work best. Any unrecognised category defaults to <em>others</em>.
          </FaqItem>

          <FaqItem q="How do I edit the text in a generated proposal?">
            Click the <strong>✏️ Edit</strong> button in the proposal header. The document turns editable (amber border appears). Click on any text and type your changes. When done, click <strong>💾 Save</strong> at the bottom — this saves your edits, BOM comments, and all artifacts together. The PDF export will capture your inline edits automatically since it renders the live document.
          </FaqItem>

          <FaqItem q="The PDF export is showing a blank page. What should I do?">
            Make sure you have generated the proposal first (click <strong>Generate Proposal</strong> before clicking <strong>⬇ PDF</strong>). Also ensure your browser is not blocking pop-ups from this site — the PDF opens in a new tab. Allow pop-ups if prompted.
          </FaqItem>

          <FaqItem q="Can I use the same template for multiple customers?">
            Yes. Built-in templates can be loaded for any customer at any time. You can also save your own custom templates from the Save Sheet modal. Templates are separate from saved sheets — loading a template does not overwrite a saved sheet until you click Save Sheet.
          </FaqItem>

          <FaqItem q="How do I add a brand name to a BOM item?">
            Go to the <Link to="/bom" className="text-indigo-600 underline">BOM page</Link>, find the item in the grouped table, and type the brand name in the <strong>Brand</strong> column. Click <strong>💾 Save BOM</strong> to persist your changes.
          </FaqItem>

          <FaqItem q="The proposal is showing 0 kW in the Financial Benefits section. How do I fix it?">
            This happens when the ROI result has not been saved. Go to the <Link to="/roi" className="text-indigo-600 underline">ROI Calculator</Link>, click <strong>Calculate</strong>, and then click <strong>💾 Save Result</strong>. Then regenerate the proposal.
          </FaqItem>

          <FaqItem q="Will my data be lost if I close the browser?">
            No — once you click <strong>Save</strong> on Costing, BOM, ROI, or Proposal, your data is stored in the Rayenna CRM backend and is available when you log in again (even from another device). Unsaved changes and some local work-in-progress are kept in your browser only, so always save your work and export important proposals to PDF or DOCX as a backup.
          </FaqItem>

        </div>
      </Section>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-gray-400 pt-2">
        Rayenna Proposal Engine · v1.0 · For support contact the Rayenna tech team
      </div>

    </div>
  );
}
