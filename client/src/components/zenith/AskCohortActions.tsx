import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { createTask, MY_DAY_TASKS_QUERY_KEY } from '../../lib/my-day-api'
import { recordMyDayUsage } from '../../lib/myDayHabits'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import type { ZenithNlTableRow } from '../../types/zenithNlQuery'

const COHORT_CTA_METRICS = new Set([
  'who_to_call',
  'pipeline_health',
  'unpaid_invoices',
  'outstanding_balance',
  'subsidy_chase_pack',
  'guided_playbook',
])

function cell(row: ZenithNlTableRow, key: string): string {
  const v = row[key]
  return v == null ? '' : String(v)
}

function projectIdFromRow(row: ZenithNlTableRow): string {
  return cell(row, 'projectId').trim()
}

function taskContentForRow(row: ZenithNlTableRow, metric?: string): string {
  const who = cell(row, 'customerName') || cell(row, 'customer') || cell(row, 'who')
  const slNo = cell(row, 'slNo') || cell(row, 'sl')
  const why = cell(row, 'why')
  const label = slNo ? `SL ${slNo}${who ? ` · ${who}` : ''}` : who || 'project'
  if (metric === 'who_to_call' || why) {
    return why ? `Call ${who || 'customer'}: ${why}` : `Call ${label}`
  }
  if (metric === 'unpaid_invoices' || metric === 'outstanding_balance') {
    return `Follow up payment · ${label}`
  }
  return `Follow up ${label}`
}

type Props = {
  metric?: string
  rows: ZenithNlTableRow[]
  projectsHref?: string | null
  onNavigateAway?: () => void
}

/** Primary cohort CTAs after who-to-call / stall / unpaid style answers. */
export default function AskCohortActions({
  metric,
  rows,
  projectsHref,
  onNavigateAway,
}: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  if (!metric || !COHORT_CTA_METRICS.has(metric)) return null

  const projectRows = rows.filter((r) => projectIdFromRow(r))
  const uniqueIds = [...new Set(projectRows.map((r) => projectIdFromRow(r)))]
  if (uniqueIds.length === 0) return null

  const openHref =
    projectsHref && projectsHref.startsWith('/projects')
      ? projectsHref
      : uniqueIds.length === 1
        ? `/projects/${uniqueIds[0]}`
        : null

  const addAllToMyDay = async () => {
    if (busy) return
    setBusy(true)
    let added = 0
    let existed = 0
    try {
      for (const row of projectRows) {
        const projectId = projectIdFromRow(row)
        if (!projectId) continue
        const who = cell(row, 'customerName') || cell(row, 'customer') || cell(row, 'who')
        const slNo = cell(row, 'slNo') || cell(row, 'sl')
        const label = slNo ? `SL ${slNo}${who ? ` · ${who}` : ''}` : who || 'project'
        const result = await createTask({
          content: taskContentForRow(row, metric),
          projectId,
          projectLabel: label,
        })
        if (result.alreadyExists) existed += 1
        else added += 1
      }
      void queryClient.invalidateQueries({ queryKey: MY_DAY_TASKS_QUERY_KEY })
      if (user?.id && added > 0) recordMyDayUsage(user.id, 'pin_hit_list')
      if (added > 0 && existed > 0) {
        toast.success(`Added ${added} to My Day (${existed} already there)`)
      } else if (added > 0) {
        toast.success(`Added ${added} to My Day`)
      } else {
        toast.success('Already in My Day')
      }
    } catch (err: unknown) {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not add to My Day')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="zenith-ask-cohort-actions" role="group" aria-label="Act on this list">
      <button
        type="button"
        className="zenith-ask-cohort-actions__primary"
        disabled={busy}
        onClick={() => void addAllToMyDay()}
      >
        {busy ? 'Adding…' : `Add all to My Day (${uniqueIds.length})`}
      </button>
      {openHref ? (
        <Link
          to={openHref}
          className="zenith-ask-cohort-actions__secondary"
          onClick={() => onNavigateAway?.()}
        >
          Open these {uniqueIds.length} project{uniqueIds.length === 1 ? '' : 's'} →
        </Link>
      ) : null}
    </div>
  )
}

export function askMetricSupportsCohortCta(metric?: string): boolean {
  return Boolean(metric && COHORT_CTA_METRICS.has(metric))
}
