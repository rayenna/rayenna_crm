import express, { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import * as XLSX from 'xlsx';
import { Builder } from 'xml2js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to format date for Tally
const formatTallyDate = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Helper function to get customer display name
const getCustomerDisplayName = (customer: any): string => {
  if (!customer) return '';
  const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : customer.customerName || '';
};

// Export Projects to Excel (Tally-friendly format)
router.get('/export/projects/excel', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, projectStatus, customerId } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (projectStatus) {
      where.projectStatus = projectStatus;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: {
          select: {
            customerName: true,
            firstName: true,
            middleName: true,
            lastName: true,
            prefix: true,
            consumerNumber: true,
            gstNumber: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            pinCode: true,
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
      'Customer Name': getCustomerDisplayName(project.customer),
      'Consumer Number': project.customer?.consumerNumber || '',
      'GST Number': project.customer?.gstNumber || '',
      'Address': [
        project.customer?.addressLine1,
        project.customer?.addressLine2,
        project.customer?.city,
        project.customer?.state,
        project.customer?.pinCode,
      ].filter(Boolean).join(', '),
      'Project Cost': project.projectCost || 0,
      'Payment Received': project.totalAmountReceived || 0,
      'Outstanding Balance': project.balanceAmount || 0,
      'Payment Status': project.paymentStatus,
      'Project Status': project.projectStatus,
      'Salesperson': project.salesperson?.name || '',
      'System Capacity (kW)': project.systemCapacity || 0,
      'Project Type': project.type,
      'Date': formatTallyDate(project.createdAt),
      'Confirmation Date': project.confirmationDate ? formatTallyDate(new Date(project.confirmationDate)) : '',
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(tallyData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tally-projects-export-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export Invoices to Excel (Tally-friendly format)
router.get('/export/invoices/excel', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, projectId } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        project: {
          include: {
            customer: {
              select: {
                customerName: true,
                firstName: true,
                middleName: true,
                lastName: true,
                prefix: true,
                consumerNumber: true,
                gstNumber: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for Tally
    const tallyData = invoices.map((invoice) => {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        'Invoice Number': invoice.invoiceNumber,
        'Customer Name': getCustomerDisplayName(invoice.project?.customer),
        'Consumer Number': invoice.project?.customer?.consumerNumber || '',
        'GST Number': invoice.project?.customer?.gstNumber || '',
        'Base Amount': invoice.amount,
        'GST Amount': invoice.gst || 0,
        'Total Amount': invoice.total,
        'Amount Paid': totalPaid,
        'Outstanding': invoice.total - totalPaid,
        'Invoice Status': invoice.status,
        'Due Date': invoice.dueDate ? formatTallyDate(new Date(invoice.dueDate)) : '',
        'Invoice Date': formatTallyDate(invoice.createdAt),
        'Payment Count': invoice.payments.length,
      };
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(tallyData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tally-invoices-export-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export Payments to Excel (Tally-friendly format)
router.get('/export/payments/excel', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, mode, invoiceId } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }
    if (mode) {
      where.mode = mode;
    }
    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            project: {
              include: {
                customer: {
                  select: {
                    customerName: true,
                    firstName: true,
                    middleName: true,
                    lastName: true,
                    prefix: true,
                    consumerNumber: true,
                    gstNumber: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    // Format data for Tally
    const tallyData = payments.map((payment) => ({
      'Payment ID': payment.id,
      'Invoice Number': payment.invoice.invoiceNumber,
      'Customer Name': getCustomerDisplayName(payment.invoice.project?.customer),
      'Consumer Number': payment.invoice.project?.customer?.consumerNumber || '',
      'Payment Amount': payment.amount,
      'Payment Mode': payment.mode,
      'Reference Number': payment.referenceNo || '',
      'Payment Date': formatTallyDate(payment.paymentDate),
      'Created Date': formatTallyDate(payment.createdAt),
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(tallyData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tally-payments-export-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export to CSV (Tally-friendly format)
router.get('/export/csv', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: Request, res: Response) => {
  try {
    const { type = 'projects', startDate, endDate } = req.query;

    let data: any[] = [];

    if (type === 'invoices') {
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          project: {
            include: {
              customer: true,
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      data = invoices.map((invoice) => {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        return {
          'Invoice Number': invoice.invoiceNumber,
          'Customer Name': getCustomerDisplayName(invoice.project?.customer),
          'Amount': invoice.amount,
          'GST': invoice.gst || 0,
          'Total': invoice.total,
          'Paid': totalPaid,
          'Outstanding': invoice.total - totalPaid,
          'Status': invoice.status,
          'Date': formatTallyDate(invoice.createdAt),
        };
      });
    } else {
      // Default: Projects
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const projects = await prisma.project.findMany({
        where,
        include: {
          customer: true,
          salesperson: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      data = projects.map((project) => ({
        'SL No': project.slNo,
        'Customer Name': getCustomerDisplayName(project.customer),
        'Amount': project.projectCost || 0,
        'Paid': project.totalAmountReceived || 0,
        'Outstanding': project.balanceAmount || 0,
        'Status': project.paymentStatus,
        'Date': formatTallyDate(project.createdAt),
      }));
    }

    // Convert to CSV
    if (data.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) => headers.map((header) => `"${row[header] || ''}"`).join(',')),
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tally-export-${type}-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export to JSON (Tally-friendly format) - Legacy endpoint, kept for backward compatibility
router.get('/export/json', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: Request, res: Response) => {
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
      customerName: getCustomerDisplayName(project.customer),
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

// Export to Tally XML (Native Tally format for ledger/voucher import)
router.get('/export/tally-xml', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type = 'vouchers' } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    if (type === 'ledgers') {
      // Export customers as Ledgers (Party Masters)
      const projects = await prisma.project.findMany({
        where,
        include: {
          customer: true,
        },
        distinct: ['customerId'],
      });

      const builder = new Builder({
        rootName: 'ENVELOPE',
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' },
      });

      const xmlData = {
        HEADER: {
          VERSION: '1',
          TALLYREQUEST: 'Import',
          TYPE: 'Data',
          ID: 'All Masters',
        },
        BODY: {
          IMPORTDATA: {
            REQUESTDESC: {
              REPORTNAME: 'All Masters',
              STATICVARIABLE: 'SVCurrentCompany',
              SVCurrentCompany: 'Rayenna Energy',
            },
            REQUESTDATA: {
              TALLYMESSAGE: projects.map((project) => ({
                LEDGER: {
                  NAME: getCustomerDisplayName(project.customer),
                  PARENT: 'Sundry Debtors',
                  ADDRESS: [
                    project.customer?.addressLine1,
                    project.customer?.addressLine2,
                    project.customer?.city,
                    project.customer?.state,
                    project.customer?.pinCode,
                  ].filter(Boolean).join(', ') || '',
                  STATE: project.customer?.state || '',
                  PINCODE: project.customer?.pinCode || '',
                  CONTACT: project.customer?.phone || '',
                  GSTIN: project.customer?.gstNumber || '',
                  OPENINGBALANCE: '0.00',
                },
              })),
            },
          },
        },
      };

      const xml = builder.buildObject(xmlData);

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename=tally-ledgers-${Date.now()}.xml`);
      res.send(xml);
    } else {
      // Export invoices as Vouchers (Sales Vouchers)
      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          project: {
            include: {
              customer: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const builder = new Builder({
        rootName: 'ENVELOPE',
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' },
      });

      const xmlData = {
        HEADER: {
          VERSION: '1',
          TALLYREQUEST: 'Import',
          TYPE: 'Data',
          ID: 'Vouchers',
        },
        BODY: {
          IMPORTDATA: {
            REQUESTDESC: {
              REPORTNAME: 'Voucher Data',
              STATICVARIABLE: 'SVCurrentCompany',
              SVCurrentCompany: 'Rayenna Energy',
            },
            REQUESTDATA: {
              TALLYMESSAGE: invoices.map((invoice) => ({
                VOUCHER: {
                  VOUCHERTYPE: 'Sales',
                  DATE: formatTallyDate(invoice.createdAt),
                  NARRATION: `Invoice ${invoice.invoiceNumber} - Solar Project`,
                  PARTYNAME: getCustomerDisplayName(invoice.project?.customer),
                  VOUCHERNUMBER: invoice.invoiceNumber,
                  ALTERID: invoice.id,
                  ENTRYTYPLIST: {
                    ENTRYTYPLIST: [
                      {
                        STOCKITEMNAME: 'Solar System Installation',
                        RATE: (invoice.amount / 1).toFixed(2),
                        AMOUNT: invoice.amount.toFixed(2),
                        ACTUALQTY: '1 Nos',
                      },
                      ...(invoice.gst && invoice.gst > 0
                        ? [
                            {
                              STOCKITEMNAME: 'GST',
                              RATE: invoice.gst.toFixed(2),
                              AMOUNT: invoice.gst.toFixed(2),
                              ACTUALQTY: '1 Nos',
                            },
                          ]
                        : []),
                    ],
                  },
                  LEDGERENTRIES: {
                    LEDGERNAME: getCustomerDisplayName(invoice.project?.customer),
                    ISDEEMEDPOSITIVE: 'No',
                    AMOUNT: invoice.total.toFixed(2),
                  },
                },
              })),
            },
          },
        },
      };

      const xml = builder.buildObject(xmlData);

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename=tally-vouchers-${Date.now()}.xml`);
      res.send(xml);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export to XML (Generic XML format) - Legacy endpoint, kept for backward compatibility
router.get('/export/xml', authenticate, authorize(UserRole.ADMIN, UserRole.FINANCE), async (req: Request, res: Response) => {
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
          CustomerName: getCustomerDisplayName(project.customer),
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
