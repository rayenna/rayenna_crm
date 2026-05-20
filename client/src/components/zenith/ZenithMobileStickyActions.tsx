import { ArrowUp, Sparkles } from 'lucide-react'
import { scrollToZenithElementId } from './zenithScrollToSection'

type Props = {
  onShowBriefing?: () => void
}

export default function ZenithMobileStickyActions({ onShowBriefing }: Props) {
  return (
    <div className="zenith-mobile-sticky-actions lg:hidden" aria-label="Quick actions">
      {onShowBriefing ? (
        <button
          type="button"
          onClick={onShowBriefing}
          title="Daily Briefing"
          className="zenith-mobile-sticky-btn zenith-mobile-sticky-btn--briefing touch-manipulation"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          <span className="sr-only">Daily Briefing</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => scrollToZenithElementId('zenith-mobile-nav-sentinel')}
        title="Back to top"
        className="zenith-mobile-sticky-btn touch-manipulation"
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
        <span className="sr-only">Back to top</span>
      </button>
    </div>
  )
}
