import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useModalEscape } from '../contexts/ModalEscapeContext'
import { useAuth } from '../contexts/AuthContext'
import { useMyDayContext } from '../contexts/MyDayContext'
import {
  COMMAND_PALETTE_GROUP_ORDER,
  filterCommandPaletteItems,
  resolveCommandRun,
  type CommandPaletteGroup,
  type CommandPaletteItem,
} from '../constants/commandPaletteActions'

type Props = {
  open: boolean
  onClose: () => void
}

function groupItems(items: CommandPaletteItem[]): { group: CommandPaletteGroup; items: CommandPaletteItem[] }[] {
  return COMMAND_PALETTE_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0)
}

export default function CommandPalette({ open, onClose }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { open: openMyDay, openTab } = useMyDayContext()
  useModalEscape(open, onClose)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const items = useMemo(
    () => filterCommandPaletteItems(user?.role, query),
    [user?.role, query],
  )
  const grouped = useMemo(() => groupItems(items), [items])
  const flat = items

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-palette-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, flat.length])

  if (!open) return null

  const run = (item: CommandPaletteItem) => {
    const resolved = resolveCommandRun(item, query)
    onClose()
    if (resolved.type === 'my_day') {
      openMyDay()
      return
    }
    if (resolved.type === 'my_day_journal') {
      openTab('journal')
      return
    }
    if (resolved.type === 'show_tip') {
      const params = new URLSearchParams(location.search)
      params.set('showTip', '1')
      navigate({ pathname: location.pathname, search: params.toString() })
      return
    }
    navigate(resolved.href)
  }

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flat.length === 0) return
      setActiveIndex((i) => (i + 1) % flat.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (flat.length === 0) return
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = flat[activeIndex]
      if (item) run(item)
    }
  }

  let runningIndex = 0

  return (
    <div
      className="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        className="command-palette__backdrop"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div className="command-palette__panel">
        <div className="command-palette__search">
          <Search className="command-palette__search-icon" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            className="command-palette__input"
            placeholder="Search commands, customers, projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="command-palette__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <div ref={listRef} className="command-palette__list" role="listbox">
          {flat.length === 0 ? (
            <p className="command-palette__empty">No matching commands</p>
          ) : (
            grouped.map(({ group, items: groupItems }) => (
              <div key={group} className="command-palette__group">
                <p className="command-palette__group-label">{group}</p>
                {groupItems.map((item) => {
                  const index = runningIndex++
                  const active = index === activeIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      data-palette-index={index}
                      className={`command-palette__item${active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => run(item)}
                    >
                      <span className="command-palette__item-label">{item.label}</span>
                      <span className="command-palette__item-hint">↵</span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <p className="command-palette__footer">
          <kbd>↑</kbd>
          <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}
