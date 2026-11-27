import { useState, type MouseEvent } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole, type Project } from '../../types'
import AddToMyDayButton from '../my-day/components/AddToMyDayButton'
import { openProposalEngineForProject } from '../../lib/openProposalEngine'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { askTelHref, askWhatsAppHref } from '../../utils/askPhone'
import CreateTicketModal from '../supportTickets/CreateTicketModal'
import type { ZenithNlTableRow } from '../../types/zenithNlQuery'
import { ROUTE_ROLES } from '../../constants/routeRoles'
import {
  buildAskFinancePaymentBody,
  todayIsoDateLocal,
} from '../../utils/askFinancePaymentBody'
import { safePostProjectRemark, safePutProject } from '../../utils/safeOfflineMutation'
import { createTask, MY_DAY_TASKS_QUERY_KEY } from '../../lib/my-day-api'
import { MY_DAY_SNAPSHOT_QUERY_KEY } from '../../lib/myDaySnapshot'
import { MY_DAY_SUGGESTIONS_QUERY_KEY } from '../../hooks/useMyDaySuggestionsQuery'
import { myDayProjectTasksQueryKey } from '../../lib/myDayProjectTasksQuery'
import { recordMyDayUsage } from '../../lib/myDayHabits'

type Props = {
  row: ZenithNlTableRow
  metric?: string
}

type ConfirmKind = 'remark' | 'payment' | 'ticket_start' | 'ticket_close' | null

function cell(row: ZenithNlTableRow, key: string): string {
  const v = row[key]
  return v == null ? '' : String(v)
}

export function askRowProjectId(row: ZenithNlTableRow): string {
  return cell(row, 'projectId')
}

export function askRowTicketId(row: ZenithNlTableRow): string {
  return cell(row, 'ticketId')
}

function ConfirmBar({
  message,
  busy,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
}: {
  message: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
}) {
  return (
    <div className="zenith-ask-row-actions__confirm" role="alertdialog" aria-label="Confirm action">
      <p className="zenith-ask-row-actions__confirm-msg">{message}</p>
      <div className="zenith-ask-row-actions__confirm-btns">
        <button
          type="button"
          className="zenith-ask-row-actions__btn"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="zenith-ask-row-actions__btn zenith-ask-row-actions__btn--gold"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Saving…' : confirmLabel}
        </button>
      </div>
    </div>
  )
}

