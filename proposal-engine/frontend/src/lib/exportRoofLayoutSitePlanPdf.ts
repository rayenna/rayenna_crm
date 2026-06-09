/** Browser-print PDF for AI Roof Layout site plan (logo, customer block, scale, north). */

export type RoofLayoutSitePlanFacet = {
  label: string;
  azimuthDeg: number;
  panelCount: number;
};

export type RoofLayoutSitePlanExportInput = {
  layoutImageDataUrl: string;
  imageWidthPx: number;
  metersPerPixel: number;
  customerName: string;
  location?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  customerNumber?: string;
  projectNumber?: number;
  latitude?: number | null;
  longitude?: number | null;
  panelCount: number | null;
  systemKw: number | null;
  targetSystemKw: number | null;
  roofAreaM2: number | null;
  usableAreaM2: number | null;
  moduleWatts: number;
  /** Oriented module width × height (m) when known from CRM SKU resolution. */
  moduleWidthM?: number | null;
  moduleHeightM?: number | null;
  moduleSizeSource?: string | null;
  /** Panel-weighted effective kW (simplified India orientation estimate). */
  effectiveSystemKw?: number | null;
  /** Percent loss from nameplate kW due to facet azimuth (0–100). */
  orientationLossPercent?: number | null;
  facetCount?: number;
  facets?: RoofLayoutSitePlanFacet[];
  generatedAt?: Date;
  /** Absolute URL for logo (defaults to /rayenna_logo.jpg on current origin). */
  logoUrl?: string;
};

const SCALE_BAR_CANDIDATES_M = [5, 10, 15, 20, 25, 50, 100, 200] as const;

