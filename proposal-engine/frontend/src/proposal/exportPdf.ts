/** Print CSS injected into the PDF export window. Exported for regression tests. */
export const PROPOSAL_PRINT_CSS = `
    /* Proposal letterhead stays in the document. Browser date/title lines in the PDF are from the print dialog — turn off “Headers and footers” (Chrome) or equivalent to remove them; they cannot be removed by CSS alone. */
    @page { size: A4 portrait; margin: 18mm 18mm; }
    html, body { margin:0; padding:0; background:#fff; height:auto !important; overflow:visible !important; }
    body { font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; }
    * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; color-adjust:exact!important; color:inherit; }
    /* Chromium print flattens box-shadow into solid grey slabs — never print shadows. */
    *, *::before, *::after {
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
      text-shadow: none !important;
    }

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
    /*
     * Page 1: Cover + contact strip together, vertically centred on the sheet.
     * break-after on the wrapper only — do not also break after cover alone
     * (that used to push the contact strip onto page 2).
     */
    [data-pdf-section="cover-first-page"] {
      break-after: page !important;
      page-break-after: always !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: stretch !important;
      min-height: 250mm !important;
      height: 250mm !important;
      max-height: none !important;
      box-sizing: border-box !important;
    }
    [data-pdf-section="cover-first-page"] [data-pdf-section="cover"] {
      break-after: avoid !important;
      page-break-after: avoid !important;
      margin-bottom: 12px !important;
      margin-left: auto !important;
      margin-right: auto !important;
      max-width: 100% !important;
      position: relative !important;
      overflow: hidden !important;
      background-color: #0d1b3a !important;
    }
    /* Title-page wallpaper must fill the cover (override global img max-height). */
    [data-pdf-section="cover"] img[data-docx-image="cover-hero"] {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-height: none !important;
      object-fit: cover !important;
      z-index: 0 !important;
    }
    [data-pdf-section="cover"] > .relative.z-10 {
      position: relative !important;
      z-index: 10 !important;
    }
    /* CSS wash is removed from the print clone after baking; hide if leftover. */
    [data-pdf-cover-wash] {
      display: none !important;
    }
    /* Opaque CLIENT panel — never glass/translucent (WhatsApp drops rgba panels). */
    [data-pdf-cover-client] {
      background-color: #0d1b3a !important;
      background: #0d1b3a !important;
      border: 1px solid rgba(255, 255, 255, 0.5) !important;
      box-shadow: inset 3px 0 0 0 #fbbf24 !important;
      -webkit-box-shadow: inset 3px 0 0 0 #fbbf24 !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-pdf-cover-client] p {
      color: #ffffff !important;
    }
    [data-pdf-cover-client] p:first-child {
      color: #fcd34d !important;
    }
    [data-pdf-section="contact-strip"] {
      break-before: avoid !important;
      page-break-before: avoid !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      justify-content: center !important;
      text-align: center !important;
      gap: 8px 24px !important;
    }
    /* Financial Benefits chart must stay on one page (no mid-chart split). */
    [data-pdf-keep="financial-chart"] {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }
    [data-pdf-keep="financial-chart"] svg {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    /* About Rayenna — Key Highlights table must not split across pages. */
    [data-pdf-keep="key-highlights"] {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }
    [data-pdf-keep="key-highlights"] > div {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    /*
     * Section hygiene: never leave a lone accent bar / divider on the prior page.
     * Chromium will otherwise split the flex heading row (bar | icon | title).
     */
    .pdf-divider,
    [data-pdf-keep="divider"] {
      break-after: avoid !important;
      page-break-after: avoid !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    /*
     * Section titles: bar | icon | h2.
     * Do NOT use display:table here — table-cell + width:100% made the gap between
     * emoji and title vary by section (Financial Benefits looked tight; RACI wide).
     * Keep flex + fixed gap-3 (0.75rem) so every heading matches Financial Benefits.
     */
    .pdf-section-heading,
    [data-pdf-keep="section-heading"],
    .pdf-section > div.flex.items-center:has(> h2),
    .pdf-section > div.flex.items-start:has(> h2),
    div.mb-8 > div.flex.items-center:has(> h2),
    div.mb-8 > div.flex.items-start:has(> h2) {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 0.75rem !important;
      column-gap: 0.75rem !important;
      row-gap: 0 !important;
      width: 100% !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    .pdf-section-heading > *,
    [data-pdf-keep="section-heading"] > *,
    .pdf-section > div.flex.items-center:has(> h2) > *,
    .pdf-section > div.flex.items-start:has(> h2) > *,
    div.mb-8 > div.flex.items-center:has(> h2) > *,
    div.mb-8 > div.flex.items-start:has(> h2) > * {
      display: block !important;
      padding-right: 0 !important;
      margin-right: 0 !important;
    }
    /* Fixed icon slot so emoji glyph metrics cannot widen the gap. */
    .pdf-section-heading > span.text-lg,
    [data-pdf-keep="section-heading"] > span.text-lg,
    .pdf-section > div.flex.items-center:has(> h2) > span.text-lg,
    .pdf-section > div.flex.items-start:has(> h2) > span.text-lg,
    div.mb-8 > div.flex.items-center:has(> h2) > span.text-lg,
    div.mb-8 > div.flex.items-start:has(> h2) > span.text-lg {
      width: 1.25rem !important;
      min-width: 1.25rem !important;
      max-width: 1.25rem !important;
      flex: 0 0 1.25rem !important;
      text-align: center !important;
      line-height: 1 !important;
      overflow: visible !important;
    }
    .pdf-section-heading > .w-1,
    [data-pdf-keep="section-heading"] > .w-1,
    .pdf-section > div.flex.items-center:has(> h2) > .w-1,
    .pdf-section > div.flex.items-start:has(> h2) > .w-1,
    div.mb-8 > div.flex.items-center:has(> h2) > .w-1,
    div.mb-8 > div.flex.items-start:has(> h2) > .w-1 {
      flex: 0 0 auto !important;
    }
    .pdf-section-heading > h2,
    [data-pdf-keep="section-heading"] > h2,
    .pdf-section > div.flex.items-center:has(> h2) > h2,
    .pdf-section > div.flex.items-start:has(> h2) > h2,
    div.mb-8 > div.flex.items-center:has(> h2) > h2,
    div.mb-8 > div.flex.items-start:has(> h2) > h2 {
      flex: 1 1 auto !important;
      min-width: 0 !important;
    }
    /*
     * Forced new pages (BOM only — Closing Note flows with prior content):
     * break ONLY on the section unit stamped with data-pdf-break-before="page".
     * Breaking on the inner [data-pdf-section] leaves the leading .pdf-divider
     * alone on a blank sheet. Never pair break-before:page with break-after:page
     * on adjacent sections (Chromium blank-page pattern).
     */
    .pdf-section-unit[data-pdf-break-before="page"] {
      break-before: page !important;
      page-break-before: always !important;
      break-inside: auto !important;
      page-break-inside: auto !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }
    /* Closing Note: no forced page break — continues after the prior section. */
    [data-pdf-section="section-closing-note"] {
      break-before: auto !important;
      page-break-before: auto !important;
      break-inside: auto !important;
      page-break-inside: auto !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }
    /* Side-by-side: copy left, image right (print / PDF / share HTML). */
    [data-pdf-section="section-closing-note"] .closing-note-layout {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 1.5rem !important;
      padding-left: 1.75rem !important;
    }
    [data-pdf-section="section-closing-note"] .closing-note-layout > [data-docx-section] {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      max-width: none !important;
    }
    [data-pdf-section="section-closing-note"] .closing-note-hero {
      flex: 0 0 200px !important;
      width: 200px !important;
      max-width: 200px !important;
      margin: 0 0 0 auto !important;
      padding: 0 !important;
      float: none !important;
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      filter: none !important;
      border: none !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    [data-pdf-section="section-closing-note"] img[data-docx-image="closing-solar"] {
      display: block !important;
      width: 200px !important;
      height: 200px !important;
      max-width: 200px !important;
      max-height: 200px !important;
      margin: 0 !important;
      padding: 0 !important;
      object-fit: cover !important;
      border-radius: 8px !important;
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      filter: none !important;
      border: none !important;
      outline: none !important;
      -webkit-box-shadow: none !important;
    }
    /* Subsidy Disclaimer: no trailing blank page. */
    [data-pdf-section="section-subsidy-disclaimer-and-payment-terms"],
    [data-pdf-keep="compact-section"] {
      break-inside: auto !important;
      page-break-inside: auto !important;
      break-before: auto !important;
      page-break-before: auto !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }
    /* Letter-style Closing Note: keep paragraph rhythm in print/PDF/share HTML. */
    [data-pdf-section="section-closing-note"] p {
      margin-top: 0 !important;
      margin-bottom: 0.85em !important;
      line-height: 1.65 !important;
    }
    [data-pdf-section="section-closing-note"] a {
      color: #0369a1 !important;
      text-decoration: underline !important;
    }
    /* Shrink letter signature spacer in print — large empty gap invited a trailing blank page. */
    [data-pdf-section="section-closing-note"] .closing-note-sign-spacer {
      height: 0.5rem !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /*
     * Standard inter-section rhythm (every section, same):
     * after section body ends → one line → hairline → one line → next heading.
     * Use padding (not margin) so Chromium/Tailwind margin-collapse cannot eat the gap.
     */
    .pdf-divider,
    [data-pdf-keep="divider"] {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding-top: 1em !important;
      padding-bottom: 1em !important;
      box-sizing: content-box !important;
    }
    .pdf-section,
    .pdf-section-unit {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
    /*
     * Never leave a trailing blank sheet after the last body section.
     * Chromium emits a blank page when the LAST block uses break-after:avoid
     * (engine reserves a following page). Zero margins; keep break-after:auto.
     */
    .pdf-section-unit:last-of-type,
    #proposal-print-root .pdf-section-unit:last-child,
    #proposal-print-root {
      break-after: auto !important;
      page-break-after: auto !important;
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
    .pdf-section-unit:last-of-type .pdf-section,
    .pdf-section-unit:last-of-type [data-pdf-section],
    #proposal-print-root > .px-3:last-child,
    #proposal-print-root [data-pdf-section]:last-of-type {
      break-after: auto !important;
      page-break-after: auto !important;
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
    /* Authority fees table + footnote stay together (no orphan note above Payment Terms). */
    .pdf-authority-fees,
    [data-pdf-keep="authority-fees"] {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 0 !important;
    }
    .pdf-authority-fees > h3,
    .pdf-authority-fees > div {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    .pdf-authority-fees > p {
      break-before: avoid !important;
      page-break-before: avoid !important;
      margin-top: 0.35rem !important;
      margin-bottom: 0 !important;
    }
    /* Payment Terms uses the same one-line Divider rhythm as every other section. */
    [data-pdf-section="payment-milestones"] {
      break-before: auto !important;
      page-break-before: auto !important;
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    /*
     * Warranty: keep the short table as one block — splitting a bordered shell
     * leaves a huge empty framed region on the prior page (amateur PDF defect).
     * Must override the global [data-pdf-section]/table { break-inside:auto }.
     */
    [data-pdf-section="warranty-table"],
    [data-pdf-keep="warranty-block"] {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }
    table.pdf-warranty-table,
    table.pdf-warranty-table tbody,
    table.pdf-warranty-table tr {
      border-collapse: collapse !important;
      border-radius: 0 !important;
      width: 100% !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      height: auto !important;
    }
    table.pdf-warranty-table td {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      height: auto !important;
    }
    /* Ordered-section wrapper: keep divider glued to the section that follows. */
    .pdf-section-unit {
      break-inside: auto !important;
      page-break-inside: auto !important;
    }
    .pdf-section-unit > .pdf-divider,
    .pdf-section-unit > [data-pdf-keep="divider"] {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    /* Never split the heading row from the body that follows. */
    .pdf-section > .pdf-section-heading,
    .pdf-section > [data-pdf-keep="section-heading"] {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    /* Mid-Edit greyed optionals must never appear in the printed PDF. */
    .section-edit-excluded {
      display: none !important;
    }
    /*
     * Bill of Quantities starts on a fresh page via the unit
     * data-pdf-break-before="page" stamp — NOT via this inner selector.
     * Inner break-before:page orphaned the BOQ Divider on a blank sheet.
     * Commercials follow BOQ on the same page flow (no forced break).
     */
    [data-pdf-section="technical-details"] {
      break-before: auto !important;
      page-break-before: auto !important;
    }
    [data-pdf-section="bom"] {
      break-before: auto !important;
      page-break-before: auto !important;
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    [data-pdf-section="commercials"] {
      break-before: auto !important;
      page-break-before: auto !important;
    }
    /* Keep “N categories” + Bill of Quantities title with the table header row */
    caption.bom-boq-caption { break-inside:avoid; page-break-inside:avoid; break-after:avoid; page-break-after:avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    h1, h2, h3 { page-break-after:avoid; }
    svg { overflow:visible!important; }
    textarea { display:none!important; }
    img { max-width:100%; max-height:160mm; object-fit:contain; }
    /* Our Process: two columns on A4 so cards never clip the page edge */
    .pdf-process-steps {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
      min-width: 0 !important;
      width: 100% !important;
    }
    .pdf-process-steps > div {
      min-width: 0 !important;
      max-width: 100% !important;
      flex: none !important;
    }
`;