export default function AskRowActions({ row, metric }: Props) {
  const { user, hasRole } = useAuth()
  const queryClient = useQueryClient()
  const projectId = askRowProjectId(row)
  const ticketId = askRowTicketId(row)
  const slNo = cell(row, 'slNo') || cell(row, 'sl')
  const phone = cell(row, 'phone')
  const who = cell(row, 'customerName') || cell(row, 'customer') || cell(row, 'who')
  const stage = cell(row, 'stageStatus') || cell(row, 'stage')
  const why = cell(row, 'why')
  const [remarkOpen, setRemarkOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [alsoMyDay, setAlsoMyDay] = useState(true)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayIsoDateLocal())
  const [payNote, setPayNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [ticketNote, setTicketNote] = useState('')
  const [closeResolution, setCloseResolution] = useState('')

  if (!projectId && !ticketId) return null

  const tel = askTelHref(phone)
  const wa = askWhatsAppHref(
    phone,
    why ? `Hi ${who || ''}, following up from Rayenna (${why}).`.trim() : undefined,
  )
  const canTickets = hasRole([...ROUTE_ROLES.supportTickets])
  const canFinance =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.FINANCE ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.SALES
  const canPe =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT
  const showPe =
    Boolean(projectId) &&
    canPe &&
    (metric === 'who_to_call' ||
      metric === 'pipeline_health' ||
      metric === 'projects_ops_detail' ||
      metric === 'subsidy_chase_pack' ||
      metric === 'morning_brief' ||
      /proposal/i.test(stage))
  const showPayment =
    Boolean(projectId) &&
    canFinance &&
    (metric === 'outstanding_balance' ||
      metric === 'unpaid_invoices' ||
      metric === 'latest_payments_received' ||
      metric === 'collections_cash' ||
      metric === 'morning_brief' ||
      metric === 'guided_playbook' ||
      metric === 'who_to_call' ||
      metric === 'subsidy_chase_pack')
  const showTicketStatus = Boolean(ticketId) && canTickets
  const label = slNo ? `SL ${slNo}${who ? ` · ${who}` : ''}` : who || 'project'
  const taskContent = why ? `Call ${who || 'customer'}: ${why}` : `Follow up ${label}`

  const stop = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const refreshMyDay = async () => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: MY_DAY_SNAPSHOT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MY_DAY_SUGGESTIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MY_DAY_TASKS_QUERY_KEY }),
    ]
    if (projectId) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: myDayProjectTasksQueryKey(projectId) }),
      )
    }
    await Promise.all(invalidations)
  }

  const runRemarkWithOptionalMyDay = async () => {
    const text = remark.trim()
    if (!text || !projectId) return
    setSaving(true)
    try {
      const r = await safePostProjectRemark(projectId, text)
      if (alsoMyDay) {
        await createTask({
          content: text.length > 120 ? `${text.slice(0, 117)}…` : text,
          projectId,
          projectLabel: label,
        })
        if (user?.id) recordMyDayUsage(user.id, 'pin_hit_list')
        await refreshMyDay()
      }
      toast.success(
        r.queued
          ? alsoMyDay
            ? 'Remark queued · My Day updated'
            : 'Remark queued — will sync online'
          : alsoMyDay
            ? 'Remark saved · added to My Day'
            : 'Remark saved',
      )
      setRemark('')
      setRemarkOpen(false)
      setConfirm(null)
    } catch (err: unknown) {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not save remark')
    } finally {
      setSaving(false)
    }
  }

  const runPayment = async () => {
    if (!projectId) return
    const add = Number(String(payAmount).replace(/,/g, ''))
    if (!Number.isFinite(add) || add <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }
    if (!payDate.trim()) {
      toast.error('Pick a payment date')
      return
    }
    const today = todayIsoDateLocal()
    if (payDate > today) {
      toast.error('Payment date cannot be in the future')
      return
    }
    setSaving(true)
    try {
      const { data: project } = await axiosInstance.get<Project>(`/api/projects/${projectId}`)
      const iso = new Date(`${payDate}T12:00:00`).toISOString()
      const body = buildAskFinancePaymentBody(project, add, iso)
      const r = await safePutProject(projectId, body, 'UPDATE_PAYMENT')
      const note = payNote.trim()
      if (note) {
        await safePostProjectRemark(
          projectId,
          `Payment ₹${Math.round(add).toLocaleString('en-IN')} on ${payDate}: ${note}`,
        )
      }
      toast.success(r.queued ? 'Payment queued — will sync online' : 'Payment recorded')
      setPayAmount('')
      setPayNote('')
      setPaymentOpen(false)
      setConfirm(null)
    } catch (err: unknown) {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not record payment')
    } finally {
      setSaving(false)
    }
  }

  const runTicketStart = async () => {
    if (!ticketId) return
    const note = ticketNote.trim() || 'Started from Ask Zenith'
    setSaving(true)
    try {
      await axiosInstance.post(`/api/support-tickets/${ticketId}/activity`, { note })
      toast.success('Ticket marked in progress')
      setTicketNote('')
      setConfirm(null)
    } catch (err: unknown) {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not update ticket')
    } finally {
      setSaving(false)
    }
  }

  const runTicketClose = async () => {
    if (!ticketId) return
    const resolution = closeResolution.trim()
    if (!resolution) {
      toast.error('Add a short resolution note')
      return
    }
    setSaving(true)
    try {
      await axiosInstance.patch(`/api/support-tickets/${ticketId}/close`, { note: resolution })
      toast.success('Ticket closed')
      setCloseResolution('')
      setConfirm(null)
    } catch (err: unknown) {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not close ticket')
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
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="zenith-ask-row-actions__btn"
          title="WhatsApp"
        >
          WhatsApp
        </a>
      ) : null}
      {projectId ? (
        <AddToMyDayButton
          content={taskContent}
          projectId={projectId}
          projectLabel={label}
          dense
          usageEvent="pin_hit_list"
        />
      ) : null}
      {projectId ? (
        <button
          type="button"
          className="zenith-ask-row-actions__btn"
          onClick={() => {
            setPaymentOpen(false)
            setConfirm(null)
            setRemarkOpen((v) => !v)
          }}
        >
          Remark
        </button>
      ) : null}
      {showPayment ? (
        <button
          type="button"
          className="zenith-ask-row-actions__btn"
          onClick={() => {
            setRemarkOpen(false)
            setConfirm(null)
            setPaymentOpen((v) => !v)
          }}
        >
          Payment
        </button>
      ) : null}
      {showPe ? (
        <button
          type="button"
          className="zenith-ask-row-actions__btn"
          onClick={() => void openProposalEngineForProject(projectId)}
        >
          Proposal
        </button>
      ) : null}
      {canTickets && projectId ? (
        <button type="button" className="zenith-ask-row-actions__btn" onClick={() => setTicketOpen(true)}>
          Ticket
        </button>
      ) : null}
      {showTicketStatus ? (
        <>
          <button
            type="button"
            className="zenith-ask-row-actions__btn"
            onClick={() => {
              setConfirm('ticket_start')
              setTicketNote(why ? `Working: ${why}` : 'Started from Ask Zenith')
            }}
          >
            Start
          </button>
          <button
            type="button"
            className="zenith-ask-row-actions__btn"
            onClick={() => {
              setConfirm('ticket_close')
              setCloseResolution('')
            }}
          >
            Close
          </button>
        </>
      ) : null}

      {remarkOpen && projectId ? (
        <div className="zenith-ask-row-actions__remark">
          <textarea
            rows={2}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={`Add a remark on ${label}`}
            className="zenith-ask-row-actions__textarea"
          />
          <label className="zenith-ask-row-actions__check">
            <input
              type="checkbox"
              checked={alsoMyDay}
              onChange={(e) => setAlsoMyDay(e.target.checked)}
            />
            Also add to My Day
          </label>
          <button
            type="button"
            className="zenith-ask-row-actions__btn zenith-ask-row-actions__btn--gold"
            disabled={saving || !remark.trim()}
            onClick={() => setConfirm('remark')}
          >
            Save…
          </button>
        </div>
      ) : null}

      {paymentOpen && projectId ? (
        <div className="zenith-ask-row-actions__remark">
          <div className="zenith-ask-row-actions__pay-row">
            <input
              type="number"
              min={1}
              step={1}
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount ₹"
              className="zenith-ask-row-actions__input"
              aria-label="Payment amount"
            />
            <input
              type="date"
              value={payDate}
              max={todayIsoDateLocal()}
              onChange={(e) => setPayDate(e.target.value)}
              className="zenith-ask-row-actions__input"
              aria-label="Payment date"
            />
          </div>
          <input
            type="text"
            value={payNote}
            onChange={(e) => setPayNote(e.target.value)}
            placeholder="Optional note (saved as remark)"
            className="zenith-ask-row-actions__input"
          />
          <button
            type="button"
            className="zenith-ask-row-actions__btn zenith-ask-row-actions__btn--gold"
            disabled={saving || !payAmount.trim() || !payDate}
            onClick={() => setConfirm('payment')}
          >
            Record…
          </button>
        </div>
      ) : null}

      {confirm === 'remark' ? (
        <ConfirmBar
          message={
            alsoMyDay
              ? `Save remark on ${label} and pin it to My Day?`
              : `Save remark on ${label}?`
          }
          busy={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runRemarkWithOptionalMyDay()}
        />
      ) : null}

      {confirm === 'payment' ? (
        <ConfirmBar
          message={`Record ₹${Number(String(payAmount).replace(/,/g, '') || 0).toLocaleString('en-IN')} on ${payDate} for ${label}?`}
          busy={saving}
          confirmLabel="Record payment"
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runPayment()}
        />
      ) : null}

      {confirm === 'ticket_start' ? (
        <div className="zenith-ask-row-actions__remark">
          <textarea
            rows={2}
            value={ticketNote}
            onChange={(e) => setTicketNote(e.target.value)}
            placeholder="Activity note"
            className="zenith-ask-row-actions__textarea"
          />
          <ConfirmBar
            message="Mark this ticket In Progress?"
            busy={saving}
            confirmLabel="Start ticket"
            onCancel={() => setConfirm(null)}
            onConfirm={() => void runTicketStart()}
          />
        </div>
      ) : null}

      {confirm === 'ticket_close' ? (
        <div className="zenith-ask-row-actions__remark">
          <textarea
            rows={2}
            value={closeResolution}
            onChange={(e) => setCloseResolution(e.target.value)}
            placeholder="Resolution note (required)"
            className="zenith-ask-row-actions__textarea"
          />
          <ConfirmBar
            message="Close this ticket with the resolution above?"
            busy={saving}
            confirmLabel="Close ticket"
            onCancel={() => setConfirm(null)}
            onConfirm={() => void runTicketClose()}
          />
        </div>
      ) : null}

      {ticketOpen && projectId ? (
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