/** Pick a round metre length so the bar is ~12–35% of the image width at print scale. */
export function pickScaleBarMeters(imageWidthPx: number, metersPerPixel: number): number {
  if (!Number.isFinite(imageWidthPx) || imageWidthPx <= 0 || !Number.isFinite(metersPerPixel) || metersPerPixel <= 0) {
    return 10;
  }
  const totalWidthM = imageWidthPx * metersPerPixel;
  let best: number = SCALE_BAR_CANDIDATES_M[0];
  let bestScore = Infinity;
  for (const m of SCALE_BAR_CANDIDATES_M) {
    if (m > totalWidthM * 0.45) continue;
    const frac = m / totalWidthM;
    const score = Math.abs(frac - 0.22);
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

export function scaleBarWidthPercent(
  barMeters: number,
  imageWidthPx: number,
  metersPerPixel: number,
): number {
  const totalWidthM = imageWidthPx * metersPerPixel;
  if (totalWidthM <= 0) return 20;
  return Math.min(45, Math.max(8, (barMeters / totalWidthM) * 100));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMetric(value: number | null, digits: number, suffix = ''): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${suffix}`;
}

/** HTML for placed kW metric cell — mirrors status strip eff. kW badge when loss ≥ 0.5%. */
export function formatSitePlanPlacedKwHtml(input: {
  systemKw: number | null;
  effectiveSystemKw?: number | null;
  orientationLossPercent?: number | null;
}): string {
  const placed = formatMetric(input.systemKw, 2, ' kW');
  const loss =
    input.orientationLossPercent != null && Number.isFinite(input.orientationLossPercent)
      ? input.orientationLossPercent
      : null;
  const effective =
    input.effectiveSystemKw != null && Number.isFinite(input.effectiveSystemKw)
      ? input.effectiveSystemKw
      : null;
  const showYield = loss != null && loss >= 0.5 && effective != null;
  if (!showYield) return placed;
  return `${placed}<span class="metric-sub">eff. ${effective.toFixed(2)} kW · −${loss.toFixed(0)}% orient.</span>`;
}

/** Plain-text module label for metrics cell. */
export function formatSitePlanModuleLabel(input: {
  moduleWatts: number;
  moduleWidthM?: number | null;
  moduleHeightM?: number | null;
  moduleSizeSource?: string | null;
}): string {
  const parts = [`${input.moduleWatts} W`];
  if (
    input.moduleWidthM != null &&
    input.moduleHeightM != null &&
    Number.isFinite(input.moduleWidthM) &&
    Number.isFinite(input.moduleHeightM)
  ) {
    parts.push(`${input.moduleWidthM.toFixed(2)} × ${input.moduleHeightM.toFixed(2)} m`);
  }
  if (input.moduleSizeSource?.trim()) {
    parts.push(input.moduleSizeSource.trim());
  }
  return parts.join(' · ');
}

function buildProjectLabel(input: RoofLayoutSitePlanExportInput): string {
  const parts: string[] = [];
  if (input.projectNumber != null) parts.push(`Project #${input.projectNumber}`);
  if (input.customerNumber?.trim()) parts.push(input.customerNumber.trim());
  return parts.join(' · ');
}

function buildSitePlanHtml(input: RoofLayoutSitePlanExportInput): string {
  const when = input.generatedAt ?? new Date();
  const dateLabel = when.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const logoUrl = input.logoUrl ?? `${window.location.origin}/rayenna_logo.jpg`;
  const barMeters = pickScaleBarMeters(input.imageWidthPx, input.metersPerPixel);
  const barWidthPct = scaleBarWidthPercent(barMeters, input.imageWidthPx, input.metersPerPixel);
  const projectLabel = buildProjectLabel(input);
  const coords =
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
      ? `${input.latitude.toFixed(5)}°, ${input.longitude.toFixed(5)}°`
      : null;

  const facetRows =
    input.facets && input.facets.length > 0
      ? input.facets
          .map(
            (f) =>
              `<tr><td>${escapeHtml(f.label)}</td><td>${f.azimuthDeg}°</td><td>${f.panelCount}</td></tr>`,
          )
          .join('')
      : '';

  const placedKwHtml = formatSitePlanPlacedKwHtml({
    systemKw: input.systemKw,
    effectiveSystemKw: input.effectiveSystemKw,
    orientationLossPercent: input.orientationLossPercent,
  });
  const moduleLabel = formatSitePlanModuleLabel({
    moduleWatts: input.moduleWatts,
    moduleWidthM: input.moduleWidthM,
    moduleHeightM: input.moduleHeightM,
    moduleSizeSource: input.moduleSizeSource,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Site plan — ${escapeHtml(input.customerName)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; color: #1e293b; background: #fff; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0d1b3a; padding-bottom: 10px; margin-bottom: 10px; }
    .brand { display: flex; gap: 12px; align-items: center; max-width: 55%; }
    .brand img { height: 52px; width: auto; max-width: 120px; object-fit: contain; }
    .brand h1 { margin: 0; font-size: 13px; font-weight: 800; color: #0d1b3a; line-height: 1.25; }
    .brand p { margin: 2px 0 0; font-size: 8px; color: #64748b; line-height: 1.35; }
    .title-block { text-align: right; flex-shrink: 0; }
    .title-block h2 { margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #0f766e; }
    .title-block p { margin: 4px 0 0; font-size: 9px; color: #64748b; }
    .customer { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .customer h3 { margin: 0 0 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
    .customer .name { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .customer p { margin: 0; line-height: 1.45; color: #334155; }
    .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 10px; }
    .metric { border: 1px solid #d1fae5; background: #ecfdf5; border-radius: 6px; padding: 6px 8px; }
    .metric dt { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #047857; margin: 0; }
    .metric dd { margin: 3px 0 0; font-size: 12px; font-weight: 700; color: #064e3b; }
    .metric-sub { display: block; margin-top: 2px; font-size: 8px; font-weight: 600; color: #047857; line-height: 1.3; }
    .figure { position: relative; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #0f172a; min-height: 0; }
    .figure img { display: block; width: 100%; height: auto; max-height: 145mm; object-fit: contain; margin: 0 auto; background: #1e293b; }
    .map-overlay { position: absolute; inset: 0; pointer-events: none; }
    .north { position: absolute; left: 10px; bottom: 10px; display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.95); border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 8px; color: #334155; }
    .north-arrow { font-size: 14px; font-weight: 800; line-height: 1; color: #0f172a; }
    .scale-bar { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .scale-bar-line { height: 6px; background: rgba(255,255,255,0.95); border: 2px solid #0f172a; border-top: none; border-radius: 0 0 2px 2px; min-width: 40px; }
    .scale-bar-label { font-size: 8px; font-weight: 700; color: #fff; text-shadow: 0 0 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.9); background: rgba(15,23,42,0.55); padding: 1px 6px; border-radius: 4px; }
    .legend { position: absolute; right: 10px; bottom: 10px; background: rgba(255,255,255,0.95); border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 8px; color: #334155; }
    .legend-row { display: flex; align-items: center; gap: 5px; margin-top: 3px; }
    .legend-row:first-child { margin-top: 0; }
    .swatch-panel { width: 14px; height: 8px; background: #0e1e5f; border: 1px solid #94a3b8; border-radius: 1px; }
    .facet-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
    .facet-table th, .facet-table td { border: 1px solid #e2e8f0; padding: 4px 8px; text-align: left; }
    .facet-table th { background: #f1f5f9; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .disclaimer { margin-top: 8px; font-size: 8px; color: #64748b; line-height: 1.45; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <img src="${escapeHtml(logoUrl)}" alt="Rayenna Energy"/>
      <div>
        <h1>Rayenna Energy Private Limited</h1>
        <p>Door No. 3329/52, Ray Bhavan, NH Bypass, Thykoodam, Kochi - 682019<br/>
        Tel: +91 7907 369 304 · sales@rayenna.energy · www.rayennaenergy.com</p>
      </div>
    </div>
    <div class="title-block">
      <h2>Proposed Rooftop Solar Site Plan</h2>
      <p>${escapeHtml(dateLabel)}${projectLabel ? ` · ${escapeHtml(projectLabel)}` : ''}</p>
      <p style="margin-top:6px;font-size:8px;color:#94a3b8;">Satellite-assisted draft · Not for construction</p>
    </div>
  </header>

  <section class="customer">
    <div>
      <h3>Customer / site</h3>
      <p class="name">${escapeHtml(input.customerName)}</p>
      ${input.location?.trim() ? `<p>${escapeHtml(input.location.trim())}</p>` : ''}
      ${coords ? `<p>GPS: ${escapeHtml(coords)}</p>` : ''}
    </div>
    <div>
      <h3>Contact</h3>
      ${input.contactPerson?.trim() ? `<p>${escapeHtml(input.contactPerson.trim())}</p>` : '<p>—</p>'}
      ${input.phone?.trim() ? `<p>${escapeHtml(input.phone.trim())}</p>` : ''}
      ${input.email?.trim() ? `<p>${escapeHtml(input.email.trim())}</p>` : ''}
    </div>
  </section>

  <dl class="metrics">
    <div class="metric"><dt>Panels</dt><dd>${input.panelCount ?? '—'}</dd></div>
    <div class="metric"><dt>Placed kW</dt><dd>${placedKwHtml}</dd></div>
    <div class="metric"><dt>CRM target</dt><dd>${formatMetric(input.targetSystemKw, 1, ' kW')}</dd></div>
    <div class="metric"><dt>Roof area</dt><dd>${formatMetric(input.roofAreaM2, 1, ' m²')}</dd></div>
    <div class="metric"><dt>Usable area</dt><dd>${formatMetric(input.usableAreaM2, 1, ' m²')}</dd></div>
    <div class="metric"><dt>Module</dt><dd>${escapeHtml(moduleLabel)}</dd></div>
  </dl>

  ${
    facetRows
      ? `<table class="facet-table"><thead><tr><th>Roof section</th><th>Azimuth</th><th>Panels</th></tr></thead><tbody>${facetRows}</tbody></table>`
      : ''
  }

  <figure class="figure">
    <img src="${input.layoutImageDataUrl}" alt="Rooftop solar layout"/>
    <div class="map-overlay">
      <div class="north" aria-hidden="true">
        <span class="north-arrow">↑<br/><span style="font-size:8px;">N</span></span>
        <span>North up<br/>Google satellite</span>
      </div>
      <div class="scale-bar" aria-hidden="true">
        <div class="scale-bar-line" style="width: ${barWidthPct.toFixed(2)}%;"></div>
        <span class="scale-bar-label">${barMeters} m</span>
      </div>
      <div class="legend" aria-hidden="true">
        <div class="legend-row"><span class="swatch-panel"></span> Solar modules</div>
      </div>
    </div>
  </figure>

  <p class="disclaimer">
    This site plan is a conceptual sales draft from satellite imagery and manually adjusted roof outlines.
    Module count, areas, and scale are approximate (zoom 19 static map, ~${input.metersPerPixel} m/px).
    Confirm final layout, setbacks, and quantities on site and in the Bill of Quantities before installation.
  </p>
</body>
</html>`;
}

/** Open a print-ready tab for Save as PDF (same pattern as proposal export). */
export function exportRoofLayoutSitePlanPdf(input: RoofLayoutSitePlanExportInput): boolean {
  const html = buildSitePlanHtml(input);
  const printWin = window.open('', '_blank', 'width=1100,height=800');
  if (!printWin) return false;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();

  printWin.onload = () => {
    printWin.document.title = '';
    const img = printWin.document.querySelector('.figure img');
    const triggerPrint = () => {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
        printWin.onafterprint = () => printWin.close();
      }, 400);
    };
    if (img instanceof HTMLImageElement && !img.complete) {
      img.onload = triggerPrint;
      img.onerror = triggerPrint;
    } else {
      triggerPrint();
    }
  };

  return true;
}
