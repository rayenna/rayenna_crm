import { useEffect, useMemo, useRef, useState } from 'react'
import axiosInstance from '../../utils/axios'
import HelpTooltip from '../help/HelpTooltip'

type SolarNewsTag = 'policy' | 'grid' | 'market' | 'tech' | 'agri'

export type SolarNewsItem = {
  id: string
  source: string
  headline: string
  url: string
  tag: SolarNewsTag
  publishedAt: string
}

export interface SolarNewsTickerProps {
  refreshIntervalMs?: number
  onItemClick?: (url: string) => void
}

/** Lower = slower scroll (duration ∝ scrollWidth / pxPerSec). Same logic for all breakpoints. */
const ZENITH_TICKER_PX_PER_SEC = 4
const ZENITH_TICKER_MIN_S = 105
const ZENITH_TICKER_MAX_S = 540

const FALLBACK: Array<Omit<SolarNewsItem, 'id' | 'publishedAt' | 'url'> & { url: string }> = [
  {
    source: 'KSEB',
    tag: 'grid',
    headline: 'Kerala net metering applications now processed within 14 working days',
    url: 'https://kseb.in/',
  },
  {
    source: 'MNRE',
    tag: 'policy',
    headline: 'PM Surya Ghar scheme targets 1 crore rooftop solar households by 2026',
    url: 'https://mnre.gov.in/en/',
  },
  {
    source: 'ANERT',
    tag: 'policy',
    headline: 'ANERT invites applications for solar rooftop subsidy — residential segment',
    url: 'https://anert.gov.in/',
  },
  {
    source: 'Mercom',
    tag: 'market',
    headline: 'India solar installations cross 80 GW cumulative capacity milestone',
    url: 'https://www.mercomindia.com/',
  },
  {
    source: 'PV Tech',
    tag: 'tech',
    headline: 'Bifacial panel adoption in Kerala rises to 60% of new installations',
    url: 'https://www.pv-tech.org/',
  },
]

function tagStyle(tag: SolarNewsTag): { fg: string; bg: string } {
  switch (tag) {
    case 'policy':
      return { fg: 'var(--accent-teal)', bg: 'var(--accent-teal-muted)' }
    case 'grid':
      return { fg: 'var(--accent-blue)', bg: 'var(--accent-blue-muted)' }
    case 'market':
      return { fg: 'var(--accent-gold)', bg: 'var(--accent-gold-muted)' }
    case 'tech':
      return { fg: 'var(--accent-purple)', bg: 'var(--accent-purple-muted)' }
    case 'agri':
      return { fg: 'var(--accent-green)', bg: 'color-mix(in srgb, var(--accent-green) 16%, transparent)' }
    default:
      return { fg: 'var(--accent-gold)', bg: 'var(--accent-gold-muted)' }
  }
}

function normalizeListKey(items: SolarNewsItem[]): string {
  return items.map((i) => i.id).join('|')
}

