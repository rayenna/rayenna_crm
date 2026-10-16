import { type FormEvent } from 'react'
import { ArrowUp, Mic, MicOff, Sparkles, X } from 'lucide-react'
import { useZenithAskSpeech } from '../../hooks/useZenithAskSpeech'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (question: string) => void
  loading?: boolean
  isOnline?: boolean
}

/**
 * Mobile-first Zenith Ask composer — gold card, large mic + Ask CTAs.
 */
export default function ZenithAskComposer({
  value,
  onChange,
  onSubmit,
  loading = false,
  isOnline = true,
}: Props) {
  const askSpeech = useZenithAskSpeech({
    enabled: isOnline && !loading,
    value,
    onChange,
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    askSpeech.stop()
    const q = value.trim()
    if (!q || loading || !isOnline) return
    onSubmit(q)
  }

  const handleClear = () => {
    askSpeech.stop()
    onChange('')
  }

  const hasText = Boolean(value.trim())

  return (
    <form
      onSubmit={handleSubmit}
      className="zenith-ask-composer w-full"
      role="search"
      aria-label="Zenith Ask"
    >
      <div className="zenith-ask-composer__shell">
        <div className="zenith-ask-composer__header">
          <span className="zenith-ask-composer__badge">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            Ask Zenith
          </span>
          <div className="zenith-ask-composer__header-meta">
            {hasText || askSpeech.listening ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="zenith-ask-composer__clear"
                title="Clear text"
                aria-label="Clear ask text"
              >
                <X className="w-3.5 h-3.5" aria-hidden strokeWidth={2.5} />
                <span>Clear</span>
              </button>
            ) : (
              <span className="zenith-ask-composer__hint">Type or speak</span>
            )}
          </div>
        </div>

        <label className="sr-only" htmlFor="zenith-ask-input">
          Ask Zenith
        </label>
        <textarea
          id="zenith-ask-input"
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            !isOnline
              ? 'Ask unavailable offline'
              : askSpeech.listening
                ? 'Listening… speak your question'
                : 'Ask anything about pipeline, revenue, payments…'
          }
          disabled={!isOnline || loading}
          className="zenith-ask-composer__input"
          autoComplete="off"
          enterKeyHint="send"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              askSpeech.stop()
              const q = value.trim()
              if (!q || loading || !isOnline) return
              onSubmit(q)
            }
          }}
        />

        <div className="zenith-ask-composer__actions">
          {askSpeech.supported ? (
            <button
              type="button"
              onClick={() => askSpeech.toggle()}
              disabled={!isOnline || loading}
              title={askSpeech.listening ? 'Stop listening' : 'Dictate question'}
              aria-label={askSpeech.listening ? 'Stop listening' : 'Dictate question'}
              aria-pressed={askSpeech.listening}
              className={`zenith-ask-composer__mic${askSpeech.listening ? ' is-listening' : ''}`}
            >
              {askSpeech.listening ? (
                <MicOff className="w-5 h-5 sm:w-[1.15rem] sm:h-[1.15rem]" aria-hidden />
              ) : (
                <Mic className="w-5 h-5 sm:w-[1.15rem] sm:h-[1.15rem]" aria-hidden />
              )}
              <span className="zenith-ask-composer__mic-label">
                {askSpeech.listening ? 'Stop' : 'Dictate'}
              </span>
            </button>
          ) : null}

          <button
            type="submit"
            disabled={!isOnline || loading || !value.trim()}
            className="zenith-ask-composer__submit"
          >
            {loading ? (
              <span className="zenith-ask-composer__spinner" aria-hidden />
            ) : (
              <ArrowUp className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden strokeWidth={2.5} />
            )}
            <span>{loading ? 'Thinking…' : 'Ask'}</span>
          </button>
        </div>

        {askSpeech.listening ? (
          <p className="zenith-ask-composer__status is-live" aria-live="polite">
            <span className="zenith-ask-composer__pulse" aria-hidden />
            Listening — tap Stop, then Ask
          </p>
        ) : null}
        {askSpeech.speechError ? (
          <p className="zenith-ask-composer__status is-error" role="alert">
            {askSpeech.speechError}
          </p>
        ) : null}
      </div>
    </form>
  )
}
