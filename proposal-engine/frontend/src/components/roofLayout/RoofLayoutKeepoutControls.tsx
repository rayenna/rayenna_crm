import { isKeepoutCircle, type RoofLayoutKeepout } from '../../lib/roofLayout/roofLayoutTypes';

type Props = {
  keepouts: RoofLayoutKeepout[];
  onAddRect: () => void;
  onAddCircle: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

function keepoutLabel(k: RoofLayoutKeepout, index: number): string {
  const shape = isKeepoutCircle(k) ? 'circle' : 'rectangle';
  return `Keepout ${index + 1} (${shape})`;
}

export function RoofLayoutKeepoutControls({
  keepouts,
  onAddRect,
  onAddCircle,
  onRemove,
  onClear,
}: Props) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 space-y-2">
      <p className="text-xs font-semibold text-orange-900">Roof keepouts</p>
      <p className="text-[11px] text-orange-800/90 leading-snug">
        Mark vents, tanks, or skylights so panels are not placed there. On phone, tap{' '}
        <strong>Keepouts</strong> under the map to draw. Corners snap to 90° while editing the roof outline.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddRect}
          className="min-h-[44px] md:min-h-[36px] px-3 rounded-lg border border-orange-300 bg-white text-xs font-semibold text-orange-900 hover:bg-orange-50 touch-manipulation"
        >
          + Rectangle
        </button>
        <button
          type="button"
          onClick={onAddCircle}
          className="min-h-[44px] md:min-h-[36px] px-3 rounded-lg border border-orange-300 bg-white text-xs font-semibold text-orange-900 hover:bg-orange-50 touch-manipulation"
        >
          + Circle
        </button>
        {keepouts.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-[44px] md:min-h-[36px] px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 touch-manipulation"
          >
            Clear all
          </button>
        )}
      </div>
      {keepouts.length > 0 && (
        <ul className="text-[11px] text-orange-900 space-y-1 max-h-24 overflow-y-auto">
          {keepouts.map((k, i) => (
            <li key={k.id} className="flex items-center justify-between gap-2">
              <span>{keepoutLabel(k, i)}</span>
              <button
                type="button"
                onClick={() => onRemove(k.id)}
                className="text-red-600 font-semibold hover:underline touch-manipulation"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
