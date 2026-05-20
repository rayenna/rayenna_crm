import { formatDistanceToNow } from 'date-fns'

type Props = {
  savedAt?: string
}

export default function ZenithOfflineSnapshotBanner({ savedAt }: Props) {
  const label = savedAt
    ? `Saved ${formatDistanceToNow(new Date(savedAt), { addSuffix: true })}`
    : 'Saved from your last visit'

  return (
    <div
      className="zenith-offline-snapshot-banner border-b border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 sm:px-5"
      role="status"
    >
      <p className="text-center text-[11px] font-medium leading-snug text-[color:var(--accent-gold)] sm:text-xs">
        You&apos;re offline — showing {label}. Changes you make in quick drawers will sync when you&apos;re back
        online.
      </p>
    </div>
  )
}
