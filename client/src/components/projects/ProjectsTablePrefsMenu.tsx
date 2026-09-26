import { useEffect, useRef, useState } from 'react'
import type { ProjectsOptionalCol, ProjectsTableDensity } from '../../utils/projectsListPrefs'

type ProjectsTablePrefsMenuProps = {
  density: ProjectsTableDensity
  hiddenCols: ProjectsOptionalCol[]
  onDensityChange: (d: ProjectsTableDensity) => void
  onHiddenColsChange: (cols: ProjectsOptionalCol[]) => void
}

const OPTIONAL: Array<{ id: ProjectsOptionalCol; label: string }> = [
  { id: 'segment', label: 'Segment' },
  { id: 'lead', label: 'Lead source' },
  { id: 'confirm', label: 'Confirmation date' },
]

export default function ProjectsTablePrefsMenu({
  density,
  hiddenCols,
  onDensityChange,
  onHiddenColsChange,
}: ProjectsTablePrefsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggleCol = (id: ProjectsOptionalCol) => {
    const next = hiddenCols.includes(id)
      ? hiddenCols.filter((c) => c !== id)
      : [...hiddenCols, id]
    onHiddenColsChange(next)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)]"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Table density and columns"
      >
        Columns
        <svg className="h-3.5 w-3.5 text-[color:var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1.5 w-64 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]"
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Density
          </p>
          <div className="mb-3 flex gap-1 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-0.5">
            {(['comfortable', 'compact'] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="menuitemradio"
                aria-checked={density === d}
                onClick={() => onDensityChange(d)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  density === d
                    ? 'bg-[color:var(--bg-card-hover)] text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent-gold-border)]'
                    : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Optional columns
          </p>
          <ul className="m-0 list-none space-y-1.5 p-0">
            {OPTIONAL.map((col) => {
              const shown = !hiddenCols.includes(col.id)
              return (
                <li key={col.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--bg-table-hover)]">
                    <input
                      type="checkbox"
                      checked={shown}
                      onChange={() => toggleCol(col.id)}
                      className="h-4 w-4 rounded border-[color:var(--border-input)] accent-[color:var(--accent-gold)]"
                    />
                    <span>{col.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
