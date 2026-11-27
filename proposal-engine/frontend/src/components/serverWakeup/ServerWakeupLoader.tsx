/**
 * Portable Render Free Tier cold-start screen for Rayenna CRM & Solar Hub.
 * Self-contained: React + Tailwind + inline SVG/keyframes. No lucide / extra deps.
 *
 * Copy this folder into Solar Hub and mount with appMode="consumer".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** Official Rayenna mark navy/purple (matches rayenna_logo.jpg swooshes + wordmark). */
const LOGO_NAVY = '#0A1445'
const AMBER = '#FDB813'

const SHARED_MESSAGES = [
  'Waking up the solar grid... zero fossil fuels harmed in this boot-up.',
  'Charging the inverters—good things (and clean energy) take a minute.',
  'Our server was in eco-sleep mode. Spinning up the turbines now...',
  'Fun fact: In the 45s it takes to boot, the sun hits Earth with enough energy to power humanity for a year.',
  'Converting pure Kerala sunshine into API packets...',
  'Syncing cloud infrastructure... running on 100% renewable vibes.',
] as const

const CRM_MESSAGES = [
  'Warming up your pipeline—sunlight is free, cold starts take 50 seconds.',
  'Prepping your solar leads & proposals. Almost at peak wattage...',
] as const

const CONSUMER_MESSAGES = [
  'Checking the panels & syncing your clean energy dashboard...',
  'Harnessing rooftop vibes—your solar insights are coming right up.',
] as const

const PROPOSAL_MESSAGES = [
  'Opening your shared solar proposal—almost at full brightness...',
  'Waking the proposal vault so your client can read every page.',
] as const

const POLL_INTERVAL_MS = 2500
const REQUEST_TIMEOUT_MS = 5000
const MESSAGE_ROTATE_MS = 4500
/** Progress eases toward 95% over this window (bar should still be moving when try-again appears). */
const PROGRESS_ASYMPTOTE_MS = 110_000
/** After this long without a healthy API, show the “try again” fallback (polling still continues). */
const SLOW_FALLBACK_MS = 120_000
const DEFAULT_INITIAL_DELAY_MS = 1200
const DEFAULT_HEALTH_ENDPOINT = '/api/health'

export type ServerWakeupAppMode = 'crm' | 'consumer' | 'proposal'

export type ServerWakeupLoaderProps = {
  apiUrl: string
  healthEndpoint?: string
  appMode?: ServerWakeupAppMode
  onReady: () => void
  initialDelayMs?: number
  /**
   * Dev preview only: ignore successful health pings until this many ms have elapsed,
   * so a warm local API still shows the full cold-start UI.
   */
  previewDelayMs?: number
  /** Same wallpaper as Login — defaults to CRM `/background.jpg`. */
  backgroundImageUrl?: string
}

