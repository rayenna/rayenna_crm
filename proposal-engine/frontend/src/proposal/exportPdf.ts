/** Print CSS injected into the PDF export window. Exported for regression tests. */
export const PROPOSAL_PRINT_CSS = `
    /* Proposal letterhead stays in the document. Browser date/title lines in the PDF are from the print dialog — turn off “Headers and footers” (Chrome) or equivalent to remove them; they cannot be removed by CSS alone. */
    @page { size: A4 portrait; margin: 18mm 18mm; }
    html, body { margin:0; padding:0; background:#fff; height:auto !important; overflow:visible !important; }
    body { font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; }
    * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; color-adjust:exact!important; color:inherit; }

    /*
     * Chromium inserts a blank sheet when an element with page-break-inside:avoid
     * (or overflow:hidden/auto) is taller than one page. The BOQ table, roof image
     * frame, and the proposal root used to hit that path between Scope of Work and
     * Bill of Quantities.
     */
    #proposal-print-root,
    .pdf-section,
    [data-pdf-section],
    table,
    .rounded-xl,
    .rounded-2xl,
    .overflow-x-auto,
    .overflow-y-auto,
    .overflow-auto,
    .overflow-hidden {
      break-inside: auto !important;
      page-break-inside: auto !important;
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
    }

    /* Keep individual rows and compact cards together — these fit on one page. */
    tr, .grid > div, .pdf-process-steps > div {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    tr[data-bom-header="true"] { page-break-after: avoid; }
    /* Keep “N categories” + Bill of Quantities title with the table header row */
    caption.bom-boq-caption { break-inside:avoid; page-break-inside:avoid; break-after:avoid; page-break-after:avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    h1, h2, h3 { page-break-after:avoid; }
    svg { overflow:visible!important; }
    textarea { display:none!important; }
    img { max-width:100%; max-height:160mm; object-fit:contain; }
    /* Ensure Our Process cards don't overflow page width when printed */
    .pdf-process-steps { flex-wrap:wrap; }
    .pdf-process-steps > div { min-width:220px; flex:1 1 45%; }
`;

export function exportToPdf(printRootId: string): void {
  const el = document.getElementById(printRootId);
  if (!el) return;

  // Collect all stylesheet hrefs and inline style tags from the current page
  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => `<link rel="stylesheet" href="${(l as HTMLLinkElement).href}">`)
    .join('\n');
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((s) => `<style>${s.innerHTML}</style>`)
    .join('\n');

  // Clone the proposal element so we can strip print-hide elements
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.print-hide').forEach((n) => n.remove());
  // Remove border/shadow/rounded corners and overflow clipping for clean print pagination
  clone.style.cssText =
    'border:none!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important;height:auto!important;max-height:none!important;';
  clone.querySelectorAll<HTMLElement>('.overflow-hidden, .overflow-x-auto, .overflow-auto, .overflow-y-auto')
    .forEach((n) => {
      n.style.overflow = 'visible';
      n.style.maxHeight = 'none';
    });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title></title>
  ${styleLinks}
  ${inlineStyles}
  <style>
${PROPOSAL_PRINT_CSS}
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) return;
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();

  // Wait for styles + images to load, then print
  printWin.onload = () => {
    printWin.document.title = '';
    setTimeout(() => {
      printWin.focus();
      printWin.print();
      // Close the window after the print dialog is dismissed
      printWin.onafterprint = () => printWin.close();
    }, 600);
  };
}
