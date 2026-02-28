import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { calculateROI, type ROIResult } from './roi.service';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface BOMSummaryItem {
  itemName: string;
  specification: string;
  quantity: number;
  brand: string;
  warranty: string;
}

export interface ProposalGeneratorInput {
  proposalId: number;
}

export interface GeneratedSection {
  title: string;
  content: string;       // markdown-friendly plain text
  source: 'ai' | 'template';
}

export interface GeneratedProposal {
  proposalId: number;
  refNumber: string;
  generatedAt: string;
  mode: 'ai-enhanced' | 'template-only';

  // ── Header ──
  customerName: string;
  systemSizeKw: number;
  location: string;

  // ── Sections ──
  executiveSummary: GeneratedSection;
  savingsExplanation: GeneratedSection;
  environmentalImpact: GeneratedSection;
  aboutRayenna: GeneratedSection;
  scopeOfWork: GeneratedSection;
  billOfQuantities: BOMSummaryItem[];
  commercials: CommercialSection;
  termsAndConditions: string[];
  paymentTerms: string[];
  closingNote: GeneratedSection;

  // ── Raw data used ──
  roiSnapshot: {
    annualGeneration: number;
    annualSavings: number;
    paybackYears: number;
    totalSavings25Years: number;
    roiPercent: number;
    lcoe: number;
    co2OffsetTons: number;
    projectCost: number;
  };
}

export interface CommercialSection {
  projectCost: number;
  gstPercent: number;
  gstAmount: number;
  totalWithGst: number;
  currency: string;
}

// ─────────────────────────────────────────────
// Rayenna brand voice constants
// Extracted from Profile.pdf + Proposal1.docx + Proposal2.docx
// ─────────────────────────────────────────────

const RAYENNA_ABOUT = `Rayenna Energy is a leading provider of innovative solar energy solutions dedicated to transforming the way you harness and use energy. With a deep commitment to delivering high-quality solar installations that prioritize sustainability, efficiency, and affordability, we believe in creating a greener future.

At Rayenna, our core values guide us. We prioritize sustainability and understand our role in protecting the environment. With a customer-first approach, we tailor solutions to meet your unique needs, ensuring transparency and communication throughout the process. Our dedication to quality means we source only the best materials, delivering efficient solar systems designed for durability.`;

const RAYENNA_SCOPE = `Design, Procure, Installation & Commissioning of the system as per BOQ.

Our process for seamless solar integration:
1. Consultation — Through a customised consultation, we first ascertain your energy needs and goals.
2. Site Evaluation — To identify the ideal solar solution for your property, our team thoroughly evaluates the site.
3. System Design — We develop a unique solar system that optimises performance and efficiency based on the evaluation.
4. Installation — Your solar system is built to the highest standards by our trained installers, who execute the process with accuracy.
5. Ongoing Support — We offer ongoing maintenance and support to ensure that your system operates efficiently.`;

const TERMS_AND_CONDITIONS = [
  'GST rates are subject to periodic changes. GST rates as on the date of Invoice will be only considered.',
  'Capacity that can be installed is subject to allocation of feasibility by the local utility.',
  'Any additional super structure required for the project needs to be taken up by the customer.',
  'Any modification to the existing electrical system due to non-conformity to Electrical Inspectorate / Utility standards will have to be carried out by the customer.',
  'Net Meter cost will be additional if not supplied by Utility.',
  'Customer shall provide necessary support for getting approvals from the concerned utility section offices.',
  'VALIDITY: The offer is valid for 15 days from the date of proposal. The rate may vary after 15 days.',
  'WARRANTY: 12-year product warranty and 30-year performance warranty for PV modules. 7-year warranty for Inverter.',
  'MATERIAL DELIVERY: 15 to 30 working days from the date of confirmed purchase order with advance.',
  'SERVICE: Regular monitoring of the system and complaint support for 5 years. Panel cleaning and inspection every 6 months for 5 years.',
];

const PAYMENT_TERMS = [
  '50% advance of the total invoice value to be paid along with the Purchase Order.',
  '30% of the total invoice value to be made towards supply of material at site.',
  '10% against work completion.',
  'Balance 10% to be paid immediately after meter installation.',
  'All payments via NEFT/RTGS in favour of Rayenna Energy Private Limited.',
  'Bank: Axis Bank | Account: 924020063493172 | IFSC: UTIB0000827',
];

