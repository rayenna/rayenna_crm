import type { ReactNode } from 'react'

export function ZenithFocusCardList({
  isEmpty,
  emptyMessage,
  children,
}: {
  isEmpty: boolean
  emptyMessage: string
  children: ReactNode
}) {
  if (isEmpty) {
    return (
      <p
        className="py-8 text-center text-[13px] text-[color:var(--text-muted)] lg:hidden px-2 sm:px-2.5"
        style={{ fontFamily: 'var(--zenith-font-body)' }}
      >
        {emptyMessage}
      </p>
    )
  }
  return (
    <div className="divide-y divide-[color:var(--border-default)] lg:hidden px-2 sm:px-2.5 pb-2" role="list">
      {children}
    </div>
  )
}
