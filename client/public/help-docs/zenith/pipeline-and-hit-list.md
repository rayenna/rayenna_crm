# Pipeline and Hit List

**Today's Hit List** (up to seven urgent deals) and the full **Your pipeline today** table live in **Your Focus** and the executive band — see [Your Focus](#your-focus-role-specific) and [Executive layout](#executive-sales-management-admin).


## Sorting and filtering inside Zenith tables

In Zenith, some tables can be refined **without changing your dashboard filters**:

- **Sort**: click a column heading (e.g. Deal value, Health, Last activity, Alert, Confirmation) **where the table offers it** — **Your pipeline today** under Your Focus, and **Today’s Hit List** beside the KPI band (same click-to-toggle pattern, with **↑ / ↓** indicators). **Sl No.** / **Prj #** is shown for context on pipeline and Hit List but is **not** a sort control on those tables; **Payment radar** tables sort other columns as labelled.
- **Filter**: use **Filter customer…**, **All stages**, and **All salespeople** (where shown) — **Your pipeline today** and **Today’s Hit List** both use this pattern on **one row**. On the Hit List, filters apply only to the **up to seven** urgent rows already chosen for the day; if some rows are hidden, a compact **“X of N”** hint may appear.

**Today’s Hit List vs Your pipeline today** — The Hit List is still a **prioritised slice** (server-ranked, capped at **seven** deals) from the same zenith-focus pipeline data. **Your pipeline today** is the **full** pipeline table for your filters (with its own sort/filter). Use **Your Focus → Your pipeline today** when you need the complete list beyond the Hit List cap.

These controls work on the rows already loaded for your current FY / Quarter / Month filters (no extra API calls for the Hit List slice beyond the focus payload you already have).

## Deal Health Score (Zenith)

**Deal Health** is the same **0–100** score as on the **Projects** list: it summarises how “healthy” an **open** deal looks from **Activity**, **Momentum**, **Deal value** (**₹2L–₹8L** sweet spot with a mild discount above ₹8L), **Commitment** (confirmation + advance when booked; order value + expected commissioning on pre-order stages), and **Lead source**. Those five parts add up (with caps per part) to the number on the badge; **hover** any badge to see each part and how it scored.

**Where it shows in Zenith**

- **Your pipeline today** (in **Your Focus**): one badge per row for your deals, plus **Log activity** when you need to record a touchpoint.
- **Today’s Hit List** (beside the KPI strip on wide layouts for Sales / Management / Admin): the **same column style** as **Your pipeline today** — including **Sl No.** / **Prj #**, **last activity** (*N*d ago), **confirmation date**, and the badge; use **+ My Day** on a row to pin a follow-up to your personal task list (optionally linked to that project), or **Open →** to open **Quick Actions** (then **Open full project** if you need **Project detail**).

**Why it helps**

You can **spot cold or stuck deals** in context with the rest of Zenith (KPIs, funnel, filters) without exporting to a spreadsheet. **Management / Admin** see the same badge semantics when they review pipeline rows in **Your Focus**.

**Not shown** for **Completed**, **Subsidy Credited** (including combined/loan variants where applicable), or **Lost** — same rule as elsewhere.

For the **full explanation** of weights, sort behaviour, and sales tips, open the **Projects** module help and the section **Deal Health Score**.

## Executive (Sales, Management & Admin)

