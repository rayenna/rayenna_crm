import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react'

export type DealListFilterOption = { value: string; label: string }

export function DealListColHead({
  label,
  align = 'left',
  sortKey,
  activeSortKey,
  sortOrder,
  onSort,
  filter,
}: {
  label: string
  align?: 'left' | 'right'
  sortKey: string
  activeSortKey: string
  sortOrder: 'asc' | 'desc'
  onSort: (key: string, order: 'asc' | 'desc') => void
  filter?: {
    options: DealListFilterOption[]
    selected: string[]
    onChange: (values: string[]) => void
  }
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 })
  const sortedHere = activeSortKey === sortKey
  const filterCount = filter?.selected.length ?? 0

  const close = useCallback(() => setOpen(false), [])

  const updatePos = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const width = Math.min(240, Math.max(200, rect.width + 48))
    let left = align === 'right' ? rect.right - width : rect.left
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8)
    let top = rect.bottom + 6
    const menuH = menuRef.current?.offsetHeight ?? 280
    if (top + menuH > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuH - 6)
    }
    setPos({ top, left, width })
  }, [align])

  useLayoutEffect(() => {
    if (!open) return
    updatePos()
    const raf = requestAnimationFrame(updatePos)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos, filterCount])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const pickSort = (order: 'asc' | 'desc') => {
    onSort(sortKey, order)
    close()
  }

  const toggleValue = (value: string) => {
    if (!filter) return
    filter.onChange(
      filter.selected.includes(value)
        ? filter.selected.filter((v) => v !== value)
        : [...filter.selected, value],
    )
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`group flex w-full min-w-0 items-center gap-1 rounded-md px-0.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)] hover:bg-[color:color-mix(in_srgb,var(--accent-gold)_12%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] sm:text-sm print:hover:bg-transparent ${
          align === 'right' ? 'justify-end' : ''
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${label} — filter and sort`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{label}</span>
        {filterCount > 0 ? (
          <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-gold)] px-1 text-[10px] font-extrabold leading-none text-[color:var(--text-inverse)]">
            {filterCount}
          </span>
        ) : null}
        {sortedHere ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform print:hidden ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[5900] max-h-[min(60vh,22rem)] overflow-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] py-1.5 shadow-xl ring-1 ring-[color:var(--border-default)] backdrop-blur-xl print:hidden"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <p className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                Sort
              </p>
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[color:var(--bg-table-hover)] ${
                  sortedHere && sortOrder === 'asc'
                    ? 'font-semibold text-[color:var(--accent-gold)]'
                    : 'text-[color:var(--text-primary)]'
                }`}
                onClick={() => pickSort('asc')}
              >
                <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Ascending
              </button>
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[color:var(--bg-table-hover)] ${
                  sortedHere && sortOrder === 'desc'
                    ? 'font-semibold text-[color:var(--accent-gold)]'
                    : 'text-[color:var(--text-primary)]'
                }`}
                onClick={() => pickSort('desc')}
              >
                <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Descending
              </button>
              {filter && filter.options.length > 0 ? (
                <>
                  <div className="my-1.5 border-t border-[color:var(--border-default)]" />
                  <div className="flex items-center justify-between px-3 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Filter
                    </p>
                    {filterCount > 0 ? (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[color:var(--accent-gold)]"
                        onClick={() => filter.onChange([])}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  {filter.options.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--bg-table-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={filter.selected.includes(opt.value)}
                        onChange={() => toggleValue(opt.value)}
                        className="rounded border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                      />
                      <span className="min-w-0 truncate">{opt.label}</span>
                    </label>
                  ))}
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
