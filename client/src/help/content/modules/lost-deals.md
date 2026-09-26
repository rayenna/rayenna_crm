# Lost Deals analytics

**Lost Deals** (`/lost-deals`) is a staff analytics page for **Admin** and **Management**. It shows lost count and value, win rates, reason mix, competition subtypes, and a working list of lost projects — built for phones as well as desktops.

## At a glance

| Role | Access |
| :-- | :-- |
| **Admin / Management** | Full page |
| **Sales / Operations / Finance** | No menu entry — access denied if opened directly |

→ [Projects](#projects-module) · [Permission matrix](/help/roles#permission-matrix)

## Layout (mobile-first)

1. **FY / Quarter / Month** — compact filters (same date rules as Dashboard / Zenith).
2. **KPIs** — on a phone: **Lost count** and **Lost ₹** are primary; win rates sit on a quiet line underneath. On wider screens you see four tiles (count, ₹, win rate count, win rate ₹).
3. **Uncategorized cue** — if any lost deals lack a reason, a quiet **“N uncategorized — review”** control appears. When **40%+** are uncategorized, a stronger banner explains why charts stay weak and links to the list.
4. **Lost projects** — the working list sits **under the KPIs** (not below the charts).
5. **Insights** — reason / competition / salesperson / FY charts. On a phone they live in a collapsed **Insights** accordion so the list stays above the fold; on desktop the four charts stay open in a grid.

## Lost projects list

- **Phones (under ~744px):** **cards** — customer, value, Uncategorized/reason; **tap the whole card** to open the project.
- **Wider screens:** sortable **table**; **tap the row** (or # / customer) to open the project.
- **Search** — customer, project #, salesperson, or reason text.
- **How to read this list** — short legend for Uncategorized, competition subtypes, and value.
- **Filter: uncategorized** — one tap for deals with no Lost reason (same as the cue / banner).

Filters and search apply on the already-loaded lost projects for the date scope (client-side).

## Charts → list

Tap a **reason** slice (or legend row), **competition** bar, **salesperson** bar, or **FY** bar to filter the Lost projects list. A gold **chip** shows the active filter; tap **×** on the chip to clear. The page scrolls to the list after you tap.

Use this to finish tagging reasons or to review one salesperson’s losses without leaving the page.

## How numbers are calculated

- **Lost ₹** — sum of **project cost** on Lost projects in the FY / Quarter / Month scope.
- **Win rate (count / ₹)** — Confirmed / Installation / Completed / Subsidy Credited vs Lost in the **same** date scope.
- On a phone, open **How this is calculated** under the title for the full note.

## Related workflows

1. Open a lost project → **Edit** → set **Lost date** and **Reason for Loss** (and competition subtype when relevant).
2. Return to **Lost Deals** — uncategorized count and charts update after refresh.
3. From Zenith / Dashboard, **Lost** deep-links can open this page with the same FY filters preserved.
