import express, { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import {
  buildChartBuilderMeta,
  isValidChartSpec,
  type ChartBuilderDateFilters,
  type ChartBuilderSpec,
} from '../utils/chartBuilder/catalog';
import { queryChartBuilder } from '../utils/chartBuilder/queryChart';

const router = express.Router();

export const CHART_BUILDER_ACCESS: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT];

function parseDateFilters(body: Record<string, unknown>): ChartBuilderDateFilters {
  const asArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof v === 'string' && v.trim()) return [v.trim()];
    return [];
  };
  return {
    fy: asArr(body.fy),
    quarter: asArr(body.quarter),
    month: asArr(body.month),
  };
}

router.get(
  '/meta',
  authenticate,
  authorize(...CHART_BUILDER_ACCESS),
  (_req: Request, res: Response) => {
    return res.json(buildChartBuilderMeta());
  },
);

router.post(
  '/query',
  authenticate,
  authorize(...CHART_BUILDER_ACCESS),
  async (req: Request, res: Response) => {
    try {
      const specRaw = req.body?.spec;
      if (!isValidChartSpec(specRaw)) {
        return res.status(400).json({ error: 'Invalid chart specification' });
      }
      const dates = parseDateFilters(req.body || {});
      const result = await queryChartBuilder(specRaw as ChartBuilderSpec, dates);
      return res.json(result);
    } catch (error: unknown) {
      console.error('Chart Builder query failed:', error);
      const message = error instanceof Error ? error.message : 'Query failed';
      return res.status(500).json({ error: message });
    }
  },
);

router.get(
  '/charts',
  authenticate,
  authorize(...CHART_BUILDER_ACCESS),
  async (_req: Request, res: Response) => {
    try {
      const charts = await prisma.chartBuilderChart.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      });
      return res.json({
        charts: charts.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          spec: c.spec,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          createdBy: c.createdBy,
          updatedBy: c.updatedBy,
        })),
      });
    } catch (error: unknown) {
      console.error('Chart Builder list failed:', error);
      return res.status(500).json({ error: 'Failed to list charts' });
    }
  },
);

router.post(
  '/charts',
  authenticate,
  authorize(...CHART_BUILDER_ACCESS),
  async (req: Request, res: Response) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name || name.length > 120) {
        return res.status(400).json({ error: 'Name is required (max 120 characters)' });
      }
      if (!isValidChartSpec(req.body?.spec)) {
        return res.status(400).json({ error: 'Invalid chart specification' });
      }
      const description =
        typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 500) : null;

      const created = await prisma.chartBuilderChart.create({
        data: {
          name,
          description: description || null,
          spec: req.body.spec,
          createdById: req.user!.id,
          updatedById: req.user!.id,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      });
      return res.status(201).json({
        id: created.id,
        name: created.name,
        description: created.description,
        spec: created.spec,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        createdBy: created.createdBy,
        updatedBy: created.updatedBy,
      });
    } catch (error: unknown) {
      console.error('Chart Builder create failed:', error);
      return res.status(500).json({ error: 'Failed to save chart' });
    }
  },
);

router.patch(
  '/charts/:id',
  authenticate,
  authorize(...CHART_BUILDER_ACCESS),
  async (req: Request, res: Response) => {
    try {
      const existing = await prisma.chartBuilderChart.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Chart not found' });

      const data: {
        name?: string;
        description?: string | null;
        spec?: ChartBuilderSpec;
        updatedById: string;
      } = { updatedById: req.user!.id };

      if (req.body?.name !== undefined) {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        if (!name || name.length > 120) {
          return res.status(400).json({ error: 'Name is required (max 120 characters)' });
        }
        data.name = name;
      }
      if (req.body?.description !== undefined) {
        data.description =
          typeof req.body.description === 'string'
            ? req.body.description.trim().slice(0, 500) || null
            : null;
      }
      if (req.body?.spec !== undefined) {
        if (!isValidChartSpec(req.body.spec)) {
          return res.status(400).json({ error: 'Invalid chart specification' });
        }
        data.spec = req.body.spec;
      }

      const updated = await prisma.chartBuilderChart.update({
        where: { id: existing.id },
        data,
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      });
      return res.json({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        spec: updated.spec,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        createdBy: updated.createdBy,
        updatedBy: updated.updatedBy,
      });
    } catch (error: unknown) {
      console.error('Chart Builder update failed:', error);
      return res.status(500).json({ error: 'Failed to update chart' });
    }
  },
);

router.delete(
  '/charts/:id',
  authenticate,
  authorize(...CHART_BUILDER_ACCESS),
  async (req: Request, res: Response) => {
    try {
      const existing = await prisma.chartBuilderChart.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Chart not found' });
      await prisma.chartBuilderChart.delete({ where: { id: existing.id } });
      return res.json({ ok: true });
    } catch (error: unknown) {
      console.error('Chart Builder delete failed:', error);
      return res.status(500).json({ error: 'Failed to delete chart' });
    }
  },
);

export default router;
