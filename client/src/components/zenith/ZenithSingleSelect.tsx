import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type ZenithSingleSelectOption = { value: string; label: string }

export type ZenithSingleSelectProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: ZenithSingleSelectOption[]
  placeholder?: string
  disabled?: boolean
  id?: string
  'aria-invalid'?: boolean
  /** When true, first row clears value (placeholder label). */
  allowEmpty?: boolean
  className?: string
}

/**
 * Single-choice picker with a dark glass panel (not a native &lt;select&gt;).
 * Use where OS dropdown popups ignore Zenith styling (e.g. mobile Safari).
 */
export const ZenithSingleSelect = forwardRef<HTMLButtonElement, ZenithSingleSelectProps>(
  function ZenithSingleSelect(
    {
      value,
      onChange,
      onBlur,
      options,
      placeholder = 'Select…',
      disabled = false,
      id,
      'aria-invalid': ariaInvalid,
      allowEmpty = true,
      className = '',
    },
    ref,
  ) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const selected = options.find((o) => o.value === value)
    const display = selected?.label ?? (value ? value : placeholder)

    const finalizeClose = useCallback(() => {
      setOpen(false)
      onBlur?.()
    }, [onBlur])

    useEffect(() => {
      if (!open) return
      const onDoc = (e: MouseEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
          finalizeClose()
        }
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          finalizeClose()
        }
      }
      document.addEventListener('mousedown', onDoc)
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('mousedown', onDoc)
        document.removeEventListener('keydown', onKey)
      }
    }, [open, finalizeClose])

    const btnClass =
      'zenith-native-select flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-left text-sm ring-1 ring-[color:var(--border-default)] transition-all focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] disabled:cursor-not-allowed disabled:opacity-55'

    return (
      <div ref={rootRef} className={`relative ${className}`}>
        <button
          ref={ref}
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          className={`${btnClass} ${value ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-muted)]'} ${ariaInvalid ? 'border-[color:var(--accent-red-border)]' : ''}`}
          onClick={() => {
            if (disabled) return
            setOpen((prev) => {
              if (prev) {
                queueMicrotask(() => onBlur?.())
                return false
              }
              return true
            })
          }}
        >
        <span className="min-w-0 flex-1 truncate">{display}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {open && !disabled && (
          <ul
            role="listbox"
            className="absolute z-[60] mt-1 max-h-[min(55vh,320px)] w-full overflow-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] py-1 shadow-xl ring-1 ring-[color:var(--border-default)] backdrop-blur-xl"
          >
            {allowEmpty && (
              <li role="presentation" className="px-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ''}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)]"
                  onClick={() => {
                    onChange('')
                    finalizeClose()
                  }}
                >
                  {placeholder}
                </button>
              </li>
            )}
            {options.map((opt) => (
              <li key={opt.value} role="presentation" className="px-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[color:var(--bg-table-hover)] ${
                    value === opt.value
                      ? 'bg-[color:var(--bg-badge)] font-semibold text-[color:var(--accent-gold)]'
                      : 'text-[color:var(--text-primary)]'
                  }`}
                  onClick={() => {
                    onChange(opt.value)
                    finalizeClose()
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)

ZenithSingleSelect.displayName = 'ZenithSingleSelect'
