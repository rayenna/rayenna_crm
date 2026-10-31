# Lost Deals analytics

**Lost Deals** (`/reports/lost-deals`) is the sixth **Reports** pack for **Admin** and **Management**. It shows lost count and value, win rates, reason mix, competition subtypes, and a working list of lost projects — built for phones as well as desktops. Open it from **Reports**. The old `/lost-deals` path still redirects here.

## At a glance

| Role | Access |
| :-- | :-- |
| **Admin / Management** | Full page |
| **Sales / Operations / Finance** | Not listed on Reports — access denied if opened directly |

→ [Projects](#projects-module) · [Permission matrix](/help/roles#permission-matrix)

## Layout (mobile-first)

1. **All sellers** and **Export** sit in the header (same compact pattern as other Reports packs). **All sellers** reloads the pack from the server — KPIs, win rate, charts, list, and Export all follow that seller. There is **no Print**.
2. **FY / Quarter / Month** — compact filters (same date rules as Dashboard / Zenith). Combined with **All sellers** they define the pack scope.
3. **KPIs** — on a phone: **Lost count** and **Lost ₹** are primary; win rates sit on a quiet line underneath. On wider screens you see four tiles (count, ₹, win rate count, win rate ₹).
4. **Uncategorized cue** — if any lost deals lack a reason, a quiet **“N uncategorized — review”** control appears. When **40%+** are uncategorized, a stronger banner explains why charts stay weak and links to the list.
5. **Lost projects** — the working list sits **under the KPIs** (not below the charts).
6. **Insights** — reason / competition / salesperson / FY charts. On a phone they live in a collapsed **Insights** accordion so the list stays above the fold; on desktop the four charts stay open in a grid.

## Lost projects list

- **Phones (under ~744px):** **cards** — customer, value, Uncategorized/reason; **tap the whole card** to open the project.
- **Wider screens:** sortable **table**; **tap the row** (or # / customer) to open the project.
- **PE Ready icon** — a small gold proposal icon next to the customer name means a **PE Ready** proposal is still stored in Proposal Engine (all four artifacts saved). Open the project and use **Proposals** to review it.
- **Search** — customer, project #, salesperson, or reason text. Type **PE Ready** to list only those with a saved proposal.
- **How to read this list** — short legend for Uncategorized, competition subtypes, the PE Ready icon, and value.
- **Filter: uncategorized** — one tap for deals with no Lost reason (same as the cue / banner).

Search and chart chips apply on the already-loaded lost projects (client-side). Changing **All sellers** or FY / Quarter / Month reloads the pack.

## Export

**Export** (Excel / PDF / PowerPoint) uses the same confirmation as the other Reports packs. The file follows **All sellers** plus FY / Quarter / Month — not the search box or chart chip. Sheets include summary KPIs, reason mix, competition, salesperson, FY, and the lost-projects list.

## Charts → list

Tap a **reason** slice (or legend row), **competition** bar, **salesperson** bar, or **FY** bar to filter the Lost projects **list only** (KPIs stay on the current All sellers / date scope). A gold **chip** shows the active filter; tap **×** on the chip to clear. The page scrolls to the list after you tap.

To scope **KPIs, charts, list, and Export** to one seller, use **All sellers** at the top — that is not the same as tapping a salesperson bar.

## How numbers are calculated

- **Lost ₹** — sum of **project cost** on Lost projects in the FY / Quarter / Month scope.
- **Win rate (count / ₹)** — Confirmed / Installation / Completed / Subsidy Credited vs Lost in the **same** date and **All sellers** scope.
- On a phone, open **How this is calculated** under the title for the full note.

## Related workflows

1. Open a lost project → **Edit** → set **Lost date** and **Reason for Loss** (and competition subtype when relevant).
2. Return to **Reports → Lost Deals** — uncategorized count and charts update after refresh.
3. From Zenith / Dashboard, **Lost** deep-links open this pack with the same FY filters preserved (`/lost-deals` still redirects).
