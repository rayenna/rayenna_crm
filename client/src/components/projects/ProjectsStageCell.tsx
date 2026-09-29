import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../../types'
import { evaluateDataSense } from '../../utils/dataSense'
import { ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'
import { projectStatusStagePillClass } from '../zenith/zenithDealCardUi'

type PeStatus = 'not-started' | 'draft' | 'proposal-ready'

type ExtraBadge = {
  key: string
  shortLabel: string
  fullLabel: string
  title: string
  className: string
  /** Prefer keeping this visible beside stage when multiple extras exist. */
  pinVisible?: boolean
}

type Props = {
  project: Project
  peStatus?: PeStatus
}

function buildExtras(project: Project, peStatus?: PeStatus): ExtraBadge[] {
  const extras: ExtraBadge[] = []
  const sense = evaluateDataSense(project)
  if (sense.length) {
    const critical = sense.some((f) => f.severity === 'critical')
    extras.push({
      key: 'review',
      shortLabel: 'Review',
      fullLabel: 'Needs review',
      title: sense.map((f) => f.title).join(' · '),
      pinVisible: true,
      className: critical
        ? 'border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
        : 'border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]',
    })
  }
  if (peStatus === 'not-started') {
    extras.push({
      key: 'pe-none',
      shortLabel: 'PE',
      fullLabel: 'PE not created',
      title: 'Proposal Engine — not yet created',
      className:
        'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)]',
    })
  } else if (peStatus === 'draft') {
    extras.push({
      key: 'pe-draft',
      shortLabel: 'PE',
      fullLabel: 'PE Draft',
      title: 'Proposal Engine — draft',
      className:
        'border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]',
    })
  } else if (peStatus === 'proposal-ready') {
    extras.push({
      key: 'pe-ready',
      shortLabel: 'PE',
      fullLabel: 'PE Ready',
      title: 'Proposal Engine — proposal ready',
      className:
        'border border-emerald-400/35 bg-emerald-500/10 text-[color:var(--accent-teal)]',
    })
  }
  return extras
}

const MENU_MIN_W = 176
const GUTTER = 12
const TOOLTIP_Z = 3000

/**
 * Stage column: one primary stage pill; Review stays visible when present;
 * remaining PE (and extra) badges collapse into a +N control.
 * Overflow menu is portaled so table rows / overflow-x do not clip it.
 */
export default function ProjectsStageCell({ project, peStatus }: Props) {
  const extras = buildExtras(project, peStatus)
  const [menuOpen, setMenuOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const pinned = extras.find((e) => e.pinVisible)
  const overflow = pinned ? extras.filter((e) => e.key !== pinned.key) : extras.length > 1 ? extras.slice(1) : []
  const singleLoose = !pinned && extras.length === 1 ? extras[0] : null
  const visibleExtra = pinned ?? singleLoose

  useEffect(() => {
    const dismissFloating = () => setMenuOpen(false)
    window.addEventListener(ZENITH_FLOATING_DISMISS_EVENT, dismissFloating)
    return () => window.removeEventListener(ZENITH_FLOATING_DISMISS_EVENT, dismissFloating)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: Event) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', close, true)
    document.addEventListener('touchstart', close, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close, true)
      document.removeEventListener('touchstart', close, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useLayoutEffect(() => {
    if (!menuOpen) {
      setPos(null)
      return
    }

    const compute = () => {
      const el = buttonRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const menu = menuRef.current
      const menuW = Math.max(MENU_MIN_W, menu?.offsetWidth ?? MENU_MIN_W)
      const menuH = menu?.offsetHeight ?? overflow.length * 36 + 20
      let left = r.left
      left = Math.max(GUTTER, Math.min(window.innerWidth - GUTTER - menuW, left))
      const spaceBelow = window.innerHeight - r.bottom
      const place: 'above' | 'below' = spaceBelow < menuH + 10 && r.top > menuH + 16 ? 'above' : 'below'
      const top =
        place === 'above'
          ? Math.max(GUTTER, r.top - 8 - menuH)
          : Math.min(window.innerHeight - GUTTER - menuH, r.bottom + 8)
      setPos({ left, top, place })
    }

    compute()
    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        compute()
      })
    }
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [menuOpen, overflow.length])

  const menuNode =
    menuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="list"
            aria-label="More stage badges"
            style={{
              position: 'fixed',
              left: pos ? `${pos.left}px` : '-9999px',
              top: pos ? `${pos.top}px` : '0',
              visibility: pos ? 'visible' : 'hidden',
              zIndex: TOOLTIP_Z,
              minWidth: MENU_MIN_W,
            }}
            className="rounded-lg border border-[color:var(--border-card)] bg-[color:var(--bg-tooltip)] p-1.5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {overflow.map((e) => (
              <div
                key={e.key}
                role="listitem"
                title={e.title}
                className={`mb-1 last:mb-0 rounded px-2 py-1.5 text-[11px] font-semibold leading-snug ${e.className}`}
              >
                {e.fullLabel}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        title={project.projectStatus.replace(/_/g, ' ')}
        className={`inline-flex max-w-[10rem] items-center truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight lg:max-w-[11rem] lg:text-[11px] ${projectStatusStagePillClass(project.projectStatus)}`}
      >
        {project.projectStatus.replace(/_/g, ' ')}
      </span>

      {visibleExtra ? (
        <span
          title={visibleExtra.title}
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold lg:text-[10px] ${visibleExtra.className}`}
        >
          {visibleExtra.fullLabel}
        </span>
      ) : null}

      {overflow.length > 0 ? (
        <>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex min-h-7 min-w-7 items-center justify-center rounded border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--text-secondary)] touch-manipulation hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] lg:min-h-0 lg:min-w-0 lg:text-[10px]"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-controls={menuId}
            title={overflow.map((e) => e.fullLabel).join(' · ')}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setMenuOpen((v) => !v)
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            +{overflow.length}
          </button>
          {menuNode}
        </>
      ) : null}
    </div>
  )
}
