import { format } from 'date-fns'
import { ProjectStatus } from '../../types'
import type { InstallRow } from './zenithFocusRowTypes'

export const INSTALL_PULSE_NAME_CONFIRMED = 'var(--accent-blue)'
export const INSTALL_PULSE_NAME_UNDER_INSTALLATION = 'var(--accent-gold)'

const INSTALL_PULSE_STAGE_LABEL: Partial<Record<ProjectStatus, string>> = {
  [ProjectStatus.CONFIRMED]: 'Confirmed Order',
  [ProjectStatus.UNDER_INSTALLATION]: 'Under Installation',
}

export function installPulseProjectNameColor(projectStatus: string | undefined): string {
  if (projectStatus === ProjectStatus.CONFIRMED) return INSTALL_PULSE_NAME_CONFIRMED
  if (projectStatus === ProjectStatus.UNDER_INSTALLATION) return INSTALL_PULSE_NAME_UNDER_INSTALLATION
  return 'var(--text-primary)'
}

export function installPulseStageLabel(projectStatus: string | undefined): string {
  if (!projectStatus) return '—'
  const ps = projectStatus as ProjectStatus
  return INSTALL_PULSE_STAGE_LABEL[ps] ?? projectStatus
}

function isInstallDoneStatus(s: string | undefined): boolean {
  if (!s) return false
  return (
    s === ProjectStatus.COMPLETED ||
    s === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
    s === ProjectStatus.COMPLETED_SUBSIDY_CREDITED
  )
}

export function expectedDateBeforeStart(startStr: string | null, expectedStr: string | null): boolean {
  if (!startStr || !expectedStr) return false
  const start = new Date(startStr)
  const expected = new Date(expectedStr)
  if (Number.isNaN(start.getTime()) || Number.isNaN(expected.getTime())) return false
  return expected.getTime() < start.getTime()
}

export function computeInstallProgress(row: InstallRow): number {
  if (isInstallDoneStatus(row.projectStatus)) return 100

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startStr = row.startDate
  const expectedStr = row.expectedCompletion

  if (!startStr) return 0

  const start = new Date(startStr)
  start.setHours(0, 0, 0, 0)

  let target: Date
  if (expectedStr) {
    target = new Date(expectedStr)
    target.setHours(0, 0, 0, 0)
  } else {
    target = new Date(start)
    target.setDate(target.getDate() + 45)
  }

  if (start > today) return 0
  if (target < start) return 0

  const totalDays = Math.max(1, (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.max(0, (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const pct = Math.round((elapsedDays / totalDays) * 100)
  return Math.min(pct, 100)
}

export function installTimelineOverdue(row: InstallRow, progressPct: number): boolean {
  if (!row.expectedCompletion || progressPct >= 100) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(row.expectedCompletion)
  exp.setHours(0, 0, 0, 0)
  return today.getTime() > exp.getTime()
}

export function installPulseRowOverdue(row: InstallRow): boolean {
  return installTimelineOverdue(row, computeInstallProgress(row))
}

export function getInstallProgressColor(pct: number, isOverdue: boolean): string {
  if (isOverdue) return 'var(--accent-red)'
  if (pct >= 80) return 'var(--accent-gold)'
  if (pct >= 40) return 'var(--accent-teal)'
  return 'var(--accent-blue)'
}

export function installBarWidthPercent(_row: InstallRow, progressPct: number, overdue: boolean): number {
  if (overdue && progressPct < 100) return 100
  return progressPct
}

export function formatInstallShortDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'dd MMM yy')
  } catch {
    return '—'
  }
}