function joinUrl(apiUrl: string, healthEndpoint: string): string {
  const base = apiUrl.replace(/\/$/, '')
  const path = healthEndpoint.startsWith('/') ? healthEndpoint : `/${healthEndpoint}`
  return `${base}${path}`
}

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}s`
}

function asymptoticProgress(elapsedMs: number, ready: boolean): number {
  if (ready) return 100
  const t = Math.min(1, elapsedMs / PROGRESS_ASYMPTOTE_MS)
  // Ease toward 95% over PROGRESS_ASYMPTOTE_MS so the bar never looks stuck at 100 before wake.
  return Math.min(95, Math.round((1 - Math.pow(1 - t, 1.55)) * 95))
}

function messagesForMode(appMode: ServerWakeupAppMode): string[] {
  if (appMode === 'consumer') return [...SHARED_MESSAGES, ...CONSUMER_MESSAGES]
  if (appMode === 'proposal') return [...SHARED_MESSAGES, ...PROPOSAL_MESSAGES]
  return [...SHARED_MESSAGES, ...CRM_MESSAGES]
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12a9 9 0 1 1-2.6-6.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type SolarCell = {
  id: string
  index: number
  points: string
}

function RayennaAnimatedLogo({
  progress,
  isReady,
  darkTheme = true,
}: {
  progress: number
  isReady: boolean
  darkTheme?: boolean
}) {
  const wordmark = darkTheme ? '#FFFFFF' : LOGO_NAVY
  const tagline = darkTheme ? '#FDE68A' : '#1E293B'
  // Both swooshes = official logo navy/purple (not bright blue).
  const swooshFill = LOGO_NAVY
  const activeCellsCount = Math.min(20, Math.max(1, Math.ceil((progress / 100) * 20)))

  const solarCells = useMemo(() => {
    const rows = 5
    const cols = 4
    const cells: SolarCell[] = []

    const topLeft = { x: 122, y: 46 }
    const topRight = { x: 244, y: 46 }
    const bottomLeft = { x: 34, y: 204 }
    const bottomRight = { x: 156, y: 204 }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const bilinear = (u: number, v: number) => {
      const topX = lerp(topLeft.x, topRight.x, u)
      const topY = lerp(topLeft.y, topRight.y, u)
      const botX = lerp(bottomLeft.x, bottomRight.x, u)
      const botY = lerp(bottomLeft.y, bottomRight.y, u)
      return { x: lerp(topX, botX, v), y: lerp(topY, botY, v) }
    }

    const padU = 0.028
    const padV = 0.022

    for (let r = rows - 1; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        const u0 = c / cols + padU
        const u1 = (c + 1) / cols - padU
        const v0 = r / rows + padV
        const v1 = (r + 1) / rows - padV
        const p1 = bilinear(u0, v0)
        const p2 = bilinear(u1, v0)
        const p3 = bilinear(u1, v1)
        const p4 = bilinear(u0, v1)
        const index = (rows - 1 - r) * cols + c
        cells.push({
          id: `cell-${r}-${c}`,
          index,
          points: `${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)} ${p4.x.toFixed(1)},${p4.y.toFixed(1)}`,
        })
      }
    }
    return cells
  }, [])

  const uid = useMemo(() => `swl-${Math.random().toString(36).slice(2, 9)}`, [])

  return (
    <div className="relative flex select-none flex-col items-center">
      <style>{`
        @keyframes rayennaBoltPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(253, 184, 19, 0.75)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 18px rgba(253, 184, 19, 1)); transform: scale(1.04); }
        }
        @keyframes rayennaSwooshFlow {
          0% { stroke-dashoffset: 320; opacity: 0.2; }
          50% { opacity: 0.95; }
          100% { stroke-dashoffset: 0; opacity: 0.2; }
        }
        @keyframes rayennaCellGlow {
          0%, 100% { opacity: 0.88; }
          50% { opacity: 1; }
        }
        @keyframes rayennaSparkFloat {
          0% { transform: translateY(0px) scale(0.8); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(-22px) scale(1.2); opacity: 0; }
        }
        .rayenna-bolt { transform-origin: 215px 135px; animation: rayennaBoltPulse 2.2s ease-in-out infinite; }
        .rayenna-swoosh-beam { stroke-dasharray: 95 225; animation: rayennaSwooshFlow 2.8s linear infinite; }
        .rayenna-spark-1 { animation: rayennaSparkFloat 2.4s ease-out infinite; }
        .rayenna-spark-2 { animation: rayennaSparkFloat 2.4s ease-out 0.8s infinite; }
        .rayenna-spark-3 { animation: rayennaSparkFloat 2.4s ease-out 1.6s infinite; }
      `}</style>

      <div
        className="pointer-events-none absolute top-6 h-56 w-56 rounded-full blur-3xl transition-all duration-700"
        style={{
          background: isReady
            ? 'radial-gradient(circle, rgba(16,185,129,0.45) 0%, rgba(253,184,19,0.28) 55%, transparent 100%)'
            : 'radial-gradient(circle, rgba(253,184,19,0.55) 0%, rgba(10,20,69,0.35) 55%, transparent 100%)',
          transform: `scale(${0.95 + (progress / 100) * 0.3})`,
        }}
      />

      <svg
        viewBox="0 0 380 285"
        className="h-auto w-64 overflow-visible drop-shadow-md sm:w-72 md:w-80"
        role="img"
        aria-label="Rayenna Energy"
      >
        <defs>
          <linearGradient id={`${uid}-panel`} x1="15%" y1="95%" x2="78%" y2="8%">
            <stop offset="0%" stopColor="#D4A574" />
            <stop offset="30%" stopColor="#8B7A9A" />
            <stop offset="65%" stopColor="#3D5CCC" />
            <stop offset="100%" stopColor="#2439A8" />
          </linearGradient>
          <linearGradient id={`${uid}-panelActive`} x1="10%" y1="95%" x2="85%" y2="5%">
            <stop offset="0%" stopColor="#F5C27A" />
            <stop offset="28%" stopColor="#FDB813" />
            <stop offset="62%" stopColor="#5B7CFF" />
            <stop offset="100%" stopColor="#2E4FD6" />
          </linearGradient>
          <linearGradient id={`${uid}-bolt`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF3BF" />
            <stop offset="40%" stopColor="#FDB813" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id={`${uid}-shimmer`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={AMBER} stopOpacity="0" />
            <stop offset="50%" stopColor="#FFE566" stopOpacity="1" />
            <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g>
          {solarCells.map((cell) => {
            const isCharged = cell.index < activeCellsCount
            const isChargingEdge = cell.index === activeCellsCount - 1 && !isReady
            return (
              <polygon
                key={cell.id}
                points={cell.points}
                fill={isCharged ? `url(#${uid}-panelActive)` : `url(#${uid}-panel)`}
                opacity={isCharged ? 1 : darkTheme ? 0.72 : 0.5}
                stroke={
                  isChargingEdge
                    ? AMBER
                    : isCharged
                      ? 'rgba(255,255,255,0.7)'
                      : 'rgba(255,255,255,0.35)'
                }
                strokeWidth={isChargingEdge ? 1.4 : 0.7}
                style={{
                  transition: 'opacity 0.45s ease, fill 0.45s ease',
                  animation: isChargingEdge ? 'rayennaCellGlow 1.1s infinite' : 'none',
                  filter: isCharged ? 'brightness(1.12)' : undefined,
                }}
              />
            )
          })}
        </g>

        {/* Right swoosh — logo navy/purple */}
        <path d="M 248 46 L 348 175 L 256 175 C 296 154 306 118 248 46 Z" fill={swooshFill} />

        <g className="rayenna-bolt">
          <polygon points="256,62 192,143 216,143 174,218 238,134 214,134" fill={`url(#${uid}-bolt)`} />
        </g>

        <circle cx="242" cy="96" r="2.8" fill="#FFE566" className="rayenna-spark-1" />
        <circle cx="188" cy="168" r="2.4" fill="#FDB813" className="rayenna-spark-2" />
        <circle cx="232" cy="155" r="2.2" fill="#FFF7CC" className="rayenna-spark-3" />

        {/* Left swoosh — same logo navy/purple */}
        <path d="M 114 46 C 14 102 18 176 232 175 C 62 166 36 108 114 46 Z" fill={swooshFill} />
        <path
          d="M 112 48 C 24 102 28 172 226 174"
          fill="none"
          stroke={`url(#${uid}-shimmer)`}
          strokeWidth="4"
          strokeLinecap="round"
          className="rayenna-swoosh-beam"
        />

        <text
          x="190"
          y="246"
          textAnchor="middle"
          fill={wordmark}
          style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            fontWeight: 800,
            fontSize: '30px',
            letterSpacing: '0.03em',
          }}
        >
          RAYENNA ENERGY
        </text>
        <text
          x="190"
          y="268"
          textAnchor="middle"
          fill={tagline}
          style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            fontWeight: 700,
            fontSize: '11.2px',
            letterSpacing: '0.085em',
          }}
        >
          THE RESPONSIBLE ENERGY COMPANY
        </text>
      </svg>
    </div>
  )
}

