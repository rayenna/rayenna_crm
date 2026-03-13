import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES, sheetTotalGst } from '../lib/costingConstants';
import type { SavedSheet, StoredBom, BomRowGenerated, RoiAutofill, Category } from '../lib/costingConstants';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, ImageRun,
} from 'docx';
import {
  getActiveCustomer,
  saveAllArtifacts,
  getWipKeysForCurrentUser,
  formatEmailForDisplay,
} from '../lib/customerStore';
import {
  getCurrentUserRole,
  syncProjectProposal,
  syncProjectCosting,
  syncProjectBom,
  syncProjectRoi,
  createProposalShare,
  generateAiRoofLayout,
  fetchCrmProjectForAiLayout,
  AiRoofLayoutResponse,
  getApiBaseUrl,
  fetchManualRoofLayout,
} from '../lib/apiClient';
import type { CostingArtifact, BomArtifact, RoiArtifact, ProposalArtifact } from '../lib/customerStore';

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
  inputs: {
    systemSizeKw: number; tariff: number; generationFactor: number; escalationPercent: number; projectCost: number;
    subsidyEligible?: boolean;
    subsidyAmount?: number;
  };
  annualGeneration: number; annualSavings: number; paybackYears: number;
  totalSavings25Years: number; roiPercent: number; lcoe: number; co2OffsetTons: number;
  yearlyBreakdown?: YearlyRow[];
  effectiveProjectCost?: number;
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
  /** Human‑readable CRM Customer Number (e.g. "C000123"), when available */
  customerNumber?: string | null;
  /** Human‑readable CRM Project Number (Project SL No, e.g. 120), when available */
  projectNumber?:  number | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// For Commercials section: always show the full rupee amount (no Lacs/Cr, no decimals)
function fmtINRFull(n: number): string {
  const rounded = Math.round(n);
  return `₹${rounded.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

interface ProposalMeta {
  customerNumber?: string | null;
  projectNumber?:  number | null;
}

function genRef(meta?: ProposalMeta): string {
  const now  = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const parts: string[] = [`REY`, String(year), month];

  if (meta?.projectNumber != null) {
    parts.push(`PRJ-${String(meta.projectNumber).padStart(4, '0')}`);
  }

  if (meta?.customerNumber) {
    parts.push(`CUST-${meta.customerNumber}`);
  }

  // Fallback uniqueness tail when IDs are missing
  if (!meta?.projectNumber || !meta?.customerNumber) {
    parts.push(String(Date.now()).slice(-5));
  }

  return parts.join('/');
}

function readStorage<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

function getLatestSheet(): SavedSheet | null {
  const key = getWipKeysForCurrentUser().sheets;
  const sheets: SavedSheet[] | null = readStorage(key);
  if (!sheets || !sheets.length) return null;
  return sheets.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0];
}

function getBom(): BomRowGenerated[] {
  const wip = getWipKeysForCurrentUser();
  const overrides: BomOverrides | null = readStorage(wip.bomOverrides);
  if (overrides && overrides.rows.length) return overrides.rows;
  const stored: StoredBom | null = readStorage(wip.bomCosting);
  if (stored && stored.rows.length) return stored.rows;
  return [];
}

// ─────────────────────────────────────────────
// Template text generator
// ─────────────────────────────────────────────

function buildProposal(
  customer: CustomerDetails,
  sheet: SavedSheet | null,
  bom: BomRowGenerated[],
  roi: ROIResult | null,
  roiAutofill: RoiAutofill | null,
  meta?: ProposalMeta,
): ProposalData {
  const sizeKw = roiAutofill?.systemSizeKw ?? sheet?.systemSizeKw ?? 0;
  return {
    refNumber:   genRef(meta),
    generatedAt: new Date().toISOString(),
    customer,
    systemSizeKw: sizeKw,
    sheet,
    bom,
    roi,
    roiAutofill,
    customerNumber: meta?.customerNumber ?? null,
    projectNumber:  meta?.projectNumber ?? null,
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

const SUBSIDY_DISCLAIMER_TEXT = `The subsidy, if applicable, is subject to approval and disbursement by the relevant DISCOM and/or government authority. Rayenna Energy's scope is limited to providing reasonable assistance with documentation and procedural requirements. We have no control over, and shall not be liable or responsible for, any delay, rejection, non-approval, or non-disbursement of the subsidy by the concerned authorities. The Customer expressly acknowledges and agrees that all payment obligations under this agreement are absolute and unconditional, and are not linked to, dependent upon, or contingent upon the approval or receipt of any subsidy amount.`;

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
    @page { size: A4 portrait; margin: 18mm 18mm; }
    body  { margin:0; padding:0; background:#fff; font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; }
    * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; color-adjust:exact!important; color:inherit; }
    /* Avoid ugly splits for small cards, but allow big sections to paginate */
    table { width: 100%; }
    tr, .rounded-xl, .grid > div { break-inside:avoid; page-break-inside:avoid; }
    .pdf-section { break-inside:auto; page-break-inside:auto; }
    tr[data-bom-header="true"] { page-break-after:avoid; }
    thead { display: table-header-group; }
    h1, h2, h3 { page-break-after:avoid; }
    svg { overflow:visible!important; }
    textarea { display:none!important; }
    /* Ensure Our Process cards don't overflow page width when printed */
    .pdf-process-steps { flex-wrap:wrap; }
    .pdf-process-steps > div { min-width:220px; flex:1 1 45%; }
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

function buildDocx(
  p: ProposalData,
  diagramImageData?: ArrayBuffer,
  bomComments?: Record<string, string>,
  logoImageData?: ArrayBuffer,
  textOverrides?: TextOverrides,
  roofLayout?: AiRoofLayoutResponse | null,
  roofLayoutImageData?: ArrayBuffer,
): Document {
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
    ...(p.customer.email        ? [new Paragraph({ children: [new TextRun({ text: `Email: ${formatEmailForDisplay(p.customer.email)}`, size: 22, color: '374151' })], spacing: { after: 200 } })] : []),
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
  const grandTotal = p.sheet?.grandTotal ?? p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
  const commercialsSection = grandTotal > 0 ? (() => {
    const grandRounded = Math.round(grandTotal);
    const subsidyAmt   = p.roi?.inputs?.subsidyAmount ?? 0;
    const showSubsidy  = !!p.roi?.inputs?.subsidyEligible && subsidyAmt > 0;
    const hasSheet     = !!p.sheet;
    const sizeKw       = p.roiAutofill?.systemSizeKw ?? p.sheet?.systemSizeKw ?? 0;

    let gstAmount: number;
    let preGst: number;
    let gstLabel: string;

    if (hasSheet) {
      const sheetGst =
        (p.sheet!.totalGst != null && p.sheet!.totalGst > 0)
          ? p.sheet!.totalGst
          : (p.sheet!.items?.length ? sheetTotalGst(p.sheet!.items, p.sheet!.marginPercent ?? 15) : 0);
      gstAmount = Math.round(sheetGst);
      preGst = Math.round(grandRounded - gstAmount);
      gstLabel = 'GST (mixed: 5% & 18%)';
    } else {
      gstAmount = (() => {
        const pre = Math.round(grandRounded / 1.18);
        return Math.round(grandRounded - pre);
      })();
      preGst = Math.round(grandRounded / 1.18);
      gstLabel = 'GST @ 18% (estimate)';
    }
    const commercialRows: TableRow[] = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Design, Supply, Installation & Commissioning of ${sizeKw > 0 ? `${sizeKw} kW ` : ''}On-Grid Solar Power Plant including all electrical and structural work`, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmtINRFull(preGst), bold: true, size: 20 })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: gstLabel, size: 20, color: '1D4ED8' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmtINRFull(gstAmount), bold: true, size: 20, color: '1D4ED8' })], alignment: AlignmentType.RIGHT })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL PROJECT COST (incl. GST)', bold: true, size: 22, color: white })], alignment: AlignmentType.LEFT })], shading: { type: ShadingType.SOLID, color: navy } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmtINRFull(grandRounded), bold: true, size: 24, color: white })], alignment: AlignmentType.RIGHT })], shading: { type: ShadingType.SOLID, color: navy } }),
            ],
          }),
    ];
    if (showSubsidy) {
      commercialRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Subsidy Eligible – Rs. ${subsidyAmt.toLocaleString('en-IN')}/-`,
                      size: 20,
                      color: '92400E',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: fmtINRFull(subsidyAmt), bold: true, size: 20, color: '92400E' }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
      );
    }
    return [
      heading('Commercials'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: commercialRows,
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
    ...(roofLayout
      ? [
          heading('Proposed Rooftop Solar Layout'),
          ...(roofLayoutImageData
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: roofLayoutImageData,
                      transformation: { width: 420, height: 260 },
                      type: 'jpg',
                    }),
                  ],
                  spacing: { after: 120 },
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The following values summarise the AI-assisted rooftop solar layout generated for this project.',
                size: 22,
                color: '374151',
              }),
            ],
            spacing: { after: 160 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Roof area (m²)', 'Usable area (m²)', 'Panel count'].map(
                  (label) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: label, bold: true, size: 20, color: white })],
                        }),
                      ],
                      shading: { type: ShadingType.SOLID, color: navy },
                    }),
                ),
              }),
              new TableRow({
                children: [
                  Number.isFinite(roofLayout.roof_area_m2)
                    ? `${Number(roofLayout.roof_area_m2).toFixed(1)}`
                    : '—',
                  Number.isFinite(roofLayout.usable_area_m2)
                    ? `${Number(roofLayout.usable_area_m2).toFixed(1)}`
                    : '—',
                  Number.isFinite(roofLayout.panel_count)
                    ? String(roofLayout.panel_count)
                    : '—',
                ].map(
                  (value) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: value, size: 20, color: '111827' })],
                        }),
                      ],
                    }),
                ),
              }),
            ],
          }),
          new Paragraph({ text: '', spacing: { after: 200 } }),
        ]
      : []),
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
    ...(() => {
      const override = textOverrides?.['section-closing-note'];
      const body = override && override.trim().length > 0 ? override : closingText(p);
      return multilineParagraphs(body);
    })(),
    heading('Subsidy Disclaimer and Payment Terms'),
    ...multilineParagraphs(SUBSIDY_DISCLAIMER_TEXT),
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
function extractTextOverrides(root: HTMLElement): Record<string, string> {
  const overrides: Record<string, string> = {};

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

/** Get image as ArrayBuffer from an already-rendered img element (for mobile DOCX export when fetch fails). */
async function imageElementToArrayBuffer(img: HTMLImageElement): Promise<ArrayBuffer> {
  // Ensure the image has finished loading before drawing
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      if (img.complete && img.naturalWidth > 0) resolve();
    });
  }
  if (img.naturalWidth === 0) return Promise.reject(new Error('Image not loaded'));

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2d unavailable'));
      return;
    }
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('toBlob failed'));
          return;
        }
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as ArrayBuffer);
        fr.onerror = () => reject(fr.error);
        fr.readAsArrayBuffer(blob);
      },
      'image/jpeg',
      0.92
    );
  });
}

