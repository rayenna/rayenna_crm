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
  { source: 'Re-Solve', url: 'https://re-solve.in/feed/', maxItems: 10 },
  { source: 'Solar Power World', url: 'https://www.solarpowerworldonline.com/feed/', maxItems: 10 },
  { source: 'Renewable Mirror', url: 'https://www.renewablemirror.com/feed/', maxItems: 10 },
  { source: 'CleanTechnica', url: 'https://cleantechnica.com/feed/', maxItems: 10 },
  { source: 'ET Energy', url: 'https://energy.economictimes.indiatimes.com/rss/topstories', maxItems: 10 },
]

/** Cap anchor scan on huge homepages (IEA, UN, etc.) for speed and stability. */
const MAX_HTML_ANCHORS_SCAN = 280

const HTML_SOURCES: Array<{
  source: string
  url: string
  // Return candidate anchors (href + text) from the page
  pick: ($: cheerio.CheerioAPI) => Array<{ headline: string; url: string }>
}> = [
  {
    source: 'ANERT',
    url: 'https://anert.gov.in/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'MNRE',
    url: 'https://mnre.gov.in/en/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'KSEB',
    url: 'https://kseb.in/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'PM Surya Ghar',
    url: 'https://pmsuryaghar.gov.in/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'Mercom India',
    url: 'https://www.mercomindia.com/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'Wood Mackenzie',
    url: 'https://www.woodmac.com/market-insights/power-and-renewables/discover-global-power-and-renewables-insights/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'Saur Energy',
    url: 'https://www.saurenergy.com/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'IEA',
    url: 'https://www.iea.org/',
    pick: pickNewsLinksFromAnchors,
  },
  {
    source: 'UN Climate',
    url: 'https://www.un.org/en/climatechange/',
    pick: pickNewsLinksFromAnchors,
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

/** Large global portals: keep scraped lines loosely energy/climate-related. */
const GLOBAL_PORTAL_SOURCES = new Set(['IEA', 'UN Climate'])
const GLOBAL_PORTAL_HEADLINE_TERMS = [
  'solar',
  'renewable',
  'wind',
  'energy',
  'power',
  'grid',
  'electric',
  'climate',
  'carbon',
  'cop',
  'emission',
  'fossil',
  'battery',
  'storage',
  'hydrogen',
  'efficiency',
  'heat',
  'cooling',
  'oil',
  'gas',
  'petroleum',
  'transport',
  'vehicle',
  'methane',
]

function isGlobalPortalHeadline(headline: string): boolean {
  const t = headline.toLowerCase()
  return GLOBAL_PORTAL_HEADLINE_TERMS.some((k) => t.includes(k))
}

function normalizeHeadline(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip tags / decode common entities — RSS and some sites put markup in titles; never pass raw into HTML parsers. */
function stripHtmlFromText(s: string): string {
  const raw = String(s ?? '').trim()
  if (!raw) return ''
  let t = raw.replace(/<[^>]+>/g, ' ')
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
  t = t.replace(/&#(\d+);/g, (_, d) => {
    const n = Number(d)
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''
  })
  t = t.replace(/&#x([0-9a-f]+);/gi, (_, h) => {
    const n = parseInt(h, 16)
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''
  })
  return t.replace(/\s+/g, ' ').trim()
}

/** Reject CSS fragments, lazy-load attribute dumps, and similar non-headlines. */
function isCssOrMarkupNoise(s: string): boolean {
  const t = s.toLowerCase()
  if (/<\s*(img|svg|video|iframe|script|style|picture|source)\b/i.test(s)) return true
  if (
    /(object-fit|border-box|box-sizing|min-width|max-width|min-height|max-height|loading\s*=\s*['"]?lazy)/i.test(
      t,
    )
  )
    return true
  if (/position\s*:\s*absolute|;\s*top\s*:\s*0\s*;\s*left\s*:\s*0|top\s*:\s*0\s*;\s*left\s*:\s*0\s*;\s*bottom\s*:\s*0/i.test(t))
    return true
  if (/olute;\s*top\s*:\s*0/i.test(t)) return true
  const semi = (t.match(/;/g) || []).length
  const colons = (t.match(/:/g) || []).length
  if (semi >= 5 && colons >= 5) return true
  return false
}

/** For scraped anchors: prefer human link text; fall back to first image alt — avoid img style dumps. */
function headlineFromAnchor($: cheerio.CheerioAPI, el: Element): string {
  const a = $(el)
  const directOnly = a
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
  const directClean = stripHtmlFromText(directOnly)
  if (directClean.length >= 12 && !isCssOrMarkupNoise(directClean)) return directClean

  const alt = stripHtmlFromText(a.find('img').first().attr('alt') ?? '')
  if (alt.length >= 12 && !isCssOrMarkupNoise(alt)) return alt

  const full = stripHtmlFromText(a.text())
  if (full.length >= 12 && !isCssOrMarkupNoise(full)) return full

  return ''
}

function pickNewsLinksFromAnchors($: cheerio.CheerioAPI): Array<{ headline: string; url: string }> {
  return $('a')
    .toArray()
    .slice(0, MAX_HTML_ANCHORS_SCAN)
    .map((el: Element) => ({
      headline: headlineFromAnchor($, el),
      url: $(el).attr('href')?.trim() || '',
    }))
    .filter((x: { headline: string; url: string }) => x.headline.length >= 18 && x.url)
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
    const rawTitle = String(it?.title?.['#text'] ?? it?.title ?? '').trim()
    const headline = stripHtmlFromText(rawTitle)
    if (!headline) continue
    if (isCssOrMarkupNoise(headline)) continue
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
    const headline = stripHtmlFromText(String(c.headline ?? '').trim())
    if (!headline || headline.length < 18) continue
    if (isCssOrMarkupNoise(headline)) continue
    if (GLOBAL_PORTAL_SOURCES.has(source) && !isGlobalPortalHeadline(headline)) continue
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

