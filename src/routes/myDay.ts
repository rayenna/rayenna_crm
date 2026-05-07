import { Router, Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth'
import prisma from '../prisma'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function mapTask(t: {
  id: string; userId: string; content: string; isDone: boolean
  dueDate: Date | null; isReminder: boolean; projectId: string | null
  projectLabel: string | null; createdAt: Date; updatedAt: Date; sortOrder: number
}) {
  return {
    id: t.id,
    content: t.content,
    isDone: t.isDone,
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    isReminder: t.isReminder,
    projectId: t.projectId,
    projectLabel: t.projectLabel,
    createdAt: t.createdAt.toISOString(),
    sortOrder: t.sortOrder,
  }
}

function mapJournal(j: {
  id: string; userId: string; entryDate: Date; content: string
  projectId: string | null; projectLabel: string | null; updatedAt: Date
}) {
  return {
    id: j.id,
    entryDate: j.entryDate.toISOString().slice(0, 10),
    content: j.content,
    projectId: j.projectId,
    projectLabel: j.projectLabel,
    updatedAt: j.updatedAt.toISOString(),
  }
}

function validationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return true
  }
  return false
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * GET /api/my-day/tasks
 * Returns today's tasks + incomplete tasks from previous days.
 */
router.get('/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const today = todayStart()

    const tasks = await prisma.userTask.findMany({
      where: {
        userId,
        isReminder: false,
        OR: [
          { dueDate: null },
          { dueDate: { gte: today } },
          { isDone: false },           // carry-overs from past days
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    res.json(tasks.map(mapTask))
  } catch (err) {
    console.error('[my-day] GET tasks:', err)
    res.status(500).json({ error: 'Failed to load tasks' })
  }
})

/**
 * POST /api/my-day/tasks
 * Create a new task.
 */
router.post(
  '/tasks',
  authenticate,
  [
    body('content').isString().trim().notEmpty().withMessage('content is required'),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be YYYY-MM-DD'),
    body('isReminder').optional().isBoolean(),
    body('projectId').optional({ nullable: true }).isString(),
    body('projectLabel').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    if (validationErrors(req, res)) return
    try {
      const userId = req.user!.id
      const { content, dueDate, isReminder, projectId, projectLabel } = req.body as {
        content: string
        dueDate?: string | null
        isReminder?: boolean
        projectId?: string | null
        projectLabel?: string | null
      }

      const task = await prisma.userTask.create({
        data: {
          userId,
          content: content.trim(),
          dueDate: dueDate ? new Date(dueDate) : null,
          isReminder: isReminder ?? false,
          projectId: projectId ?? null,
          projectLabel: projectLabel ?? null,
        },
      })
      res.status(201).json(mapTask(task))
    } catch (err) {
      console.error('[my-day] POST tasks:', err)
      res.status(500).json({ error: 'Failed to create task' })
    }
  },
)

/**
 * PATCH /api/my-day/tasks/:id
 * Partial update: isDone, content, sortOrder.
 */
router.patch(
  '/tasks/:id',
  authenticate,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    if (validationErrors(req, res)) return
    try {
      const userId = req.user!.id
      const { id } = req.params
      const { isDone, content, sortOrder } = req.body as {
        isDone?: boolean; content?: string; sortOrder?: number
      }

      // Verify ownership
      const existing = await prisma.userTask.findFirst({ where: { id, userId } })
      if (!existing) { res.status(404).json({ error: 'Task not found' }); return }

      const task = await prisma.userTask.update({
        where: { id },
        data: {
          ...(isDone !== undefined && { isDone }),
          ...(content !== undefined && { content: content.trim() }),
          ...(sortOrder !== undefined && { sortOrder }),
        },
      })
      res.json(mapTask(task))
    } catch (err) {
      console.error('[my-day] PATCH tasks/:id:', err)
      res.status(500).json({ error: 'Failed to update task' })
    }
  },
)

/**
 * DELETE /api/my-day/tasks/:id
 */
router.delete(
  '/tasks/:id',
  authenticate,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    if (validationErrors(req, res)) return
    try {
      const userId = req.user!.id
      const { id } = req.params

      const existing = await prisma.userTask.findFirst({ where: { id, userId } })
      if (!existing) { res.status(404).json({ error: 'Task not found' }); return }

      await prisma.userTask.delete({ where: { id } })
      res.status(204).send()
    } catch (err) {
      console.error('[my-day] DELETE tasks/:id:', err)
      res.status(500).json({ error: 'Failed to delete task' })
    }
  },
)

