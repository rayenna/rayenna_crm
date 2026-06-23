import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'

function textFromChildren(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(textFromChildren).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return textFromChildren((children as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

export default function HelpMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children, ...props }) => (
          <h1
            className="zenith-display mb-4 text-xl font-bold text-[color:var(--text-primary)]"
            {...props}
          >
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2
            className="mb-3 mt-6 text-base font-bold text-[color:var(--text-primary)]"
            {...props}
          >
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="mb-2 mt-4 text-sm font-semibold text-[color:var(--text-primary)]" {...props}>
            {children}
          </h3>
        ),
        p: ({ ...props }) => (
          <p className="mb-3 text-sm leading-relaxed text-[color:var(--text-secondary)]" {...props} />
        ),
        ul: ({ ...props }) => (
          <ul
            className="mb-4 list-outside list-disc space-y-2 pl-5 text-sm text-[color:var(--text-secondary)]"
            {...props}
          />
        ),
        ol: ({ ...props }) => (
          <ol
            className="mb-4 list-outside list-decimal space-y-2 pl-5 text-sm text-[color:var(--text-secondary)]"
            {...props}
          />
        ),
        li: ({ ...props }) => (
          <li className="leading-relaxed marker:text-[color:var(--accent-gold)]" {...props} />
        ),
        strong: ({ ...props }) => (
          <strong className="font-semibold text-[color:var(--text-primary)]" {...props} />
        ),
        table: ({ ...props }) => (
          <div className="zenith-table-scroll-shell mb-4 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] rounded-xl border border-[color:var(--border-default)]">
            <table className="w-full min-w-[280px] text-left text-xs" {...props} />
          </div>
        ),
        thead: ({ ...props }) => (
          <thead className="bg-[color:var(--bg-badge)] text-[color:var(--text-primary)]" {...props} />
        ),
        th: ({ children, ...props }) => (
          <th className="px-3 py-2 font-semibold" {...props}>
            {textFromChildren(children)}
          </th>
        ),
        td: ({ ...props }) => (
          <td
            className="border-t border-[color:var(--border-default)] px-3 py-2 text-[color:var(--text-secondary)]"
            {...props}
          />
        ),
        hr: () => (
          <hr className="my-6 border-0 border-t border-[color:var(--border-default)]" />
        ),
        a: ({ href, children, ...props }) => (
          <a
            href={href}
            className="font-medium text-[color:var(--accent-gold)] underline-offset-2 hover:underline"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noreferrer' : undefined}
            {...props}
          >
            {children}
          </a>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
