import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Award,
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Leaf,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Sun,
  User,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationsModal from '@/components/NotificationsModal'
import { useThemeContext } from '@/hooks/useTheme'
import {
  useConsumerNotifications,
  useConsumerProfile,
  useUpdateProfile,
} from '@/hooks/useConsumerProfile'
import type { AchievementItem } from '@/types/profile'

function displayName(firstName?: string | null, lastName?: string | null, email?: string) {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim()
  return full || email?.split('@')[0] || 'Member'
}

function initials(firstName?: string | null, lastName?: string | null, email?: string) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName.slice(0, 2).toUpperCase()
  return (email?.[0] ?? 'R').toUpperCase()
}

function tierAccentClass(tier: string) {
  if (tier === 'PLATINUM') return 'from-slate-400/30 to-slate-500/10'
  if (tier === 'GOLD') return 'from-amber-400/40 to-amber-600/10'
  if (tier === 'SILVER') return 'from-zinc-300/40 to-zinc-400/10'
  return 'from-amber-500/35 to-amber-700/15'
}

function AchievementCard({ item }: { item: AchievementItem }) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border p-3 text-center ${
        item.unlocked
          ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]'
          : 'border-[color:var(--border-default)] bg-[color:var(--bg-surface)] opacity-60'
      }`}
    >
      <div
        className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
          item.unlocked
            ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]'
            : 'bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]'
        }`}
      >
        <Award className="h-5 w-5" />
      </div>
      <p className="text-[11px] font-bold leading-tight text-[color:var(--text-primary)]">
        {item.title}
      </p>
      <p className="mt-0.5 text-[9px] leading-tight text-[color:var(--text-tertiary)]">
        {item.unlocked ? 'Unlocked' : 'Locked'}
      </p>
    </div>
  )
}

function PersonalInfoModal({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial: { firstName: string; lastName: string; phone: string; email: string }
}) {
  const [firstName, setFirstName] = useState(initial.firstName)
  const [lastName, setLastName] = useState(initial.lastName)
  const [phone, setPhone] = useState(initial.phone)
  const mutation = useUpdateProfile()

  useEffect(() => {
    if (open) {
      setFirstName(initial.firstName)
      setLastName(initial.lastName)
      setPhone(initial.phone)
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      })
      toast.success('Profile updated')
      onClose()
    } catch {
      toast.error('Could not save profile')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--bg-overlay)] p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] p-5 shadow-[var(--shadow-modal)]">
        <h2 className="zenith-display text-lg font-bold text-[color:var(--text-primary)]">
          Personal information
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Email
            </label>
            <input
              disabled
              value={initial.email}
              className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-muted)] px-3 py-2.5 text-sm text-[color:var(--text-tertiary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                First name
              </label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Last name
              </label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Phone
            </label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 ..."
              className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[color:var(--border-default)] py-2.5 text-sm font-semibold text-[color:var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-[color:var(--accent-gold)] py-2.5 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AppSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setDark, setLight } = useThemeContext()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--bg-overlay)] p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] p-5 shadow-[var(--shadow-modal)]">
        <div className="flex items-center justify-between">
          <h2 className="zenith-display text-lg font-bold text-[color:var(--text-primary)]">
            App settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[color:var(--accent-gold)]"
          >
            Done
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Appearance</p>
          <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
            Dark or light mode for the app
          </p>
          <div className="mt-3 flex gap-2 rounded-xl bg-[color:var(--bg-badge)] p-1">
            <button
              type="button"
              onClick={setDark}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition',
                theme === 'dark'
                  ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                  : 'text-[color:var(--text-muted)]',
              ].join(' ')}
            >
              <Moon className="h-4 w-4" aria-hidden />
              Dark
            </button>
            <button
              type="button"
              onClick={setLight}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition',
                theme === 'light'
                  ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                  : 'text-[color:var(--text-muted)]',
              ].join(' ')}
            >
              <Sun className="h-4 w-4" aria-hidden />
              Light
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type SettingsKey =
  | 'personal'
  | 'notifications'
  | 'documents'
  | 'privacy'
  | 'app'
  | 'help'
  | 'logout'