export async function exportToPdf(printRootId: string): Promise<void> {
  const el = document.getElementById(printRootId);
  if (!el) return;

  // Collect all stylesheet hrefs and inline style tags from the current page
  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => `<link rel="stylesheet" href="${(l as HTMLLinkElement).href}">`)
    .join('\n');
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((s) => `<style>${s.innerHTML}</style>`)
    .join('\n');

  // Clone the proposal element so we can strip print-hide / mid-edit ghosts
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.print-hide').forEach((n) => n.remove());
  clone.querySelectorAll('.section-edit-excluded').forEach((n) => n.remove());
  // Remove border/shadow/rounded corners and overflow clipping for clean print pagination
  clone.style.cssText =
    'border:none!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important;height:auto!important;max-height:none!important;';
  clone.querySelectorAll<HTMLElement>('.overflow-hidden, .overflow-x-auto, .overflow-auto, .overflow-y-auto')
    .forEach((n) => {
      n.style.overflow = 'visible';
      n.style.maxHeight = 'none';
    });
  // Closing Note image: kill any residual shadow/bg that prints as a grey slab
  clone
    .querySelectorAll<HTMLElement>(
      '.closing-note-hero, img[data-docx-image="closing-solar"], img[data-docx-image="diagram"]',
    )
    .forEach((n) => {
      n.style.setProperty('box-shadow', 'none', 'important');
      n.style.setProperty('-webkit-box-shadow', 'none', 'important');
      n.style.setProperty('filter', 'none', 'important');
      n.style.setProperty('background', 'transparent', 'important');
      n.style.setProperty('background-color', 'transparent', 'important');
      n.style.setProperty('border', 'none', 'important');
      n.classList.remove('shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl');
    });

  // Bake navy wash into cover pixels; remove CSS wash (WhatsApp/Android-safe).
  const { applyCompositedCoverToClone, stripEmptyPrintWrappers } = await import('./coverHero');
  await applyCompositedCoverToClone(clone);
  stripEmptyPrintWrappers(clone);
  // Drop empty ordered-section shells left when renderOrderedSection returns null.
  clone.querySelectorAll(':scope div').forEach((n) => {
    const el = n as HTMLElement;
    if (el.children.length === 0 && !(el.textContent ?? '').trim()) {
      if (!el.hasAttribute('data-pdf-section') && !el.hasAttribute('data-pdf-keep') && !el.hasAttribute('data-docx-section')) {
        el.remove();
      }
    }
  });
  // Force opaque CLIENT panel inline (some mobile PDF engines ignore class CSS).
  clone.querySelectorAll<HTMLElement>('[data-pdf-cover-client]').forEach((n) => {
    n.style.setProperty('background', '#0d1b3a', 'important');
    n.style.setProperty('background-color', '#0d1b3a', 'important');
    n.style.setProperty('backdrop-filter', 'none', 'important');
  });
  // Kill residual bottom margin on the true last printed section.
  // Do NOT set page-break-after:avoid on the last unit — Chromium then emits a blank sheet.
  const units = clone.querySelectorAll('.pdf-section-unit');
  const lastUnit = units[units.length - 1] as HTMLElement | undefined;
  if (lastUnit) {
    lastUnit.style.setProperty('margin-bottom', '0', 'important');
    lastUnit.style.setProperty('padding-bottom', '0', 'important');
    lastUnit.style.setProperty('page-break-after', 'auto', 'important');
    lastUnit.style.setProperty('break-after', 'auto', 'important');
  }
  // Drop a trailing divider if it somehow became the last child (empty sheet bait).
  const lastChild = clone.lastElementChild as HTMLElement | null;
  if (lastChild?.classList.contains('pdf-divider') || lastChild?.getAttribute('data-pdf-keep') === 'divider') {
    lastChild.remove();
  }

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
