import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionResultEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/**
 * Browser speech-to-text for Zenith Ask (Chrome / Edge / Safari with WebKit).
 * Fills the Ask field; does not auto-submit.
 */
export function useZenithAskSpeech(opts: {
  enabled: boolean
  value: string
  onChange: (v: string) => void
}) {
  const Ctor = getSpeechRecognitionCtor()
  const supported = Boolean(Ctor)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const baseTextRef = useRef('')
  const dictatedRef = useRef(false)
  const onChangeRef = useRef(opts.onChange)
  onChangeRef.current = opts.onChange

  const stop = useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        rec.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  /** True if the current Ask text came from a dictate session; clears the flag. */
  const consumeDictated = useCallback((): boolean => {
    const was = dictatedRef.current
    dictatedRef.current = false
    return was
  }, [])

  /** Call when the user types manually so the next Ask is not tagged as dictate. */
  const markManualEdit = useCallback(() => {
    dictatedRef.current = false
  }, [])

  useEffect(() => () => stop(), [stop])

  useEffect(() => {
    if (!opts.enabled) stop()
  }, [opts.enabled, stop])

  const start = useCallback(() => {
    if (!Ctor || !opts.enabled) return
    setSpeechError(null)
    stop()

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = typeof navigator !== 'undefined' && navigator.language
      ? navigator.language
      : 'en-IN'

    baseTextRef.current = opts.value.trim()
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) finalChunk += piece
        else interimChunk += piece
      }
      const spoken = `${finalChunk}${interimChunk}`.trim()
      const base = baseTextRef.current
      let next = spoken
      if (base && spoken) {
        const baseNorm = base.toLowerCase()
        const spokenNorm = spoken.toLowerCase()
        // Avoid "Number of users" + spoken "number of users who…" → duplicated lead-in
        if (spokenNorm.startsWith(baseNorm)) next = spoken
        else if (baseNorm.includes(spokenNorm) && spokenNorm.length >= 8) next = base
        else next = `${base} ${spoken}`
      } else if (base) {
        next = base
      }
      if (spoken) dictatedRef.current = true
      onChangeRef.current(next)
    }

    recognition.onerror = (event) => {
      const code = event.error || 'error'
      if (code === 'aborted' || code === 'no-speech') {
        setListening(false)
        return
      }
      if (code === 'not-allowed') {
        setSpeechError('Microphone permission denied')
      } else {
        setSpeechError('Speech recognition failed')
      }
      setListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    try {
      recognition.start()
      setListening(true)
    } catch {
      setSpeechError('Could not start microphone')
      setListening(false)
      recognitionRef.current = null
    }
  }, [Ctor, opts.enabled, opts.value, stop])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, speechError, toggle, stop, consumeDictated, markManualEdit }
}
