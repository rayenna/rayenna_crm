export function GoogleMapsIconButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in Google Maps"
      aria-label="Open in Google Maps"
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] shadow-sm transition-all hover:bg-[color:var(--bg-card-hover)] hover:shadow"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2c-3.86 0-7 3.14-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z"
          fill="#EA4335"
        />
        <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" />
      </svg>
    </a>
  )
}