// ─────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Crore`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} Lakh`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function refNumber(id: number): string {
  const pad = String(id).padStart(3, '0');
  const date = new Date();
  const yr = date.getFullYear().toString().slice(2);
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `RYN/PROPOSAL/${yr}${mo}-${pad}`;
}

// ─────────────────────────────────────────────
// Template-only section generators
// These are always available — no API key needed
// ─────────────────────────────────────────────

function templateExecutiveSummary(
  customerName: string,
  systemSizeKw: number,
  location: string,
  roi: ROIResult
): string {
  return `Dear ${customerName},

We are pleased to present this proposal for a ${systemSizeKw} kW On-Grid Solar Power Plant at ${location}, prepared by Rayenna Energy Private Limited.

This proposal outlines a comprehensive solar energy solution designed to significantly reduce your electricity costs while contributing to a sustainable future. Based on our technical assessment, a ${systemSizeKw} kW system at your location is projected to generate approximately ${roi.annualGeneration.toLocaleString('en-IN')} kWh of clean energy annually.

With the current electricity tariff and an annual escalation of ${roi.inputs.escalationPercent}%, your investment of ${fmtINR(roi.inputs.projectCost)} is expected to be fully recovered within ${roi.paybackYears.toFixed(1)} years. Over a 25-year system lifetime, you stand to save ${fmtINR(roi.totalSavings25Years)} — a return of ${roi.roiPercent.toFixed(1)}% on your investment.

Rayenna Energy brings deep expertise in solar installations across residential and commercial segments. We source only Tier-1 components, offer 5-year service support, and manage the entire process from feasibility to commissioning.

We look forward to partnering with you on this journey towards energy independence.`;
}

function templateSavingsExplanation(
  customerName: string,
  systemSizeKw: number,
  roi: ROIResult
): string {
  const yr5savings = roi.yearlyBreakdown[4]?.cumulativeSavings ?? 0;
  const yr10savings = roi.yearlyBreakdown[9]?.cumulativeSavings ?? 0;
  const yr25tariff = roi.yearlyBreakdown[24]?.tariffRate ?? 0;

  return `FINANCIAL BENEFITS ANALYSIS

Your ${systemSizeKw} kW solar system is designed to deliver measurable, compounding financial returns from day one.

YEAR-1 PERFORMANCE
• Annual energy generation: ${roi.annualGeneration.toLocaleString('en-IN')} kWh
• Year-1 electricity savings: ${fmtINR(roi.annualSavings)}
• Effective cost per unit generated: ₹${roi.lcoe.toFixed(2)}/kWh vs current grid rate of ₹${roi.inputs.tariff.toFixed(2)}/kWh
• Solar is ${(((roi.inputs.tariff - roi.lcoe) / roi.inputs.tariff) * 100).toFixed(0)}% cheaper than grid power from day one

CUMULATIVE SAVINGS MILESTONES
• By Year 5: ${fmtINR(yr5savings)} saved
• By Year 10: ${fmtINR(yr10savings)} saved
• By Year 25: ${fmtINR(roi.totalSavings25Years)} saved

PAYBACK & RETURNS
• Full investment recovery: ${roi.paybackYears.toFixed(1)} years
• 25-year ROI: ${roi.roiPercent.toFixed(1)}%
• Projected tariff in Year 25: ₹${yr25tariff.toFixed(2)}/kWh (at ${roi.inputs.escalationPercent}% annual escalation)

ASSUMPTIONS
• Generation factor: ${roi.inputs.generationFactor} kWh/kW/year (location-adjusted)
• Panel degradation: 0.5% per year from Year 2 onwards
• Annual tariff escalation: ${roi.inputs.escalationPercent}%
• System lifetime: 25 years

Note: Actual savings may vary based on grid tariff revisions, shading conditions, and system maintenance. The above projections are based on conservative industry-standard assumptions.`;
}

