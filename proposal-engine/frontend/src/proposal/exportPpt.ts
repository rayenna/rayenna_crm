import type PptxGenJS from 'pptxgenjs';
import type { ProposalCustomSectionBeforeBoq } from '../lib/customerStore';
import { formatEmailForDisplay } from '../lib/customerStore';
import type { AiRoofLayoutResponse } from '../lib/apiClient';
import { CATEGORIES, sheetTotalGst } from '../lib/costingConstants';
import { fmtINR, fmtINRFull } from './format';
import {
  ABOUT_HIGHLIGHTS,
  CLIENT_SCOPE,
  DELIVERY_TERMS,
  OUR_PROCESS_STEPS,
  OUR_SERVICES,
  PAYMENT_TERMS,
  SCOPE_SECTIONS,
  SUBSIDY_DISCLAIMER_TEXT,
  TERMS_AND_CONDITIONS,
  WARRANTY_TERMS,
} from './proposalCopy';
import { proposalForHeading } from './systemTypeLabel';
import type { ProposalData, TextOverrides } from './types';

const NAVY = '0d1b3a';
const GOLD = 'eab308';
const WHITE = 'FFFFFF';
const SLATE = '334155';
const MUTED = '64748b';
const LIGHT = 'F8FAFC';
const CARD = 'EEF2FF';
const FONT = 'Calibri';

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export function proposalDownloadStem(p: ProposalData): string {
  const name = (p.customer.customerName || 'Customer').replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
  const ref = p.refNumber.replace(/\//g, '-');
  return `Rayenna_Proposal_${name}_${ref}`;
}

export function commercialsFromProposal(p: ProposalData): {
  grandRounded: number;
  preGst: number;
  gstAmount: number;
  gstLabel: string;
  sizeKw: number;
  subsidyAmt: number;
  showSubsidy: boolean;
} | null {
  const grandTotal = p.sheet?.grandTotal ?? p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
  if (!grandTotal) return null;
  const grandRounded = Math.round(grandTotal);
  const subsidyAmt = p.roi?.inputs?.subsidyAmount ?? 0;
  const showSubsidy = !!p.roi?.inputs?.subsidyEligible && subsidyAmt > 0;
  const sizeKw =
    p.systemSizeKw > 0 ? p.systemSizeKw : (p.roiAutofill?.systemSizeKw ?? p.sheet?.systemSizeKw ?? 0);
  if (p.sheet) {
    const sheetGst =
      p.sheet.totalGst != null && p.sheet.totalGst > 0
        ? p.sheet.totalGst
        : p.sheet.items?.length
          ? sheetTotalGst(p.sheet.items, p.sheet.marginPercent ?? 15)
          : 0;
    const gstAmount = Math.round(sheetGst);
    return {
      grandRounded,
      preGst: Math.round(grandRounded - gstAmount),
      gstAmount,
      gstLabel: 'GST (mixed: 5% & 18%)',
      sizeKw,
      subsidyAmt,
      showSubsidy,
    };
  }
  const preGst = Math.round(grandRounded / 1.18);
  return {
    grandRounded,
    preGst,
    gstAmount: Math.round(grandRounded - preGst),
    gstLabel: 'GST @ 18% (estimate)',
    sizeKw,
    subsidyAmt,
    showSubsidy,
  };
}

function ov(overrides: TextOverrides | undefined, key: string, fallback: string): string {
  const v = overrides?.[key]?.trim();
  return v || fallback;
}

function arrayBufferToDataUrl(buf: ArrayBuffer, mime = 'image/jpeg'): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function imageElToBuffer(img: HTMLImageElement): Promise<ArrayBuffer | undefined> {
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }
  if (!img.naturalWidth) return undefined;
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(undefined);
      return;
    }
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(undefined);
          return;
        }
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as ArrayBuffer);
        fr.onerror = () => resolve(undefined);
        fr.readAsArrayBuffer(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
}

