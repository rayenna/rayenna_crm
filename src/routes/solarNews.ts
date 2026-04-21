import express, { Request, Response } from 'express'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { authenticate } from '../middleware/auth'

const router = express.Router()

export type SolarNewsTag = 'policy' | 'grid' | 'market' | 'tech' | 'agri'

type SolarNewsItem = {
  id: string
  source: string
  headline: string
  url: string
  tag: SolarNewsTag
  publishedAt: string
}

const CACHE_TTL_MS = 30 * 60 * 1000
// TODO: replace with Redis cache if/when available
let cache: { fetchedAt: number; items: SolarNewsItem[] } | null = null

const RSS_SOURCES: Array<{ source: string; url: string; maxItems: number }> = [
  { source: 'Mercom India', url: 'https://mercomindia.com/feed/', maxItems: 10 },
  { source: 'PV Tech', url: 'https://www.pv-tech.org/feed/', maxItems: 10 },
  { source: 'SolarQuarter', url: 'https://solarquarter.com/feed/', maxItems: 10 },
  { source: 'ET Energy', url: 'https://energy.economictimes.indiatimes.com/rss/topstories', maxItems: 10 },
]

const HTML_SOURCES: Array<{
  source: string
  url: string
  // Return candidate anchors (href + text) from the page
  pick: ($: cheerio.CheerioAPI) => Array<{ headline: string; url: string }>
}> = [
  {
    source: 'ANERT',
    url: 'https://anert.gov.in/',
    pick: ($) =>
      $('a')
        .toArray()
        .map((el: Element) => {
          const a = $(el)
          return { headline: a.text().trim(), url: a.attr('href')?.trim() || '' }
        })
        .filter((x: { headline: string; url: string }) => x.headline.length >= 18 && x.url),
  },
  {
    source: 'MNRE',
    url: 'https://mnre.gov.in/en/',
    pick: ($) =>
      $('a')
        .toArray()
        .map((el: Element) => {
          const a = $(el)
          return { headline: a.text().trim(), url: a.attr('href')?.trim() || '' }
        })
        .filter((x: { headline: string; url: string }) => x.headline.length >= 18 && x.url),
  },
  {
    source: 'KSEB',
    url: 'https://kseb.in/',
    pick: ($) =>
      $('a')
        .toArray()
        .map((el: Element) => {
          const a = $(el)
          return { headline: a.text().trim(), url: a.attr('href')?.trim() || '' }
        })
        .filter((x: { headline: string; url: string }) => x.headline.length >= 18 && x.url),
  },
  {
    source: 'PM Surya Ghar',
    url: 'https://pmsuryaghar.gov.in/',
    pick: ($) =>
      $('a')
        .toArray()
        .map((el: Element) => {
          const a = $(el)
          return { headline: a.text().trim(), url: a.attr('href')?.trim() || '' }
        })
        .filter((x: { headline: string; url: string }) => x.headline.length >= 18 && x.url),
  },
  {
    source: 'Mercom India',
    url: 'https://www.mercomindia.com/',
    pick: ($) =>
      $('a')
        .toArray()
        .map((el: Element) => {
          const a = $(el)
          return { headline: a.text().trim(), url: a.attr('href')?.trim() || '' }
        })
        .filter((x: { headline: string; url: string }) => x.headline.length >= 18 && x.url),
  },
]

const ET_SOLAR_FILTER_TERMS = [
  'solar',
  'renewable',
  'wind',
  'kseb',
  'mnre',
  'rooftop',
  'photovoltaic',
  ' pv',
  'energy storage',
  'bess',
]

function isEtRelevant(title: string): boolean {
  const t = title.toLowerCase()
  return ET_SOLAR_FILTER_TERMS.some((k) => t.includes(k))
}

