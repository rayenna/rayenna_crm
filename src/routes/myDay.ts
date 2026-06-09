import { Router, Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth'
import prisma from '../prisma'
import { randomUUID } from 'crypto'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD string in the server's local time (matches what the frontend sends) */
function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Normalise a YYYY-MM-DD string coming from the client. */
function normDateStr(iso: string): string {
  // Accept YYYY-MM-DD or full ISO — take the date part only
  return iso.slice(0, 10)
}

// ─── Types (raw DB rows) ──────────────────────────────────────────────────────

interface TaskRow {
  id: string
  user_id: string
  content: string
  is_done: boolean
  due_date: Date | null
  is_reminder: boolean
  project_id: string | null
  project_label: string | null
  created_at: Date
  updated_at: Date
  sort_order: number
}

interface JournalRow {
  id: string
  user_id: string
  entry_date: Date
  content: string
  project_id: string | null
  project_label: string | null
  created_at: Date
  updated_at: Date
}

// ─── Serialisers ──────────────────────────────────────────────────────────────

function serTask(t: TaskRow) {
  return {
    id: t.id,
    content: t.content,
    isDone: t.is_done,
    dueDate: t.due_date ? toDateStr(new Date(t.due_date)) : null,
    isReminder: t.is_reminder,
    projectId: t.project_id,
    projectLabel: t.project_label,
    createdAt: new Date(t.created_at).toISOString(),
    sortOrder: t.sort_order,
  }
}

function serJournal(j: JournalRow) {
  return {
    id: j.id,
    entryDate: toDateStr(new Date(j.entry_date)),
    content: j.content,
    projectId: j.project_id,
    projectLabel: j.project_label,
    updatedAt: new Date(j.updated_at).toISOString(),
  }
}

function validErr(req: Request, res: Response): boolean {
  const errs = validationResult(req)
  if (!errs.isEmpty()) { res.status(400).json({ errors: errs.array() }); return true }
  return false
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

/** Open (incomplete) tasks pinned to a CRM project — for Project detail strip. */
router.get(
  '/tasks/for-project/:projectId',
  authenticate,
  [param('projectId').isString().trim().notEmpty()],
  async (req: Request, res: Response) => {
    if (validErr(req, res)) return
    try {
      const userId = req.user!.id
      const { projectId } = req.params

      const rows = await prisma.$queryRaw<TaskRow[]>`
        SELECT * FROM user_tasks
        WHERE user_id = ${userId}
          AND project_id = ${projectId}
          AND is_reminder = false
          AND is_done = false
        ORDER BY sort_order ASC, created_at DESC
        LIMIT 25
      `
      res.json(rows.map(serTask))
    } catch (err) {
      console.error('[my-day] GET tasks/for-project:', err)
      res.status(500).json({ error: 'Failed to load project tasks' })
    }
  },
)

router.get('/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const todayStr = toDateStr(new Date())

    const rows = await prisma.$queryRaw<TaskRow[]>`
      SELECT * FROM user_tasks
      WHERE user_id = ${userId}
        AND is_reminder = false
        AND (
          due_date IS NULL
          OR due_date >= ${todayStr}::date
          OR is_done = false
        )
      ORDER BY sort_order ASC, created_at DESC
    `
    res.json(rows.map(serTask))
  } catch (err) {
    console.error('[my-day] GET tasks:', err)
    res.status(500).json({ error: 'Failed to load tasks' })
  }
})

