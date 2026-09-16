export default function HubLiveDeyePill({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[color:var(--accent-green-border)] bg-[color:var(--accent-green-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--accent-green)] ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--accent-green)] opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--accent-green)]" />
      </span>
      Live · Deye Cloud
    </span>
  )
}
