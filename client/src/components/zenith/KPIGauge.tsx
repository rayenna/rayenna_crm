import { useEffect, useState } from 'react'

type Props = {
  totalKW: number
  pipelineKW: number | null
  targetKW: number | null
}

const ARC_LENGTH = 141

export default function KPIGauge({ totalKW, pipelineKW, targetKW }: Props) {
  const [animated, setAnimated] = useState(false)
  const [pipelineAnimated, setPipelineAnimated] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setAnimated(true), 150)
    const t2 = setTimeout(() => setPipelineAnimated(true), 350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const safeTotal = Math.max(0, Number(totalKW) || 0)
  const hasTarget = Number.isFinite(Number(targetKW)) && Number(targetKW) > 0
  const safePipeline = Number.isFinite(Number(pipelineKW)) ? Math.max(0, Number(pipelineKW) || 0) : 0
  const safeTarget = hasTarget ? Math.max(1, Number(targetKW)) : 1

  const installedPct = Math.min(safeTotal / safeTarget, 1)
  const combinedPct = Math.min((safeTotal + safePipeline) / safeTarget, 1)
  const progressPct = Math.round(installedPct * 100)

  const installedOffset = ARC_LENGTH - ARC_LENGTH * installedPct
  const pipelineOffset = ARC_LENGTH - ARC_LENGTH * combinedPct

  const progressColor =
    progressPct >= 80 ? 'var(--accent-teal)' : progressPct >= 50 ? 'var(--accent-gold)' : 'var(--accent-red)'

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--accent-gold-border)',
        borderRadius: 14,
        padding: '14px 16px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        minHeight: 130,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'DM Sans, sans-serif',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 60,
          background: 'radial-gradient(ellipse, color-mix(in srgb, var(--accent-gold) 14%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          alignSelf: 'flex-start',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        TOTAL CAPACITY
      </div>

      <svg width="110" height="68" viewBox="0 0 110 72" style={{ overflow: 'visible', marginTop: '-2px' }}>
        <defs>
          <linearGradient id="kwGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-gold)" />
            <stop offset="100%" stopColor="var(--accent-teal)" />
          </linearGradient>
        </defs>

        <path
          d="M 10 65 A 45 45 0 0 1 100 65"
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        <path
          d="M 10 65 A 45 45 0 0 1 100 65"
          fill="none"
          stroke="var(--accent-teal-muted)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={pipelineAnimated ? pipelineOffset : ARC_LENGTH}
          style={{
            transition: pipelineAnimated
              ? 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)'
              : 'none',
          }}
        />

        <path
          d="M 10 65 A 45 45 0 0 1 100 65"
          fill="none"
          stroke="url(#kwGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={animated ? installedOffset : ARC_LENGTH}
          style={{
            transition: animated
              ? 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)'
              : 'none',
          }}
        />

        <line
          x1="55"
          y1="22"
          x2="55"
          y2="16"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="55"
          y="13"
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="7"
          fontFamily="DM Sans, sans-serif"
        >
          {hasTarget ? Math.round(safeTarget) : 'N/A'}
        </text>

        <text
          x="55"
          y="58"
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="21"
          fontWeight="700"
          fontFamily="Syne, sans-serif"
        >
          {safeTotal}
        </text>
        <text
          x="55"
          y="68"
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="8"
          fontFamily="DM Sans, sans-serif"
        >
          kW installed
        </text>
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '0 4px',
          marginTop: 6,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Pipeline</span>
          {hasTarget ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-teal)' }}>
              +{Math.round(safePipeline)} kW
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>N/A</span>
          )}
        </div>

        <div
          style={{
            width: 1,
            background: 'var(--border-default)',
            height: 28,
            alignSelf: 'center',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Target</span>
          {hasTarget ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-gold)' }}>
              {Math.round(safeTarget)} kW
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>N/A</span>
          )}
        </div>

        <div
          style={{
            width: 1,
            background: 'var(--border-default)',
            height: 28,
            alignSelf: 'center',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Progress</span>
          {hasTarget ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: progressColor }}>
              {Math.min(100, progressPct)}%
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>N/A</span>
          )}
        </div>
      </div>
    </div>
  )
}