export default function SolarNewsTicker({
  refreshIntervalMs = 30 * 60 * 1000,
  onItemClick,
}: SolarNewsTickerProps) {
  const [items, setItems] = useState<SolarNewsItem[]>([])
  const [lastOkAt, setLastOkAt] = useState<number | null>(null)
  const [durationS, setDurationS] = useState<number>(32)
  const lastKeyRef = useRef<string>('')
  const marqueeRef = useRef<HTMLDivElement | null>(null)

  const open = (url: string) => {
    if (onItemClick) return onItemClick(url)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const isStale = lastOkAt != null ? Date.now() - lastOkAt > 60 * 60 * 1000 : true

  const load = async () => {
    try {
      const res = await axiosInstance.get('/api/solar-news')
      const arr = Array.isArray(res.data) ? (res.data as SolarNewsItem[]) : []
      const filtered = arr.filter((x) => x?.headline && x?.url).slice(0, 20)
      if (!filtered.length) throw new Error('empty')
      const key = normalizeListKey(filtered)
      // Avoid restarting the marquee unless content changed.
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key
        setItems(filtered)
      }
      setLastOkAt(Date.now())
    } catch {
      // Keep existing items if any; otherwise fall back to static list
      if (items.length === 0) {
        const now = new Date().toISOString()
        const fb = FALLBACK.map((f, idx) => ({
          id: `fallback:${idx}`,
          publishedAt: now,
          ...f,
        }))
        setItems(fb)
      }
    }
  }

  useEffect(() => {
    void load()
    const id = window.setInterval(() => {
      void load()
    }, refreshIntervalMs)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIntervalMs])

  useEffect(() => {
    const el = marqueeRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const compute = () => {
      const total = el.scrollWidth
      const half = total > 0 ? total / 2 : 0
      if (!half) return
      const next = Math.min(
        ZENITH_TICKER_MAX_S,
        Math.max(ZENITH_TICKER_MIN_S, half / ZENITH_TICKER_PX_PER_SEC),
      )
      setDurationS(next)
    }

    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    return () => ro.disconnect()
  }, [items.length])

  const marqueeItems = useMemo(() => {
    const safe = items.length ? items : []
    // Duplicate once for seamless loop.
    return [...safe, ...safe]
  }, [items])

  if (items.length === 0) return null

  const dotColor = isStale ? 'var(--accent-gold)' : 'var(--accent-green)'

  return (
    <div className="zenith-solar-news-root border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 96%, transparent)]">
      <style>{`
        @keyframes zenith-solar-news-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .zenith-solar-news-root{
          /* Let height follow content (label + pill); fixed height caused mobile overlap with AI ticker */
        }
        .zenith-solar-news-track {
          animation-name: zenith-solar-news-marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .zenith-solar-news-viewport:hover .zenith-solar-news-track {
          animation-play-state: paused;
        }
        .zenith-solar-news-item:hover .zenith-solar-news-headline {
          color: var(--accent-gold) !important;
        }
        .zenith-solar-news-dot {
          animation: zenith-solar-dot-pulse 1.25s ease-in-out infinite;
        }
        @keyframes zenith-solar-dot-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>

      <div className="zenith-exec-main mx-auto px-3 sm:px-5 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-h-0">
        <div className="flex items-center justify-center sm:justify-start shrink-0 gap-1">
          <span className="zenith-display text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--accent-gold)] opacity-70 inline-flex items-center gap-1.5">
            <span
              className="zenith-solar-news-dot"
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 999,
                background: dotColor,
              }}
              aria-hidden
            />
            Solar news
          </span>
          <HelpTooltip
            helpKey="zenith.solar-news"
            position="bottom"
            variant="zenith"
            className="opacity-95"
          />
        </div>

        <div
          className="zenith-solar-news-viewport flex-1 min-w-0 min-h-[44px] sm:min-h-0 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-input)] py-2 sm:py-1.5 flex items-center overflow-hidden"
          role="region"
          aria-label="Solar news, auto-scrolling"
        >
          <div className="h-full flex items-center">
            <div
              ref={marqueeRef}
              className="zenith-solar-news-track inline-flex items-center whitespace-nowrap"
              style={{
                animationDuration: `${durationS}s`,
                gap: 18,
                minWidth: '200%',
              }}
            >
              {marqueeItems.map((it, idx) => {
                const t = tagStyle(it.tag)
                const key = `${it.id}:${idx}`
                return (
                  <button
                    key={key}
                    type="button"
                    className="zenith-solar-news-item inline-flex items-center gap-2 bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] rounded-full px-2 py-2 min-h-[44px] sm:min-h-0 sm:py-1 sm:px-1 touch-manipulation"
                    onClick={() => open(it.url)}
                    aria-label={`${it.source}: ${it.headline}`}
                  >
                    <span
                      style={{
                        fontFamily:
                          '"Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: 9,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--accent-gold)',
                        opacity: 0.96,
                      }}
                    >
                      {it.source}
                    </span>

                    <span
                      className="zenith-solar-news-headline"
                      style={{
                        fontFamily: 'DM Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                        fontSize: 11.5,
                        color:
                          'color-mix(in srgb, var(--text-primary) 78%, var(--text-secondary) 22%)',
                        lineHeight: '16px',
                      }}
                    >
                      {it.headline}
                    </span>

                    <span
                      style={{
                        fontFamily:
                          '"Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: 9,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: t.fg,
                        background: t.bg,
                        padding: '2px 6px',
                        borderRadius: 999,
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      {it.tag}
                    </span>

                    <span style={{ color: 'color-mix(in srgb, var(--text-muted) 52%, transparent)', paddingLeft: 6 }}>|</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

