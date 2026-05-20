import { useState, useRef, useEffect } from 'react'
import type { Task } from '../types'
import ProjectPinBadge from './ProjectPinBadge'

interface Props {
  task: Task
  onToggle: (id: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
}

export default function TaskItem({ task, onToggle, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.content)
  const menuRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setEditText(task.content)
  }, [task.content, editing])

  useEffect(() => {
    if (editing) editRef.current?.focus()
  }, [editing])

  const handleMenuBlur = (e: React.FocusEvent) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) {
      setMenuOpen(false)
    }
  }

  const commitEdit = () => {
    const trimmed = editText.trim()
    if (!trimmed) {
      setEditText(task.content)
      setEditing(false)
      return
    }
    if (trimmed !== task.content) onEdit(task.id, trimmed)
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditText(task.content)
    setEditing(false)
  }

  return (
    <div
      className="myday-task-item"
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
      <button
        type="button"
        aria-label={task.isDone ? 'Mark incomplete' : 'Mark complete'}
        onClick={() => onToggle(task.id)}
        className="myday-touch-target"
        style={{
          flexShrink: 0,
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginTop: editing ? 0 : -2,
          marginLeft: -4,
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
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={editRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            onBlur={commitEdit}
            style={{
              width: '100%',
              height: 44,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--border-focus)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <>
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
          </>
        )}
      </div>

      {!editing && (
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onBlur={handleMenuBlur}>
          <button
            type="button"
            aria-label="Task options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="myday-touch-target"
            style={{
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
              role="menu"
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
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setEditing(true)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: 44,
                  padding: '10px 14px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(task.id)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: 44,
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
      )}
    </div>
  )
}