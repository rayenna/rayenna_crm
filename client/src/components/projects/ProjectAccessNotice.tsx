import type { ProjectAccessNotice as Notice } from '../../utils/projectAccessMessages'

export default function ProjectAccessNotice({ notice }: { notice: Notice }) {
  const isWarning = notice.variant === 'warning'
  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
        isWarning
          ? 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--text-primary)]'
          : 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)]'
      }`}
      role="note"
    >
      <p className="font-extrabold text-[color:var(--text-primary)]">{notice.title}</p>
      <p className="mt-1 text-[color:var(--text-secondary)]">{notice.message}</p>
    </div>
  )
}
