import { useMyDayContext } from '../../contexts/MyDayContext'

interface Props {
  variant: 'briefing' | 'nav'
  /** Optional callback fired before the drawer opens (e.g. dismiss briefing popup) */
  onBeforeOpen?: () => void
}

export default function MyDayButton({ variant, onBeforeOpen }: Props) {
  const { open, isOpen, incompleteTasks } = useMyDayContext()

  const handleClick = () => {
    onBeforeOpen?.()
    open()
  }

  if (variant === 'nav') {
    return (
      <button
        type="button"
        aria-label="Open My Day"
        title="My Day (Ctrl+Shift+M)"
        onClick={handleClick}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          border: isOpen
            ? '1px solid var(--accent-gold-border)'
            : '1px solid var(--nav-border)',
          background: isOpen ? 'var(--accent-gold-muted)' : 'var(--nav-active-bg)',
          color: isOpen ? 'var(--accent-gold)' : 'var(--nav-text-hover)',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 150ms, border-color 150ms',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        {incompleteTasks > 0 && (
          <span
            aria-label={`${incompleteTasks} open tasks`}
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-gold)',
              border: '1.5px solid var(--nav-bg, #111118)',
              pointerEvents: 'none',
            }}
          />
        )}
      </button>
    )
  }

  // briefing variant — amber ghost style matching the briefing footer
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 40,
        padding: '0 18px',
        borderRadius: 12,
        border: '1px solid var(--accent-gold-border)',
        background: 'var(--accent-gold-muted)',
        color: 'var(--accent-gold)',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      📝 My Day
    </button>
  )
}
