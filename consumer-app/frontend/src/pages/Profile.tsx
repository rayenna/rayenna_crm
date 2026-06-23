import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import SystemSpecCard from '@/components/SystemSpecCard'
import { useThemeContext } from '@/hooks/useTheme'
import {
  useChangePassword,
  useConsumerNotifications,
  useConsumerProfile,
} from '@/hooks/useConsumerProfile'
import type { AchievementItem, CrmProfile } from '@/types/profile'

function customerTypeLabel(type: CrmProfile['customerType']) {
  if (type === 'APARTMENT') return 'Apartment'
  if (type === 'COMMERCIAL') return 'Commercial'
  if (type === 'RESIDENTIAL') return 'Residential'
  return '—'
}

function displayNameFromCrm(crm: CrmProfile, username: string) {
  const person = [crm.firstName, crm.lastName].filter(Boolean).join(' ').trim()
  if (person) return person
  if (crm.companyName) return crm.companyName
  return username
}

function initialsFromCrm(crm: CrmProfile, username: string) {
  if (crm.firstName && crm.lastName) return `${crm.firstName[0]}${crm.lastName[0]}`.toUpperCase()
  if (crm.firstName) return crm.firstName.slice(0, 2).toUpperCase()
  if (crm.companyName) return crm.companyName.slice(0, 2).toUpperCase()
  return username.slice(0, 2).toUpperCase()
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-[color:var(--text-primary)]">{value}</p>
    </div>
  )
}

function PersonalInfoModal({
  open,
  onClose,
  crm,
  username,
}: {
  open: boolean
  onClose: () => void
  crm: CrmProfile
  username: string
}) {
  if (!open) return null

  const addressParts = [crm.addressLine1, crm.addressLine2, crm.city, crm.state, crm.pinCode, crm.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--bg-overlay)] p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] p-5 shadow-[var(--shadow-modal)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="zenith-display text-lg font-bold text-[color:var(--text-primary)]">
              Personal information
            </h2>
            <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
              Managed in Rayenna CRM — contact your coordinator to update.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[color:var(--accent-gold)]"
          >
            Done
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <ReadOnlyField label="Username" value={username} />
          <ReadOnlyField label="Customer type" value={customerTypeLabel(crm.customerType)} />
          <ReadOnlyField label="Customer ID" value={crm.customerId} />
          {crm.companyName ? <ReadOnlyField label="Society / company" value={crm.companyName} /> : null}
          {crm.firstName ? <ReadOnlyField label="First name" value={crm.firstName} /> : null}
          {crm.middleName ? <ReadOnlyField label="Middle name" value={crm.middleName} /> : null}
          {crm.lastName ? <ReadOnlyField label="Last name" value={crm.lastName} /> : null}
          {crm.phones.length > 0 ? (
            <ReadOnlyField label="Phone" value={crm.phones.join(' · ')} />
          ) : null}
          {crm.emails.length > 0 ? (
            <ReadOnlyField label="Email" value={crm.emails.join(' · ')} />
          ) : null}
          {addressParts ? <ReadOnlyField label="Address" value={addressParts} /> : null}

          {crm.contacts.length > 1 ? (
            <div className="space-y-3 border-t border-[color:var(--border-default)] pt-3">
              <p className="text-xs font-bold text-[color:var(--text-secondary)]">Additional contacts</p>
              {crm.contacts.slice(1).map((contact, idx) => {
                const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
                return (
                  <div key={idx} className="rounded-xl bg-[color:var(--bg-surface)] p-3 text-sm">
                    {name ? <p className="font-medium text-[color:var(--text-primary)]">{name}</p> : null}
                    {contact.phones?.length ? (
                      <p className="text-[color:var(--text-secondary)]">{contact.phones.join(' · ')}</p>
                    ) : null}
                    {contact.emails?.length ? (
                      <p className="text-[color:var(--text-tertiary)]">{contact.emails.join(' · ')}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <ChangePasswordForm onClose={onClose} />
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const mutation = useChangePassword()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    try {
      await mutation.mutateAsync({ currentPassword, newPassword })
      toast.success('Password updated')
      onClose()
    } catch {
      toast.error('Could not change password — check your current password')
    }
  }

  const inputCls =
    'w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--bg-overlay)] p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] p-5 shadow-[var(--shadow-modal)]">
        <h2 className="zenith-display text-lg font-bold text-[color:var(--text-primary)]">
          Change password
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Current password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Confirm new password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
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
              {mutation.isPending ? 'Saving…' : 'Update password'}
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
  | 'password'
  | 'notifications'
  | 'documents'
  | 'privacy'
  | 'app'
  | 'help'
  | 'logout'

export default function Profile() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const profileQuery = useConsumerProfile()
  const notificationsQuery = useConsumerNotifications()
  const [personalOpen, setPersonalOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)

  const profile = profileQuery.data
  const loading = profileQuery.isLoading

  const handleSettings = (key: SettingsKey) => {
    if (key === 'personal') {
      setPersonalOpen(true)
      return
    }
    if (key === 'password') {
      setPasswordOpen(true)
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
    if (key === 'help') {
      navigate('/help')
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
    { key: 'password', label: 'Change Password', icon: Shield },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: notificationsQuery.data?.unreadCount,
    },
    { key: 'documents', label: 'Documents & Reports', icon: FileText },
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
          <header className="mb-5 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--accent-gold)] to-[color:var(--accent-teal)] text-2xl font-bold text-white shadow-lg">
              {initialsFromCrm(profile.crmProfile, profile.user.username)}
            </div>
            <h1 className="zenith-display mt-3 text-xl font-bold text-[color:var(--text-primary)]">
              {displayNameFromCrm(profile.crmProfile, profile.user.username)}
            </h1>
            <p className="text-sm text-[color:var(--text-secondary)]">@{profile.user.username}</p>
            {profile.crmProfile.phones[0] ? (
              <p className="text-xs text-[color:var(--text-tertiary)]">{profile.crmProfile.phones[0]}</p>
            ) : null}
          </header>

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

          <SystemSpecCard
            spec={profile.systemSpec}
            installedLabel={profile.systemStats.installedLabel}
          />

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

          <section className="mb-4">
            <h2 className="mb-2 text-sm font-bold text-[color:var(--text-primary)]">Achievements</h2>
            <div className="grid grid-cols-3 gap-2">
              {profile.achievements.map((a) => (
                <AchievementCard key={a.type} item={a} />
              ))}
            </div>
          </section>

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
            crm={profile.crmProfile}
            username={profile.user.username}
          />
          <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
          <NotificationsModal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
          <AppSettingsModal open={appSettingsOpen} onClose={() => setAppSettingsOpen(false)} />
        </>
      )}
    </div>
  )
}
