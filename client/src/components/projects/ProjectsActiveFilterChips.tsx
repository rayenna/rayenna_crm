import { memo } from 'react'
import type { ProjectFilterChip } from '../../utils/projectFilterChips'

type ProjectsActiveFilterChipsProps = {
  chips: ProjectFilterChip[]
  showExportHint?: boolean
}

const ProjectsActiveFilterChips = memo(({ chips, showExportHint }: ProjectsActiveFilterChipsProps) => {
  if (chips.length === 0) return null

  return (
    <div
      className="mb-3 rounded-xl border border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--accent-gold-muted) 35%, var(--bg-card))] px-3 py-2.5"
      role="region"
      aria-label="Active project filters"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Active filters
        </span>
        {showExportHint ? (
          <span
            className="text-[11px] font-medium text-[color:var(--accent-gold)]"
            title="Excel and CSV export apply the same filters and search as this list"
          >
            Excel/CSV export uses these filters
          </span>
        ) : null}
      </div>
      <ul className="flex list-none flex-wrap gap-2 p-0 m-0">
        {chips.map((chip) => (
          <li key={chip.id}>
            <button
              type="button"
              onClick={chip.onRemove}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--bg-card)] px-2.5 py-1 text-left text-xs font-semibold text-[color:var(--text-primary)] shadow-sm transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]"
              title={`Remove filter: ${chip.label}`}
            >
              <span className="truncate">{chip.label}</span>
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]"
                aria-hidden
              >
                ×
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
})

ProjectsActiveFilterChips.displayName = 'ProjectsActiveFilterChips'

export default ProjectsActiveFilterChips
