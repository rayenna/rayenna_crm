import { useState, type MouseEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import AddToMyDayButton from '../my-day/components/AddToMyDayButton'
import { openProposalEngineForProject } from '../../lib/openProposalEngine'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { askTelHref, askWhatsAppHref } from '../../utils/askPhone'
import CreateTicketModal from '../supportTickets/CreateTicketModal'
import type { ZenithNlTableRow } from '../../types/zenithNlQuery'
import { ROUTE_ROLES } from '../../constants/routeRoles'

type Props = {
  row: ZenithNlTableRow
  metric?: string
}

function cell(row: ZenithNlTableRow, key: string): string {
  const v = row[key]
  return v == null ? '' : String(v)
}

export function askRowProjectId(row: ZenithNlTableRow): string {
  return cell(row, 'projectId')
}

export default function AskRowActions({ row, metric }: Props) {
  const { user, hasRole } = useAuth()
  const projectId = askRowProjectId(row)
  const slNo = cell(row, 'slNo') || cell(row, 'sl')
  const phone = cell(row, 'phone')
  const who = cell(row, 'customerName') || cell(row, 'customer') || cell(row, 'who')
  const stage = cell(row, 'stageStatus') || cell(row, 'stage')
  const why = cell(row, 'why')
  const [remarkOpen, setRemarkOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)

  if (!projectId) return null

  const tel = askTelHref(phone)
  const wa = askWhatsAppHref(
    phone,
    why ? `Hi ${who || ''}, following up from Rayenna (${why}).`.trim() : undefined,
  )
  const canTickets = hasRole([...ROUTE_ROLES.supportTickets])
  const canPe =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT
  const showPe =
    canPe &&
    (metric === 'who_to_call' ||
      metric === 'pipeline_health' ||
      metric === 'projects_ops_detail' ||
      /proposal/i.test(stage))
  const label = slNo ? `SL ${slNo}${who ? ` · ${who}` : ''}` : who || 'project'
  const taskContent = why
    ? `Call ${who || 'customer'}: ${why}`
    : `Follow up ${label}`

  const stop = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const saveRemark = async () => {
    const text = remark.trim()
    if (!text) return
    setSaving(true)
    try {
      await axiosInstance.post(`/api/remarks/project/${projectId}`, { remark: text })
      toast.success('Remark saved')
      setRemark('')
      setRemarkOpen(false)
    } catch (err: unknown) {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not save remark')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="zenith-ask-row-actions" onClick={stop} onKeyDown={(e) => e.stopPropagation()}>
      {tel ? (
        <a href={tel} className="zenith-ask-row-actions__btn" title="Call">
          Call
        </a>
      ) : null}
      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="zenith-ask-row-actions__btn" title="WhatsApp">
          WhatsApp
        </a>
      ) : null}
      <AddToMyDayButton
        content={taskContent}
        projectId={projectId}
        projectLabel={label}
        dense
        usageEvent="pin_hit_list"
      />
      <button
        type="button"
        className="zenith-ask-row-actions__btn"
        onClick={() => setRemarkOpen((v) => !v)}
      >
        Remark
      </button>
      {showPe ? (
        <button
          type="button"
          className="zenith-ask-row-actions__btn"
          onClick={() => void openProposalEngineForProject(projectId)}
        >
          Proposal
        </button>
      ) : null}
      {canTickets ? (
        <button type="button" className="zenith-ask-row-actions__btn" onClick={() => setTicketOpen(true)}>
          Ticket
        </button>
      ) : null}

      {remarkOpen ? (
        <div className="zenith-ask-row-actions__remark">
          <textarea
            rows={2}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={`Add a remark on ${label}`}
            className="zenith-ask-row-actions__textarea"
          />
          <button
            type="button"
            className="zenith-ask-row-actions__btn zenith-ask-row-actions__btn--gold"
            disabled={saving || !remark.trim()}
            onClick={() => void saveRemark()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}

      {ticketOpen ? (
        <CreateTicketModal
          projectId={projectId}
          initialTitle={why ? `Follow-up: ${why}` : undefined}
          onClose={() => setTicketOpen(false)}
          onSuccess={() => {
            setTicketOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