function normalizeHeadline(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

function assignTag(headline: string): SolarNewsTag {
  const h = headline.toLowerCase()
  if (/(policy|scheme|subsidy|mnre|kseb|regulation)/i.test(h)) return 'policy'
  if (/(grid|discom|transmission|storage|bess)/i.test(h)) return 'grid'
  if (/(price|tariff|tender|bid|import|duty|\bmw\b|capacity)/i.test(h)) return 'market'
  if (/(panel|efficiency|floating|technology|innovation|bifacial|photovoltaic|\bpv\b)/i.test(h))
    return 'tech'
  if (/(farm|pump|kusum|agri|irrigation)/i.test(h)) return 'agri'
  return 'policy'
}

async function fetchRss(source: string, url: string, maxItems: number): Promise<SolarNewsItem[]> {
  const res = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'RayennaCRM/1.0 (+Zenith Solar News)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
  })
  const xml = String(res.data ?? '')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    allowBooleanAttributes: true,
    parseTagValue: true,
    trimValues: true,
  })
  const parsed = parser.parse(xml) as any
  const itemsRaw =
    parsed?.rss?.channel?.item ??
    parsed?.feed?.entry ??
    parsed?.channel?.item ??
    []
  const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : [itemsRaw].filter(Boolean)

  const out: SolarNewsItem[] = []
  for (const it of items.slice(0, maxItems)) {
    const headline = String(it?.title?.['#text'] ?? it?.title ?? '').trim()
    if (!headline) continue
    if (source === 'ET Energy' && !isEtRelevant(headline)) continue

    const link =
      String(it?.link?.href ?? it?.link ?? it?.guid ?? '').trim()
    const urlOut = link ? absoluteUrl(url, link) : ''
    if (!urlOut) continue

    const pub =
      it?.pubDate ??
      it?.published ??
      it?.updated ??
      it?.['dc:date'] ??
      null
    const publishedAt = (() => {
      const d = pub ? new Date(String(pub)) : null
      const t = d && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString()
      return t
    })()

    out.push({
      id: `${source}:${normalizeHeadline(headline)}`.slice(0, 180),
      source,
      headline,
      url: urlOut,
      tag: assignTag(headline),
      publishedAt,
    })
  }
  return out
}

async function fetchHtml(source: string, pageUrl: string, pick: (c: cheerio.CheerioAPI) => Array<{ headline: string; url: string }>): Promise<SolarNewsItem[]> {
  const res = await axios.get(pageUrl, {
    timeout: 15000,
    headers: {
      'User-Agent': 'RayennaCRM/1.0 (+Zenith Solar News)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  const html = String(res.data ?? '')
  const $ = cheerio.load(html)
  const candidates = pick($)
  const out: SolarNewsItem[] = []

  for (const c of candidates.slice(0, 20)) {
    const headline = String(c.headline ?? '').trim()
    if (!headline || headline.length < 18) continue
    const href = String(c.url ?? '').trim()
    if (!href || href.startsWith('javascript:') || href === '#') continue
    const urlOut = absoluteUrl(pageUrl, href)
    out.push({
      id: `${source}:${normalizeHeadline(headline)}`.slice(0, 180),
      source,
      headline,
      url: urlOut,
      tag: assignTag(headline),
      publishedAt: new Date().toISOString(),
    })
  }

  return out
}

function enforcePerSourceLimit(items: SolarNewsItem[], maxPerSource: number): SolarNewsItem[] {
  const used: Record<string, number> = {}
  const out: SolarNewsItem[] = []
  for (const it of items) {
    const n = used[it.source] ?? 0
    if (n >= maxPerSource) continue
    used[it.source] = n + 1
    out.push(it)
  }
  return out
}

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const now = Date.now()
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return res.json(cache.items)
    }

    const rssJobs = RSS_SOURCES.map((s) =>
      fetchRss(s.source, s.url, s.maxItems).catch(() => [] as SolarNewsItem[]),
    )
    const htmlJobs = HTML_SOURCES.map((s) =>
      fetchHtml(s.source, s.url, s.pick).catch(() => [] as SolarNewsItem[]),
    )

    const results = await Promise.all([...rssJobs, ...htmlJobs])
    const flat = results.flat()

    // Deduplicate (simple)
    const seen = new Set<string>()
    const deduped: SolarNewsItem[] = []
    for (const it of flat) {
      const k = normalizeHeadline(it.headline)
      if (!k) continue
      if (seen.has(k)) continue
      seen.add(k)
      deduped.push(it)
    }

    // Sort by recency (best-effort)
    deduped.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))

    // Keep a mix across sources
    const mixed = enforcePerSourceLimit(deduped, 5).slice(0, 20)

    cache = { fetchedAt: now, items: mixed }
    return res.json(mixed)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to fetch solar news' })
  }
})

export default router

