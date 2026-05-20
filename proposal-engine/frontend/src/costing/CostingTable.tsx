import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  CATEGORIES, CATEGORY_COLORS, CATEGORY_GST, catAccentColor,
  sheetTotalGst,
} from '../lib/costingConstants';
import type { Category, LineItem } from '../lib/costingConstants';
import type { FormValues } from './types';
import { fmt, toNum } from './format';
import { EMPTY_ROW } from './builtInTemplates';

export function CostRow({
  index,
  control,
  register,
  setValue,
  onRemove,
  isOnly,
  showGst,
  marginPercent,
  canEdit,
}: {
  index: number;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  register: ReturnType<typeof useForm<FormValues>>['register'];
  setValue: ReturnType<typeof useForm<FormValues>>['setValue'];
  onRemove: () => void;
  isOnly: boolean;
  showGst: boolean;
  marginPercent: number;
  canEdit: boolean;
}) {
  const qty        = useWatch({ control, name: `items.${index}.quantity` });
  const unitCost   = useWatch({ control, name: `items.${index}.unitCost` });
  const gstPercent = useWatch({ control, name: `items.${index}.gstPercent` });

  const m = 1 + (marginPercent / 100);
  const baseTotalNoMargin = toNum(qty) * toNum(unitCost);
  const baseTotal = baseTotalNoMargin * m; // margin-inclusive base (excl. GST)
  const gstAmt    = baseTotal * (toNum(gstPercent) / 100);
  const rowTotal  = showGst ? baseTotal + gstAmt : baseTotal;

  // Auto-fill GST when category changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value as Category;
    setValue(`items.${index}.category`, cat);
    setValue(`items.${index}.gstPercent`, String(CATEGORY_GST[cat]));
  };

  return (
    <tr className="group border-b border-primary-100/60 hover:bg-primary-50/40 transition-colors">
      {/* Category */}
      <td className="px-3 py-2 w-36">
        <select
          {...register(`items.${index}.category`)}
          onChange={handleCategoryChange}
          disabled={!canEdit}
          className="w-full bg-transparent text-sm text-secondary-800 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </td>

      {/* Item name */}
      <td className="px-3 py-2">
        <input
          {...register(`items.${index}.itemName`)}
          placeholder="e.g. Waaree 540W Mono PERC"
          readOnly={!canEdit}
          className="w-full bg-transparent text-sm text-secondary-800 placeholder-secondary-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />
      </td>

      {/* Specification — flows directly into BOM */}
      <td className="px-3 py-2">
        <input
          {...register(`items.${index}.specification`)}
          placeholder="e.g. 540W Mono PERC, 144-cell"
          readOnly={!canEdit}
          className="w-full bg-transparent text-sm text-secondary-600 placeholder-secondary-300 focus:outline-none italic disabled:cursor-not-allowed disabled:opacity-70"
        />
      </td>

      {/* Qty */}
      <td className="px-3 py-2 w-20">
        <input
          {...register(`items.${index}.quantity`)}
          type="number" min="0" step="any" placeholder="0"
          readOnly={!canEdit}
          className="w-full bg-transparent text-sm text-right text-secondary-800 placeholder-secondary-400 focus:outline-none tabular-nums disabled:cursor-not-allowed disabled:opacity-70"
        />
      </td>

      {/* Unit cost */}
      <td className="px-3 py-2 w-28">
        <div className="flex items-center gap-1">
          <span className="text-secondary-400 text-xs">₹</span>
          <input
            {...register(`items.${index}.unitCost`)}
            type="number" min="0" step="any" placeholder="0.00"
            readOnly={!canEdit}
            className="w-full bg-transparent text-sm text-right text-secondary-800 placeholder-secondary-400 focus:outline-none tabular-nums disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
      </td>

      {/* GST % — editable, auto-filled */}
      {showGst && (
        <td className="px-3 py-2 w-20">
          <div className="flex items-center gap-0.5">
            <input
              {...register(`items.${index}.gstPercent`)}
              type="number" min="0" max="28" step="1"
              readOnly={!canEdit}
              className="w-full bg-transparent text-sm text-right text-secondary-800 focus:outline-none tabular-nums disabled:cursor-not-allowed disabled:opacity-70"
            />
            <span className="text-secondary-400 text-xs">%</span>
          </div>
          <span className="text-[9px] text-secondary-400 block text-right">
            ₹{fmt(gstAmt)}
          </span>
        </td>
      )}

      {/* Total */}
      <td className="px-3 py-2 w-32 text-right">
        <span className={`text-sm tabular-nums font-medium ${rowTotal > 0 ? 'text-primary-700' : 'text-secondary-400'}`}>
          ₹{fmt(rowTotal)}
        </span>
        {showGst && baseTotal > 0 && (
          <span className="text-[9px] text-secondary-400 block">
            excl. ₹{fmt(baseTotal)}
            {baseTotalNoMargin > 0 && <span className="ml-1">· cost ₹{fmt(baseTotalNoMargin)}</span>}
          </span>
        )}
      </td>

      {/* Remove — hidden for read-only (Ops/Finance/Management) */}
      <td className="px-2 py-2 w-8 text-center">
        {canEdit && (
        <button
          type="button" onClick={onRemove} disabled={isOnly} title="Remove row"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-secondary-400 hover:text-red-500 disabled:opacity-0 disabled:cursor-not-allowed text-lg leading-none"
        >×</button>
        )}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Grouped costing table (single <table>, category group header rows)
// ─────────────────────────────────────────────

// CostingGroupedTable receives itemCategories as a plain string[] pre-computed
// by the parent — no useWatch/getValues inside, zero lag issues.
export function CostingGroupedTable({
  fields, control, register, setValue, remove, append,
  showGst, marginPercent, itemCategories, liveItems, allCollapsed, resetSignal, canEdit,
}: {
  fields:         { id: string }[];
  control:        ReturnType<typeof useForm<FormValues>>['control'];
  register:       ReturnType<typeof useForm<FormValues>>['register'];
  setValue:       ReturnType<typeof useForm<FormValues>>['setValue'];
  remove:         (index: number) => void;
  append:         (row: LineItem) => void;
  showGst:        boolean;
  marginPercent:  number;
  itemCategories: string[];   // index → category key, pre-resolved by parent
  liveItems:      LineItem[];
  allCollapsed:   boolean;    // true = collapse all, false = expand all
  resetSignal:    number;     // increment to clear collapsed state without remounting
  canEdit:        boolean;    // false for Ops/Finance/Management (read-only)
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => (allCollapsed ? new Set(CATEGORIES.map((c) => c.value)) : new Set()),
  );
  const toggle = (cat: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });

  // Clear collapsed state when data is reset (e.g. after import or load)
  const prevResetSignal = React.useRef(resetSignal);
  useEffect(() => {
    if (prevResetSignal.current === resetSignal) return;
    prevResetSignal.current = resetSignal;
    setCollapsed(allCollapsed ? new Set(CATEGORIES.map((c) => c.value)) : new Set());
  }, [resetSignal, allCollapsed]);

  // Sync to parent's expand/collapse-all signal
  const prevAllCollapsed = React.useRef(allCollapsed);
  useEffect(() => {
    if (prevAllCollapsed.current === allCollapsed) return;
    prevAllCollapsed.current = allCollapsed;
    if (allCollapsed) {
      setCollapsed(new Set(CATEGORIES.map((c) => c.value)));
    } else {
      setCollapsed(new Set());
    }
  }, [allCollapsed]);

  const totalCols = showGst ? 8 : 7;

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    indices: fields.map((_, i) => i).filter((i) => (itemCategories[i] ?? 'others') === cat.value),
  })).filter((g) => g.indices.length > 0);

  if (fields.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-primary-100 px-4 py-10 text-center text-secondary-400 text-sm">
        No items yet. Use the <strong>+ Category</strong> buttons below to add rows, or import from Excel.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-x-auto">
      <table className={`border-collapse w-full ${showGst ? 'min-w-[1020px]' : 'min-w-[860px]'}`}>
        <thead>
          <tr className="border-b-2 border-primary-200 bg-primary-50/80">
            <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide w-36">Category</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">Item / Description</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">
              Specification <span className="ml-1 text-[9px] text-emerald-600 font-normal normal-case">→ BOM</span>
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-20">Qty</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-28">Unit Cost</th>
            {showGst && <th className="px-3 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wide w-20">GST %</th>}
            <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-32">
              Total {showGst ? '(incl.)' : ''}
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ cat, indices }) => {
            const isOpen   = !collapsed.has(cat.value);
            const accent   = catAccentColor(cat.value);
            const catItems = indices.map((i) => liveItems[i]).filter(Boolean);
            const m = 1 + (marginPercent / 100);
            const base     = catItems.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m, 0);
            const gst      = catItems.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m * (toNum(r.gstPercent) / 100), 0);
            const catTotal = showGst ? base + gst : base;

            return (
              <React.Fragment key={cat.value}>
                {/* Category group header */}
                <tr
                  className="cursor-pointer select-none"
                  style={{ background: `${accent}15`, borderTop: `2px solid ${accent}50` }}
                  onClick={() => toggle(cat.value)}
                >
                  <td colSpan={totalCols} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold" style={{ color: accent }}>
                          {isOpen ? '▼' : '▶'}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${CATEGORY_COLORS[cat.value]}`}>
                          {cat.label}
                        </span>
                        <span className="text-xs text-secondary-500">
                          {indices.length} item{indices.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {catTotal > 0 && (
                          <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>
                            ₹{fmt(catTotal)}
                          </span>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              append({ ...EMPTY_ROW, category: cat.value, gstPercent: String(CATEGORY_GST[cat.value]) });
                              setCollapsed((prev) => { const n = new Set(prev); n.delete(cat.value); return n; });
                            }}
                            className="text-xs font-semibold px-2.5 py-0.5 rounded-lg border"
                            style={{ color: accent, borderColor: `${accent}60`, background: 'white' }}
                          >
                            + Add row
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Data rows */}
                {isOpen && indices.map((globalIdx) => (
                  <CostRow
                    key={fields[globalIdx]?.id ?? globalIdx}
                    index={globalIdx}
                    control={control}
                    register={register}
                    setValue={setValue}
                    onRemove={() => remove(globalIdx)}
                    isOnly={fields.length === 1}
                    showGst={showGst}
                    marginPercent={marginPercent}
                    canEdit={canEdit}
                  />
                ))}

                {/* Category subtotal */}
                {isOpen && catTotal > 0 && (
                  <tr style={{ background: `${accent}08`, borderBottom: `1px solid ${accent}30` }}>
                    <td colSpan={showGst ? 5 : 4} className="px-4 py-1.5 text-xs text-secondary-400 italic">
                      {cat.label} subtotal
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm font-bold tabular-nums" style={{ color: accent }}>
                      ₹{fmt(catTotal)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Grand total card
// ─────────────────────────────────────────────

export function GrandTotalCard({ items, showGst, marginPercent }: { items: LineItem[]; showGst: boolean; marginPercent: number }) {
  const m = 1 + (marginPercent / 100);
  const baseNoMargin = items.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
  const totalBase    = items.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m, 0); // excl. GST, incl. margin
  const totalMargin  = totalBase - baseNoMargin;
  const totalGst     = showGst ? sheetTotalGst(items, marginPercent) : 0;
  const grand        = totalBase + totalGst;

  const gstByRate: Record<number, number> = {};
  items.forEach((r) => {
    const base = toNum(r.quantity) * toNum(r.unitCost) * m;
    const rate = toNum(r.gstPercent);
    if (rate > 0 && base > 0) {
      gstByRate[rate] = (gstByRate[rate] ?? 0) + base * (rate / 100);
    }
  });

  return (
    <div className="mt-4 rounded-xl border border-primary-200 overflow-hidden shadow-sm">
      <div className="bg-primary-50/60 px-4 py-2 border-b border-primary-100">
        <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wide">Project Summary</span>
      </div>
      <div className="bg-white divide-y divide-primary-100">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-secondary-500">Subtotal {showGst ? '(excl. GST)' : ''}</span>
          <span className="text-sm font-medium text-secondary-700 tabular-nums">₹{fmt(totalBase)}</span>
        </div>
        {totalMargin > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-yellow-50/40">
            <span className="text-xs text-secondary-500">Margin ({marginPercent}%)</span>
            <span className="text-xs font-medium text-yellow-700 tabular-nums">+ ₹{fmt(totalMargin)}</span>
          </div>
        )}
        {showGst && Object.entries(gstByRate).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, amt]) => (
          <div key={rate} className="flex items-center justify-between px-4 py-2 bg-blue-50/40">
            <span className="text-xs text-blue-700">
              GST @ {rate}%
              <span className="ml-1.5 text-[10px] text-blue-500">
                {Number(rate) === 5 ? '(Modules & Inverters)' : '(Structure / Cable / Labour / Misc)'}
              </span>
            </span>
            <span className="text-xs font-medium text-blue-700 tabular-nums">+ ₹{fmt(amt)}</span>
          </div>
        ))}
        {showGst && totalGst > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/70">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Total GST</span>
            <span className="text-sm font-bold text-blue-800 tabular-nums">₹{fmt(totalGst)}</span>
          </div>
        )}
      </div>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
      >
        <span className="text-sm font-bold text-white uppercase tracking-wide drop-shadow">
          Total Project Cost{showGst ? ' (incl. GST)' : ''}
        </span>
        <span className="text-lg font-extrabold text-white tabular-nums drop-shadow">₹{fmt(grand)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Category breakdown panel
// ─────────────────────────────────────────────

export function CategoryBreakdown({ items }: { items: LineItem[] }) {
  const byCategory = CATEGORIES.map(({ value, label }) => {
    const cost = items
      .filter((r) => r.category === value)
      .reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
    return { value, label, cost };
  }).filter((c) => c.cost > 0);

  const total = byCategory.reduce((s, c) => s + c.cost, 0);

  if (byCategory.length === 0) return null;

  return (
    <div className="mt-8 bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-5">
      <h3 className="text-sm font-semibold text-secondary-700 mb-4 uppercase tracking-wide">
        Cost Breakdown by Category
      </h3>
      <div className="space-y-3">
        {byCategory.map(({ value, label, cost }) => {
          const pct = total > 0 ? (cost / total) * 100 : 0;
          return (
            <div key={value}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CATEGORY_COLORS[value as Category]}`}>
                  {label}
                </span>
                <span className="text-xs text-secondary-500 tabular-nums">
                  ₹{fmt(cost)} · {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: 'linear-gradient(to right, #0d1b3a, #eab308)' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
