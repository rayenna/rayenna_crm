interface Props {
  label: string
}

export default function ProjectPinBadge({ label }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        background: 'var(--accent-blue-muted)',
        color: 'var(--accent-blue)',
        border: '1px solid var(--accent-blue-border)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.7 }}>
        <path d="M10.5 5.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-4.5 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </svg>
      {label}
    </span>
  )
}