async function exportToDocx(
  p: ProposalData,
  bomComments?: Record<string, string>,
  textOverrides?: TextOverrides,
  container?: HTMLElement | null,
  roofLayout?: AiRoofLayoutResponse | null,
): Promise<void> {
  let diagramImageData: ArrayBuffer | undefined;
  let logoImageData: ArrayBuffer | undefined;
   let roofLayoutImageData: ArrayBuffer | undefined;

  // 1) Prefer the already-rendered <img> elements inside the proposal.
  // This works consistently on both mobile and desktop and avoids any
  // fetch/CORS quirks; we only fall back to network fetch if needed.
  if (container) {
    try {
      const diagramImg =
        container.querySelector<HTMLImageElement>('[data-docx-image="diagram"]')
        ?? container.querySelector<HTMLImageElement>('img[src*="rayenna_proposal"]');
      const logoImg =
        container.querySelector<HTMLImageElement>('[data-docx-image="logo"]')
        ?? container.querySelector<HTMLImageElement>('img[src*="rayenna_logo"]');
      const roofImg =
        container.querySelector<HTMLImageElement>('[data-docx-image="roof-layout"]') ?? null;

      if (diagramImg) {
        diagramImageData = await imageElementToArrayBuffer(diagramImg);
      }
      if (logoImg) {
        logoImageData = await imageElementToArrayBuffer(logoImg);
      }
      if (roofImg) {
        roofLayoutImageData = await imageElementToArrayBuffer(roofImg);
      }
    } catch {
      // best-effort only; we will still try network fetch below
    }
  }

  // 2) If either image is still missing, try network fetch as a fallback.
  if (!diagramImageData || !logoImageData) {
    try {
      const [diagResp, logoResp] = await Promise.all([
        fetch('/rayenna_proposal.jpg'),
        fetch('/rayenna_logo.jpg'),
      ]);
      if (!diagramImageData && diagResp.ok) {
        diagramImageData = await diagResp.arrayBuffer();
      }
      if (!logoImageData && logoResp.ok) {
        logoImageData = await logoResp.arrayBuffer();
      }
    } catch {
      // still optional; if fetch fails we just omit the images
    }
  }

  const doc = buildDocx(
    p,
    diagramImageData,
    bomComments,
    logoImageData,
    textOverrides,
    roofLayout,
    roofLayoutImageData,
  );
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
  'Subsidy Disclaimer and Payment Terms': { icon: '📜', accent: '#b45309' },
};

