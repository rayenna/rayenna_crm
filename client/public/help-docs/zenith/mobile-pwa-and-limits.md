# Mobile, PWA, and limits



## Mobile navigation and layout (Zenith)

On viewports **narrower than `lg` (~1024px)**, Zenith uses a **simplified layout** so you scroll less and tap larger targets:

| Tab | What you see |
| :-- | :-- |
| **Today** (Sales / Management / Admin) | **Today’s Hit List**, **KPI strip**, **Revenue forecast**, and **The Board** |
| **Today** (Operations / Finance label may read **KPIs**) | **KPI strip** only |
| **Pipeline** | **Deal flow funnel** and **Your Focus** (role-specific panels) |
| **Charts** | **Explore the landscape** (stage, FY, lead source, sales team, **Revenue by Customer Type** on Operations, loans on Finance, etc.) |
| **More** (Finance only) | **Revenue by Customer Type** donut and **Customer profitability** |

- **Bottom tab bar** — Fixed above the safe area at the bottom; switching tabs **scrolls** to that section and shows **only** that tab’s content (desktop still shows everything in one scroll).
- **Floating actions** (mobile only) — **✦ Briefing** (opens the daily briefing) and **back to top**, sitting above the tab bar.
- **Queued sync badge** — When offline with pending drawer actions, the **Today** tab can show a **count badge** on the tab icon.
- **Wide tables** — Pipeline, Hit List, and similar blocks may **scroll horizontally**; a light edge fade hints at more columns. **Tap to explore →** on charts; on **md+** widths, **Swipe sideways for more columns →** may appear on some tables.

Train field users to use **Open in Projects →** from a drawer when they need the full **Projects** grid on a small phone.

---

## Working offline (Zenith PWA)

Rayenna CRM can be **installed** on a phone or laptop (**Add to Home Screen** / install prompt). Zenith is built to stay usable on patchy mobile networks:

**What works offline (after you have opened Zenith online at least once)**

- **Read** — The **last successfully loaded** Zenith dashboard for your current **FY / Quarter / Month** filters can appear with a gold banner: *You’re offline — showing saved data…*
- **Write (queued)** — In **Quick Actions**, **Operations**, and **Finance** quick drawers, supported actions (e.g. **Log activity**, **stage** updates, some **payment** / **date** / **value** fields) are saved in a **queue on this device** and sent when connectivity returns.
- **Status strip** — Red **You’re offline** bar under the command bar; optional **Sync** when actions are queued. When you reconnect: **Syncing…**, then **Back online — all changes synced** (or a **Retry** if something failed).

**What does not queue offline**

- Loading **new** filter combinations you have never fetched online.
- **My Day**, **Solar News**, and other modules outside the Zenith drawer queue.
- **Open in Projects →** (needs the live **Projects** API).

**Tips**

- Open Zenith once on Wi‑Fi with your usual filters before going to a site with weak signal.
- If numbers look stale, reconnect and pull to refresh or change a filter to refetch.
- Failed sync items stay in the queue with **Retry** on the status strip.

---

## Explorer batch limit (Zenith)

Zenith loads a **batch** of lightweight project rows for **charts**, **The Board** drill-downs, **funnel** lists, the **Availing Loan** KPI list, and related drawer views (same FY / Quarter / Month as the command bar). The server returns **up to 5,000** projects per load (most recently **updated** first), so **extremely large** portfolios may not place every project in that batch.

- **Drawer and chart lists** only include projects that appear in that batch **and** match the slice you clicked. **Counts on tiles** (aggregates from the server) can still reflect **all** projects in scope.
- **Open in Projects →** uses **Projects** list API filters, **not** the 5,000 batch, so the **Projects** page can show **more rows** than the drawer when you are over the batch limit.

For typical portfolios this makes **no practical difference**; it matters only when many thousands of projects share the same date filter.

---
