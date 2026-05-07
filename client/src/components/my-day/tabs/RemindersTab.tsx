import { useState } from 'react'
import type { Reminder, PinOption } from '../types'
import ReminderItem from '../components/ReminderItem'

interface Props {
  reminders: Reminder[]
  loading: boolean
  onDelete: (id: string) => void
  onAdd: (content: string, dueDate: string, projectId?: string | null, projectLabel?: string | null) => void
  pinOptions: PinOption[]
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: '"Space Mono", monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.25)',
  padding: '12px 0 6px',
  display: 'block',
}

function groupReminders(reminders: Reminder[]) {
  const today = new Date(); today.setHours(0,0,0,0)
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)

  const overdue:   Reminder[] = []
  const todayList: Reminder[] = []
  const thisWeek:  Reminder[] = []
  const later:     Reminder[] = []

  reminders.forEach((r) => {
    if (!r.dueDate || r.isDone) return
    const d = new Date(r.dueDate + 'T00:00:00')
    if (d < today)           overdue.push(r)
    else if (d.getTime() === today.getTime()) todayList.push(r)
    else if (d < nextWeek)   thisWeek.push(r)
    else                     later.push(r)
  })

  return { overdue, todayList, thisWeek, later }
}

export default function RemindersTab({ reminders, loading, onDelete, onAdd, pinOptions }: Props) {
  const [content, setContent] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [addError, setAddError] = useState('')

  const { overdue, todayList, thisWeek, later } = groupReminders(reminders)
  const hasAny = overdue.length + todayList.length + thisWeek.length + later.length > 0

  const handleAdd = () => {
    const trimmed = content.trim()
    if (!trimmed) { setAddError('Enter a reminder text'); return }
    if (!dueDate) { setAddError('Pick a date'); return }
    setAddError('')
    const selected = pinOptions.find((p) => p.id === projectId)
    onAdd(trimmed, dueDate, selected?.id ?? null, selected?.label ?? null)
    setContent('')
    setDueDate('')
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {loading && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        )}

        {!loading && !hasAny && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.6 }}>
            No upcoming reminders.
          </p>
        )}

        {overdue.length > 0 && (
          <>
            <span style={{ ...SECTION_LABEL, color: 'var(--accent-gold)' }}>Overdue</span>
            {overdue.map((r) => <ReminderItem key={r.id} reminder={r} onDelete={onDelete} />)}
          </>
        )}

        {todayList.length > 0 && (
          <>
            <span style={SECTION_LABEL}>Today</span>
            {todayList.map((r) => <ReminderItem key={r.id} reminder={r} onDelete={onDelete} />)}
          </>
        )}

        {thisWeek.length > 0 && (
          <>
            <span style={SECTION_LABEL}>This Week</span>
            {thisWeek.map((r) => <ReminderItem key={r.id} reminder={r} onDelete={onDelete} />)}
          </>
        )}

        {later.length > 0 && (
          <>
            <span style={SECTION_LABEL}>Later</span>
            {later.map((r) => <ReminderItem key={r.id} reminder={r} onDelete={onDelete} />)}
          </>
        )}
      </div>

      {/* Add reminder form */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--bg-drawer)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            placeholder="Reminder text…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{
              height: 44,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border-input)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 16,
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              min={today}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                flex: 1,
                height: 44,
                padding: '0 10px',
                borderRadius: 10,
                border: '1px solid var(--border-input)',
                background: 'var(--bg-input)',
                color: dueDate ? 'var(--text-primary)' : 'var(--text-placeholder)',
                fontSize: 14,
                outline: 'none',
                colorScheme: 'dark',
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              style={{
                flexShrink: 0,
                height: 44,
                padding: '0 16px',
                borderRadius: 10,
                background: 'var(--accent-gold)',
                color: 'var(--text-inverse)',
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>

          {pinOptions.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                height: 40,
                padding: '0 10px',
                borderRadius: 10,
                border: '1px solid var(--border-input)',
                background: 'var(--bg-input)',
                color: projectId ? 'var(--text-primary)' : 'var(--text-placeholder)',
                fontSize: 14,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">Pin to project (optional)</option>
              {pinOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          )}

          {addError && (
            <p style={{ fontSize: 12, color: 'var(--accent-red)', margin: 0 }}>{addError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
