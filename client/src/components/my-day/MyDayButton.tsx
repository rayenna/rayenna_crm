import { useMyDayContext } from '../../contexts/MyDayContext'

interface Props {
  variant: 'briefing' | 'nav'
  onBeforeOpen?: () => void
}

/** Sunrise icon — a sun disc with 8 short rays, feels warm and inviting */
function SunriseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="myday-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Horizon line */}
      <path
        d="M3 17h18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Sun disc (half) */}
      <path
        d="M8 17a4 4 0 0 1 8 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Rays */}
      <line x1="12" y1="3" x2="12" y2="5.5"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="16.59" y2="7.41"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="21" y1="12" x2="18.5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="5.64" y1="5.64" x2="7.41" y2="7.41"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="12" x2="5.5" y2="12"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function MyDayButton({ variant, onBeforeOpen }: Props) {
  const { open, isOpen, incompleteTasks } = useMyDayContext()

  const handleClick = () => {
    onBeforeOpen?.()
    open()
  }

  if (variant === 'nav') {
    const hasTasks = incompleteTasks > 0
    const countLabel = incompleteTasks > 9 ? '9+' : String(incompleteTasks)

    return (
      <button
        type="button"
        aria-label={`Open My Day${hasTasks ? ` — ${incompleteTasks} task${incompleteTasks !== 1 ? 's' : ''} remaining` : ''}`}
        title="My Day — Tasks, Journal & Reminders (Ctrl+Shift+M)"
        onClick={handleClick}
        className={[
          'myday-btn',
          isOpen ? 'myday-btn--open' : '',
          hasTasks && !isOpen ? 'myday-btn--pending' : '',
        ].filter(Boolean).join(' ')}
      >
        <SunriseIcon size={18} />
        {/* Label shown on lg+ */}
        <span className="myday-label hidden lg:inline">My Day</span>

        {/* Task count badge */}
        {hasTasks && (
          <span className="myday-badge" aria-hidden="true">
            {countLabel}
          </span>
        )}
      </button>
    )
  }

  // briefing variant — warm amber pill button
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 44,
        padding: '0 20px',
        borderRadius: 14,
        border: '1.5px solid color-mix(in srgb, var(--accent-gold) 55%, transparent)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--accent-gold) 24%, transparent) 0%, color-mix(in srgb, var(--accent-gold) 10%, transparent) 100%)',
        color: 'var(--accent-gold)',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'transform 160ms, box-shadow 160ms',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 0 14px color-mix(in srgb, var(--accent-gold) 30%, transparent)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = ''
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = ''
      }}
    >
      <SunriseIcon size={16} />
      Open My Day
    </button>
  )
}