export default function Profile() {
  const { logout } = useAuth()
  const profileQuery = useConsumerProfile()
  const notificationsQuery = useConsumerNotifications()
  const [personalOpen, setPersonalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)

  const profile = profileQuery.data
  const loading = profileQuery.isLoading

  const handleSettings = (key: SettingsKey) => {
    if (key === 'personal') {
      setPersonalOpen(true)
      return
    }
    if (key === 'notifications') {
      setNotificationsOpen(true)
      return
    }
    if (key === 'app') {
      setAppSettingsOpen(true)
      return
    }
    if (key === 'logout') {
      logout()
      return
    }
    toast('Coming soon', { icon: '🚧' })
  }

  const settingsItems: {
    key: SettingsKey
    label: string
    icon: typeof User
    badge?: number
  }[] = [
    { key: 'personal', label: 'Personal Information', icon: User },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: notificationsQuery.data?.unreadCount,
    },
    { key: 'documents', label: 'Documents & Reports', icon: FileText },
    { key: 'privacy', label: 'Privacy & Security', icon: Shield },
    { key: 'app', label: 'App Settings', icon: Settings },
    { key: 'help', label: 'Help Center', icon: HelpCircle },
    { key: 'logout', label: 'Log Out', icon: LogOut },
  ]

  return (
    <div className="px-4 py-6 pb-8">
      {loading || !profile ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="mb-5 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--accent-gold)] to-[color:var(--accent-teal)] text-2xl font-bold text-white shadow-lg">
              {initials(profile.user.firstName, profile.user.lastName, profile.user.email)}
            </div>
            <h1 className="zenith-display mt-3 text-xl font-bold text-[color:var(--text-primary)]">
              {displayName(profile.user.firstName, profile.user.lastName, profile.user.email)}
            </h1>
            <p className="text-sm text-[color:var(--text-secondary)]">{profile.user.email}</p>
            {profile.user.phone ? (
              <p className="text-xs text-[color:var(--text-tertiary)]">{profile.user.phone}</p>
            ) : null}
          </header>

          {/* System stats */}
          <section className="mb-4 grid grid-cols-3 gap-2">
            <div className="zenith-glass rounded-2xl p-3 text-center">
              <Zap className="mx-auto h-4 w-4 text-[color:var(--accent-gold)]" />
              <p className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
                {profile.systemStats.systemKw}
              </p>
              <p className="text-[10px] text-[color:var(--text-tertiary)]">kW system</p>
            </div>
            <div className="zenith-glass rounded-2xl p-3 text-center">
              <Sparkles className="mx-auto h-4 w-4 text-[color:var(--accent-teal)]" />
              <p className="mt-1 text-sm font-bold text-[color:var(--text-primary)]">
                {profile.systemStats.installedLabel}
              </p>
              <p className="text-[10px] text-[color:var(--text-tertiary)]">Since install</p>
            </div>
            <div className="zenith-glass rounded-2xl p-3 text-center">
              <Leaf className="mx-auto h-4 w-4 text-[color:var(--accent-green)]" />
              <p className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
                {profile.systemStats.co2TonsSaved}
              </p>
              <p className="text-[10px] text-[color:var(--text-tertiary)]">tons CO₂ saved</p>
            </div>
          </section>

          {/* Member status */}
          <section
            className={`mb-4 overflow-hidden rounded-2xl border border-[color:var(--accent-gold-border)] bg-gradient-to-br ${tierAccentClass(profile.memberStatus.tier)} p-4`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent-gold)]">
                  Member status
                </p>
                <p className="zenith-display mt-0.5 text-xl font-bold text-[color:var(--text-primary)]">
                  {profile.memberStatus.tierLabel}
                </p>
              </div>
              <div className="rounded-full bg-[color:var(--accent-gold-muted)] px-3 py-1">
                <span className="text-sm font-bold text-[color:var(--accent-gold)]">
                  {profile.memberStatus.points} pts
                </span>
              </div>
            </div>
            {profile.memberStatus.nextTier ? (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--bg-muted)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--accent-gold)] transition-all"
                    style={{ width: `${profile.memberStatus.progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                  {profile.memberStatus.pointsToNextTier} points to{' '}
                  {profile.memberStatus.nextTierLabel}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                Top tier — thank you for being a Rayenna champion
              </p>
            )}
          </section>

          {/* Achievements */}
          <section className="mb-4">
            <h2 className="mb-2 text-sm font-bold text-[color:var(--text-primary)]">
              Achievements
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {profile.achievements.map((a) => (
                <AchievementCard key={a.type} item={a} />
              ))}
            </div>
          </section>

          {/* Settings */}
          <section className="zenith-glass overflow-hidden rounded-2xl">
            <ul>
              {settingsItems.map((item, idx) => {
                const Icon = item.icon
                const isLogout = item.key === 'logout'
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => handleSettings(item.key)}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                        idx < settingsItems.length - 1
                          ? 'border-b border-[color:var(--border-default)]'
                          : ''
                      } ${isLogout ? 'text-[color:var(--accent-red)]' : ''}`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isLogout
                            ? 'text-[color:var(--accent-red)]'
                            : 'text-[color:var(--text-secondary)]'
                        }`}
                      />
                      <span
                        className={`flex-1 text-sm font-medium ${
                          isLogout
                            ? 'text-[color:var(--accent-red)]'
                            : 'text-[color:var(--text-primary)]'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.badge && item.badge > 0 ? (
                        <span className="rounded-full bg-[color:var(--accent-gold)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--text-inverse)]">
                          {item.badge}
                        </span>
                      ) : null}
                      {!isLogout ? (
                        <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <footer className="mt-8 flex flex-col items-center gap-1.5 pb-2">
            <img
              src="/Rayenna_Hub.png"
              alt="Rayenna Solar Hub"
              className="h-[4.5rem] w-auto max-w-[11rem] object-contain sm:h-20 sm:max-w-[12rem]"
            />
            <p className="text-[10px] font-medium tracking-wide text-[color:var(--text-tertiary)]">
              v1.0.0
            </p>
          </footer>

          <PersonalInfoModal
            open={personalOpen}
            onClose={() => setPersonalOpen(false)}
            initial={{
              firstName: profile.user.firstName ?? '',
              lastName: profile.user.lastName ?? '',
              phone: profile.user.phone ?? '',
              email: profile.user.email,
            }}
          />
          <NotificationsModal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
          <AppSettingsModal open={appSettingsOpen} onClose={() => setAppSettingsOpen(false)} />
        </>
      )}
    </div>
  )
}
