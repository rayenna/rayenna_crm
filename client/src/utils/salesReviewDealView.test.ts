import { describe, expect, it } from 'vitest'
import {
  countDealQuickViews,
  dealMatchesQuickView,
  parseSalesReviewDealView,
} from './salesReviewDealView'

describe('salesReviewDealView', () => {
  it('parses only open and closed', () => {
    expect(parseSalesReviewDealView('open')).toBe('open')
    expect(parseSalesReviewDealView('closed')).toBe('closed')
    expect(parseSalesReviewDealView('')).toBe('')
    expect(parseSalesReviewDealView('all')).toBe('')
    expect(parseSalesReviewDealView(1)).toBe('')
  })

  it('Open is Lead, Site Survey, and Proposal', () => {
    expect(dealMatchesQuickView('LEAD', 'open')).toBe(true)
    expect(dealMatchesQuickView('SITE_SURVEY', 'open')).toBe(true)
    expect(dealMatchesQuickView('PROPOSAL', 'open')).toBe(true)
    expect(dealMatchesQuickView('CONFIRMED', 'open')).toBe(false)
    expect(dealMatchesQuickView('UNDER_INSTALLATION', 'open')).toBe(false)
    expect(dealMatchesQuickView('SUBMITTED_FOR_SUBSIDY', 'open')).toBe(false)
  })

  it('Closed is Confirmed Order and Under Installation', () => {
    expect(dealMatchesQuickView('CONFIRMED', 'closed')).toBe(true)
    expect(dealMatchesQuickView('UNDER_INSTALLATION', 'closed')).toBe(true)
    expect(dealMatchesQuickView('LEAD', 'closed')).toBe(false)
    expect(dealMatchesQuickView('SUBMITTED_FOR_SUBSIDY', 'closed')).toBe(false)
  })

  it('no view shows every stage, including subsidy submitted', () => {
    expect(dealMatchesQuickView('SUBMITTED_FOR_SUBSIDY', '')).toBe(true)
    expect(dealMatchesQuickView('LEAD', '')).toBe(true)
  })

  it('counts open and closed buckets', () => {
    expect(
      countDealQuickViews([
        { stageStatus: 'LEAD' },
        { stageStatus: 'PROPOSAL' },
        { stageStatus: 'CONFIRMED' },
        { stageStatus: 'UNDER_INSTALLATION' },
        { stageStatus: 'SUBMITTED_FOR_SUBSIDY' },
      ]),
    ).toEqual({ open: 2, closed: 2 })
  })
})
