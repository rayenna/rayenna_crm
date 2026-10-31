import { describe, expect, it } from 'vitest'
import { SUPPORT_TICKET_OPENED_NOTE, isSupportTicketSystemNote } from './supportTicketQueue'

describe('isSupportTicketSystemNote', () => {
  it('matches the exact auto-opened stub', () => {
    expect(isSupportTicketSystemNote(SUPPORT_TICKET_OPENED_NOTE)).toBe(true)
    expect(isSupportTicketSystemNote(`  ${SUPPORT_TICKET_OPENED_NOTE}  `)).toBe(true)
  })

  it('does not treat staff notes as system events', () => {
    expect(isSupportTicketSystemNote('Replaced ACDB and tested output.')).toBe(false)
    expect(isSupportTicketSystemNote('Ticket opened.')).toBe(false)
    expect(isSupportTicketSystemNote('')).toBe(false)
    expect(isSupportTicketSystemNote(null)).toBe(false)
  })
})
