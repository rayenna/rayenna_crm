type KeepoutItem = { id: string; w: number; h: number };

type Props = {
  keepouts: KeepoutItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  mapTool: 'scroll' | 'roof' | 'keepout';
  onMapToolChange: (tool: 'scroll' | 'roof' | 'keepout') => void;
  isMobile?: boolean;
};

export function RoofLayoutKeepoutControls({
  keepouts,
  onAdd,
  onRemove,
  onClear,
  mapTool,
  onMapToolChange,
  isMobile,
}: Props) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 space-y-2">
      <p className="text-xs font-semibold text-orange-900">Roof keepouts</p>
      <p className="text-[11px] text-orange-800/90 leading-snug">
        Mark vents, tanks, or skylights so panels are not placed there. Optional — skip if the roof is clear.
      </p>
      {isMobile && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onMapToolChange('keepout')}
            className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold border touch-manipulation ${
              mapTool === 'keepout'
                ? 'bg-orange-600 border-orange-700 text-white'
                : 'bg-white border-orange-200 text-orange-900'
            }`}
          >
            Draw keepouts
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="min-h-[36px] px-3 rounded-lg border border-orange-300 bg-white text-xs font-semibold text-orange-900 hover:bg-orange-50 touch-manipulation"
        >
          + Add keepout
        </button>
        {keepouts.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-[36px] px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 touch-manipulation"
          >
            Clear all
          </button>
        )}
      </div>
      {keepouts.length > 0 && (
        <ul className="text-[11px] text-orange-900 space-y-1 max-h-24 overflow-y-auto">
          {keepouts.map((k, i) => (
            <li key={k.id} className="flex items-center justify-between gap-2">
              <span>
                Keepout {i + 1}
              </span>
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
