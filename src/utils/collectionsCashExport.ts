import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'
import type { CollectionsCashPayload, CollectionsRow } from './collectionsCash'

const GOLD = 'F5A623'
const NAVY = '1A1A2E'

export type CollectionsCashExportMeta = {
  sellerLabel: string
  exportedBy: string
}

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function formatCloseDate(ymd: string | null | undefined): string {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${String(y).slice(-2)}`
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

export function collectionsCashExportBasename(payload: CollectionsCashPayload, sellerLabel: string): string {
  const day = (payload.generatedAt || new Date().toISOString()).slice(0, 10)
  return `collections-cash-FY${payload.currentFy}-${slug(sellerLabel)}-${day}`
}

export function collectionsCashExcelSheets(payload: CollectionsCashPayload, meta: CollectionsCashExportMeta) {
  const k = payload.kpis
  const summary = [
    { Field: 'Report', Value: 'Collections & Cash' },
    { Field: 'Financial year', Value: payload.currentFy },
    { Field: 'Seller', Value: meta.sellerLabel },
    { Field: 'Generated', Value: payload.generatedAt },
    { Field: 'Exported by', Value: meta.exportedBy },
    { Field: 'Outstanding', Value: k.outstanding },
    { Field: 'Outstanding jobs', Value: k.outstandingJobs },
    { Field: '90+ outstanding', Value: k.aging90 },
    { Field: '90+ jobs', Value: k.aging90Jobs },
    { Field: 'Advance due', Value: k.neverPaidJobs },
    { Field: 'Cash outstanding', Value: k.cashOutstanding },
    { Field: 'Loan outstanding', Value: k.loanOutstanding },
    { Field: 'Loan jobs', Value: k.loanJobs },
    { Field: 'Subsidy in flight jobs', Value: k.subsidyInFlightJobs },
    { Field: 'Subsidy in flight order value', Value: k.subsidyInFlightValue },
  ]

  const aging = payload.aging.rows.map((row) => {
    const rec: Record<string, string | number> = { Metric: row.label }
    payload.aging.columns.forEach((col, i) => {
      rec[col.label] = row.values[i] ?? 0
    })
    rec.Total = row.total
    return rec
  })

  const sellerLoad = payload.sellerLoad.map((r) => ({
    Seller: r.salespersonName,
    Jobs: r.jobs,
    Outstanding: r.outstanding,
    '90+': r.aging90,
    Loan: r.loan,
    'Advance due': r.neverPaid,
  }))

  const jobs = payload.rows.map((r) => ({
    '#': r.slNo ?? '',
    Customer: r.customerName,
    Stage: r.stage,
    Seller: r.salespersonName || '',
    Payment: r.paymentStatusLabel,
    Loan: r.availingLoan ? r.bankLabel : 'N',
    'Last payment': r.lastPaymentDate ?? '',
    'Days outstanding': r.daysOutstanding ?? '',
    Aging: r.agingLabel,
    Received: r.received,
    Balance: r.balance,
    'Order value': r.orderValue,
    Flags: r.flagLabels.join('; '),
  }))

  return { summary, aging, sellerLoad, jobs }
}

export function buildCollectionsCashExcelBuffer(
  payload: CollectionsCashPayload,
  meta: CollectionsCashExportMeta,
): Buffer {
  const sheets = collectionsCashExcelSheets(payload, meta)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.summary), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.aging), 'Aging')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.sellerLoad), 'Seller load')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.jobs), 'Collections list')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function buildCollectionsCashPdfBuffer(
  payload: CollectionsCashPayload,
  meta: CollectionsCashExportMeta,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 36
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin,
      info: { Title: `Collections & Cash FY${payload.currentFy}`, Author: 'Rayenna CRM' },
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

    const footer = () => {
      doc.font('Helvetica').fontSize(8).fillColor(muted)
      textAt(
        `Rayenna CRM · Collections & Cash · FY${payload.currentFy} · ${meta.sellerLabel} · Confidential`,
        margin,
        pageH - 22,
        { width: contentW, align: 'left' },
      )
    }

    doc.on('pageAdded', footer)

    doc.font('Helvetica-Bold').fontSize(18).fillColor(navy)
    textAt('Collections & Cash', margin, margin, { width: contentW })
    doc.font('Helvetica').fontSize(10).fillColor(muted)
    textAt(`Weekly finance pack · FY${payload.currentFy} · ${meta.sellerLabel}`, margin, margin + 24, {
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
      ['Outstanding', `${formatInr(k.outstanding)} · ${k.outstandingJobs} jobs`],
      ['90+ days', formatInr(k.aging90)],
      ['Advance due', String(k.neverPaidJobs)],
      ['Loan stuck', formatInr(k.loanOutstanding)],
      ['Cash', formatInr(k.cashOutstanding)],
      ['Subsidy in flight', `${k.subsidyInFlightJobs} jobs`],
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
    const drawTable = (title: string, headers: string[], rows: string[][], colW: number[]) => {
      if (y > pageH - 80) {
        doc.addPage()
        y = margin
      }
      doc.font('Helvetica-Bold').fontSize(12).fillColor(navy)
      textAt(title, margin, y, { width: contentW })
      y += 18
      const rowH = 16
      const drawHeader = () => {
        doc.rect(margin, y, contentW, rowH).fill('#F5E6C8')
        doc.fillColor(gold)
        let cx = margin
        headers.forEach((h, i) => {
          doc.font('Helvetica-Bold').fontSize(8)
          textAt(h, cx + 4, y + 4, { width: colW[i] - 8, align: i === 0 ? 'left' : 'right' })
          cx += colW[i]
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
          textAt(cell, cx + 4, y + 4, { width: colW[i] - 8, align: i === 0 ? 'left' : 'right' })
          cx += colW[i]
        })
        y += rowH
      })
      y += 14
    }

    const agingHeaders = ['Metric', ...payload.aging.columns.map((c) => c.label), 'Total']
    const agingColW = [140, ...payload.aging.columns.map(() => 90), 90]
    drawTable(
      'Aging',
      agingHeaders,
      payload.aging.rows.map((row) => [
        row.label,
        ...row.values.map((v) => (row.key === 'balance' ? formatInr(v) : String(v))),
        row.key === 'balance' ? formatInr(row.total) : String(row.total),
      ]),
      agingColW,
    )

    const loadW = [200, 80, 140, 140, 140, 90]
    drawTable(
      'Seller load',
      ['Seller', 'Jobs', 'Outstanding', '90+', 'Loan', 'Advance due'],
      payload.sellerLoad.map((r) => [
        r.salespersonName,
        String(r.jobs),
        formatInr(r.outstanding),
        formatInr(r.aging90),
        formatInr(r.loan),
        String(r.neverPaid),
      ]),
      loadW,
    )

    const jobW = [180, 110, 90, 90, 90, 80, 130]
    drawTable(
      'Collections list',
      ['Customer', 'Stage', 'Payment', 'Last pay', 'Days', 'Balance', 'Flags'],
      payload.rows.map((r) => [
        `${r.slNo != null ? `#${r.slNo} ` : ''}${r.customerName}`,
        r.stage,
        r.paymentStatusLabel,
        formatCloseDate(r.lastPaymentDate),
        r.daysOutstanding == null ? '—' : String(r.daysOutstanding),
        formatInr(r.balance),
        r.flagLabels.slice(0, 2).join(', ') || '—',
      ]),
      jobW,
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

export async function buildCollectionsCashPptxBuffer(
  payload: CollectionsCashPayload,
  meta: CollectionsCashExportMeta,
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Collections & Cash FY${payload.currentFy}`
  pptx.author = 'Rayenna CRM'
  pptx.company = 'Rayenna Energy Private Limited'
  pptx.subject = `Weekly collections pack · ${meta.sellerLabel}`

  const k = payload.kpis
  const title = pptx.addSlide()
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: NAVY } })
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } })
  title.addText('COLLECTIONS & CASH', {
    x: 0.7,
    y: 2.1,
    w: 12,
    fontSize: 14,
    bold: true,
    color: GOLD,
    fontFace: 'Arial',
  })
  title.addText(`FY${payload.currentFy}`, {
    x: 0.7,
    y: 2.55,
    w: 12,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  })
  title.addText(`${meta.sellerLabel}  ·  Weekly finance pack`, {
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
  kpiSlide.addText('Collections snapshot', {
    x: 0.4,
    y: 0.25,
    fontSize: 18,
    bold: true,
    color: NAVY,
    fontFace: 'Arial',
  })
  const kpiItems: [string, string][] = [
    ['Outstanding', formatInr(k.outstanding)],
    ['90+ days', formatInr(k.aging90)],
    ['Advance due', String(k.neverPaidJobs)],
    ['Cash / loan', `${formatInr(k.cashOutstanding)} / ${formatInr(k.loanOutstanding)}`],
    ['Pending / partial', `${k.pendingJobs} / ${k.partialJobs}`],
    ['Subsidy in flight', `${k.subsidyInFlightJobs} jobs`],
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

  const aging = pptx.addSlide()
  aging.addText('Aging', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  aging.addTable(
    pptTable(
      ['Metric', ...payload.aging.columns.map((c) => c.label), 'Total'],
      payload.aging.rows.map((row) => [
        row.label,
        ...row.values.map((v) => (row.key === 'balance' ? formatInr(v) : String(v))),
        row.key === 'balance' ? formatInr(row.total) : String(row.total),
      ]),
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [2.2, ...payload.aging.columns.map(() => 8.8 / (payload.aging.columns.length + 1)), 8.8 / (payload.aging.columns.length + 1)],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const load = pptx.addSlide()
  load.addText('Seller load', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  load.addTable(
    pptTable(
      ['Seller', 'Jobs', 'Outstanding', '90+', 'Loan', 'Advance due'],
      payload.sellerLoad.map((r) => [
        r.salespersonName,
        String(r.jobs),
        formatInr(r.outstanding),
        formatInr(r.aging90),
        formatInr(r.loan),
        String(r.neverPaid),
      ]),
      { alignRightFrom: 1 },
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [3.3, 1.4, 2.2, 2.0, 2.0, 1.6],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const perSlide = 12
  const chunks: CollectionsRow[][] = []
  for (let i = 0; i < payload.rows.length; i += perSlide) chunks.push(payload.rows.slice(i, i + perSlide))
  if (chunks.length === 0) chunks.push([])
  chunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(chunks.length > 1 ? `Collections list (${idx + 1}/${chunks.length})` : 'Collections list', {
      x: 0.35,
      y: 0.2,
      fontSize: 16,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
    const rows = chunk.map((r) => [
      r.slNo != null ? String(r.slNo) : '',
      r.customerName,
      r.paymentStatusLabel,
      formatCloseDate(r.lastPaymentDate),
      r.agingLabel,
      r.flagLabels[0] || '—',
      formatInr(r.balance),
    ])
    slide.addTable(
      pptTable(['#', 'Customer', 'Payment', 'Last pay', 'Aging', 'Flag', 'Balance'], rows, { alignRightFrom: 6 }),
      {
        x: 0.3,
        y: 0.7,
        w: 12.7,
        colW: [0.6, 3.2, 1.5, 1.3, 1.2, 2.2, 2.7],
        border: { pt: 0.4, color: 'E5E7EB' },
        fontFace: 'Arial',
      },
    )
  })

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array)
}
