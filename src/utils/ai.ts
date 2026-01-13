import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface SiteSurveyData {
  roofArea?: number;
  shading?: string;
  discom?: string;
  meterType?: string;
  remarks?: string;
}

interface ProjectData {
  systemCapacity?: number;
  systemType?: string;
  panelBrand?: string;
  inverterBrand?: string;
  projectCost?: number;
  customerName?: string;
  city?: string;
  state?: string;
}

/**
 * Generate a proposal PDF content using AI
 */
export async function generateProposalContent(
  siteSurvey: SiteSurveyData,
  project: ProjectData
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Generate a professional solar energy proposal for Rayenna Energy.

Customer Details:
- Name: ${project.customerName || 'N/A'}
- Location: ${project.city || 'N/A'}, ${project.state || 'N/A'}

System Specifications:
- Capacity: ${project.systemCapacity || 'N/A'} kW
- System Type: ${project.systemType || 'N/A'}
- Panel Brand: ${project.panelBrand || 'N/A'}
- Inverter Brand: ${project.inverterBrand || 'N/A'}

Site Survey Details:
- Roof Area: ${siteSurvey.roofArea || 'N/A'} sq ft
- Shading: ${siteSurvey.shading || 'N/A'}
- Discom: ${siteSurvey.discom || 'N/A'}
- Meter Type: ${siteSurvey.meterType || 'N/A'}
- Remarks: ${siteSurvey.remarks || 'N/A'}

Project Value: ₹${project.projectCost?.toLocaleString('en-IN') || 'N/A'}

Generate a comprehensive proposal document that includes:
1. Executive Summary
2. System Overview and Specifications
3. Energy Generation Estimates
4. Financial Analysis (ROI, Payback Period, Annual Savings)
5. Installation Timeline
6. Warranty and Maintenance
7. Terms and Conditions

Format the response as a professional proposal document.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional solar energy consultant writing proposals for Rayenna Energy. Create detailed, accurate, and persuasive proposals.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || 'Failed to generate proposal';
  } catch (error) {
    console.error('Error generating proposal:', error);
    throw new Error('Failed to generate proposal content');
  }
}

/**
 * Predict project delays based on historical data
 */
export async function predictProjectDelay(projectId: string): Promise<{
  predictedDelay: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Get project data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      customer: true,
      siteSurveys: true,
      proposals: true,
      installations: true,
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Get similar historical projects (match by capacity and stage)
  const similarProjects = await prisma.project.findMany({
    where: {
      systemCapacity: project.systemCapacity
        ? {
            gte: (project.systemCapacity || 0) * 0.8,
            lte: (project.systemCapacity || 0) * 1.2,
          }
        : undefined,
      projectStage: project.projectStage || undefined,
      // Note: we intentionally do NOT filter by customer.city here because that is a related field
      // and not a scalar on ProjectWhereInput.
    },
    take: 10,
  });

  // Safely read lifecycle fields (may not exist on older generated types)
  const stageEnteredAt: Date | null = (project as any).stageEnteredAt || null;
  const slaDays: number | null = (project as any).slaDays ?? null;
  const statusIndicator: string | null = (project as any).statusIndicator ?? null;

  const prompt = `Analyze this solar project and predict potential delays:

Current Project:
- Stage: ${project.projectStage || 'N/A'}
- System Capacity: ${project.systemCapacity || 'N/A'} kW
- Days in Current Stage: ${
    stageEnteredAt
      ? Math.floor(
          (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 'N/A'
  }
- SLA Days: ${slaDays || 'N/A'}
- Status: ${statusIndicator || 'N/A'}

Historical Data:
${similarProjects
  .map((p, i) => {
    const histStatus = (p as any).statusIndicator ?? 'N/A';
    return `Project ${i + 1}: ${p.systemCapacity}kW, Stage: ${p.projectStage}, Status: ${histStatus}`;
  })
  .join('\n')}

Predict:
1. Likely delay in days
2. Risk level (LOW/MEDIUM/HIGH)
3. Top 3 reasons for potential delay

Respond in JSON format: {"predictedDelay": number, "riskLevel": "LOW|MEDIUM|HIGH", "reasons": ["reason1", "reason2", "reason3"]}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a project management AI analyzing solar project timelines. Provide accurate delay predictions based on patterns.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      predictedDelay: response.predictedDelay || 0,
      riskLevel: response.riskLevel || 'LOW',
      reasons: response.reasons || [],
    };
  } catch (error) {
    console.error('Error predicting delay:', error);
    return {
      predictedDelay: 0,
      riskLevel: 'LOW',
      reasons: ['Unable to analyze'],
    };
  }
}

/**
 * Suggest optimal pricing based on historical projects
 */
export async function suggestOptimalPricing(
  systemCapacity: number,
  systemType: string,
  city?: string,
  customerType?: string
): Promise<{
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  reasoning: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Get similar historical projects
  const similarProjects = await prisma.project.findMany({
    where: {
      systemCapacity: {
        gte: systemCapacity * 0.8,
        lte: systemCapacity * 1.2,
      },
      // Cast to any to satisfy Prisma's enum type while still accepting a string parameter
      systemType: (systemType || undefined) as any,
    },
    take: 20,
  });

  const avgPrice =
    similarProjects.reduce((sum, p) => sum + (p.projectCost || 0), 0) /
    (similarProjects.length || 1);
  const avgPricePerKw = avgPrice / systemCapacity;

  const prompt = `Suggest optimal pricing for a solar project:

Specifications:
- System Capacity: ${systemCapacity} kW
- System Type: ${systemType || 'On-grid'}
- Location: ${city || 'N/A'}
- Customer Type: ${customerType || 'N/A'}

Historical Data (${similarProjects.length} similar projects):
- Average Price: ₹${avgPrice.toLocaleString('en-IN')}
- Average Price per kW: ₹${avgPricePerKw.toLocaleString('en-IN')}
- Price Range: ₹${Math.min(...similarProjects.map((p) => p.projectCost || 0)).toLocaleString(
    'en-IN'
  )} - ₹${Math.max(...similarProjects.map((p) => p.projectCost || 0)).toLocaleString('en-IN')}

Suggest:
1. Optimal price for this project
2. Price range (min-max)
3. Reasoning for the pricing

Respond in JSON format: {"suggestedPrice": number, "priceRange": {"min": number, "max": number}, "reasoning": "string"}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a pricing analyst for solar energy projects. Provide competitive yet profitable pricing suggestions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      suggestedPrice: response.suggestedPrice || avgPrice,
      priceRange: response.priceRange || { min: avgPrice * 0.9, max: avgPrice * 1.1 },
      reasoning: response.reasoning || 'Based on historical data',
    };
  } catch (error) {
    console.error('Error suggesting pricing:', error);
    return {
      suggestedPrice: avgPrice,
      priceRange: { min: avgPrice * 0.9, max: avgPrice * 1.1 },
      reasoning: 'Based on historical average pricing',
    };
  }
}
