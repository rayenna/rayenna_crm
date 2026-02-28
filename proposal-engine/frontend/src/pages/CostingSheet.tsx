import { useForm, useFieldArray, useWatch } from 'react-hook-form';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Category = 'module' | 'inverter' | 'structure' | 'cable' | 'labour' | 'misc';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'module',    label: 'Module'    },
  { value: 'inverter',  label: 'Inverter'  },
  { value: 'structure', label: 'Structure' },
  { value: 'cable',     label: 'Cable'     },
  { value: 'labour',    label: 'Labour'    },
  { value: 'misc',      label: 'Misc'      },
];

const CATEGORY_COLORS: Record<Category, string> = {
  module:    'bg-blue-950/60 text-blue-300 border-blue-800/50',
  inverter:  'bg-violet-950/60 text-violet-300 border-violet-800/50',
  structure: 'bg-amber-950/60 text-amber-300 border-amber-800/50',
  cable:     'bg-orange-950/60 text-orange-300 border-orange-800/50',
  labour:    'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
  misc:      'bg-gray-800/60 text-gray-300 border-gray-700/50',
};

interface LineItem {
  category: Category;
  itemName: string;
  quantity: string;
  unitCost: string;
}

interface FormValues {
  items: LineItem[];
}

const EMPTY_ROW: LineItem = {
  category: 'module',
  itemName: '',
  quantity: '',
  unitCost: '',
};

