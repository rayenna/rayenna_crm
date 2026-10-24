import { FileText } from 'lucide-react'

/** Compact marker for Lost deals that still have a PE Ready proposal. */
export default function LostDealPeReadyIcon({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] ${className}`}
      title="PE Ready — a proposal was saved in Proposal Engine"
      aria-label="PE Ready proposal"
    >
      <FileText className="h-3 w-3" aria-hidden />
    </span>
  )
}
