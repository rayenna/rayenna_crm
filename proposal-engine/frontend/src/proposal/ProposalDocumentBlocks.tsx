import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/costingConstants';
import type { BomRowGenerated, Category } from '../lib/costingConstants';
import { getActiveCustomer, getWipKeysForCurrentUser, formatEmailForDisplay } from '../lib/customerStore';
import type { ProposalCustomSectionBeforeBoq } from '../lib/customerStore';
import { getApiBaseUrl, type AiRoofLayoutResponse } from '../lib/apiClient';
import { fmtINR, fmtINRFull } from './format';
import { buildDocx } from './exportDocx';
import { getLatestSheet, getBom } from './proposalAssembly';
import type { CustomerDetails, ProposalData, ROIResult, TextOverrides, YearlyRow } from './types';
import {
  ABOUT_HIGHLIGHTS,
  WHAT_WE_OFFER_INTRO,
  OUR_SERVICES,
  OUR_PROCESS_INTRO,
  OUR_PROCESS_STEPS,
  DELIVERY_TERMS,
  scopeSectionsFor,
  closingNoteModel,
  closingText,
  isCollapsedClosingNote,
} from './proposalCopy';
import {
  buildCommercialsWaterfall,
  buildTechDetailCards,
  buildWarrantyRows,
  resolveAuthorityFees,
  resolveExclusions,
  resolveKeyPoints,
  resolveOfferValidity,
  resolvePaymentMilestones,
  resolveRaciRows,
  subsidyCreditNote,
  techDetailsFootnote,
} from './proposalContent';
import {
  proposalForHeading,
  rewriteSystemTypeMentions,
  systemTypeArticle,
  systemTypeCapacityChip,
  systemTypeDiagramAlt,
  systemTypeDiagramSrc,
  systemTypeHeadingTerm,
} from './systemTypeLabel';

function readStorage<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

export const ProposalTextOverridesContext = React.createContext<Record<string, string | undefined>>({});

/** True while Proposal Edit mode is on — tagged sections become uncontrolled contentEditables. */
export const ProposalEditingContext = React.createContext(false);

function plainTextFromNode(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainTextFromNode).join('');
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    // Preserve paragraph breaks from <br /> used in stock copy.
    if (el.type === 'br') return '\n';
    return plainTextFromNode(el.props?.children);
  }
  return '';
}

/**
 * Uncontrolled while editing: React must NOT own the text node.
 * Seed once on Edit enter via layout effect; Save reads live DOM (data-docx-section).
 * Read-only mode renders normal React children from overrides.
 */
function useUncontrolledDocSection(text: string, isEditing: boolean) {
  const ref = React.useRef<HTMLElement | null>(null);
  const seededRef = React.useRef(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isEditing) {
      if (!seededRef.current) {
        el.innerText = text;
        seededRef.current = true;
      }
      return;
    }
    seededRef.current = false;
  }, [isEditing, text]);

  return {
    ref,
    contentEditable: isEditing,
    /** While editing, pass no children so React cannot snap text back. */
    children: isEditing ? null : text,
  };
}

type EditableTag = 'p' | 'div' | 'span' | 'h2' | 'h3';

