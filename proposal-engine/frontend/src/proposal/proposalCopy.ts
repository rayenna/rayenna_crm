import type { ProposalData } from './types';
import { fmtINR } from './format';

export function execSummary(p: ProposalData): string {
  const sz   = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  const cost = p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
  const pb   = p.roi?.paybackYears;
  const sav  = p.roi?.totalSavings25Years;
  return `Dear ${p.customer.customerName || 'Valued Customer'},

Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the design, supply, installation, and commissioning of a ${sz > 0 ? `${sz} kW` : ''} On-Grid Solar Photovoltaic Power Plant at your premises${p.customer.location ? ` in ${p.customer.location}` : ''}.

This proposal has been prepared based on a detailed assessment of your energy requirements and site conditions. The proposed solar system will significantly reduce your electricity costs, provide energy independence, and contribute to a cleaner environment.${cost > 0 ? `\n\nThe total project investment is ${fmtINR(cost)}.` : ''}${pb ? ` With a payback period of approximately ${pb.toFixed(1)} years, this represents an excellent return on investment.` : ''}${sav ? ` Over 25 years, the system is projected to generate cumulative savings of ${fmtINR(sav)}.` : ''}`;
}

export function savingsText(p: ProposalData): string {
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

export function scopeText(p: ProposalData): string {
  const sz = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
  return `The scope of work for the ${sz > 0 ? `${sz} kW ` : ''}On-Grid Solar Power Plant covers four key areas: Site Survey & Design, Supply of Equipment, Installation & Commissioning, and Documentation & Handover.`;
}

export const CLIENT_SCOPE = [
  'Clear shadow free rooftop area for the installation of PV panels.',
  'Space for installation and commissioning of electrical panels.',
  'A secured area for storage of supplied equipment till commissioning.',
  'Electricity – construction power/Water shall be arranged by the owner at its own cost.',
  'Customer need to provide internet connectivity for the system.',
  'Feasibility Charges - Rs.1000/-',
  'Registration Charges - 5KW × Rs. 1000 (Rs.5000/-) + 18% GST.',
  'Bidirectional / Net Meter.',
];

export const TERMS_AND_CONDITIONS = [
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

export const SERVICE_DETAILS = [
  'Regular Monitoring of the system and complaint support for 5 years.',
];

export const PAYMENT_TERMS = [
  '70% advance of the total invoice value to be paid along with the Purchase Order.',
  '15% of the total invoice value to be made towards supply of material at site.',
  '10% against work completion.',
  '5% to be paid immediately after meter installation.',
];


export const WARRANTY_TERMS = [
  '12 Year product warranty and 30 year performance warranty for PV modules.',
  '10 Years warranty for Inverter.',
  'All other equipment supplied carries the original manufacturer\'s warranty.',
];

export const DELIVERY_TERMS = [
  '7 to 15 working days from the date of confirmed purchase order with advance.',
];

export const SUBSIDY_DISCLAIMER_TEXT = `The subsidy, if applicable, is subject to approval and disbursement by the relevant DISCOM and/or government authority. Rayenna Energy's scope is limited to providing reasonable assistance with documentation and procedural requirements. We have no control over, and shall not be liable or responsible for, any delay, rejection, non-approval, or non-disbursement of the subsidy by the concerned authorities. The Customer expressly acknowledges and agrees that all payment obligations under this agreement are absolute and unconditional, and are not linked to, dependent upon, or contingent upon the approval or receipt of any subsidy amount.`;

export function closingText(p: ProposalData): string {
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
