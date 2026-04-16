import { type ReactNode } from 'react'
import { Info } from 'lucide-react'
import AboutSection from '../components/AboutSection'

const About = () => {
  const shell = (children: ReactNode) => (
    <div
      className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]"
    >
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  return shell(
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
            <Info className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">About</h1>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Credits, copyright, intellectual property, and confidentiality notice
            </p>
          </div>
        </div>
      </header>

      <AboutSection embedded variant="zenith" />
    </>,
  )
}

export default About
