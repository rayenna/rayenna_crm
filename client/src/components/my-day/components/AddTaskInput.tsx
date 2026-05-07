import { useState, useRef } from 'react'
import type { PinOption } from '../types'

interface Props {
  pinOptions: PinOption[]
  onAdd: (content: string, projectId?: string | null, projectLabel?: string | null) => void
}

export default function AddTaskInput({ pinOptions, onAdd }: Props) {
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    const selected = pinOptions.find((p) => p.id === projectId)
    onAdd(trimmed, selected?.id ?? null, selected?.label ?? null)
    setContent('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div
      style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bg-drawer)',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Mobile: stacked. Desktop 480px+: inline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--accent-gold)', fontSize: 18, lineHeight: 1, flexShrink: 0, userSelect: 'none' }}>+</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a task…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              minWidth: 0,
              height: 44,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border-input)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 16,      // prevents iOS zoom
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={submit}
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
              whiteSpace: 'nowrap',
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
        )}
      </div>
    </div>
  )
}
