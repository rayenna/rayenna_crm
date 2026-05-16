/** North arrow + legend overlay (HTML, bottom-left of map viewport). */
export function RoofLayoutMapChrome() {
  return (
    <div className="absolute bottom-3 left-3 z-10 pointer-events-none flex flex-col gap-2 max-w-[11rem]">
      <div
        className="rounded-lg bg-white/95 border border-slate-200 shadow-md px-2.5 py-2 flex items-center gap-2"
        aria-hidden
      >
        <div className="flex flex-col items-center text-slate-800 leading-none">
          <span className="text-[9px] font-bold tracking-wide">N</span>
          <span className="text-base font-bold" style={{ lineHeight: 1 }}>
            ↑
          </span>
        </div>
        <span className="text-[9px] text-slate-500 leading-tight">Satellite aligned north-up</span>
      </div>
      <div className="rounded-lg bg-white/95 border border-slate-200 shadow-md px-2.5 py-2 text-[10px] text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-emerald-600 bg-emerald-400/30 shrink-0" />
          Roof outline
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-[1px] bg-[#0e1e5f] border border-slate-400 shrink-0" />
          Solar modules
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-[1px] bg-orange-400/60 border border-orange-600 shrink-0" />
          Keepout
        </div>
      </div>
    </div>
  );
}
