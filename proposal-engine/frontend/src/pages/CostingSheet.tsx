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
  module:    'bg-primary-50 text-primary-600 border-primary-200',
  inverter:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  structure: 'bg-secondary-100 text-secondary-600 border-secondary-300',
  cable:     'bg-amber-50 text-amber-700 border-amber-200',
  labour:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  misc:      'bg-gray-100 text-gray-600 border-gray-300',
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
    <tr className="group border-b border-primary-100/60 hover:bg-primary-50/40 transition-colors">
      {/* Category */}
      <td className="px-3 py-2 w-36">
        <select
          {...register(`items.${index}.category`)}
          className="w-full bg-transparent text-sm text-secondary-800 focus:outline-none cursor-pointer"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
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
          className="w-full bg-transparent text-sm text-secondary-800 placeholder-secondary-400 focus:outline-none"
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
          className="w-full bg-transparent text-sm text-right text-secondary-800 placeholder-secondary-400 focus:outline-none tabular-nums"
        />
      </td>

      {/* Unit cost */}
      <td className="px-3 py-2 w-32">
        <div className="flex items-center gap-1">
          <span className="text-secondary-400 text-xs">₹</span>
          <input
            {...register(`items.${index}.unitCost`)}
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            className="w-full bg-transparent text-sm text-right text-secondary-800 placeholder-secondary-400 focus:outline-none tabular-nums"
          />
        </div>
      </td>

      {/* Total (read-only, derived) */}
      <td className="px-3 py-2 w-36 text-right">
        <span className={`text-sm tabular-nums font-medium ${total > 0 ? 'text-primary-700' : 'text-secondary-400'}`}>
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
          className="opacity-0 group-hover:opacity-100 transition-opacity text-secondary-400 hover:text-red-500 disabled:opacity-0 disabled:cursor-not-allowed text-lg leading-none"
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
      <tr className="border-t-2 border-primary-200 bg-primary-50/60">
        <td colSpan={2} className="px-3 py-3 text-xs text-secondary-500 uppercase tracking-wide font-medium">
          Subtotal
        </td>
        <td className="px-3 py-3 text-right text-sm text-secondary-800 tabular-nums font-medium">
          {fmt(totalQty)}
        </td>
        <td />
        <td className="px-3 py-3 text-right text-sm text-secondary-800 tabular-nums font-semibold">
          ₹{fmt(totalCost)}
        </td>
        <td />
      </tr>

      {/* Margin */}
      <tr className="bg-yellow-50/60">
        <td colSpan={4} className="px-3 py-2 text-xs text-secondary-500">
          Margin ({DEFAULT_MARGIN}%)
        </td>
        <td className="px-3 py-2 text-right text-sm text-yellow-600 tabular-nums font-medium">
          + ₹{fmt(margin)}
        </td>
        <td />
      </tr>

      {/* Grand total */}
      <tr style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
        <td colSpan={4} className="px-3 py-3 text-sm text-white font-bold uppercase tracking-wide drop-shadow">
          Grand Total
        </td>
        <td className="px-3 py-3 text-right text-base text-white tabular-nums font-extrabold drop-shadow">
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
                  style={{ background: 'linear-gradient(to right, #0d1b3a, #eab308)' }}
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

  const liveItems: LineItem[] = watchedItems ?? [];

  const onSubmit = (data: FormValues) => {
    console.log('Submit payload:', data);
    alert('Costing sheet ready — backend save coming next!');
  };

  return (
    <div>
      {/* Page card */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header strip */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">
              📊
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                Costing Sheet
              </h1>
              <p className="mt-0.5 text-white/90 text-sm">
                Add line items below. Total per row is calculated automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-x-auto">
              <table className="border-collapse min-w-[640px] w-full">
                <thead>
                  <tr className="border-b border-primary-100 bg-primary-50/60">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide w-36">
                      Category
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                      Item / Description
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-20">
                      Qty
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-28">
                      Unit Cost
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-32">
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

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => append({ ...EMPTY_ROW })}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 transition-colors px-3 py-2 rounded-lg hover:bg-primary-50 border border-primary-200 font-medium"
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
                  className="text-sm text-secondary-500 hover:text-secondary-700 transition-colors px-3 py-2 rounded-lg hover:bg-secondary-100 border border-secondary-200"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  Save Sheet
                </button>
              </div>
            </div>
          </form>

          {/* Category breakdown */}
          <CategoryBreakdown items={liveItems} />
        </div>
      </div>
    </div>
  );
}
