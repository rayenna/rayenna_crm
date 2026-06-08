type Props = {
  /** Single line for tight spaces (mobile toolbar). */
  compact?: boolean;
  className?: string;
};

export function RoofLayoutKeyboardHints({ compact, className = '' }: Props) {
  if (compact) {
    return (
      <p className={`text-[10px] text-slate-500 leading-snug ${className}`}>
        Desktop: <kbd className="font-mono text-[9px]">Esc</kbd> scroll ·{' '}
        <kbd className="font-mono text-[9px]">E</kbd> draw outline ·{' '}
        <kbd className="font-mono text-[9px]">K</kbd> keepouts ·{' '}
        <kbd className="font-mono text-[9px]">Ctrl+Z</kbd> undo
      </p>
    );
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 text-[10px] text-slate-600 space-y-1 ${className}`}
    >
      <p className="font-semibold text-slate-700">Keyboard (2D edit)</p>
      <ul className="space-y-0.5 leading-snug">
        <li>
          <kbd className="font-mono text-[9px] bg-slate-100 px-1 rounded">Esc</kbd> — scroll / pan map
        </li>
        <li>
          <kbd className="font-mono text-[9px] bg-slate-100 px-1 rounded">E</kbd> — draw roof outline
          (green handles)
        </li>
        <li>
          <kbd className="font-mono text-[9px] bg-slate-100 px-1 rounded">K</kbd> — keepouts
        </li>
        <li>
          <kbd className="font-mono text-[9px] bg-slate-100 px-1 rounded">Ctrl+Z</kbd> undo ·{' '}
          <kbd className="font-mono text-[9px] bg-slate-100 px-1 rounded">Ctrl+Y</kbd> redo
        </li>
      </ul>
    </div>
  );
}
