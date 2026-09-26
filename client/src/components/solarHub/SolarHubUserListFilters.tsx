import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import {
  DEFAULT_SOLAR_HUB_USER_SORT,
  SOLAR_HUB_INVERTER_BRAND_OPTIONS,
  SOLAR_HUB_INVERTER_QUICK_BRANDS,
  SOLAR_HUB_USER_SORT_OPTIONS,
  type SolarHubActiveFilter,
  type SolarHubPlantLinkFilter,
  type SolarHubUserSortBy,
} from '../../utils/solarHubListQuery'

export type SolarHubUserListFiltersProps = {
  searchInput: string
  onSearchChange: (value: string) => void
  sortBy: SolarHubUserSortBy
  onSortByChange: (value: SolarHubUserSortBy) => void
  active: SolarHubActiveFilter
  onActiveChange: (value: SolarHubActiveFilter) => void
  inverterBrand: string
  onInverterBrandChange: (value: string) => void
  plantLink: SolarHubPlantLinkFilter
  onPlantLinkChange: (value: SolarHubPlantLinkFilter) => void
  neverLoggedIn: boolean
  onNeverLoggedInChange: (value: boolean) => void
  resultTotal?: number
  onClearAll: () => void
}

function chipClass(selected: boolean): string {
  return selected
    ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] shadow-sm'
    : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)]'
}

