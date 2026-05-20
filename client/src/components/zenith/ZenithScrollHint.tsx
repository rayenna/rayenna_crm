/** Shown beside horizontally scrollable Zenith tables on narrow screens. */
export default function ZenithScrollHint({ className = '' }: { className?: string }) {
  return (
    <p
      className={`zenith-scroll-hint lg:hidden text-[10px] text-[color:var(--text-muted)] ${className}`.trim()}
      aria-hidden
    >
      Swipe sideways for more columns →
    </p>
  )
}
