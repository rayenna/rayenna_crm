import {
  formatModuleEdgeGapHint,
  INDIA_ROOF_LAYOUT_HINTS,
} from '../../lib/roofLayout/indiaRoofLayoutHints';

type Props = {
  edgeSetbackM: number;
  panelSpacingMultiplier: number;
  className?: string;
};

/** Informational India spacing/setback copy — no rule engine (P2 item 16). */
export function RoofLayoutIndiaHints({
  edgeSetbackM,
  panelSpacingMultiplier,
  className = '',
}: Props) {
  const setbackNote =
    edgeSetbackM > 0
      ? ` Setback is ${edgeSetbackM.toFixed(1)} m — adjust and Refill if you change it.`
      : '';

  return (
    <aside
      className={`rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-2.5 space-y-2 ${className}`}
      aria-label="India rooftop layout guidance"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-900">
        {INDIA_ROOF_LAYOUT_HINTS.panelTitle}
      </p>
      <ul className="space-y-1.5 text-[11px] text-sky-950/90 leading-snug list-none m-0 p-0">
        <li>
          <span className="font-semibold text-sky-900">Edge clearance — </span>
          {INDIA_ROOF_LAYOUT_HINTS.edgeSetback}
          {setbackNote}
        </li>
        <li>
          <span className="font-semibold text-sky-900">Module gaps — </span>
          {INDIA_ROOF_LAYOUT_HINTS.moduleGap}{' '}
          {formatModuleEdgeGapHint(panelSpacingMultiplier)}
        </li>
      </ul>
      <p className="text-[10px] text-sky-800/80 leading-snug m-0">{INDIA_ROOF_LAYOUT_HINTS.disclaimer}</p>
    </aside>
  );
}
