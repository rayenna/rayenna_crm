import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  SHEETS_STORAGE_KEY,
  BOM_FROM_COSTING_KEY,
  ROI_AUTOFILL_KEY,
  CATEGORIES,
} from '../lib/costingConstants';
import type { SavedSheet, StoredBom, BomRowGenerated, RoiAutofill, Category } from '../lib/costingConstants';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, ImageRun,
} from 'docx';
import {
  getActiveCustomer,
  saveAllArtifacts,
} from '../lib/customerStore';
import type { CostingArtifact, BomArtifact, RoiArtifact, ProposalArtifact } from '../lib/customerStore';

// ─────────────────────────────────────────────
// localStorage key constants (local to this page)
// ─────────────────────────────────────────────

const BOM_OVERRIDES_KEY    = 'rayenna_bom_overrides_v1';
const ROI_STORAGE_KEY      = 'rayenna_roi_result_v1';
const BOM_COMMENTS_KEY     = 'rayenna_bom_comments_v1';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface BomOverrides { sheetId: string; rows: BomRowGenerated[]; savedAt: string; }

interface YearlyRow {
  year: number;
  generation: number;
  tariffRate: number;
  savings: number;
  cumulativeSavings: number;
  paybackReached: boolean;
}

interface ROIResult {
  inputs: { systemSizeKw: number; tariff: number; generationFactor: number; escalationPercent: number; projectCost: number; };
  annualGeneration: number; annualSavings: number; paybackYears: number;
  totalSavings25Years: number; roiPercent: number; lcoe: number; co2OffsetTons: number;
  yearlyBreakdown?: YearlyRow[];
}

interface CustomerDetails {
  customerName: string;
  location:     string;
  contactPerson: string;
  phone:        string;
  email:        string;
}

interface ProposalData {
  refNumber:      string;
  generatedAt:    string;
  customer:       CustomerDetails;
  systemSizeKw:   number;
  sheet:          SavedSheet | null;
  bom:            BomRowGenerated[];
  roi:            ROIResult | null;
  roiAutofill:    RoiAutofill | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function genRef(): string {
  const now = new Date();
  return `REY/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(Date.now()).slice(-5)}`;
}

function readStorage<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

function getLatestSheet(): SavedSheet | null {
  const sheets: SavedSheet[] | null = readStorage(SHEETS_STORAGE_KEY);
  if (!sheets || !sheets.length) return null;
  return sheets.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0];
}

function getBom(): BomRowGenerated[] {
  // Prefer user overrides, fall back to auto-generated
  const overrides: BomOverrides | null = readStorage(BOM_OVERRIDES_KEY);
  if (overrides && overrides.rows.length) return overrides.rows;
  const stored: StoredBom | null = readStorage(BOM_FROM_COSTING_KEY);
  if (stored && stored.rows.length) return stored.rows;
  return [];
}

// ─────────────────────────────────────────────
// Template text generator
// ─────────────────────────────────────────────

function buildProposal(customer: CustomerDetails, sheet: SavedSheet | null, bom: BomRowGenerated[], roi: ROIResult | null, roiAutofill: RoiAutofill | null): ProposalData {
  const sizeKw = roiAutofill?.systemSizeKw ?? sheet?.systemSizeKw ?? 0;
  return {
    refNumber:   genRef(),
    generatedAt: new Date().toISOString(),
    customer,
    systemSizeKw: sizeKw,
    sheet,
    bom,
    roi,
    roiAutofill,
  };
}

function execSummary(p: ProposalData): string {
  const sz   = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  const cost = p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
  const pb   = p.roi?.paybackYears;
  const sav  = p.roi?.totalSavings25Years;
  return `Dear ${p.customer.customerName || 'Valued Customer'},

Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the design, supply, installation, and commissioning of a ${sz > 0 ? `${sz} kW` : ''} On-Grid Solar Photovoltaic Power Plant at your premises${p.customer.location ? ` in ${p.customer.location}` : ''}.

This proposal has been prepared based on a detailed assessment of your energy requirements and site conditions. The proposed solar system will significantly reduce your electricity costs, provide energy independence, and contribute to a cleaner environment.${cost > 0 ? `\n\nThe total project investment is ${fmtINR(cost)}.` : ''}${pb ? ` With a payback period of approximately ${pb.toFixed(1)} years, this represents an excellent return on investment.` : ''}${sav ? ` Over 25 years, the system is projected to generate cumulative savings of ${fmtINR(sav)}.` : ''}`;
}

function savingsText(p: ProposalData): string {
  if (!p.roi) return `The proposed solar system will generate clean electricity from sunlight, directly offsetting your grid electricity consumption and reducing your monthly electricity bills substantially.\n\nWith rising electricity tariffs in India (historically escalating at 5–7% per year), the financial benefits of solar energy grow significantly over the system's 25-year lifetime.`;
  const r = p.roi;
  // Prefer systemSizeKw from ROI inputs (most accurate), fall back to proposal-level value
  const sizeKw = r.inputs.systemSizeKw > 0 ? r.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  return `The proposed ${sizeKw} kW solar system is projected to generate approximately ${r.annualGeneration.toLocaleString('en-IN')} kWh of clean electricity in Year 1, resulting in annual savings of ${fmtINR(r.annualSavings)} at the current tariff of ₹${r.inputs.tariff}/kWh.

With an assumed annual tariff escalation of ${r.inputs.escalationPercent}%, the cumulative savings over 25 years are estimated at ${fmtINR(r.totalSavings25Years)} — delivering an ROI of ${r.roiPercent.toFixed(1)}%.

The Levelised Cost of Energy (LCOE) from this system is ₹${r.lcoe.toFixed(4)}/kWh, which is significantly lower than the current grid tariff of ₹${r.inputs.tariff}/kWh — making solar the most cost-effective energy source for your facility.

Payback Period: ${r.paybackYears.toFixed(1)} years
Annual Generation (Year 1): ${r.annualGeneration.toLocaleString('en-IN')} kWh
25-Year Cumulative Savings: ${fmtINR(r.totalSavings25Years)}`;
}

