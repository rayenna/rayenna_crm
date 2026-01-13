import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, InvoiceStatus, PaymentMode } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get invoices for a project
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { projectId: req.params.projectId },
      include: {
        payments: true,
        project: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoices' });
  }
});

// Get all invoices with filters
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: express.Response) => {
    try {
      const { status, projectId, page = 1, limit = 20 } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (projectId) where.projectId = projectId as string;

      const skip = (Number(page) - 1) * Number(limit);

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            payments: true,
            project: {
              include: {
                customer: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({
        invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch invoices' });
    }
  }
);

// Get single invoice
router.get('/:id', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        payments: true,
        project: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoice' });
  }
});

// Create invoice
router.post(
  '/',
  authenticate,
  [
    body('projectId').isString().notEmpty(),
    body('invoiceNumber').isString().notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('gst').optional().isFloat({ min: 0 }),
    body('dueDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, gst = 0 } = req.body;
      const total = amount + gst;

      const invoice = await prisma.invoice.create({
        data: {
          ...req.body,
          total,
          status: 'UNPAID',
        },
        include: {
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      res.status(201).json(invoice);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to create invoice' });
    }
  }
);

// Update invoice
router.put(
  '/:id',
  authenticate,
  [
    body('status').optional().isIn(Object.values(InvoiceStatus)),
    body('amount').optional().isFloat({ min: 0 }),
    body('gst').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: { payments: true },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const updateData: any = { ...req.body };
      
      // Recalculate total if amount or GST changed
      if (req.body.amount !== undefined || req.body.gst !== undefined) {
        const amount = req.body.amount ?? invoice.amount;
        const gst = req.body.gst ?? invoice.gst ?? 0;
        updateData.total = amount + gst;
      }

      // Update status based on payments
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid >= invoice.total) {
        updateData.status = 'PAID';
      } else if (totalPaid > 0) {
        updateData.status = 'PART_PAID';
      } else {
        updateData.status = 'UNPAID';
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          payments: true,
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      res.json(updatedInvoice);
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to update invoice' });
    }
  }
);

// Add payment to invoice
router.post(
  '/:id/payments',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }),
    body('paymentDate').optional().isISO8601(),
    body('mode').isIn(Object.values(PaymentMode)),
    body('referenceNo').optional().isString(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: { payments: true },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          ...req.body,
          paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        },
      });

      // Update invoice status
      const totalPaid = [...invoice.payments, payment].reduce((sum, p) => sum + p.amount, 0);
      let status: InvoiceStatus = 'UNPAID';
      if (totalPaid >= invoice.total) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PART_PAID';
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status },
      });

      // Update project stage if all invoices are paid
      if (status === 'PAID') {
        const projectInvoices = await prisma.invoice.findMany({
          where: { projectId: invoice.projectId },
          include: { payments: true },
        });
        const allPaid = projectInvoices.every((inv) => {
          const invPayments = inv.payments || [];
          const invTotalPaid = invPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
          return invTotalPaid >= inv.total;
        });

        if (allPaid) {
          await prisma.project.update({
            where: { id: invoice.projectId },
            data: {
              projectStage: 'LIVE',
              stageEnteredAt: new Date(),
              slaDays: 3,
              statusIndicator: 'GREEN',
            },
          });
        }
      }

      res.status(201).json(payment);
    } catch (error: any) {
      console.error('Error adding payment:', error);
      res.status(500).json({ error: error.message || 'Failed to add payment' });
    }
  }
);

// Delete invoice
router.delete('/:id', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    await prisma.invoice.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to delete invoice' });
  }
});

export default router;
