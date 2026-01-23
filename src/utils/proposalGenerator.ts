import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ProposalData {
  customer: {
    name: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    phone?: string;
    email?: string;
    customerType?: string;
  };
  project: {
    systemCapacity?: number;
    projectCost?: number;
    systemType?: string;
    roofType?: string;
    panelBrand?: string;
    inverterBrand?: string;
    incentiveEligible: boolean;
    loanDetails?: string;
  };
  salesperson: {
    name?: string;
  };
}

export interface FinancialCalculations {
  grossProjectCost: number;
  subsidyAmount: number;
  netCustomerInvestment: number;
  estimatedAnnualGeneration: number; // kWh
  estimatedYearlySavings: number; // ₹
  estimatedPaybackPeriod: number; // years
  lifetimeSavings: number; // 25 years
  currentElectricityCost: number; // per kWh (assumed ₹6 for residential, ₹8 for commercial)
}

/**
 * Calculate financial metrics for the proposal
 */
export function calculateFinancials(data: ProposalData): FinancialCalculations {
  const systemCapacity = data.project.systemCapacity || 0;
  const grossProjectCost = data.project.projectCost || 0;
  
  // Calculate subsidy (typically 30% for residential subsidy projects)
  const isSubsidyEligible = data.project.incentiveEligible;
  const subsidyPercentage = isSubsidyEligible ? 0.30 : 0;
  const subsidyAmount = grossProjectCost * subsidyPercentage;
  const netCustomerInvestment = grossProjectCost - subsidyAmount;

  // Estimate annual generation (assuming 4-5 units per kW per day, 1450-1825 units per kW per year)
  // Using conservative estimate of 4.5 units/kW/day = 1642.5 units/kW/year
  const unitsPerKwPerYear = 1642.5;
  const estimatedAnnualGeneration = systemCapacity * unitsPerKwPerYear;

  // Estimate current electricity cost (₹6/kWh residential, ₹8/kWh commercial)
  const isResidential = data.customer.customerType === 'RESIDENTIAL' || 
                       data.customer.customerType === 'APARTMENT';
  const costPerUnit = isResidential ? 6 : 8;
  const estimatedYearlySavings = estimatedAnnualGeneration * costPerUnit;

  // Payback period = Net Investment / Yearly Savings
  const estimatedPaybackPeriod = netCustomerInvestment > 0 && estimatedYearlySavings > 0
    ? netCustomerInvestment / estimatedYearlySavings
    : 0;

  // 25-year lifetime savings (assuming 1% degradation per year)
  let lifetimeSavings = 0;
  for (let year = 1; year <= 25; year++) {
    const degradationFactor = Math.pow(0.99, year - 1); // 1% degradation per year
    lifetimeSavings += estimatedYearlySavings * degradationFactor;
  }

  return {
    grossProjectCost,
    subsidyAmount,
    netCustomerInvestment,
    estimatedAnnualGeneration,
    estimatedYearlySavings,
    estimatedPaybackPeriod,
    lifetimeSavings,
    currentElectricityCost: costPerUnit,
  };
}

/**
 * Generate proposal content using AI
 */
