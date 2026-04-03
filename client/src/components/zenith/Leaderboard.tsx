import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { Trophy, ChevronDown } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import type { ZenithDateFilter } from './zenithTypes'
import {
  buildLeaderboardDrawerLabel,
  computeLeaderboard,
  formatINR,
  formatINRCompact,
  getAvatarColor,
  getInitials,
  getLeaderboardDealsForSalesperson,
  getLeaderboardDealsInPeriod,
  getNextResetDate,
  getPeriodLabel,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '../../utils/leaderboardUtils'
import { buildLeaderboardPeriodProjectsHref } from '../../utils/zenithListProjectsDeepLink'

const PERIODS: LeaderboardPeriod[] = ['month', 'quarter', 'fy']

type Props = {
  projects: ZenithExplorerProject[]
  currentUser: { id: string; name: string }
  defaultOpen?: boolean
  dateFilter: ZenithDateFilter
  /** Same quick drawer list mode as chart drill-down */
  onOpenListMode?: (args: {
    filterLabel: string
    filteredProjects: ZenithExplorerProject[]
    projectsPageHref?: string | null
  }) => void
}

function cyclePeriod(p: LeaderboardPeriod): LeaderboardPeriod {
  const i = PERIODS.indexOf(p)
  return PERIODS[(i + 1) % PERIODS.length]!
}

export default function Leaderboard({
  projects,
  currentUser,
  defaultOpen,
  dateFilter,
  onOpenListMode,
}: Props) {
  const isMobile = useIsMobile()
  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const [isOpen, setIsOpen] = useState(() =>
    defaultOpen !== undefined ? defaultOpen : typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  )
  const [barsReady, setBarsReady] = useState(false)

  const { ranked, topRevenue, periodRevenue, periodDeals } = useMemo(
    () => computeLeaderboard(projects, period),
    [projects, period],
  )

  const barKey = useMemo(
    () => `${period}-${topRevenue}-${ranked.map((r) => `${r.name}:${r.revenue}`).join('|')}`,
    [period, topRevenue, ranked],
  )

  useEffect(() => {
    setBarsReady(false)
    const t = window.setTimeout(() => setBarsReady(true), 100)
    return () => window.clearTimeout(t)
  }, [barKey])

  const currentUserName = currentUser?.name?.trim() ?? ''

  const cardStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderLeft: '3px solid #F5A623',
    borderRadius: '0 12px 12px 0',
    marginBottom: 16,
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
  }

  const openPeriodDeals = () => {
    if (!onOpenListMode) return
    onOpenListMode({
      filterLabel: buildLeaderboardDrawerLabel(period),
      filteredProjects: getLeaderboardDealsInPeriod(projects, period),
      projectsPageHref: buildLeaderboardPeriodProjectsHref(period, dateFilter),
    })
  }

  return (
    <div className="w-full min-w-0" style={cardStyle}>
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 border-0 bg-transparent text-left cursor-pointer"
          style={{ userSelect: 'none' }}
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
        >
          <Trophy size={16} color="#F5A623" className="shrink-0" aria-hidden />
          <span className="min-w-0">
            <span
              className="zenith-display text-lg sm:text-xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              The Board
            </span>
            <span
              className="text-[11px] text-white/35 ml-1.5 whitespace-nowrap"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {getPeriodLabel(period)}
            </span>
          </span>
          <ChevronDown
            size={14}
            className="text-white/30 transition-transform duration-300 shrink-0 ml-1"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden
          />
        </button>

        <div
          className="flex items-center gap-2 flex-1 justify-center min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {isMobile ? (
            <button
              type="button"
              className="rounded-full border px-2.5 py-1 text-[10px] font-medium max-w-[200px] truncate"
              style={{
                background: 'rgba(245,166,35,0.15)',
                borderColor: 'rgba(245,166,35,0.4)',
                color: '#F5A623',
              }}
              onClick={() => setPeriod(cyclePeriod)}
              aria-label={`Period ${getPeriodLabel(period)}, tap to change`}
            >
              {getPeriodLabel(period)}
            </button>
          ) : (
            PERIODS.map((p) => {
              const active = period === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className="rounded-full border px-2.5 py-0.5 text-[10px] capitalize"
                  style={
                    active
                      ? {
                          background: 'rgba(245,166,35,0.15)',
                          border: '1px solid rgba(245,166,35,0.4)',
                          color: '#F5A623',
                          fontWeight: 500,
                        }
                      : {
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.4)',
                        }
                  }
                >
                  {p}
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isMobile && onOpenListMode ? (
            <button
              type="button"
              className="text-right rounded-lg border-0 px-2 py-1 transition-colors cursor-pointer bg-transparent hover:bg-white/[0.06]"
              onClick={openPeriodDeals}
              title="Open deals in quick drawer (same as chart drill-down)"
            >
              <div className="text-xs font-semibold" style={{ color: '#F5A623' }}>
                {formatINR(periodRevenue)}
              </div>
              <div className="text-[10px] text-white/30">{periodDeals} deals</div>
            </button>
          ) : !isMobile ? (
            <div className="text-right">
              <div className="text-xs font-semibold" style={{ color: '#F5A623' }}>
                {formatINR(periodRevenue)}
              </div>
              <div className="text-[10px] text-white/30">{periodDeals} deals</div>
            </div>
          ) : onOpenListMode && periodDeals > 0 ? (
            <button
              type="button"
              className="text-[10px] font-semibold shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[#F5A623] bg-transparent hover:bg-white/[0.06]"
              onClick={openPeriodDeals}
            >
              View {periodDeals} deals
            </button>
          ) : null}
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {ranked.length === 0 ? (
          <div className="text-center px-4" style={{ padding: '28px 16px' }}>
            <Trophy size={24} className="mx-auto text-white/[0.12]" aria-hidden />
            <p className="text-[13px] text-white/30 mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              No closed deals in {getPeriodLabel(period)}
            </p>
            <p className="text-[11px] text-white/20 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Close the first deal to start the board
            </p>
          </div>
        ) : (
          <ul className="list-none p-0 m-0">
            {ranked.map((entry) => (
              <LeaderboardRow
                key={entry.name}
                entry={entry}
                topRevenue={topRevenue}
                currentUserName={currentUserName}
                isMobile={isMobile}
                barsReady={barsReady}
                onOpenDeals={
                  onOpenListMode
                    ? () => {
                        const filtered = getLeaderboardDealsForSalesperson(
                          projects,
                          period,
                          entry.name,
                        )
                        const sid =
                          entry.name.trim() === 'Unassigned'
                            ? null
                            : (filtered.find((p) => p.assigned_to_id)?.assigned_to_id ?? null)
                        onOpenListMode({
                          filterLabel: buildLeaderboardDrawerLabel(period, entry.name),
                          filteredProjects: filtered,
                          projectsPageHref: buildLeaderboardPeriodProjectsHref(period, dateFilter, {
                            salespersonId: sid ?? undefined,
                            unassignedOnly: entry.name.trim() === 'Unassigned',
                          }),
                        })
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        )}

        {ranked.length > 0 ? (
          <div
            className="flex justify-between gap-2 px-4 py-2 border-t border-white/[0.04]"
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.18)',
              fontStyle: 'italic',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span>Resets {getNextResetDate(period)}</span>
            <span className="text-right">Ranked by confirmed order value</span>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

function LeaderboardRow({
  entry,
  topRevenue,
  currentUserName,
  isMobile,
  barsReady,
  onOpenDeals,
}: {
  entry: LeaderboardEntry
  topRevenue: number
  currentUserName: string
  isMobile: boolean
  barsReady: boolean
  onOpenDeals?: () => void
}) {
  const firstToken = entry.name.split(' ')[0] ?? ''
  const isCurrentUser =
    entry.name === currentUserName ||
    (firstToken.length > 0 && currentUserName.startsWith(firstToken))
  const fillPct = topRevenue > 0 ? (entry.revenue / topRevenue) * 100 : 0
  const barColor = isCurrentUser ? '#F5A623' : getAvatarColor(entry.name)

  return (
    <li
      className="flex items-center gap-3 border-b border-white/[0.04] transition-colors duration-150"
      style={{
        padding: '10px 16px',
        background: isCurrentUser ? 'rgba(245,166,35,0.06)' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isCurrentUser) (e.currentTarget as HTMLLIElement).style.background = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLLIElement
        el.style.background = isCurrentUser ? 'rgba(245,166,35,0.06)' : 'transparent'
      }}
    >
      <div className="w-6 text-center shrink-0" style={{ fontFamily: "'Syne', sans-serif" }}>
        {entry.rank === 1 ? (
          <span className="text-lg" aria-hidden>
            🥇
          </span>
        ) : entry.rank === 2 ? (
          <span className="text-lg" aria-hidden>
            🥈
          </span>
        ) : entry.rank === 3 ? (
          <span className="text-lg" aria-hidden>
            🥉
          </span>
        ) : (
          <span className="text-[13px] font-bold text-white/30">{entry.rank}</span>
        )}
      </div>

      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0A0A0F]"
        style={{
          background: getAvatarColor(entry.name),
          fontFamily: "'Syne', sans-serif",
          boxShadow: isCurrentUser ? '0 0 0 2px #F5A623' : undefined,
        }}
      >
        {getInitials(entry.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="truncate text-[13px] font-medium"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: isCurrentUser ? '#F5A623' : '#fff',
            }}
          >
            {entry.name}
          </span>
          {isCurrentUser ? (
            <span
              className="shrink-0 rounded-[10px] border px-1.5 py-px text-[9px] font-semibold"
              style={{
                background: 'rgba(245,166,35,0.2)',
                borderColor: 'rgba(245,166,35,0.4)',
                color: '#F5A623',
              }}
            >
              YOU
            </span>
          ) : null}
        </div>
        {!isMobile ? (
          <div
            className="mt-1.5 h-[3px] overflow-hidden rounded-sm"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-sm"
              style={{
                width: barsReady ? `${fillPct}%` : '0%',
                background: barColor,
                opacity: isCurrentUser ? 1 : 0.5,
                transition: 'width 0.7s ease-out',
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        {onOpenDeals ? (
          <button
            type="button"
            className="w-full border-0 bg-transparent p-0 text-right rounded-lg px-1 py-0.5 transition-colors hover:bg-white/[0.06] cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              onOpenDeals()
            }}
            title="Open these deals in the quick drawer"
          >
            <div
              className="font-bold tabular-nums underline-offset-2 hover:underline"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: isMobile ? 12 : 14,
                color: isCurrentUser ? '#F5A623' : '#fff',
              }}
            >
              {isMobile ? formatINRCompact(entry.revenue) : formatINR(entry.revenue)}
            </div>
            <div className="text-[10px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {entry.deals} deal{entry.deals !== 1 ? 's' : ''}
            </div>
          </button>
        ) : (
          <>
            <div
              className="font-bold tabular-nums"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: isMobile ? 12 : 14,
                color: isCurrentUser ? '#F5A623' : '#fff',
              }}
            >
              {isMobile ? formatINRCompact(entry.revenue) : formatINR(entry.revenue)}
            </div>
            <div className="text-[10px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {entry.deals} deal{entry.deals !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </li>
  )
}
