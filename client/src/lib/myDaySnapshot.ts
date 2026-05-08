import type { JournalEntry, Task } from '../components/my-day/types'

export const MY_DAY_SNAPSHOT_QUERY_KEY = ['my-day-snapshot'] as const

const TEASER_MAX = 5
const TEASER_LEN = 52

function clipTeaser(s: string): string {
  const t = s.trim()
  if (t.length <= TEASER_LEN) return t
  return `${t.slice(0, TEASER_LEN).trimEnd()}…`
}

/** Same buckets as RemindersTab — local calendar midnight semantics. */
export function groupRemindersByDue(reminders: Task[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const overdue: Task[] = []
  const todayList: Task[] = []
  const thisWeek: Task[] = []
  const later: Task[] = []

  reminders.forEach((r) => {
    if (!r.dueDate || r.isDone) return
    const d = new Date(`${r.dueDate}T00:00:00`)
    if (d < today) overdue.push(r)
    else if (d.getTime() === today.getTime()) todayList.push(r)
    else if (d < nextWeek) thisWeek.push(r)
    else later.push(r)
  })

  return { overdue, todayList, thisWeek, later }
}

export interface MyDaySnapshot {
  incompleteTaskCount: number
  carryoverCount: number
  todayPendingTaskCount: number
  remindersOverdueCount: number
  remindersTodayCount: number
  remindersThisWeekCount: number
  remindersLaterCount: number
  journalStarted: boolean
  /** Short fragments for a single summary line, e.g. "2 tasks · 1 reminder today" */
  summaryFragments: string[]
  /** Up to five lines for Zenith briefing */
  teaserLines: string[]
  /** Nothing actionable in tasks or reminders */
  isQuietPersonal: boolean
}

export function buildMyDaySnapshot(
  tasks: Task[],
  reminders: Task[],
  journalToday: JournalEntry | null,
): MyDaySnapshot {
  const todayIso = new Date().toISOString().slice(0, 10)

  const incompleteNonReminder = tasks.filter((t) => !t.isReminder && !t.isDone)
  const incompleteTaskCount = incompleteNonReminder.length

  const carryovers = tasks.filter(
    (t) => !t.isReminder && t.dueDate !== null && t.dueDate < todayIso && !t.isDone,
  )
  const todayTasks = tasks.filter(
    (t) => !t.isReminder && (t.dueDate === todayIso || t.dueDate === null),
  )
  const todayPending = todayTasks.filter((t) => !t.isDone)

  const { overdue, todayList, thisWeek, later } = groupRemindersByDue(reminders)

  const remindersOverdueCount = overdue.length
  const remindersTodayCount = todayList.length
  const remindersThisWeekCount = thisWeek.length
  const remindersLaterCount = later.length

  const pendingReminderTotal =
    remindersOverdueCount + remindersTodayCount + remindersThisWeekCount + remindersLaterCount

  const journalStarted = Boolean(journalToday?.content?.trim())

  const summaryFragments: string[] = []
  if (incompleteTaskCount > 0) {
    summaryFragments.push(`${incompleteTaskCount} open task${incompleteTaskCount === 1 ? '' : 's'}`)
  }
  if (carryovers.length > 0) {
    summaryFragments.push(`${carryovers.length} carry-over${carryovers.length === 1 ? '' : 's'}`)
  }
  if (remindersOverdueCount > 0) {
    summaryFragments.push(
      `${remindersOverdueCount} overdue reminder${remindersOverdueCount === 1 ? '' : 's'}`,
    )
  }
  if (remindersTodayCount > 0) {
    summaryFragments.push(`Reminder${remindersTodayCount === 1 ? '' : 's'} today (${remindersTodayCount})`)
  }
  if (remindersThisWeekCount > 0 && remindersOverdueCount === 0 && remindersTodayCount === 0) {
    summaryFragments.push(`${remindersThisWeekCount} this week`)
  }
  if (journalStarted && summaryFragments.length === 0 && pendingReminderTotal === 0 && incompleteTaskCount === 0) {
    summaryFragments.push('Journal started')
  }

  const teaserLines: string[] = []

  const pushTeasers = (label: string, items: Task[]) => {
    for (const item of items) {
      if (teaserLines.length >= TEASER_MAX) return
      teaserLines.push(`${label} · ${clipTeaser(item.content)}`)
    }
  }

  pushTeasers('Task', carryovers)
  pushTeasers('Task', todayPending)
  pushTeasers('Reminder', overdue)
  pushTeasers('Reminder', todayList)
  pushTeasers('Reminder', thisWeek)

  if (teaserLines.length < TEASER_MAX) {
    pushTeasers('Reminder', later)
  }

  const isQuietPersonal = incompleteTaskCount === 0 && pendingReminderTotal === 0

  return {
    incompleteTaskCount,
    carryoverCount: carryovers.length,
    todayPendingTaskCount: todayPending.length,
    remindersOverdueCount,
    remindersTodayCount,
    remindersThisWeekCount,
    remindersLaterCount,
    journalStarted,
    summaryFragments,
    teaserLines,
    isQuietPersonal,
  }
}
