import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'
import type { MarginJob, MarginMixPayload, MixRow } from './marginMix'

const GOLD = 'F5A623'
const NAVY = '1A1A2E'

export type MarginMixExportMeta = {
  sellerLabel: string
  exportedBy: string
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
  const rounded = Math.round(n * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(1)}%`
}

function formatPctPlain(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`
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

function periodText(payload: MarginMixPayload): string {
  return payload.periodLabel || `FY${payload.currentFy}`
}

export function marginMixExportBasename(payload: MarginMixPayload, sellerLabel: string): string {
  const day = (payload.generatedAt || new Date().toISOString()).slice(0, 10)
  const q = payload.quarter ? `-Q${payload.quarter}` : ''
  return `margin-mix-FY${payload.currentFy}${q}-${slug(sellerLabel)}-${day}`
}

function mixSheet(rows: MixRow[]) {
  return rows.map((r) => ({
    Slice: r.label,
    Jobs: r.jobs,
    Revenue: r.revenue,
    'Gross profit': r.profit ?? '',
    'GP %': r.profitPct ?? '',
    'Missing cost': r.missingCost,
  }))
}

export function marginMixExcelSheets(payload: MarginMixPayload, meta: MarginMixExportMeta) {
  const k = payload.kpis
  const summary = [
    { Field: 'Report', Value: 'Margin & Mix' },
    { Field: 'Period', Value: periodText(payload) },
    { Field: 'Financial year', Value: payload.currentFy },
    { Field: 'Quarter', Value: payload.quarter ? `Q${payload.quarter}` : 'All' },
    { Field: 'Seller', Value: meta.sellerLabel },
    { Field: 'Generated', Value: payload.generatedAt },
    { Field: 'Exported by', Value: meta.exportedBy },
    { Field: 'Jobs', Value: k.jobs },
    { Field: 'Revenue', Value: k.revenue },
    { Field: 'Gross profit', Value: k.profit ?? '' },
    { Field: 'GP %', Value: k.profitPct ?? '' },
    { Field: 'Missing cost jobs', Value: k.missingCostJobs },
    { Field: 'Thin margin jobs', Value: k.thinJobs },
    { Field: 'Loss jobs', Value: k.lossJobs },
    { Field: 'PE vs CRM flags', Value: k.peMismatchJobs },
    { Field: `FY${payload.lastFy} revenue`, Value: k.lastFyRevenue },
    { Field: 'Revenue YoY %', Value: k.revenueYoy ?? '' },
    { Field: 'GP pts vs last FY', Value: k.profitPctYoy ?? '' },
  ]

  const jobs = payload.jobs.map((j) => ({
    '#': j.slNo ?? '',
    Customer: j.customerName,
    Seller: j.salespersonName ?? '',
    Stage: j.stage,
    Segment: j.segmentLabel,
    System: j.systemTypeLabel,
    'kW band': j.kwBandLabel,
    'Order value': j.orderValue,
    Cost: j.cost ?? '',
    'PE cost': j.peCost ?? '',
    'Gross profit': j.profit ?? '',
    'GP %': j.profitPct ?? '',
    Band: j.marginBandLabel,
    Flags: j.flagLabels.join('; '),
  }))

  return {
    summary,
    sellerLoad: mixSheet(payload.sellerLoad),
    segment: mixSheet(payload.segmentMix),
    system: mixSheet(payload.systemMix),
    kw: mixSheet(payload.kwMix),
    bands: mixSheet(payload.bandMix),
    jobs,
  }
}

export function buildMarginMixExcelBuffer(payload: MarginMixPayload, meta: MarginMixExportMeta): Buffer {
  const sheets = marginMixExcelSheets(payload, meta)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.summary), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.sellerLoad), 'Seller mix')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.segment), 'Segment')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.system), 'System')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.kw), 'kW band')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.bands), 'Margin band')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.jobs), 'Job list')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function buildMarginMixPdfBuffer(
  payload: MarginMixPayload,
  meta: MarginMixExportMeta,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 36
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin,
      info: { Title: `Margin & Mix ${periodText(payload)}`, Author: 'Rayenna CRM' },
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
        `Rayenna CRM · Margin & Mix · ${periodText(payload)} · ${meta.sellerLabel} · Confidential`,
        margin,
        pageH - 22,
        { width: contentW, align: 'left' },
      )
    }

    doc.on('pageAdded', footer)

    doc.font('Helvetica-Bold').fontSize(18).fillColor(navy)
    textAt('Margin & Mix', margin, margin, { width: contentW })
    doc.font('Helvetica').fontSize(10).fillColor(muted)
    textAt(`Commercial review pack · ${periodText(payload)} · ${meta.sellerLabel}`, margin, margin + 24, {
      width: contentW,
    })
    textAt(
      `Generated ${payload.generatedAt.slice(0, 16).replace('T', ' ')} · Exported by ${meta.exportedBy}`,
      margin,
      margin + 38,
      { width: contentW },
    )

    const k = payload.kpis
    const kpis: [string, string][] = [
      ['Revenue', `${formatInrPdf(k.revenue)} · ${k.jobs} jobs`],
      ['Gross profit', formatInrPdf(k.profit)],
      ['GP %', formatPctPlain(k.profitPct)],
      ['Missing cost', String(k.missingCostJobs)],
      ['Thin / loss', `${k.thinJobs} / ${k.lossJobs}`],
      ['Vs last FY', formatPct(k.revenueYoy)],
    ]
    let x = margin
    const kpiY = margin + 58
    const kpiW = contentW / 6 - 6
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

    const mixHeaders = ['Slice', 'Jobs', 'Revenue', 'GP', 'GP %', 'No cost']
    const mixWeights = [200, 70, 140, 140, 80, 80]
    const mixRight = [false, true, true, true, true, true]
    const mixRows = (rows: MixRow[]) =>
      rows.map((r) => [
        r.label,
        String(r.jobs),
        formatInrPdf(r.revenue),
        formatInrPdf(r.profit),
        formatPctPlain(r.profitPct),
        String(r.missingCost),
      ])

    drawTable('Seller mix', mixHeaders, mixRows(payload.sellerLoad), mixWeights, mixRight)
    drawTable('Segment', mixHeaders, mixRows(payload.segmentMix), mixWeights, mixRight)
    drawTable('System / kW / band', mixHeaders, mixRows([...payload.systemMix, ...payload.kwMix, ...payload.bandMix]), mixWeights, mixRight)

    doc.addPage()
    y = margin
    drawTable(
      'Job list',
      ['Customer', 'Stage', 'GP %', 'Band', 'Seller', 'Value', 'Flags'],
      payload.jobs.map((j) => [
        `${j.slNo != null ? `#${j.slNo} ` : ''}${j.customerName}`,
        j.stage,
        formatPctPlain(j.profitPct),
        j.marginBandLabel,
        j.salespersonName || '—',
        formatInrPdf(j.orderValue),
        j.flagLabels.slice(0, 2).join(', ') || '—',
      ]),
      [200, 110, 70, 80, 110, 120, 140],
      [false, false, true, false, false, true, false],
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

export async function buildMarginMixPptxBuffer(
  payload: MarginMixPayload,
  meta: MarginMixExportMeta,
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Margin & Mix ${periodText(payload)}`
  pptx.author = 'Rayenna CRM'
  pptx.company = 'Rayenna Energy Private Limited'
  pptx.subject = `Commercial review pack · ${meta.sellerLabel}`

  const k = payload.kpis
  const title = pptx.addSlide()
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: NAVY } })
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } })
  title.addText('MARGIN & MIX', {
    x: 0.7,
    y: 2.1,
    w: 12,
    fontSize: 14,
    bold: true,
    color: GOLD,
    fontFace: 'Arial',
  })
  title.addText(periodText(payload), {
    x: 0.7,
    y: 2.55,
    w: 12,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  })
  title.addText(`${meta.sellerLabel}  ·  Commercial review pack`, {
    x: 0.7,
    y: 3.4,
    w: 12,
    fontSize: 16,
    color: 'D2CBC0',
    fontFace: 'Arial',
  })
  title.addText(`Generated ${payload.generatedAt.slice(0, 10)}  ·  ${meta.exportedBy}`, {
    x: 0.7,
    y: 6.7,
    w: 12,
    fontSize: 11,
    color: '9CA3AF',
    fontFace: 'Arial',
  })

  const kpiSlide = pptx.addSlide()
  kpiSlide.addText('Margin snapshot', {
    x: 0.4,
    y: 0.25,
    fontSize: 18,
    bold: true,
    color: NAVY,
    fontFace: 'Arial',
  })
  const kpiItems: [string, string][] = [
    ['Revenue', formatInr(k.revenue)],
    ['Gross profit', formatInr(k.profit)],
    ['GP %', formatPctPlain(k.profitPct)],
    ['Missing cost', String(k.missingCostJobs)],
    ['Thin / loss', `${k.thinJobs} / ${k.lossJobs}`],
    ['Revenue YoY', formatPct(k.revenueYoy)],
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

  const mixSlide = (titleText: string, rows: MixRow[]) => {
    const slide = pptx.addSlide()
    slide.addText(titleText, { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
    slide.addTable(
      pptTable(
        ['Slice', 'Jobs', 'Revenue', 'GP', 'GP %', 'No cost'],
        rows.map((r) => [
          r.label,
          String(r.jobs),
          formatInr(r.revenue),
          formatInr(r.profit),
          formatPctPlain(r.profitPct),
          String(r.missingCost),
        ]),
        { alignRightFrom: 1 },
      ),
      {
        x: 0.4,
        y: 0.85,
        w: 12.5,
        colW: [3.2, 1.4, 2.2, 2.2, 1.7, 1.8],
        border: { pt: 0.5, color: 'E5E7EB' },
      },
    )
  }

  mixSlide('Seller mix', payload.sellerLoad)
  mixSlide('Segment', payload.segmentMix)
  mixSlide('Margin band', payload.bandMix)

  const perSlide = 12
  const chunks: MarginJob[][] = []
  for (let i = 0; i < payload.jobs.length; i += perSlide) chunks.push(payload.jobs.slice(i, i + perSlide))
  if (chunks.length === 0) chunks.push([])
  chunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(chunks.length > 1 ? `Job list (${idx + 1}/${chunks.length})` : 'Job list', {
      x: 0.35,
      y: 0.2,
      fontSize: 16,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
    slide.addTable(
      pptTable(
        ['#', 'Customer', 'GP %', 'Band', 'Flag', 'Value'],
        chunk.map((j) => [
          j.slNo != null ? String(j.slNo) : '',
          j.customerName,
          formatPctPlain(j.profitPct),
          j.marginBandLabel,
          j.flagLabels[0] || '—',
          formatInr(j.orderValue),
        ]),
        { alignRightFrom: 5 },
      ),
      {
        x: 0.3,
        y: 0.7,
        w: 12.7,
        colW: [0.6, 4.0, 1.4, 1.6, 2.2, 2.9],
        border: { pt: 0.4, color: 'E5E7EB' },
        fontFace: 'Arial',
      },
    )
  })

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array)
}
