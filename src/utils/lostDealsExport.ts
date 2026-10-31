import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'

const GOLD = 'F5A623'
const NAVY = '1A1A2E'

const REASON_LABELS: Record<string, string> = {
  LOST_TO_COMPETITION: 'Lost to Competition',
  NO_BUDGET: 'No Budget',
  FINANCING_FAILED: 'Financing / Loan Failed',
  INDEFINITELY_DELAYED: 'Indefinitely Delayed / Not Ready',
  NO_FEASIBILITY: 'Site Not Feasible (roof, shade, structure)',
  SOCIETY_OR_LANDLORD_BLOCK: 'Society / Landlord / Association Block',
  REGULATORY_DISCOM: 'Regulatory / DISCOM / Net Metering Friction',
  CUSTOMER_NO_RESPONSE: 'Customer No Response / Ghosted',
  WRONG_LEAD: 'Wrong Lead / Not Serious',
  DIY_OR_LOCAL_INSTALLER: 'Went with DIY / Local Installer',
  PROPERTY_SOLD_OR_MOVED: 'Property Sold / Customer Moved',
  CUSTOMER_INTERNAL_DISAGREEMENT: 'Customer Internal Disagreement',
  OTHER: 'Other',
}

const COMPETITION_LABELS: Record<string, string> = {
  LOST_DUE_TO_PRICE: 'Lost due to Price',
  LOST_DUE_TO_FEATURES: 'Lost due to Features / Specs',
  LOST_DUE_TO_TIMELINE: 'Lost due to Timeline / Availability',
  LOST_DUE_TO_BRAND_OR_WARRANTY: 'Lost due to Brand / Warranty',
  LOST_DUE_TO_RELATIONSHIP_OTHER: 'Lost due to Relationship / Other factors',
}

export type LostDealsExportProject = {
  slNo: number | null
  customerName: string | null
  salespersonName: string | null
  year: string | null
  projectCost: number | null
  lostReason: string | null
  lostToCompetitionReason: string | null
  lostOtherReason: string | null
  lostDate: string | null
  confirmationDate: string | null
  peReady?: boolean
}

export type LostDealsExportPayload = {
  summary: {
    lostCount: number
    lostValue: number
    wonCount: number
    wonValue: number
    winRateCount: number | null
    winRateValue: number | null
    uncategorizedCount: number
  }
  byReason: { reason: string; count: number; value: number }[]
  byCompetitionSubtype: { subtype: string; count: number; value: number }[]
  bySalesperson: { id: string | null; name: string; count: number; value: number }[]
  byFy: { fy: string; count: number; value: number }[]
  projects: LostDealsExportProject[]
}

export type LostDealsExportMeta = {
  sellerLabel: string
  exportedBy: string
  periodLabel: string
  generatedAt: string
}

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function formatInrPdf(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `Rs ${Math.round(n).toLocaleString('en-IN')}`
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`
}

function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const ymd = iso.slice(0, 10)
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${String(y).slice(-2)}`
}

function reasonLabel(value: string | null | undefined): string {
  if (!value) return 'Uncategorized'
  if (value === 'UNCATEGORIZED') return 'Uncategorized'
  return REASON_LABELS[value] || value
}

function competitionLabel(value: string | null | undefined): string {
  if (!value) return ''
  if (value === 'UNCATEGORIZED') return 'Uncategorized'
  return COMPETITION_LABELS[value] || value
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'export'
  )
}

export function lostDealsExportBasename(meta: LostDealsExportMeta): string {
  const day = (meta.generatedAt || new Date().toISOString()).slice(0, 10)
  const period = slug(meta.periodLabel || 'all-years')
  return `lost-deals-${period}-${slug(meta.sellerLabel)}-${day}`
}

