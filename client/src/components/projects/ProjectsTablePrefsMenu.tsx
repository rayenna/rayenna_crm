import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  PROJECTS_OPTIONAL_COL_LABELS,
  PROJECTS_OPTIONAL_COLS,
  applyProjectsSlimCols,
  clearProjectsSlimCols,
  isProjectsSlimCols,
  type ProjectsOptionalCol,
  type ProjectsTableDensity,
} from '../../utils/projectsListPrefs'

type ProjectsTablePrefsMenuProps = {
  density: ProjectsTableDensity
  hiddenCols: ProjectsOptionalCol[]
  onDensityChange: (d: ProjectsTableDensity) => void
  onHiddenColsChange: (cols: ProjectsOptionalCol[]) => void
}

type MenuPos = { top: number; left: number; width: number }

const NARROW_MQ = '(max-width: 743px)'

function PrefsBody({
  density,
  hiddenCols,
  onDensityChange,
  onHiddenColsChange,
  listStyle,
}: {
  density: ProjectsTableDensity
  hiddenCols: ProjectsOptionalCol[]
  onDensityChange: (d: ProjectsTableDensity) => void
  onHiddenColsChange: (cols: ProjectsOptionalCol[]) => void
  listStyle?: CSSProperties
}) {
  const slimOn = isProjectsSlimCols(hiddenCols)

  const toggleCol = (id: ProjectsOptionalCol) => {
    const next = hiddenCols.includes(id)
      ? hiddenCols.filter((c) => c !== id)
      : [...hiddenCols, id]
    onHiddenColsChange(next)
  }

  return (
    <>
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
            className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold capitalize transition-colors touch-manipulation ${
              density === d
                ? 'bg-[color:var(--bg-card-hover)] text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent-gold-border)]'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Layout
          </p>
          <p className="text-[10px] leading-snug text-[color:var(--text-secondary)]">
            Slim hides Segment, Lead, Confirm
          </p>
        </div>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={slimOn}
          onClick={() =>
            onHiddenColsChange(
              slimOn ? clearProjectsSlimCols(hiddenCols) : applyProjectsSlimCols(hiddenCols),
            )
          }
          className={`inline-flex min-h-[36px] shrink-0 touch-manipulation items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            slimOn
              ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent-gold-border)]'
              : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]'
          }`}
          title="Hide Segment, Lead source, and Confirmation date for a narrower table"
        >
          Slim
        </button>
      </div>

      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
        Optional columns
      </p>
      <p className="mb-2 text-[10px] leading-snug text-[color:var(--text-secondary)]">
        Project and Stage always stay. Uncheck to hide a column.
      </p>
      <ul
        className="m-0 list-none space-y-0.5 overflow-y-auto overscroll-contain p-0"
        style={listStyle}
      >
        {PROJECTS_OPTIONAL_COLS.map((id) => {
          const shown = !hiddenCols.includes(id)
          return (
            <li key={id}>
              <label className="flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--bg-table-hover)] sm:min-h-[40px]">
                <input
                  type="checkbox"
                  checked={shown}
                  onChange={() => toggleCol(id)}
                  className="h-4 w-4 shrink-0 rounded border-[color:var(--border-input)] accent-[color:var(--accent-gold)]"
                />
                <span>{PROJECTS_OPTIONAL_COL_LABELS[id]}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function ProjectsTablePrefsMenu({
  density,
  hiddenCols,
  onDensityChange,
  onHiddenColsChange,
}: ProjectsTablePrefsMenuProps) {
  const [open, setOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(NARROW_MQ).matches : false,
  )
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(NARROW_MQ)
    const update = () => setIsNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const updatePos = () => {
    const el = buttonRef.current
    if (!el || isNarrow) return
    const r = el.getBoundingClientRect()
    const margin = 8
    const width = Math.min(288, Math.max(240, window.innerWidth - margin * 2))
    let left = r.left
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - width - margin
    }
    if (left < margin) left = margin
    setMenuPos({
      top: Math.min(r.bottom + 6, window.innerHeight - margin - 48),
      left,
      width,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    if (!isNarrow) updatePos()
  }, [open, isNarrow])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => updatePos()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc, { passive: true })
    document.addEventListener('keydown', onKey)
    if (!isNarrow) {
      window.addEventListener('resize', onReposition)
      window.addEventListener('scroll', onReposition, true)
    }
    const prevOverflow = document.body.style.overflow
    if (isNarrow) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
      if (isNarrow) document.body.style.overflow = prevOverflow
    }
  }, [open, isNarrow])

  let portal: ReactNode = null
  if (open && typeof document !== 'undefined') {
    if (isNarrow) {
      portal = createPortal(
        <div className="fixed inset-0 z-[200]" role="presentation">
          <button
            type="button"
            aria-label="Close columns sheet"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Table density and columns"
            className="absolute inset-x-0 bottom-0 max-h-[min(85vh,640px)] overflow-hidden rounded-t-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] shadow-[var(--shadow-dropdown)] ring-1 ring-[color:var(--border-default)]"
          >
            <div className="flex justify-center pb-1 pt-2">
              <span className="h-1 w-10 rounded-full bg-[color:var(--border-strong)]" aria-hidden />
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border-default)] px-4 pb-2">
              <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Columns</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-[40px] touch-manipulation items-center rounded-lg px-3 text-sm font-semibold text-[color:var(--accent-gold)]"
              >
                Done
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <PrefsBody
                density={density}
                hiddenCols={hiddenCols}
                onDensityChange={onDensityChange}
                onHiddenColsChange={onHiddenColsChange}
                listStyle={{ maxHeight: 'min(45vh, 320px)' }}
              />
            </div>
          </div>
        </div>,
        document.body,
      )
    } else if (menuPos) {
      portal = createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[200] rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] p-3 shadow-[var(--shadow-dropdown)] ring-1 ring-[color:var(--border-default)]"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          <PrefsBody
            density={density}
            hiddenCols={hiddenCols}
            onDensityChange={onDensityChange}
            onHiddenColsChange={onHiddenColsChange}
            listStyle={{
              maxHeight: `min(50vh, ${Math.max(160, window.innerHeight - menuPos.top - 120)}px)`,
            }}
          />
        </div>,
        document.body,
      )
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2.5 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] touch-manipulation sm:px-3"
        aria-expanded={open}
        aria-haspopup={isNarrow ? 'dialog' : 'menu'}
        title="Table density and columns"
      >
        Columns
        <svg
          className="h-3.5 w-3.5 text-[color:var(--text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {portal}
    </div>
  )
}