// ─── Journal ──────────────────────────────────────────────────────────────────

/**
 * GET /api/my-day/journal?date=YYYY-MM-DD
 * Returns today's entry + up to 10 recent past entries.
 */
router.get(
  '/journal',
  authenticate,
  [query('date').optional().isISO8601()],
  async (req: Request, res: Response) => {
    if (validationErrors(req, res)) return
    try {
      const userId = req.user!.id
      const targetDateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10)
      const targetDate = new Date(targetDateStr)
      targetDate.setHours(0, 0, 0, 0)

      const [todayEntry, recentEntries] = await Promise.all([
        prisma.userJournal.findUnique({ where: { userId_entryDate: { userId, entryDate: targetDate } } }),
        prisma.userJournal.findMany({
          where: {
            userId,
            entryDate: { lt: targetDate },
          },
          orderBy: { entryDate: 'desc' },
          take: 10,
        }),
      ])

      res.json({
        today: todayEntry ? mapJournal(todayEntry) : null,
        recent: recentEntries.map(mapJournal),
      })
    } catch (err) {
      console.error('[my-day] GET journal:', err)
      res.status(500).json({ error: 'Failed to load journal' })
    }
  },
)

/**
 * POST /api/my-day/journal
 * Upsert today's journal entry.
 */
router.post(
  '/journal',
  authenticate,
  [
    body('entryDate').isISO8601().withMessage('entryDate is required (YYYY-MM-DD)'),
    body('content').isString(),
    body('projectId').optional({ nullable: true }).isString(),
    body('projectLabel').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    if (validationErrors(req, res)) return
    try {
      const userId = req.user!.id
      const { entryDate, content, projectId, projectLabel } = req.body as {
        entryDate: string; content: string; projectId?: string | null; projectLabel?: string | null
      }

      const dateVal = new Date(entryDate)
      dateVal.setHours(0, 0, 0, 0)

      const entry = await prisma.userJournal.upsert({
        where: { userId_entryDate: { userId, entryDate: dateVal } },
        create: {
          userId,
          entryDate: dateVal,
          content,
          projectId: projectId ?? null,
          projectLabel: projectLabel ?? null,
        },
        update: {
          content,
          projectId: projectId ?? null,
          projectLabel: projectLabel ?? null,
        },
      })
      res.json(mapJournal(entry))
    } catch (err) {
      console.error('[my-day] POST journal:', err)
      res.status(500).json({ error: 'Failed to save journal' })
    }
  },
)

// ─── Reminders ────────────────────────────────────────────────────────────────

/**
 * GET /api/my-day/reminders
 * Returns upcoming reminders (isReminder=true, dueDate >= today), sorted by dueDate asc.
 */
router.get('/reminders', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const today = todayStart()

    const reminders = await prisma.userTask.findMany({
      where: {
        userId,
        isReminder: true,
        dueDate: { gte: today },
      },
      orderBy: { dueDate: 'asc' },
    })

    res.json(reminders.map(mapTask))
  } catch (err) {
    console.error('[my-day] GET reminders:', err)
    res.status(500).json({ error: 'Failed to load reminders' })
  }
})

/**
 * POST /api/my-day/reminders
 * Create a reminder (isReminder: true, dueDate required).
 */
router.post(
  '/reminders',
  authenticate,
  [
    body('content').isString().trim().notEmpty().withMessage('content is required'),
    body('dueDate').isISO8601().withMessage('dueDate is required (YYYY-MM-DD)'),
    body('projectId').optional({ nullable: true }).isString(),
    body('projectLabel').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    if (validationErrors(req, res)) return
    try {
      const userId = req.user!.id
      const { content, dueDate, projectId, projectLabel } = req.body as {
        content: string; dueDate: string; projectId?: string | null; projectLabel?: string | null
      }

      const task = await prisma.userTask.create({
        data: {
          userId,
          content: content.trim(),
          dueDate: new Date(dueDate),
          isReminder: true,
          projectId: projectId ?? null,
          projectLabel: projectLabel ?? null,
        },
      })
      res.status(201).json(mapTask(task))
    } catch (err) {
      console.error('[my-day] POST reminders:', err)
      res.status(500).json({ error: 'Failed to create reminder' })
    }
  },
)

export default router
