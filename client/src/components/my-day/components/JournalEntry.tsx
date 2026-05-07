import { useState } from 'react'
import type { JournalEntry as JournalEntryType } from '../types'
import ProjectPinBadge from './ProjectPinBadge'

interface Props {
  entry: JournalEntryType
}

function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export default function JournalEntry({ entry }: Props) {
  const [expanded, setExpanded] = useState(false)

  const lines = entry.content.split('\n')
  const isLong = entry.content.length > 200 || lines.length > 3

  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {formatEntryDate(entry.entryDate)}
        </span>
        {entry.projectLabel && <ProjectPinBadge label={entry.projectLabel} />}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: expanded ? 'unset' : 3,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {entry.content || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No content</span>}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 4,
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--accent-gold)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {expanded ? 'Collapse ▲' : 'Expand ▾'}
        </button>
      )}
    </div>
  )
}
