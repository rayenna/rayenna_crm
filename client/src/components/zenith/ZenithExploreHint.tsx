/** Drill-down cue — tap on phones, click on desktop. */
export default function ZenithExploreHint() {
  return (
    <span
      className="zenith-explore-hint shrink-0 pt-0.5 italic text-[10px] max-lg:text-[11px] text-[color:var(--text-muted)]"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <span className="lg:hidden">Tap to explore →</span>
      <span className="hidden lg:inline">Click to explore →</span>
    </span>
  )
}
