import { useMemo, useState } from 'react'
import MultiSelect from '../MultiSelect'
import { Search, X } from 'lucide-react'
import {
  CUSTOMER_TYPE_OPTIONS,
  formatCustomerTypeDisplay,
  type CustomerType,
} from '../../utils/customerRecord'
import {
  CUSTOMER_LIST_SORT_OPTIONS,
  DEFAULT_CUSTOMER_LIST_SORT,
  type CustomerListSortBy,
} from '../../utils/customerListQuery'

type SalesUserOption = { id: string; name: string }

export type CustomerListFiltersProps = {
  searchInput: string
  onSearchChange: (value: string) => void
  sortBy: CustomerListSortBy
  onSortByChange: (value: CustomerListSortBy) => void
  customerType: CustomerType | ''
  onCustomerTypeChange: (value: CustomerType | '') => void
  isSalesUser: boolean
  customerFilter: 'all' | 'my'
  onCustomerFilterChange: (value: 'all' | 'my') => void
  selectedSalespersonIds: string[]
  onSalespersonIdsChange: (ids: string[]) => void
  salesUsers?: SalesUserOption[]
  resultTotal?: number
  onClearAll: () => void
}

function chipClass(selected: boolean): string {
  return selected
    ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] shadow-sm'
    : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)]'
}