router.post(
  '/tasks',
  authenticate,
  [
    body('content').isString().trim().notEmpty(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('isReminder').optional().isBoolean(),
    body('projectId').optional({ nullable: true }).isString(),
    body('projectLabel').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    if (validErr(req, res)) return
    try {
      const userId = req.user!.id
      const { content, dueDate, isReminder, projectId, projectLabel } = req.body
      const id = randomUUID()
      const isRem = isReminder ?? false

      if (dueDate) {
        const dueDateStr = normDateStr(dueDate)
        await prisma.$executeRaw`
          INSERT INTO user_tasks (id, user_id, content, is_done, due_date, is_reminder, project_id, project_label, sort_order)
          VALUES (${id}::uuid, ${userId}, ${content.trim()}, false, ${dueDateStr}::date, ${isRem}, ${projectId ?? null}, ${projectLabel ?? null}, 0)
        `
      } else {
        await prisma.$executeRaw`
          INSERT INTO user_tasks (id, user_id, content, is_done, due_date, is_reminder, project_id, project_label, sort_order)
          VALUES (${id}::uuid, ${userId}, ${content.trim()}, false, NULL, ${isRem}, ${projectId ?? null}, ${projectLabel ?? null}, 0)
        `
      }
      const rows = await prisma.$queryRaw<TaskRow[]>`SELECT * FROM user_tasks WHERE id = ${id}::uuid`
      res.status(201).json(serTask(rows[0]!))
    } catch (err) {
      console.error('[my-day] POST tasks:', err)
      res.status(500).json({ error: 'Failed to create task' })
    }
  },
)

router.patch(
  '/tasks/:id',
  authenticate,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    if (validErr(req, res)) return
    try {
      const userId = req.user!.id
      const { id } = req.params
      const { isDone, content, sortOrder } = req.body

      const existing = await prisma.$queryRaw<TaskRow[]>`
        SELECT id FROM user_tasks WHERE id = ${id}::uuid AND user_id = ${userId}
      `
      if (!existing.length) { res.status(404).json({ error: 'Task not found' }); return }

      if (isDone !== undefined)    await prisma.$executeRaw`UPDATE user_tasks SET is_done = ${isDone},    updated_at = now() WHERE id = ${id}::uuid`
      if (content !== undefined)   await prisma.$executeRaw`UPDATE user_tasks SET content = ${String(content).trim()}, updated_at = now() WHERE id = ${id}::uuid`
      if (sortOrder !== undefined) await prisma.$executeRaw`UPDATE user_tasks SET sort_order = ${Number(sortOrder)}, updated_at = now() WHERE id = ${id}::uuid`

      const rows = await prisma.$queryRaw<TaskRow[]>`SELECT * FROM user_tasks WHERE id = ${id}::uuid`
      res.json(serTask(rows[0]!))
    } catch (err) {
      console.error('[my-day] PATCH tasks/:id:', err)
      res.status(500).json({ error: 'Failed to update task' })
    }
  },
)

router.delete(
  '/tasks/:id',
  authenticate,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    if (validErr(req, res)) return
    try {
      const userId = req.user!.id
      const { id } = req.params
      const existing = await prisma.$queryRaw<TaskRow[]>`
        SELECT id FROM user_tasks WHERE id = ${id}::uuid AND user_id = ${userId}
      `
      if (!existing.length) { res.status(404).json({ error: 'Task not found' }); return }
      await prisma.$executeRaw`DELETE FROM user_tasks WHERE id = ${id}::uuid`
      res.status(204).send()
    } catch (err) {
      console.error('[my-day] DELETE tasks/:id:', err)
      res.status(500).json({ error: 'Failed to delete task' })
    }
  },
)

// ─── Journal ──────────────────────────────────────────────────────────────────