const DEFAULT_MARGIN = 15;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toNum(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────
// Sub-component: a single editable row
// ─────────────────────────────────────────────

function CostRow({
  index,
  control,
  register,
  onRemove,
  isOnly,
}: {
  index: number;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  register: ReturnType<typeof useForm<FormValues>>['register'];
  onRemove: () => void;
  isOnly: boolean;
}) {
  const qty      = useWatch({ control, name: `items.${index}.quantity` });
  const unitCost = useWatch({ control, name: `items.${index}.unitCost` });
  const category = useWatch({ control, name: `items.${index}.category` }) as Category;

  const total = toNum(qty) * toNum(unitCost);

  return (
    <tr className="group border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors">
      {/* Category */}
      <td className="px-3 py-2 w-36">
        <select
          {...register(`items.${index}.category`)}
          className="w-full bg-transparent text-sm focus:outline-none cursor-pointer"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-gray-900">
              {c.label}
            </option>
          ))}
        </select>
        {/* colour badge below the select */}
        <span
          className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium ${
            CATEGORY_COLORS[category] ?? CATEGORY_COLORS.misc
          }`}
        >
          {category}
        </span>
      </td>

      {/* Item name */}
      <td className="px-3 py-2">
        <input
          {...register(`items.${index}.itemName`)}
          placeholder="e.g. Waaree 540W Mono PERC"
          className="w-full bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
        />
      </td>

      {/* Qty */}
      <td className="px-3 py-2 w-24">
        <input
          {...register(`items.${index}.quantity`)}
          type="number"
          min="0"
          step="any"
          placeholder="0"
          className="w-full bg-transparent text-sm text-right text-white placeholder-gray-600 focus:outline-none tabular-nums"
        />
      </td>

      {/* Unit cost */}
      <td className="px-3 py-2 w-32">
        <div className="flex items-center gap-1">
          <span className="text-gray-600 text-xs">₹</span>
          <input
            {...register(`items.${index}.unitCost`)}
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            className="w-full bg-transparent text-sm text-right text-white placeholder-gray-600 focus:outline-none tabular-nums"
          />
        </div>
      </td>

      {/* Total (read-only, derived) */}
      <td className="px-3 py-2 w-36 text-right">
        <span className={`text-sm tabular-nums font-medium ${total > 0 ? 'text-white' : 'text-gray-600'}`}>
          ₹{fmt(total)}
        </span>
      </td>

      {/* Remove */}
      <td className="px-2 py-2 w-8 text-center">
        <button
          type="button"
          onClick={onRemove}
          disabled={isOnly}
          title="Remove row"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 disabled:opacity-0 disabled:cursor-not-allowed text-lg leading-none"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Summary footer row
// ─────────────────────────────────────────────

function SummaryFooter({ items }: { items: LineItem[] }) {
  const totalQty  = items.reduce((s, r) => s + toNum(r.quantity), 0);
  const totalCost = items.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
  const margin    = Math.round(totalCost * DEFAULT_MARGIN) / 100;
  const grand     = totalCost + margin;

  return (
    <tfoot>
      {/* Subtotal */}
      <tr className="border-t-2 border-gray-700 bg-gray-900/40">
        <td colSpan={2} className="px-3 py-3 text-xs text-gray-400 uppercase tracking-wide font-medium">
          Subtotal
        </td>
        <td className="px-3 py-3 text-right text-sm text-white tabular-nums font-medium">
          {fmt(totalQty)}
        </td>
        <td />
        <td className="px-3 py-3 text-right text-sm text-white tabular-nums font-semibold">
          ₹{fmt(totalCost)}
        </td>
        <td />
      </tr>

      {/* Margin */}
      <tr className="bg-gray-900/20">
        <td colSpan={4} className="px-3 py-2 text-xs text-gray-500">
          Margin ({DEFAULT_MARGIN}%)
        </td>
        <td className="px-3 py-2 text-right text-sm text-amber-400 tabular-nums">
          + ₹{fmt(margin)}
        </td>
        <td />
      </tr>

      {/* Grand total */}
      <tr className="bg-indigo-950/30 border-t border-indigo-800/40">
        <td colSpan={4} className="px-3 py-3 text-sm text-indigo-300 font-semibold uppercase tracking-wide">
          Grand Total
        </td>
        <td className="px-3 py-3 text-right text-base text-indigo-300 tabular-nums font-bold">
          ₹{fmt(grand)}
        </td>
        <td />
      </tr>
    </tfoot>
  );
}

// ─────────────────────────────────────────────
// Category breakdown panel
// ─────────────────────────────────────────────

function CategoryBreakdown({ items }: { items: LineItem[] }) {
  const byCategory = CATEGORIES.map(({ value, label }) => {
    const cost = items
      .filter((r) => r.category === value)
      .reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
    return { value, label, cost };
  }).filter((c) => c.cost > 0);

  const total = byCategory.reduce((s, c) => s + c.cost, 0);

  if (byCategory.length === 0) return null;

  return (
    <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Cost Breakdown by Category</h3>
      <div className="space-y-3">
        {byCategory.map(({ value, label, cost }) => {
          const pct = total > 0 ? (cost / total) * 100 : 0;
          return (
            <div key={value}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[value as Category]}`}>
                  {label}
                </span>
                <span className="text-xs text-gray-400 tabular-nums">
                  ₹{fmt(cost)} · {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function CostingSheet() {
  const { control, register, handleSubmit, formState: { errors: _errors } } =
    useForm<FormValues>({
      defaultValues: { items: [{ ...EMPTY_ROW }] },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });

  // Keep a stable reference for the summary/breakdown panels
  const liveItems: LineItem[] = watchedItems ?? [];

  const onSubmit = (data: FormValues) => {
    // Placeholder: wire to POST /api/costing-item in next step
    console.log('Submit payload:', data);
    alert('Costing sheet ready — backend save coming next!');
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Costing Sheet</h1>
        <p className="text-gray-400 text-sm mt-1">
          Add line items below. Total per row is calculated automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Table — horizontally scrollable on mobile */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="border-collapse min-w-[640px] w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-36">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Item / Description
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">
                  Qty
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-28">
                  Unit Cost
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-32">
                  Total
                </th>
                <th className="w-8" />
              </tr>
            </thead>

            <tbody>
              {fields.map((field, index) => (
                <CostRow
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  onRemove={() => remove(index)}
                  isOnly={fields.length === 1}
                />
              ))}
            </tbody>

            <SummaryFooter items={liveItems} />
          </table>
        </div>

        {/* Actions — stack on xs, row on sm+ */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => append({ ...EMPTY_ROW })}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-2 rounded-lg hover:bg-indigo-950/30"
          >
            <span className="text-lg leading-none">+</span>
            Add row
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear all rows?')) {
                  remove(fields.map((_, i) => i));
                  append({ ...EMPTY_ROW });
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
            >
              Clear
            </button>
            <button
              type="submit"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg transition-colors font-medium"
            >
              Save Sheet
            </button>
          </div>
        </div>
      </form>

      {/* Category breakdown */}
      <CategoryBreakdown items={liveItems} />
    </div>
  );
}
