import { ArrowUp, MessageSquareText, Sparkles } from 'lucide-react'
import { scrollToZenithElementId } from './zenithScrollToSection'

type Props = {
  onShowBriefing?: () => void
  /** Open the mobile Ask tab (shown when Ask is available and not already on that tab). */
  onOpenAsk?: () => void
  showAskLauncher?: boolean
  showBriefingLauncher?: boolean
  showBackToTop?: boolean
}

export default function ZenithMobileStickyActions({
  onShowBriefing,
  onOpenAsk,
  showAskLauncher = false,
  showBriefingLauncher = true,
  showBackToTop = true,
}: Props) {
  if (!showAskLauncher && !showBriefingLauncher && !showBackToTop) return null
  return (
    <div className="zenith-mobile-sticky-actions lg:hidden" aria-label="Quick actions">
      {showAskLauncher && onOpenAsk ? (
        <button
          type="button"
          onClick={onOpenAsk}
          title="Ask Zenith"
          className="zenith-mobile-sticky-btn zenith-mobile-sticky-btn--ask touch-manipulation"
        >
          <MessageSquareText className="h-5 w-5" aria-hidden />
          <span className="sr-only">Ask Zenith</span>
        </button>
      ) : null}
      {showBriefingLauncher && onShowBriefing ? (
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
      {showBackToTop ? (
        <button
          type="button"
          onClick={() => scrollToZenithElementId('zenith-mobile-nav-sentinel')}
          title="Back to top"
          className="zenith-mobile-sticky-btn touch-manipulation"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
          <span className="sr-only">Back to top</span>
        </button>
      ) : null}
    </div>
  )
}
