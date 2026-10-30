import express, { Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { authenticate, authorize } from '../middleware/auth'
import {
  loadCollectionsCashPack,
  loadDeliveryControlPack,
  loadFunnelVelocityPack,
  loadMarginMixPack,
  loadSalesReviewPack,
  type ReportPackScope,
} from '../utils/reportPackLoad'
import {
  buildSalesReviewExcelBuffer,
  buildSalesReviewPdfBuffer,
  buildSalesReviewPptxBuffer,
  salesReviewExportBasename,
} from '../utils/salesReviewExport'
import {
  buildDeliveryControlExcelBuffer,
  buildDeliveryControlPdfBuffer,
  buildDeliveryControlPptxBuffer,
  deliveryControlExportBasename,
} from '../utils/deliveryControlExport'
import {
  buildCollectionsCashExcelBuffer,
  buildCollectionsCashPdfBuffer,
  buildCollectionsCashPptxBuffer,
  collectionsCashExportBasename,
} from '../utils/collectionsCashExport'
import {
  buildFunnelVelocityExcelBuffer,
  buildFunnelVelocityPdfBuffer,
  buildFunnelVelocityPptxBuffer,
  funnelVelocityExportBasename,
} from '../utils/funnelVelocityExport'
import {
  buildMarginMixExcelBuffer,
  buildMarginMixPdfBuffer,
  buildMarginMixPptxBuffer,
  marginMixExportBasename,
} from '../utils/marginMixExport'

const router = express.Router()

export const REPORTS_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGEMENT,
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
]
export const SALES_REVIEW_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES]
export const DELIVERY_CONTROL_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGEMENT,
  UserRole.SALES,
  UserRole.OPERATIONS,
]
export const COLLECTIONS_CASH_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGEMENT,
  UserRole.FINANCE,
  UserRole.SALES,
]
export const FUNNEL_VELOCITY_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES]
export const MARGIN_MIX_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.FINANCE]

const EXPORT_MIME: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

function packScope(req: Request): ReportPackScope {
  const q = (key: string) => (typeof req.query[key] === 'string' ? String(req.query[key]).trim() : '')
  return {
    role: req.user!.role as UserRole,
    userId: req.user!.id,
    salespersonId: q('salespersonId'),
    opsPersonId: q('opsPersonId'),
    fy: q('fy'),
    quarter: q('quarter'),
    exportedBy: req.user!.email,
  }
}

function loadSalesReview(req: Request) {
  return loadSalesReviewPack(packScope(req))
}

router.get(
  '/sales-review',
  authenticate,
  authorize(...SALES_REVIEW_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadSalesReview(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Sales Review'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/sales-review/export/:format',
  authenticate,
  authorize(...SALES_REVIEW_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadSalesReview(req)
      const meta = { sellerLabel, exportedBy }
      const basename = salesReviewExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildSalesReviewExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildSalesReviewPdfBuffer(payload, meta)
      else buffer = await buildSalesReviewPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Sales Review'
      console.error('Sales Review export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

function loadDeliveryControl(req: Request) {
  return loadDeliveryControlPack(packScope(req))
}

router.get(
  '/delivery-control',
  authenticate,
  authorize(...DELIVERY_CONTROL_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadDeliveryControl(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Delivery Control'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/delivery-control/export/:format',
  authenticate,
  authorize(...DELIVERY_CONTROL_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, opsLabel, exportedBy } = await loadDeliveryControl(req)
      const meta = { opsLabel, exportedBy }
      const basename = deliveryControlExportBasename(payload, opsLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildDeliveryControlExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildDeliveryControlPdfBuffer(payload, meta)
      else buffer = await buildDeliveryControlPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Delivery Control'
      console.error('Delivery Control export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

function loadCollectionsCash(req: Request) {
  return loadCollectionsCashPack(packScope(req))
}

router.get(
  '/collections-cash',
  authenticate,
  authorize(...COLLECTIONS_CASH_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadCollectionsCash(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Collections & Cash'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/collections-cash/export/:format',
  authenticate,
  authorize(...COLLECTIONS_CASH_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadCollectionsCash(req)
      const meta = { sellerLabel, exportedBy }
      const basename = collectionsCashExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildCollectionsCashExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildCollectionsCashPdfBuffer(payload, meta)
      else buffer = await buildCollectionsCashPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Collections & Cash'
      console.error('Collections & Cash export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

function loadFunnelVelocity(req: Request) {
  return loadFunnelVelocityPack(packScope(req))
}

router.get(
  '/funnel-velocity',
  authenticate,
  authorize(...FUNNEL_VELOCITY_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadFunnelVelocity(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Funnel Velocity'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/funnel-velocity/export/:format',
  authenticate,
  authorize(...FUNNEL_VELOCITY_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadFunnelVelocity(req)
      const meta = { sellerLabel, exportedBy }
      const basename = funnelVelocityExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildFunnelVelocityExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildFunnelVelocityPdfBuffer(payload, meta)
      else buffer = await buildFunnelVelocityPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Funnel Velocity'
      console.error('Funnel Velocity export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

function loadMarginMix(req: Request) {
  return loadMarginMixPack(packScope(req))
}

router.get(
  '/margin-mix',
  authenticate,
  authorize(...MARGIN_MIX_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadMarginMix(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Margin & Mix'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/margin-mix/export/:format',
  authenticate,
  authorize(...MARGIN_MIX_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadMarginMix(req)
      const meta = { sellerLabel, exportedBy }
      const basename = marginMixExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildMarginMixExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildMarginMixPdfBuffer(payload, meta)
      else buffer = await buildMarginMixPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Margin & Mix'
      console.error('Margin & Mix export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

export default router
