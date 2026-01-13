import express from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateFY } from '../utils/calculations';

const router = express.Router();
const prisma = new PrismaClient();

// Get word cloud data with filters
router.get('/wordcloud', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    
    // Get filter parameters (arrays for multiple selection)
    const fyFilter = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilter = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];

    const where: any = {
      profitability: { not: null },
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
      include: {
        customer: {
          select: {
            customerName: true,
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
      .sort((a, b) => (b.profitability || 0) - (a.profitability || 0))
      .slice(0, 50);

    const wordCloudData = profitabilityData.map((p) => ({
      text: p.customer?.customerName || 'Unknown',
      value: p.profitability || 0,
    }));

    res.json({
      wordCloudData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
