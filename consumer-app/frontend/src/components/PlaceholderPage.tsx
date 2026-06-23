interface PlaceholderPageProps {
  title: string
  subtitle: string
  session: string
}

export default function PlaceholderPage({ title, subtitle, session }: PlaceholderPageProps) {
  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{subtitle}</p>
      </header>
      <div className="zenith-glass rounded-2xl p-6 text-center">
        <p className="text-sm text-[color:var(--text-muted)]">Coming in {session}</p>
      </div>
    </div>
  )
}
