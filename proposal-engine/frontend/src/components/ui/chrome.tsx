import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, className, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </Svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </Svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5c1.4-3 3.8-4.5 7-4.5s5.6 1.5 7 4.5" />
    </Svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h3.2l1.2 3-2 1.2a12 12 0 0 0 5.9 5.9l1.2-2 3 1.2V16a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 6.7 2 2 0 0 1 7 3.5z" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 13h6l1-13" />
    </Svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </Svg>
  );
}

export function IconList(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 7h11M9 12h11M9 17h11" />
      <path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
    </Svg>
  );
}

export function IconTrend(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16l5-5 3.5 3.5L20 7" />
      <path d="M14 7h6v6" />
    </Svg>
  );
}

export function IconLayout(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 10h16M10 10v10" />
    </Svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14 3.5V9h5.5" />
    </Svg>
  );
}

/** Zenith light accents. Filled when saved, ring in the same hue when not. */
export const ARTIFACT_COLORS: Record<string, string> = {
  Costing: '#0A9E87',
  BOM: '#EA580C',
  ROI: '#0A8F63',
  Proposal: '#6D3EC4',
  Roof: '#1D4ED8',
};

export const ARTIFACT_MARK = ARTIFACT_COLORS.Costing;

export const pageShell = 'pe-shell';

export const pageBanner = 'pe-banner px-4 sm:px-6 md:px-8 py-5';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 bg-[#0A9E87] hover:bg-[#087A6A] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 bg-white hover:bg-secondary-50 text-primary-800 border border-secondary-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors min-h-[36px] disabled:opacity-40';

export const btnGhost =
  'text-[11px] font-medium text-secondary-500 hover:text-secondary-800 px-2 py-1.5 rounded-lg hover:bg-secondary-50';

export const shortcutLink =
  'text-[11px] font-medium px-3 py-1.5 rounded-lg bg-white text-primary-800 border border-secondary-300 hover:border-primary-400 transition-colors';

export function MetaLine({
  icon,
  children,
  light = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <p className={`flex items-start gap-1.5 text-xs min-w-0 ${light ? 'text-white/85' : 'text-secondary-500'}`}>
      <span className={`mt-0.5 shrink-0 ${light ? 'text-white/70' : 'text-secondary-400'}`}>{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
