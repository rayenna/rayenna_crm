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
  // Remove border/shadow/rounded corners for clean print
  clone.style.cssText = 'border:none!important;box-shadow:none!important;border-radius:0!important;';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title></title>
  ${styleLinks}
  ${inlineStyles}
  <style>
    /* Proposal letterhead stays in the document. Browser date/title lines in the PDF are from the print dialog — turn off “Headers and footers” (Chrome) or equivalent to remove them; they cannot be removed by CSS alone. */
    @page { size: A4 portrait; margin: 18mm 18mm; }
    body  { margin:0; padding:0; background:#fff; font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; }
    * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; color-adjust:exact!important; color:inherit; }
    /* Avoid ugly splits for small cards, but allow big sections to paginate */
    table { width: 100%; }
    tr, .rounded-xl, .grid > div { break-inside:avoid; page-break-inside:avoid; }
    .pdf-section { break-inside:auto; page-break-inside:auto; }
    tr[data-bom-header="true"] { page-break-after:avoid; }
    /* Keep “N categories” + Bill of Quantities title on the same page as the table header */
    caption.bom-boq-caption { break-inside:avoid; page-break-inside:avoid; break-after:avoid; page-break-after:avoid; }
    thead { display: table-header-group; }
    h1, h2, h3 { page-break-after:avoid; }
    svg { overflow:visible!important; }
    textarea { display:none!important; }
    /* Ensure Our Process cards don't overflow page width when printed */
    .pdf-process-steps { flex-wrap:wrap; }
    .pdf-process-steps > div { min-width:220px; flex:1 1 45%; }
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
