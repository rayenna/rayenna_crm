import express, { Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as XLSX from 'xlsx';
import { Builder } from 'xml2js';

const router = express.Router();
const prisma = new PrismaClient();

// Export to Excel (Tally-friendly format)
router.get('/export/excel', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, projectStatus } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (projectStatus) {
      where.projectStatus = projectStatus;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: {
          select: {
            customerName: true,
            consumerNumber: true,
          },
        },
        salesperson: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for Tally
    const tallyData = projects.map((project) => ({
      'SL No': project.slNo,
      'Customer Name': project.customer?.customerName || '',
      'Consumer Number': project.customer?.consumerNumber || '',
      'Invoice Amount': project.projectCost || 0,
      'Payment Received': project.totalAmountReceived || 0,
      'Outstanding Balance': project.balanceAmount || 0,
      'Payment Status': project.paymentStatus,
      'Project Status': project.projectStatus,
      'Salesperson': project.salesperson?.name || '',
      'Date': project.createdAt.toISOString().split('T')[0],
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(tallyData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tally-export-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export to JSON (Tally-friendly format)
router.get('/export/json', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, projectStatus } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (projectStatus) {
      where.projectStatus = projectStatus;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: {
          select: {
            customerName: true,
            consumerNumber: true,
          },
        },
        salesperson: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for Tally
    const tallyData = projects.map((project) => ({
      slNo: project.slNo,
      customerName: project.customer?.customerName || '',
      consumerNumber: project.customer?.consumerNumber || '',
      invoiceAmount: project.projectCost || 0,
      paymentReceived: project.totalAmountReceived || 0,
      outstandingBalance: project.balanceAmount || 0,
      paymentStatus: project.paymentStatus,
      projectStatus: project.projectStatus,
      salesperson: project.salesperson?.name || '',
      date: project.createdAt.toISOString().split('T')[0],
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tally-export-${Date.now()}.json`);
    res.json(tallyData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export to XML (Tally-friendly format)
router.get('/export/xml', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, projectStatus } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (projectStatus) {
      where.projectStatus = projectStatus;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: {
          select: {
            customerName: true,
            consumerNumber: true,
          },
        },
        salesperson: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for Tally XML
    const builder = new Builder({ rootName: 'TallyData', xmldec: { version: '1.0', encoding: 'UTF-8' } });
    const xmlData = {
      Projects: {
        Project: projects.map((project) => ({
          SLNo: project.slNo,
          CustomerName: project.customer?.customerName || '',
          ConsumerNumber: project.customer?.consumerNumber || '',
          InvoiceAmount: project.projectCost || 0,
          PaymentReceived: project.totalAmountReceived || 0,
          OutstandingBalance: project.balanceAmount || 0,
          PaymentStatus: project.paymentStatus,
          ProjectStatus: project.projectStatus,
          Salesperson: project.salesperson?.name || '',
          Date: project.createdAt.toISOString().split('T')[0],
        })),
      },
    };

    const xml = builder.buildObject(xmlData);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=tally-export-${Date.now()}.xml`);
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
