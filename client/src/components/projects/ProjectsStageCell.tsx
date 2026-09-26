import { useEffect, useId, useRef, useState } from 'react'
import type { Project } from '../../types'
import { evaluateDataSense } from '../../utils/dataSense'
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

/**
 * Stage column: one primary stage pill; Review stays visible when present;
 * remaining PE (and extra) badges collapse into a +N control.
 */
export default function ProjectsStageCell({ project, peStatus }: Props) {
  const extras = buildExtras(project, peStatus)
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const pinned = extras.find((e) => e.pinVisible)
  const overflow = pinned ? extras.filter((e) => e.key !== pinned.key) : extras.length > 1 ? extras.slice(1) : []
  const singleLoose = !pinned && extras.length === 1 ? extras[0] : null
  const visibleExtra = pinned ?? singleLoose

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: Event) => {
      const el = rootRef.current
      const t = e.target
      if (el && t instanceof Node && el.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', close, true)
    document.addEventListener('touchstart', close, true)
    return () => {
      document.removeEventListener('mousedown', close, true)
      document.removeEventListener('touchstart', close, true)
    }
  }, [menuOpen])

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-1">
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
            type="button"
            className="inline-flex items-center rounded border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] lg:text-[10px]"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            title={overflow.map((e) => e.fullLabel).join(' · ')}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
          >
            +{overflow.length}
          </button>
          {menuOpen ? (
            <div
              id={menuId}
              role="list"
              className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-1.5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]"
              onClick={(e) => e.stopPropagation()}
            >
              {overflow.map((e) => (
                <div
                  key={e.key}
                  role="listitem"
                  title={e.title}
                  className={`mb-1 last:mb-0 rounded px-2 py-1 text-[10px] font-semibold ${e.className}`}
                >
                  {e.fullLabel}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
