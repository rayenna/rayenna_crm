import { AskFavoriteStar } from './ZenithAskPrefsBar'
import type { ZenithAskPreferences } from '../../utils/zenithAskPreferencesStorage'

type Props = {
  question: string
  disabled?: boolean
  preferences: ZenithAskPreferences
  onAsk: () => void
  onFavoritesChange: (next: string[]) => void
}

export default function AskChipWithFav({
  question,
  disabled,
  preferences,
  onAsk,
  onFavoritesChange,
}: Props) {
  return (
    <span className="zenith-ask-chip-wrap">
      <button
        type="button"
        disabled={disabled}
        onClick={onAsk}
        className="zenith-ask-examples__chip"
      >
        {question}
      </button>
      <AskFavoriteStar
        question={question}
        preferences={preferences}
        disabled={disabled}
        onToggle={onFavoritesChange}
      />
    </span>
  )
}
