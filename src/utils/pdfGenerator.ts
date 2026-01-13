import PDFDocument from 'pdfkit';
import { ProposalData, FinancialCalculations } from './proposalGenerator';

interface ProposalContent {
  executiveSummary: string;
  aboutRayenna: string;
  systemDescription: string;
  whyRayenna: string;
  nextSteps: string;
}

/**
 * Generate PDF proposal document
 */
export function generateProposalPDF(
  data: ProposalData,
  financials: FinancialCalculations,
  content: ProposalContent
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Solar Proposal - ${data.customer.name}`,
          Author: 'Rayenna Energy',
          Subject: 'Solar Power System Proposal',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      // Colors - Rayenna Energy branding (adjust as needed)
      const primaryColor = '#1e40af'; // Blue
      const secondaryColor = '#059669'; // Green
      const darkGray = '#374151';
      const lightGray = '#6b7280';

      // Cover Page
      doc
        .fillColor(primaryColor)
        .fontSize(32)
        .font('Helvetica-Bold')
        .text('RAYENNA ENERGY', 50, 100, { align: 'center' });

      doc
        .fillColor(lightGray)
        .fontSize(14)
        .font('Helvetica')
        .text('Renewable Energy Solutions', 50, 140, { align: 'center' });

      doc
        .fillColor(darkGray)
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Solar Power System Proposal', 50, 200, { align: 'center' });

      doc
        .fillColor(darkGray)
        .fontSize(16)
        .font('Helvetica')
        .text(`For: ${data.customer.name}`, 50, 280, { align: 'center' });

      doc
        .fillColor(lightGray)
        .fontSize(14)
        .text(`System Capacity: ${data.project.systemCapacity || 'N/A'} kW`, 50, 320, { align: 'center' });

      doc
        .fillColor(lightGray)
        .fontSize(12)
        .text(
          `Date: ${new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}`,
          50,
          360,
          { align: 'center' }
        );

      // Page break
      doc.addPage();

      // Executive Summary
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Executive Summary', 50, 50);

      doc
        .fillColor(darkGray)
        .fontSize(11)
        .font('Helvetica')
        .text(content.executiveSummary, 50, 85, {
          align: 'justify',
          width: 495,
        });

      // About Rayenna Energy
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('About Rayenna Energy', 50, doc.y + 30);

      doc
        .fillColor(darkGray)
        .fontSize(11)
        .font('Helvetica')
        .text(content.aboutRayenna, 50, doc.y + 10, {
          align: 'justify',
          width: 495,
        });

      // Proposed Solar System
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Proposed Solar System', 50, doc.y + 30);

      doc
        .fillColor(darkGray)
        .fontSize(11)
        .font('Helvetica')
        .text(content.systemDescription, 50, doc.y + 10, {
          align: 'justify',
          width: 495,
        });

      // System Specifications Table
      const specY = doc.y + 20;
      doc
        .fillColor(darkGray)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('System Specifications', 50, specY);

      const specs = [
        ['System Capacity', `${data.project.systemCapacity || 'N/A'} kW`],
        ['System Type', data.project.systemType?.replace('_', '-') || 'On-Grid'],
        ['Installation Type', data.project.roofType ? `${data.project.roofType} Roof` : 'Roof-mounted'],
        ['Panel Brand', data.project.panelBrand || 'Premium Quality'],
        ['Inverter Brand', data.project.inverterBrand || 'Premium Quality'],
        ['Estimated Annual Generation', `${financials.estimatedAnnualGeneration.toFixed(0)} kWh`],
      ];

      let tableY = specY + 25;
      specs.forEach(([label, value]) => {
        doc
          .fillColor(darkGray)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(label + ':', 50, tableY);
        doc
          .fillColor(lightGray)
          .fontSize(10)
          .font('Helvetica')
          .text(value, 200, tableY);
        tableY += 20;
      });

      // Financial Summary
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Financial Summary', 50, tableY + 20);

      const financialsData: Array<[string, string, boolean?]> = [
        ['Gross Project Cost', `₹${financials.grossProjectCost.toLocaleString('en-IN')}`],
        ['Subsidy Amount', `₹${financials.subsidyAmount.toLocaleString('en-IN')}`],
        ['Net Customer Investment', `₹${financials.netCustomerInvestment.toLocaleString('en-IN')}`, true],
        ['Estimated Annual Generation', `${financials.estimatedAnnualGeneration.toFixed(0)} kWh`],
        ['Estimated Yearly Savings', `₹${financials.estimatedYearlySavings.toLocaleString('en-IN')}`, true],
        ['Estimated Payback Period', `${financials.estimatedPaybackPeriod.toFixed(1)} years`],
        ['25-Year Lifetime Savings', `₹${financials.lifetimeSavings.toLocaleString('en-IN')}`, true],
      ];

      tableY = doc.y + 25;
      financialsData.forEach(([label, value, highlight]) => {
        if (highlight) {
          doc
            .rect(45, tableY - 5, 500, 18)
            .fillColor('#f3f4f6')
            .fill();
          doc.fillColor(darkGray);
        }
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(label + ':', 50, tableY);
        doc
          .fillColor(highlight ? secondaryColor : lightGray)
          .fontSize(10)
          .font(highlight ? 'Helvetica-Bold' : 'Helvetica')
          .text(value as string, 250, tableY);
        tableY += 25;
      });

      // Why Rayenna Energy
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Why Rayenna Energy', 50, tableY + 20);

      const whyPoints = content.whyRayenna.split('\n').filter((line) => line.trim());
      tableY = doc.y + 10;
      whyPoints.forEach((point) => {
        const cleanPoint = point.replace(/^[•\-\d.]+\s*/, '').trim();
        doc
          .fillColor(darkGray)
          .fontSize(10)
          .font('Helvetica')
          .text('• ' + cleanPoint, 60, tableY, {
            width: 480,
            continued: false,
          });
        tableY += 20;
      });

      // Next Steps
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Next Steps', 50, tableY + 20);

      const steps = content.nextSteps.split('\n').filter((line) => line.trim());
      tableY = doc.y + 10;
      steps.forEach((step, index) => {
        const cleanStep = step.replace(/^[•\-\d.]+\s*/, '').trim();
        doc
          .fillColor(darkGray)
          .fontSize(10)
          .font('Helvetica')
          .text(`${index + 1}. ${cleanStep}`, 60, tableY, {
            width: 480,
            continued: false,
          });
        tableY += 20;
      });

      // Footer on last page
      const footerY = 750;
      doc
        .fillColor(lightGray)
        .fontSize(9)
        .font('Helvetica')
        .text(
          'For queries, contact: sales@rayenna.energy | www.rayenna.energy',
          50,
          footerY,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