export function lostDealsExcelSheets(payload: LostDealsExportPayload, meta: LostDealsExportMeta) {
  const s = payload.summary
  const summary = [
    { Field: 'Report', Value: 'Lost Deals' },
    { Field: 'Period', Value: meta.periodLabel },
    { Field: 'Seller', Value: meta.sellerLabel },
    { Field: 'Generated', Value: meta.generatedAt },
    { Field: 'Exported by', Value: meta.exportedBy },
    { Field: 'Lost deals', Value: s.lostCount },
    { Field: 'Lost value', Value: s.lostValue },
    { Field: 'Won deals', Value: s.wonCount },
    { Field: 'Won value', Value: s.wonValue },
    { Field: 'Win rate count %', Value: s.winRateCount ?? '' },
    { Field: 'Win rate value %', Value: s.winRateValue ?? '' },
    { Field: 'Uncategorized', Value: s.uncategorizedCount },
  ]

  const byReason = payload.byReason.map((r) => ({
    Reason: reasonLabel(r.reason),
    Deals: r.count,
    Value: r.value,
  }))

  const byCompetition = payload.byCompetitionSubtype.map((r) => ({
    Subtype: competitionLabel(r.subtype) || r.subtype,
    Deals: r.count,
    Value: r.value,
  }))

  const bySalesperson = payload.bySalesperson.map((r) => ({
    Seller: r.name,
    Deals: r.count,
    Value: r.value,
  }))

  const byFy = payload.byFy.map((r) => ({
    FY: r.fy,
    Deals: r.count,
    Value: r.value,
  }))

  const projects = payload.projects.map((p) => ({
    '#': p.slNo ?? '',
    Customer: p.customerName ?? '',
    Seller: p.salespersonName ?? '',
    FY: p.year ?? '',
    Value: p.projectCost ?? '',
    Reason: reasonLabel(p.lostReason),
    Competition: competitionLabel(p.lostToCompetitionReason),
    Other: p.lostOtherReason ?? '',
    'Lost date': p.lostDate ? p.lostDate.slice(0, 10) : '',
    'Confirm date': p.confirmationDate ? p.confirmationDate.slice(0, 10) : '',
    'PE Ready': p.peReady ? 'Y' : '',
  }))

  return { summary, byReason, byCompetition, bySalesperson, byFy, projects }
}