**KPI strip** — Typically includes **Total Capacity**, **Total Pipeline**, **Total Revenue**, **Total Profit**, **Pipeline Conversion**, and **Availing Loan** (definitions match the classic dashboard and the sections above). **Pipeline Conversion** is revenue divided by **open pipeline plus lost order value** (the **Total Pipeline** tile still excludes Lost). **Availing Loan** is **clickable** → **Quick Actions** list + **Open in Projects →**, like charts and the funnel ([KPI strip](#kpi-strip-and-year-on-year)).

**Your Focus** — See [Your Focus](#your-focus-role-specific); **Sales** sees own pipeline, **Management/Admin** see the combined focus layout.

**Today’s Hit List** — On wide screens, Sales / Management / Admin also see **Today’s Hit List** beside the KPI strip. It is built from the **same zenith-focus pipeline rows** as **Your pipeline today**, but **scored and capped** (up to **seven** deals) for what needs attention **today** — for example **expected commissioning** overdue or within a week (**Overdue** / **Closing soon**), **stalled** proposals, **nudge needed** on site survey, or **going cold** leads (exact rules are role- and data-dependent).

**Layout (desktop / tablet)** — A **compact single-line filter bar** (**Filter customer…**, **All stages**, **All salespeople** on one row), then a **scrollable table** with **sortable** column headers: **Sl No.** / **Prj #** (left-aligned), **Customer**, **Stage**, **Sales person**, **Deal value**, **Last activity** (*N*d ago, coloured pill), **Alert** (the hit-list reason), **Confirmation** (order **confirmation date**, or **—** if not set), **Deal Health** (badge + hover breakdown), and **Actions** (**+ My Day** and **Open →** side by side). When there are deals on the list, a short note under the title may remind you to **scroll horizontally** and use **Open →** — shown on **tablet / laptop widths** (not on small phones, where stacked cards already surface **Open →** clearly).

**Narrow screens** — The same **filters** stay on one row where possible (horizontal scroll if needed); **stacked cards** show the same deal facts (no wide multi-column row).

**+ My Day** — In **Actions**, beside **Open →**. Pins one open follow-up per project; after pinning the button shows **✓ My Day** and cannot duplicate. The task appears under **Today** in the ☀ drawer — CRM rows are **not** listed again inside the drawer.

**Open →** — Opens **Quick Actions** for that project (stage, log activity, dates, etc., per your permissions — same entry point as **Open →** on **Your pipeline today**). Management remains **view-only** where that rule already applies.

If a day has no qualifying deals, the card shows **All clear**.

**The Board** — Full-width **sales leaderboard** (**Sales**, **Management**, **Admin** only) sits **below** the **KPI / Hit List / Revenue forecast** band and **above** the **Deal flow funnel**. See [The Board (leaderboard)](#the-board-leaderboard).

**Deal flow funnel** — See [Deal flow funnel (Zenith)](#deal-flow-funnel-zenith): stage rows and **payment status** pills open the **Quick Actions** list for that slice; counts and lists use the **same rules** as the funnel tile.

**Your Focus** — Collapsible role panels **below** the funnel (pipeline / payment radar / installation pulse / Proposal Engine — see [Your Focus](#your-focus-role-specific)).

**Charts and panels** — Then **Explore the landscape**: **Revenue by lead source**, **Pipeline by lead source**, **Revenue vs pipeline by sales team**, **Revenue by Customer Type** and **Pipeline by Customer Type** donuts (from **Customer Master**, not project Subsidy/Non-Subsidy segment), **Revenue & profit by financial year**, **Projects by stage**, **Projects availing loans by bank**, **Customer projects profitability** (word cloud / Top 10). **Proposal Engine** for executive roles is under **Your focus**, not in the chart grid.

**Links** — Chart drill-downs, **The Board** totals, **funnel** stages and payment pills, **Proposal Engine** rows under Your Focus, and the **Availing Loan** KPI tile (Finance + executive Zenith) open the **Quick Actions** drawer with a **filtered project list** and **Open in Projects →** where applicable (see [Explore charts & drill-down](#explore-charts-and-drill-down-zenith), [The Board](#the-board-leaderboard), [Deal flow funnel](#deal-flow-funnel-zenith), [KPI strip](#kpi-strip-and-year-on-year), and [Quick Actions drawer](#quick-actions-drawer-zenith)).

## Layout stability and Hit List (Zenith)

On **wide screens**, **Today’s Hit List** and the **KPI + Revenue forecast** row sit side by side. The Hit List column height is matched to the KPI band so the row looks balanced. **Fixed-height** tiles (including **Revenue forecast** and the **FY chart** panel) avoid **layout shift** when you switch forecast tabs or when charts redraw.

The Hit List body **scrolls vertically** when there are several rows (below the sticky **filter** row), and the **table** can **scroll horizontally** on narrower widths so columns stay readable — same pattern as other wide Zenith tables.

---
