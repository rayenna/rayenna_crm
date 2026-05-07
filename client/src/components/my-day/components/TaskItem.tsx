import { useState, useRef } from 'react'
import type { Task } from '../types'
import ProjectPinBadge from './ProjectPinBadge'

interface Props {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  const handleMenuBlur = (e: React.FocusEvent) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) {
      setMenuOpen(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid var(--border-default)',
        opacity: task.isDone ? 0.5 : 1,
        transition: 'opacity 200ms',
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        aria-label={task.isDone ? 'Mark incomplete' : 'Mark complete'}
        onClick={() => onToggle(task.id)}
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginTop: -10,
          marginLeft: -11,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: `1.5px solid ${task.isDone ? 'var(--accent-teal)' : 'var(--border-strong)'}`,
            background: task.isDone ? 'var(--accent-teal)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 200ms, border-color 200ms',
          }}
        >
          {task.isDone && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            textDecoration: task.isDone ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}
        >
          {task.content}
        </span>
        {task.projectLabel && (
          <div style={{ marginTop: 4 }}>
            <ProjectPinBadge label={task.projectLabel} />
          </div>
        )}
      </div>

      {/* Menu */}
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onBlur={handleMenuBlur}>
        <button
          type="button"
          aria-label="Task options"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: 'none',
            background: menuOpen ? 'var(--bg-card-hover)' : 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ···
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 4,
              background: 'var(--bg-dropdown)',
              border: '1px solid var(--border-default)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 10,
              minWidth: 120,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(task.id) }}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 14px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                color: 'var(--accent-red)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