export function buildLostDealsExcelBuffer(
  payload: LostDealsExportPayload,
  meta: LostDealsExportMeta,
): Buffer {
  const sheets = lostDealsExcelSheets(payload, meta)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.summary), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.byReason), 'By reason')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.byCompetition), 'Competition')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.bySalesperson), 'By salesperson')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.byFy), 'By FY')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.projects), 'Lost projects')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function buildLostDealsPdfBuffer(
  payload: LostDealsExportPayload,
  meta: LostDealsExportMeta,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 36
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin,
      info: { Title: `Lost Deals ${meta.periodLabel}`, Author: 'Rayenna CRM' },
    })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width
    const pageH = doc.page.height
    const contentW = pageW - margin * 2
    const gold = '#C47F12'
    const navy = '#1A1A2E'
    const muted = '#6b7280'

    const textAt = (
      str: string,
      tx: number,
      ty: number,
      opts: { width?: number; align?: 'left' | 'right' | 'center'; height?: number } = {},
    ) => {
      doc.text(str, tx, ty, {
        lineBreak: false,
        height: opts.height ?? 12,
        ellipsis: true,
        width: opts.width,
        align: opts.align,
      })
    }

    const fitCols = (weights: number[]): number[] => {
      const sum = weights.reduce((s, w) => s + w, 0) || 1
      return weights.map((w) => (w / sum) * contentW)
    }

    const cellText = (
      str: string,
      tx: number,
      ty: number,
      tw: number,
      th: number,
      align: 'left' | 'right',
    ) => {
      doc.save()
      doc.rect(tx, ty, Math.max(0, tw), th).clip()
      doc.text(str, tx + 3, ty + 3.5, {
        width: Math.max(8, tw - 6),
        height: th - 5,
        ellipsis: true,
        lineBreak: false,
        align,
      })
      doc.restore()
    }

    const footer = () => {
      doc.font('Helvetica').fontSize(8).fillColor(muted)
      textAt(
        `Rayenna CRM · Lost Deals · ${meta.periodLabel} · ${meta.sellerLabel} · Confidential`,
        margin,
        pageH - 22,
        { width: contentW, align: 'left' },
      )
    }

    doc.on('pageAdded', footer)

    doc.font('Helvetica-Bold').fontSize(18).fillColor(navy)
    textAt('Lost Deals', margin, margin, { width: contentW })
    doc.font('Helvetica').fontSize(10).fillColor(muted)
    textAt(`${meta.periodLabel} · ${meta.sellerLabel}`, margin, margin + 24, { width: contentW })
    textAt(
      `Generated ${meta.generatedAt.slice(0, 16).replace('T', ' ')} · Exported by ${meta.exportedBy}`,
      margin,
      margin + 38,
      { width: contentW },
    )

    const s = payload.summary
    const kpis: [string, string][] = [
      ['Lost deals', String(s.lostCount)],
      ['Lost value', formatInrPdf(s.lostValue)],
      ['Win rate (count)', formatPct(s.winRateCount)],
      ['Win rate (₹)', formatPct(s.winRateValue)],
      ['Uncategorized', String(s.uncategorizedCount)],
    ]
    let x = margin
    const kpiY = margin + 58
    const kpiW = contentW / 5 - 6
    kpis.forEach(([label, value]) => {
      doc.roundedRect(x, kpiY, kpiW, 42, 4).strokeColor('#e5e7eb').lineWidth(0.6).stroke()
      doc.font('Helvetica-Bold').fontSize(7).fillColor(gold)
      textAt(label.toUpperCase(), x + 6, kpiY + 6, { width: kpiW - 12 })
      doc.font('Helvetica-Bold').fontSize(9).fillColor(navy)
      textAt(value, x + 6, kpiY + 20, { width: kpiW - 12 })
      x += kpiW + 7
    })

    let y = kpiY + 56
    const drawTable = (
      title: string,
      headers: string[],
      rows: string[][],
      weights: number[],
      rightAlign: boolean[],
    ) => {
      if (y > pageH - 80) {
        doc.addPage()
        y = margin
      }
      const colW = fitCols(weights)
      doc.font('Helvetica-Bold').fontSize(12).fillColor(navy)
      textAt(title, margin, y, { width: contentW })
      y += 18
      const rowH = 16
      const drawHeader = () => {
        doc.rect(margin, y, contentW, rowH).fill('#F5E6C8')
        let cx = margin
        headers.forEach((h, i) => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(gold)
          cellText(h, cx, y, colW[i] ?? 40, rowH, rightAlign[i] ? 'right' : 'left')
          cx += colW[i] ?? 40
        })
        y += rowH
      }
      drawHeader()
      rows.forEach((row, ri) => {
        if (y > pageH - 36) {
          doc.addPage()
          y = margin
          drawHeader()
        }
        if (ri % 2 === 1) doc.rect(margin, y, contentW, rowH).fill('#FAFAF8')
        let cx = margin
        row.forEach((cell, i) => {
          doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(navy)
          cellText(cell, cx, y, colW[i] ?? 40, rowH, rightAlign[i] ? 'right' : 'left')
          cx += colW[i] ?? 40
        })
        y += rowH
      })
      y += 14
    }

    drawTable(
      'Reason mix',
      ['Reason', 'Deals', 'Value'],
      payload.byReason.map((r) => [reasonLabel(r.reason), String(r.count), formatInrPdf(r.value)]),
      [420, 80, 160],
      [false, true, true],
    )

    drawTable(
      'Competition subtypes',
      ['Subtype', 'Deals', 'Value'],
      payload.byCompetitionSubtype.map((r) => [
        competitionLabel(r.subtype) || r.subtype,
        String(r.count),
        formatInrPdf(r.value),
      ]),
      [420, 80, 160],
      [false, true, true],
    )

    drawTable(
      'By salesperson',
      ['Seller', 'Deals', 'Value'],
      payload.bySalesperson.map((r) => [r.name, String(r.count), formatInrPdf(r.value)]),
      [420, 80, 160],
      [false, true, true],
    )

    drawTable(
      'Lost projects',
      ['#', 'Customer', 'Seller', 'FY', 'Reason', 'Lost', 'Value'],
      payload.projects.map((p) => [
        p.slNo != null ? String(p.slNo) : '',
        p.customerName || '—',
        p.salespersonName || '—',
        p.year || '—',
        reasonLabel(p.lostReason),
        formatIsoDate(p.lostDate),
        formatInrPdf(p.projectCost),
      ]),
      [50, 200, 130, 70, 160, 70, 110],
      [false, false, false, false, false, false, true],
    )

    footer()
    doc.end()
  })
}

function pptTable(
  headers: string[],
  rows: string[][],
  opts?: { alignRightFrom?: number },
): PptxGenJS.TableRow[] {
  const rightFrom = opts?.alignRightFrom ?? 99
  const head: PptxGenJS.TableRow = headers.map((h) => ({
    text: h,
    options: { bold: true, color: GOLD, fill: { color: 'F5E6C8' }, align: 'left', valign: 'middle', fontSize: 10 },
  }))
  const body: PptxGenJS.TableRow[] = rows.map((row) =>
    row.map((cell, i) => ({
      text: cell,
      options: {
        color: NAVY,
        align: i >= rightFrom ? 'right' : 'left',
        valign: 'middle',
        fontSize: 9,
        fill: { color: 'FFFFFF' },
      },
    })),
  )
  return [head, ...body]
}