export async function generateProposalContent(data: ProposalData, financials: FinancialCalculations): Promise<{
  executiveSummary: string;
  aboutRayenna: string;
  systemDescription: string;
  whyRayenna: string;
  nextSteps: string;
  fullContent: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const isResidential = data.customer.customerType === 'RESIDENTIAL' || 
                       data.customer.customerType === 'APARTMENT';
  const hasSubsidy = data.project.incentiveEligible;
  const hasLoan = data.project.loanDetails ? JSON.parse(data.project.loanDetails || '{}').hasLoan : false;

  // Build address string
  const addressParts = [
    data.customer.addressLine1,
    data.customer.addressLine2,
    data.customer.city,
    data.customer.state,
    data.customer.pinCode,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 
    ? addressParts.join(', ') 
    : (data.customer.address || 'N/A');

  const prompt = `Generate a professional solar proposal for Rayenna Energy, a Kerala-based solar EPC company.

Customer Information:
- Name: ${data.customer.name}
- Location: ${fullAddress}
- Phone: ${data.customer.phone || 'N/A'}
- Email: ${data.customer.email || 'N/A'}
- Customer Type: ${isResidential ? 'Residential' : 'Commercial/Industrial'}

System Specifications:
- System Capacity: ${data.project.systemCapacity || 'N/A'} kW
- System Type: ${data.project.systemType || 'On-Grid'}
- Roof Type: ${data.project.roofType || 'N/A'}
- Panel Brand: ${data.project.panelBrand || 'Premium Quality'}
- Inverter Brand: ${data.project.inverterBrand || 'Premium Quality'}
- Installation Type: Roof-mounted

Financial Summary:
- Gross Project Cost: ₹${financials.grossProjectCost.toLocaleString('en-IN')}
- Subsidy Eligible: ${hasSubsidy ? 'Yes' : 'No'}
- Subsidy Amount: ₹${financials.subsidyAmount.toLocaleString('en-IN')}
- Net Customer Investment: ₹${financials.netCustomerInvestment.toLocaleString('en-IN')}
- Estimated Annual Generation: ${financials.estimatedAnnualGeneration.toFixed(0)} kWh
- Estimated Yearly Savings: ₹${financials.estimatedYearlySavings.toLocaleString('en-IN')}
- Estimated Payback Period: ${financials.estimatedPaybackPeriod.toFixed(1)} years
- 25-Year Lifetime Savings: ₹${financials.lifetimeSavings.toLocaleString('en-IN')}
- Loan: ${hasLoan ? 'Yes (available)' : 'No'}

Salesperson: ${data.salesperson.name || 'Rayenna Energy Team'}

Generate a comprehensive, professional solar proposal written in Indian English for ${isResidential ? 'residential' : 'commercial'} customers. 

The proposal must include these sections and respond in JSON format:

1. executiveSummary: A personalized 2-3 sentence summary highlighting the system size, expected savings (${Math.round((financials.estimatedYearlySavings / financials.grossProjectCost) * 100)}% of investment annually), and key benefits. Start with "This proposal outlines..."

2. aboutRayenna: Fixed company description (use exactly): "Rayenna Energy is a Kerala-based renewable energy solutions provider specializing in residential, commercial, and industrial solar power systems with end-to-end execution including design, installation, grid approvals, and subsidy facilitation. With a commitment to quality and customer satisfaction, we ensure seamless transition to clean energy."

3. systemDescription: A 3-4 sentence description of the proposed ${data.project.systemCapacity} kW system, highlighting ${data.project.panelBrand || 'premium quality panels'}, ${data.project.inverterBrand || 'reliable inverters'}, ${data.project.roofType || 'roof'} installation, and estimated annual generation of ${financials.estimatedAnnualGeneration.toFixed(0)} kWh.

4. whyRayenna: Generate 5-6 bullet points highlighting:
   - MNRE compliance and certifications
   - KSEB approvals and grid connectivity expertise
   - Premium quality components with warranties
   - Comprehensive after-sales support
   - Strong track record in Kerala
   - Turnkey execution capability
Format as a single string with bullet points separated by newlines (• or -)

5. nextSteps: Generate a clear 4-5 step process including:
   - Site visit confirmation (if not done)
   - Agreement signing
   - Advance payment
   - Installation timeline (typically 15-30 days)
   - Commissioning and handover
Format as a single string with steps separated by newlines (numbered or bulleted)

6. fullContent: A complete, formatted proposal combining all sections above in a cohesive document format.

Tone: Professional, persuasive, trustworthy, and suitable for Indian customers. Emphasize ROI, savings, quality, and Rayenna Energy's expertise in Kerala's solar market.

Respond ONLY in valid JSON format with these exact keys: executiveSummary, aboutRayenna, systemDescription, whyRayenna, nextSteps, fullContent`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional solar energy consultant writing proposals for Rayenna Energy. Create detailed, accurate, and persuasive proposals in Indian English. Always respond in valid JSON format only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);

    return {
      executiveSummary: parsed.executiveSummary || 'This proposal outlines a comprehensive solar power solution.',
      aboutRayenna: parsed.aboutRayenna || 'Rayenna Energy is a Kerala-based renewable energy solutions provider.',
      systemDescription: parsed.systemDescription || 'The proposed system...',
      whyRayenna: parsed.whyRayenna || '• Quality components\n• Professional installation',
      nextSteps: parsed.nextSteps || '1. Site visit\n2. Agreement\n3. Installation',
      fullContent: parsed.fullContent || parsed.executiveSummary || '',
    };
  } catch (error: any) {
    // Log error without exposing API key or sensitive details
    console.error('OpenAI API error in proposal generation:', {
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString(),
    });
    
    // Provide user-friendly error messages
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      throw new Error('AI service authentication failed. Please contact support.');
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      throw new Error('AI service rate limit exceeded. Please try again later.');
    }
    
    throw new Error('Failed to generate proposal content. Please try again later.');
  }
}