function EnvironmentalImpactBlock({ proposal }: { proposal: ProposalData }) {
  const accent = '#16a34a';
  const co2    = proposal.roi?.co2OffsetTons;
  const gen    = proposal.roi?.annualGeneration;
  const name   = proposal.customer.customerName || 'your organisation';

  const bullets: { icon: string; title: string; body: string; bg: string; border: string; iconBg: string }[] = [
    {
      icon: '🌍',
      title: 'Carbon Footprint Reduction',
      body: co2
        ? `Over 25 years, the proposed system will offset approximately ${co2.toFixed(1)} tonnes of CO₂ emissions — equivalent to planting thousands of trees and removing hundreds of cars from the road.`
        : 'The solar system will significantly reduce carbon emissions over its 25-year operational life, contributing to a cleaner, greener environment.',
      bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7',
    },
    {
      icon: '⚡',
      title: 'Clean Energy Generation',
      body: gen
        ? `Each year, the system will generate ${gen.toLocaleString('en-IN')} kWh of clean, renewable electricity — directly reducing dependence on fossil-fuel-based grid power.`
        : 'The system will generate clean, renewable electricity every year, directly offsetting grid consumption powered by fossil fuels.',
      bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe',
    },
    {
      icon: '🏛️',
      title: 'National Solar Mission Alignment',
      body: `This initiative aligns with India's National Solar Mission and demonstrates ${name}'s commitment to a sustainable future and responsible energy consumption.`,
      bg: '#fefce8', border: '#fde68a', iconBg: '#fef9c3',
    },
    {
      icon: '♻️',
      title: 'Long-Term Sustainability',
      body: 'Rayenna Energy will ensure the system is designed and installed to maximise energy yield and environmental benefit throughout its 25-year operational life, with ongoing monitoring and support.',
      bg: '#f5f3ff', border: '#ddd6fe', iconBg: '#ede9fe',
    },
  ];

  return (
    <div className="mb-8">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">🌱</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          Environmental Impact
        </h2>
      </div>

      {/* Intro sentence */}
      <p className="text-sm text-secondary-700 leading-relaxed mb-5">
        By harnessing solar energy, <span className="font-semibold text-secondary-800">{name}</span> will
        make a meaningful contribution to environmental sustainability — reducing carbon emissions,
        conserving natural resources, and supporting India's clean energy goals.
      </p>

      {/* Bullet cards — 2×2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bullets.map((b) => (
          <div
            key={b.title}
            className="rounded-xl border p-4 flex gap-3"
            style={{ background: b.bg, borderColor: b.border }}
          >
            {/* Icon circle */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
              style={{ background: b.iconBg }}
            >
              {b.icon}
            </div>
            <div>
              <p className="text-sm font-extrabold mb-1" style={{ color: accent }}>{b.title}</p>
              <p className="text-xs text-secondary-600 leading-relaxed">{b.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ABOUT_HIGHLIGHTS = [
  { icon: '👷', text: 'Experienced team of solar engineers and project managers' },
  { icon: '🔁', text: 'End-to-end project execution from design to commissioning' },
  { icon: '🏆', text: 'Premium quality components from leading manufacturers' },
  { icon: '🛠️', text: 'Comprehensive after-sales service and AMC support' },
  { icon: '📍', text: 'Proven track record of successful installations across Kerala and beyond' },
  { icon: '📋', text: 'Registered with MNRE, KSEB, and relevant state DISCOMs' },
];

const WHAT_WE_OFFER_INTRO = `We at Rayenna understand that energy requirements vary from one client to another, which is why our services are designed with flexibility in mind. Whether you are a homeowner looking to reduce your electricity bills or a business seeking to achieve long-term cost savings, our team offers customised solar solutions to meet your specific requirements.\n\nWe take great pride in providing top-grade components, exceptional installation services and ongoing support to guarantee that each system operates at its optimal level.`;

const OUR_SERVICES = [
  { icon: '🏠', title: 'Domestic Services',      desc: 'Rooftop solar solutions for homes and residential complexes — reduce your electricity bills and achieve energy independence.' },
  { icon: '🏢', title: 'Commercial Services',    desc: 'Large-scale solar installations for offices, factories, and commercial establishments — maximise ROI and meet sustainability goals.' },
  { icon: '💡', title: 'Consultation Services',  desc: 'Expert advisory on solar feasibility, system sizing, net metering, government subsidies, and financing options.' },
];

const OUR_PROCESS_INTRO = `The Rayenna journey is clear and easy. It starts with understanding your goals during a consultation and executing them seamlessly with a process-oriented approach.`;

const OUR_PROCESS_STEPS = [
  { icon: '🤝', title: 'Consultation',          desc: 'Understanding your energy requirements, goals, and site conditions through a detailed discussion.' },
  { icon: '📍', title: 'Site Evaluation',        desc: 'On-site assessment including shadow analysis, structural review, and grid connectivity study.' },
  { icon: '📐', title: 'System Design',          desc: 'Custom system design with SLD, layout drawings, and equipment selection for maximum yield.' },
  { icon: '🔧', title: 'Installation',           desc: 'Professional installation by certified engineers with strict quality and safety standards.' },
  { icon: '📡', title: 'Ongoing Support',        desc: 'Remote monitoring, preventive maintenance, and 5-year complaint support to ensure peak performance.' },
];

const SCOPE_SECTIONS = [
  {
    title: '1. Site Survey & Design',
    icon: '📐',
    accent: '#0369a1',
    bg: '#eff6ff',
    border: '#bfdbfe',
    items: [
      'Detailed site assessment and shadow analysis',
      'Structural design for mounting system',
      'Single-line diagram (SLD) and layout drawing',
      'Net metering application and DISCOM coordination',
    ],
  },
  {
    title: '2. Supply of Equipment',
    icon: '📦',
    accent: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    items: [
      'Solar PV modules (as per BOM)',
      'On-grid string inverter(s)',
      'Mounting structure (GI/aluminium as applicable)',
      'DC & AC cables, conduits, and accessories',
      'Earthing and lightning protection system',
      'Net meter and protection devices',
    ],
  },
  {
    title: '3. Installation & Commissioning',
    icon: '🔧',
    accent: '#059669',
    bg: '#f0fdf4',
    border: '#a7f3d0',
    items: [
      'Civil and structural work for module mounting',
      'Electrical installation including DC and AC wiring',
      'Inverter installation and configuration',
      'Grid synchronisation and commissioning',
      'Testing and performance verification',
    ],
  },
  {
    title: '4. Documentation & Handover',
    icon: '📋',
    accent: '#7c3aed',
    bg: '#faf5ff',
    border: '#ddd6fe',
    items: [
      'As-built drawings and O&M manual',
      'Warranty certificates for all major components',
      'Net metering approval and grid connection',
      'Training for site personnel',
    ],
  },
];

function scopeText(p: ProposalData): string {
  const sz = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  return `The scope of work for the ${sz > 0 ? `${sz} kW ` : ''}On-Grid Solar Power Plant covers four key areas: Site Survey & Design, Supply of Equipment, Installation & Commissioning, and Documentation & Handover.`;
}

const CLIENT_SCOPE = [
  'Clear shadow free rooftop area for the installation of PV panels.',
  'Space for installation and commissioning of electrical panels.',
  'A secured area for storage of supplied equipment till commissioning.',
  'Electricity – construction power/Water shall be arranged by the owner at its own cost.',
  'Customer need to provide internet connectivity for the system.',
  'Feasibility Charges - Rs.1000 + 18% GST.',
  'Registration Charges - 5KW × Rs. 1000 (Rs.5000/-) + 18% GST.',
  'Bidirectional / Net Meter.',
];

const TERMS_AND_CONDITIONS = [
  'Capacity that can be installed is subject to allocation of feasibility by KSEB.',
  'Any additional super structure required for the project needs to be taken up by the customer.',
  'Net Meter cost will be additional if not supplied by Utility.',
  'Any modification to the existing electrical system due to non-conformity to Electrical Inspectorate / Utility standards will have to be carried out by the customer.',
  'Customer shall provide necessary support for getting approvals from the concerned utility section offices.',
  'VALIDITY: The offer is valid for 7 days from the date of proposal. Prices are subject to change based on market conditions and GST revisions.',
  'Civil and structural work beyond the scope defined herein will be charged separately.',
  'Rayenna Energy will not be responsible for delays caused by force majeure events, government restrictions, or site-related issues beyond our control.',
  'Any additional work not covered in this proposal will be executed only after written approval and issuance of a revised quotation.',
  'Disputes, if any, shall be subject to the jurisdiction of courts in Ernakulam, Kerala.',
];

const SERVICE_DETAILS = [
  'Regular Monitoring of the system and complaint support for 5 years.',
];

const PAYMENT_TERMS = [
  '70% advance of the total invoice value to be paid along with the Purchase Order.',
  '15% of the total invoice value to be made towards supply of material at site.',
  '10% against work completion.',
  '5% to be paid immediately after meter installation.',
];


const WARRANTY_TERMS = [
  '12 Year product warranty and 30 year performance warranty for PV modules.',
  '10 Years warranty for Inverter.',
  'All other equipment supplied carries the original manufacturer\'s warranty.',
];

const DELIVERY_TERMS = [
  '7 to 15 working days from the date of confirmed purchase order with advance.',
];

function closingText(p: ProposalData): string {
  return `We at Rayenna Energy are committed to delivering a world-class solar installation that meets your energy needs and exceeds your expectations. Our team will be with you at every step — from design and installation to commissioning and beyond.

We look forward to the opportunity to partner with ${p.customer.customerName || 'you'} on this journey towards clean, sustainable energy.

For any queries or clarifications, please feel free to contact us:

📞 +91 7907 369 304
📧 sales@rayenna.energy
🌐 www.rayennaenergy.com

Thank you for considering Rayenna Energy as your solar partner.

Warm regards,
Sales Team
Rayenna Energy Private Limited`;
}

// ─────────────────────────────────────────────
// Export utilities
// ─────────────────────────────────────────────

function exportToPdf(printRootId: string): void {
  const el = document.getElementById(printRootId);
  if (!el) return;

  // Collect all stylesheet hrefs and inline style tags from the current page
  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => `<link rel="stylesheet" href="${(l as HTMLLinkElement).href}">`)
    .join('\n');
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((s) => `<style>${s.innerHTML}</style>`)
    .join('\n');

  // Clone the proposal element so we can strip print-hide elements
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.print-hide').forEach((n) => n.remove());
  // Remove border/shadow/rounded corners for clean print
  clone.style.cssText = 'border:none!important;box-shadow:none!important;border-radius:0!important;';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Rayenna Proposal</title>
  ${styleLinks}
  ${inlineStyles}
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    body  { margin:0; padding:0; background:#fff; font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; color-adjust:exact!important; }
    table, tr, .rounded-xl, .grid > div { break-inside:avoid; page-break-inside:avoid; }
    svg { overflow:visible!important; }
    textarea { display:none!important; }
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) return;
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();

  // Wait for styles + images to load, then print
  printWin.onload = () => {
    setTimeout(() => {
      printWin.focus();
      printWin.print();
      // Close the window after the print dialog is dismissed
      printWin.onafterprint = () => printWin.close();
    }, 600);
  };
}

/**
 * Text overrides extracted from the live DOM before DOCX export.
 * Keys match the data-docx-section attribute values on rendered elements.
 * Values are the current innerText of those elements (may include user edits).
 */
interface TextOverrides {
  'exec-summary-p1'?:    string;
  'exec-summary-p2'?:    string;
  'about-p1'?:           string;
  'about-p2'?:           string;
  'financial-p1'?:       string;
  'financial-p2'?:       string;
  'financial-no-roi'?:   string;
  'scope-intro'?:        string;
  'what-we-offer-intro'?: string;
  'our-process-intro'?:  string;
  'section-closing-note'?: string;
  // ListBlock items: key = "list-<title>", value = newline-joined item texts
  [key: string]: string | undefined;
}

function buildDocx(p: ProposalData, diagramImageData?: ArrayBuffer, bomComments?: Record<string, string>, logoImageData?: ArrayBuffer, textOverrides?: TextOverrides): Document {
  const navy  = '0d1b3a';
  const white = 'FFFFFF';

  const heading = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C7D2FE', space: 4 } },
    });

  const multilineParagraphs = (text: string) =>
    text.split('\n').map((line) =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 22, color: '374151' })],
        spacing: { after: 80 },
      }),
    );

  const listItem = (text: string, num?: number) =>
    new Paragraph({
      children: [
        new TextRun({ text: num != null ? `${num}. ` : '• ', bold: true, size: 22, color: navy }),
        new TextRun({ text, size: 22, color: '374151' }),
      ],
      spacing: { after: 80 },
      indent: { left: 360 },
    });

  // ── Letterhead ──
  const letterhead = [
    // Header: logo (right) + company details (left) in a 2-col navy table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:    { style: BorderStyle.NONE, size: 0, color: navy },
        bottom: { style: BorderStyle.NONE, size: 0, color: navy },
        left:   { style: BorderStyle.NONE, size: 0, color: navy },
        right:  { style: BorderStyle.NONE, size: 0, color: navy },
      },
      rows: [
        new TableRow({
          children: [
            // Left cell: company name + address
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: navy },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: navy },
                bottom: { style: BorderStyle.NONE, size: 0, color: navy },
                left:   { style: BorderStyle.NONE, size: 0, color: navy },
                right:  { style: BorderStyle.NONE, size: 0, color: navy },
              },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'RAYENNA ENERGY PRIVATE LIMITED', bold: true, size: 30, color: white })],
                  spacing: { before: 120, after: 60 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Door No 3324/52, Ray Bhavan, NH Bypass, Thykoodam, Kochi - 682019', size: 17, color: 'C7D2FE' })],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Tel: +91 7907 369 304  |  sales@rayenna.energy', size: 16, color: '93C5FD' })],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'www.rayennaenergy.com  |  GST: 32AANCR8677A1Z6', size: 16, color: '93C5FD' })],
                  spacing: { after: 120 },
                }),
              ],
            }),
            // Right cell: logo image
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: white },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: white },
                bottom: { style: BorderStyle.NONE, size: 0, color: white },
                left:   { style: BorderStyle.NONE, size: 0, color: white },
                right:  { style: BorderStyle.NONE, size: 0, color: white },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 60 },
                  children: logoImageData
                    ? [new ImageRun({ data: logoImageData, transformation: { width: 130, height: 100 }, type: 'jpg' })]
                    : [new TextRun({ text: 'RAYENNA ENERGY', bold: true, size: 22, color: navy })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
    new Paragraph({
      children: [
        new TextRun({ text: `Ref: ${p.refNumber}`, bold: true, size: 22, color: navy }),
        new TextRun({ text: `        Date: ${new Date(p.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, size: 22, color: '374151' }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'To,', bold: true, size: 22, color: navy })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: p.customer.customerName, bold: true, size: 26, color: navy })],
      spacing: { after: 40 },
    }),
    ...(p.customer.contactPerson ? [new Paragraph({ children: [new TextRun({ text: `Attn: ${p.customer.contactPerson}`, size: 22, color: '374151' })], spacing: { after: 40 } })] : []),
    ...(p.customer.location     ? [new Paragraph({ children: [new TextRun({ text: p.customer.location, size: 22, color: '374151' })], spacing: { after: 40 } })] : []),
    ...(p.customer.phone        ? [new Paragraph({ children: [new TextRun({ text: `Ph: ${p.customer.phone}`, size: 22, color: '374151' })], spacing: { after: 40 } })] : []),
    ...(p.customer.email        ? [new Paragraph({ children: [new TextRun({ text: `Email: ${p.customer.email}`, size: 22, color: '374151' })], spacing: { after: 200 } })] : []),
    new Paragraph({
      children: [
        new TextRun({ text: `Proposal For: ${p.systemSizeKw > 0 ? `${p.systemSizeKw} kW ` : ''}On-Grid Solar Power Plant`, bold: true, size: 28, color: navy }),
      ],
      spacing: { after: 400 },
    }),
  ];

  // ── ROI KPIs ──
  const roiSection = p.roi ? (() => {
    const r = p.roi!;
    const rows = r.yearlyBreakdown ?? [];

    // KPI summary table
    const kpiTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ['Annual Generation', 'Year-1 Savings', 'Payback Period', '25-Year Savings', 'ROI', 'CO₂ Offset'].map((label) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: white })], alignment: AlignmentType.CENTER })],
              shading: { type: ShadingType.SOLID, color: navy },
            }),
          ),
        }),
        new TableRow({
          children: [
            `${r.annualGeneration.toLocaleString('en-IN')} kWh`,
            fmtINR(r.annualSavings),
            `${r.paybackYears.toFixed(1)} yrs`,
            fmtINR(r.totalSavings25Years),
            `${r.roiPercent.toFixed(1)}%`,
            `${r.co2OffsetTons.toFixed(1)} T`,
          ].map((val) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: val, bold: true, size: 22, color: navy })], alignment: AlignmentType.CENTER })],
            }),
          ),
        }),
      ],
    });

    // 25-year breakdown table (only if data available)
    const breakdownTable = rows.length > 0 ? new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Header
        new TableRow({
          children: ['Year', 'Generation (kWh)', 'Tariff (₹/kWh)', 'Annual Savings', 'Cumulative Savings', 'Status'].map((h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, color: white })], alignment: AlignmentType.CENTER })],
              shading: { type: ShadingType.SOLID, color: navy },
            }),
          ),
        }),
        // Data rows — first 6, ellipsis, last 2
        ...[...rows.slice(0, 6), null, ...rows.slice(-2)].map((row) => {
          // Ellipsis separator row
          if (row === null) return new TableRow({
            children: [new TableCell({
              columnSpan: 6,
              shading: { type: ShadingType.SOLID, color: 'F1F5F9' },
              children: [new Paragraph({
                children: [new TextRun({ text: '· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·', size: 14, color: '94A3B8', italics: true })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
              })],
            })],
          });
          return new TableRow({
            children: [
              String(row.year),
              row.generation.toLocaleString('en-IN'),
              row.tariffRate.toFixed(2),
              fmtINR(row.savings),
              fmtINR(row.cumulativeSavings),
              row.paybackReached ? '✓ ROI' : 'Payback',
            ].map((val, ci) =>
              new TableCell({
                shading: row.paybackReached ? { type: ShadingType.SOLID, color: 'EFF6FF' } : undefined,
                children: [new Paragraph({
                  children: [new TextRun({
                    text: val,
                    size: 16,
                    bold: ci === 4 || ci === 0,
                    color: ci === 3 ? '059669' : ci === 4 ? navy : '374151',
                  })],
                  alignment: ci === 0 || ci === 5 ? AlignmentType.CENTER : ci >= 1 ? AlignmentType.RIGHT : AlignmentType.LEFT,
                })],
              }),
            ),
          });
        }),
        // Total row
        new TableRow({
          children: [
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: '25-Year Total', bold: true, size: 18, color: white })] })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ text: '' })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ text: '' })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows.reduce((s, row) => s + row.savings, 0)), bold: true, size: 18, color: 'FCD34D' })], alignment: AlignmentType.RIGHT })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows[rows.length - 1]?.cumulativeSavings ?? 0), bold: true, size: 18, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ text: '' })] }),
          ],
        }),
      ],
    }) : null;

    // Side-by-side DOCX layout: chart description (left) + compact table (right)
    const sideBySide = breakdownTable ? new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      },
      rows: [new TableRow({
        children: [
          // Left cell — chart note + key stats
          new TableCell({
            width: { size: 42, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({ children: [new TextRun({ text: '25-Year Savings Overview', bold: true, size: 20, color: navy })], spacing: { after: 120 } }),
              ...[
                ['Annual Generation', `${r.annualGeneration.toLocaleString('en-IN')} kWh`],
                ['Year-1 Savings', fmtINR(r.annualSavings)],
                ['Payback Period', `${r.paybackYears.toFixed(1)} years`],
                ['25-Year Savings', fmtINR(r.totalSavings25Years)],
                ['ROI', `${r.roiPercent.toFixed(1)}%`],
                ['CO₂ Offset', `${r.co2OffsetTons.toFixed(1)} tonnes`],
                ['LCOE', `₹${r.lcoe.toFixed(4)}/kWh`],
              ].map(([label, value]) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${label}: `, size: 18, color: '6B7280' }),
                    new TextRun({ text: value, bold: true, size: 18, color: navy }),
                  ],
                  spacing: { after: 60 },
                }),
              ),
            ],
          }),
          // Right cell — compact savings table
          new TableCell({
            width: { size: 58, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Year-by-Year Breakdown', bold: true, size: 20, color: navy })], spacing: { after: 80 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  // Header
                  new TableRow({
                    children: ['Yr', 'Annual Savings', 'Cumulative'].map((h) =>
                      new TableCell({
                        shading: { type: ShadingType.SOLID, color: navy },
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 14, color: white })], alignment: AlignmentType.CENTER })],
                      }),
                    ),
                  }),
                  // First 6 rows
                  ...rows.slice(0, 6).map((row) => new TableRow({
                    children: [
                      String(row.year), fmtINR(row.savings), fmtINR(row.cumulativeSavings),
                    ].map((val, ci) => new TableCell({
                      shading: row.paybackReached ? { type: ShadingType.SOLID, color: 'F0FDF4' } : undefined,
                      children: [new Paragraph({
                        children: [new TextRun({ text: val, size: 14, bold: ci === 2, color: ci === 1 ? '059669' : ci === 2 ? navy : '374151' })],
                        alignment: ci === 0 ? AlignmentType.CENTER : AlignmentType.RIGHT,
                      })],
                    })),
                  })),
                  // Ellipsis
                  new TableRow({
                    children: [new TableCell({
                      columnSpan: 3,
                      shading: { type: ShadingType.SOLID, color: 'F1F5F9' },
                      children: [new Paragraph({ children: [new TextRun({ text: '· · · · · · · · · · · · · · · · · · · · · · · ·', size: 12, color: '94A3B8', italics: true })], alignment: AlignmentType.CENTER })],
                    })],
                  }),
                  // Last 2 rows
                  ...rows.slice(-2).map((row) => new TableRow({
                    children: [
                      String(row.year), fmtINR(row.savings), fmtINR(row.cumulativeSavings),
                    ].map((val, ci) => new TableCell({
                      shading: { type: ShadingType.SOLID, color: 'EFF6FF' },
                      children: [new Paragraph({
                        children: [new TextRun({ text: val, size: 14, bold: ci === 2, color: ci === 1 ? '059669' : ci === 2 ? navy : '374151' })],
                        alignment: ci === 0 ? AlignmentType.CENTER : AlignmentType.RIGHT,
                      })],
                    })),
                  })),
                  // Total row
                  new TableRow({
                    children: [
                      new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true, size: 14, color: white })], alignment: AlignmentType.CENTER })] }),
                      new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows.reduce((s, row) => s + row.savings, 0)), bold: true, size: 14, color: 'FCD34D' })], alignment: AlignmentType.RIGHT })] }),
                      new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows[rows.length - 1]?.cumulativeSavings ?? 0), bold: true, size: 14, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })],
    }) : null;

    return [
      heading('Financial Highlights'),
      kpiTable,
      new Paragraph({ text: '', spacing: { after: 160 } }),
      ...(sideBySide ? [sideBySide, new Paragraph({ text: '', spacing: { after: 200 } })] : [new Paragraph({ text: '', spacing: { after: 200 } })]),
    ];
  })() : [];

  // ── BOM table ──
  // BOM grouped by category
  const bomSection = p.bom.length > 0 ? (() => {
    const grouped = CATEGORIES
      .map(({ value, label }) => ({ cat: value, label, rows: p.bom.filter((r) => r.category === value) }))
      .filter((g) => g.rows.length > 0);

    // Hex shading per category (light tones for Word)
    const catBg: Record<string, string> = {
      'pv-modules': 'E0F2FE', 'inverters': 'FEF9C3', 'mounting-structure': 'F1F5F9',
      'dc-db': 'FFEDD5', 'ac-db': 'FEE2E2', 'dc-cable': 'FEF3C7',
      'ac-cable': 'DCFCE7', 'earthing': 'D1FAE5', 'meter': 'EDE9FE',
      'installation': 'DBEAFE', 'others': 'F3F4F6',
    };
    const catFg: Record<string, string> = {
      'pv-modules': '0369a1', 'inverters': 'b45309', 'mounting-structure': '475569',
      'dc-db': 'c2410c', 'ac-db': 'b91c1c', 'dc-cable': 'd97706',
      'ac-cable': '16a34a', 'earthing': '059669', 'meter': '7c3aed',
      'installation': '1d4ed8', 'others': '4b5563',
    };
    const catIcons: Record<string, string> = {
      'pv-modules': '☀', 'inverters': '⚡', 'mounting-structure': '🔩',
      'dc-db': '▪', 'ac-db': '▪', 'dc-cable': '▪',
      'ac-cable': '▪', 'earthing': '▪', 'meter': '▪',
      'installation': '🔧', 'others': '▪',
    };

    let serial = 0;
    const tableRows: TableRow[] = [
      // Column headers
      new TableRow({
        children: ['#', 'Item', 'Specification', 'Qty', 'Brand'].map((h, ci) =>
          new TableCell({
            width: ci === 0 ? { size: 5, type: WidthType.PERCENTAGE }
                 : ci === 3 ? { size: 8, type: WidthType.PERCENTAGE }
                 : ci === 4 ? { size: 18, type: WidthType.PERCENTAGE }
                 : undefined,
            shading: { type: ShadingType.SOLID, color: navy },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: white })], alignment: ci >= 3 ? AlignmentType.RIGHT : AlignmentType.LEFT })],
          }),
        ),
      }),
    ];

    grouped.forEach(({ cat, label, rows }) => {
      const bg   = catBg[cat]  ?? 'F3F4F6';
      const fg   = catFg[cat]  ?? '374151';
      const icon = catIcons[cat] ?? '▪';

      // Category header row
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 5,
              shading: { type: ShadingType.SOLID, color: bg },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `${icon}  ${label.toUpperCase()}`, bold: true, size: 20, color: fg }),
                    new TextRun({ text: `   (${rows.length} item${rows.length !== 1 ? 's' : ''})`, size: 16, color: '9CA3AF' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );

      // Item rows
      rows.forEach((item) => {
        serial++;
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(serial), size: 18, color: '9CA3AF' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.itemName, size: 20, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.specification || '—', size: 18, color: '6B7280' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.quantity, size: 20 })], alignment: AlignmentType.RIGHT })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.brand || '—', size: 18, color: '6B7280' })] })] }),
            ],
          }),
        );
      });

      // Comment row (if any)
      const comment = bomComments?.[cat];
      if (comment) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 5,
                shading: { type: ShadingType.SOLID, color: bg },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '📝 Note: ', bold: true, size: 18, color: fg }),
                      new TextRun({ text: comment, size: 18, italics: true, color: '374151' }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        );
      }
    });

    return [
      heading('Bill of Quantities'),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
    ];
  })() : [];

  // ── Commercials ──
  const grandTotal = p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? p.sheet?.grandTotal ?? 0;
  const commercialsSection = grandTotal > 0 ? (() => {
    const preGst    = Math.round(grandTotal / 1.18);
    const gstAmount = Math.round(grandTotal - preGst);
    const sizeKw    = p.roiAutofill?.systemSizeKw ?? p.sheet?.systemSizeKw ?? 0;
    return [
      heading('Commercials'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Design, Supply, Installation & Commissioning of ${sizeKw > 0 ? `${sizeKw} kW ` : ''}On-Grid Solar Power Plant including all electrical and structural work`, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmtINR(preGst), bold: true, size: 20 })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'GST @ 18%', size: 20, color: '1D4ED8' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmtINR(gstAmount), bold: true, size: 20, color: '1D4ED8' })], alignment: AlignmentType.RIGHT })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL PROJECT COST (incl. GST)', bold: true, size: 22, color: white })], alignment: AlignmentType.LEFT })], shading: { type: ShadingType.SOLID, color: navy } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmtINR(grandTotal), bold: true, size: 24, color: white })], alignment: AlignmentType.RIGHT })], shading: { type: ShadingType.SOLID, color: navy } }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
    ];
  })() : [];

  const sections = [
    ...letterhead,
    heading('Executive Summary'),
    // Greeting shaded box
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: '0d1b3a' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'PREPARED EXCLUSIVELY FOR', size: 16, color: 'AABBCC', bold: true })],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: p.customer.customerName || 'Valued Customer', size: 28, bold: true, color: 'FFFFFF' })],
                  spacing: { after: p.customer.location ? 40 : 0 },
                }),
                ...(p.customer.location ? [new Paragraph({
                  children: [new TextRun({ text: p.customer.location, size: 18, color: '8899AA' })],
                })] : []),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    // Body paragraphs — use DOM-extracted text if user has edited inline
    (() => {
      const sz  = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
      const loc = p.customer.location;
      const override = textOverrides?.['exec-summary-p1'];
      if (override) {
        return new Paragraph({
          children: [new TextRun({ text: override, size: 22, color: '374151' })],
          spacing: { after: 120 },
        });
      }
      return new Paragraph({
        children: [
          new TextRun({ text: 'Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the design, supply, installation, and commissioning of', size: 22, color: '374151' }),
          ...(sz > 0 ? [new TextRun({ text: ` a ${sz} kW`, bold: true, size: 22, color: navy })] : [new TextRun({ text: ' an', size: 22, color: '374151' })]),
          new TextRun({ text: ' On-Grid Solar Photovoltaic Power Plant at your premises', size: 22, color: '374151' }),
          ...(loc ? [new TextRun({ text: ` in ${loc}`, bold: true, size: 22, color: navy })] : []),
          new TextRun({ text: '.', size: 22, color: '374151' }),
        ],
        spacing: { after: 120 },
      });
    })(),
    new Paragraph({
      children: [new TextRun({ text: textOverrides?.['exec-summary-p2'] ?? 'This proposal has been prepared based on a detailed assessment of your energy requirements and site conditions. The proposed solar system will significantly reduce your electricity costs, provide energy independence, and contribute to a cleaner environment.', size: 22, color: '374151' })],
      spacing: { after: 160 },
    }),
    // Key metrics table (only if data available)
    ...(() => {
      const sz   = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
      const cost = p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
      const pb   = p.roi?.paybackYears;
      const sav  = p.roi?.totalSavings25Years;
      const metrics = [
        ...(sz > 0   ? [{ label: 'System Capacity',   value: `${sz} kW On-Grid Solar PV` }] : []),
        ...(cost > 0 ? [{ label: 'Project Investment', value: fmtINR(cost) }] : []),
        ...(pb       ? [{ label: 'Payback Period',     value: `~${pb.toFixed(1)} years` }] : []),
        ...(sav      ? [{ label: '25-Year Savings',    value: fmtINR(sav) }] : []),
      ];
      if (metrics.length === 0) return [];
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: metrics.map((m) => new TableCell({
                shading: { type: ShadingType.SOLID, color: 'EEF2FF' },
                children: [
                  new Paragraph({ children: [new TextRun({ text: m.label, size: 16, color: '6B7280' })], spacing: { after: 30 } }),
                  new Paragraph({ children: [new TextRun({ text: m.value, size: 22, bold: true, color: navy })] }),
                ],
              })),
            }),
          ],
        }),
        new Paragraph({ text: '', spacing: { after: 80 } }),
      ];
    })(),
    heading('About Rayenna Energy'),
    new Paragraph({
      children: textOverrides?.['about-p1']
        ? [new TextRun({ text: textOverrides['about-p1'], size: 22, color: '374151' })]
        : [
            new TextRun({ text: 'Rayenna Energy Private Limited', bold: true, size: 22, color: navy }),
            new TextRun({ text: ' is a leading solar energy solutions provider based in Kochi, Kerala. We specialise in the design, supply, installation, and commissioning of On-Grid, Off-Grid, and Hybrid Solar Power Plants for residential, commercial, and industrial clients across India.', size: 22, color: '374151' }),
          ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: textOverrides?.['about-p2'] ?? 'Our team of experienced engineers and technicians ensures that every installation meets the highest standards of quality, safety, and performance. We are committed to delivering reliable, cost-effective solar solutions that provide long-term value to our customers.', size: 22, color: '374151' })],
      spacing: { after: 160 },
    }),
    // Key Highlights header row
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: '0369a1' },
              columnSpan: 2,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'KEY HIGHLIGHTS', bold: true, size: 18, color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
        // 3 rows × 2 cols of highlights
        ...Array.from({ length: 3 }, (_, r) =>
          new TableRow({
            children: [0, 1].map((c) => {
              const h = ABOUT_HIGHLIGHTS[r * 2 + c];
              return new TableCell({
                shading: { type: ShadingType.SOLID, color: 'F0F9FF' },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `${h.icon}  ${h.text}`, size: 20, color: '374151' })],
                  }),
                ],
              });
            }),
          })
        ),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 80 } }),
    heading('What We Offer'),
    // Intro text + image side-by-side (2-col borderless table)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            // Left: intro text
            new TableCell({
              width: { size: 58, type: WidthType.PERCENTAGE },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
              children: (textOverrides?.['what-we-offer-intro'] ?? WHAT_WE_OFFER_INTRO).split('\n\n').map((para) =>
                new Paragraph({
                  children: [new TextRun({ text: para, size: 22, color: '374151' })],
                  spacing: { after: 120 },
                })
              ),
            }),
            // Right: diagram image (if available)
            new TableCell({
              width: { size: 42, type: WidthType.PERCENTAGE },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: diagramImageData ? [
                    new ImageRun({
                      data: diagramImageData,
                      transformation: { width: 240, height: 160 },
                      type: 'jpg',
                    }),
                  ] : [new TextRun({ text: '[Solar System Diagram]', size: 20, color: '9CA3AF', italics: true })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 80 } }),
    // 3-service table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: OUR_SERVICES.map((s) => new TableCell({
            shading: { type: ShadingType.SOLID, color: 'E0F2FE' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${s.icon}  ${s.title.toUpperCase()}`, bold: true, size: 20, color: '0369a1' })],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: s.desc, size: 18, color: '374151' })],
              }),
            ],
          })),
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    heading('Financial Benefits & Savings'),
    ...(p.roi ? (() => {
      const r      = p.roi!;
      const sizeKw = r.inputs.systemSizeKw > 0 ? r.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
      return [
        // Hero statement paragraph
        new Paragraph({
          children: [
            new TextRun({ text: 'The proposed ', size: 22, color: '374151' }),
            new TextRun({ text: `${sizeKw} kW`, bold: true, size: 24, color: navy }),
            new TextRun({ text: ' On-Grid Solar Power Plant is projected to generate ', size: 22, color: '374151' }),
            new TextRun({ text: `${r.annualGeneration.toLocaleString('en-IN')} kWh`, bold: true, size: 22, color: '059669' }),
            new TextRun({ text: ' of clean electricity in Year 1, delivering annual savings of ', size: 22, color: '374151' }),
            new TextRun({ text: fmtINR(r.annualSavings), bold: true, size: 22, color: '059669' }),
            new TextRun({ text: '. Over 25 years, cumulative savings are estimated at ', size: 22, color: '374151' }),
            new TextRun({ text: fmtINR(r.totalSavings25Years), bold: true, size: 24, color: navy }),
            new TextRun({ text: ` — an ROI of `, size: 22, color: '374151' }),
            new TextRun({ text: `${r.roiPercent.toFixed(1)}%`, bold: true, size: 24, color: navy }),
            new TextRun({ text: '.', size: 22, color: '374151' }),
          ],
          spacing: { after: 160 },
        }),
        // 4-column highlight table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                { label: 'Year-1 Generation', value: `${r.annualGeneration.toLocaleString('en-IN')} kWh`, sub: `${r.inputs.generationFactor} kWh/kW/yr` },
                { label: 'Year-1 Savings',    value: fmtINR(r.annualSavings),                             sub: `@ ₹${r.inputs.tariff}/kWh` },
                { label: '25-Year Savings',   value: fmtINR(r.totalSavings25Years),                       sub: `${r.inputs.escalationPercent}% escalation` },
                { label: 'Payback Period',    value: `${r.paybackYears.toFixed(1)} years`,                sub: 'simple payback' },
              ].map(({ label, value, sub }) => new TableCell({
                shading: { type: ShadingType.SOLID, color: 'F0FDF4' },
                children: [
                  new Paragraph({ children: [new TextRun({ text: label, size: 16, color: '6B7280', bold: false })], spacing: { after: 20 } }),
                  new Paragraph({ children: [new TextRun({ text: value, size: 22, bold: true, color: navy })], spacing: { after: 20 } }),
                  new Paragraph({ children: [new TextRun({ text: sub, size: 14, color: '9CA3AF', italics: true })] }),
                ],
              })),
            }),
          ],
        }),
        new Paragraph({ text: '', spacing: { after: 120 } }),
        // LCOE paragraph — use DOM override if available
        new Paragraph({
          children: textOverrides?.['financial-p1']
            ? [new TextRun({ text: textOverrides['financial-p1'], size: 22, color: '374151' })]
            : [
                new TextRun({ text: 'Levelised Cost of Energy (LCOE): ', bold: true, size: 22, color: navy }),
                new TextRun({ text: `At ₹${r.lcoe.toFixed(4)}/kWh, this system generates electricity at a fraction of the current grid tariff of ₹${r.inputs.tariff}/kWh — locking in savings that grow every year as tariffs escalate at ${r.inputs.escalationPercent}% annually.`, size: 22, color: '374151' }),
              ],
          spacing: { after: 100 },
        }),
        // Tariff escalation paragraph — use DOM override if available
        ...(textOverrides?.['financial-p2'] ? [new Paragraph({
          children: [new TextRun({ text: textOverrides['financial-p2'], size: 22, color: '374151' })],
          spacing: { after: 100 },
        })] : []),
      ];
    })() : multilineParagraphs(textOverrides?.['financial-no-roi'] ?? savingsText(p))),
    new Paragraph({ text: '', spacing: { after: 80 } }),
    heading('Environmental Impact'),
    new Paragraph({
      children: [
        new TextRun({ text: 'By harnessing solar energy, ', size: 22, color: '374151' }),
        new TextRun({ text: p.customer.customerName || 'your organisation', bold: true, size: 22, color: '374151' }),
        new TextRun({ text: ' will make a meaningful contribution to environmental sustainability — reducing carbon emissions, conserving natural resources, and supporting India\'s clean energy goals.', size: 22, color: '374151' }),
      ],
      spacing: { after: 160 },
    }),
    // 4 bullet cards as a 2-col table
    ...(() => {
      const co2 = p.roi?.co2OffsetTons;
      const gen = p.roi?.annualGeneration;
      const name = p.customer.customerName || 'your organisation';
      const envBullets = [
        {
          icon: '🌍', title: 'Carbon Footprint Reduction', color: '16a34a', bg: 'F0FDF4',
          body: co2
            ? `Over 25 years, the proposed system will offset approximately ${co2.toFixed(1)} tonnes of CO₂ emissions — equivalent to planting thousands of trees and removing hundreds of cars from the road.`
            : 'The solar system will significantly reduce carbon emissions over its 25-year operational life, contributing to a cleaner, greener environment.',
        },
        {
          icon: '⚡', title: 'Clean Energy Generation', color: '1d4ed8', bg: 'EFF6FF',
          body: gen
            ? `Each year, the system will generate ${gen.toLocaleString('en-IN')} kWh of clean, renewable electricity — directly reducing dependence on fossil-fuel-based grid power.`
            : 'The system will generate clean, renewable electricity every year, directly offsetting grid consumption powered by fossil fuels.',
        },
        {
          icon: '🏛️', title: 'National Solar Mission Alignment', color: 'b45309', bg: 'FEFCE8',
          body: `This initiative aligns with India's National Solar Mission and demonstrates ${name}'s commitment to a sustainable future and responsible energy consumption.`,
        },
        {
          icon: '♻️', title: 'Long-Term Sustainability', color: '7c3aed', bg: 'F5F3FF',
          body: 'Rayenna Energy will ensure the system is designed and installed to maximise energy yield and environmental benefit throughout its 25-year operational life, with ongoing monitoring and support.',
        },
      ];
      // Render as 2 rows × 2 cols
      const rows = [];
      for (let r = 0; r < 2; r++) {
        rows.push(
          new TableRow({
            children: [0, 1].map((c) => {
              const b = envBullets[r * 2 + c];
              return new TableCell({
                shading: { type: ShadingType.SOLID, color: b.bg },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `${b.icon}  ${b.title}`, bold: true, size: 20, color: b.color })],
                    spacing: { after: 60 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: b.body, size: 19, color: '374151' })],
                  }),
                ],
              });
            }),
          })
        );
      }
      return [
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
        new Paragraph({ text: '', spacing: { after: 80 } }),
      ];
    })(),
    heading('Our Process for Seamless Solar Integration'),
    new Paragraph({
      children: [new TextRun({ text: OUR_PROCESS_INTRO, size: 22, color: '374151' })],
      spacing: { after: 160 },
    }),
    // 5-step process table (row of 5 cells)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: OUR_PROCESS_STEPS.map((step, idx) => {
            const bgColors = ['EFF6FF', 'E0F2FE', 'F0FDF4', 'FFFBEB', 'F5F3FF'];
            const fgColors = ['0369a1', '0891b2', '059669', 'd97706', '7c3aed'];
            return new TableCell({
              shading: { type: ShadingType.SOLID, color: bgColors[idx] },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${idx + 1}`, bold: true, size: 28, color: fgColors[idx] })],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: `${step.icon}  ${step.title.toUpperCase()}`, bold: true, size: 18, color: fgColors[idx] })],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: step.desc, size: 17, color: '374151' })],
                }),
              ],
            });
          }),
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    heading('Scope of Work'),
    new Paragraph({
      children: [new TextRun({ text: textOverrides?.['scope-intro'] ?? scopeText(p), size: 22, color: '374151' })],
      spacing: { after: 160 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Row 1: sections 0 & 1
        new TableRow({
          children: [0, 1].map((idx) => {
            const s = SCOPE_SECTIONS[idx];
            return new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: 'F8FAFC' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${s.icon}  ${s.title}`, bold: true, size: 22, color: navy })],
                  spacing: { after: 80 },
                }),
                ...s.items.map((item) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: '• ', bold: true, size: 20, color: navy }),
                      new TextRun({ text: item, size: 20, color: '374151' }),
                    ],
                    spacing: { after: 40 },
                    indent: { left: 180 },
                  }),
                ),
              ],
            });
          }),
        }),
        // Row 2: sections 2 & 3
        new TableRow({
          children: [2, 3].map((idx) => {
            const s = SCOPE_SECTIONS[idx];
            return new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: 'F8FAFC' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${s.icon}  ${s.title}`, bold: true, size: 22, color: navy })],
                  spacing: { after: 80 },
                }),
                ...s.items.map((item) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: '• ', bold: true, size: 20, color: navy }),
                      new TextRun({ text: item, size: 20, color: '374151' }),
                    ],
                    spacing: { after: 40 },
                    indent: { left: 180 },
                  }),
                ),
              ],
            });
          }),
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
    ...roiSection,
    ...bomSection,
    ...commercialsSection,
    heading('Client Scope'),
    ...(textOverrides?.['list-client-scope']
      ? textOverrides['list-client-scope'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : CLIENT_SCOPE.map((t, i) => listItem(t, i + 1))),
    heading('Terms & Conditions'),
    ...(textOverrides?.['list-terms-&-conditions']
      ? textOverrides['list-terms-&-conditions'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : TERMS_AND_CONDITIONS.map((t, i) => listItem(t, i + 1))),
    heading('Service Details'),
    ...(textOverrides?.['list-service-details']
      ? textOverrides['list-service-details'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : SERVICE_DETAILS.map((t, i) => listItem(t, i + 1))),
    heading('Payment Terms'),
    ...(textOverrides?.['list-payment-terms']
      ? textOverrides['list-payment-terms'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : PAYMENT_TERMS.map((t, i) => listItem(t, i + 1))),
    heading('Account Details'),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      rows: [
        ['Name',           'Rayenna Energy Private Limited'],
        ['Type',           'Current Account'],
        ['Bank',           'Axis Bank Limited'],
        ['Account Number', '924020063493172'],
        ['IFSC Code',      'UTIB0000827'],
      ].map(([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: navy })] })],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, color: '374151' })] })],
            }),
          ],
        }),
      ),
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    heading('Warranty'),
    ...(textOverrides?.['list-warranty']
      ? textOverrides['list-warranty'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : WARRANTY_TERMS.map((t, i) => listItem(t, i + 1))),
    heading('Material Delivery Period'),
    ...(textOverrides?.['list-material-delivery-period']
      ? textOverrides['list-material-delivery-period'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : DELIVERY_TERMS.map((t, i) => listItem(t, i + 1))),
    heading('Closing Note'),
    ...multilineParagraphs(textOverrides?.['section-closing-note'] ?? closingText(p)),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date(p.generatedAt).toLocaleString('en-IN')}  |  ${p.refNumber}`, size: 16, color: '9CA3AF', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 480 },
    }),
  ];

  return new Document({
    sections: [{ properties: {}, children: sections }],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
  });
}