export default function ServerWakeupLoader({
  apiUrl,
  healthEndpoint = DEFAULT_HEALTH_ENDPOINT,
  appMode = 'crm',
  onReady,
  initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
  previewDelayMs = 0,
  backgroundImageUrl = '/background.jpg',
}: ServerWakeupLoaderProps) {
  // Cold-start path passes initialDelayMs=0 — show immediately (no null flash / flicker).
  const [showOverlay, setShowOverlay] = useState(previewDelayMs > 0 || initialDelayMs <= 0)
  const [isReady, setIsReady] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)
  const [fadeMessage, setFadeMessage] = useState(true)
  const [showSlowFallback, setShowSlowFallback] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const readyFiredRef = useRef(false)
  const startRef = useRef(Date.now())

  const healthUrl = useMemo(() => joinUrl(apiUrl, healthEndpoint), [apiUrl, healthEndpoint])
  const deck = useMemo(() => messagesForMode(appMode), [appMode])
  const subtitle =
    appMode === 'consumer'
      ? 'Solar Hub · homeowner energy dashboard'
      : appMode === 'proposal'
        ? 'Proposal · shared solar proposal link'
        : 'CRM · solar operations & pipeline'

  const markReady = useCallback(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    setIsReady(true)
    setShowSlowFallback(false)
    window.setTimeout(() => {
      onReadyRef.current()
    }, 450)
  }, [])

  // Elapsed timer (only meaningful once overlay may show / cold start).
  useEffect(() => {
    startRef.current = Date.now()
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - startRef.current)
    }, 200)
    return () => window.clearInterval(tick)
  }, [retryToken])

  // Reveal overlay only after initialDelayMs if still not ready (skip delay in preview / cold-start).
  useEffect(() => {
    if (isReady) return
    if (previewDelayMs > 0 || initialDelayMs <= 0) {
      setShowOverlay(true)
      return
    }
    const t = window.setTimeout(() => setShowOverlay(true), initialDelayMs)
    return () => window.clearTimeout(t)
  }, [initialDelayMs, isReady, previewDelayMs, retryToken])

  // Slow fallback after SLOW_FALLBACK_MS (currently 120s).
  useEffect(() => {
    if (isReady) return
    const t = window.setTimeout(() => setShowSlowFallback(true), SLOW_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [isReady, retryToken])

  // Health polling with AbortController + per-request timeout.
  useEffect(() => {
    let cancelled = false
    let pollTimer: number | null = null
    const controllers: AbortController[] = []

    const ping = async () => {
      if (cancelled || readyFiredRef.current) return
      const controller = new AbortController()
      controllers.push(controller)
      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const res = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!cancelled && res.ok) {
          // Preview: hold the overlay so a warm local API still looks like a cold start.
          if (previewDelayMs > 0 && Date.now() - startRef.current < previewDelayMs) {
            // keep polling until preview window ends
          } else {
            markReady()
            return
          }
        }
      } catch {
        // Cold start / abort / network — keep polling.
      } finally {
        window.clearTimeout(timeoutId)
      }
      if (!cancelled && !readyFiredRef.current) {
        pollTimer = window.setTimeout(ping, POLL_INTERVAL_MS)
      }
    }

    void ping()

    return () => {
      cancelled = true
      if (pollTimer != null) window.clearTimeout(pollTimer)
      controllers.forEach((c) => c.abort())
    }
  }, [healthUrl, markReady, previewDelayMs, retryToken])

  // Rotate messages every 4.5s.
  useEffect(() => {
    if (isReady || !showOverlay) return
    const timer = window.setInterval(() => {
      setFadeMessage(false)
      window.setTimeout(() => {
        setMessageIndex((i) => (i + 1) % deck.length)
        setFadeMessage(true)
      }, 280)
    }, MESSAGE_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [isReady, showOverlay, deck.length])

  const progress = asymptoticProgress(elapsedMs, isReady)
  const activeMessage = deck[messageIndex] ?? deck[0]

  if (!showOverlay && !isReady) {
    return null
  }

  if (isReady && !showOverlay) {
    // Warm path finished before delay — never flash UI.
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto bg-[color:var(--bg-page)] px-4 py-8 [-webkit-tap-highlight-color:transparent]"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Waking up Rayenna servers"
    >
      {/* Same wallpaper as Login */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        aria-hidden
      />

      {/* Same dark glass card language as Login */}
      <div className="relative z-10 w-full max-w-xl space-y-4 overflow-hidden rounded-2xl border border-[color:var(--nav-border)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:color-mix(in_srgb,var(--nav-bg)_95%,transparent)] p-6 text-[color:var(--nav-text-active)] shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--border-default)] backdrop-blur-md sm:space-y-5 sm:p-8">
        <div
          className="absolute left-0 right-0 top-0 h-1 transition-all duration-300"
          style={{
            background: isReady
              ? 'linear-gradient(90deg, #10B981, #34D399)'
              : `linear-gradient(90deg, var(--accent-gold), ${AMBER}, var(--accent-gold))`,
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-gold)_12%)] px-3 py-1 text-xs font-semibold tracking-wide text-[color:var(--accent-gold)]">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  isReady ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isReady ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            {appMode === 'consumer'
              ? 'Rayenna Solar Hub'
              : appMode === 'proposal'
                ? 'Rayenna Proposal'
                : 'Rayenna CRM'}
          </div>
          <span className="rounded-md border border-[color:var(--border-default)] bg-[color:color-mix(in_srgb,var(--nav-bg)_85%,transparent)] px-2.5 py-1 font-mono text-[11px] font-medium text-[color:var(--nav-text)]">
            {isReady ? 'ONLINE · 100%' : formatElapsed(elapsedMs / 1000)}
          </span>
        </div>

        <div className="my-1 sm:my-2">
          <RayennaAnimatedLogo progress={progress} isReady={isReady} darkTheme />
        </div>

        <p className="text-center text-[11px] font-medium tracking-wide text-[color:var(--nav-text)]">
          {subtitle}
        </p>

        <div
          className={`flex min-h-[88px] flex-col justify-center rounded-xl border p-4 transition-all duration-300 sm:p-5 ${
            isReady
              ? 'border-[color:var(--accent-teal-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-teal)_12%)]'
              : 'border-[color:var(--border-default)] bg-[color:color-mix(in_srgb,var(--nav-bg)_92%,transparent)]'
          }`}
        >
          {isReady ? (
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-[color:color-mix(in_srgb,var(--accent-teal)_20%,transparent)] p-2 text-[color:var(--accent-teal)]">
                <CheckIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-[color:var(--accent-teal)]">
                  Grid connected
                </p>
                <p className="text-sm font-semibold text-[color:var(--nav-text-active)] sm:text-base">
                  Backend is awake — signing you in…
                </p>
              </div>
            </div>
          ) : (
            <p
              className={`text-sm font-medium leading-relaxed text-[color:var(--nav-text-active)] transition-all duration-300 sm:text-base ${
                fadeMessage ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
              }`}
            >
              {activeMessage}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold sm:text-sm">
            <span className={isReady ? 'text-[color:var(--accent-teal)]' : 'text-[color:var(--accent-gold)]'}>
              {isReady ? 'Full power' : 'Waking the solar grid…'}
            </span>
            <span
              className={`font-mono font-bold ${
                isReady ? 'text-[color:var(--accent-teal)]' : 'text-[color:var(--accent-gold)]'
              }`}
            >
              {progress}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-[color:var(--border-default)] bg-[color:color-mix(in_srgb,var(--nav-bg)_80%,transparent)] p-0.5">
            <div
              className="relative h-full overflow-hidden rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: isReady
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : `linear-gradient(90deg, ${LOGO_NAVY} 0%, var(--accent-gold) 55%, ${AMBER} 100%)`,
              }}
            >
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                }}
              />
            </div>
          </div>
        </div>

        {showSlowFallback && !isReady ? (
          <div className="rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-gold)_12%)] p-4 text-center">
            <p className="text-sm font-medium text-[color:var(--nav-text-active)]">
              Still warming up—Render&apos;s free tier is stretching its legs...
            </p>
            <button
              type="button"
              onClick={() => {
                readyFiredRef.current = false
                setIsReady(false)
                setShowSlowFallback(false)
                setElapsedMs(0)
                setRetryToken((n) => n + 1)
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition hover:opacity-95"
            >
              <RefreshIcon className="h-4 w-4" />
              Retry Ping
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
