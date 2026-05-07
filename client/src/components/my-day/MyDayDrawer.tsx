import { useEffect, useState } from 'react'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { useMyDay } from './hooks/useMyDay'
import TasksTab     from './tabs/TasksTab'
import JournalTab   from './tabs/JournalTab'
import RemindersTab from './tabs/RemindersTab'
import axiosInstance from '../../utils/axios'
import type { PinOption } from './types'

type TabId = 'tasks' | 'journal' | 'reminders'
const TABS: { id: TabId; label: string }[] = [
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
  const { isOpen, close, open, setIncompleteTasks } = useMyDayContext()
  const isDesktop = useIsDesktop()

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try { return (localStorage.getItem(LS_TAB_KEY) as TabId) || 'tasks' } catch { return 'tasks' }
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

  const switchTab = (tab: TabId) => {
    setActiveTab(tab)
    try { localStorage.setItem(LS_TAB_KEY, tab) } catch { /* ignore */ }
  }

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

  const desktopTransform = isOpen ? 'translateX(0)' : `translateX(${PANEL_W}px)`
  const mobileTransform  = isOpen ? 'translateY(0)'  : 'translateY(100%)'

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
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My Day"
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
                transform: desktopTransform,
                boxShadow: '-20px 0 60px rgba(0,0,0,0.55)',
              }
            : {
                inset: 0,
                transform: mobileTransform,
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
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              My Day
            </h2>
            <p style={{ margin: '2px 0 12px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>
              {todayFormatted()}
            </p>
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
            const badgeCount = tab.id === 'tasks' ? incompleteCount : 0
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
                    {badgeCount}
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
      </div>
    </>
  )
}