const ACTIVE_CHIPS: { value: SolarHubActiveFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const PLANT_CHIPS: { value: SolarHubPlantLinkFilter; label: string }[] = [
  { value: '', label: 'Any plant' },
  { value: 'solis', label: 'Solis linked' },
  { value: 'deye', label: 'Deye linked' },
  { value: 'none', label: 'Not linked' },
]

const PLANT_LABEL: Record<Exclude<SolarHubPlantLinkFilter, ''>, string> = {
  solis: 'Solis linked',
  deye: 'Deye linked',
  none: 'Not linked',
}

export default function SolarHubUserListFilters({
  searchInput,
  onSearchChange,
  sortBy,
  onSortByChange,
  active,
  onActiveChange,
  inverterBrand,
  onInverterBrandChange,
  plantLink,
  onPlantLinkChange,
  neverLoggedIn,
  onNeverLoggedInChange,
  resultTotal,
  onClearAll,
}: SolarHubUserListFiltersProps) {
  // Collapsed by default — mobile-first declutter (same pattern as Projects).
  const [showFilters, setShowFilters] = useState(false)

  // Sort does not inflate the Show Filters (N) badge.
  const moreFiltersActiveCount = useMemo(() => {
    let n = 0
    if (active !== 'all') n += 1
    if (inverterBrand.trim()) n += 1
    if (plantLink) n += 1
    if (neverLoggedIn) n += 1
    return n
  }, [active, inverterBrand, plantLink, neverLoggedIn])

  const hasAnyFilters =
    Boolean(searchInput.trim()) ||
    moreFiltersActiveCount > 0 ||
    sortBy !== DEFAULT_SOLAR_HUB_USER_SORT

  const brandInQuick = SOLAR_HUB_INVERTER_QUICK_BRANDS.some(
    (b) => b.toLowerCase() === inverterBrand.trim().toLowerCase(),
  )

  const summaryChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (active !== 'all') {
      chips.push({
        key: 'active',
        label: active === 'active' ? 'Active only' : 'Inactive only',
        onRemove: () => onActiveChange('all'),
      })
    }
    if (inverterBrand.trim()) {
      chips.push({
        key: 'inverter',
        label: `Inverter: ${inverterBrand}`,
        onRemove: () => onInverterBrandChange(''),
      })
    }
    if (plantLink) {
      chips.push({
        key: 'plant',
        label: PLANT_LABEL[plantLink],
        onRemove: () => onPlantLinkChange(''),
      })
    }
    if (neverLoggedIn) {
      chips.push({
        key: 'never',
        label: 'Never logged in',
        onRemove: () => onNeverLoggedInChange(false),
      })
    }
    if (sortBy !== DEFAULT_SOLAR_HUB_USER_SORT) {
      const sortLabel =
        SOLAR_HUB_USER_SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? sortBy
      chips.push({
        key: 'sort',
        label: `Sort: ${sortLabel}`,
        onRemove: () => onSortByChange(DEFAULT_SOLAR_HUB_USER_SORT),
      })
    }
    return chips
  }, [
    active,
    inverterBrand,
    plantLink,
    neverLoggedIn,
    sortBy,
    onActiveChange,
    onInverterBrandChange,
    onPlantLinkChange,
    onNeverLoggedInChange,
    onSortByChange,
  ])

  return (
    <div className="mb-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
      <div className="space-y-2 sm:space-y-3">
        {/* Always visible: search + Show/Hide + Clear (when idle Clear hides) */}
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
              placeholder="Search username, customer, project #, phone…"
              className="zenith-native-filter-input min-h-[44px] w-full rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder:text-[color:var(--text-placeholder)]"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
              aria-label="Search Solar Hub users"
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
              aria-controls="solar-hub-more-filters"
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
            {hasAnyFilters ? (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] sm:flex-none"
                title="Clear search and all filters"
              >
                Clear All
              </button>
            ) : null}
          </div>
        </div>

        {/* Removable summary chips when filters are on (visible even when panel collapsed) */}
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
                account{resultTotal === 1 ? '' : 's'}
                {hasAnyFilters ? ' matching' : ''}
              </>
            ) : null}
          </p>
        </div>

        {/* Expanded filters — hidden until Show Filters */}
        <div
          id="solar-hub-more-filters"
          className={`${showFilters ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ease-in-out ${
            showFilters ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className={`${showFilters ? 'pointer-events-auto' : 'pointer-events-none'} space-y-3 border-t border-[color:var(--border-default)] pt-3`}
          >
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Status
              </span>
              <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Account status"
              >
                {ACTIVE_CHIPS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onActiveChange(opt.value)}
                    className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(active === opt.value)}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Inverter
              </span>
              <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Inverter brand"
              >
                <button
                  type="button"
                  onClick={() => onInverterBrandChange('')}
                  className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(!inverterBrand)}`}
                >
                  All brands
                </button>
                {SOLAR_HUB_INVERTER_QUICK_BRANDS.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() =>
                      onInverterBrandChange(
                        inverterBrand.toLowerCase() === brand.toLowerCase() ? '' : brand,
                      )
                    }
                    className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(
                      inverterBrand.toLowerCase() === brand.toLowerCase(),
                    )}`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
              <label className="flex w-full flex-col gap-1 sm:max-w-xs">
                <span className="sr-only">All inverter brands</span>
                <select
                  className="zenith-native-filter-input h-[44px] w-full rounded-xl px-3 text-sm"
                  value={
                    inverterBrand &&
                    SOLAR_HUB_INVERTER_BRAND_OPTIONS.some(
                      (b) => b.toLowerCase() === inverterBrand.toLowerCase(),
                    )
                      ? SOLAR_HUB_INVERTER_BRAND_OPTIONS.find(
                          (b) => b.toLowerCase() === inverterBrand.toLowerCase(),
                        )!
                      : inverterBrand && !brandInQuick
                        ? inverterBrand
                        : ''
                  }
                  onChange={(e) => onInverterBrandChange(e.target.value)}
                  aria-label="Filter by inverter brand"
                >
                  <option value="">More brands…</option>
                  {SOLAR_HUB_INVERTER_BRAND_OPTIONS.filter(
                    (b) =>
                      !SOLAR_HUB_INVERTER_QUICK_BRANDS.some(
                        (q) => q.toLowerCase() === b.toLowerCase(),
                      ),
                  ).map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                  {inverterBrand &&
                  !SOLAR_HUB_INVERTER_BRAND_OPTIONS.some(
                    (b) => b.toLowerCase() === inverterBrand.toLowerCase(),
                  ) ? (
                    <option value={inverterBrand}>{inverterBrand}</option>
                  ) : null}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Cloud plant
              </span>
              <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Cloud plant link"
              >
                {PLANT_CHIPS.map((opt) => (
                  <button
                    key={opt.value || 'any'}
                    type="button"
                    onClick={() => onPlantLinkChange(opt.value)}
                    className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(plantLink === opt.value)}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Login
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Login status">
                <button
                  type="button"
                  onClick={() => onNeverLoggedInChange(false)}
                  className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(!neverLoggedIn)}`}
                >
                  Any login
                </button>
                <button
                  type="button"
                  onClick={() => onNeverLoggedInChange(!neverLoggedIn)}
                  className={`inline-flex min-h-[40px] shrink-0 touch-manipulation items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${chipClass(neverLoggedIn)}`}
                >
                  Never logged in
                </button>
              </div>
            </div>

            <label className="flex w-full flex-col gap-1 sm:max-w-xs">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Sort
              </span>
              <select
                className="zenith-native-filter-input h-[44px] w-full rounded-xl px-3 text-sm"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SolarHubUserSortBy)}
                aria-label="Sort Solar Hub users"
              >
                {SOLAR_HUB_USER_SORT_OPTIONS.map((opt) => (
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