export async function buildLostDealsPptxBuffer(
  payload: LostDealsExportPayload,
  meta: LostDealsExportMeta,
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Lost Deals ${meta.periodLabel}`
  pptx.author = 'Rayenna CRM'
  pptx.company = 'Rayenna Energy Private Limited'
  pptx.subject = `${meta.periodLabel} · ${meta.sellerLabel}`

  const s = payload.summary
  const title = pptx.addSlide()
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: NAVY } })
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } })
  title.addText('LOST DEALS', {
    x: 0.7,
    y: 2.1,
    w: 12,
    fontSize: 14,
    bold: true,
    color: GOLD,
    fontFace: 'Arial',
  })
  title.addText(meta.periodLabel, {
    x: 0.7,
    y: 2.55,
    w: 12,
    fontSize: 32,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  })
  title.addText(`${meta.sellerLabel}  ·  Lost count / ₹ / win rate`, {
    x: 0.7,
    y: 3.4,
    w: 12,
    fontSize: 16,
    color: 'D2CBC0',
    fontFace: 'Arial',
  })
  title.addText(`Generated ${meta.generatedAt.slice(0, 10)}  ·  ${meta.exportedBy}`, {
    x: 0.7,
    y: 6.7,
    w: 12,
    fontSize: 11,
    color: '9CA3AF',
    fontFace: 'Arial',
  })

  const kpiSlide = pptx.addSlide()
  kpiSlide.addText('Lost snapshot', {
    x: 0.4,
    y: 0.25,
    fontSize: 18,
    bold: true,
    color: NAVY,
    fontFace: 'Arial',
  })
  const kpiItems: [string, string][] = [
    ['Lost deals', String(s.lostCount)],
    ['Lost value', formatInr(s.lostValue)],
    ['Win rate (count)', formatPct(s.winRateCount)],
    ['Win rate (₹)', formatPct(s.winRateValue)],
    ['Won deals', `${s.wonCount} · ${formatInr(s.wonValue)}`],
    ['Uncategorized', String(s.uncategorizedCount)],
  ]
  kpiItems.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.4 + col * 4.2
    const y = 1.1 + row * 2.6
    kpiSlide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: 3.95,
      h: 2.2,
      fill: { color: 'F7F4EF' },
      rectRadius: 0.1,
    })
    kpiSlide.addText(label.toUpperCase(), {
      x: x + 0.2,
      y: y + 0.3,
      w: 3.55,
      fontSize: 11,
      bold: true,
      color: GOLD,
      fontFace: 'Arial',
    })
    kpiSlide.addText(value, {
      x: x + 0.2,
      y: y + 0.85,
      w: 3.55,
      fontSize: 20,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
  })

  const reason = pptx.addSlide()
  reason.addText('Reason mix', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  reason.addTable(
    pptTable(
      ['Reason', 'Deals', 'Value'],
      payload.byReason.map((r) => [reasonLabel(r.reason), String(r.count), formatInr(r.value)]),
      { alignRightFrom: 1 },
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [7.5, 2.0, 3.0],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const sellers = pptx.addSlide()
  sellers.addText('By salesperson', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  sellers.addTable(
    pptTable(
      ['Seller', 'Deals', 'Value'],
      payload.bySalesperson.map((r) => [r.name, String(r.count), formatInr(r.value)]),
      { alignRightFrom: 1 },
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [7.5, 2.0, 3.0],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const perSlide = 12
  const chunks: LostDealsExportProject[][] = []
  for (let i = 0; i < payload.projects.length; i += perSlide) {
    chunks.push(payload.projects.slice(i, i + perSlide))
  }
  if (chunks.length === 0) chunks.push([])
  chunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(chunks.length > 1 ? `Lost projects (${idx + 1}/${chunks.length})` : 'Lost projects', {
      x: 0.35,
      y: 0.2,
      fontSize: 16,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
    const rows = chunk.map((p) => [
      p.slNo != null ? String(p.slNo) : '',
      p.customerName || '—',
      p.salespersonName || '—',
      reasonLabel(p.lostReason),
      formatIsoDate(p.lostDate),
      formatInr(p.projectCost),
    ])
    slide.addTable(
      pptTable(['#', 'Customer', 'Seller', 'Reason', 'Lost', 'Value'], rows, { alignRightFrom: 5 }),
      {
        x: 0.3,
        y: 0.7,
        w: 12.7,
        colW: [0.7, 3.4, 2.2, 3.2, 1.2, 2.0],
        border: { pt: 0.4, color: 'E5E7EB' },
        fontFace: 'Arial',
      },
    )
  })

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array)
}
