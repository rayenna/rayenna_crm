import type { Reminder } from '../types'
import ProjectPinBadge from './ProjectPinBadge'

interface Props {
  reminder: Reminder
  onDelete: (id: string) => void
}

function getDueBadgeColors(dueDate: string | null): { bg: string; text: string; border: string } {
  if (!dueDate) return { bg: 'var(--accent-teal-muted)', text: 'var(--accent-teal)', border: 'var(--accent-teal-border)' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diffDays <= 0) {
    return { bg: 'var(--accent-gold-muted)', text: 'var(--accent-gold)', border: 'var(--accent-gold-border)' }
  }
  if (diffDays <= 7) {
    return { bg: 'var(--accent-blue-muted)', text: 'var(--accent-blue)', border: 'var(--accent-blue-border)' }
  }
  return { bg: 'var(--accent-teal-muted)', text: 'var(--accent-teal)', border: 'var(--accent-teal-border)' }
}

function formatDateBadge(dueDate: string): { month: string; day: string } {
  const d = new Date(dueDate + 'T00:00:00')
  return {
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    day: d.getDate().toString(),
  }
}

export default function ReminderItem({ reminder, onDelete }: Props) {
  const colors = getDueBadgeColors(reminder.dueDate)
  const badge = reminder.dueDate ? formatDateBadge(reminder.dueDate) : null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid var(--border-default)',
        opacity: reminder.isDone ? 0.45 : 1,
      }}
    >
      {/* Date badge */}
      <div
        style={{
          flexShrink: 0,
          width: 40,
          borderRadius: 8,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
          padding: '4px 2px',
        }}
      >
        {badge ? (
          <>
            <div style={{ fontSize: 9, fontFamily: '"Space Mono", monospace', fontWeight: 700, color: colors.text, lineHeight: 1 }}>{badge.month}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, lineHeight: 1.1 }}>{badge.day}</div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: colors.text }}>–</div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            textDecoration: reminder.isDone ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}
        >
          {reminder.content}
        </span>
        {reminder.projectLabel && (
          <div style={{ marginTop: 4 }}>
            <ProjectPinBadge label={reminder.projectLabel} />
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        aria-label="Delete reminder"
        onClick={() => onDelete(reminder.id)}
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 16,
        }}
      >
        ×
      </button>
    </div>
  )
}
