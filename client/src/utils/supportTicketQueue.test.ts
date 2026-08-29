import { describe, expect, it } from 'vitest'
import {
  SUPPORT_TICKET_STALE_DAYS,
  compareSupportTicketQueue,
  isSupportTicketOverdue,
  supportTicketMatchesSearch,
} from './supportTicketQueue'

const now = new Date('2026-08-29T12:00:00.000Z')

function ticket(
  over: Partial<{
    status: string
    createdAt: string
    source: string | null
    activities: Array<{ createdAt: string; followUpDate?: string | null }>
  }> = {},
) {
  return {
    status: 'OPEN',
    createdAt: '2026-08-20T00:00:00.000Z',
    source: 'CRM',
    activities: [] as Array<{ createdAt: string; followUpDate?: string | null }>,
    ...over,
  }
}

describe('isSupportTicketOverdue', () => {
  it('uses only the latest activity follow-up date, not older ones', () => {
    const t = ticket({
      activities: [
        { createdAt: '2026-08-10T00:00:00.000Z', followUpDate: '2026-08-11T00:00:00.000Z' },
        { createdAt: '2026-08-28T00:00:00.000Z', followUpDate: '2026-09-05T00:00:00.000Z' },
      ],
    })
    expect(isSupportTicketOverdue(t, now)).toBe(false)
  })

  it('is overdue when the latest next follow-up date has passed', () => {
    const t = ticket({
      activities: [
        { createdAt: '2026-08-28T00:00:00.000Z', followUpDate: '2026-08-20T00:00:00.000Z' },
      ],
    })
    expect(isSupportTicketOverdue(t, now)).toBe(true)
  })

  it('is not overdue when the next follow-up is today', () => {
    const t = ticket({
      activities: [
        { createdAt: '2026-08-28T00:00:00.000Z', followUpDate: '2026-08-29T00:00:00.000Z' },
      ],
    })
    expect(isSupportTicketOverdue(t, now)).toBe(false)
  })

  it('is overdue when there is no next date and the ticket is stale', () => {
    const createdAt = new Date(now)
    createdAt.setUTCDate(createdAt.getUTCDate() - SUPPORT_TICKET_STALE_DAYS)
    const t = ticket({ createdAt: createdAt.toISOString(), activities: [] })
    expect(isSupportTicketOverdue(t, now)).toBe(true)
  })

  it('is not overdue when there is no next date and the ticket is fresh', () => {
    const t = ticket({ createdAt: '2026-08-27T00:00:00.000Z', activities: [] })
    expect(isSupportTicketOverdue(t, now)).toBe(false)
  })

  it('never marks closed tickets overdue', () => {
    const t = ticket({
      status: 'CLOSED',
      activities: [
        { createdAt: '2026-08-01T00:00:00.000Z', followUpDate: '2026-08-02T00:00:00.000Z' },
      ],
    })
    expect(isSupportTicketOverdue(t, now)).toBe(false)
  })
})

describe('compareSupportTicketQueue', () => {
  it('sorts overdue, then Solar Hub, then oldest', () => {
    const overdueCrm = ticket({
      createdAt: '2026-08-25T00:00:00.000Z',
      activities: [{ createdAt: '2026-08-25T00:00:00.000Z', followUpDate: '2026-08-20T00:00:00.000Z' }],
    })
    const hubFresh = ticket({
      createdAt: '2026-08-10T00:00:00.000Z',
      source: 'CONSUMER_APP',
      activities: [{ createdAt: '2026-08-28T00:00:00.000Z', followUpDate: '2026-09-10T00:00:00.000Z' }],
    })
    const crmOld = ticket({ createdAt: '2026-08-01T00:00:00.000Z', activities: [{ createdAt: '2026-08-28T00:00:00.000Z', followUpDate: '2026-09-10T00:00:00.000Z' }] })
    const crmNew = ticket({ createdAt: '2026-08-15T00:00:00.000Z', activities: [{ createdAt: '2026-08-28T00:00:00.000Z', followUpDate: '2026-09-10T00:00:00.000Z' }] })
    const list = [crmNew, hubFresh, crmOld, overdueCrm].sort(compareSupportTicketQueue)
    expect(list[0]).toBe(overdueCrm)
    expect(list[1]).toBe(hubFresh)
    expect(list[2]).toBe(crmOld)
    expect(list[3]).toBe(crmNew)
  })
})

describe('supportTicketMatchesSearch', () => {
  it('matches ticket number, title, sl no, and customer', () => {
    const t = {
      ticketNumber: 'RE12345678',
      title: 'Inverter noise',
      project: { slNo: 42, customer: { customerName: 'Priya Nair' } },
      hubUsername: 'priya',
    }
    expect(supportTicketMatchesSearch(t, 'RE123')).toBe(true)
    expect(supportTicketMatchesSearch(t, 'noise')).toBe(true)
    expect(supportTicketMatchesSearch(t, '42')).toBe(true)
    expect(supportTicketMatchesSearch(t, 'priya')).toBe(true)
    expect(supportTicketMatchesSearch(t, 'zzz')).toBe(false)
  })
})