router.get(
  '/journal',
  authenticate,
  [
    query('date').optional().isISO8601(),
    query('recentLimit').optional().isInt({ min: 1, max: 50 }),
    query('recentOffset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    if (validErr(req, res)) return
    try {
      const userId = req.user!.id
      const targetStr = req.query.date
        ? normDateStr(req.query.date as string)
        : toDateStr(new Date())
      const recentLimit = Math.min(Number(req.query.recentLimit) || 10, 50)
      const recentOffset = Math.max(Number(req.query.recentOffset) || 0, 0)

      const [todayRows, recentRows, countRows] = await Promise.all([
        prisma.$queryRaw<JournalRow[]>`
          SELECT * FROM user_journal
          WHERE user_id = ${userId} AND entry_date = ${targetStr}::date
        `,
        prisma.$queryRaw<JournalRow[]>`
          SELECT * FROM user_journal
          WHERE user_id = ${userId} AND entry_date < ${targetStr}::date
          ORDER BY entry_date DESC
          LIMIT ${recentLimit} OFFSET ${recentOffset}
        `,
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint AS count FROM user_journal
          WHERE user_id = ${userId} AND entry_date < ${targetStr}::date
        `,
      ])

      res.json({
        today: todayRows[0] ? serJournal(todayRows[0]) : null,
        recent: recentRows.map(serJournal),
        recentTotal: Number(countRows[0]?.count ?? 0),
      })
    } catch (err) {
      console.error('[my-day] GET journal:', err)
      res.status(500).json({ error: 'Failed to load journal' })
    }
  },
)

router.post(
  '/journal',
  authenticate,
  [
    body('entryDate').isISO8601(),
    body('content').isString(),
    body('projectId').optional({ nullable: true }).isString(),
    body('projectLabel').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    if (validErr(req, res)) return
    try {
      const userId = req.user!.id
      const { entryDate, content, projectId, projectLabel } = req.body
      // Use plain YYYY-MM-DD strings with ::date cast — avoids all JS timezone issues
      const dateStr = normDateStr(entryDate)
      const id = randomUUID()

      await prisma.$executeRaw`
        INSERT INTO user_journal (id, user_id, entry_date, content, project_id, project_label)
        VALUES (${id}::uuid, ${userId}, ${dateStr}::date, ${content}, ${projectId ?? null}, ${projectLabel ?? null})
        ON CONFLICT (user_id, entry_date)
        DO UPDATE SET content = EXCLUDED.content,
                      project_id = EXCLUDED.project_id,
                      project_label = EXCLUDED.project_label,
                      updated_at = now()
      `
      // Fetch back by the same string — guaranteed to match what we just wrote
      const rows = await prisma.$queryRaw<JournalRow[]>`
        SELECT * FROM user_journal
        WHERE user_id = ${userId} AND entry_date = ${dateStr}::date
      `
      if (!rows[0]) {
        res.status(500).json({ error: 'Journal entry not found after save' })
        return
      }
      res.json(serJournal(rows[0]))
    } catch (err) {
      console.error('[my-day] POST journal:', err)
      res.status(500).json({ error: 'Failed to save journal' })
    }
  },
)

// ─── Reminders ────────────────────────────────────────────────────────────────

router.get('/reminders', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id

    const rows = await prisma.$queryRaw<TaskRow[]>`
      SELECT * FROM user_tasks
      WHERE user_id = ${userId}
        AND is_reminder = true
        AND is_done = false
        AND due_date IS NOT NULL
      ORDER BY due_date ASC
    `
    res.json(rows.map(serTask))
  } catch (err) {
    console.error('[my-day] GET reminders:', err)
    res.status(500).json({ error: 'Failed to load reminders' })
  }
})

router.post(
  '/reminders',
  authenticate,
  [
    body('content').isString().trim().notEmpty(),
    body('dueDate').isISO8601(),
    body('projectId').optional({ nullable: true }).isString(),
    body('projectLabel').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    if (validErr(req, res)) return
    try {
      const userId = req.user!.id
      const { content, dueDate, projectId, projectLabel } = req.body
      const id = randomUUID()
      const dueDateStr = normDateStr(dueDate)

      await prisma.$executeRaw`
        INSERT INTO user_tasks (id, user_id, content, is_done, due_date, is_reminder, project_id, project_label, sort_order)
        VALUES (${id}::uuid, ${userId}, ${content.trim()}, false, ${dueDateStr}::date, true, ${projectId ?? null}, ${projectLabel ?? null}, 0)
      `
      const rows = await prisma.$queryRaw<TaskRow[]>`SELECT * FROM user_tasks WHERE id = ${id}::uuid`
      res.status(201).json(serTask(rows[0]!))
    } catch (err) {
      console.error('[my-day] POST reminders:', err)
      res.status(500).json({ error: 'Failed to create reminder' })
    }
  },
)

export default router