function templateEnvironmentalImpact(
  systemSizeKw: number,
  roi: ROIResult
): string {
  const totalGeneration25 = roi.yearlyBreakdown.reduce((s, r) => s + r.generation, 0);
  const treesEquivalent = Math.round(roi.co2OffsetTons * 45); // ~45 trees per tonne CO₂/year
  const homesEquivalent = Math.round((roi.annualGeneration / 1200)); // avg Indian home ~1200 kWh/yr

  return `ENVIRONMENTAL IMPACT STATEMENT

By choosing solar energy, ${'' /* customerName injected by caller */}you are making a powerful commitment to a cleaner, more sustainable India.

CARBON FOOTPRINT REDUCTION
• CO₂ offset over 25 years: ${roi.co2OffsetTons.toFixed(1)} metric tonnes
• This is equivalent to planting approximately ${treesEquivalent.toLocaleString('en-IN')} trees
• Annual CO₂ avoided: ${(roi.co2OffsetTons / 25).toFixed(1)} tonnes/year

CLEAN ENERGY GENERATION
• Total clean energy over 25 years: ${Math.round(totalGeneration25).toLocaleString('en-IN')} kWh
• Equivalent to powering ${homesEquivalent} average Indian homes for a full year
• Every unit generated displaces coal-based grid power (emission factor: 0.82 kg CO₂/kWh, CEA 2023)

NATIONAL CONTRIBUTION
India has committed to 500 GW of renewable energy capacity by 2030. Your ${systemSizeKw} kW installation is a direct contribution to this national mission, reducing dependence on fossil fuels and supporting grid stability.

SUSTAINABILITY CREDENTIALS
• Zero operational emissions
• Minimal water usage (panel cleaning only)
• No noise pollution
• Fully recyclable panel components at end of life

Rayenna Energy is proud to be your partner in this green transition. Together, we are building a sustainable future — one rooftop at a time.`;
}

function templateClosingNote(customerName: string): string {
  return `We hope our offer is in line with your requirements and meets your expectations. Please contact us for any clarifications.

Looking forward to your valuable order confirmation.

Thanking you and assuring you of our best attention and services at all times.

FOR RAYENNA ENERGY PRIVATE LIMITED

GANESH VENKITACHALAM
MANAGING DIRECTOR

Rayenna Energy Private Limited
Door No 3324/52, Ray Bhavan, NH Bypass, Thykoodam, Kochi - 682019
Tel: +91 7907 369 304 | E-mail: sales@rayenna.energy | www.rayennaenergy.com
GST No: 32AANCR8677A1Z6`;
}

// ─────────────────────────────────────────────
// OpenAI enhancement
// Rewrites the three narrative sections in
// Rayenna's brand voice when a key is present
// ─────────────────────────────────────────────

