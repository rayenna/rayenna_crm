import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { useMyDay } from './hooks/useMyDay'
import TasksTab     from './tabs/TasksTab'
import JournalTab   from './tabs/JournalTab'
import RemindersTab from './tabs/RemindersTab'
import axiosInstance from '../../utils/axios'
import type { MyDayTabId, PinOption } from './types'
import { buildMyDaySnapshot, groupRemindersByDue } from '../../lib/myDaySnapshot'

const TABS: { id: MyDayTabId; label: string }[] = [
  { id: 'tasks',     label: 'Tasks'     },
  { id: 'journal',   label: 'Journal'   },
  { id: 'reminders', label: 'Reminders' },
]
const LS_TAB_KEY = 'zenith_myday_last_tab'

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function MyDayDrawer() {
  const { isOpen, close, open, setIncompleteTasks, pendingTabRef } = useMyDayContext()
  const isDesktop = useIsDesktop()

  const [activeTab, setActiveTab] = useState<MyDayTabId>(() => {
    try {
      return (localStorage.getItem(LS_TAB_KEY) as MyDayTabId) || 'tasks'
    } catch {
      return 'tasks'
    }
  })

  const [pinOptions, setPinOptions] = useState<PinOption[]>([])
  const [mounted, setMounted] = useState(false)

  const md = useMyDay()

  // Mount once on first open — never unmount (preserves state in memory)
  useEffect(() => {
    if (isOpen && !mounted) setMounted(true)
  }, [isOpen, mounted])

  // Load data on first mount
  useEffect(() => {
    if (!mounted) return
    md.loadTasks()
    md.loadJournal()
    md.loadReminders()
    // Load projects for pin selector
    axiosInstance
      .get('/api/projects?limit=200&sortField=createdAt&sortOrder=desc')
      .then((res) => {
        const projects = (res.data?.projects ?? []) as Array<{
          id: string
          slNo?: number
          customer?: { name?: string }
        }>
        setPinOptions(
          projects.map((p) => ({
            id: p.id,
            label: p.customer?.name
              ? `#${p.slNo ?? ''} ${p.customer.name}`.trim()
              : p.id,
          })),
        )
      })
      .catch(() => { /* non-critical */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Sync incomplete count to context for nav badge
  useEffect(() => {
    const count = md.tasks.filter((t) => !t.isDone && !t.isReminder).length
    setIncompleteTasks(count)
  }, [md.tasks, setIncompleteTasks])

  const switchTab = useCallback((tab: MyDayTabId) => {
    setActiveTab(tab)
    try { localStorage.setItem(LS_TAB_KEY, tab) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const next = pendingTabRef.current
    if (!next) return
    switchTab(next)
    pendingTabRef.current = null
  }, [isOpen, pendingTabRef, switchTab])

  const headerSnap = useMemo(
    () => buildMyDaySnapshot(md.tasks, md.reminders, md.journalToday),
    [md.tasks, md.reminders, md.journalToday],
  )

  const urgentReminderCount = useMemo(() => {
    const g = groupRemindersByDue(md.reminders)
    return g.overdue.length + g.todayList.length
  }, [md.reminders])

  const dataReady = !md.tasksLoading && !md.remindersLoading && !md.journalLoading

  // Global keyboard shortcut: Cmd/Ctrl + Shift + M
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        if (isOpen) close()
        else open()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, close, open])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, close])

  // Lock body scroll when open on mobile
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!mounted) return null

  const PANEL_W = 420
  const incompleteCount = md.tasks.filter((t) => !t.isDone && !t.isReminder).length

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 6000,
          opacity: isOpen && !isDesktop ? 1 : 0,
          pointerEvents: isOpen && !isDesktop ? 'auto' : 'none',
          transition: 'opacity 240ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="My Day"
        initial={false}
        animate={isDesktop ? { x: isOpen ? 0 : PANEL_W } : { y: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        style={{
          position: 'fixed',
          zIndex: 6001,
          background: 'var(--bg-drawer)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 240ms cubic-bezier(0.4,0,0.2,1)',
          ...(isDesktop
            ? {
                top: 0,
                right: 0,
                bottom: 0,
                width: PANEL_W,
                boxShadow: '-20px 0 60px rgba(0,0,0,0.55)',
              }
            : {
                inset: 0,
              }),
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 0',
            paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
            background: 'var(--bg-modal)',
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              className="myday-drawer-title"
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                fontFamily: "'Syne', sans-serif",
              }}
            >
              My Day
            </h2>
            <p style={{ margin: '4px 0 8px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {todayFormatted()}
            </p>
            <div className="myday-drawer-summary">
              {!dataReady ? (
                <span className="myday-drawer-chip myday-drawer-chip--muted">Loading…</span>
              ) : headerSnap.summaryFragments.length > 0 ? (
                headerSnap.summaryFragments.map((frag) => (
                  <span key={frag} className="myday-drawer-chip">
                    {frag}
                  </span>
                ))
              ) : headerSnap.journalStarted ? (
                <span className="myday-drawer-chip myday-drawer-chip--journal">Journal · today&apos;s note started</span>
              ) : (
                <span className="myday-drawer-chip myday-drawer-chip--muted">Nothing queued — add a task or reminder</span>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close My Day"
            onClick={close}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            background: 'var(--bg-modal)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {TABS.map((tab) => {
            const isCurrent = activeTab === tab.id
            const badgeCount =
              tab.id === 'tasks' ? incompleteCount : tab.id === 'reminders' ? urgentReminderCount : 0
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                onClick={() => switchTab(tab.id)}
                style={{
                  flex: 1,
                  height: 44,
                  background: 'none',
                  border: 'none',
                  borderBottom: isCurrent ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: isCurrent ? 'var(--accent-gold)' : 'var(--text-muted)',
                  fontWeight: isCurrent ? 700 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'color 150ms, border-color 150ms',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {tab.label}
                {badgeCount > 0 && (
                  <span
                    className={
                      tab.id === 'reminders' && urgentReminderCount > 0 ? 'myday-tab-badge--urgent' : undefined
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      borderRadius: 99,
                      background: isCurrent ? 'var(--accent-gold-muted)' : 'var(--bg-badge)',
                      color: isCurrent ? 'var(--accent-gold)' : 'var(--text-muted)',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '0 4px',
                    }}
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab content ────────────────────────────────────────────── */}
        {/* Keep all tabs mounted so state is preserved; show/hide with display */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: activeTab === 'tasks' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <TasksTab
              tasks={md.tasks}
              loading={md.tasksLoading}
              error={md.tasksError}
              onToggle={md.toggleTask}
              onDelete={md.removeTask}
              onAdd={md.addTask}
              pinOptions={pinOptions}
            />
          </div>

          <div style={{ display: activeTab === 'journal' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <JournalTab
              journalToday={md.journalToday}
              journalRecent={md.journalRecent}
              loading={md.journalLoading}
              saveState={md.journalSaveState}
              onSave={md.saveJournal}
              onFlush={md.flushJournalSave}
              pinOptions={pinOptions}
            />
          </div>

          <div style={{ display: activeTab === 'reminders' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <RemindersTab
              reminders={md.reminders}
              loading={md.remindersLoading}
              onDelete={md.removeReminder}
              onAdd={md.addReminder}
              pinOptions={pinOptions}
            />
          </div>
        </div>
      </motion.div>
    </>
  )
}
