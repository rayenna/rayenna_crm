# Explore charts

**Explore the landscape** — click bars, slices, and FY points to open drawer lists.


## Charts, funnels, and shortcuts

- **Hover** tooltips show exact values where the chart supports them.
- **Click to explore** — Where you see that hint, use the interactions described in [Explore charts & drill-down](#explore-charts-and-drill-down-zenith); lists open in the **Quick Actions** drawer with totals aligned to the chart metric. The **Deal flow funnel** and **Proposal Engine** (under Your Focus) use the same drawer pattern with **Open in Projects →** where applicable.
- **Loading** — Skeleton placeholders while data loads; use **Retry** or refresh if an error banner appears.

---

## Revenue and profit by FY chart (Zenith)

**What it shows** — **Total Revenue** (orange line / points) and **Total Profit** (teal bars) per **financial year**, for deals that match CRM **revenue** rules (confirmed-path statuses, same logic as the classic dashboard). **Profit** is **gross profit** summed for projects that have it recorded.

**Filters** — When you pick **one or more FYs** in the command bar, the chart **only shows those years** on the axis (so hover and tooltips stay on the filtered period). With **no** FY selected, you see the full series returned for Zenith.

**How to drill down**

- **Orange point (Total Revenue)** — Opens the drawer: **FY … — Revenue** with projects in that year that count toward revenue; list **totals use order value** and should match the revenue point for that FY.
- **Teal bar (Total Profit)** — Opens **FY … — Profit Projects** with projects that have **gross profit** in that year; the drawer shows **gross profit** per row and in the **Total** (teal accent), not order value — so the total matches the **profit** bar.

**Small or zero profit bars** — You can still open the **profit** drill-down: there is an invisible hit area along the bar baseline so **every year** on the chart is tappable.

**Tooltip** — Hover shows **Total Revenue** and **Total Profit** once each (no duplicate lines). The footer reminds you which target is which.

---

## Customer projects profitability (Zenith)

**What it is** — Same idea as the **Customer Profitability** word cloud on the classic **Sales / Management / Finance** dashboards: up to **50 projects** with **profitability** filled in on the project (**Sales & Commercial**), ordered by profitability, labelled with the **customer** name (primary name, with a fallback).

**Word Cloud vs Top 10** — **Word Cloud**: **larger text = higher profitability** on that project (relative to others in the list). **Top 10**: a readable ranked list. **Font size** in the cloud is proportional to profitability; colours indicate tiers.

**Reading it** — Each entry is **one project**, not lifetime customer totals. The same customer name can appear more than once if several of their projects rank in the top set.

**Filters** — Respects Zenith **FY / Quarter / Month** like other tiles.

**Click-through** — **Word Cloud** and **Top 10** rows open the **Projects** page directly (same URL rules as the classic Dashboard profitability tile: **search** + **revenue** slice + command-bar dates), not the Quick Actions drawer.

---

## Explore charts and drill-down (Zenith)

**Section title** — **Explore the landscape**. Many panels show **Click to explore →** in the header.

**Layout** — Most bar and donut charts in this section share the **same chart height** on a given screen (aligned with the **inverter brand** chart). The bottom **panel / inverter** pair uses a **paired** height so the two lifecycle bars line up side by side.

**Behaviour** — Clicking a bar, slice, stage, FY point, or bank (where implemented) opens the **Quick Actions** drawer in **list mode**: a **filter label** at the top (e.g. lead source, **customer type**, stage, FY revenue or profit, loan bank) and a **scrollable project list** with **Open →** to jump to **Project detail**. Each list row shows the **customer / project name**, a compact **Sales** line (assigned salesperson, or **Unassigned**), **stage**, amounts, and health — so you can see who owns the deal before you open it. The projects are the same cohort the chart used for that slice, with **Zenith date filters** applied. The **Availing Loan** KPI tile (**Finance** and **executive** Zenith) uses the same **list mode** for its cohort ([KPI strip](#kpi-strip-and-year-on-year)).

**Open in Projects →** — When the footer link is shown, it opens the **Projects** page with URL parameters aligned to that drill-down (same slice definitions the server uses for **Projects** list filters — e.g. **zenithSlice** for revenue vs pipeline, **zenithFyProfit** for FY profit rows, **peBucket** for Proposal Engine buckets, stage and payment params for the funnel). Use it when you need the full grid, export context, or columns beyond the drawer.

**The Board** — Uses the **same drawer and list pattern**: click **header totals** or a **salesperson’s revenue / deal count** to see every deal included in that figure for the board’s **Month / Quarter / FY** selection (see [The Board (leaderboard)](#the-board-leaderboard)).

**FY revenue vs FY profit** — For **Revenue & profit by FY**, revenue and profit use **different** list metrics (order value vs gross profit); see [Revenue and profit by FY chart](#revenue-and-profit-by-fy-chart-zenith). The **Open in Projects →** link carries the matching filter so the **Projects** total lines up with the chart point you clicked.

**Revenue forecast “+N more”** — Opens the list of **all open deals** included in the forecast (not a single tab slice).

**Customer Type donuts** — Chart titles are **Revenue by Customer Type** and **Pipeline by Customer Type**. Slices use the linked customer’s **customer type** from **Customer Master** (**Residential**, **Apartment**, **Commercial**) — **not** the project **Segment** filter (Subsidy / Non-Subsidy). **Revenue** and **Pipeline** are separate charts with different cohort rules (revenue-eligible vs open pipeline). Click a slice → drawer list; **Open in Projects →** applies the **Customer type** filter on the Projects page (same as classic Dashboard donuts).

**Proposal Engine (Your Focus)** — Not in this grid; see [Your Focus](#your-focus-role-specific). Row click → drawer list built from the **same bucket IDs** the summary API used for counts; **Open in Projects →** uses **peBucket** + command-bar dates.

## Panel and inverter brand charts (Zenith)

On **executive** Zenith (**Sales**, **Management**, **Admin**) and **Operations** Zenith, **Explore the landscape** ends with a **paired row** of horizontal bar charts: **Projects by panel brand** and **Projects by inverter brand** (on mobile, open the **Charts** tab first — see [Mobile navigation](#mobile-navigation-and-layout-zenith)). Each bar aggregates only projects that already have **both** **Panel brand** and **Inverter brand** filled in (same cohort as lifecycle analytics). The two cards use the **same width and chart height** on a given screen so they align visually.

**Hover a bar** to see a tooltip with: the **brand** name, **project count**, **Order value (sum)**, **System capacity (sum)** (total **kW** where system capacity is recorded on those projects; **—** when none), the estimated **Panel cost** or **Inverter cost** line, and **Click to view projects →** to drill into the matching list. Headers show **Click to explore →** like other Explore charts.

---
