import type { ProposalData } from './types';
import { fmtINR } from './format';
import {
  proposalForHeading,
  systemTypeArticle,
  systemTypeHeadingTerm,
  systemTypeInverterSupplyLabel,
} from './systemTypeLabel';

export function execSummary(p: ProposalData): string {
  const sz   = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  const cost = p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
  const pb   = p.roi?.paybackYears;
  const sav  = p.roi?.totalSavings25Years;
  const typeTerm = systemTypeHeadingTerm(p.systemType);
  const article = sz > 0 ? 'a' : systemTypeArticle(p.systemType);
  const plant =
    sz > 0
      ? `${sz} kW ${typeTerm} Solar Photovoltaic Power Plant`
      : `${typeTerm} Solar Photovoltaic Power Plant`;
  return `Dear ${p.customer.customerName || 'Valued Customer'},

Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the design, supply, installation, and commissioning of ${article} ${plant} at your premises${p.customer.location ? ` in ${p.customer.location}` : ''}.

This proposal has been prepared based on a detailed assessment of your energy requirements and site conditions. The proposed solar system will significantly reduce your electricity costs, provide energy independence, and contribute to a cleaner environment.${cost > 0 ? `\n\nThe total project investment is ${fmtINR(cost)}.` : ''}${pb ? ` With a payback period of approximately ${pb.toFixed(1)} years, this represents an excellent return on investment.` : ''}${sav ? ` Over 25 years, the system is projected to generate cumulative savings of ${fmtINR(sav)}.` : ''}`;
}

export function savingsText(p: ProposalData): string {
  if (!p.roi) return `The proposed solar system will generate clean electricity from sunlight, directly offsetting your grid electricity consumption and reducing your monthly electricity bills substantially.\n\nWith rising electricity tariffs in India (historically escalating at 5–7% per year), the financial benefits of solar energy grow significantly over the system's 25-year lifetime.`;
  const r = p.roi;
  // Prefer systemSizeKw from ROI inputs (most accurate), fall back to proposal-level value
  const sizeKw = r.inputs.systemSizeKw > 0 ? r.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  return `The proposed ${proposalForHeading(sizeKw, p.systemType)} is projected to generate approximately ${r.annualGeneration.toLocaleString('en-IN')} kWh of clean electricity in Year 1, resulting in annual savings of ${fmtINR(r.annualSavings)} at the current tariff of ₹${r.inputs.tariff}/kWh.

With an assumed annual tariff escalation of ${r.inputs.escalationPercent}%, the cumulative savings over 25 years are estimated at ${fmtINR(r.totalSavings25Years)} — delivering an ROI of ${r.roiPercent.toFixed(1)}%.

The Levelised Cost of Energy (LCOE) from this system is ₹${r.lcoe.toFixed(4)}/kWh, which is significantly lower than the current grid tariff of ₹${r.inputs.tariff}/kWh — making solar the most cost-effective energy source for your facility.

Payback Period: ${r.paybackYears.toFixed(1)} years
Annual Generation (Year 1): ${r.annualGeneration.toLocaleString('en-IN')} kWh
25-Year Cumulative Savings: ${fmtINR(r.totalSavings25Years)}`;
}

export const ABOUT_HIGHLIGHTS = [
  { icon: '👷', text: 'Experienced team of solar engineers and project managers' },
  { icon: '🔁', text: 'End-to-end project execution from design to commissioning' },
  { icon: '🏆', text: 'Premium quality components from leading manufacturers' },
  { icon: '🛠️', text: 'Comprehensive after-sales service and AMC support' },
  { icon: '📍', text: 'Proven track record of successful installations across Kerala and beyond' },
  { icon: '📋', text: 'Registered with MNRE, KSEB, and relevant state DISCOMs' },
];

export const WHAT_WE_OFFER_INTRO = `We at Rayenna understand that energy requirements vary from one client to another, which is why our services are designed with flexibility in mind. Whether you are a homeowner looking to reduce your electricity bills or a business seeking to achieve long-term cost savings, our team offers customised solar solutions to meet your specific requirements.\n\nWe take great pride in providing top-grade components, exceptional installation services and ongoing support to guarantee that each system operates at its optimal level.`;

export const OUR_SERVICES = [
  { icon: '🏠', title: 'Domestic Services',      desc: 'Rooftop solar solutions for homes and residential complexes — reduce your electricity bills and achieve energy independence.' },
  { icon: '🏢', title: 'Commercial Services',    desc: 'Large-scale solar installations for offices, factories, and commercial establishments — maximise ROI and meet sustainability goals.' },
  { icon: '💡', title: 'Consultation Services',  desc: 'Expert advisory on solar feasibility, system sizing, net metering, government subsidies, and financing options.' },
];

export const OUR_PROCESS_INTRO = `The Rayenna journey is clear and easy. It starts with understanding your goals during a consultation and executing them seamlessly with a process-oriented approach.`;