export default function CustomerListFilters({
  searchInput,
  onSearchChange,
  sortBy,
  onSortByChange,
  customerType,
  onCustomerTypeChange,
  isSalesUser,
  customerFilter,
  onCustomerFilterChange,
  selectedSalespersonIds,
  onSalespersonIdsChange,
  salesUsers,
  resultTotal,
  onClearAll,
}: CustomerListFiltersProps) {
  // Collapsed by default — mobile-first declutter (same pattern as Projects / Solar Hub).
  const [showFilters, setShowFilters] = useState(false)

  const moreFiltersActiveCount = useMemo(() => {
    let n = 0
    if (customerType) n += 1
    if (sortBy !== DEFAULT_CUSTOMER_LIST_SORT) n += 1
    if (isSalesUser) {
      if (customerFilter === 'all') n += 1
    } else if (selectedSalespersonIds.length > 0) {
      n += 1
    }
    return n
  }, [customerType, sortBy, isSalesUser, customerFilter, selectedSalespersonIds])

  const hasAnyFilters = Boolean(searchInput.trim()) || moreFiltersActiveCount > 0

  const summaryChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (customerType) {
      chips.push({
        key: 'type',
        label: `Type: ${formatCustomerTypeDisplay(customerType)}`,
        onRemove: () => onCustomerTypeChange(''),
      })
    }
    if (isSalesUser && customerFilter === 'all') {
      chips.push({
        key: 'scope',
        label: 'All customers',
        onRemove: () => onCustomerFilterChange('my'),
      })
    }
    if (!isSalesUser && selectedSalespersonIds.length > 0) {
      const names = selectedSalespersonIds
        .map((id) => salesUsers?.find((u) => u.id === id)?.name)
        .filter(Boolean) as string[]
      const label =
        names.length > 0
          ? names.length <= 2
            ? names.join(', ')
            : `${names[0]} +${names.length - 1}`
          : `${selectedSalespersonIds.length} salesperson${selectedSalespersonIds.length === 1 ? '' : 's'}`
      chips.push({
        key: 'sp',
        label: `Sales: ${label}`,
        onRemove: () => onSalespersonIdsChange([]),
      })
    }
    if (sortBy !== DEFAULT_CUSTOMER_LIST_SORT) {
      const sortLabel =
        CUSTOMER_LIST_SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? sortBy
      chips.push({
        key: 'sort',
        label: `Sort: ${sortLabel}`,
        onRemove: () => onSortByChange(DEFAULT_CUSTOMER_LIST_SORT),
      })
    }
    return chips
  }, [
    customerType,
    isSalesUser,
    customerFilter,
    selectedSalespersonIds,
    salesUsers,
    sortBy,
    onCustomerTypeChange,
    onCustomerFilterChange,
    onSalespersonIdsChange,
    onSortByChange,
  ])

  return (
    <div className="mb-6 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
      <div className="space-y-2 sm:space-y-3">
        {/* Always visible: search + Show/Hide + Clear */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:min-w-0 sm:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]"
              aria-hidden
            />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Search name, ID, phone, consumer #…"
              className="zenith-native-filter-input min-h-[44px] w-full rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder:text-[color:var(--text-placeholder)]"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
              aria-label="Search customers"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] sm:flex-none"
              aria-expanded={showFilters}
              aria-controls="customers-more-filters"
              title="Show or hide filters"
            >
              <span className="truncate">
                {showFilters ? 'Hide Filters' : 'Show Filters'}
                {!showFilters && moreFiltersActiveCount > 0
                  ? ` (${moreFiltersActiveCount})`
                  : ''}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] sm:flex-none"
              title="Clear search and all filters"
            >
              Clear All
            </button>
          </div>
        </div>

        {summaryChips.length > 0 ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {summaryChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex min-h-[36px] shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 text-xs font-semibold text-[color:var(--accent-gold)]"
                title={`Remove ${chip.label}`}
              >
                <span className="truncate max-w-[12rem]">{chip.label}</span>
                <X className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[color:var(--text-muted)]">
            {typeof resultTotal === 'number' ? (
              <>
                <span className="font-semibold tabular-nums text-[color:var(--text-secondary)]">
                  {resultTotal.toLocaleString('en-IN')}
                </span>{' '}
                customer{resultTotal === 1 ? '' : 's'}
                {hasAnyFilters ? ' matching' : ''}
              </>
            ) : null}
          </p>
        </div>

        <div
          id="customers-more-filters"
          className={`${showFilters ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ease-in-out ${
            showFilters ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className={`${showFilters ? 'pointer-events-auto' : 'pointer-events-none'} space-y-3 border-t border-[color:var(--border-default)] pt-3`}
          >
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Type
              </span>
              <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Customer type"
              >
                <button
                  type="button"
                  onClick={() => onCustomerTypeChange('')}
                  className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(!customerType)}`}
                >
                  All types
                </button>
                {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onCustomerTypeChange(customerType === opt.value ? '' : opt.value)
                    }
                    className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(customerType === opt.value)}`}
                  >
                    {formatCustomerTypeDisplay(opt.value)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                {isSalesUser ? 'Scope' : 'Salesperson'}
              </span>
              {isSalesUser ? (
                <div
                  className="inline-flex w-full max-w-sm rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-1 shadow-sm sm:w-auto"
                  role="group"
                  aria-label="Customer scope"
                >
                  {(
                    [
                      { value: 'my' as const, label: 'My customers' },
                      { value: 'all' as const, label: 'All customers' },
                    ] as const
                  ).map((opt) => {
                    const selected = customerFilter === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onCustomerFilterChange(opt.value)}
                        className={`min-h-[40px] flex-1 touch-manipulation rounded-lg px-3 text-xs font-semibold transition-colors sm:flex-none sm:px-4 ${
                          selected
                            ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] shadow-sm ring-1 ring-[color:var(--accent-gold-border)]'
                            : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="w-full sm:max-w-md">
                  <MultiSelect
                    className="w-full"
                    variant="zenith"
                    options={
                      salesUsers?.map((u) => ({
                        value: u.id,
                        label: u.name,
                      })) || []
                    }
                    selectedValues={selectedSalespersonIds}
                    onChange={onSalespersonIdsChange}
                    placeholder="All salespersons"
                    showSelectedLabels
                  />
                </div>
              )}
            </div>

            <label className="flex w-full flex-col gap-1 sm:max-w-xs">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Sort
              </span>
              <select
                className="zenith-native-filter-input h-[44px] w-full rounded-xl px-3 text-sm"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as CustomerListSortBy)}
                aria-label="Sort customers"
              >
                {CUSTOMER_LIST_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