async function loadImages(container?: HTMLElement | null): Promise<{
  logo?: string;
  diagram?: string;
  roof?: string;
}> {
  let logoBuf: ArrayBuffer | undefined;
  let diagramBuf: ArrayBuffer | undefined;
  let roofBuf: ArrayBuffer | undefined;
  if (container) {
    const logoImg =
      container.querySelector<HTMLImageElement>('[data-docx-image="logo"]') ??
      container.querySelector<HTMLImageElement>('img[src*="rayenna_logo"]');
    const diagramImg =
      container.querySelector<HTMLImageElement>('[data-docx-image="diagram"]') ??
      container.querySelector<HTMLImageElement>('img[src*="rayenna_proposal"]');
    const roofImg = container.querySelector<HTMLImageElement>('[data-docx-image="roof-layout"]');
    try {
      if (logoImg) logoBuf = await imageElToBuffer(logoImg);
      if (diagramImg) diagramBuf = await imageElToBuffer(diagramImg);
      if (roofImg) roofBuf = await imageElToBuffer(roofImg);
    } catch {
      /* best-effort */
    }
  }
  if (!logoBuf || !diagramBuf) {
    try {
      const [logoResp, diagResp] = await Promise.all([
        fetch('/rayenna_logo.jpg'),
        fetch('/rayenna_proposal.jpg'),
      ]);
      if (!logoBuf && logoResp.ok) logoBuf = await logoResp.arrayBuffer();
      if (!diagramBuf && diagResp.ok) diagramBuf = await diagResp.arrayBuffer();
    } catch {
      /* optional */
    }
  }
  return {
    logo: logoBuf ? arrayBufferToDataUrl(logoBuf) : undefined,
    diagram: diagramBuf ? arrayBufferToDataUrl(diagramBuf) : undefined,
    roof: roofBuf ? arrayBufferToDataUrl(roofBuf) : undefined,
  };
}

function addFooterMeta(slide: PptxGenJS.Slide, p: ProposalData) {
  slide.addText('Rayenna Energy Private Limited  ·  Confidential', {
    x: 0.45,
    y: 7.24,
    w: 8.4,
    h: 0.22,
    fontFace: FONT,
    fontSize: 10,
    color: WHITE,
  });
  slide.addText(p.refNumber, {
    x: 9.0,
    y: 7.24,
    w: 3.85,
    h: 0.22,
    fontFace: FONT,
    fontSize: 10,
    color: GOLD,
    align: 'right',
  });
}

function addSectionTitle(slide: PptxGenJS.Slide, title: string, eyebrow?: string) {
  if (eyebrow) {
    slide.addText(eyebrow.toUpperCase(), {
      x: 0.5,
      y: 0.28,
      w: 12.3,
      h: 0.22,
      fontFace: FONT,
      fontSize: 10,
      color: GOLD,
      bold: true,
      charSpacing: 2,
    });
  }
  slide.addText(title, {
    x: 0.5,
    y: eyebrow ? 0.48 : 0.28,
    w: 12.3,
    h: 0.4,
    fontFace: FONT,
    fontSize: 22,
    color: NAVY,
    bold: true,
  });
  slide.addShape('rect', {
    x: 0.5,
    y: eyebrow ? 0.92 : 0.72,
    w: 1.6,
    h: 0.05,
    fill: { color: GOLD },
    line: { color: GOLD },
  });
}

function contentTop(hasEyebrow: boolean) {
  return hasEyebrow ? 1.12 : 0.92;
}

