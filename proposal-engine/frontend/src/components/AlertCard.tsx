type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertCardProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  className?: string;
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  { icon: string; accent: string; border: string; text: string }
> = {
  info: {
    icon: 'ℹ',
    accent: 'text-sky-300',
    border: 'border-sky-500/60',
    text: 'text-slate-100',
  },
  success: {
    icon: '✓',
    accent: 'text-emerald-300',
    border: 'border-emerald-500/60',
    text: 'text-emerald-50',
  },
  warning: {
    icon: '⚠',
    accent: 'text-amber-300',
    border: 'border-amber-400/70',
    text: 'text-amber-50',
  },
  error: {
    icon: '✕',
    accent: 'text-red-300',
    border: 'border-red-500/70',
    text: 'text-red-50',
  },
};

export function AlertCard({
  variant = 'info',
  title,
  message,
  className,
}: AlertCardProps) {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <div
      className={[
        'rounded-xl border px-3 py-2.5 text-xs sm:text-sm',
        'bg-slate-900/95 shadow-2xl flex items-start gap-2',
        cfg.border,
        cfg.text,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800',
          'text-xs font-bold',
          cfg.accent,
        ].join(' ')}
      >
        {cfg.icon}
      </div>
      <div className="flex-1">
        {title && (
          <p className="text-[11px] sm:text-xs font-semibold mb-0.5">
            {title}
          </p>
        )}
        <p className="text-[11px] sm:text-xs leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

