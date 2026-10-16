import { describe, expect, it } from 'vitest'
import { UserRole } from '../types'
import { filterCommandPaletteItems, resolveCommandHref } from './commandPaletteActions'

describe('filterCommandPaletteItems', () => {
  it('hides create ticket for Finance', () => {
    const ids = filterCommandPaletteItems(UserRole.FINANCE, '').map((i) => i.id)
    expect(ids).not.toContain('create_support_ticket')
    expect(ids).toContain('go_customers')
    expect(ids).toContain('go_tally_export')
    expect(ids).toContain('open_my_day')
  })

  it('shows new customer and overdue tickets for Sales', () => {
    const ids = filterCommandPaletteItems(UserRole.SALES, '').map((i) => i.id)
    expect(ids).toContain('new_customer')
    expect(ids).toContain('create_support_ticket')
    expect(ids).toContain('overdue_support_tickets')
  })

  it('shows admin-only users and audit', () => {
    const ids = filterCommandPaletteItems(UserRole.ADMIN, '').map((i) => i.id)
    expect(ids).toContain('new_user')
    expect(ids).toContain('go_audit')
  })

  it('adds dynamic search rows when typing', () => {
    const items = filterCommandPaletteItems(UserRole.ADMIN, 'Ramesh')
    expect(items.some((i) => i.id === 'search_customers')).toBe(true)
    expect(items.some((i) => i.label.includes('Ramesh'))).toBe(true)
    const customers = items.find((i) => i.id === 'search_customers')!
    expect(resolveCommandHref(customers, 'Ramesh')).toBe('/customers?q=Ramesh')
  })

  it('filters static commands by keyword', () => {
    const items = filterCommandPaletteItems(UserRole.ADMIN, 'ticket')
    expect(items.map((i) => i.id)).toContain('create_support_ticket')
    expect(items.map((i) => i.id)).toContain('overdue_support_tickets')
  })

  it('exposes Ask Zenith entry and dynamic ask run', () => {
    const idle = filterCommandPaletteItems(UserRole.MANAGEMENT, '').map((i) => i.id)
    expect(idle).toContain('ask_zenith')
    expect(resolveCommandHref(
      filterCommandPaletteItems(UserRole.MANAGEMENT, '').find((i) => i.id === 'ask_zenith')!,
      '',
    )).toBe('/zenith?askFocus=1')

    const typed = filterCommandPaletteItems(UserRole.MANAGEMENT, 'Revenue by city')
    const askRow = typed.find((i) => i.id === 'ask_zenith_query')
    expect(askRow?.label).toContain('Revenue by city')
    expect(resolveCommandHref(askRow!, 'Revenue by city')).toBe(
      `/zenith?ask=${encodeURIComponent('Revenue by city')}&askRun=1`,
    )
  })
})

