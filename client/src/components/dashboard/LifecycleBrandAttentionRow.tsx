import { Link } from 'react-router-dom'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import {
  lifecycleBrandMissingKind,
  lifecycleBrandMissingLabel,
  myDayTaskContentForLifecycleGap,
  projectDisplayLabel,
} from '../../utils/zenithBriefingMissingBrands'
import AddToMyDayButton from '../my-day/components/AddToMyDayButton'

interface Props {
  project: ZenithExplorerProject
  compact?: boolean
}

export default function LifecycleBrandAttentionRow({ project, compact = false }: Props) {
  const missingKind = lifecycleBrandMissingKind(project)
  const label = projectDisplayLabel(project)
  const taskContent = myDayTaskContentForLifecycleGap(project)
  const stage = project.stageLabel || project.projectStatus.replace(/_/g, ' ')

  return (
    <li
      className={[
        'flex flex-col gap-1.5 border-t border-[color:var(--border-default)] first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2',
        compact ? 'px-2.5 py-2 sm:px-3' : 'px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/projects/${project.id}`}
            className={[
              'font-semibold text-[color:var(--text-primary)] underline decoration-[color:color-mix(in_srgb,var(--accent-teal)_35%,transparent)] underline-offset-2 transition hover:text-[color:var(--accent-teal)]',
              compact ? 'text-[12px]' : 'text-sm',
            ].join(' ')}
          >
            {label}
          </Link>
          {!compact ? (
            <span className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              {stage}
            </span>
          ) : null}
          <span className="rounded-md border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-1.5 py-0.5 text-[9px] font-bold text-[color:var(--accent-gold)]">
            {compact ? lifecycleBrandMissingLabel(missingKind) : `Missing: ${lifecycleBrandMissingLabel(missingKind)}`}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        <AddToMyDayButton
          compact
          usageEvent="pin_suggestion"
          content={taskContent}
          projectId={project.id}
          projectLabel={label}
        />
        <Link
          to={`/projects/${project.id}`}
          className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[color:var(--border-default)] px-2.5 text-[11px] font-bold text-[color:var(--accent-teal)] transition hover:border-[color:var(--accent-teal-border)] hover:bg-[color:var(--accent-teal-muted)]"
        >
          Open →
        </Link>
      </div>
    </li>
  )
}