function SectionBlock({ title, content }: { title: string; content: string }) {
  const meta = SECTION_META[title] ?? { icon: '📌', accent: '#0d1b3a' };
  const sectionKey = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="mb-8 pdf-section" data-pdf-section={sectionKey}>
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
            data-docx-image="diagram"
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

      {/* Process steps — horizontal on desktop, but constrained to printable width */}
      <div className="flex flex-col sm:flex-row gap-3 pdf-process-steps">
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

function RoofLayoutBlock({ layout }: { layout: AiRoofLayoutResponse }) {
  const accent = '#0f766e';
  const apiBase = getApiBaseUrl();
  // The layout image URL is already resolved by the server / AIRoofLayout save flow.
  // Just normalise it against the API base URL when needed.
  let src: string | null = null;
  if (layout.layout_image_url) {
    src =
      layout.layout_image_url.startsWith('http')
        ? layout.layout_image_url
        : `${apiBase}${layout.layout_image_url}`;
  }

  return (
    <div className="mb-8 pdf-section">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">🛰️</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          Proposed Rooftop Solar Layout
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
        <div className="space-y-3">
          <p className="text-sm text-secondary-700 leading-relaxed">
            This layout is generated automatically from satellite imagery and your project details. It is an
            indicative, AI-assisted draft to support technical discussions and customer presentations.
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <dt className="font-semibold text-emerald-800 uppercase tracking-wide text-[10px]">Roof area</dt>
              <dd className="mt-1 text-base font-semibold text-emerald-900">
                {Number.isFinite(layout.roof_area_m2) ? Number(layout.roof_area_m2).toFixed(1) : '—'} m²
              </dd>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <dt className="font-semibold text-emerald-800 uppercase tracking-wide text-[10px]">Usable area</dt>
              <dd className="mt-1 text-base font-semibold text-emerald-900">
                {Number.isFinite(layout.usable_area_m2) ? Number(layout.usable_area_m2).toFixed(1) : '—'} m²
              </dd>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 sm:col-span-2">
              <dt className="font-semibold text-emerald-800 uppercase tracking-wide text-[10px]">Panel count</dt>
              <dd className="mt-1 text-base font-semibold text-emerald-900">
                {Number.isFinite(layout.panel_count) ? layout.panel_count : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden">
            {src ? (
              <img
                data-docx-image="roof-layout"
                src={src}
                alt="Proposed rooftop solar layout"
                crossOrigin="anonymous"
                className="w-full h-auto"
                style={{ maxHeight: '320px', objectFit: 'cover' }}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-secondary-400">
                Roof layout image not available.
              </div>
            )}
          </div>
          <p className="text-[10px] text-secondary-500">
            This is an early, AI-assisted draft. Please verify all roof clearances, structural constraints, and final
            module layout on site before execution.
          </p>
        </div>
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
  'electrical-items':   { bg: '#fff1f2', border: '#fecdd3', badge: '#be123c', text: '#9f1239', headerBg: '#ffe4e6' },
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
  'electrical-items':   '🔌',
  'installation':       '🔧',
  'others':             '📦',
};

function BOMGroupedTable({
  items,
  comments,
  onCommentsChange,
  collapsed,
  setCollapsed,
  allCollapsed,
  setAllCollapsed,
}: {
  items: BomRowGenerated[];
  comments: Record<string, string>;
  onCommentsChange: (c: Record<string, string>) => void;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  allCollapsed: boolean;
  setAllCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}) {

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
    <div className="mb-8 pdf-section" data-pdf-section="bom">
      {/* Collapse-all toggle + summary */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-secondary-400">
          {grouped.length} categories · {items.length} items
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="print-hide flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-lg border transition-colors touch-manipulation"
          style={{ borderColor: '#b45309', color: '#b45309', background: '#fff7ed', touchAction: 'manipulation' }}
          aria-label={allCollapsed ? 'Expand all categories' : 'Collapse all categories'}
        >
          {allCollapsed ? '▶ Expand All' : '▼ Collapse All'}
        </button>
      </div>

      {/* Column header + table */}
      <div className="overflow-x-auto rounded-xl border border-secondary-200 shadow-sm">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <caption
            className="text-left text-sm font-extrabold uppercase tracking-widest px-3 pt-3 pb-1"
            style={{ color: '#b45309', captionSide: 'top' as any }}
          >
            Bill of Quantities
          </caption>
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
                <React.Fragment key={cat}>
                  {/* Category header row */}
                  <tr
                    className="cursor-pointer select-none"
                    style={{ background: a.headerBg, borderTop: `2px solid ${a.border}` }}
                    onClick={() => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }))}
                    data-bom-cat={cat}
                    data-bom-collapsed={(!isOpen).toString()}
                    data-bom-header="true"
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

                  {/* Comment row — always visible on screen; exports can drop collapsed categories via data-bom-collapsed */}
                    <tr
                      key={`cmt-${cat}`}
                      style={{ background: a.bg, borderBottom: `2px solid ${a.border}` }}
                      data-bom-note={cat}
                      data-bom-collapsed={(!isOpen).toString()}
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
                  
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommercialsBlock({
  sheet,
  roi,
  roiAutofill,
}: {
  sheet: SavedSheet | null;
  roi: ROIResult | null;
  roiAutofill: RoiAutofill | null;
}) {
  // Prefer the saved costing sheet grand total + GST (must exactly match Excel).
  // Fall back to ROI inputs only when no costing sheet exists.
  const grandTotal = sheet?.grandTotal ?? roiAutofill?.grandTotal ?? roi?.inputs.projectCost ?? 0;
  if (!grandTotal) return null;

  const subsidyAmount = roi?.inputs?.subsidyAmount ?? 0;
  const showSubsidy = !!roi?.inputs?.subsidyEligible && subsidyAmount > 0;

  const grandRounded = Math.round(grandTotal);

  // If a costing sheet exists, use its GST total. Recompute from items if stored total is 0 (legacy data).
  if (sheet) {
    const sheetGst =
      (sheet.totalGst != null && sheet.totalGst > 0)
        ? sheet.totalGst
        : (sheet.items?.length ? sheetTotalGst(sheet.items, sheet.marginPercent ?? 15) : 0);
    const gstAmount = Math.round(sheetGst);
    const preGst = Math.round(grandRounded - gstAmount);
    const gstLabel = 'GST (mixed: 5% & 18%)';

  return (
    <div className="mb-8 pdf-section">
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
                {(() => {
                  const sizeKw = (roiAutofill?.systemSizeKw ?? sheet?.systemSizeKw ?? 0) || 0;
                  return sizeKw > 0
                    ? <span className="font-semibold text-secondary-800">{sizeKw} kW</span>
                    : 'the';
                })()}{' '}
                On-Grid Solar Power Plant including all electrical and structural work
              </td>
              <td className="px-5 py-3 text-right text-secondary-800 font-semibold tabular-nums w-44">
                {fmtINRFull(preGst)}
              </td>
            </tr>
            <tr className="border-b border-primary-100 bg-blue-50/40">
              <td className="px-5 py-3 text-blue-700">{gstLabel}</td>
              <td className="px-5 py-3 text-right text-blue-700 font-semibold tabular-nums">
                {fmtINRFull(gstAmount)}
              </td>
            </tr>
            <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
              <td className="px-5 py-3 text-white font-bold uppercase tracking-wide text-xs drop-shadow">
                Total Project Cost (incl. GST)
              </td>
              <td className="px-5 py-3 text-right text-white font-extrabold text-base tabular-nums drop-shadow">
                {fmtINRFull(grandRounded)}
              </td>
            </tr>
            {showSubsidy && (
              <tr className="border-b border-primary-100 bg-amber-50/60">
                <td className="px-5 py-3 text-amber-800 font-medium">
                  Subsidy Eligible – Rs. {subsidyAmount.toLocaleString('en-IN')}/-
                </td>
                <td className="px-5 py-3 text-right text-amber-800 font-semibold tabular-nums w-44">
                  {fmtINRFull(subsidyAmount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  }

  // No costing sheet: fall back to a flat 18% estimate.
  const gstAmount   = (() => {
    const pre = Math.round(grandRounded / 1.18);
    return Math.round(grandRounded - pre);
  })();
  const preGst      = Math.round(grandRounded / 1.18);
  const gstLabel    = 'GST @ 18% (estimate)';

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
                Design, Supply, Installation &amp; Commissioning of the On-Grid Solar Power Plant
                including all electrical and structural work
              </td>
              <td className="px-5 py-3 text-right text-secondary-800 font-semibold tabular-nums w-44">
                {fmtINRFull(preGst)}
              </td>
            </tr>
            <tr className="border-b border-primary-100 bg-blue-50/40">
              <td className="px-5 py-3 text-blue-700">{gstLabel}</td>
              <td className="px-5 py-3 text-right text-blue-700 font-semibold tabular-nums">
                {fmtINRFull(gstAmount)}
              </td>
            </tr>
            <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
              <td className="px-5 py-3 text-white font-bold uppercase tracking-wide text-xs drop-shadow">
                Total Project Cost (incl. GST)
              </td>
              <td className="px-5 py-3 text-right text-white font-extrabold text-base tabular-nums drop-shadow">
                {fmtINRFull(grandRounded)}
              </td>
            </tr>
            {showSubsidy && (
              <tr className="border-b border-primary-100 bg-amber-50/60">
                <td className="px-5 py-3 text-amber-800 font-medium">
                  Subsidy Eligible – Rs. {subsidyAmount.toLocaleString('en-IN')}/-
                </td>
                <td className="px-5 py-3 text-right text-amber-800 font-semibold tabular-nums w-44">
                  {fmtINRFull(subsidyAmount)}
                </td>
              </tr>
            )}
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
    <div className="mb-8 pdf-section">
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
    <div className="mb-8 pdf-section">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0d1b3a', height: '28px' }} />
        <span className="text-lg leading-none">🏦</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0d1b3a' }}>Account Details</h2>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#c7d2fe', background: '#f0f4ff' }}>
        {rows.map(({ label, value }, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-2.5 text-sm border-b last:border-b-0"
            style={{ borderColor: '#c7d2fe60', background: i % 2 === 0 ? '#e0e7ff40' : 'white' }}
          >
            <span className="w-28 sm:w-36 flex-shrink-0 text-secondary-500 font-medium text-xs uppercase tracking-wide pt-0.5">{label}</span>
            <span className="font-bold tabular-nums min-w-0 break-all" style={{ color: '#0d1b3a' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer details form
// ─────────────────────────────────────────────

function CustomerForm({
  onGenerate,
}: {
  onGenerate: (c: CustomerDetails, options: { includeRoofLayout: boolean }) => void;
}) {
  // Pre-fill from active customer if available
  const activeCustomer = getActiveCustomer();
  const ac = activeCustomer?.master;

  const sheet      = getLatestSheet();
  const bom        = getBom();
  const roi: ROIResult | null = readStorage(getWipKeysForCurrentUser().roiResult);

  const [includeRoofLayout, setIncludeRoofLayout] = useState(false);

  const hasSheet = !!sheet;
  const hasBom   = bom.length > 0;
  const hasRoi   = !!roi;

  const handleSubmit = () => {
    const master = getActiveCustomer()?.master;
    const customer: CustomerDetails = {
      customerName: master?.name ?? '',
      location:     master?.location ?? '',
      contactPerson: master?.contactPerson ?? '',
      phone:        master?.phone ?? '',
      email:        master?.email ?? '',
    };
    onGenerate(customer, { includeRoofLayout });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Active customer banner */}
      {activeCustomer ? (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-sky-700 min-w-0">
            <span className="font-semibold">Active customer:</span> {activeCustomer.master.name}
            {' · '}Generating proposal will save all 4 artifacts to this customer record.
          </p>
          <Link to="/" className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap flex-shrink-0 transition-colors">
            View Dashboard →
          </Link>
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-amber-700 min-w-0">No active customer. Proposal will be generated but not saved to a customer record.</p>
          <Link to="/customers" className="text-xs text-amber-700 hover:text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap flex-shrink-0">
            Select Customer →
          </Link>
        </div>
      )}

      {/* Data status — 3 cols on sm+, single col on xs so text is readable */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Costing Sheet', ok: hasSheet, detail: sheet ? sheet.name : 'Not saved yet' },
          { label: 'BOM',           ok: hasBom,   detail: hasBom ? `${bom.length} items` : 'Not generated yet' },
          { label: 'ROI Result',    ok: hasRoi,   detail: hasRoi ? `Payback ${roi!.paybackYears.toFixed(1)} yrs` : 'Not calculated yet' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 flex sm:flex-col items-center sm:text-center gap-3 sm:gap-0 ${s.ok ? 'border-emerald-200 bg-emerald-50' : 'border-secondary-200 bg-secondary-50'}`}>
            <p className="text-lg sm:mb-1 flex-shrink-0">{s.ok ? '✓' : '○'}</p>
            <div className="flex-1 sm:flex-none min-w-0">
              <p className={`text-xs font-semibold ${s.ok ? 'text-emerald-700' : 'text-secondary-500'}`}>{s.label}</p>
              <p className="text-[10px] text-secondary-400 mt-0.5 truncate">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {!hasSheet && !hasBom && !hasRoi && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          <p className="font-semibold">No data found</p>
          <p className="text-xs mt-1">Please complete the Costing Sheet, BOM, and ROI Calculator first, then return here to generate the proposal.</p>
        </div>
      )}

      {/* Project & Customer snapshot — read-only, from CRM */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Project &amp; Customer (CRM)</h3>
          {ac?.projectStage && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900 text-amber-300 border border-amber-400/70">
              Stage: {ac.projectStage}
            </span>
          )}
        </div>

        {/* Optional: include AI roof layout in generated proposal */}
        <div className="mt-4 border-t border-dashed border-secondary-200 pt-3">
          <label className="flex items-start gap-2 text-xs text-secondary-700">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              checked={includeRoofLayout}
              onChange={(e) => setIncludeRoofLayout(e.target.checked)}
            />
            <span>
              <span className="font-semibold">Include AI Roof Layout (Beta) in proposal</span>
              <br />
              <span className="text-[10px] text-secondary-500">
                When checked, the latest AI rooftop solar layout for this CRM project will be added as a section in the generated proposal.
              </span>
              <br />
              <span className="text-[10px] text-secondary-500">
                Note: The panel quantity calculated by the AI Service might be different from what you are quoting. Please cross-check and adjust the values before sending the final proposal.
              </span>
            </span>
          </label>
        </div>
        <p className="text-[11px] text-secondary-400">
          These details are pulled from Rayenna CRM and are <span className="font-semibold">read-only</span>. To make changes, edit the Project in CRM.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Project #</p>
            <p className="font-semibold text-secondary-900">{ac?.projectNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Customer ID</p>
            <p className="font-semibold text-secondary-900 break-all">{ac?.customerNumber ?? '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Customer Name</p>
            <p className="font-semibold text-secondary-900">{ac?.name ?? '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Full Address</p>
            <p className="font-medium text-secondary-800 text-[11px] leading-snug">
              {ac?.location || '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Contact Number</p>
            <p className="font-semibold text-secondary-900">{ac?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Email ID</p>
            <p className="font-semibold text-secondary-900 break-all">{ac?.email ? formatEmailForDisplay(ac.email) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Consumer Number</p>
            <p className="font-semibold text-secondary-900 break-all">{ac?.consumerNumber || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Segment</p>
            <p className="font-semibold text-secondary-900">{ac?.segment || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Project Stage</p>
            <p className="font-semibold text-secondary-900">{ac?.projectStage || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Sales Person</p>
            <p className="font-semibold text-secondary-900">{ac?.salespersonName || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">System Capacity (kW)</p>
            <p className="font-semibold text-secondary-900">
              {typeof ac?.systemSizeKw === 'number' && ac.systemSizeKw > 0 ? `${ac.systemSizeKw} kW` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary-500">Panel Type</p>
            <p className="font-semibold text-secondary-900">{ac?.panelType || '—'}</p>
          </div>
        </div>

        <div className="pt-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            disabled={!activeCustomer}
          >
            <span className="text-base">✦</span>
            {activeCustomer ? 'Generate Proposal from CRM Data' : 'Select Customer in CRM to Generate'}
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
export default function ProposalPreview() {
  const navigate = useNavigate();
  const [proposal, setProposal]               = useState<ProposalData | null>(null);
  const [exporting, setExporting]             = useState<'pdf' | 'docx' | null>(null);
  const [savedToCustomer, setSavedToCustomer] = useState<string | null>(null);
  const [bomComments, setBomComments]         = useState<Record<string, string>>({});
  const [bomCollapsed, setBomCollapsed]       = useState<Record<string, boolean>>({});
  const [bomAllCollapsed, setBomAllCollapsed] = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [saveStatus, setSaveStatus]           = useState<'idle' | 'saving' | 'saved'>('idle');
  const [includeRoofLayout, setIncludeRoofLayout] = useState(false);
  const [roofLayout, setRoofLayout]               = useState<AiRoofLayoutResponse | null>(null);
  const printRef                              = useRef<HTMLDivElement>(null);
  // Ref to the contentEditable document body div so we can read its innerHTML on save
  const docBodyRef                            = useRef<HTMLDivElement>(null);

  const [shareModalOpen, setShareModalOpen]         = useState(false);
  const [shareLink, setShareLink]                   = useState<string | null>(null);
  const [shareCreating, setShareCreating]           = useState(false);
  const [shareError, setShareError]                = useState<string | null>(null);
  const [shareUsePassword, setShareUsePassword]     = useState(false);
  const [sharePassword, setSharePassword]          = useState('');
  const [shareUseCustomValidity, setShareUseCustomValidity] = useState(false);
  const [shareExpiryDate, setShareExpiryDate]      = useState('');
  const [shareLinkCopied, setShareLinkCopied]      = useState(false);

  const role = getCurrentUserRole();
  const canWrite = role != null && ['ADMIN', 'SALES'].includes(String(role).toUpperCase());

  useEffect(() => {
    if (!canWrite && isEditing) setIsEditing(false);
  }, [canWrite, isEditing]);

  // Reset BOM collapse state whenever a new BOM is loaded
  useEffect(() => {
    setBomCollapsed({});
    setBomAllCollapsed(false);
  }, [proposal?.bom]);

  // Track the active customer ID so CustomerForm remounts when the customer changes.
  // This guarantees the form fields always reflect the correct customer.
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(
    () => getActiveCustomer()?.id ?? null,
  );

  // Poll for active customer changes (covers navigating away and back, or switching
  // customer in another tab). Runs every time the page gains focus.
  useEffect(() => {
    const sync = () => {
      const id = getActiveCustomer()?.id ?? null;
      setActiveCustomerId(id);
      // We intentionally do NOT clear an already-rendered proposal on focus.
      // This keeps the proposal open even when the user switches browser tabs.
    };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  // NOTE: We intentionally DO NOT re-inject previously saved editedHtml into
  // the DOM here. Doing so would replace the React-rendered proposal body
  // (including interactive components like the BOM Collapse All button) with
  // static HTML, breaking interactivity for existing customers. Text edits are
  // still captured via extractTextOverrides() on save and used for DOCX.

  // ── Save comments to active customer record ──
  const persistComments = (comments: Record<string, string>) => {
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
    if (!canWrite) return;
    if (!proposal) return;
    setSaveStatus('saving');

    // 1. Capture current edited HTML and extract per-section text overrides
    const editedHtml     = docBodyRef.current?.innerHTML ?? undefined;
    const textOverrides  = docBodyRef.current ? extractTextOverrides(docBodyRef.current) : undefined;

    // 2. Persist BOM comments
    persistComments(bomComments);

    // 3. Save all 4 artifacts + editedHtml + textOverrides to active customer record
    const activeCustomer = getActiveCustomer();
    if (activeCustomer) {
      const sheet = proposal.sheet;
      const bom   = proposal.bom;
      const roi: ROIResult | null = readStorage(getWipKeysForCurrentUser().roiResult);
      const now   = new Date().toISOString();

      const costingArtifact: CostingArtifact | null = sheet ? {
        sheetName:     sheet.name,
        savedAt:       sheet.savedAt,
        items:         sheet.items,
        showGst:       sheet.showGst,
        marginPercent: sheet.marginPercent,
        grandTotal:    sheet.grandTotal,
        totalGst:      sheet.totalGst ?? 0,
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

      // Sync all four artifacts to CRM backend so Admin/Ops/Finance/Management see the same data.
      const projectId = activeCustomer.master.crmProjectId;
      if (projectId) {
        if (costingArtifact) void syncProjectCosting(projectId, costingArtifact);
        if (bomArtifact) void syncProjectBom(projectId, bomArtifact);
        if (roiArtifact) void syncProjectRoi(projectId, roiArtifact);
        void syncProjectProposal(projectId, proposalArtifact);
      }
    }

    // 4. Exit edit mode
    setIsEditing(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleSaveAndClose = () => {
    if (!canWrite || !proposal) return;
    handleSave();
    // Give a small delay so the saved banner / state can update, then go back to Dashboard
    setTimeout(() => {
      navigate('/');
    }, 400);
  };

  const handleGenerate = async (
    customer: CustomerDetails,
    options: { includeRoofLayout: boolean },
  ) => {
    // Always read the active customer record first — this is the source of truth.
    // Global localStorage keys may still hold data from a previously active customer,
    // so we prefer the customer record and only fall back to globals when no record exists.
    const activeCustomer = getActiveCustomer();

    // Costing: prefer customer record, fall back to global key
    const sheet: SavedSheet | null = activeCustomer?.costing
      ? {
          id:            `sheet_${activeCustomer.id}`,
          name:          activeCustomer.costing.sheetName,
          description:   '',
          savedAt:       activeCustomer.costing.savedAt,
          items:         activeCustomer.costing.items,
          showGst:       activeCustomer.costing.showGst,
          marginPercent: activeCustomer.costing.marginPercent,
          grandTotal:    activeCustomer.costing.grandTotal,
          totalGst:      activeCustomer.costing.totalGst,
          systemSizeKw:  activeCustomer.costing.systemSizeKw,
        }
      : getLatestSheet();

    // BOM: prefer customer record, fall back to global key.
    // BomArtifact rows are BomRow (customerStore type); cast to BomRowGenerated
    // which is structurally compatible for the fields buildProposal actually uses.
    const bom: BomRowGenerated[] = (activeCustomer?.bom?.rows && activeCustomer.bom.rows.length > 0)
      ? (activeCustomer.bom.rows as unknown as BomRowGenerated[])
      : getBom();

    // ROI: prefer customer record, fall back to per-user localStorage
    const wip = getWipKeysForCurrentUser();
    const roi: ROIResult | null = (activeCustomer?.roi?.result as ROIResult | null)
      ?? readStorage(wip.roiResult);

    // ROI autofill: derive from customer costing if available, fall back to per-user key
    const roiAutofill: RoiAutofill | null = activeCustomer?.costing
      ? {
          source:       'costing-sheet',
          sourceName:   activeCustomer.costing.sheetName,
          savedAt:      activeCustomer.costing.savedAt,
          systemSizeKw: activeCustomer.costing.systemSizeKw,
          grandTotal:   activeCustomer.costing.grandTotal,
        }
      : readStorage(wip.roiAutofill);
    const meta: ProposalMeta | undefined = activeCustomer?.master
      ? {
          customerNumber: activeCustomer.master.customerNumber ?? undefined,
          projectNumber:  activeCustomer.master.projectNumber ?? undefined,
        }
      : undefined;

    const p = buildProposal(customer, sheet, bom, roi, roiAutofill, meta);
    setProposal(p);
    setIncludeRoofLayout(options.includeRoofLayout);
    setRoofLayout(null);
    setActiveCustomerId(activeCustomer?.id ?? null);

    // ── Restore saved comments from customer record only ──
    // Never fall back to global localStorage — it may contain a different customer's comments.
    const savedComments: Record<string, string> =
      activeCustomer?.proposal?.bomComments ?? {};
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
        totalGst:      sheet.totalGst ?? 0,
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

      // Sync all four artifacts to CRM backend so Admin/Ops/Finance/Management see the same data.
      const projectId = activeCustomer.master.crmProjectId;
      if (projectId) {
        if (costingArtifact) void syncProjectCosting(projectId, costingArtifact);
        if (bomArtifact) void syncProjectBom(projectId, bomArtifact);
        if (roiArtifact) void syncProjectRoi(projectId, roiArtifact);
        void syncProjectProposal(projectId, proposalArtifact);
      }
    }

    // Optionally generate the AI roof layout for this proposal so it can be included
    // as a section when requested.
    if (options.includeRoofLayout && activeCustomer?.master?.crmProjectId) {
      try {
        const crmProjectId = activeCustomer.master.crmProjectId;

        // If a manual layout was saved by the sales team, prefer it (image + corrected metrics).
        try {
          const manual = await fetchManualRoofLayout(crmProjectId);
          if (
            manual &&
            Number.isFinite(manual.roof_area_m2) &&
            Number.isFinite(manual.usable_area_m2) &&
            Number.isFinite(manual.panel_count) &&
            typeof manual.layout_image_url === 'string'
          ) {
            setRoofLayout({
              roof_area_m2: Number(manual.roof_area_m2),
              usable_area_m2: Number(manual.usable_area_m2),
              panel_count: Number(manual.panel_count),
              layout_image_url: manual.layout_image_url,
            });
            return;
          }
        } catch {
          // ignore if no manual layout exists
        }

        const crmProject = await fetchCrmProjectForAiLayout(crmProjectId);

        let latitude: number | null =
          (crmProject.customer && (crmProject.customer as any).latitude != null
            ? Number((crmProject.customer as any).latitude)
            : activeCustomer.master.latitude ?? null);
        let longitude: number | null =
          (crmProject.customer && (crmProject.customer as any).longitude != null
            ? Number((crmProject.customer as any).longitude)
            : activeCustomer.master.longitude ?? null);
        let systemSizeKw: number | null =
          crmProject.systemCapacity != null
            ? Number(crmProject.systemCapacity)
            : activeCustomer.master.systemSizeKw ?? null;
        let panelWattage: number | null =
          crmProject.panelCapacityW != null
            ? Number(crmProject.panelCapacityW)
            : activeCustomer.master.panelWattage ?? null;

        if (
          latitude == null ||
          Number.isNaN(latitude) ||
          longitude == null ||
          Number.isNaN(longitude) ||
          systemSizeKw == null ||
          Number.isNaN(systemSizeKw) ||
          panelWattage == null ||
          Number.isNaN(panelWattage)
        ) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('AI roof layout skipped: missing required CRM data');
          }
          return;
        }

        const data = await generateAiRoofLayout({
          projectId: crmProject.id,
          latitude,
          longitude,
          systemSizeKw,
          panelWattage,
        });

        const roof = data?.roof_area_m2;
        const usable = data?.usable_area_m2;
        const panels = data?.panel_count;
        if (!Number.isFinite(roof) || !Number.isFinite(usable) || !Number.isFinite(panels)) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('AI roof layout response incomplete, skipping layout section');
          }
          return;
        }

        setRoofLayout({
          roof_area_m2: Number(roof),
          usable_area_m2: Number(usable),
          panel_count: Number(panels),
          layout_image_url:
            data?.layout_image_url && String(data.layout_image_url).trim() ? data.layout_image_url : '',
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('Failed to generate AI roof layout for proposal:', err);
        }
      }
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
      // DOCX export always uses the full BOM; collapse state affects only the on-screen HTML/PDF/Share view.
      await exportToDocx(
        proposal,
        bomComments,
        textOverrides,
        printRef.current ?? undefined,
        includeRoofLayout ? roofLayout : null,
      );
    } finally {
      setExporting(null);
    }
  };

  const handleOpenShareModal = () => {
    setShareModalOpen(true);
    setShareLink(null);
    setShareError(null);
    setShareLinkCopied(false);
    setShareUsePassword(false);
    setSharePassword('');
    setShareUseCustomValidity(false);
    setShareExpiryDate('');
  };

  const handleCreateShare = async () => {
    const activeCustomer = getActiveCustomer();
    const projectId = activeCustomer?.master?.crmProjectId;
    if (!projectId) {
      setShareError('Link this proposal to a CRM project first (open from Customers).');
      return;
    }
    // Clone the proposal DOM so we can strip collapsed BOM sections before saving HTML
    let proposalHtml = '';
    if (printRef.current) {
      const clone = printRef.current.cloneNode(true) as HTMLElement;
      // Remove elements marked for print/share hiding (buttons, edit-only controls)
      clone.querySelectorAll('.print-hide').forEach((n) => n.remove());
      // Ensure BOM notes are visible in the shared HTML (remove Tailwind's `hidden` utility on note paragraphs)
      clone.querySelectorAll<HTMLElement>('tr[data-bom-note] p').forEach((p) => {
        p.classList.remove('hidden');
      });
      proposalHtml = clone.innerHTML;
    }
    if (!proposalHtml.trim()) {
      setShareError('No proposal content to share.');
      return;
    }
    setShareCreating(true);
    setShareError(null);
    try {
      let expiresAt: string | undefined;
      if (shareUseCustomValidity && shareExpiryDate) {
        const d = new Date(shareExpiryDate);
        if (!Number.isNaN(d.getTime())) expiresAt = d.toISOString();
      }
      const data = await createProposalShare({
        projectId,
        proposalHtml,
        refNumber: proposal?.refNumber,
        password: shareUsePassword && sharePassword.trim() ? sharePassword.trim() : undefined,
        expiresAt,
      });
      if (!data?.token) {
        setShareError('Share created but no link was returned. Ensure the backend is deployed with the share API (VITE_API_BASE_URL must point to the CRM backend).');
        return;
      }
      const url = `${window.location.origin}/view/${data.token}`;
      setShareLink(url);
    } catch (err: unknown) {
      setShareError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setShareCreating(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    }).catch(() => {});
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
                {/* Edit toggle (Admin/Sales only) */}
                {canWrite && (
                  <button
                    onClick={() => setIsEditing((e) => !e)}
                    title={isEditing ? 'Exit edit mode' : 'Edit proposal'}
                    className={`w-full sm:w-auto flex items-center justify-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg transition-all min-h-[36px] ${
                      isEditing
                        ? 'bg-amber-400 border-amber-300 text-gray-900 hover:bg-amber-300'
                        : 'bg-white/20 hover:bg-white/30 border-white/40 text-white'
                    }`}
                  >
                    {isEditing ? '✏️ Editing…' : '✏️ Edit'}
                  </button>
                )}
                {/* Export buttons — full-width row on mobile so they match other buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  <button
                    onClick={handleOpenShareModal}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all min-h-[36px]"
                    title="Share as link"
                  >
                    🔗 Share
                  </button>
                </div>
                <button
                  onClick={handleRegenerate}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px]"
                >
                  ← New Proposal
                </button>
                {canWrite && (
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || !!exporting}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px] disabled:opacity-60 ${
                      saveStatus === 'saved'
                        ? 'bg-emerald-500 border-2 border-emerald-300 text-white'
                        : 'bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white'
                    }`}
                  >
                    {saveStatus === 'saving' && (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {saveStatus === 'saved' ? '✓ Saved' : '💾 Save'}
                  </button>
                )}
                {canWrite && proposal && (
                  <button
                    onClick={handleSaveAndClose}
                    disabled={saveStatus === 'saving' || !!exporting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-300 hover:bg-amber-400 text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px] disabled:opacity-60"
                  >
                    Save &amp; Close
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {!proposal ? (
            // key = activeCustomerId forces a full remount whenever the active
            // customer changes, ensuring useState initialises from the new customer.
            <CustomerForm key={activeCustomerId ?? 'no-customer'} onGenerate={handleGenerate} />
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
                <div className="print-hide bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 text-amber-800 text-[11px] sm:text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span>✏️</span>
                    <span>
                      Edit mode — click on any text in the proposal to edit it directly. Click <strong>Save</strong> at the bottom when done.
                    </span>
                  </div>
                  <p className="sm:ml-6 text-[10px] sm:text-[11px] text-amber-700">
                    Text changes are used in exports; layout, buttons, and collapse behaviour stay controlled by the app.
                  </p>
                </div>
              )}
              {/* Letterhead */}
              <div className="px-4 sm:px-8 py-6 sm:py-8" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
                {/* Top bar: logo left, ref/date right */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-5 border-b border-white/20">
                  {/* Logo + company name */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-white rounded-xl p-2 shadow-lg">
                      <img
                        data-docx-image="logo"
                        src="/rayenna_logo.jpg"
                        alt="Rayenna Energy"
                        className="h-16 sm:h-[4.5rem] w-auto object-contain"
                        style={{ maxWidth: '160px' }}
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
                  <div className="sm:text-right sm:flex-shrink-0 sm:max-w-[180px]">
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mb-0.5">Reference</p>
                    <p className="text-white font-mono text-sm font-semibold break-all">{proposal.refNumber}</p>
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
                    {(proposal.projectNumber != null || proposal.customerNumber) && (
                      <div className="mb-2 text-[11px] text-white/70 font-mono">
                        {proposal.projectNumber != null && (
                          <span>
                            Project #{proposal.projectNumber}
                            {proposal.customerNumber ? ' · ' : ''}
                          </span>
                        )}
                        {proposal.customerNumber && (
                          <span>Customer #{proposal.customerNumber}</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-white/60 uppercase tracking-widest mb-1">To</p>
                    <p className="text-white font-bold text-base">{proposal.customer.customerName}</p>
                    {proposal.customer.contactPerson && <p className="text-white/80 text-sm">Attn: {proposal.customer.contactPerson}</p>}
                    {proposal.customer.location && <p className="text-white/70 text-xs mt-0.5">{proposal.customer.location}</p>}
                    {proposal.customer.phone && <p className="text-white/70 text-xs">📞 {proposal.customer.phone}</p>}
                    {proposal.customer.email && <p className="text-white/70 text-xs">✉ {formatEmailForDisplay(proposal.customer.email)}</p>}
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
                contentEditable={canWrite && isEditing}
                suppressContentEditableWarning
                spellCheck={canWrite && isEditing}
                style={canWrite && isEditing ? { outline: 'none', cursor: 'text' } : undefined}
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
                {includeRoofLayout && roofLayout && (
                  <>
                    <Divider />
                    <RoofLayoutBlock layout={roofLayout} />
                  </>
                )}
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
                      }}
                      collapsed={bomCollapsed}
                      setCollapsed={setBomCollapsed}
                      allCollapsed={bomAllCollapsed}
                      setAllCollapsed={setBomAllCollapsed}
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
                <Divider />
                <SectionBlock title="Subsidy Disclaimer and Payment Terms" content={SUBSIDY_DISCLAIMER_TEXT} />
              </div>

              {/* Footer — Save + Export */}
              <div className="print-hide border-t border-primary-100 bg-gradient-to-br from-primary-50/30 to-transparent px-5 sm:px-8 py-4">
                {/* Meta line — visible on all screens, smaller on mobile */}
                <p className="text-[10px] sm:text-xs text-secondary-400 mb-3 sm:mb-0 sm:hidden">
                  Ref: {proposal.refNumber} · {new Date(proposal.generatedAt).toLocaleDateString('en-IN')}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: meta — desktop only */}
                  <p className="text-xs text-secondary-400 hidden sm:block">
                    Generated {new Date(proposal.generatedAt).toLocaleString('en-IN')} · {proposal.refNumber}
                    {savedToCustomer && saveStatus === 'saved' && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                        ✓ Saved to {savedToCustomer}
                      </span>
                    )}
                  </p>

                  {/* Right: actions — stack on mobile, row on sm+ */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                    {/* Save button (bottom) */}
                    {canWrite && (
                      <button
                        onClick={handleSave}
                        disabled={saveStatus === 'saving' || !!exporting}
                        className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-all min-h-[44px] sm:min-h-0 ${
                          saveStatus === 'saved'
                            ? 'bg-emerald-500 text-white border border-emerald-400'
                            : 'bg-white text-primary-800 border border-primary-200 hover:bg-primary-50'
                        }`}
                      >
                        {saveStatus === 'saving' && (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {saveStatus === 'saved' ? '✓ Saved' : '💾 Save'}
                      </button>
                    )}

                    {/* Save & Close (bottom) */}
                    {canWrite && proposal && (
                      <button
                        onClick={handleSaveAndClose}
                        disabled={saveStatus === 'saving' || !!exporting}
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-all min-h-[44px] sm:min-h-0 bg-amber-300 text-slate-900 border border-amber-400 hover:bg-amber-400"
                      >
                        Save &amp; Close
                      </button>
                    )}

                    {/* Export buttons row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportPdf}
                        disabled={!!exporting || saveStatus === 'saving'}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-60 min-h-[44px] sm:min-h-0"
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
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-60 min-h-[44px] sm:min-h-0"
                        style={{ background: '#374151' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#374151')}
                      >
                        {exporting === 'docx'
                          ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : '⬇'}
                        Export DOCX
                      </button>
                      <button
                        onClick={handleOpenShareModal}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all min-h-[44px] sm:min-h-0"
                        style={{ background: '#374151' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#374151')}
                        title="Share as link"
                      >
                        🔗 Share
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share as Link modal — look and feel aligned with Activity Time-out modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={() => setShareModalOpen(false)}>
          <div className="rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 max-w-md w-full px-4 py-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Share proposal as link</h2>
              <button type="button" onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            {shareLink ? (
              <>
                <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Proposal link</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${shareLinkCopied ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'}`}
                  >
                    {shareLinkCopied ? '✓ Copied' : 'Copy link'}
                  </button>
                </div>
                <p className="text-xs text-slate-200">Anyone with this link can view the proposal (read-only) until it expires.</p>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shareUsePassword} onChange={e => setShareUsePassword(e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-slate-200">Password</span>
                </label>
                {shareUsePassword && (
                  <input
                    type="password"
                    value={sharePassword}
                    onChange={e => setSharePassword(e.target.value)}
                    placeholder="Set a password for this link"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400"
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shareUseCustomValidity} onChange={e => setShareUseCustomValidity(e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-slate-200">Custom validity</span>
                </label>
                {shareUseCustomValidity ? (
                  <input
                    type="date"
                    value={shareExpiryDate}
                    onChange={e => setShareExpiryDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                ) : (
                  <p className="text-xs text-slate-300">Standard 48 hour expiry</p>
                )}
                {shareError && <p className="text-sm text-amber-300">{shareError}</p>}
                <button
                  type="button"
                  onClick={handleCreateShare}
                  disabled={shareCreating}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 border border-amber-300 disabled:opacity-60 transition-colors"
                >
                  {shareCreating ? 'Generating…' : 'Generate link'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