/**
 * Walk the rendered proposal DOM and extract current text content from every
 * element that carries a data-docx-section attribute.
 *
 * For list sections (ListBlock), each data-docx-list-text span is collected
 * and joined with newlines so buildDocx can re-render them as list items.
 */
function extractTextOverrides(root: HTMLElement): TextOverrides {
  const overrides: TextOverrides = {};

  // Collect all elements tagged with data-docx-section
  const sections = root.querySelectorAll<HTMLElement>('[data-docx-section]');
  sections.forEach((el) => {
    const key = el.getAttribute('data-docx-section');
    if (!key) return;

    // Check if this section contains list items (ListBlock pattern)
    const listTexts = el.querySelectorAll<HTMLElement>('[data-docx-list-text]');
    if (listTexts.length > 0) {
      // Join each item's text with newline — buildDocx splits on '\n' to rebuild list
      overrides[key] = Array.from(listTexts)
        .map((span) => span.innerText.trim())
        .filter(Boolean)
        .join('\n');
    } else {
      // Plain text / paragraph section
      overrides[key] = el.innerText.trim();
    }
  });

  return overrides;
}

async function exportToDocx(p: ProposalData, bomComments?: Record<string, string>, textOverrides?: TextOverrides): Promise<void> {
  let diagramImageData: ArrayBuffer | undefined;
  let logoImageData: ArrayBuffer | undefined;
  try {
    const [diagResp, logoResp] = await Promise.all([
      fetch('/rayenna_proposal.jpg'),
      fetch('/rayenna_logo.jpg'),
    ]);
    if (diagResp.ok) diagramImageData = await diagResp.arrayBuffer();
    if (logoResp.ok) logoImageData    = await logoResp.arrayBuffer();
  } catch { /* image embedding optional */ }
  const doc = buildDocx(p, diagramImageData, bomComments, logoImageData, textOverrides);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rayenna_Proposal_${p.customer.customerName.replace(/\s+/g, '_')}_${p.refNumber.replace(/\//g, '-')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Divider() {
  return (
    <div className="my-8 flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, #e0e7ff, #c7d2fe40)' }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0d1b3a30' }} />
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, #e0e7ff, #c7d2fe40)' }} />
    </div>
  );
}

const SECTION_META: Record<string, { icon: string; accent: string }> = {
  'Executive Summary':          { icon: '📝', accent: '#0d1b3a' },
  'About Rayenna Energy':       { icon: '🏢', accent: '#0369a1' },
  'What We Offer':              { icon: '✨', accent: '#0891b2' },
  'Environmental Impact':       { icon: '🌱', accent: '#16a34a' },
  'Our Process':                { icon: '🔄', accent: '#7c3aed' },
  'Closing Note':               { icon: '🤝', accent: '#7c3aed' },
};

function SectionBlock({ title, content }: { title: string; content: string }) {
  const meta = SECTION_META[title] ?? { icon: '📌', accent: '#0d1b3a' };
  const sectionKey = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-1 rounded-full flex-shrink-0"
          style={{ background: meta.accent, height: '28px' }}
        />
        <span className="text-lg leading-none">{meta.icon}</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: meta.accent }}>
          {title}
        </h2>
      </div>
      <div data-docx-section={sectionKey} className="text-secondary-700 text-sm leading-relaxed whitespace-pre-line pl-7">{content}</div>
    </div>
  );
}

