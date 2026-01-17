import express, { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

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

    // Get all projects matching FY filter
    const allProjects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        profitability: true, // Profitability from Sales & Commercial section
        year: true,
        confirmationDate: true,
        createdAt: true,
        customer: {
          select: {
            firstName: true, // First Name from Customer
            customerName: true, // Fallback
          },
        },
      },
    });

    // Filter by month if provided
    let filteredProjects = allProjects;
    if (monthFilter.length > 0) {
      filteredProjects = allProjects.filter((project) => {
        const date = project.confirmationDate || project.createdAt;
        if (!date) return false;
        const month = new Date(date).getMonth() + 1; // 1-12
        const monthStr = String(month).padStart(2, '0');
        return monthFilter.includes(monthStr);
      });
    }

    // Sort by profitability and take top 50
    const profitabilityData = filteredProjects
      .filter((p) => p.profitability !== null && p.profitability !== undefined)
      .sort((a, b) => (b.profitability || 0) - (a.profitability || 0))
      .slice(0, 50);

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
    console.error('[WordCloud API] Error:', error);
    console.error('[WordCloud API] Error stack:', error?.stack);
    console.error('[WordCloud API] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ 
      error: error?.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
    });
  }
});

export default router;