async function enhanceWithAI(
  section: 'executive_summary' | 'savings_explanation' | 'environmental_impact',
  templateText: string,
  context: {
    customerName: string;
    systemSizeKw: number;
    location: string;
    roi: ROIResult;
  }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return templateText; // graceful fallback

  const client = new OpenAI({ apiKey });

  const systemPrompt = `You are a professional solar energy proposal writer for Rayenna Energy Private Limited, a leading solar company based in Kochi, India.

Rayenna's brand voice is:
- Professional yet warm and approachable
- Confident and data-driven
- Customer-first — always address the customer by name
- Focused on long-term partnership, not just a transaction
- Uses Indian number formatting (Lakh, Crore) for large amounts
- References India's renewable energy mission where relevant

You are enhancing a section of a solar proposal. Keep the same factual data but make the language more compelling, personalized, and aligned with Rayenna's brand. Keep it concise — no more than 250 words per section. Do not add any data that isn't in the template.`;

  const userPrompt = `Customer: ${context.customerName}
System Size: ${context.systemSizeKw} kW
Location: ${context.location}

Section to enhance: ${section.replace(/_/g, ' ').toUpperCase()}

Template text:
${templateText}

Please rewrite this section in Rayenna's brand voice. Return only the enhanced text, no headings or meta-commentary.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() ?? templateText;
}

// ─────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────

export async function generateProposal(
  input: ProposalGeneratorInput
): Promise<GeneratedProposal> {
  const { proposalId } = input;

  // ── 1. Load all data from DB ──────────────────
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      costingItems: true,
      bomItems: true,
      roi: true,
    },
  });
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

  // ── 2. Reconstruct ROI result ─────────────────
  let roiResult: ROIResult;
  if (proposal.roi) {
    roiResult = calculateROI({
      systemSizeKw:      proposal.roi.systemSizeKw,
      tariff:            proposal.roi.tariff,
      generationFactor:  proposal.roi.generationFactor,
      escalationPercent: proposal.roi.escalationPercent,
      projectCost:       proposal.roi.projectCost,
    });
  } else {
    // ROI not yet calculated — derive from proposal fields with defaults
    const projectCost = proposal.costingItems.reduce((s, i) => s + i.totalCost, 0);
    roiResult = calculateROI({
      systemSizeKw:      proposal.systemSizeKw,
      tariff:            proposal.tariff,
      generationFactor:  1500,
      escalationPercent: 5,
      projectCost,
    });
  }

  // ── 3. Build BOM summary ──────────────────────
  const bomItems: BOMSummaryItem[] = proposal.bomItems.length > 0
    ? proposal.bomItems.map((b) => ({
        itemName:      b.itemName,
        specification: b.specification,
        quantity:      b.quantity,
        brand:         b.brand,
        warranty:      b.warranty,
      }))
    : proposal.costingItems.map((c) => ({
        itemName:      c.itemName,
        specification: `${c.category} — ${c.quantity} units @ ₹${c.unitCost}`,
        quantity:      c.quantity,
        brand:         '—',
        warranty:      '—',
      }));

  // ── 4. Commercials ────────────────────────────
  const GST_PERCENT = 18;
  const projectCost = roiResult.inputs.projectCost;
  const gstAmount   = Math.round(projectCost * GST_PERCENT) / 100;
  const commercials: CommercialSection = {
    projectCost,
    gstPercent: GST_PERCENT,
    gstAmount,
    totalWithGst: Math.round((projectCost + gstAmount) * 100) / 100,
    currency: 'INR',
  };

  // ── 5. Generate template sections ────────────
  const templateExec = templateExecutiveSummary(
    proposal.customerName, proposal.systemSizeKw, proposal.location, roiResult
  );
  const templateSavings = templateSavingsExplanation(
    proposal.customerName, proposal.systemSizeKw, roiResult
  );
  const templateEnv = templateEnvironmentalImpact(proposal.systemSizeKw, roiResult)
    .replace("you are making", `${proposal.customerName}, you are making`);

  // ── 6. Optionally enhance with AI ────────────
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const ctx = {
    customerName: proposal.customerName,
    systemSizeKw: proposal.systemSizeKw,
    location: proposal.location,
    roi: roiResult,
  };

  let execContent     = templateExec;
  let savingsContent  = templateSavings;
  let envContent      = templateEnv;
  let mode: GeneratedProposal['mode'] = 'template-only';

  if (hasApiKey) {
    try {
      [execContent, savingsContent, envContent] = await Promise.all([
        enhanceWithAI('executive_summary',    templateExec,    ctx),
        enhanceWithAI('savings_explanation',  templateSavings, ctx),
        enhanceWithAI('environmental_impact', templateEnv,     ctx),
      ]);
      mode = 'ai-enhanced';
    } catch (err) {
      // AI failed — fall back to template silently
      console.warn('[proposal-generator] OpenAI enhancement failed, using template:', err);
      execContent    = templateExec;
      savingsContent = templateSavings;
      envContent     = templateEnv;
      mode           = 'template-only';
    }
  }

  // ── 7. Assemble final proposal ────────────────
  return {
    proposalId,
    refNumber: refNumber(proposalId),
    generatedAt: new Date().toISOString(),
    mode,

    customerName:  proposal.customerName,
    systemSizeKw:  proposal.systemSizeKw,
    location:      proposal.location,

    executiveSummary: {
      title: 'Executive Summary',
      content: execContent,
      source: hasApiKey ? 'ai' : 'template',
    },
    savingsExplanation: {
      title: 'Financial Benefits & Savings Analysis',
      content: savingsContent,
      source: hasApiKey ? 'ai' : 'template',
    },
    environmentalImpact: {
      title: 'Environmental Impact',
      content: envContent,
      source: hasApiKey ? 'ai' : 'template',
    },
    aboutRayenna: {
      title: 'About Rayenna Energy',
      content: RAYENNA_ABOUT,
      source: 'template',
    },
    scopeOfWork: {
      title: 'Scope of Work',
      content: RAYENNA_SCOPE,
      source: 'template',
    },

    billOfQuantities: bomItems,
    commercials,
    termsAndConditions: TERMS_AND_CONDITIONS,
    paymentTerms: PAYMENT_TERMS,

    closingNote: {
      title: 'Closing',
      content: templateClosingNote(proposal.customerName),
      source: 'template',
    },

    roiSnapshot: {
      annualGeneration:    roiResult.annualGeneration,
      annualSavings:       roiResult.annualSavings,
      paybackYears:        roiResult.paybackYears,
      totalSavings25Years: roiResult.totalSavings25Years,
      roiPercent:          roiResult.roiPercent,
      lcoe:                roiResult.lcoe,
      co2OffsetTons:       roiResult.co2OffsetTons,
      projectCost:         roiResult.inputs.projectCost,
    },
  };
}