export async function exportToPpt(
  p: ProposalData,
  options?: {
    bomComments?: Record<string, string>;
    textOverrides?: TextOverrides;
    container?: HTMLElement | null;
    roofLayout?: AiRoofLayoutResponse | null;
    customSectionsBeforeBoq?: ProposalCustomSectionBeforeBoq[];
  },
): Promise<void> {
  const overrides = options?.textOverrides;
  const images = await loadImages(options?.container);
  const heading = proposalForHeading(p.systemSizeKw, p.systemType);
  const dateStr = new Date(p.generatedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = `Proposal — ${p.customer.customerName || 'Rayenna Energy'}`;
  pptx.author = 'Rayenna Energy Private Limited';
  pptx.company = 'Rayenna Energy Private Limited';
  pptx.subject = heading;
  pptx.defineSlideMaster({
    title: 'RAYENNA',
    background: { color: WHITE },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: GOLD } } },
      { rect: { x: 0, y: 7.22, w: '100%', h: 0.28, fill: { color: NAVY } } },
    ],
  });

  const newSlide = () => {
    const slide = pptx.addSlide({ masterName: 'RAYENNA' });
    addFooterMeta(slide, p);
    return slide;
  };

  // ── 1. Cover ────────────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addShape('rect', {
      x: 12.55,
      y: 0,
      w: 0.78,
      h: 7.5,
      fill: { color: GOLD },
      line: { color: GOLD },
    });
    if (images.logo) {
      s.addShape('roundRect', {
        x: 0.55,
        y: 0.4,
        w: 1.55,
        h: 1.15,
        fill: { color: WHITE },
        rectRadius: 0.08,
      });
      s.addImage({ data: images.logo, x: 0.68, y: 0.5, w: 1.3, h: 0.95 });
    }
    s.addText('RAYENNA ENERGY PRIVATE LIMITED', {
      x: 2.3,
      y: 0.55,
      w: 9.8,
      h: 0.38,
      fontFace: FONT,
      fontSize: 16,
      color: WHITE,
      bold: true,
    });
    s.addText('Door No. 3329/52, Ray Bhavan, NH Bypass, Thykoodam, Kochi – 682019', {
      x: 2.3,
      y: 0.92,
      w: 9.8,
      h: 0.22,
      fontFace: FONT,
      fontSize: 11,
      color: 'CBD5E1',
    });
    s.addText('sales@rayenna.energy  ·  +91 7907 369 304  ·  www.rayennaenergy.com', {
      x: 2.3,
      y: 1.14,
      w: 9.8,
      h: 0.2,
      fontFace: FONT,
      fontSize: 10,
      color: '94A3B8',
    });

    s.addText('PROPOSAL FOR', {
      x: 0.55,
      y: 2.35,
      w: 11.6,
      h: 0.28,
      fontFace: FONT,
      fontSize: 12,
      color: GOLD,
      bold: true,
      charSpacing: 3,
    });
    s.addText(heading, {
      x: 0.55,
      y: 2.68,
      w: 11.6,
      h: 0.7,
      fontFace: FONT,
      fontSize: 28,
      color: WHITE,
      bold: true,
    });
    if (p.customer.location) {
      s.addText(p.customer.location, {
        x: 0.55,
        y: 3.4,
        w: 11.6,
        h: 0.28,
        fontFace: FONT,
        fontSize: 14,
        color: 'E2E8F0',
      });
    }

    const meta: string[] = [];
    if (p.customer.customerName) meta.push(`To  ${p.customer.customerName}`);
    if (p.customer.contactPerson) meta.push(`Attn  ${p.customer.contactPerson}`);
    if (p.customer.phone) meta.push(p.customer.phone);
    const email = formatEmailForDisplay(p.customer.email);
    if (email) meta.push(email);
    s.addText(meta.join('   ·   '), {
      x: 0.55,
      y: 4.15,
      w: 11.6,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13,
      color: WHITE,
    });

    s.addText(`Ref  ${p.refNumber}`, {
      x: 0.55,
      y: 6.55,
      w: 7,
      h: 0.28,
      fontFace: FONT,
      fontSize: 12,
      color: GOLD,
    });
    s.addText(dateStr, {
      x: 7.6,
      y: 6.55,
      w: 4.5,
      h: 0.28,
      fontFace: FONT,
      fontSize: 12,
      color: WHITE,
      align: 'right',
    });
  }

  // ── 2. Executive summary ────────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'Executive Summary', 'Overview');
    const y0 = contentTop(true);
    const name = p.customer.customerName || 'Valued Customer';
    s.addShape('roundRect', {
      x: 0.5,
      y: y0,
      w: 12.3,
      h: 0.85,
      fill: { color: NAVY },
      rectRadius: 0.08,
    });
    s.addText('Prepared exclusively for', {
      x: 0.7,
      y: y0 + 0.1,
      w: 11.9,
      h: 0.22,
      fontFace: FONT,
      fontSize: 10,
      color: GOLD,
    });
    s.addText(name, {
      x: 0.7,
      y: y0 + 0.32,
      w: 11.9,
      h: 0.4,
      fontFace: FONT,
      fontSize: 18,
      color: WHITE,
      bold: true,
    });

    const p1 = ov(
      overrides,
      'exec-summary-p1',
      `Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the design, supply, installation, and commissioning of a ${p.systemSizeKw > 0 ? `${p.systemSizeKw} kW ` : ''}${proposalForHeading(0, p.systemType).replace(' Solar Power Plant', '')} Solar Photovoltaic Power Plant at your premises${p.customer.location ? ` in ${p.customer.location}` : ''}.`,
    );
    const p2 = ov(
      overrides,
      'exec-summary-p2',
      'This proposal has been prepared based on a detailed assessment of your energy requirements and site conditions. The proposed solar system will significantly reduce your electricity costs, provide energy independence, and contribute to a cleaner environment.',
    );
    s.addText(p1, {
      x: 0.5,
      y: y0 + 1.05,
      w: 12.3,
      h: 1.15,
      fontFace: FONT,
      fontSize: 14,
      color: SLATE,
      valign: 'top',
    });
    s.addText(p2, {
      x: 0.5,
      y: y0 + 2.2,
      w: 12.3,
      h: 0.9,
      fontFace: FONT,
      fontSize: 13,
      color: MUTED,
      valign: 'top',
    });

    const cost = p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
    const cards = [
      p.systemSizeKw > 0 ? { label: 'System Capacity', value: `${p.systemSizeKw} kW` } : null,
      cost > 0 ? { label: 'Project Investment', value: fmtINR(cost) } : null,
      p.roi ? { label: 'Payback Period', value: `${p.roi.paybackYears.toFixed(1)} yrs` } : null,
      p.roi ? { label: '25-Year Savings', value: fmtINR(p.roi.totalSavings25Years) } : null,
    ].filter((c): c is { label: string; value: string } => !!c);
    cards.forEach((c, i) => {
      const x = 0.5 + i * 3.15;
      s.addShape('roundRect', {
        x,
        y: 5.85,
        w: 3.0,
        h: 1.1,
        fill: { color: CARD },
        rectRadius: 0.08,
      });
      s.addText(c.label.toUpperCase(), {
        x: x + 0.15,
        y: 5.95,
        w: 2.7,
        h: 0.28,
        fontFace: FONT,
        fontSize: 10,
        color: MUTED,
        bold: true,
      });
      s.addText(c.value, {
        x: x + 0.15,
        y: 6.28,
        w: 2.7,
        h: 0.5,
        fontFace: FONT,
        fontSize: 18,
        color: NAVY,
        bold: true,
      });
    });
  }

  // ── 3. About ────────────────────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'About Rayenna Energy', 'Who we are');
    const about =
      ov(
        overrides,
        'about-p1',
        'Rayenna Energy Private Limited is a leading solar energy solutions provider based in Kochi, Kerala. We specialise in the design, supply, installation, and commissioning of On-Grid, Off-Grid, and Hybrid Solar Power Plants for residential, commercial, and industrial clients across India.',
      ) +
      '\n\n' +
      ov(
        overrides,
        'about-p2',
        'Our team of experienced engineers and technicians ensures that every installation meets the highest standards of quality, safety, and performance.',
      );
    s.addText(about, {
      x: 0.5,
      y: contentTop(true),
      w: 12.3,
      h: 1.5,
      fontFace: FONT,
      fontSize: 14,
      color: SLATE,
    });
    ABOUT_HIGHLIGHTS.forEach((h, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.5 + col * 6.2;
      const y = 2.85 + row * 1.25;
      s.addShape('roundRect', {
        x,
        y,
        w: 5.95,
        h: 1.1,
        fill: { color: i % 2 === 0 ? LIGHT : CARD },
        rectRadius: 0.08,
      });
      s.addText(h.text, {
        x: x + 0.25,
        y: y + 0.22,
        w: 5.45,
        h: 0.66,
        fontFace: FONT,
        fontSize: 13,
        color: NAVY,
        valign: 'middle',
      });
    });
  }

  // ── 4. What we offer ────────────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'What We Offer', 'Solutions');
    const intro = ov(
      overrides,
      'what-we-offer-intro',
      'We at Rayenna understand that energy requirements vary from one client to another, which is why our services are designed with flexibility in mind.',
    );
    s.addText(intro, {
      x: 0.5,
      y: contentTop(true),
      w: images.diagram ? 7.4 : 12.3,
      h: 1.5,
      fontFace: FONT,
      fontSize: 13,
      color: SLATE,
    });
    if (images.diagram) {
      s.addImage({ data: images.diagram, x: 8.15, y: 1.15, w: 4.6, h: 2.0 });
    }
    OUR_SERVICES.forEach((svc, i) => {
      const x = 0.5 + i * 4.15;
      s.addShape('roundRect', {
        x,
        y: 3.55,
        w: 3.95,
        h: 3.3,
        fill: { color: CARD },
        rectRadius: 0.1,
      });
      s.addShape('rect', {
        x,
        y: 3.55,
        w: 0.1,
        h: 3.3,
        fill: { color: GOLD },
        line: { color: GOLD },
      });
      s.addText(svc.title.toUpperCase(), {
        x: x + 0.3,
        y: 3.75,
        w: 3.45,
        h: 0.55,
        fontFace: FONT,
        fontSize: 14,
        color: NAVY,
        bold: true,
      });
      s.addText(svc.desc, {
        x: x + 0.3,
        y: 4.4,
        w: 3.45,
        h: 2.15,
        fontFace: FONT,
        fontSize: 13,
        color: SLATE,
      });
    });
  }

  // ── 5. Financial benefits ───────────────────────────────────────────────
  if (p.roi) {
    const r = p.roi;
    const s = newSlide();
    addSectionTitle(s, 'Financial Benefits & Savings', 'Returns');
    const kpis = [
      { label: 'Annual Generation', value: `${r.annualGeneration.toLocaleString('en-IN')} kWh` },
      { label: 'Year-1 Savings', value: fmtINR(r.annualSavings) },
      { label: 'Payback Period', value: `${r.paybackYears.toFixed(1)} yrs` },
      { label: '25-Year Savings', value: fmtINR(r.totalSavings25Years) },
      { label: 'ROI', value: `${r.roiPercent.toFixed(1)}%` },
      { label: 'CO₂ Offset', value: `${r.co2OffsetTons.toFixed(1)} T` },
    ];
    kpis.forEach((k, i) => {
      const x = 0.5 + (i % 3) * 4.15;
      const y = 1.2 + Math.floor(i / 3) * 1.55;
      s.addShape('roundRect', {
        x,
        y,
        w: 3.95,
        h: 1.4,
        fill: { color: i % 2 === 0 ? NAVY : CARD },
        rectRadius: 0.08,
      });
      s.addText(k.label.toUpperCase(), {
        x: x + 0.2,
        y: y + 0.18,
        w: 3.55,
        h: 0.3,
        fontFace: FONT,
        fontSize: 11,
        color: i % 2 === 0 ? GOLD : MUTED,
        bold: true,
      });
      s.addText(k.value, {
        x: x + 0.2,
        y: y + 0.55,
        w: 3.55,
        h: 0.6,
        fontFace: FONT,
        fontSize: 22,
        color: i % 2 === 0 ? WHITE : NAVY,
        bold: true,
      });
    });
    const lcoe = ov(
      overrides,
      'financial-p1',
      `Levelised Cost of Energy: ₹${r.lcoe.toFixed(4)}/kWh versus the current grid tariff of ₹${r.inputs.tariff}/kWh.`,
    );
    s.addText(lcoe, {
      x: 0.5,
      y: 4.5,
      w: 12.3,
      h: 0.7,
      fontFace: FONT,
      fontSize: 13,
      color: SLATE,
    });
    s.addText(
      ov(
        overrides,
        'financial-p2',
        `With ${r.inputs.escalationPercent}% assumed annual tariff escalation, savings compound over the 25-year life of the plant.`,
      ),
      {
        x: 0.5,
        y: 5.2,
        w: 12.3,
        h: 0.7,
        fontFace: FONT,
        fontSize: 13,
        color: MUTED,
      },
    );

    const rows = r.yearlyBreakdown ?? [];
    const pickYears = [1, 5, 10, 15, 20, 25];
    const picked = pickYears
      .map((yr) => rows.find((row) => row.year === yr))
      .filter((row): row is NonNullable<typeof rows[number]> => !!row);
    if (picked.length > 0) {
      const s2 = newSlide();
      addSectionTitle(s2, '25-Year Savings Snapshot', 'Projection');
      s2.addTable(
        [
          [
            { text: 'Year', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
            { text: 'Generation', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
            { text: 'Annual Savings', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
            { text: 'Cumulative', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
          ],
          ...picked.map((row, i) => [
            {
              text: String(row.year),
              options: { fill: { color: i % 2 ? LIGHT : WHITE }, color: NAVY, bold: true },
            },
            {
              text: `${Math.round(row.generation).toLocaleString('en-IN')} kWh`,
              options: { fill: { color: i % 2 ? LIGHT : WHITE }, color: SLATE },
            },
            {
              text: fmtINR(row.savings),
              options: { fill: { color: i % 2 ? LIGHT : WHITE }, color: SLATE },
            },
            {
              text: fmtINR(row.cumulativeSavings),
              options: { fill: { color: i % 2 ? LIGHT : WHITE }, color: NAVY, bold: true },
            },
          ]),
        ],
        {
          x: 0.5,
          y: 1.2,
          w: 12.3,
          colW: [2.2, 3.4, 3.35, 3.35],
          border: { pt: 0.4, color: 'E2E8F0' },
          fontFace: FONT,
          fontSize: 13,
          align: 'left',
          valign: 'middle',
        },
      );
    }
  }

  // ── 6. Environmental ────────────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'Environmental Impact', 'Sustainability');
    const name = p.customer.customerName || 'your organisation';
    const co2 = p.roi?.co2OffsetTons;
    const gen = p.roi?.annualGeneration;
    const cards = [
      {
        title: 'Carbon reduction',
        body: co2
          ? `Over 25 years the system offsets about ${co2.toFixed(1)} tonnes of CO₂.`
          : 'The plant reduces carbon emissions across its 25-year life.',
      },
      {
        title: 'Clean generation',
        body: gen
          ? `${gen.toLocaleString('en-IN')} kWh of renewable electricity every year.`
          : 'Clean electricity generated on site, year after year.',
      },
      {
        title: 'National mission',
        body: `Aligns with India's National Solar Mission and ${name}'s sustainability goals.`,
      },
      {
        title: 'Long-term value',
        body: 'Designed for 25 years of yield, with monitoring and after-sales support.',
      },
    ];
    cards.forEach((c, i) => {
      const x = 0.5 + (i % 2) * 6.2;
      const y = 1.2 + Math.floor(i / 2) * 2.7;
      s.addShape('roundRect', {
        x,
        y,
        w: 5.95,
        h: 2.45,
        fill: { color: i % 2 === 0 ? CARD : LIGHT },
        rectRadius: 0.1,
      });
      s.addText(c.title.toUpperCase(), {
        x: x + 0.3,
        y: y + 0.28,
        w: 5.35,
        h: 0.4,
        fontFace: FONT,
        fontSize: 13,
        color: NAVY,
        bold: true,
      });
      s.addText(c.body, {
        x: x + 0.3,
        y: y + 0.8,
        w: 5.35,
        h: 1.3,
        fontFace: FONT,
        fontSize: 14,
        color: SLATE,
      });
    });
  }

  // ── 7. Roof layout ──────────────────────────────────────────────────────
  if (options?.roofLayout && images.roof) {
    const layout = options.roofLayout;
    const s = newSlide();
    addSectionTitle(s, 'Proposed Roof Layout', 'Site');
    s.addImage({ data: images.roof, x: 0.5, y: 1.2, w: 7.6, h: 5.5 });
    const stats = [
      ['Roof area', `${Number(layout.roof_area_m2).toFixed(1)} m²`],
      ['Usable area', `${Number(layout.usable_area_m2).toFixed(1)} m²`],
      ['Panel count', String(layout.panel_count)],
      ...(p.systemSizeKw > 0 ? [['System size', `${p.systemSizeKw} kW`]] : []),
    ];
    stats.forEach((row, i) => {
      const y = 1.2 + i * 1.15;
      s.addShape('roundRect', {
        x: 8.35,
        y,
        w: 4.45,
        h: 1.0,
        fill: { color: CARD },
        rectRadius: 0.08,
      });
      s.addText(row[0].toUpperCase(), {
        x: 8.55,
        y: y + 0.12,
        w: 4.05,
        h: 0.28,
        fontFace: FONT,
        fontSize: 10,
        color: MUTED,
        bold: true,
      });
      s.addText(row[1], {
        x: 8.55,
        y: y + 0.4,
        w: 4.05,
        h: 0.45,
        fontFace: FONT,
        fontSize: 18,
        color: NAVY,
        bold: true,
      });
    });
  }

  // ── 8. Process ──────────────────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'Our Process', 'Delivery');
    s.addText(
      ov(
        overrides,
        'our-process-intro',
        'The Rayenna journey is clear and easy — from consultation to ongoing support.',
      ),
      {
        x: 0.5,
        y: contentTop(true),
        w: 12.3,
        h: 0.55,
        fontFace: FONT,
        fontSize: 13,
        color: SLATE,
      },
    );
    OUR_PROCESS_STEPS.forEach((step, i) => {
      const x = 0.5 + i * 2.5;
      s.addShape('ellipse', {
        x: x + 0.85,
        y: 1.9,
        w: 0.55,
        h: 0.55,
        fill: { color: NAVY },
      });
      s.addText(String(i + 1), {
        x: x + 0.85,
        y: 1.98,
        w: 0.55,
        h: 0.4,
        fontFace: FONT,
        fontSize: 14,
        color: GOLD,
        bold: true,
        align: 'center',
      });
      s.addText(step.title, {
        x,
        y: 2.6,
        w: 2.35,
        h: 0.45,
        fontFace: FONT,
        fontSize: 13,
        color: NAVY,
        bold: true,
        align: 'center',
      });
      s.addText(step.desc, {
        x,
        y: 3.1,
        w: 2.35,
        h: 2.4,
        fontFace: FONT,
        fontSize: 12,
        color: SLATE,
        align: 'center',
      });
    });
  }

  // ── 9. Scope ────────────────────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'Scope of Work', 'Delivery');
    SCOPE_SECTIONS.forEach((sec, i) => {
      const x = 0.5 + (i % 2) * 6.2;
      const y = 1.15 + Math.floor(i / 2) * 2.85;
      s.addShape('roundRect', {
        x,
        y,
        w: 5.95,
        h: 2.65,
        fill: { color: LIGHT },
        rectRadius: 0.08,
      });
      s.addText(sec.title, {
        x: x + 0.25,
        y: y + 0.15,
        w: 5.45,
        h: 0.35,
        fontFace: FONT,
        fontSize: 14,
        color: NAVY,
        bold: true,
      });
      s.addText(sec.items.map((item) => `•  ${item}`).join('\n'), {
        x: x + 0.25,
        y: y + 0.55,
        w: 5.45,
        h: 1.9,
        fontFace: FONT,
        fontSize: 12,
        color: SLATE,
      });
    });
  }

  // ── 10. Custom sections ─────────────────────────────────────────────────
  const custom = (options?.customSectionsBeforeBoq ?? []).filter(
    (sec) => sec.title.trim() || htmlToPlainText(sec.bodyHtml || ''),
  );
  custom.forEach((sec) => {
    const s = newSlide();
    addSectionTitle(s, sec.title.trim() || 'Additional Section', 'Project notes');
    s.addText(htmlToPlainText(sec.bodyHtml || '') || ' ', {
      x: 0.5,
      y: contentTop(true),
      w: 12.3,
      h: 5.7,
      fontFace: FONT,
      fontSize: 14,
      color: SLATE,
      valign: 'top',
    });
  });

  // ── 11. BOQ ─────────────────────────────────────────────────────────────
  if (p.bom.length > 0) {
    const grouped = CATEGORIES.map(({ value, label }) => ({
      cat: value,
      label,
      rows: p.bom.filter((r) => r.category === value),
    })).filter((g) => g.rows.length > 0);

    const header: PptxGenJS.TableRow = [
      { text: '#', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
      { text: 'Item', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
      { text: 'Specification', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
      { text: 'Qty', options: { fill: { color: NAVY }, color: WHITE, bold: true } },
    ];
    const allRows: PptxGenJS.TableRow[] = [];
    let serial = 0;
    grouped.forEach(({ cat, label, rows }) => {
      allRows.push([
        {
          text: label.toUpperCase(),
          options: { fill: { color: GOLD }, color: NAVY, bold: true, colspan: 4 },
        },
      ]);
      rows.forEach((item) => {
        serial += 1;
        const stripe = serial % 2 ? WHITE : LIGHT;
        allRows.push([
          { text: String(serial), options: { fill: { color: stripe }, color: MUTED } },
          { text: item.itemName, options: { fill: { color: stripe }, color: NAVY, bold: true } },
          {
            text: item.specification || '—',
            options: { fill: { color: stripe }, color: SLATE },
          },
          { text: item.quantity, options: { fill: { color: stripe }, color: SLATE, align: 'right' } },
        ]);
      });
      const note = options?.bomComments?.[cat];
      if (note) {
        allRows.push([
          {
            text: `Note: ${note}`,
            options: { fill: { color: 'FEF3C7' }, color: SLATE, italic: true, colspan: 4 },
          },
        ]);
      }
    });

    const PAGE = 9;
    for (let i = 0; i < allRows.length; i += PAGE) {
      const chunk = allRows.slice(i, i + PAGE);
      const s = newSlide();
      addSectionTitle(
        s,
        i === 0 ? 'Bill of Quantities' : 'Bill of Quantities (continued)',
        'Equipment',
      );
      s.addTable([header, ...chunk], {
        x: 0.5,
        y: 1.15,
        w: 12.3,
        colW: [0.7, 4.0, 6.1, 1.5],
        border: { pt: 0.35, color: 'E2E8F0' },
        fontFace: FONT,
        fontSize: 11,
        valign: 'middle',
        align: 'left',
      });
    }
  }

  // ── 12. Commercials ─────────────────────────────────────────────────────
  const commercials = commercialsFromProposal(p);
  if (commercials) {
    const s = newSlide();
    addSectionTitle(s, 'Commercials', 'Investment');
    const desc = `Design, Supply, Installation & Commissioning of ${
      commercials.sizeKw > 0 ? `${commercials.sizeKw} kW ` : ''
    }${proposalForHeading(0, p.systemType)} including all electrical and structural work`;
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: desc, options: { fill: { color: WHITE }, color: SLATE } },
        {
          text: fmtINRFull(commercials.preGst),
          options: { fill: { color: WHITE }, color: NAVY, bold: true, align: 'right' },
        },
      ],
      [
        { text: commercials.gstLabel, options: { fill: { color: LIGHT }, color: '1D4ED8' } },
        {
          text: fmtINRFull(commercials.gstAmount),
          options: { fill: { color: LIGHT }, color: '1D4ED8', bold: true, align: 'right' },
        },
      ],
      [
        {
          text: 'TOTAL PROJECT COST (incl. GST)',
          options: { fill: { color: NAVY }, color: WHITE, bold: true },
        },
        {
          text: fmtINRFull(commercials.grandRounded),
          options: { fill: { color: NAVY }, color: GOLD, bold: true, align: 'right' },
        },
      ],
    ];
    if (commercials.showSubsidy) {
      rows.push([
        {
          text: `Subsidy eligible – Rs. ${commercials.subsidyAmt.toLocaleString('en-IN')}/-`,
          options: { fill: { color: 'FEF3C7' }, color: '92400E' },
        },
        {
          text: fmtINRFull(commercials.subsidyAmt),
          options: { fill: { color: 'FEF3C7' }, color: '92400E', bold: true, align: 'right' },
        },
      ]);
    }
    s.addTable(rows, {
      x: 0.5,
      y: 1.3,
      w: 12.3,
      colW: [8.8, 3.5],
      border: { pt: 0.4, color: 'E2E8F0' },
      fontFace: FONT,
      fontSize: 14,
      valign: 'middle',
    });
  }

  // ── 13. Payment / warranty / delivery ───────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'Commercial Terms', 'Engagement');
    const blocks = [
      { title: 'Payment Terms', items: PAYMENT_TERMS },
      { title: 'Warranty', items: WARRANTY_TERMS },
      { title: 'Delivery', items: DELIVERY_TERMS },
    ];
    blocks.forEach((b, i) => {
      const x = 0.5 + i * 4.15;
      s.addShape('roundRect', {
        x,
        y: 1.2,
        w: 3.95,
        h: 5.6,
        fill: { color: LIGHT },
        rectRadius: 0.1,
      });
      s.addShape('rect', {
        x,
        y: 1.2,
        w: 3.95,
        h: 0.55,
        fill: { color: NAVY },
      });
      s.addText(b.title.toUpperCase(), {
        x: x + 0.15,
        y: 1.3,
        w: 3.65,
        h: 0.38,
        fontFace: FONT,
        fontSize: 12,
        color: GOLD,
        bold: true,
      });
      s.addText(b.items.map((item, n) => `${n + 1}.  ${item}`).join('\n\n'), {
        x: x + 0.2,
        y: 1.95,
        w: 3.55,
        h: 4.6,
        fontFace: FONT,
        fontSize: 12,
        color: SLATE,
      });
    });
  }

  // ── 14. Account ─────────────────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'Account Details', 'Bank');
    s.addTable(
      [
        ['Name', 'Rayenna Energy Private Limited'],
        ['Type', 'Current Account'],
        ['Bank', 'Axis Bank Limited'],
        ['Account Number', '924020063493172'],
        ['IFSC Code', 'UTIB0000827'],
      ].map((row, i) => [
        {
          text: row[0],
          options: { fill: { color: i % 2 ? LIGHT : WHITE }, color: MUTED, bold: true },
        },
        {
          text: row[1],
          options: { fill: { color: i % 2 ? LIGHT : WHITE }, color: NAVY, bold: true },
        },
      ]),
      {
        x: 0.5,
        y: 1.3,
        w: 12.3,
        colW: [3.5, 8.8],
        border: { pt: 0.35, color: 'E2E8F0' },
        fontFace: FONT,
        fontSize: 16,
        valign: 'middle',
      },
    );
  }

  // ── 15. Client scope + T&Cs ─────────────────────────────────────────────
  {
    const s = newSlide();
    addSectionTitle(s, 'Client Scope', 'Your responsibilities');
    s.addText(
      CLIENT_SCOPE.map((item, i) => `${i + 1}.  ${item}`).join('\n'),
      {
        x: 0.5,
        y: 1.2,
        w: 12.3,
        h: 5.6,
        fontFace: FONT,
        fontSize: 14,
        color: SLATE,
      },
    );
  }
  {
    const s = newSlide();
    addSectionTitle(s, 'Terms & Conditions', 'Offer');
    s.addText(
      TERMS_AND_CONDITIONS.map((item, i) => `${i + 1}.  ${item}`).join('\n'),
      {
        x: 0.5,
        y: 1.2,
        w: 12.3,
        h: 5.6,
        fontFace: FONT,
        fontSize: 12,
        color: SLATE,
      },
    );
  }

  // ── 16. Closing ─────────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.1,
      fill: { color: GOLD },
      line: { color: GOLD },
    });
    s.addText('Thank you', {
      x: 0.7,
      y: 1.5,
      w: 11.8,
      h: 0.7,
      fontFace: FONT,
      fontSize: 36,
      color: GOLD,
      bold: true,
    });
    s.addText(
      `We look forward to partnering with ${p.customer.customerName || 'you'} on this journey towards clean, sustainable energy.`,
      {
        x: 0.7,
        y: 2.35,
        w: 11.8,
        h: 1.1,
        fontFace: FONT,
        fontSize: 18,
        color: WHITE,
      },
    );
    s.addText(
      '+91 7907 369 304\nsales@rayenna.energy\nwww.rayennaenergy.com',
      {
        x: 0.7,
        y: 3.7,
        w: 11.8,
        h: 1.3,
        fontFace: FONT,
        fontSize: 16,
        color: 'E2E8F0',
      },
    );
    s.addText(SUBSIDY_DISCLAIMER_TEXT.slice(0, 280) + '…', {
      x: 0.7,
      y: 5.5,
      w: 11.8,
      h: 1.3,
      fontFace: FONT,
      fontSize: 10,
      color: '94A3B8',
    });
  }

  await pptx.writeFile({ fileName: `${proposalDownloadStem(p)}.pptx` });
}
