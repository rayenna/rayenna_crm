import express, { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

function monthDateRangesForFY(fy: string, months: string[]): { start: Date; end: Date }[] {
  const fyMatch = String(fy).trim().match(/(\d{4})/);
  if (!fyMatch) return [];
  const startYear = parseInt(fyMatch[1], 10);
  if (!Number.isFinite(startYear)) return [];

  const uniqMonths = Array.from(new Set(months.map((m) => String(m).padStart(2, '0')))).filter((m) =>
    ['01','02','03','04','05','06','07','08','09','10','11','12'].includes(m),
  );

  return uniqMonths.map((mm) => {
    const monthNum = parseInt(mm, 10); // 1-12
    const year = monthNum >= 1 && monthNum <= 3 ? startYear + 1 : startYear;
    const start = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, monthNum, 0, 23, 59, 59, 999);
    return { start, end };
  });
}

// Get word cloud data with filters
router.get('/wordcloud', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    
    // Get filter parameters (arrays for multiple selection)
    const fyFilter = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilter = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];

    const where: any = {
      profitability: { not: null },
      // customerId is a required field (String, not String?), so it can never be null
      // We don't need to filter for it - all projects have a customerId
    };

    // Role-based filtering
    if (role === UserRole.SALES) {
      where.salespersonId = userId;
    }

    // Filter by FY
    if (fyFilter.length > 0) {
      where.year = { in: fyFilter };
    }

    // Month filtering should be pushed to DB. Use confirmationDate when available, otherwise fall back to createdAt.
    // We can express that as: (confirmationDate in range) OR (confirmationDate is null AND createdAt in range).
    if (monthFilter.length > 0) {
      // If multiple FYs are selected, month filter is ambiguous. In that case, we don't apply month filtering.
      // This matches dashboard behavior where month filters are only meaningful with a single FY.
      if (fyFilter.length === 1) {
        const ranges = monthDateRangesForFY(fyFilter[0]!, monthFilter);
        if (ranges.length > 0) {
          where.AND = [
            ...(where.AND || []),
            {
              OR: ranges.flatMap((r) => ([
                { confirmationDate: { gte: r.start, lte: r.end } },
                { AND: [{ confirmationDate: null }, { createdAt: { gte: r.start, lte: r.end } }] },
              ])),
            },
          ];
        }
      }
    }

    // Query only the top 50 by profitability (avoid loading large datasets into Node)
    const profitabilityData = await prisma.project.findMany({
      where,
      select: {
        profitability: true,
        customer: {
          select: {
            firstName: true,
            customerName: true,
          },
        },
      },
      orderBy: { profitability: 'desc' },
      take: 50,
    });

    // Map to word cloud data: First Name from Customer, Profitability from Sales & Commercial section
    const wordCloudData = profitabilityData
      .map((p) => {
        // First Name from Customer (fallback to customerName if firstName is empty)
        const firstName = p.customer?.firstName ? String(p.customer.firstName).trim() : null;
        const customerName = p.customer?.customerName ? String(p.customer.customerName).trim() : null;
        const text = (firstName && firstName.length > 0) || (customerName && customerName.length > 0)
          ? (firstName || customerName || 'Unknown')
          : 'Unknown';
        
        // Profitability from Sales & Commercial section
        const profitability = p.profitability || 0;
        
        return {
          text: text,
          value: profitability,
        };
      })
      .filter((item) => item.text && item.text !== 'Unknown' && item.value > 0);

    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WordCloud API] Returning ${wordCloudData.length} items`);
      if (wordCloudData.length > 0) {
        console.log(`[WordCloud API] Sample data:`, wordCloudData.slice(0, 3));
      }
    }

    res.json({
      wordCloudData,
    });
  } catch (error: any) {
    console.error('[WordCloud API] Error:', error?.message ?? error);
    if (process.env.NODE_ENV === 'development') {
      console.error('[WordCloud API] Error stack:', error?.stack);
    }
    res.status(500).json({ 
      error: error?.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
    });
  }
});

export default router;
