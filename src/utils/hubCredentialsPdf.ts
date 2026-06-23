import PDFDocument from 'pdfkit';

export type HubCredentialsPdfInput = {
  username: string;
  password: string;
  customerName: string;
  projectSlNo: number;
};

export function generateHubCredentialsPdf(input: HubCredentialsPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#b8860b').text('Rayenna Solar Hub', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#333333').text('Your login credentials', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).fillColor('#666666').text('Customer');
    doc.fontSize(13).fillColor('#111111').text(input.customerName);
    doc.moveDown(0.8);
    doc.fontSize(11).fillColor('#666666').text('Project');
    doc.fontSize(13).fillColor('#111111').text(`#${input.projectSlNo}`);
    doc.moveDown(1.5);

    doc.rect(50, doc.y, doc.page.width - 100, 100).fillAndStroke('#faf8f3', '#d4a84b');
    const boxY = doc.y + 15;
    doc.fillColor('#666666').fontSize(10).text('Username', 65, boxY);
    doc.fillColor('#111111').fontSize(16).text(input.username, 65, boxY + 14);
    doc.fillColor('#666666').fontSize(10).text('Password', 65, boxY + 42);
    doc.fillColor('#111111').fontSize(16).text(input.password, 65, boxY + 56);
    doc.y = boxY + 115;

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#888888').text(
      'Sign in at the Rayenna Solar Hub app using your username and password. ' +
        'Keep this document secure. Contact Rayenna Energy if you need assistance.',
      { align: 'left', width: doc.page.width - 100 },
    );
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#aaaaaa').text(
      `Generated ${new Date().toLocaleString('en-IN')} · Rayenna Energy`,
      { align: 'center' },
    );

    doc.end();
  });
}
