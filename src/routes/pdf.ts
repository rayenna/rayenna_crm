import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.post('/generate-proposal-pdf', async (req: Request, res: Response) => {
  const { html } = req.body as { html?: string };

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "html" in request body.' });
  }

  // Use a broad type here to avoid tight coupling to Puppeteer's internal type exports
  let browser: any | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport as requested
    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Rayenna_Proposal.pdf"');
    res.send(pdfBuffer);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('generate-proposal-pdf failed:', err);
    res
      .status(500)
      .json({ error: err?.message ?? 'Failed to generate proposal PDF.' });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
});

export default router;

