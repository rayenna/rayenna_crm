import { useState, useEffect } from 'react'
import type { JournalEntry as JournalEntryType, PinOption } from '../types'
import JournalEntryComp from '../components/JournalEntry'

interface Props {
  journalToday: JournalEntryType | null
  journalRecent: JournalEntryType[]
  loading: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  onSave: (content: string, projectId?: string | null, projectLabel?: string | null) => void
  onFlush: () => void
  pinOptions: PinOption[]
}

const VISIBLE_COUNT = 10

export default function JournalTab({ journalToday, journalRecent, loading, saveState, onSave, onFlush, pinOptions }: Props) {
  const [text, setText] = useState(journalToday?.content ?? '')
  const [projectId, setProjectId] = useState(journalToday?.projectId ?? '')
  const [showMore, setShowMore] = useState(false)

  // Sync textarea when today's entry loads from server
  useEffect(() => {
    if (journalToday) {
      setText(journalToday.content)
      setProjectId(journalToday.projectId ?? '')
    }
  }, [journalToday?.id])

  // Flush pending save when tab unmounts
  useEffect(() => {
    return () => { onFlush() }
  }, [onFlush])

  const handleChange = (val: string) => {
    setText(val)
    const selected = pinOptions.find((p) => p.id === projectId)
    onSave(val, selected?.id ?? null, selected?.label ?? null)
  }

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId)
    const selected = pinOptions.find((p) => p.id === newProjectId)
    onSave(text, selected?.id ?? null, selected?.label ?? null)
  }

  const today = new Date()
  const todayLabel = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const visibleRecent = showMore ? journalRecent : journalRecent.slice(0, VISIBLE_COUNT)

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '0 16px 16px' }}>
      {/* Today header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 8px' }}>
        <span
          style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          Today — {todayLabel}
        </span>
        <span
          style={{
            fontSize: 11,
            color:
              saveState === 'saved'  ? 'var(--accent-teal)'  :
              saveState === 'saving' ? 'var(--text-muted)'   :
              saveState === 'error'  ? 'var(--accent-red)'   : 'transparent',
          }}
        >
          {saveState === 'saved'  && 'Saved ✓'}
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'error'  && (
            <button
              type="button"
              onClick={() => onSave(text, projectId || null, pinOptions.find(p=>p.id===projectId)?.label ?? null)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11, padding: 0 }}
            >
              Failed to save — tap to retry
            </button>
          )}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="What's on your mind today?"
        rows={5}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 10,
          border: '1px solid var(--border-input)',
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          fontSize: 16,   // prevents iOS zoom
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      {/* Project pin */}
      {pinOptions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <select
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            style={{
              width: '100%',
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
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '20px 0 0',
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
        <span
          style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          Earlier
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
      </div>

      {loading && (
        <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && journalRecent.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }}>
          No earlier entries yet.
        </p>
      )}

      {visibleRecent.map((entry) => (
        <JournalEntryComp key={entry.id} entry={entry} />
      ))}

      {journalRecent.length > VISIBLE_COUNT && !showMore && (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 0',
            background: 'none',
            border: 'none',
            color: 'var(--accent-gold)',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Load more
        </button>
      )}
    </div>
  )
}