export const OUR_PROCESS_STEPS = [
  { icon: '🤝', title: 'Consultation',          desc: 'Understanding your energy requirements, goals, and site conditions through a detailed discussion.' },
  { icon: '📍', title: 'Site Evaluation',        desc: 'On-site assessment including shadow analysis, structural review, and grid connectivity study.' },
  { icon: '📐', title: 'System Design',          desc: 'Custom system design with SLD, layout drawings, and equipment selection for maximum yield.' },
  { icon: '🔧', title: 'Installation',           desc: 'Professional installation by certified engineers with strict quality and safety standards.' },
  { icon: '📡', title: 'Ongoing Support',        desc: 'Remote monitoring, preventive maintenance, and 5-year complaint support to ensure peak performance.' },
];

export const SCOPE_SECTIONS = [
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

/** Scope cards with inverter wording matched to CRM system type. */
export function scopeSectionsFor(systemType?: string | null) {
  const inverterLabel = systemTypeInverterSupplyLabel(systemType);
  return SCOPE_SECTIONS.map((sec) => {
    if (sec.title !== '2. Supply of Equipment') return sec;
    return {
      ...sec,
      items: sec.items.map((item) =>
        item === 'On-grid string inverter(s)' ? inverterLabel : item,
      ),
    };
  });
}

export function scopeText(p: ProposalData): string {
  const sz = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  return `The scope of work for the ${proposalForHeading(sz, p.systemType)} covers four key areas: Site Survey & Design, Supply of Equipment, Installation & Commissioning, and Documentation & Handover.`;
}

/** @deprecated Prefer RACI matrix + Authority fees; kept for override migration / older snapshots. */
export const CLIENT_SCOPE = [
  'Clear shadow free rooftop area for the installation of PV panels.',
  'Space for installation and commissioning of electrical panels.',
  'A secured area for storage of supplied equipment till commissioning.',
  'Electricity – construction power/Water shall be arranged by the owner at its own cost.',
  'Customer need to provide internet connectivity for the system.',
  'Bidirectional / Net Meter (if not supplied by Utility).',
];

/** Offer validity (days) — surfaced as its own editable field, not buried mid-T&Cs. */
export const OFFER_VALIDITY_DAYS = 7;

export const TERMS_AND_CONDITIONS = [
  'Capacity that can be installed is subject to allocation of feasibility by KSEB.',
  'Any additional super structure required for the project needs to be taken up by the customer.',
  'Net Meter cost will be additional if not supplied by Utility.',
  'Any modification to the existing electrical system due to non-conformity to Electrical Inspectorate / Utility standards will have to be carried out by the customer.',
  'Customer shall provide necessary support for getting approvals from the concerned utility section offices.',
  'Civil and structural work beyond the scope defined herein will be charged separately.',
  'Rayenna Energy will not be responsible for delays caused by force majeure events, government restrictions, or site-related issues beyond our control.',
  'Any additional work not covered in this proposal will be executed only after written approval and issuance of a revised quotation.',
  'Disputes, if any, shall be subject to the jurisdiction of courts in Ernakulam, Kerala.',
];

export const SERVICE_DETAILS = [
  'Regular Monitoring of the system and complaint support for 5 years.',
];

export interface PaymentMilestone {
  percent: number;
  trigger: string;
}

export const PAYMENT_MILESTONES: PaymentMilestone[] = [
  { percent: 70, trigger: 'On acceptance of work order / with Purchase Order (advance)' },
  { percent: 15, trigger: 'Upon delivery of material at site' },
  { percent: 10, trigger: 'On completion of installation work' },
  { percent: 5, trigger: 'Immediately after meter installation' },
];

/** Legacy bullet list derived from milestones (Edit override key list-payment-terms). */
export const PAYMENT_TERMS = PAYMENT_MILESTONES.map(
  (m) => `${m.percent}% of the total invoice value — ${m.trigger}.`,
);

export const WARRANTY_SYSTEM_DEFAULT =
  '5 years complaint support and workmanship cover for the complete system (excludes consumables and force majeure).';

export const WARRANTY_TERMS = [
  WARRANTY_SYSTEM_DEFAULT,
  '12 Year product warranty and 30 year performance warranty for PV modules.',
  '10 Years warranty for Inverter (or as per manufacturer when specified).',
  'All other equipment supplied carries the original manufacturer\'s warranty.',
];

export const DELIVERY_TERMS = [
  '7 to 15 working days from the date of confirmed purchase order with advance. Materials will be delivered directly to the site.',
];

export const AUTHORITY_FEE_DEFAULTS = {
  feasibility: 1000,
  registrationPerKw: 1000,
  registrationFallback: 5000,
};

export const TECH_DETAILS_FOOTNOTE =
  '** Subject to availability. Makes and models may be substituted with equivalent Tier-1 alternatives with prior intimation.';

export const SUBSIDY_CREDIT_NOTE =
  'Subsidy, if applicable, shall be credited to your bank account by the relevant DISCOM / MNRE authority. Payable to Rayenna is independent of subsidy disbursement.';

export interface RaciRow {
  description: string;
  rayenna: boolean;
  client: boolean;
}

export const RACI_ROWS: RaciRow[] = [
  { description: 'Access to utility information / electricity bill', rayenna: false, client: true },
  { description: 'Name change / phase change / load enhancement in electricity bill', rayenna: false, client: true },
  { description: 'Access to site and shadow-free rooftop area', rayenna: false, client: true },
  { description: 'Detailed design & engineering (SLD, layout)', rayenna: true, client: false },
  { description: 'DISCOM feasibility / registration documentation support', rayenna: true, client: true },
  { description: 'Supply of solar system components (as per BOQ)', rayenna: true, client: false },
  { description: 'Secured storage area for materials till commissioning', rayenna: false, client: true },
  { description: 'Construction power and water at site', rayenna: false, client: true },
  { description: 'Civil works for module mounting structure (within scope)', rayenna: true, client: false },
  { description: 'Installation, testing & pre-commissioning', rayenna: true, client: false },
  { description: 'Internet / Wi-Fi (min. 1 Mbps) at inverter location', rayenna: false, client: true },
  { description: 'Net meter / bidirectional meter (if not by Utility)', rayenna: false, client: true },
  { description: 'Debris removal after installation', rayenna: true, client: false },
  { description: 'System operational training & handover', rayenna: true, client: true },
  { description: 'Regular cleaning of PV modules', rayenna: false, client: true },
  { description: 'Warranty document management / claim assistance', rayenna: true, client: true },
];

export const PROPOSAL_EXCLUSIONS = [
  'Load extension, name change, or similar modifications to the existing power meter are the customer’s responsibility.',
  'Civil works beyond the plinth/supports of solar panels (building modifications, chasing, painting, PCU room alterations) are excluded.',
  'Wi-Fi modem and internet connectivity within range of the inverter are in customer scope.',
  'Unloading / loading of materials and local labour facilitation at site are typically in customer scope unless agreed otherwise.',
  'Re-commissioning or component replacement after natural disasters is outside Rayenna’s warranty and at customer cost.',
];

export const KEY_POINTS = [
  'If installation requires components or quantities beyond this proposal, pricing may change — Rayenna will notify you in advance.',
  'Final commissioning depends on supply and installation of the net meter by the local DISCOM.',
  'Customers are advised to clean solar panels regularly for optimum generation.',
  'Timely payments are essential to adhere to project timelines.',
];

export const SUBSIDY_DISCLAIMER_TEXT = `The subsidy, if applicable, is subject to approval and disbursement by the relevant DISCOM and/or government authority. Rayenna Energy's scope is limited to providing reasonable assistance with documentation and procedural requirements. We have no control over, and shall not be liable or responsible for, any delay, rejection, non-approval, or non-disbursement of the subsidy by the concerned authorities. The Customer expressly acknowledges and agrees that all payment obligations under this agreement are absolute and unconditional, and are not linked to, dependent upon, or contingent upon the approval or receipt of any subsidy amount.`;

/** Structured closing-note copy — used by preview, PDF, share, DOCX, and PPT. */
export interface ClosingNoteModel {
  para1: string;
  para2: string;
  contactIntro: string;
  phone: string;
  email: string;
  website: string;
  websiteUrl: string;
  thankYou: string;
  regards: string;
  team: string;
  company: string;
}

export function closingNoteModel(p: ProposalData): ClosingNoteModel {
  const name = p.customer.customerName?.trim() || 'you';
  return {
    para1:
      'We at Rayenna Energy are committed to delivering a world-class solar installation that meets your energy needs and exceeds your expectations. Our team will be with you at every step — from design and installation to commissioning and beyond.',
    para2: `We look forward to the opportunity to partner with ${name} on this journey towards clean, sustainable energy.`,
    contactIntro: 'For any queries or clarifications, please feel free to contact us at:',
    phone: '+91 7907 369 304',
    email: 'sales@rayenna.energy',
    website: 'www.rayennaenergy.com',
    websiteUrl: 'https://www.rayennaenergy.com',
    thankYou: 'Thank you for considering Rayenna Energy as your solar partner.',
    regards: 'Warm regards,',
    team: 'Sales Team',
    company: 'Rayenna Energy Private Limited',
  };
}

/**
 * Plain-text closing note with letter-style blank lines (contact on one row).
 * Used for Edit-mode seeding, textOverrides, and plain-text export fallbacks.
 */
export function closingText(p: ProposalData): string {
  const m = closingNoteModel(p);
  return [
    m.para1,
    '',
    m.para2,
    '',
    m.contactIntro,
    `📞 ${m.phone}   📧 ${m.email}   🌐 ${m.website}`,
    '',
    m.thankYou,
    '',
    m.regards,
    '',
    '',
    m.team,
    m.company,
  ].join('\n');
}

/**
 * True when a saved override collapsed newlines into a single "log export" blob
 * (Warm regards glued to Sales Team, etc.). Prefer structured layout instead.
 */
export function isCollapsedClosingNote(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  const newlineCount = (t.match(/\n/g) ?? []).length;
  if (newlineCount >= 4) return false;
  return (
    /Warm regards/i.test(t) &&
    /Sales Team/i.test(t) &&
    /Rayenna Energy Private Limited/i.test(t)
  );
}