function ExecutiveSummaryBlock({ proposal }: { proposal: ProposalData }) {
  const accent = '#0d1b3a';
  const sz     = (proposal.roi?.inputs.systemSizeKw ?? 0) > 0
    ? proposal.roi!.inputs.systemSizeKw
    : (proposal.systemSizeKw || proposal.roiAutofill?.systemSizeKw || 0);
  const cost = proposal.roiAutofill?.grandTotal ?? proposal.roi?.inputs.projectCost ?? 0;
  const pb   = proposal.roi?.paybackYears;
  const sav  = proposal.roi?.totalSavings25Years;
  const name = proposal.customer.customerName || 'Valued Customer';
  const loc  = proposal.customer.location;

  const highlights = [
    ...(sz > 0        ? [{ icon: '☀️', label: 'System Capacity',     value: `${sz} kW On-Grid Solar PV` }] : []),
    ...(cost > 0      ? [{ icon: '💼', label: 'Project Investment',   value: fmtINR(cost) }] : []),
    ...(pb            ? [{ icon: '⏱️', label: 'Payback Period',       value: `~${pb.toFixed(1)} years` }] : []),
    ...(sav           ? [{ icon: '📈', label: '25-Year Savings',      value: fmtINR(sav) }] : []),
  ];

  return (
    <div className="mb-8">
      {/* Heading */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">📝</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          Executive Summary
        </h2>
      </div>

      {/* Greeting banner */}
      <div
        className="rounded-xl px-5 py-4 mb-5"
        style={{ background: 'linear-gradient(135deg, #0d1b3a 0%, #1e3a5f 100%)' }}
      >
        <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Prepared exclusively for</p>
        <p className="text-white text-lg font-extrabold leading-tight">{name}</p>
        {loc && <p className="text-white/60 text-xs mt-0.5">{loc}</p>}
      </div>

      {/* Body text */}
      <p data-docx-section="exec-summary-p1" className="text-sm text-secondary-700 leading-relaxed mb-4">
        Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the
        design, supply, installation, and commissioning of
        {sz > 0 ? <> a <span className="font-bold text-secondary-800">{sz} kW</span></> : ' an'} On-Grid
        Solar Photovoltaic Power Plant at your premises{loc ? <> in <span className="font-semibold text-secondary-800">{loc}</span></> : ''}.
      </p>
      <p data-docx-section="exec-summary-p2" className="text-sm text-secondary-700 leading-relaxed mb-5">
        This proposal has been prepared based on a detailed assessment of your energy requirements and
        site conditions. The proposed solar system will significantly reduce your electricity costs,
        provide energy independence, and contribute to a cleaner environment.
      </p>

      {/* Key metrics strip — only shown when data is available */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {highlights.map((h) => (
            <div
              key={h.label}
              className="rounded-xl border border-primary-100 bg-primary-50/40 px-3 py-3 flex items-start gap-2.5"
            >
              <span className="text-base flex-shrink-0 mt-0.5">{h.icon}</span>
              <div>
                <p className="text-[10px] text-secondary-400 font-medium uppercase tracking-wide leading-tight">{h.label}</p>
                <p className="text-sm font-extrabold text-secondary-800 tabular-nums leading-snug mt-0.5">{h.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AboutRayennaBlock() {
  const accent = '#0369a1';
  return (
    <div className="mb-8">
      {/* Heading */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">🏢</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          About Rayenna Energy
        </h2>
      </div>

      {/* Intro paragraphs */}
      <p data-docx-section="about-p1" className="text-sm text-secondary-700 leading-relaxed mb-2">
        <span className="font-bold text-secondary-800">Rayenna Energy Private Limited</span> is a leading
        solar energy solutions provider based in Kochi, Kerala. We specialise in the design, supply,
        installation, and commissioning of On-Grid, Off-Grid, and Hybrid Solar Power Plants for
        residential, commercial, and industrial clients across India.
      </p>
      <p data-docx-section="about-p2" className="text-sm text-secondary-700 leading-relaxed mb-5">
        Our team of experienced engineers and technicians ensures that every installation meets the
        highest standards of quality, safety, and performance. We are committed to delivering reliable,
        cost-effective solar solutions that provide long-term value to our customers.
      </p>

      {/* Key highlights — 2-col bullet cards */}
      <div className="rounded-xl border border-sky-100 overflow-hidden">
        <div
          className="px-4 py-2.5"
          style={{ background: 'linear-gradient(90deg, #0369a1 0%, #0891b2 100%)' }}
        >
          <p className="text-white text-xs font-extrabold uppercase tracking-widest">Key Highlights</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-sky-100 bg-sky-50/30">
          {ABOUT_HIGHLIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 border-b border-sky-100 last:border-b-0"
            >
              <span className="text-base flex-shrink-0 mt-0.5">{h.icon}</span>
              <p className="text-xs text-secondary-700 leading-relaxed">{h.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatWeOfferBlock() {
  const accent = '#0891b2';
  return (
    <div className="mb-8">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">✨</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          What We Offer
        </h2>
      </div>

      {/* Two-column: text + image */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Left: intro text */}
        <div className="flex-1 min-w-0">
          <p data-docx-section="what-we-offer-intro" className="text-sm text-secondary-700 leading-relaxed mb-4">
            {WHAT_WE_OFFER_INTRO.split('\n\n').map((para, i) => (
              <span key={i}>{i > 0 && <><br /><br /></>}{para}</span>
            ))}
          </p>
        </div>
        {/* Right: diagram image */}
        <div className="lg:w-[42%] flex-shrink-0 flex items-center justify-center">
          <img
            src="/rayenna_proposal.jpg"
            alt="Solar System Diagram"
            className="w-full h-auto"
            style={{ maxHeight: '220px', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* 3 service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {OUR_SERVICES.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ borderColor: '#a5f3fc', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <span className="text-sm font-extrabold uppercase tracking-wide" style={{ color: accent }}>{s.title}</span>
            </div>
            <p className="text-xs text-secondary-600 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OurProcessBlock() {
  const accent = '#7c3aed';
  const stepColors = ['#0369a1', '#0891b2', '#059669', '#d97706', '#7c3aed'];
  return (
    <div className="mb-8">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">🔄</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          Our Process for Seamless Solar Integration
        </h2>
      </div>

      <p data-docx-section="our-process-intro" className="text-sm text-secondary-700 leading-relaxed mb-5">{OUR_PROCESS_INTRO}</p>

      {/* Process steps — horizontal timeline-style on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row gap-3">
        {OUR_PROCESS_STEPS.map((step, idx) => (
          <div
            key={step.title}
            className="flex-1 rounded-xl border p-3.5 flex flex-col gap-1.5 relative"
            style={{ borderColor: `${stepColors[idx]}40`, background: `${stepColors[idx]}08` }}
          >
            {/* Step number badge */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-extrabold mb-1 flex-shrink-0"
              style={{ background: stepColors[idx] }}
            >
              {idx + 1}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{step.icon}</span>
              <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: stepColors[idx] }}>{step.title}</span>
            </div>
            <p className="text-xs text-secondary-600 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScopeOfWorkBlock({ proposal }: { proposal: ProposalData }) {
  const sz = (proposal.roi?.inputs.systemSizeKw ?? 0) > 0
    ? proposal.roi!.inputs.systemSizeKw
    : (proposal.systemSizeKw || proposal.roiAutofill?.systemSizeKw || 0);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0369a1', height: '28px' }} />
        <span className="text-lg leading-none">🔩</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0369a1' }}>Scope of Work</h2>
      </div>
      <p data-docx-section="scope-intro" className="text-sm text-secondary-500 mb-5 pl-7">
        The scope of work for the {sz > 0 ? `${sz} kW ` : ''}On-Grid Solar Power Plant covers four key areas:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SCOPE_SECTIONS.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border p-4"
            style={{ background: s.bg, borderColor: s.border }}
          >
            {/* Card header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{s.icon}</span>
              <h3 className="text-sm font-bold" style={{ color: s.accent }}>{s.title}</h3>
            </div>
            {/* Bullet list */}
            <ul className="space-y-1.5">
              {s.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-secondary-700">
                  <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.accent, marginTop: '5px' }} />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialBenefitsBlock({ proposal }: { proposal: ProposalData }) {
  const roi = proposal.roi;

  // KPI tile definitions
  const kpis = roi ? [
    { label: 'Annual Generation', value: `${roi.annualGeneration.toLocaleString('en-IN')} kWh`, icon: '⚡', accent: '#0369a1', bg: '#eff6ff' },
    { label: 'Year-1 Savings',    value: fmtINR(roi.annualSavings),                             icon: '💰', accent: '#059669', bg: '#f0fdf4' },
    { label: 'Payback Period',    value: `${roi.paybackYears.toFixed(1)} yrs`,                  icon: '📅', accent: '#d97706', bg: '#fffbeb' },
    { label: '25-Year Savings',   value: fmtINR(roi.totalSavings25Years),                       icon: '📈', accent: '#0d1b3a', bg: '#f0f4ff' },
    { label: 'ROI',               value: `${roi.roiPercent.toFixed(1)}%`,                       icon: '🎯', accent: '#b45309', bg: '#fefce8' },
    { label: 'CO₂ Offset',        value: `${roi.co2OffsetTons.toFixed(1)} T`,                   icon: '🌱', accent: '#16a34a', bg: '#f0fdf4' },
  ] : [];

  const rows = roi?.yearlyBreakdown ?? [];
  const maxCumulative = rows[rows.length - 1]?.cumulativeSavings ?? 1;
  const projectCost   = roi?.inputs.projectCost ?? 0;

  // SVG chart dimensions
  const W = 700, H = 180, padL = 52, padR = 12, padT = 12, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const barW  = rows.length > 0 ? Math.max(4, (plotW / rows.length) - 2) : 8;

  function barX(i: number) { return padL + i * (plotW / rows.length) + (plotW / rows.length - barW) / 2; }
  function barH(val: number) { return Math.max(2, (val / maxCumulative) * plotH); }

  // Guide lines at 25%, 50%, 75%, 100%
  const guides = [0.25, 0.5, 0.75, 1.0];

  function fmtCr(n: number) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
    return `₹${(n / 1000).toFixed(0)}K`;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#059669', height: '28px' }} />
        <span className="text-lg leading-none">📊</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#059669' }}>Financial Benefits &amp; Savings</h2>
      </div>

      {/* Narrative — rich formatted block */}
      {roi ? (() => {
        const sizeKw   = roi.inputs.systemSizeKw > 0 ? roi.inputs.systemSizeKw : (proposal.systemSizeKw || proposal.roiAutofill?.systemSizeKw || 0);
        const highlights = [
          { icon: '⚡', label: 'Year-1 Generation',  value: `${roi.annualGeneration.toLocaleString('en-IN')} kWh`,  sub: `at ${roi.inputs.generationFactor} kWh/kW/yr` },
          { icon: '💰', label: 'Year-1 Savings',      value: fmtINR(roi.annualSavings),                              sub: `@ ₹${roi.inputs.tariff}/kWh tariff` },
          { icon: '📈', label: '25-Year Savings',     value: fmtINR(roi.totalSavings25Years),                        sub: `${roi.inputs.escalationPercent}% annual escalation` },
          { icon: '⏱️', label: 'Payback Period',      value: `${roi.paybackYears.toFixed(1)} years`,                 sub: 'simple payback' },
        ];
        return (
          <div className="mb-6">
            {/* Hero statement */}
            <div
              className="rounded-xl px-5 py-4 mb-4"
              style={{ background: 'linear-gradient(135deg, #0d1b3a 0%, #1e3a5f 60%, #0f4c2a 100%)' }}
            >
              <p className="text-white text-sm font-light leading-relaxed">
                The proposed{' '}
                <span className="font-extrabold text-yellow-300 text-base">{sizeKw} kW</span>
                {' '}On-Grid Solar Power Plant is projected to generate{' '}
                <span className="font-bold text-emerald-300">{roi.annualGeneration.toLocaleString('en-IN')} kWh</span>
                {' '}of clean electricity in Year 1, delivering annual savings of{' '}
                <span className="font-bold text-emerald-300">{fmtINR(roi.annualSavings)}</span>.
                {' '}Over 25 years, cumulative savings are estimated at{' '}
                <span className="font-extrabold text-yellow-300 text-base">{fmtINR(roi.totalSavings25Years)}</span>
                {' '}— an ROI of{' '}
                <span className="font-extrabold text-yellow-300">{roi.roiPercent.toFixed(1)}%</span>.
              </p>
            </div>

            {/* 4 highlight stat pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {highlights.map((h) => (
                <div key={h.label} className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0 mt-0.5">{h.icon}</span>
                  <div>
                    <p className="text-xs text-secondary-500 font-medium leading-tight">{h.label}</p>
                    <p className="text-sm font-extrabold text-secondary-800 tabular-nums leading-snug">{h.value}</p>
                    <p className="text-[10px] text-secondary-400 leading-tight mt-0.5">{h.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Supporting paragraphs */}
            <div className="space-y-2.5 pl-1">
              <p data-docx-section="financial-p1" className="text-sm text-secondary-600 leading-relaxed">
                <span className="font-semibold text-secondary-800">Levelised Cost of Energy (LCOE):</span>{' '}
                At <span className="font-bold text-primary-700">₹{roi.lcoe.toFixed(4)}/kWh</span>, this system generates electricity
                at a fraction of the current grid tariff of ₹{roi.inputs.tariff}/kWh — locking in energy cost savings
                that grow every year as tariffs escalate.
              </p>
              <p data-docx-section="financial-p2" className="text-sm text-secondary-600 leading-relaxed">
                <span className="font-semibold text-secondary-800">Tariff escalation advantage:</span>{' '}
                With an assumed annual tariff escalation of{' '}
                <span className="font-bold text-primary-700">{roi.inputs.escalationPercent}%</span>,
                your savings increase every year — making solar an inflation-proof investment that delivers
                compounding returns over its 25-year operational life.
              </p>
            </div>
          </div>
        );
      })() : (
        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/40 px-5 py-4">
          <p data-docx-section="financial-no-roi" className="text-sm text-secondary-700 leading-relaxed">
            The proposed solar system will generate clean electricity from sunlight, directly offsetting
            your grid electricity consumption and reducing your monthly electricity bills substantially.
            With rising electricity tariffs in India (historically escalating at 5–7% per year), the
            financial benefits of solar energy grow significantly over the system's 25-year lifetime.
          </p>
        </div>
      )}

      {/* KPI tiles */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border p-3 text-center shadow-sm"
              style={{ background: k.bg, borderColor: `${k.accent}30` }}
            >
              <div className="text-xl mb-1">{k.icon}</div>
              <p className="text-sm font-extrabold tabular-nums leading-tight" style={{ color: k.accent }}>{k.value}</p>
              <p className="text-[10px] mt-1 font-medium" style={{ color: `${k.accent}99` }}>{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart + Table side-by-side */}
      {rows.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 mb-2">

          {/* ── Left: SVG bar chart ── */}
          <div className="lg:w-[58%] rounded-xl border border-primary-100 bg-white p-3 flex flex-col">
            <p className="text-[10px] font-semibold text-secondary-400 uppercase tracking-widest mb-2">
              25-Year Cumulative Savings
            </p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" style={{ minWidth: 260 }}>
              {guides.map((g) => {
                const y = padT + plotH - g * plotH;
                return (
                  <g key={g}>
                    <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3" />
                    <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{fmtCr(g * maxCumulative)}</text>
                  </g>
                );
              })}
              {projectCost > 0 && projectCost <= maxCumulative && (
                <line
                  x1={padL} y1={padT + plotH - (projectCost / maxCumulative) * plotH}
                  x2={W - padR} y2={padT + plotH - (projectCost / maxCumulative) * plotH}
                  stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3"
                />
              )}
              {rows.map((row, i) => {
                const bh = barH(row.cumulativeSavings);
                const by = padT + plotH - bh;
                return (
                  <rect key={i} x={barX(i)} y={by} width={barW} height={bh}
                    fill={row.paybackReached ? '#0d1b3a' : '#eab308'} rx="1" opacity="0.85" />
                );
              })}
              {rows.filter((r) => r.year % 5 === 0).map((row) => (
                <text key={row.year} x={barX(row.year - 1) + barW / 2} y={H - 6}
                  textAnchor="middle" fontSize="9" fill="#6b7280">Yr {row.year}</text>
              ))}
              {/* Legend */}
              <rect x={padL} y={padT} width={8} height={7} fill="#eab308" rx="1" />
              <text x={padL + 11} y={padT + 6} fontSize="8" fill="#6b7280">Pre-payback</text>
              <rect x={padL + 72} y={padT} width={8} height={7} fill="#0d1b3a" rx="1" />
              <text x={padL + 83} y={padT + 6} fontSize="8" fill="#6b7280">Post-payback</text>
              {projectCost > 0 && projectCost <= maxCumulative && (
                <>
                  <line x1={padL + 155} y1={padT + 3} x2={padL + 168} y2={padT + 3} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" />
                  <text x={padL + 171} y={padT + 6} fontSize="8" fill="#ef4444">Payback line</text>
                </>
              )}
            </svg>
          </div>

          {/* ── Right: compact table ── */}
          <div className="lg:w-[42%] rounded-xl border border-primary-100 overflow-hidden flex flex-col">
            {/* Table header */}
            <div className="px-3 py-2 flex-shrink-0" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
              <p className="text-[10px] font-semibold text-white uppercase tracking-widest">Savings Breakdown</p>
            </div>
            <table className="w-full text-[11px] border-collapse flex-1">
              <thead>
                <tr className="bg-primary-50/80 border-b border-primary-200">
                  <th className="px-2 py-1.5 text-left font-semibold text-secondary-400 uppercase tracking-wide w-8">Yr</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-secondary-400 uppercase tracking-wide">Annual</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-secondary-400 uppercase tracking-wide">Cumulative</th>
                  <th className="px-2 py-1.5 w-6" />
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const renderRow = (row: YearlyRow) => (
                    <tr key={row.year} className="border-b border-primary-100/40"
                      style={{ background: row.paybackReached ? '#f0fdf4' : undefined }}>
                      <td className="px-2 py-1 font-bold text-secondary-500">{row.year}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-emerald-700 font-medium">{fmtCr(row.savings)}</td>
                      <td className="px-2 py-1 text-right tabular-nums font-bold" style={{ color: '#0d1b3a' }}>{fmtCr(row.cumulativeSavings)}</td>
                      <td className="px-1 py-1 text-center">
                        {row.paybackReached
                          ? <span className="text-[8px] font-bold text-emerald-600">✓</span>
                          : <span className="text-[8px] text-yellow-500">↑</span>}
                      </td>
                    </tr>
                  );
                  return (
                    <>
                      {rows.slice(0, 6).map(renderRow)}
                      {rows.length > 8 && (
                        <tr className="border-b border-primary-100/30 bg-secondary-50/30">
                          <td colSpan={4} className="px-2 py-0.5 text-center text-secondary-300 text-[10px] tracking-[0.25em] select-none">
                            · · · · · · · · · · · · · · · ·
                          </td>
                        </tr>
                      )}
                      {rows.slice(-2).map(renderRow)}
                    </>
                  );
                })()}
              </tbody>
              <tfoot>
                <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848)' }}>
                  <td className="px-2 py-1.5 text-[10px] font-bold text-white uppercase tracking-wide" colSpan={2}>25-yr Total</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-[11px] font-extrabold text-yellow-300">
                    {fmtCr(rows[rows.length - 1]?.cumulativeSavings ?? 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}

// Per-category accent colours for the BOM grouped view
const BOM_CAT_ACCENTS: Record<Category, { bg: string; border: string; badge: string; text: string; headerBg: string }> = {
  'pv-modules':         { bg: '#f0f9ff', border: '#bae6fd', badge: '#0369a1', text: '#0c4a6e', headerBg: '#e0f2fe' },
  'inverters':          { bg: '#fefce8', border: '#fde68a', badge: '#b45309', text: '#78350f', headerBg: '#fef9c3' },
  'mounting-structure': { bg: '#f8fafc', border: '#cbd5e1', badge: '#475569', text: '#1e293b', headerBg: '#f1f5f9' },
  'dc-db':              { bg: '#fff7ed', border: '#fed7aa', badge: '#c2410c', text: '#7c2d12', headerBg: '#ffedd5' },
  'ac-db':              { bg: '#fef2f2', border: '#fecaca', badge: '#b91c1c', text: '#7f1d1d', headerBg: '#fee2e2' },
  'dc-cable':           { bg: '#fffbeb', border: '#fcd34d', badge: '#d97706', text: '#78350f', headerBg: '#fef3c7' },
  'ac-cable':           { bg: '#f7fee7', border: '#bbf7d0', badge: '#16a34a', text: '#14532d', headerBg: '#dcfce7' },
  'earthing':           { bg: '#f0fdf4', border: '#6ee7b7', badge: '#059669', text: '#064e3b', headerBg: '#d1fae5' },
  'meter':              { bg: '#faf5ff', border: '#ddd6fe', badge: '#7c3aed', text: '#4c1d95', headerBg: '#ede9fe' },
  'installation':       { bg: '#eff6ff', border: '#bfdbfe', badge: '#1d4ed8', text: '#1e3a8a', headerBg: '#dbeafe' },
  'others':             { bg: '#f9fafb', border: '#e5e7eb', badge: '#4b5563', text: '#111827', headerBg: '#f3f4f6' },
};

const BOM_CAT_ICONS: Record<Category, string> = {
  'pv-modules':         '☀️',
  'inverters':          '⚡',
  'mounting-structure': '🔩',
  'dc-db':              '🟧',
  'ac-db':              '🟥',
  'dc-cable':           '🟡',
  'ac-cable':           '🟢',
  'earthing':           '🌱',
  'meter':              '🔮',
  'installation':       '🔧',
  'others':             '📦',
};

function BOMGroupedTable({ items, comments, onCommentsChange }: {
  items: BomRowGenerated[];
  comments: Record<string, string>;
  onCommentsChange: (c: Record<string, string>) => void;
}) {
  const [collapsed, setCollapsed]       = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  if (!items.length) return null;

  // Group items by category, preserving CATEGORIES order
  const grouped: { cat: Category; label: string; rows: BomRowGenerated[] }[] = CATEGORIES
    .map(({ value, label }) => ({ cat: value, label, rows: items.filter((r) => r.category === value) }))
    .filter((g) => g.rows.length > 0);

  const toggleAll = () => {
    const next = !allCollapsed;
    setAllCollapsed(next);
    const map: Record<string, boolean> = {};
    grouped.forEach((g) => { map[g.cat] = next; });
    setCollapsed(map);
  };

  let serial = 0;

  return (
    <div className="mb-8">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#b45309', height: '28px' }} />
        <span className="text-lg leading-none">📦</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#b45309' }}>Bill of Quantities</h2>
      </div>

      {/* Collapse-all toggle + summary */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-secondary-400">
          {grouped.length} categories · {items.length} items
        </p>
        <button
          onClick={toggleAll}
          className="print-hide flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: '#b45309', color: '#b45309', background: '#fff7ed' }}
        >
          {allCollapsed ? '▶ Expand All' : '▼ Collapse All'}
        </button>
      </div>

      {/* Column header */}
      <div className="overflow-x-auto rounded-xl border border-secondary-200 shadow-sm">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <thead>
            <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #b45309)' }}>
              <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase tracking-wide w-8">#</th>
              <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase tracking-wide">Item</th>
              <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase tracking-wide">Specification</th>
              <th className="px-3 py-2.5 text-right text-xs text-white font-semibold uppercase tracking-wide w-16">Qty</th>
              <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase tracking-wide w-28">Brand</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ cat, label, rows }) => {
              const a       = BOM_CAT_ACCENTS[cat];
              const icon    = BOM_CAT_ICONS[cat];
              const isOpen  = !collapsed[cat];
              const comment = comments[cat] ?? '';
              return (
                <>
                  {/* Category header row */}
                  <tr
                    key={`hdr-${cat}`}
                    className="cursor-pointer select-none"
                    style={{ background: a.headerBg, borderTop: `2px solid ${a.border}` }}
                    onClick={() => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }))}
                  >
                    <td colSpan={5} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0"
                            style={{ background: a.badge }}
                          >
                            {isOpen ? '▼' : '▶'}
                          </span>
                          <span className="text-sm">{icon}</span>
                          <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: a.text }}>{label}</span>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: a.badge, color: '#fff' }}
                        >
                          {rows.length} item{rows.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Item rows */}
                  {isOpen && rows.map((item, ri) => {
                    serial++;
                    return (
                      <tr
                        key={`${cat}-${ri}`}
                        className="border-b transition-colors"
                        style={{ borderColor: a.border, background: ri % 2 === 0 ? '#ffffff' : a.bg }}
                      >
                        <td className="px-3 py-2.5 text-secondary-400 text-xs tabular-nums">{serial}</td>
                        <td className="px-3 py-2.5 text-secondary-800 font-semibold text-xs">{item.itemName}</td>
                        <td className="px-3 py-2.5 text-secondary-500 text-xs">{item.specification || '—'}</td>
                        <td className="px-3 py-2.5 text-secondary-800 text-right tabular-nums font-medium text-xs">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-secondary-600 text-xs">{item.brand || '—'}</td>
                      </tr>
                    );
                  })}

                  {/* Comment row — always visible, hidden in print if empty */}
                  {isOpen && (
                    <tr
                      key={`cmt-${cat}`}
                      className={!comment ? 'print-hide' : ''}
                      style={{ background: a.bg, borderBottom: `2px solid ${a.border}` }}
                    >
                      <td colSpan={5} className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold mt-0.5 flex-shrink-0" style={{ color: a.badge }}>📝 Note:</span>
                          <textarea
                            value={comment}
                            onChange={(e) => onCommentsChange({ ...comments, [cat]: e.target.value })}
                            placeholder={`Add a note for ${label}…`}
                            rows={1}
                            className="print-hide flex-1 text-xs border rounded-lg px-2 py-1 resize-none focus:outline-none focus:ring-1 bg-white/70"
                            style={{ borderColor: a.border, color: a.text, minHeight: '28px' }}
                            onInput={(e) => {
                              const t = e.currentTarget;
                              t.style.height = 'auto';
                              t.style.height = `${t.scrollHeight}px`;
                            }}
                          />
                          {comment && (
                            <p className="hidden print:block text-xs italic flex-1" style={{ color: a.text }}>{comment}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommercialsBlock({ sheet, roi, roiAutofill }: { sheet: SavedSheet | null; roi: ROIResult | null; roiAutofill: RoiAutofill | null }) {
  // grandTotal already includes base cost + item-level GST + margin
  const grandTotal = roiAutofill?.grandTotal ?? roi?.inputs.projectCost ?? sheet?.grandTotal ?? 0;
  if (!grandTotal) return null;

  // Present as: Equipment & Installation (lump sum) + 18% GST on that = Total
  const gstRate    = 18;
  // Back-calculate the pre-GST value: grandTotal = base × (1 + 0.18)  →  base = grandTotal / 1.18
  const preGst     = Math.round(grandTotal / 1.18);
  const gstAmount  = Math.round(grandTotal - preGst);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#059669', height: '28px' }} />
        <span className="text-lg leading-none">💰</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#059669' }}>Commercials</h2>
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto shadow-sm" style={{ borderColor: '#a7f3d0' }}>
        <table className="w-full text-sm min-w-[340px]">
          <tbody>
            <tr className="border-b border-primary-100">
              <td className="px-5 py-3 text-secondary-600">
                Design, Supply, Installation &amp; Commissioning of{' '}
                {(roiAutofill?.systemSizeKw ?? sheet?.systemSizeKw ?? 0) > 0
                  ? <span className="font-semibold text-secondary-800">{roiAutofill?.systemSizeKw ?? sheet?.systemSizeKw} kW</span>
                  : 'the'}{' '}
                On-Grid Solar Power Plant including all electrical and structural work
              </td>
              <td className="px-5 py-3 text-right text-secondary-800 font-semibold tabular-nums w-44">
                {fmtINR(preGst)}
              </td>
            </tr>
            <tr className="border-b border-primary-100 bg-blue-50/40">
              <td className="px-5 py-3 text-blue-700">GST @ {gstRate}%</td>
              <td className="px-5 py-3 text-right text-blue-700 font-semibold tabular-nums">
                {fmtINR(gstAmount)}
              </td>
            </tr>
            <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
              <td className="px-5 py-3 text-white font-bold uppercase tracking-wide text-xs drop-shadow">
                Total Project Cost (incl. GST)
              </td>
              <td className="px-5 py-3 text-right text-white font-extrabold text-base tabular-nums drop-shadow">
                {fmtINR(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const LIST_META: Record<string, { icon: string; accent: string; bg: string; border: string }> = {
  'Client Scope':           { icon: '🏗️',  accent: '#0369a1', bg: '#eff6ff',  border: '#bfdbfe' },
  'Terms & Conditions':     { icon: '📜',  accent: '#0d1b3a', bg: '#f0f4ff',  border: '#c7d2fe' },
  'Service Details':        { icon: '🛠️',  accent: '#059669', bg: '#f0fdf4',  border: '#a7f3d0' },
  'Payment Terms':          { icon: '💳',  accent: '#b45309', bg: '#fffbeb',  border: '#fde68a' },
  'Warranty':               { icon: '🛡️',  accent: '#7c3aed', bg: '#faf5ff',  border: '#ddd6fe' },
  'Material Delivery Period':{ icon: '🚚', accent: '#0891b2', bg: '#ecfeff',  border: '#a5f3fc' },
};

function ListBlock({ title, items }: { title: string; items: string[] }) {
  const meta = LIST_META[title] ?? { icon: '📌', accent: '#0d1b3a', bg: '#f8fafc', border: '#e2e8f0' };
  const sectionKey = `list-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: meta.accent, height: '28px' }} />
        <span className="text-lg leading-none">{meta.icon}</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: meta.accent }}>{title}</h2>
      </div>
      {/* Items */}
      <div
        data-docx-section={sectionKey}
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: meta.border, background: meta.bg }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            data-docx-list-item={i}
            className="flex items-start gap-3 px-4 py-2.5 text-sm text-secondary-700 border-b last:border-b-0"
            style={{ borderColor: `${meta.border}80` }}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white mt-0.5"
              style={{ background: meta.accent }}
            >
              {i + 1}
            </span>
            <span data-docx-list-text className="leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountDetailsBlock() {
  const rows = [
    { label: 'Name',           value: 'Rayenna Energy Private Limited' },
    { label: 'Type',           value: 'Current Account'                },
    { label: 'Bank',           value: 'Axis Bank Limited'              },
    { label: 'Account Number', value: '924020063493172'                },
    { label: 'IFSC Code',      value: 'UTIB0000827'                    },
  ];
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0d1b3a', height: '28px' }} />
        <span className="text-lg leading-none">🏦</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0d1b3a' }}>Account Details</h2>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#c7d2fe', background: '#f0f4ff' }}>
        {rows.map(({ label, value }, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-2.5 text-sm border-b last:border-b-0"
            style={{ borderColor: '#c7d2fe60', background: i % 2 === 0 ? '#e0e7ff40' : 'white' }}
          >
            <span className="w-36 flex-shrink-0 text-secondary-500 font-medium text-xs uppercase tracking-wide">{label}</span>
            <span className="font-bold tabular-nums" style={{ color: '#0d1b3a' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer details form
// ─────────────────────────────────────────────

function CustomerForm({ onGenerate }: { onGenerate: (c: CustomerDetails) => void }) {
  // Pre-fill from active customer if available
  const activeCustomer = getActiveCustomer();
  const ac = activeCustomer?.master;

  const [customerName,   setCustomerName]   = useState(ac?.name          ?? '');
  const [location,       setLocation]       = useState(ac?.location       ?? '');
  const [contactPerson,  setContactPerson]  = useState(ac?.contactPerson  ?? '');
  const [phone,          setPhone]          = useState(ac?.phone          ?? '');
  const [email,          setEmail]          = useState(ac?.email          ?? '');
  const [err,            setErr]            = useState('');

  const sheet      = getLatestSheet();
  const bom        = getBom();
  const roi: ROIResult | null = readStorage(ROI_STORAGE_KEY);

  const hasSheet = !!sheet;
  const hasBom   = bom.length > 0;
  const hasRoi   = !!roi;

  const handleSubmit = () => {
    if (!customerName.trim()) { setErr('Customer name is required.'); return; }
    setErr('');
    onGenerate({ customerName: customerName.trim(), location: location.trim(), contactPerson: contactPerson.trim(), phone: phone.trim(), email: email.trim() });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Active customer banner */}
      {activeCustomer ? (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-sky-700">
            <span className="font-semibold">Active customer:</span> {activeCustomer.master.name}
            {' · '}Generating proposal will save all 4 artifacts to this customer record.
          </p>
          <Link to={`/customers/${activeCustomer.id}`} className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap transition-colors">
            View workspace →
          </Link>
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-amber-700">No active customer. Proposal will be generated but not saved to a customer record.</p>
          <Link to="/customers" className="text-xs text-amber-700 hover:text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap">
            Select Customer →
          </Link>
        </div>
      )}

      {/* Data status */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Costing Sheet', ok: hasSheet, detail: sheet ? sheet.name : 'Not saved yet' },
          { label: 'BOM',           ok: hasBom,   detail: hasBom ? `${bom.length} items` : 'Not generated yet' },
          { label: 'ROI Result',    ok: hasRoi,   detail: hasRoi ? `Payback ${roi!.paybackYears.toFixed(1)} yrs` : 'Not calculated yet' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.ok ? 'border-emerald-200 bg-emerald-50' : 'border-secondary-200 bg-secondary-50'}`}>
            <p className="text-lg mb-1">{s.ok ? '✓' : '○'}</p>
            <p className={`text-xs font-semibold ${s.ok ? 'text-emerald-700' : 'text-secondary-500'}`}>{s.label}</p>
            <p className="text-[10px] text-secondary-400 mt-0.5 truncate">{s.detail}</p>
          </div>
        ))}
      </div>

      {!hasSheet && !hasBom && !hasRoi && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          <p className="font-semibold">No data found</p>
          <p className="text-xs mt-1">Please complete the Costing Sheet, BOM, and ROI Calculator first, then return here to generate the proposal.</p>
        </div>
      )}

      {/* Customer details */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 space-y-4">
        <h3 className="text-xs font-bold text-secondary-600 uppercase tracking-widest mb-4">Customer Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Customer / Company Name <span className="text-red-400">*</span>
            </label>
            <input
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); setErr(''); }}
              placeholder="e.g. Sharma Industries Pvt Ltd"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
            {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Location / Site Address</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ernakulam, Kerala"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Contact Person</label>
            <input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Mr. Rajesh Sharma"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rajesh@company.com"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
          >
            <span className="text-base">✦</span>
            Generate Proposal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

// localStorage key for persisting the edited proposal HTML between sessions
const PROPOSAL_HTML_KEY = 'rayenna_proposal_edited_html_v1';

export default function ProposalPreview() {
  const [proposal, setProposal]               = useState<ProposalData | null>(null);
  const [exporting, setExporting]             = useState<'pdf' | 'docx' | null>(null);
  const [savedToCustomer, setSavedToCustomer] = useState<string | null>(null);
  const [bomComments, setBomComments]         = useState<Record<string, string>>({});
  const [isEditing, setIsEditing]             = useState(false);
  const [saveStatus, setSaveStatus]           = useState<'idle' | 'saving' | 'saved'>('idle');
  const printRef                              = useRef<HTMLDivElement>(null);
  // Ref to the contentEditable document body div so we can read its innerHTML on save
  const docBodyRef                            = useRef<HTMLDivElement>(null);

  // ── Restore saved inline edits when a proposal is (re)generated ──
  // We use a useEffect so the DOM is fully rendered before we inject HTML.
  // Priority: customer record editedHtml > localStorage fallback.
  useEffect(() => {
    if (!proposal || !docBodyRef.current) return;
    const activeCustomer = getActiveCustomer();
    const savedHtml =
      activeCustomer?.proposal?.editedHtml
      ?? localStorage.getItem(PROPOSAL_HTML_KEY)
      ?? null;
    if (savedHtml) {
      docBodyRef.current.innerHTML = savedHtml;
    }
  }, [proposal]);

  // ── Save comments to active customer record ──
  const persistComments = (comments: Record<string, string>) => {
    // Always persist to localStorage as fallback
    localStorage.setItem(BOM_COMMENTS_KEY, JSON.stringify(comments));
    // Also persist into the customer record if one is active
    const ac = getActiveCustomer();
    if (ac && ac.proposal) {
      saveAllArtifacts(ac.id, null, null, null, {
        ...ac.proposal,
        bomComments: comments,
      });
    }
  };

  // ── Unified save: comments + inline edits + textOverrides + all 4 artifacts ──
  const handleSave = () => {
    if (!proposal) return;
    setSaveStatus('saving');

    // 1. Capture current edited HTML and extract per-section text overrides
    const editedHtml     = docBodyRef.current?.innerHTML ?? undefined;
    const textOverrides  = docBodyRef.current ? extractTextOverrides(docBodyRef.current) : undefined;

    // 2. Persist edited HTML to localStorage as a fast fallback
    if (editedHtml) {
      localStorage.setItem(PROPOSAL_HTML_KEY, editedHtml);
    }

    // 3. Persist BOM comments
    persistComments(bomComments);

    // 4. Save all 4 artifacts + editedHtml + textOverrides to active customer record
    const activeCustomer = getActiveCustomer();
    if (activeCustomer) {
      const sheet = proposal.sheet;
      const bom   = proposal.bom;
      const roi: ROIResult | null = readStorage(ROI_STORAGE_KEY);
      const now   = new Date().toISOString();

      const costingArtifact: CostingArtifact | null = sheet ? {
        sheetName:     sheet.name,
        savedAt:       sheet.savedAt,
        items:         sheet.items,
        showGst:       sheet.showGst,
        marginPercent: sheet.marginPercent,
        grandTotal:    sheet.grandTotal,
        systemSizeKw:  sheet.systemSizeKw,
      } : null;

      const bomArtifact: BomArtifact | null = bom.length > 0 ? { savedAt: now, rows: bom } : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roiArtifact: RoiArtifact | null = roi ? { savedAt: now, result: roi as any } : null;

      const proposalArtifact: ProposalArtifact = {
        refNumber:   proposal.refNumber,
        generatedAt: proposal.generatedAt,
        summary:     execSummary(proposal).slice(0, 200),
        bomComments,
        editedHtml,
        textOverrides,
      };

      saveAllArtifacts(activeCustomer.id, costingArtifact, bomArtifact, roiArtifact, proposalArtifact);
      setSavedToCustomer(activeCustomer.master.name);
    }

    // 5. Exit edit mode
    setIsEditing(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleGenerate = (customer: CustomerDetails) => {
    const sheet         = getLatestSheet();
    const bom           = getBom();
    const roi: ROIResult | null           = readStorage(ROI_STORAGE_KEY);
    const roiAutofill: RoiAutofill | null = readStorage(ROI_AUTOFILL_KEY);
    const p = buildProposal(customer, sheet, bom, roi, roiAutofill);
    setProposal(p);

    // ── Restore saved comments + editedHtml: prefer customer record, fall back to localStorage ──
    const activeCustomer = getActiveCustomer();
    const savedComments: Record<string, string> =
      activeCustomer?.proposal?.bomComments
      ?? readStorage<Record<string, string>>(BOM_COMMENTS_KEY)
      ?? {};
    setBomComments(savedComments);

    // ── Persist all 4 artifacts to active customer, preserving any previously saved editedHtml ──
    if (activeCustomer) {
      const now = new Date().toISOString();

      const costingArtifact: CostingArtifact | null = sheet ? {
        sheetName:     sheet.name,
        savedAt:       sheet.savedAt,
        items:         sheet.items,
        showGst:       sheet.showGst,
        marginPercent: sheet.marginPercent,
        grandTotal:    sheet.grandTotal,
        systemSizeKw:  sheet.systemSizeKw,
      } : null;

      const bomArtifact: BomArtifact | null = bom.length > 0 ? {
        savedAt: now,
        rows:    bom,
      } : null;

      // roi from localStorage includes yearlyBreakdown at runtime even though
      // the local ProposalPreview type omits it; cast to satisfy customerStore type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roiArtifact: RoiArtifact | null = roi ? { savedAt: now, result: roi as any } : null;

      const proposalArtifact: ProposalArtifact = {
        refNumber:   p.refNumber,
        generatedAt: p.generatedAt,
        summary:     execSummary(p).slice(0, 200),
        bomComments: savedComments,
        // Preserve any previously saved inline edits and text overrides — do NOT overwrite with undefined
        editedHtml:    activeCustomer.proposal?.editedHtml,
        textOverrides: activeCustomer.proposal?.textOverrides,
      };

      saveAllArtifacts(activeCustomer.id, costingArtifact, bomArtifact, roiArtifact, proposalArtifact);
      setSavedToCustomer(activeCustomer.master.name);
    }
  };

  const handleRegenerate = () => {
    setProposal(null);
    setSavedToCustomer(null);
    setBomComments({});
    setIsEditing(false);
    setSaveStatus('idle');
  };

  const handleExportPdf = () => {
    if (!proposal) return;
    exportToPdf('proposal-print-root');
  };

  const handleExportDocx = async () => {
    if (!proposal) return;
    setExporting('docx');
    try {
      // Prefer live DOM overrides (captures any unsaved edits too);
      // fall back to last-saved overrides from the customer record.
      const liveOverrides = docBodyRef.current
        ? extractTextOverrides(docBodyRef.current)
        : undefined;
      const savedOverrides = getActiveCustomer()?.proposal?.textOverrides;
      const textOverrides = (liveOverrides && Object.keys(liveOverrides).length > 0)
        ? liveOverrides
        : savedOverrides;
      await exportToDocx(proposal, bomComments, textOverrides);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <div className="print-hide bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">📄</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">Proposal Generator</h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  {proposal ? `Ref: ${proposal.refNumber}` : 'Generate a full proposal from your Costing Sheet, BOM & ROI data'}
                </p>
              </div>
            </div>
            {proposal && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto flex-shrink-0">
                {/* Edit toggle */}
                <button
                  onClick={() => setIsEditing((e) => !e)}
                  title={isEditing ? 'Exit edit mode' : 'Edit proposal'}
                  className={`flex items-center justify-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg transition-all min-h-[36px] ${
                    isEditing
                      ? 'bg-amber-400 border-amber-300 text-gray-900 hover:bg-amber-300'
                      : 'bg-white/20 hover:bg-white/30 border-white/40 text-white'
                  }`}
                >
                  {isEditing ? '✏️ Editing…' : '✏️ Edit'}
                </button>
                {/* Export buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={!!exporting}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-60 min-h-[36px]"
                  >
                    {exporting === 'pdf'
                      ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : '⬇'}
                    PDF
                  </button>
                  <button
                    onClick={handleExportDocx}
                    disabled={!!exporting}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-60 min-h-[36px]"
                  >
                    {exporting === 'docx'
                      ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : '⬇'}
                    DOCX
                  </button>
                </div>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px]"
                >
                  ← New Proposal
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {!proposal ? (
            <CustomerForm onGenerate={handleGenerate} />
          ) : (
            <div
              ref={printRef}
              id="proposal-print-root"
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                isEditing
                  ? 'border-amber-300 ring-2 ring-amber-200'
                  : 'border-primary-100'
              }`}
            >
              {/* Edit mode banner */}
              {isEditing && (
                <div className="print-hide bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-amber-800 text-xs font-medium">
                  <span>✏️</span>
                  <span>Edit mode — click on any text in the proposal to edit it directly. Click <strong>Save</strong> at the bottom when done.</span>
                </div>
              )}
              {/* Letterhead */}
              <div className="px-4 sm:px-8 py-6 sm:py-8" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
                {/* Top bar: logo left, ref/date right */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-5 border-b border-white/20">
                  {/* Logo + company name */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-white rounded-xl p-1.5 shadow-lg">
                      <img
                        src="/rayenna_logo.jpg"
                        alt="Rayenna Energy"
                        className="h-14 w-auto object-contain"
                        style={{ maxWidth: '120px' }}
                      />
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-base sm:text-lg tracking-tight drop-shadow leading-tight">Rayenna Energy Private Limited</p>
                      <p className="text-white/75 text-xs leading-relaxed mt-0.5">Door No 3324/52, Ray Bhavan, NH Bypass, Thykoodam, Kochi - 682019</p>
                      <p className="text-white/60 text-[10px] leading-relaxed mt-0.5">
                        Tel: +91 7907 369 304 · sales@rayenna.energy · www.rayennaenergy.com · GST: 32AANCR8677A1Z6
                      </p>
                    </div>
                  </div>
                  {/* Ref + Date */}
                  <div className="sm:text-right flex-shrink-0">
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mb-0.5">Reference</p>
                    <p className="text-white font-mono text-sm font-semibold">{proposal.refNumber}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mt-2 mb-0.5">Date</p>
                    <p className="text-white text-sm font-medium">
                      {new Date(proposal.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                {/* To: block */}
                </div>{/* end flex row */}

                {(proposal.customer.customerName || proposal.customer.contactPerson) && (
                  <div className="mt-5 pt-4 border-t border-white/20">
                    <p className="text-xs text-white/60 uppercase tracking-widest mb-1">To</p>
                    <p className="text-white font-bold text-base">{proposal.customer.customerName}</p>
                    {proposal.customer.contactPerson && <p className="text-white/80 text-sm">Attn: {proposal.customer.contactPerson}</p>}
                    {proposal.customer.location && <p className="text-white/70 text-xs mt-0.5">{proposal.customer.location}</p>}
                    {proposal.customer.phone && <p className="text-white/70 text-xs">📞 {proposal.customer.phone}</p>}
                    {proposal.customer.email && <p className="text-white/70 text-xs">✉ {proposal.customer.email}</p>}
                  </div>
                )}

                <div className="mt-5 pt-5 border-t border-white/20">
                  <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Proposal For</p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                    {proposal.systemSizeKw > 0 ? `${proposal.systemSizeKw} kW ` : ''}On-Grid Solar Power Plant
                  </h2>
                  {proposal.customer.location && (
                    <p className="text-white/80 mt-1 text-sm">{proposal.customer.location}</p>
                  )}
                </div>
              </div>

              {/* Document body — ref used to read/restore edited HTML */}
              <div
                ref={docBodyRef}
                className="px-4 sm:px-8 py-6 sm:py-8"
                contentEditable={isEditing}
                suppressContentEditableWarning
                spellCheck={isEditing}
                style={isEditing ? { outline: 'none', cursor: 'text' } : undefined}
              >
                {/* Saved-to-customer confirmation */}
                {savedToCustomer && (
                  <div className="print-hide mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-emerald-700">
                      <strong>✓ All 4 artifacts saved</strong> under <strong>{savedToCustomer}</strong> — Costing Sheet, BOM, ROI &amp; Proposal are now in the customer record.
                    </p>
                    {(() => {
                      const ac = getActiveCustomer();
                      return ac ? (
                        <Link to={`/customers/${ac.id}`} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold border border-emerald-300 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap">
                          View Customer →
                        </Link>
                      ) : null;
                    })()}
                  </div>
                )}

                <Divider />
                <ExecutiveSummaryBlock proposal={proposal} />
                <Divider />
                <AboutRayennaBlock />
                <Divider />
                <WhatWeOfferBlock />
                <Divider />
                <FinancialBenefitsBlock proposal={proposal} />
                <Divider />
                <EnvironmentalImpactBlock proposal={proposal} />
                <Divider />
                <OurProcessBlock />
                <Divider />
                <ScopeOfWorkBlock proposal={proposal} />
                {proposal.bom.length > 0 && (
                  <>
                    <Divider />
                    <BOMGroupedTable
                      items={proposal.bom}
                      comments={bomComments}
                      onCommentsChange={(c) => {
                        setBomComments(c);
                        // Auto-persist to localStorage so comments survive page refresh
                        localStorage.setItem(BOM_COMMENTS_KEY, JSON.stringify(c));
                      }}
                    />
                  </>
                )}
                <Divider />
                <CommercialsBlock sheet={proposal.sheet} roi={proposal.roi} roiAutofill={proposal.roiAutofill} />
                <Divider />
                <ListBlock title="Client Scope" items={CLIENT_SCOPE} />
                <Divider />
                <ListBlock title="Terms & Conditions" items={TERMS_AND_CONDITIONS} />
                <Divider />
                <ListBlock title="Service Details" items={SERVICE_DETAILS} />
                <Divider />
                <ListBlock title="Payment Terms" items={PAYMENT_TERMS} />
                <Divider />
                <AccountDetailsBlock />
                <Divider />
                <ListBlock title="Warranty" items={WARRANTY_TERMS} />
                <Divider />
                <ListBlock title="Material Delivery Period" items={DELIVERY_TERMS} />
                <Divider />
                <SectionBlock title="Closing Note" content={closingText(proposal)} />
              </div>

              {/* Footer — Save + Export */}
              <div className="print-hide border-t border-primary-100 bg-gradient-to-br from-primary-50/30 to-transparent px-5 sm:px-8 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: meta */}
                  <p className="text-xs text-secondary-400 hidden sm:block">
                    Generated {new Date(proposal.generatedAt).toLocaleString('en-IN')} · {proposal.refNumber}
                  </p>

                  {/* Right: actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Export buttons */}
                    <button
                      onClick={handleExportPdf}
                      disabled={!!exporting || saveStatus === 'saving'}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-60 min-h-[44px] sm:min-h-0"
                      style={{ background: '#374151' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#374151')}
                    >
                      {exporting === 'pdf'
                        ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : '⬇'}
                      Export PDF
                    </button>
                    <button
                      onClick={handleExportDocx}
                      disabled={!!exporting || saveStatus === 'saving'}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-60 min-h-[44px] sm:min-h-0"
                      style={{ background: '#374151' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#374151')}
                    >
                      {exporting === 'docx'
                        ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : '⬇'}
                      Export DOCX
                    </button>

                    {/* Divider */}
                    <span className="hidden sm:block w-px h-6 bg-gray-200" />

                    {/* Primary Save button */}
                    <button
                      onClick={handleSave}
                      disabled={saveStatus === 'saving' || !!exporting}
                      className="flex items-center justify-center gap-2 text-sm font-bold text-white px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-60 min-h-[44px] sm:min-h-0"
                      style={{ background: saveStatus === 'saved' ? '#16a34a' : '#0d1b3a' }}
                      onMouseEnter={e => { if (saveStatus !== 'saved') e.currentTarget.style.background = '#0a1530'; }}
                      onMouseLeave={e => { if (saveStatus !== 'saved') e.currentTarget.style.background = '#0d1b3a'; }}
                    >
                      {saveStatus === 'saving' && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {saveStatus === 'saved'  && '✓'}
                      {saveStatus === 'idle'   && '💾'}
                      {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
                    </button>

                    {/* Edit Details link */}
                    <button
                      onClick={handleRegenerate}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors py-1"
                    >
                      ← Edit Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
