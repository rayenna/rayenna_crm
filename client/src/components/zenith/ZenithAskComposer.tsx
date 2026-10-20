import { type FormEvent } from 'react'
import { ArrowUp, Mic, MicOff, Sparkles, X } from 'lucide-react'
import { useZenithAskSpeech } from '../../hooks/useZenithAskSpeech'

type AskSubmitSource = 'typed' | 'dictate'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (question: string, source?: AskSubmitSource) => void
  loading?: boolean
  isOnline?: boolean
  /** Hide keyboard shortcuts that do not apply on touch layouts. */
  touchLayout?: boolean
  inputId?: string
  remainingAsks?: number | null
  mappedLabel?: string | null
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
  touchLayout = false,
  inputId = 'zenith-ask-input',
  remainingAsks = null,
  mappedLabel = null,
}: Props) {
  const askSpeech = useZenithAskSpeech({
    enabled: isOnline && !loading,
    value,
    onChange,
  })

  const submitCurrent = () => {
    askSpeech.stop()
    const q = value.trim()
    if (!q || loading || !isOnline) return
    const fromDictate = askSpeech.consumeDictated()
    onSubmit(q, fromDictate ? 'dictate' : 'typed')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submitCurrent()
  }

  const handleClear = () => {
    askSpeech.stop()
    askSpeech.markManualEdit()
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
            {remainingAsks != null ? (
              <span className="zenith-ask-composer__quota">
                {remainingAsks} left
              </span>
            ) : null}
          </span>
          <div className="zenith-ask-composer__header-meta">
            {loading && mappedLabel ? (
              <span className="zenith-ask-composer__hint">Mapped: {mappedLabel}</span>
            ) : hasText || askSpeech.listening ? (
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
              <span className="zenith-ask-composer__hint">
                {isOnline
                  ? touchLayout
                    ? 'Type or speak'
                    : 'Type, speak, or press /'
                  : 'Needs connection'}
              </span>
            )}
          </div>
        </div>

        <label className="sr-only" htmlFor={inputId}>
          Ask Zenith
        </label>
        <textarea
          id={inputId}
          rows={3}
          value={value}
          onChange={(e) => {
            askSpeech.markManualEdit()
            onChange(e.target.value)
          }}
          placeholder={
            !isOnline
              ? 'Ask needs a live connection — reconnect to query CRM data'
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
              submitCurrent()
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

        {!isOnline ? (
          <p className="zenith-ask-composer__status is-error" role="status">
            Ask Zenith needs the CRM API online. Saved dashboard charts may still show; reconnect
            (or wait for Live in the command bar) to run questions and example chips.
          </p>
        ) : null}
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
