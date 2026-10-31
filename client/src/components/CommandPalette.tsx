import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  CornerDownLeft,
  FileText,
  FolderKanban,
  Hammer,
  LayoutDashboard,
  Lightbulb,
  ListFilter,
  Binoculars,
  MessageSquarePlus,
  MessageSquareText,
  Plus,
  Search,
  Sparkles,
  Sun,
  Ticket,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useModalEscape } from '../contexts/ModalEscapeContext'
import { openZenithAskDock } from '../utils/zenithAskOpen'
import { ZENITH_NARROW_MQ } from '../hooks/useZenithNarrowLayout'
import { openProposalEngine } from '../lib/openProposalEngine'
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

const GROUP_META: Record<
  CommandPaletteGroup,
  { blurb: string; Icon: LucideIcon; tone: 'create' | 'goto' | 'search' | 'lists' }
> = {
  Create: { blurb: 'Start something new', Icon: Plus, tone: 'create' },
  'Go to': { blurb: 'Jump to a page', Icon: LayoutDashboard, tone: 'goto' },
  Search: { blurb: 'Find people & projects', Icon: Search, tone: 'search' },
  Lists: { blurb: 'Open a filtered queue', Icon: ListFilter, tone: 'lists' },
}

const ITEM_ICONS: Record<string, LucideIcon> = {
  new_customer: UserPlus,
  new_project: FolderKanban,
  create_support_ticket: MessageSquarePlus,
  new_user: Users,
  open_my_day: Sun,
  open_my_day_journal: BookOpen,
  show_tip: Lightbulb,
  overdue_support_tickets: Ticket,
  open_support_tickets: ClipboardList,
  solar_hub_tickets: Wrench,
  proposal_projects: FileText,
  confirmed_projects: CheckCircle2,
  under_installation: Hammer,
  pending_subsidy: Banknote,
  availing_loan: Building2,
  ask_zenith: MessageSquareText,
  ask_zenith_query: MessageSquareText,
  go_zenith: Binoculars,
  go_proposal_engine: FileText,
  go_dashboard: LayoutDashboard,
  go_customers: Users,
  go_projects: FolderKanban,
  go_support_tickets: Ticket,
  go_help: CircleHelp,
  go_users: Users,
  go_solar_hub: Sun,
  search_customers: Users,
  search_projects: FolderKanban,
  pe_not_started: FileText,
  pe_draft: FileText,
  pe_ready: CheckCircle2,
  data_sense_review: CircleHelp,
}

function iconForItem(item: CommandPaletteItem): LucideIcon {
  if (ITEM_ICONS[item.id]) return ITEM_ICONS[item.id]!
  return GROUP_META[item.group].Icon
}

function groupItems(items: CommandPaletteItem[]): { group: CommandPaletteGroup; items: CommandPaletteItem[] }[] {
  return COMMAND_PALETTE_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0)
}

function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
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
  const modKey = isApplePlatform() ? '⌘' : 'Ctrl'

  const items = useMemo(
    () => filterCommandPaletteItems(user?.role, query),
    [user?.role, query],
  )
  const grouped = useMemo(() => groupItems(items), [items])
  const flat = items
  const activeItem = flat[activeIndex] ?? null

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
    if (resolved.type === 'open_proposal_engine') {
      void openProposalEngine()
      return
    }
    if (item.id === 'ask_zenith' || item.id === 'ask_zenith_query') {
      const onZenith = location.pathname.startsWith('/zenith')
      const narrow = window.matchMedia(ZENITH_NARROW_MQ).matches
      if (!(onZenith && narrow)) {
        openZenithAskDock({
          question: item.id === 'ask_zenith_query' ? query.trim() : undefined,
          run: item.id === 'ask_zenith_query' && Boolean(query.trim()),
          focus: true,
        })
        return
      }
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
        <header className="command-palette__hero">
          <div className="command-palette__hero-copy">
            <p className="command-palette__eyebrow">
              <Sparkles className="command-palette__eyebrow-icon" aria-hidden />
              Command palette
            </p>
            <h2 className="command-palette__title">Where do you want to go?</h2>
          </div>
          <span className="command-palette__shortcut-pill" title="Keyboard shortcut">
            <kbd>{modKey}</kbd>
            <kbd>K</kbd>
          </span>
        </header>

        <div className="command-palette__search">
          <Search className="command-palette__search-icon" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            className="command-palette__input"
            placeholder="Type a command, customer, or project…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-controls="command-palette-list"
          />
          {query ? (
            <button
              type="button"
              className="command-palette__clear"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            className="command-palette__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <div
          id="command-palette-list"
          ref={listRef}
          className="command-palette__list"
          role="listbox"
          aria-label="Commands"
        >
          {flat.length === 0 ? (
            <div className="command-palette__empty">
              <Search className="command-palette__empty-icon" aria-hidden />
              <p className="command-palette__empty-title">No matches for “{query.trim()}”</p>
              <p className="command-palette__empty-hint">
                Try a name, “new customer”, “Zenith”, or a ticket queue.
              </p>
            </div>
          ) : (
            grouped.map(({ group, items: groupItems }) => {
              const meta = GROUP_META[group]
              const GroupIcon = meta.Icon
              return (
                <section
                  key={group}
                  className={`command-palette__group command-palette__group--${meta.tone}`}
                  aria-label={group}
                >
                  <div className="command-palette__group-head">
                    <span className="command-palette__group-badge" aria-hidden>
                      <GroupIcon size={12} strokeWidth={2.4} />
                    </span>
                    <div className="command-palette__group-text">
                      <p className="command-palette__group-label">{group}</p>
                      <p className="command-palette__group-blurb">{meta.blurb}</p>
                    </div>
                    <span className="command-palette__group-count">{groupItems.length}</span>
                  </div>
                  {groupItems.map((item) => {
                    const index = runningIndex++
                    const active = index === activeIndex
                    const ItemIcon = iconForItem(item)
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
                        <span className="command-palette__item-icon" aria-hidden>
                          <ItemIcon size={16} strokeWidth={2.1} />
                        </span>
                        <span className="command-palette__item-main">
                          <span className="command-palette__item-label">{item.label}</span>
                          {item.dynamic ? (
                            <span className="command-palette__item-sub">Uses your search text</span>
                          ) : null}
                        </span>
                        <span className="command-palette__item-hint" aria-hidden>
                          <CornerDownLeft size={13} strokeWidth={2.2} />
                        </span>
                      </button>
                    )
                  })}
                </section>
              )
            })
          )}
        </div>

        <footer className="command-palette__footer">
          <div className="command-palette__footer-keys">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <span className="command-palette__footer-label">move</span>
            </span>
            <span>
              <kbd>Enter</kbd>
              <span className="command-palette__footer-label">open</span>
            </span>
            <span>
              <kbd>Esc</kbd>
              <span className="command-palette__footer-label">close</span>
            </span>
          </div>
          {activeItem ? (
            <p className="command-palette__footer-active" title={activeItem.label}>
              <span className="command-palette__footer-active-label">Selected</span>
              <span className="command-palette__footer-active-value">{activeItem.label}</span>
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
