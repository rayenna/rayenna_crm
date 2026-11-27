import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import {
  ASK_DEFAULT_PERIOD_LABELS,
  ASK_DEFAULT_PERIODS,
  type AskDefaultPeriod,
  type ZenithAskPreferences,
  writeZenithAskPreferences,
} from '../../utils/zenithAskPreferencesStorage'

type Props = {
  userId: string
  preferences: ZenithAskPreferences
  onPreferencesChange: (next: ZenithAskPreferences) => void
  /** Compact for floating dock */
  dense?: boolean
}

export default function ZenithAskPrefsBar({
  userId,
  preferences,
  onPreferencesChange,
  dense = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = useCallback(
    async (patch: Partial<ZenithAskPreferences>) => {
      const next: ZenithAskPreferences = {
        defaultPeriod: patch.defaultPeriod ?? preferences.defaultPeriod,
        favoriteQuestions: patch.favoriteQuestions ?? preferences.favoriteQuestions,
      }
      onPreferencesChange(next)
      writeZenithAskPreferences(userId, next)
      setSaving(true)
      try {
        const { data } = await axiosInstance.put<{ preferences: ZenithAskPreferences }>(
          '/api/dashboard/zenith-ask-preferences',
          next,
        )
        if (data?.preferences) {
          onPreferencesChange(data.preferences)
          writeZenithAskPreferences(userId, data.preferences)
        }
      } catch (err: unknown) {
        toast.error(getFriendlyApiErrorMessage(err) || 'Could not save Ask preferences')
      } finally {
        setSaving(false)
      }
    },
    [onPreferencesChange, preferences, userId],
  )

  return (
    <div className={`zenith-ask-prefs${dense ? ' zenith-ask-prefs--dense' : ''}`}>
      <button
        type="button"
        className="zenith-ask-prefs__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Ask prefs{saving ? '…' : ''}
      </button>
      {open ? (
        <div className="zenith-ask-prefs__panel">
          <label className="zenith-ask-prefs__field">
            <span>Default period</span>
            <select
              value={preferences.defaultPeriod}
              onChange={(e) => {
                const v = e.target.value as AskDefaultPeriod
                void save({ defaultPeriod: v })
              }}
              aria-label="Ask default period"
            >
              {ASK_DEFAULT_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {ASK_DEFAULT_PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <p className="zenith-ask-prefs__hint">
            Used when Zenith filters are empty and the question has no dates. Synced across devices.
            Star chips below to pin favorites.
          </p>
          {preferences.favoriteQuestions.length > 0 ? (
            <ul className="zenith-ask-prefs__favorites">
              {preferences.favoriteQuestions.map((q) => (
                <li key={q}>
                  <span>{q}</span>
                  <button
                    type="button"
                    className="zenith-ask-prefs__unpin"
                    aria-label={`Unpin ${q}`}
                    onClick={() =>
                      void save({
                        favoriteQuestions: preferences.favoriteQuestions.filter((x) => x !== q),
                      })
                    }
                  >
                    Unpin
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="zenith-ask-prefs__hint">No favorites yet.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function AskFavoriteStar({
  question,
  preferences,
  onToggle,
  disabled,
}: {
  question: string
  preferences: ZenithAskPreferences
  onToggle: (nextFavorites: string[]) => void
  disabled?: boolean
}) {
  const favorited = preferences.favoriteQuestions.some(
    (q) => q.toLowerCase() === question.trim().toLowerCase(),
  )
  return (
    <button
      type="button"
      className={`zenith-ask-fav${favorited ? ' is-on' : ''}`}
      title={favorited ? 'Unpin favorite' : 'Pin as favorite (cross-device)'}
      aria-pressed={favorited}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const q = question.trim()
        if (!q) return
        if (favorited) {
          onToggle(
            preferences.favoriteQuestions.filter((x) => x.toLowerCase() !== q.toLowerCase()),
          )
        } else {
          onToggle(
            [q, ...preferences.favoriteQuestions.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(
              0,
              8,
            ),
          )
        }
      }}
    >
      ★
    </button>
  )
}