/** Any narrative field — uncontrolled while Edit is on so Save cannot snap text back. */
function EditableText({
  sectionKey,
  as: Tag = 'p',
  className,
  style,
  children,
}: {
  sectionKey: string;
  as?: EditableTag;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const map = React.useContext(ProposalTextOverridesContext);
  const isEditing = React.useContext(ProposalEditingContext);
  const o = map[sectionKey];
  // Whitespace-only overrides must not wipe stock copy (e.g. What We Offer intro).
  const text = o != null && o.trim() !== '' ? o : plainTextFromNode(children);
  const edit = useUncontrolledDocSection(text, isEditing);
  return (
    <Tag
      ref={edit.ref as React.RefObject<HTMLElement & HTMLParagraphElement>}
      data-docx-section={sectionKey}
      className={className}
      contentEditable={edit.contentEditable}
      suppressContentEditableWarning
      spellCheck={isEditing}
      style={{
        ...style,
        ...(isEditing
          ? {
              outline: 'none',
              cursor: 'text',
              boxShadow: 'inset 0 0 0 1px rgba(14, 165, 233, 0.35)',
              borderRadius: 4,
            }
          : null),
      }}
    >
      {edit.children}
    </Tag>
  );
}

function EditableListItemText({ text, isEditing }: { text: string; isEditing: boolean }) {
  const edit = useUncontrolledDocSection(text, isEditing);
  return (
    <span
      ref={edit.ref as React.RefObject<HTMLSpanElement>}
      data-docx-list-text
      className="leading-relaxed flex-1 min-w-0"
      contentEditable={edit.contentEditable}
      suppressContentEditableWarning
      spellCheck={isEditing}
      style={
        isEditing
          ? {
              outline: 'none',
              cursor: 'text',
              boxShadow: 'inset 0 0 0 1px rgba(14, 165, 233, 0.35)',
              borderRadius: 4,
            }
          : undefined
      }
    >
      {edit.children}
    </span>
  );
}

function OverriddenParagraph({
  sectionKey,
  className,
  children,
}: {
  sectionKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <EditableText sectionKey={sectionKey} as="p" className={className}>
      {children}
    </EditableText>
  );
}

function OverriddenDiv({
  sectionKey,
  className,
  children,
}: {
  sectionKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <EditableText sectionKey={sectionKey} as="div" className={className}>
      {children}
    </EditableText>
  );
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

export async function exportToDocx(
  p: ProposalData,
  bomComments?: Record<string, string>,
  textOverrides?: TextOverrides,
  container?: HTMLElement | null,
  roofLayout?: AiRoofLayoutResponse | null,
  customSectionsBeforeBoq?: ProposalCustomSectionBeforeBoq[],
  includedOptionalSections?: Record<string, boolean> | null,
  sectionOrder?: string[] | null,
): Promise<void> {
  const docx = await import('docx');

  let diagramImageData: ArrayBuffer | undefined;
  let logoImageData: ArrayBuffer | undefined;
  let roofLayoutImageData: ArrayBuffer | undefined;
  let closingSolarImageData: ArrayBuffer | undefined;

  // 1) Prefer the already-rendered <img> elements inside the proposal.
  // This works consistently on both mobile and desktop and avoids any
  // fetch/CORS quirks; we only fall back to network fetch if needed.
  if (container) {
    try {
      const diagramImg =
        container.querySelector<HTMLImageElement>('[data-docx-image="diagram"]')
        ?? container.querySelector<HTMLImageElement>('img[src*="solar_setup_colorful"]')
        ?? container.querySelector<HTMLImageElement>('img[src*="rayenna_proposal"]');
      const logoImg =
        container.querySelector<HTMLImageElement>('[data-docx-image="logo"]')
        ?? container.querySelector<HTMLImageElement>('img[src*="rayenna_logo"]');
      const roofImg =
        container.querySelector<HTMLImageElement>('[data-docx-image="roof-layout"]') ?? null;
      const closingImg =
        container.querySelector<HTMLImageElement>('[data-docx-image="closing-solar"]')
        ?? container.querySelector<HTMLImageElement>('img[src*="closing_note_solar"]');

      if (diagramImg) {
        diagramImageData = await imageElementToArrayBuffer(diagramImg);
      }
      if (logoImg) {
        logoImageData = await imageElementToArrayBuffer(logoImg);
      }
      if (roofImg) {
        roofLayoutImageData = await imageElementToArrayBuffer(roofImg);
      }
      if (closingImg) {
        closingSolarImageData = await imageElementToArrayBuffer(closingImg);
      }
    } catch {
      // best-effort only; we will still try network fetch below
    }
  }

  // 2) If either image is still missing, try network fetch as a fallback.
  if (!diagramImageData || !logoImageData || !closingSolarImageData) {
    try {
      const [diagResp, logoResp, closingResp] = await Promise.all([
        fetch(systemTypeDiagramSrc(p.systemType)),
        fetch('/rayenna_logo.jpg'),
        fetch('/closing_note_solar.jpg'),
      ]);
      if (!diagramImageData && diagResp.ok) {
        diagramImageData = await diagResp.arrayBuffer();
      }
      if (!logoImageData && logoResp.ok) {
        logoImageData = await logoResp.arrayBuffer();
      }
      if (!closingSolarImageData && closingResp.ok) {
        closingSolarImageData = await closingResp.arrayBuffer();
      }
    } catch {
      // still optional; if fetch fails we just omit the images
    }
  }

  const posterById: Record<string, ArrayBuffer | undefined> = {};
  if (customSectionsBeforeBoq?.length) {
    await Promise.all(
      customSectionsBeforeBoq.map(async (s) => {
        const u = s.mediaPosterUrl?.trim();
        if (!u) return;
        try {
          const res = await fetch(u, { mode: 'cors' });
          if (!res.ok) return;
          posterById[s.id] = await res.arrayBuffer();
        } catch {
          /* CORS or network — poster omitted from Word */
        }
      }),
    );
  }

  const { loadCoverHeroComposited } = await import('./coverHero');
  const coverHero = await loadCoverHeroComposited();

  const doc = buildDocx(
    p,
    diagramImageData,
    bomComments,
    logoImageData,
    textOverrides,
    roofLayout,
    roofLayoutImageData,
    customSectionsBeforeBoq,
    posterById,
    docx,
    includedOptionalSections,
    coverHero?.arrayBuffer,
    sectionOrder,
    closingSolarImageData,
  );
  const blob = await docx.Packer.toBlob(doc);
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

/**
 * Standard gap after a section ends and before the next section heading:
 * one full line above the hairline + one full line below (padding, not margin —
 * margins collapse and looked like “no spacing”).
 */
export function Divider() {
  return (
    <div className="my-0 py-[1em] flex items-center gap-3 pdf-divider" data-pdf-keep="divider">
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

export function SectionBlock({ title, content }: { title: string; content: string }) {
  const meta = SECTION_META[title] ?? { icon: '📌', accent: '#0d1b3a' };
  const sectionKey = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const map = React.useContext(ProposalTextOverridesContext);
  const isEditing = React.useContext(ProposalEditingContext);
  const o = map[sectionKey];
  const text = o != null && o !== '' ? o : content;
  const edit = useUncontrolledDocSection(text, isEditing);
  return (
    <div
      className="mb-0 pdf-section"
      data-pdf-section={sectionKey}
    >
      <div
        className="flex items-center gap-3 mb-4 pdf-section-heading"
        data-pdf-keep="section-heading"
      >
        <div
          className="w-1 rounded-full flex-shrink-0"
          style={{ background: meta.accent, height: '28px' }}
        />
        <span className="text-lg leading-none" aria-hidden>
          {meta.icon}
        </span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: meta.accent }}>
          {title}
        </h2>
      </div>
      <div
        ref={edit.ref as React.RefObject<HTMLDivElement>}
        data-docx-section={sectionKey}
        className="text-secondary-700 text-sm leading-relaxed whitespace-pre-line pl-7"
        contentEditable={edit.contentEditable}
        suppressContentEditableWarning
        spellCheck={isEditing}
        style={isEditing ? { outline: 'none', cursor: 'text' } : undefined}
      >
        {edit.children}
      </div>
    </div>
  );
}

/**
 * Letter-style Closing Note for preview / PDF / share.
 * Structured paragraphs + contact row with links; Edit mode keeps a single
 * contentEditable seeded from closingText() so Save still captures overrides.
 */
export function ClosingNoteBlock({ proposal }: { proposal: ProposalData }) {
  const accent = '#7c3aed';
  const sectionKey = 'section-closing-note';
  const map = React.useContext(ProposalTextOverridesContext);
  const isEditing = React.useContext(ProposalEditingContext);
  const stock = closingText(proposal);
  const o = map[sectionKey];
  const raw = o != null && o !== '' ? o : stock;
  // Seed Edit with letter-spaced stock when a prior save flattened newlines.
  const text = isCollapsedClosingNote(raw) ? stock : raw;
  const edit = useUncontrolledDocSection(text, isEditing);
  const m = closingNoteModel(proposal);
  const useStructured =
    !isEditing && (o == null || o === '' || o === stock || isCollapsedClosingNote(raw));

  const closingImage = (
    <figure className="closing-note-hero m-0 w-full max-w-[200px] sm:max-w-[220px] lg:max-w-[240px] flex-shrink-0 mx-auto lg:mx-0 lg:ml-auto bg-transparent">
      <img
        data-docx-image="closing-solar"
        src="/closing_note_solar.jpg"
        alt="Growing clean energy — hands holding a living plant and light"
        className="block w-full h-auto rounded-lg bg-transparent"
        style={{
          aspectRatio: '1 / 1',
          objectFit: 'cover',
          // No box-shadow — Chromium print/PDF turns shadows into a solid grey slab.
        }}
      />
    </figure>
  );

  const letterBody = useStructured ? (
    <div
      data-docx-section={sectionKey}
      className="min-w-0 flex-1 text-secondary-700 text-sm leading-7"
    >
      <p className="mb-3.5">{m.para1}</p>
      <p className="mb-3.5">{m.para2}</p>
      <p className="mb-2.5">{m.contactIntro}</p>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-secondary-800">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden>📞</span>
          <a href={`tel:${m.phone.replace(/\s+/g, '')}`} className="hover:underline">
            {m.phone}
          </a>
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden>📧</span>
          <a
            href={`mailto:${m.email}`}
            className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
          >
            {m.email}
          </a>
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden>🌐</span>
          <a
            href={m.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
          >
            {m.website}
          </a>
        </span>
      </div>
      <p className="mb-4">{m.thankYou}</p>
      <p className="mb-1">{m.regards}</p>
      <div className="closing-note-sign-spacer h-8 sm:h-10" aria-hidden />
      <p className="mb-0.5 font-medium text-secondary-800">{m.team}</p>
      <p className="mb-0 text-secondary-800">{m.company}</p>
    </div>
  ) : (
    <div
      ref={edit.ref as React.RefObject<HTMLDivElement>}
      data-docx-section={sectionKey}
      className="min-w-0 flex-1 text-secondary-700 text-sm leading-7 whitespace-pre-line"
      contentEditable={edit.contentEditable}
      suppressContentEditableWarning
      spellCheck={isEditing}
      style={isEditing ? { outline: 'none', cursor: 'text' } : undefined}
    >
      {edit.children}
    </div>
  );

  return (
    <div
      className="mb-0 pdf-section"
      data-pdf-section={sectionKey}
    >
      <div
        className="flex items-center gap-3 mb-4 pdf-section-heading"
        data-pdf-keep="section-heading"
      >
        <div
          className="w-1 rounded-full flex-shrink-0"
          style={{ background: accent, height: '28px' }}
        />
        <span className="text-lg leading-none" aria-hidden>
          🤝
        </span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          Closing Note
        </h2>
      </div>

      {/* Letter left, image right — stacks on small screens */}
      <div className="closing-note-layout pl-0 sm:pl-7 flex flex-col-reverse lg:flex-row lg:items-start gap-6 lg:gap-10">
        {letterBody}
        {closingImage}
      </div>
    </div>
  );
}

export function EnvironmentalImpactBlock({ proposal }: { proposal: ProposalData }) {
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
    <div className="mb-0 pdf-section">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">🌱</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          Environmental Impact
        </h2>
      </div>

      <EditableText
        sectionKey="env-intro"
        as="p"
        className="text-sm text-secondary-700 leading-relaxed mb-5"
      >
        {`By harnessing solar energy, ${name} will make a meaningful contribution to environmental sustainability — reducing carbon emissions, conserving natural resources, and supporting India's clean energy goals.`}
      </EditableText>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bullets.map((b, i) => (
          <div
            key={b.title}
            className="rounded-xl border p-4 flex gap-3"
            style={{ background: b.bg, borderColor: b.border }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
              style={{ background: b.iconBg }}
            >
              {b.icon}
            </div>
            <div className="min-w-0 flex-1">
              <EditableText
                sectionKey={`env-bullet-${i}-title`}
                as="p"
                className="text-sm font-extrabold mb-1"
                style={{ color: accent }}
              >
                {b.title}
              </EditableText>
              <EditableText
                sectionKey={`env-bullet-${i}-body`}
                as="p"
                className="text-xs text-secondary-600 leading-relaxed"
              >
                {b.body}
              </EditableText>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExecutiveSummaryBlock({ proposal }: { proposal: ProposalData }) {
  const accent = '#0d1b3a';
  const sz     = (proposal.roi?.inputs.systemSizeKw ?? 0) > 0
    ? proposal.roi!.inputs.systemSizeKw
    : (proposal.systemSizeKw || proposal.roiAutofill?.systemSizeKw || 0);
  const cost = proposal.roiAutofill?.grandTotal ?? proposal.roi?.inputs.projectCost ?? 0;
  const pb   = proposal.roi?.paybackYears;
  const sav  = proposal.roi?.totalSavings25Years;
  const name = proposal.customer.customerName || 'Valued Customer';
  const loc  = proposal.customer.location;

  const typeTerm = systemTypeHeadingTerm(proposal.systemType);
  const highlights = [
    ...(sz > 0        ? [{ icon: '☀️', label: 'System Capacity',     value: systemTypeCapacityChip(sz, proposal.systemType) }] : []),
    ...(cost > 0      ? [{ icon: '💼', label: 'Project Investment',   value: fmtINR(cost) }] : []),
    ...(pb            ? [{ icon: '⏱️', label: 'Payback Period',       value: `~${pb.toFixed(1)} years` }] : []),
    ...(sav           ? [{ icon: '📈', label: '25-Year Savings',      value: fmtINR(sav) }] : []),
  ];

  return (
    <div className="mb-0 pdf-section">
      {/* Heading */}
      <div className="flex items-center gap-3 mb-4 pdf-section-heading" data-pdf-keep="section-heading">
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
      <OverriddenParagraph sectionKey="exec-summary-p1" className="text-sm text-secondary-700 leading-relaxed mb-4">
        Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the
        design, supply, installation, and commissioning of
        {sz > 0 ? (
          <> a <span className="font-bold text-secondary-800">{sz} kW</span> {typeTerm}</>
        ) : (
          <> {systemTypeArticle(proposal.systemType)} {typeTerm}</>
        )}{' '}
        Solar Photovoltaic Power Plant at your premises{loc ? <> in <span className="font-semibold text-secondary-800">{loc}</span></> : ''}.
      </OverriddenParagraph>
      <OverriddenParagraph sectionKey="exec-summary-p2" className="text-sm text-secondary-700 leading-relaxed mb-5">
        This proposal has been prepared based on a detailed assessment of your energy requirements and
        site conditions. The proposed solar system will significantly reduce your electricity costs,
        provide energy independence, and contribute to a cleaner environment.
      </OverriddenParagraph>

      {/* Key metrics strip — only shown when data is available */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
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

export function AboutRayennaBlock() {
  const accent = '#0369a1';
  return (
    <div className="mb-0 pdf-section">
      {/* Heading */}
      <div className="flex items-center gap-3 mb-4 pdf-section-heading" data-pdf-keep="section-heading">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">🏢</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          About Rayenna Energy
        </h2>
      </div>

      {/* Intro paragraphs */}
      <OverriddenParagraph sectionKey="about-p1" className="text-sm text-secondary-700 leading-relaxed mb-2">
        <span className="font-bold text-secondary-800">Rayenna Energy Private Limited</span> is a leading
        solar energy solutions provider based in Kochi, Kerala. We specialise in the design, supply,
        installation, and commissioning of On-Grid, Off-Grid, and Hybrid Solar Power Plants for
        residential, commercial, and industrial clients across India.
      </OverriddenParagraph>
      <OverriddenParagraph sectionKey="about-p2" className="text-sm text-secondary-700 leading-relaxed mb-5">
        Our team of experienced engineers and technicians ensures that every installation meets the
        highest standards of quality, safety, and performance. We are committed to delivering reliable,
        cost-effective solar solutions that provide long-term value to our customers.
      </OverriddenParagraph>

      {/* Key highlights — 2-col bullet cards (keep whole table on one PDF page) */}
      <div
        data-pdf-keep="key-highlights"
        className="rounded-xl border border-sky-100 overflow-hidden"
      >
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
              <EditableText
                sectionKey={`about-highlight-${i}`}
                as="p"
                className="text-xs text-secondary-700 leading-relaxed"
              >
                {h.text}
              </EditableText>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WhatWeOfferBlock({
  systemType,
}: {
  systemType?: string | null;
}) {
  const accent = '#0891b2';
  const diagramSrc = systemTypeDiagramSrc(systemType);
  return (
    <div className="mb-0 pdf-section">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4 pdf-section-heading" data-pdf-keep="section-heading">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">✨</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          What We Offer
        </h2>
      </div>

      {/* Two-column: common intro (same for On/Hybrid/Off-Grid) + system-type diagram only */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Left: shared description — never varies by CRM System Type */}
        <div className="flex-1 min-w-0">
          <OverriddenDiv
            sectionKey="what-we-offer-intro"
            className="text-sm text-secondary-700 leading-relaxed mb-4 whitespace-pre-line"
          >
            {WHAT_WE_OFFER_INTRO}
          </OverriddenDiv>
        </div>
        {/* Right: only this image swaps by CRM System Type */}
        <div className="lg:w-[42%] flex-shrink-0 flex items-center justify-center">
          <img
            data-docx-image="diagram"
            data-system-type-diagram={systemTypeHeadingTerm(systemType)}
            src={diagramSrc}
            alt={systemTypeDiagramAlt(systemType)}
            className="max-w-full h-auto rounded-lg bg-transparent"
            style={{ maxHeight: '240px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>
      </div>

      {/* 3 service cards — 1 / 2 / 3 so tablet portrait does not crush titles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        {OUR_SERVICES.map((s, i) => (
          <div
            key={s.title}
            className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ borderColor: '#a5f3fc', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <EditableText
                sectionKey={`offer-service-${i}-title`}
                as="span"
                className="text-sm font-extrabold uppercase tracking-wide min-w-0"
                style={{ color: accent }}
              >
                {s.title}
              </EditableText>
            </div>
            <EditableText
              sectionKey={`offer-service-${i}-desc`}
              as="p"
              className="text-xs text-secondary-600 leading-relaxed"
            >
              {s.desc}
            </EditableText>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OurProcessBlock() {
  const accent = '#7c3aed';
  const stepColors = ['#0369a1', '#0891b2', '#059669', '#d97706', '#7c3aed'];
  return (
    <div className="mb-0 pdf-section">
      {/* Section heading */}
      <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none flex-shrink-0">🔄</span>
        <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide sm:tracking-widest min-w-0 break-words" style={{ color: accent }}>
          Our Process for Seamless Solar Integration
        </h2>
      </div>

      <OverriddenParagraph sectionKey="our-process-intro" className="text-sm text-secondary-700 leading-relaxed mb-5">
        {OUR_PROCESS_INTRO}
      </OverriddenParagraph>

      {/* Process steps reflow: 1 / 2 / 3 / 5 columns. CSS in index.css also
          overrides older shared-HTML snapshots that still use flex-row. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 min-w-0 pdf-process-steps">
        {OUR_PROCESS_STEPS.map((step, idx) => (
          <div
            key={step.title}
            className="min-w-0 max-w-full rounded-xl border p-3.5 flex flex-col gap-1.5 relative"
            style={{ borderColor: `${stepColors[idx]}40`, background: `${stepColors[idx]}08` }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-extrabold mb-1 flex-shrink-0"
              style={{ background: stepColors[idx] }}
            >
              {idx + 1}
            </div>
            <div className="flex items-start gap-1.5 min-w-0">
              <span className="text-base flex-shrink-0">{step.icon}</span>
              <EditableText
                sectionKey={`process-step-${idx}-title`}
                as="span"
                className="text-xs font-extrabold uppercase tracking-wide break-words min-w-0"
                style={{ color: stepColors[idx] }}
              >
                {step.title}
              </EditableText>
            </div>
            <EditableText
              sectionKey={`process-step-${idx}-desc`}
              as="p"
              className="text-xs text-secondary-600 leading-relaxed break-words"
            >
              {step.desc}
            </EditableText>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoofLayoutBlock({ layout, systemSizeKw }: { layout: AiRoofLayoutResponse; systemSizeKw?: number | null }) {
  const accent = '#0f766e';
  const apiBase = getApiBaseUrl();
  // Prefer persisted 3D render for proposal when the project flag says so.
  const rawMain = layout.layout_image_url;
  const raw3d = layout.layout_image_3d_url;
  const use3d =
    layout.prefer_3d_for_proposal === true && raw3d != null && String(raw3d).trim().length > 0;
  const chosen = use3d ? String(raw3d).trim() : rawMain;
  let src: string | null = null;
  if (chosen) {
    src = chosen.startsWith('http') ? chosen : `${apiBase}${chosen.startsWith('/') ? chosen : `/${chosen}`}`;
  }

  return (
    <div className="mb-0 pdf-section">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: accent, height: '28px' }} />
        <span className="text-lg leading-none">🛰️</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: accent }}>
          Proposed Rooftop Solar Layout
        </h2>
        {systemSizeKw != null && Number(systemSizeKw) > 0 && (
          <span className="ml-1 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-0.5">
            {Number(systemSizeKw).toFixed(1)} kW System
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
        <div className="space-y-3">
          <EditableText
            sectionKey="roof-layout-disclaimer"
            as="p"
            className="text-sm text-secondary-700 leading-relaxed"
          >
            This layout has been automatically generated using satellite imagery and project-specific inputs. It is
            merely a rough conceptual representation intended for preliminary visualization purposes only. For accurate
            project scope, specifications and deliverables; please refer to the detailed Bill of Quantities provided
            below.
          </EditableText>
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
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <dt className="font-semibold text-emerald-800 uppercase tracking-wide text-[10px]">Panel count</dt>
              <dd className="mt-1 text-base font-semibold text-emerald-900">
                {Number.isFinite(layout.panel_count) ? layout.panel_count : '—'}
              </dd>
            </div>
            {systemSizeKw != null && Number(systemSizeKw) > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <dt className="font-semibold text-emerald-800 uppercase tracking-wide text-[10px]">System size</dt>
                <dd className="mt-1 text-base font-semibold text-emerald-900">
                  {Number(systemSizeKw).toFixed(1)} kW
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="space-y-2">
          {layout.source === 'AI' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠ <strong>Panel overlay not yet saved.</strong> The image below is the raw satellite view.
              Open <em>AI Roof Layout</em>, adjust the green polygon over your roof, then click <strong>Save to Proposal</strong> to embed the panel drawing.
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden flex items-center justify-center min-h-[280px]">
            {src ? (
              <img
                data-docx-image="roof-layout"
                src={src}
                alt="Proposed rooftop solar layout"
                crossOrigin="anonymous"
                className="w-full h-auto max-w-full block"
                style={{ maxHeight: 'min(520px, 72vh)', objectFit: 'contain', background: '#f1f5f9' }}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-secondary-400">
                Roof layout image not available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScopeSectionCard({
  section,
  index,
  systemType,
}: {
  section: ReturnType<typeof scopeSectionsFor>[number];
  index: number;
  systemType?: string | null;
}) {
  const scopeKey = `scope-section-${index}`;
  const map = React.useContext(ProposalTextOverridesContext);
  const isEditing = React.useContext(ProposalEditingContext);
  const o = map[scopeKey];
  const rawLines =
    o != null && o.trim() !== ''
      ? o.split('\n').map((t) => t.trim()).filter(Boolean)
      : section.items;
  // Saved overrides often still say “On-grid string inverter(s)” — align to CRM type.
  const lines = rawLines.map((line) => rewriteSystemTypeMentions(line, systemType));
  const seedItemsRef = React.useRef(lines);
  const wasEditingRef = React.useRef(false);
  if (isEditing && !wasEditingRef.current) {
    seedItemsRef.current = lines;
  }
  if (!isEditing) {
    seedItemsRef.current = lines;
  }
  wasEditingRef.current = isEditing;
  const displayItems = isEditing ? seedItemsRef.current : lines;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: section.bg, borderColor: section.border }}
    >
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <span className="text-xl flex-shrink-0">{section.icon}</span>
        <EditableText
          sectionKey={`scope-section-${index}-title`}
          as="h3"
          className="text-sm font-bold min-w-0"
          style={{ color: section.accent }}
        >
          {section.title}
        </EditableText>
      </div>
      <ul data-docx-section={scopeKey} className="space-y-1.5">
        {displayItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-secondary-700">
            <span
              className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: section.accent, marginTop: '5px' }}
            />
            <EditableListItemText text={item} isEditing={isEditing} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScopeOfWorkBlock({ proposal }: { proposal: ProposalData }) {
  const sz = (proposal.roi?.inputs.systemSizeKw ?? 0) > 0
    ? proposal.roi!.inputs.systemSizeKw
    : (proposal.systemSizeKw || proposal.roiAutofill?.systemSizeKw || 0);
  const sections = scopeSectionsFor(proposal.systemType);

  return (
    <div className="mb-0 pdf-section">
      <div className="flex items-center gap-3 mb-4 pdf-section-heading" data-pdf-keep="section-heading">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0369a1', height: '28px' }} />
        <span className="text-lg leading-none">🔩</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0369a1' }}>Scope of Work</h2>
      </div>
      <OverriddenParagraph sectionKey="scope-intro" className="text-sm text-secondary-500 mb-5 pl-7">
        {`The scope of work for the ${proposalForHeading(sz, proposal.systemType)} covers four key areas:`}
      </OverriddenParagraph>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s, si) => (
          <ScopeSectionCard
            key={s.title}
            section={s}
            index={si}
            systemType={proposal.systemType}
          />
        ))}
      </div>
    </div>
  );
}

export function FinancialBenefitsBlock({ proposal }: { proposal: ProposalData }) {
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
    <div className="mb-0 pdf-section">
      <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#059669', height: '28px' }} />
        <span className="text-lg leading-none flex-shrink-0">📊</span>
        <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide sm:tracking-widest min-w-0 break-words" style={{ color: '#059669' }}>Financial Benefits &amp; Savings</h2>
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
            <div
              className="rounded-xl px-5 py-4 mb-4"
              style={{ background: 'linear-gradient(135deg, #0d1b3a 0%, #1e3a5f 60%, #0f4c2a 100%)' }}
            >
              <EditableText
                sectionKey="financial-hero"
                as="p"
                className="text-white text-sm font-light leading-relaxed"
              >
                {`The proposed ${proposalForHeading(sizeKw, proposal.systemType)} is projected to generate ${roi.annualGeneration.toLocaleString('en-IN')} kWh of clean electricity in Year 1, delivering annual savings of ${fmtINR(roi.annualSavings)}. Over 25 years, cumulative savings are estimated at ${fmtINR(roi.totalSavings25Years)} — an ROI of ${roi.roiPercent.toFixed(1)}%.`}
              </EditableText>
            </div>

            {/* 4 highlight stat pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 min-w-0">
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
              <OverriddenParagraph sectionKey="financial-p1" className="text-sm text-secondary-600 leading-relaxed">
                <span className="font-semibold text-secondary-800">Levelised Cost of Energy (LCOE):</span>{' '}
                At <span className="font-bold text-primary-700">₹{roi.lcoe.toFixed(4)}/kWh</span>, this system generates electricity
                at a fraction of the current grid tariff of ₹{roi.inputs.tariff}/kWh — locking in energy cost savings
                that grow every year as tariffs escalate.
              </OverriddenParagraph>
              <OverriddenParagraph sectionKey="financial-p2" className="text-sm text-secondary-600 leading-relaxed">
                <span className="font-semibold text-secondary-800">Tariff escalation advantage:</span>{' '}
                With an assumed annual tariff escalation of{' '}
                <span className="font-bold text-primary-700">{roi.inputs.escalationPercent}%</span>,
                your savings increase every year — making solar an inflation-proof investment that delivers
                compounding returns over its 25-year operational life.
              </OverriddenParagraph>
            </div>
          </div>
        );
      })() : (
        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/40 px-5 py-4">
          <OverriddenParagraph sectionKey="financial-no-roi" className="text-sm text-secondary-700 leading-relaxed">
            The proposed solar system will generate clean electricity from sunlight, directly offsetting
            your grid electricity consumption and reducing your monthly electricity bills substantially.
            With rising electricity tariffs in India (historically escalating at 5–7% per year), the
            financial benefits of solar energy grow significantly over the system's 25-year lifetime.
          </OverriddenParagraph>
        </div>
      )}

      {/* KPI tiles */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 min-w-0">
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

      {/* Chart + Table side-by-side — keep chart unsplit in PDF */}
      {rows.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 mb-2">

          {/* ── Left: SVG bar chart ── */}
          <div
            data-pdf-keep="financial-chart"
            className="lg:w-[58%] min-w-0 rounded-xl border border-primary-100 bg-white p-3 flex flex-col"
          >
            <p className="text-[10px] font-semibold text-secondary-400 uppercase tracking-widest mb-2">
              25-Year Cumulative Savings
            </p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full flex-1 min-w-0" style={{ minWidth: 0 }}>
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
          <div className="lg:w-[42%] min-w-0 rounded-xl border border-primary-100 overflow-hidden flex flex-col">
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

export function BOMGroupedTable({
  items,
  comments,
  onCommentsChange,
  collapsed,
  setCollapsed,
  allCollapsed,
  setAllCollapsed,
  notesEditable,
}: {
  items: BomRowGenerated[];
  comments: Record<string, string>;
  onCommentsChange: (c: Record<string, string>) => void;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  allCollapsed: boolean;
  setAllCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  /** BOQ per-category notes: editable only after ✏️ Edit (same as proposal body). */
  notesEditable: boolean;
}) {
  // Group items by category, preserving CATEGORIES order
  const grouped: { cat: Category; label: string; rows: BomRowGenerated[] }[] = React.useMemo(
    () =>
      CATEGORIES
        .map(({ value, label }) => ({
          cat: value,
          label,
          rows: items.filter((r) => r.category === value),
        }))
        .filter((g) => g.rows.length > 0),
    [items],
  );

  // Keep per-category collapsed map in sync with the global allCollapsed mode,
  // especially on first render and whenever BOM categories change.
  React.useEffect(() => {
    if (grouped.length === 0) return;
    setCollapsed((prev) => {
      const next = { ...prev };
      let changed = false;
      grouped.forEach((g) => {
        const desired = allCollapsed;
        if (next[g.cat] !== desired) {
          next[g.cat] = desired;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [grouped, allCollapsed, setCollapsed]);

  const toggleAll = React.useCallback(() => {
    const next = !allCollapsed;
    setAllCollapsed(next);
    const map: Record<string, boolean> = {};
    grouped.forEach((g) => { map[g.cat] = next; });
    setCollapsed(map);
  }, [allCollapsed, grouped, setAllCollapsed, setCollapsed]);

  if (!items.length) return null;

  let serial = 0;

  return (
    <div className="mb-0 pdf-section" data-pdf-section="bom">
      {/* Collapse-all only (category summary lives in <caption> so PDF pagination keeps it with the BOQ title) */}
      <div className="flex items-center justify-end mb-3 px-1 print-hide">
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-lg border transition-colors touch-manipulation"
          style={{ borderColor: '#b45309', color: '#b45309', background: '#fff7ed', touchAction: 'manipulation' }}
          aria-label={allCollapsed ? 'Expand all categories' : 'Collapse all categories'}
        >
          {allCollapsed ? '▶ Expand All' : '▼ Collapse All'}
        </button>
      </div>

      {/* Column header + table */}
      <div className="overflow-x-auto print:overflow-visible rounded-xl border border-secondary-200 shadow-sm">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <caption
            className="bom-boq-caption text-left px-3 pt-3 pb-1"
            style={{ captionSide: 'top' as any }}
          >
            <p className="text-xs text-secondary-400 mb-1 font-normal normal-case tracking-normal">
              {grouped.length} categories
              {!allCollapsed && <> · {items.length} items</>}
            </p>
            <span className="text-sm font-extrabold uppercase tracking-widest" style={{ color: '#b45309' }}>
              Bill of Quantities
            </span>
          </caption>
          <thead>
            <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #b45309)' }}>
              <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase tracking-wide w-8">#</th>
              <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase tracking-wide">Item</th>
              <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase tracking-wide">Specification</th>
              <th className="px-3 py-2.5 text-right text-xs text-white font-semibold uppercase tracking-wide w-16">Qty</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ cat, label, rows }) => {
              const a       = BOM_CAT_ACCENTS[cat];
              const icon    = BOM_CAT_ICONS[cat];
              // `collapsed[cat]` is a per-category override. When it's missing (initial paint),
              // inherit from the global `allCollapsed` so the UI doesn't flash expanded.
              const isCollapsed = collapsed[cat] ?? allCollapsed;
              const isOpen  = !isCollapsed;
              const comment = comments[cat] ?? '';
              return (
                <React.Fragment key={cat}>
                  {/* Category header row */}
                  <tr
                    className="cursor-pointer select-none"
                    style={{ background: a.headerBg, borderTop: `2px solid ${a.border}` }}
                    onClick={() =>
                      setCollapsed((p) => {
                        const currentlyCollapsed = p[cat] ?? allCollapsed;
                        return { ...p, [cat]: !currentlyCollapsed };
                      })
                    }
                    data-bom-cat={cat}
                    data-bom-collapsed={(!isOpen).toString()}
                    data-bom-header="true"
                  >
                    <td colSpan={4} className="px-3 py-2">
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
                        {isOpen && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: a.badge, color: '#fff' }}
                          >
                            {rows.length} item{rows.length !== 1 ? 's' : ''}
                          </span>
                        )}
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
                      <td colSpan={4} className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold mt-0.5 flex-shrink-0" style={{ color: a.badge }}>📝 Note:</span>
                          {notesEditable ? (
                            <>
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
                              {comment ? (
                                <p className="hidden print:block text-xs italic flex-1" style={{ color: a.text }}>{comment}</p>
                              ) : null}
                            </>
                          ) : (
                            <p
                              className={`flex-1 text-xs rounded-lg px-2 py-1 min-h-[28px] border border-transparent bg-white/40 ${comment ? '' : 'italic text-secondary-400'}`}
                              style={{ color: comment ? a.text : undefined }}
                            >
                              {comment || '—'}
                            </p>
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

export function CommercialsBlock({ proposal }: { proposal: ProposalData }) {
  const map = React.useContext(ProposalTextOverridesContext);
  const waterfall = buildCommercialsWaterfall(proposal, map);
  if (!waterfall) return null;

  const fees = resolveAuthorityFees(waterfall.sizeKw, map);
  const creditNote = subsidyCreditNote(map);

  return (
    <div className="mb-0 pdf-section" data-pdf-section="commercials">
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
                <EditableText sectionKey="commercials-desc" as="p" className="m-0">
                  {waterfall.description}
                </EditableText>
              </td>
              <td className="px-5 py-3 text-right text-secondary-800 font-semibold tabular-nums w-44">
                {fmtINRFull(waterfall.preGst)}
              </td>
            </tr>
            <tr className="border-b border-primary-100 bg-blue-50/40">
              <td className="px-5 py-3 text-blue-700">{waterfall.gstLabel}</td>
              <td className="px-5 py-3 text-right text-blue-700 font-semibold tabular-nums">
                {fmtINRFull(waterfall.gstAmount)}
              </td>
            </tr>
            <tr className="border-b border-primary-100">
              <td className="px-5 py-3 text-secondary-800 font-semibold">Total project cost (incl. GST)</td>
              <td className="px-5 py-3 text-right text-secondary-900 font-bold tabular-nums">
                {fmtINRFull(waterfall.grandRounded)}
              </td>
            </tr>
            {waterfall.showSubsidy && (
              <tr className="border-b border-primary-100 bg-amber-50/60">
                <td className="px-5 py-3 text-amber-800 font-medium">
                  Subsidy eligible
                </td>
                <td className="px-5 py-3 text-right text-amber-800 font-semibold tabular-nums w-44">
                  (−) {fmtINRFull(waterfall.subsidyAmt)}
                </td>
              </tr>
            )}
            {waterfall.showSubsidy && (
              <tr className="border-b border-primary-100 bg-emerald-50/70">
                <td className="px-5 py-3 text-emerald-900 font-semibold">Effective price after subsidy</td>
                <td className="px-5 py-3 text-right text-emerald-900 font-extrabold tabular-nums">
                  {fmtINRFull(waterfall.effectiveAfterSubsidy)}
                </td>
              </tr>
            )}
            <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
              <td className="px-5 py-3 text-white font-bold uppercase tracking-wide text-xs drop-shadow">
                Payable to Rayenna Energy
              </td>
              <td className="px-5 py-3 text-right text-white font-extrabold text-base tabular-nums drop-shadow">
                {fmtINRFull(waterfall.payableToRayenna)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-secondary-600 italic leading-relaxed" data-docx-section="commercials-payable-words">
        <span className="font-semibold not-italic text-secondary-700">In words (payable): </span>
        {waterfall.payableInWords}
      </p>
      {waterfall.showSubsidy && (
        <p className="mt-1 text-xs text-secondary-600 italic leading-relaxed" data-docx-section="commercials-effective-words">
          <span className="font-semibold not-italic text-secondary-700">In words (effective after subsidy): </span>
          {waterfall.effectiveInWords}
        </p>
      )}
      <EditableText sectionKey="subsidy-credit-note" as="p" className="mt-2 text-[11px] text-amber-900/90 leading-relaxed">
        {creditNote}
      </EditableText>

      {/* Keep fees table + footnote together in PDF (avoid orphan note above Payment Terms). */}
      <div className="mt-4 mb-0 pdf-authority-fees" data-pdf-keep="authority-fees">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-sky-800 mb-2">Authority / DISCOM fees</h3>
        {/* No overflow-hidden: Chromium stretches bordered shells into empty framed gaps on page splits. */}
        <div className="bg-sky-50/60 border border-sky-100 rounded-xl">
          <table className="w-full text-sm">
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id} className="border-b border-sky-100 last:border-b-0">
                  <td className="px-4 py-2.5 text-secondary-700">
                    <EditableText sectionKey={`authority-fee-${fee.id}-label`} as="span">
                      {fee.label}
                    </EditableText>
                  </td>
                  <td className="px-4 py-2.5 text-right text-secondary-800 font-medium tabular-nums">
                    <EditableText sectionKey={`authority-fee-${fee.id}-amount`} as="span">
                      {fee.amountLabel}
                    </EditableText>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-secondary-500 leading-snug">
          Authority fees are typically paid to the DISCOM / utility and are separate from the payable to Rayenna above.
        </p>
      </div>
    </div>
  );
}

export function PaymentMilestonesBlock() {
  const map = React.useContext(ProposalTextOverridesContext);
  const milestones = resolvePaymentMilestones(map);
  return (
    <div className="mb-0 pdf-section" data-pdf-section="payment-milestones">
      <div className="flex items-center gap-3 mb-4 pdf-section-heading" data-pdf-keep="section-heading">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#b45309', height: '28px' }} />
        <span className="text-lg leading-none">💳</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#b45309' }}>Payment Terms</h2>
      </div>
      <div className="rounded-xl border border-amber-200 overflow-hidden bg-amber-50/40">
        <table className="w-full text-sm min-w-[320px]">
          <thead>
            <tr className="bg-amber-100/80 text-[10px] uppercase tracking-widest text-amber-900">
              <th className="px-4 py-2 text-left font-bold w-24">%</th>
              <th className="px-4 py-2 text-left font-bold">Milestone</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, i) => (
              <tr key={i} className="border-t border-amber-100">
                <td className="px-4 py-2.5 font-extrabold text-amber-900 tabular-nums">
                  <EditableText sectionKey={`payment-milestone-${i}-percent`} as="span">
                    {String(m.percent)}
                  </EditableText>
                  %
                </td>
                <td className="px-4 py-2.5 text-secondary-700">
                  <EditableText sectionKey={`payment-milestone-${i}-trigger`} as="span">
                    {m.trigger}
                  </EditableText>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TechnicalDetailsBlock({
  proposal,
  bomComments,
}: {
  proposal: ProposalData;
  bomComments?: Record<string, string>;
}) {
  const map = React.useContext(ProposalTextOverridesContext);
  const cards = buildTechDetailCards(proposal, map, bomComments);
  if (!cards.length) return null;
  const footnote = techDetailsFootnote(map);

  return (
    <div className="mb-0 pdf-section" data-pdf-section="technical-details">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0369a1', height: '28px' }} />
        <span className="text-lg leading-none">🔩</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0369a1' }}>Technical Details</h2>
      </div>
      <p className="text-xs text-secondary-600 mb-3">
        Major components proposed for this installation. Full quantities and notes follow in the Bill of Quantities.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-sky-100 bg-sky-50/40 overflow-hidden"
          >
            <div className="px-4 py-2 bg-sky-800 text-white text-xs font-extrabold uppercase tracking-wider">
              {c.title}
            </div>
            <dl className="px-4 py-3 space-y-1.5 text-xs">
              <div className="flex gap-2">
                <dt className="w-28 flex-shrink-0 text-secondary-500 font-semibold">Manufacturer</dt>
                <dd className="text-secondary-800 font-medium">
                  <EditableText sectionKey={`tech-${c.id}-manufacturer`} as="span">{c.manufacturer}</EditableText>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 flex-shrink-0 text-secondary-500 font-semibold">Type / rating</dt>
                <dd className="text-secondary-800">
                  <EditableText sectionKey={`tech-${c.id}-type`} as="span">{c.typeRating}</EditableText>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 flex-shrink-0 text-secondary-500 font-semibold">Quantity</dt>
                <dd className="text-secondary-800">
                  <EditableText sectionKey={`tech-${c.id}-qty`} as="span">{c.quantity}</EditableText>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 flex-shrink-0 text-secondary-500 font-semibold">Specification</dt>
                <dd className="text-secondary-800">
                  <EditableText sectionKey={`tech-${c.id}-spec`} as="span">{c.specification}</EditableText>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 flex-shrink-0 text-secondary-500 font-semibold">Warranty</dt>
                <dd className="text-secondary-800">
                  <EditableText sectionKey={`tech-${c.id}-warranty`} as="span">{c.warranty}</EditableText>
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <EditableText sectionKey="tech-details-footnote" as="p" className="mt-3 text-[11px] text-rose-700 font-medium">
        {footnote}
      </EditableText>
    </div>
  );
}

export function WarrantyTableBlock({
  proposal,
  bomComments,
}: {
  proposal: ProposalData;
  bomComments?: Record<string, string>;
}) {
  const map = React.useContext(ProposalTextOverridesContext);
  const rows = buildWarrantyRows(proposal, map, bomComments);
  return (
    <div className="mb-0 pdf-section" data-pdf-section="warranty-table" data-pdf-keep="warranty-block">
      <div className="flex items-center gap-3 mb-4 pdf-section-heading" data-pdf-keep="section-heading">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#7c3aed', height: '28px' }} />
        <span className="text-lg leading-none">🛡️</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#7c3aed' }}>Warranty</h2>
      </div>
      {/*
        Plain bordered table — never wrap in overflow-hidden/rounded shell.
        Chromium print stretches those shells into empty “rows” when a split occurs.
        Print CSS keeps this whole block on one page (short table).
      */}
      <table className="pdf-warranty-table w-full text-sm border-collapse border border-violet-200 bg-violet-50/30">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-violet-100 last:border-b-0">
              <td className="px-4 py-2.5 font-semibold text-violet-950 w-[34%] align-top border-0">
                <EditableText sectionKey={`warranty-row-${r.id}-label`} as="span">{r.label}</EditableText>
              </td>
              <td className="px-4 py-2.5 text-secondary-700 border-0">
                <EditableText sectionKey={`warranty-row-${r.id}-detail`} as="span">{r.detail}</EditableText>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type RaciDraftRow = {
  key: string;
  description: string;
  rayenna: boolean;
  client: boolean;
};

function RaciCheckCell({
  sectionKey,
  checked,
  accentClass,
  isEditing,
  onToggle,
}: {
  sectionKey: string;
  checked: boolean;
  accentClass: string;
  isEditing: boolean;
  onToggle: () => void;
}) {
  return (
    <td className={`px-3 py-2 text-center font-bold ${accentClass}`}>
      <button
        type="button"
        className={`inline-flex items-center justify-center min-w-[2rem] min-h-[1.75rem] rounded-md ${
          isEditing
            ? 'hover:bg-sky-100/80 focus:outline-none focus:ring-2 focus:ring-sky-300 cursor-pointer'
            : 'cursor-default'
        }`}
        onClick={() => {
          if (!isEditing) return;
          onToggle();
        }}
        disabled={!isEditing}
        title={isEditing ? 'Click to toggle' : undefined}
        aria-pressed={checked}
      >
        {checked ? '✓' : '—'}
      </button>
      <span data-docx-section={sectionKey} className="sr-only">
        {checked ? 'yes' : 'no'}
      </span>
    </td>
  );
}

export function ResponsibilityMatrixBlock() {
  const map = React.useContext(ProposalTextOverridesContext);
  const isEditing = React.useContext(ProposalEditingContext);
  const resolved = resolveRaciRows(map);

  const [draftRows, setDraftRows] = useState<RaciDraftRow[] | null>(null);

  React.useLayoutEffect(() => {
    if (isEditing && draftRows === null) {
      setDraftRows(
        resolved.map((r, i) => ({
          key: `raci-seed-${i}`,
          description: r.description,
          rayenna: r.rayenna,
          client: r.client,
        })),
      );
    }
    if (!isEditing && draftRows !== null) {
      setDraftRows(null);
    }
  }, [isEditing, draftRows, resolved]);

  const viewRows: RaciDraftRow[] = resolved.map((r, i) => ({
    key: `raci-view-${i}`,
    description: r.description,
    rayenna: r.rayenna,
    client: r.client,
  }));
  const rows: RaciDraftRow[] = isEditing ? (draftRows ?? viewRows) : viewRows;

  const addRow = () => {
    setDraftRows((prev) => [
      ...(prev ?? viewRows),
      {
        key: `raci-new-${Date.now()}`,
        description: 'New responsibility',
        rayenna: true,
        client: false,
      },
    ]);
  };

  const deleteRow = (index: number) => {
    setDraftRows((prev) => (prev ?? viewRows).filter((_, i) => i !== index));
  };

  const patchRow = (index: number, patch: Partial<Pick<RaciDraftRow, 'rayenna' | 'client'>>) => {
    setDraftRows((prev) =>
      (prev ?? viewRows).map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="mb-0 pdf-section" data-pdf-section="responsibility-matrix">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0369a1', height: '28px' }} />
        <span className="text-lg leading-none">📋</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0369a1' }}>
          Responsibility Matrix
        </h2>
      </div>
      <p className="text-xs text-secondary-600 mb-3">
        Clear split of responsibilities so site readiness and handovers stay on schedule.
        {isEditing ? ' Click Rayenna / Client cells to toggle. Add or remove rows as needed.' : ''}
      </p>
      <span data-docx-section="raci-count" className="sr-only">
        {rows.length}
      </span>
      <div className="rounded-xl border border-sky-200 overflow-x-auto bg-white shadow-sm">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="bg-sky-800 text-white text-[10px] uppercase tracking-widest">
              <th className="px-3 py-2 text-left font-bold">#</th>
              <th className="px-3 py-2 text-left font-bold">Description</th>
              <th className="px-3 py-2 text-center font-bold w-24">Rayenna</th>
              <th className="px-3 py-2 text-center font-bold w-24">Client</th>
              {isEditing ? <th className="px-2 py-2 text-center font-bold w-16 print-hide"> </th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className={i % 2 ? 'bg-sky-50/50' : 'bg-white'}>
                <td className="px-3 py-2 text-secondary-500 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 text-secondary-800">
                  <EditableText sectionKey={`raci-${i}-desc`} as="span">
                    {r.description}
                  </EditableText>
                </td>
                <RaciCheckCell
                  sectionKey={`raci-${i}-rayenna`}
                  checked={r.rayenna}
                  accentClass="text-sky-800"
                  isEditing={isEditing}
                  onToggle={() => patchRow(i, { rayenna: !r.rayenna })}
                />
                <RaciCheckCell
                  sectionKey={`raci-${i}-client`}
                  checked={r.client}
                  accentClass="text-amber-800"
                  isEditing={isEditing}
                  onToggle={() => patchRow(i, { client: !r.client })}
                />
                {isEditing ? (
                  <td className="px-2 py-2 text-center print-hide">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 px-1.5 py-1 rounded hover:bg-rose-50"
                      onClick={() => deleteRow(i)}
                      title="Delete row"
                    >
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isEditing ? (
        <div className="mt-2 print-hide">
          <button
            type="button"
            className="text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg px-3 py-1.5"
            onClick={addRow}
          >
            + Add row
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function KeyPointsAndExclusionsBlock() {
  const map = React.useContext(ProposalTextOverridesContext);
  const keys = resolveKeyPoints(map);
  const exclusions = resolveExclusions(map);

  return (
    <>
      <ListBlock title="Key Points" items={keys} />
      <div className="print-hide"><Divider /></div>
      <ListBlock title="Exclusions" items={exclusions} />
    </>
  );
}

export function OfferValidityBlock() {
  const map = React.useContext(ProposalTextOverridesContext);
  const text = resolveOfferValidity(map);
  return (
    <div className="mb-0 pdf-section" data-pdf-section="offer-validity">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-800 mb-1">Offer validity</p>
        <EditableText sectionKey="offer-validity" as="p" className="text-sm text-secondary-800 m-0">
          {text}
        </EditableText>
      </div>
    </div>
  );
}

export function ProposalCoverBlock({ proposal }: { proposal: ProposalData }) {
  const sizeKw = proposal.systemSizeKw || proposalDisplayCapacityFromProposal(proposal);
  const dateStr = new Date(proposal.generatedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const heading = proposalForHeading(sizeKw, proposal.systemType);
  // Bake navy wash into the hero so Preview / Share / PDF match WhatsApp-safe pixels.
  const [heroSrc, setHeroSrc] = React.useState('/proposal_cover_hero.jpg');
  React.useEffect(() => {
    let cancelled = false;
    void import('./coverHero').then(({ loadCoverHeroComposited }) =>
      loadCoverHeroComposited().then((c) => {
        if (!cancelled && c?.dataUrl) setHeroSrc(c.dataUrl);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="relative mb-8 pdf-section pdf-cover-page rounded-none sm:rounded-2xl overflow-hidden border border-primary-100"
      data-pdf-section="cover"
      style={{ backgroundColor: '#0d1b3a' }}
    >
      {/* Title-page wallpaper — composited navy wash (see coverHero.ts). */}
      <img
        data-docx-image="cover-hero"
        src={heroSrc}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* CSS wash fallback until composited JPEG loads; stripped from PDF/Share clones. */}
      <div
        data-pdf-cover-wash
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'linear-gradient(135deg, rgba(13,27,58,0.88) 0%, rgba(13,27,58,0.68) 48%, rgba(13,27,58,0.8) 100%)',
        }}
      />
      <div className="relative z-10 px-5 sm:px-8 py-8 sm:py-10 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl p-2 shadow">
              <img
                data-docx-image="logo"
                src="/rayenna_logo.jpg"
                alt="Rayenna Energy"
                className="h-14 w-auto object-contain"
                style={{ maxWidth: '140px' }}
              />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base tracking-tight drop-shadow">Rayenna Energy Private Limited</p>
              <p className="text-white/90 text-[10px] mt-0.5">www.rayennaenergy.com · +91 7907 369 304</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] text-amber-300/90 uppercase tracking-widest">Reference</p>
            <p className="font-mono text-sm font-semibold break-all drop-shadow">{proposal.refNumber}</p>
            <p className="text-[10px] text-amber-300/90 uppercase tracking-widest mt-2">Date</p>
            <p className="text-sm font-medium">{dateStr}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-xs font-bold uppercase tracking-[0.2em] mb-2">Proposal for</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight drop-shadow mb-3">{heading}</h2>
            {/* Opaque navy CLIENT panel — glass fails on WhatsApp/Android PDF viewers. */}
            <div
              data-pdf-cover-client
              className="rounded-xl border border-white/50 px-4 py-3.5"
              style={{
                backgroundColor: '#0d1b3a',
                boxShadow: 'inset 3px 0 0 0 #fbbf24',
              }}
            >
              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest mb-1">Client</p>
              <p className="font-extrabold text-xl leading-snug text-white">
                {proposal.customer.customerName || 'Valued Customer'}
              </p>
              {proposal.customer.location && (
                <p className="text-white text-sm mt-1.5 leading-snug">{proposal.customer.location}</p>
              )}
              {(proposal.projectNumber != null || proposal.customerNumber) && (
                <p className="text-white/90 text-[11px] font-mono mt-2">
                  {proposal.projectNumber != null ? `Project #${proposal.projectNumber}` : ''}
                  {proposal.projectNumber != null && proposal.customerNumber ? ' · ' : ''}
                  {proposal.customerNumber ? `Customer #${proposal.customerNumber}` : ''}
                </p>
              )}
            </div>
          </div>
          {sizeKw > 0 && (
            <div
              className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center border-4 border-amber-400 shadow-lg"
              style={{ background: 'radial-gradient(circle at 30% 30%, #fbbf24, #d97706)' }}
            >
              <span className="text-3xl sm:text-4xl font-black text-[#0d1b3a] leading-none tabular-nums">
                {Number.isInteger(sizeKw) ? sizeKw : sizeKw.toFixed(1)}
              </span>
              <span className="text-[11px] font-extrabold text-[#0d1b3a]/uppercase tracking-wider mt-1">kW</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function proposalDisplayCapacityFromProposal(p: ProposalData): number {
  if ((p.roi?.inputs.systemSizeKw ?? 0) > 0) return Number(p.roi!.inputs.systemSizeKw);
  if ((p.systemSizeKw ?? 0) > 0) return Number(p.systemSizeKw);
  if ((p.roiAutofill?.systemSizeKw ?? 0) > 0) return Number(p.roiAutofill!.systemSizeKw);
  return 0;
}

export function DeliveryTermsBlock() {
  return <ListBlock title="Material Delivery Period" items={DELIVERY_TERMS} />;
}

const LIST_META: Record<string, { icon: string; accent: string; bg: string; border: string }> = {
  'Client Scope':           { icon: '🏗️',  accent: '#0369a1', bg: '#eff6ff',  border: '#bfdbfe' },
  'Terms & Conditions':     { icon: '📜',  accent: '#0d1b3a', bg: '#f0f4ff',  border: '#c7d2fe' },
  'Service Details':        { icon: '🛠️',  accent: '#059669', bg: '#f0fdf4',  border: '#a7f3d0' },
  'Payment Terms':          { icon: '💳',  accent: '#b45309', bg: '#fffbeb',  border: '#fde68a' },
  'Warranty':               { icon: '🛡️',  accent: '#7c3aed', bg: '#faf5ff',  border: '#ddd6fe' },
  'Material Delivery Period':{ icon: '🚚', accent: '#0891b2', bg: '#ecfeff',  border: '#a5f3fc' },
  'Key Points':             { icon: '📌',  accent: '#0f766e', bg: '#f0fdfa',  border: '#99f6e4' },
  'Exclusions':             { icon: '🚫',  accent: '#b91c1c', bg: '#fef2f2',  border: '#fecaca' },
};

export function ListBlock({ title, items }: { title: string; items: string[] }) {
  const meta = LIST_META[title] ?? { icon: '📌', accent: '#0d1b3a', bg: '#f8fafc', border: '#e2e8f0' };
  const sectionKey = `list-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const map = React.useContext(ProposalTextOverridesContext);
  const isEditing = React.useContext(ProposalEditingContext);
  const o = map[sectionKey];
  const lines = o != null && o.trim() !== '' ? o.split('\n').map((s) => s.trim()).filter(Boolean) : null;
  const resolvedItems = lines && lines.length > 0 ? lines : items;
  // Freeze item list for the edit session so React does not remount rows mid-edit.
  const seedItemsRef = React.useRef(resolvedItems);
  const wasEditingRef = React.useRef(false);
  if (isEditing && !wasEditingRef.current) {
    seedItemsRef.current = resolvedItems;
  }
  if (!isEditing) {
    seedItemsRef.current = resolvedItems;
  }
  wasEditingRef.current = isEditing;
  const displayItems = isEditing ? seedItemsRef.current : resolvedItems;
  return (
    <div className="mb-0 pdf-section">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: meta.accent, height: '28px' }} />
        <span className="text-lg leading-none">{meta.icon}</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: meta.accent }}>{title}</h2>
      </div>
      <div
        data-docx-section={sectionKey}
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: meta.border, background: meta.bg }}
      >
        {displayItems.map((item, i) => (
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
            <EditableListItemText text={item} isEditing={isEditing} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccountDetailsBlock() {
  const rows = [
    { label: 'Name',           value: 'Rayenna Energy Private Limited', key: 'account-name' },
    { label: 'Type',           value: 'Current Account',                key: 'account-type' },
    { label: 'Bank',           value: 'Axis Bank Limited',              key: 'account-bank' },
    { label: 'Account Number', value: '924020063493172',                key: 'account-number' },
    { label: 'IFSC Code',      value: 'UTIB0000827',                    key: 'account-ifsc' },
  ];
  return (
    <div className="mb-0 pdf-section">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0d1b3a', height: '28px' }} />
        <span className="text-lg leading-none">🏦</span>
        <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0d1b3a' }}>Account Details</h2>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#c7d2fe', background: '#f0f4ff' }}>
        {rows.map(({ label, value, key }, i) => (
          <div
            key={key}
            className="flex items-start gap-3 px-4 py-2.5 text-sm border-b last:border-b-0"
            style={{ borderColor: '#c7d2fe60', background: i % 2 === 0 ? '#e0e7ff40' : 'white' }}
          >
            <span className="w-28 sm:w-36 flex-shrink-0 text-secondary-500 font-medium text-xs uppercase tracking-wide pt-0.5">{label}</span>
            <EditableText
              sectionKey={key}
              as="span"
              className="font-bold tabular-nums min-w-0 break-all"
              style={{ color: '#0d1b3a' }}
            >
              {value}
            </EditableText>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer details form
// ─────────────────────────────────────────────

export function CustomerForm({
  onGenerate,
  canGenerate = true,
}: {
  onGenerate: (c: CustomerDetails, options: { includeRoofLayout: boolean }) => void;
  /** False for Operations / Management / Finance (view-only). */
  canGenerate?: boolean;
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
    if (!canGenerate) return;
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
          <Link to="/dashboard" className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap flex-shrink-0 transition-colors">
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
              disabled={!canGenerate}
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

        {!canGenerate && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 text-xs">
            <p className="font-semibold">View only</p>
            <p className="mt-1 text-secondary-600">
              Your role can open and export proposals but cannot generate new ones or save changes. Ask Sales or Admin to update this project.
            </p>
          </div>
        )}
        <div className="pt-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            disabled={!activeCustomer || !canGenerate}
          >
            <span className="text-base">✦</span>
            {!canGenerate
              ? 'Generate not available for your role'
              : activeCustomer
                ? 'Generate Proposal from CRM Data'
                : 'Select Customer in CRM to Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
