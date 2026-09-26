import type { ProjectsPresetDef, ProjectsPresetId } from '../../utils/projectsListPresets'

type ProjectsQuickPresetsProps = {
  presets: ProjectsPresetDef[]
  activeId: ProjectsPresetId | null
  onSelect: (id: ProjectsPresetId) => void
}

export default function ProjectsQuickPresets({
  presets,
  activeId,
  onSelect,
}: ProjectsQuickPresetsProps) {
  if (presets.length === 0) return null

  return (
    <div
      className="mb-2"
      role="group"
      aria-label="Quick filter presets"
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Quick views
        </span>
        <span className="text-[11px] text-[color:var(--text-secondary)]">
          One tap — replaces pipeline flags
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = activeId === p.id
          return (
            <button
              key={p.id}
              type="button"
              title={p.description}
              onClick={() => onSelect(p.id)}
              className={`inline-flex min-h-[32px] items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors sm:text-xs ${
                active
                  ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent-gold-border)]'
                  : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
