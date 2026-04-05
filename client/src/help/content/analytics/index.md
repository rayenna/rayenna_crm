# Analytics and Reports

> **Note:** The Dashboard is your main analytics view. Use the filter bar at the top to choose **Financial Year**, **Quarter**, and **Month**; Quick Access counts, the **Payment Status** and **Proposal Engine** summaries, and most KPI tiles follow those filters. Charts may have their own controls where noted.

**Jump to:** [Dashboard filters](#dashboard-filters) · [Quick Access tiles](#quick-access-tiles) · [Payment Status](#payment-status-card) · [Proposal Engine](#proposal-engine-card) · [Layout by role](#layout-by-role) · [Charts](#charts-and-visualizations) · [Zenith Command Center](#zenith-command-center) · [Zenith Revenue Forecast](#revenue-forecast-wide-kpi-tile) · [Zenith FY revenue & profit chart](#revenue-and-profit-by-fy-chart-zenith) · [Zenith drill-down](#explore-charts-and-drill-down-zenith) · [Explorer batch limit](#explorer-batch-limit-zenith)

---

## Dashboard filters

Use the filter bar at the top of the Dashboard to focus on a period. **All Quick Access tiles** (metric cards plus **Payment Status** and **Proposal Engine**), **Year-on-Year** KPIs, and most charts respect these filters.

- **Financial Year (FY)** — One or more years in **April–March** format (e.g. 2024-25).
- **Quarter** — Only when **exactly one** FY is selected: Q1 (Apr–Jun) through Q4 (Jan–Mar).
- **Month** — Only when **exactly one** FY is selected; months follow FY order (April through March). If quarters are selected, only months inside those quarters are listed.

If you select **multiple FYs**, Quarter and Month are disabled. Use **Clear Filter** (or clear FY) to reset and see all periods.

**Tip:** Open **Projects** from a Quick Access row or tile; the address bar keeps the same FY / quarter / month query parameters so the list matches what you saw on the Dashboard.

---

## Quick Access tiles

Quick Access appears below the main KPI area (or at the top on **Operations**). It mixes **metric tiles** (large gradient cards with a single count) and **list cards** (**Payment Status**, and on **Sales** and **Management**, **Proposal Engine**).

**How to use**

1. Set **FY** (and optionally **Quarter** or **Month**).
2. Click a **metric tile** or a **row** inside Payment / Proposal Engine.
3. You land on **Projects** with the Dashboard date filters **plus** the tile’s filter (status, payment status, availing loan, or Proposal Engine bucket).

Hover a metric tile for a short **“View projects”** hint before you click.

---

## Payment Status card

The **Payment Status** card uses the same **indigo header strip** and white card body as **Proposal Engine**. Each row is a **link**:

- **Label** — e.g. Pending, Partial, Fully Paid, N/A (colour-coded).
- **Count** and **outstanding amount (₹)** for that payment bucket.

Clicking a row opens **Projects** filtered by that **payment status** and your Dashboard dates. Rows only appear for statuses that exist in your data for the selected period.

---

## Proposal Engine card

On **Sales** and **Management** dashboards (and **Admin**, who sees the Management layout), the **Proposal Engine** card groups CRM projects by **saved Proposal Engine activity**. It is **not** the same as the CRM pipeline stage. Each row is a shortcut to **Projects** with the right filter already applied, together with your Dashboard **FY / Quarter / Month** filters.

Only **Sales**, **Management**, and **Admin** can load this card; other roles do not see it.

**Zenith (Your Focus)** — The **same four buckets** appear under collapsible **Your Focus** for those roles. **Click a row** to open the **Quick Actions** drawer with the matching project list, then **Open in Projects →** for the full **Projects** page with the same **PE bucket** and command-bar dates ([Zenith Command Center](#zenith-command-center)).

**What each row means** (click any row on the dashboard to open **Projects** with that filter):

#### PE Ready

The project is set up in Proposal Engine and has **all four** saved parts: **Costing**, **BOM**, **ROI**, and **Proposal**.

#### PE Draft

The project is in Proposal Engine with **at least one** of those parts saved, but **not all four** yet.

#### PE Not Yet Created

The project is linked in Proposal Engine, but **nothing** has been saved there yet.

#### Rest

The project is **not** opened in Proposal Engine yet, but it is in **Proposal** or **Confirmed** in CRM — so it is ready for someone to start PE work.

Each dashboard row also shows **project count** and **CRM order value (₹)**. For **PE Ready**, **PE Draft**, and **PE Not Yet Created**, a **PE ex GST** line appears when costing data supports it (**Rest** uses CRM order value only).

**Tip:** Use these rows to open **Projects** with the right filter. To edit costing, BOM, ROI, or the document, open the **Proposal Engine** from the project (or your PE bookmark), not from this dashboard card alone.

---

## Layout by role

Quick Access **layout** depends on your role. **Payment Status** appears for **Sales**, **Operations**, **Finance**, and **Management**. **Proposal Engine** appears for **Sales**, **Management**, and **Admin** (Admin uses the Management-style layout).

### Sales

**On a laptop or a large monitor** (three tiles per row, all the same width):

1. **First row:** My Leads, Site Survey Stage, Proposal Stage.  
2. **Second row:** Open Deals, My Confirmed Orders, Under Installation.  
3. **Third row:** **Payment Status** (payment list), **Completed Installation**, **Proposal Engine** (PE summary list).

**Open Deals** uses the same filter as the older tile name **My Open Deals** (Lead + Site Survey + Proposal stages).

**On a phone** the tiles stack **one under another** in that same order.

**On a tablet or a narrow browser window** you usually see **two** tiles per row. The **third row** is an exception: **Payment Status**, **Completed Installation**, and **Proposal Engine** each use a **full row** so the two list cards stay easy to read.

**Third row alignment (wide screens only):** **Payment Status** and **Proposal Engine** are drawn to the **same height** so they line up neatly. **Completed Installation** stays its natural height and sits **centred** between them.

Inside the list cards, you only see **real rows** for data that exists — empty placeholder rows are not added.

### Management and Admin

**Row 1 (four tiles):** Total Leads, Site Survey Stage, Proposal Stage, Open Deals.

**Row 2 (four tiles):** Confirmed Orders, Under Installation, Completed Installation, Subsidy Credited.

**Row 3 (three tiles across, same width each):** **Payment Status** · **Availing Loan** · **Proposal Engine**.

**When the screen is wide enough for three columns in that bottom row**, **Payment Status** and **Proposal Engine** are the **same height** so the two list cards align. **Availing Loan** in the middle keeps its normal compact card size and does **not** stretch to match the lists.

### Operations

**One band of four tiles:** Pending Installation, Completed Installation, Subsidy Credited, **Payment Status**.

There is **no** Availing Loan tile and **no** Proposal Engine card on this dashboard.

### Finance

**On a wide screen** you may see **up to five** tiles in one band: Pending Installation, Completed Installation, Subsidy Credited, **Availing Loan**, **Payment Status**. If the window is narrower, tiles wrap to the next line so they stay usable.

---

## Role-based dashboards (summary)

- **Sales** — Year-on-Year summary, Quick Access (above), Projects by Stage and Revenue & Profit by FY, Revenue by Lead Source, Pipeline by Lead Source, Project Value by Segment, Pipeline by Customer Segment, Customer Profitability word cloud, Projects Availing Loans by Bank. Data is **scoped to the logged-in salesperson**.
- **Operations** — Quick Access, optional Pending Subsidy list, Projects by Stage, Revenue by Sales Team, Project Value and Profit by FY, Project Value by Segment. **Company-wide** execution view.
- **Finance** — Top KPIs (Total Revenue, Amount Received, Outstanding Balance), Quick Access row (above), Revenue by Lead Source, Revenue by Sales Team, Project Value and Profit by FY, Project Value by Segment, Customer Profitability word cloud, Projects Availing Loans by Bank. **Company-wide**.
- **Management / Admin** — Year-on-Year summary, Quick Access (above), Projects by Stage and Revenue & Profit by FY, Revenue by Lead Source, Pipeline by Lead Source, Revenue by Sales Team, Sales Team treemap, Project Value by Segment, Pipeline by Customer Segment, Customer Profitability word cloud, Projects Availing Loans by Bank. **Company-wide**.

---

## Charts and visualizations

- **Year-on-Year** — Capacity, pipeline, revenue, profit vs same period last year (**Sales**, **Management**).
- **Projects by Stage / Execution Status** — Bar chart beside **Revenue & Profit by FY** (**Sales**, **Management**).
- **Revenue & Profit by Financial Year** — Grouped columns (**Sales**, **Management**; other roles in their own layout).
- **Revenue by Lead Source** / **Pipeline by Lead Source** — Where shown on your role’s dashboard.
- **Revenue by Sales Team** — **Operations**, **Finance**, **Management**.
- **Sales Team Performance (treemap)** — **Management** only.
- **Project Value by Segment** — Pie chart.
- **Pipeline by Customer Segment** — Pie chart (**Sales**, **Management**).
- **Customer Profitability word cloud** — **Sales**, **Finance**, **Management**.
- **Projects Availing Loans by Bank** — **Sales**, **Finance**, **Management** (not **Operations**).

Data refreshes when you load the Dashboard or change filters. If numbers look stale, refresh the page.

---

## Zenith Command Center

> **Zenith** is Rayenna CRM’s **command center analytics** experience: the same trusted numbers as the classic **Dashboard**, presented full-screen with a dark theme, **AI Insights**, **The Board** sales leaderboard (with drill-down lists), **collapsible Your Focus** panels, the **Deal flow funnel** (stage and payment shortcuts), **clickable charts** and the **Availing Loan** KPI (**Finance** and **executive** Zenith) that open a **Quick Actions** drawer, **Proposal Engine** readiness rows (Sales / Management / Admin under Your Focus), **Payment radar** with **Top overdue** guidance, and a **Victory** toast when deals hit winning stages — so you can jump straight to projects and verify numbers. List views opened from Zenith include **Open in Projects →** in the drawer footer so you can continue on the full **Projects** page with the **same filters** as the list. Use the **sticky command bar** for **Financial Year**, **Quarter**, and **Month** — KPIs, the funnel, **Revenue forecast**, **Explore the landscape** charts, and project lists loaded for drill-down **all follow those filters**. Data is loaded from the server for your session (not “this browser only”), so what you see stays aligned with CRM after login. Zenith is documented here under **Analytics and Reports** (no separate top-level Help topic).

**In this section:** [Opening Zenith](#opening-zenith) · [Filters and reset](#filters-and-reset) · [AI Insights ticker](#ai-insights-ticker) · [KPI strip and YoY](#kpi-strip-and-year-on-year) · [Your Focus](#your-focus-role-specific) · [Payment radar](#payment-radar-finance) · [Installation pulse](#installation-pulse-operations) · [Executive](#executive-sales-management--admin) · [Deal flow funnel](#deal-flow-funnel-zenith) · [The Board (leaderboard)](#the-board-leaderboard) · [Victory toast](#victory-toast-stage-wins) · [Operations (Zenith)](#operations-zenith) · [Finance (Zenith)](#finance-zenith) · [Revenue Forecast tile](#revenue-forecast-wide-kpi-tile) · [Revenue & profit by FY chart](#revenue-and-profit-by-fy-chart-zenith) · [Customer projects profitability](#customer-projects-profitability-zenith) · [Explore charts & drill-down](#explore-charts-and-drill-down-zenith) · [Quick Actions drawer](#quick-actions-drawer-zenith) · [Layout & Hit List](#layout-stability-and-hit-list-zenith) · [Charts overview](#charts-funnels-and-shortcuts) · [Explorer batch limit](#explorer-batch-limit-zenith) · [Help and tips](#help-and-tips-zenith)

### Opening Zenith

1. Open the **Dashboard** menu in the top navigation (next to **Dashboard**).
2. Choose **Zenith ✦**.

Zenith is available to **Sales**, **Operations**, **Finance**, **Management**, and **Admin**. If your role does not include it, ask your administrator.

From **Zenith**, press **?** (when not typing in a field) to open **Help** on this **Analytics** page and jump to **Zenith Command Center**.

### Filters and reset

The command bar stays at the top as you scroll.

- **Financial Year (FY)** — Select one or more years (April–March labels). FY options come from the same source as the main dashboard.
- **Quarter** — Available when **exactly one** FY is selected. Quarters follow the CRM definition: **Q1** Apr–Jun, **Q2** Jul–Sep, **Q3** Oct–Dec, **Q4** Jan–Mar.
- **Month** — Available when **exactly one** FY is selected. If you pick quarters first, month choices narrow to months inside those quarters.
- **Reset** — Clears all FY, quarter, and month selections. With filters empty, Zenith can show **unfiltered** summary data (same idea as clearing filters on the classic dashboard).

**Tip:** Filter rules match the [Dashboard filters](#dashboard-filters) section above so numbers stay comparable between **Dashboard** and **Zenith**.

### AI Insights ticker

Directly under the **command bar**, Zenith shows an **AI Insights** ribbon: a **horizontal scrolling strip** of short, plain-English highlights derived from the **same dashboard data** already loaded for your filters (no external AI service).

- **Content** — Examples include conversion vs a simple benchmark, top pipeline or revenue by salesperson, stale pipeline signals, revenue vs a prior period, loan concentration by bank, and role-relevant finance or operations notes. The exact lines change with your **role** and **filters**.
- **Motion** — Text scrolls continuously; **hover** over the strip to **pause** scrolling.
- **Click an insight** — The page **smooth-scrolls** to a related section (KPIs, **The Board**, funnel, **Your Focus**, charts, etc.). If a target section does not exist for your role, Zenith scrolls to the nearest sensible anchor.

### KPI strip and year-on-year

The **top row of KPI cards** summarises key metrics for your role. Each card includes:

- A **large value** that **animates from zero** when the page loads or when you **change date filters** (about 1.2 seconds, ease-out), for a quick read of the current number.
- A **mini sparkline** (line chart, no axes) using the **last seven financial-year buckets** available for that metric in the payload — the line is **gold** when the series trends up and **crimson** when it trends down.
- A **trend badge** in the **top-right** (e.g. **▲ 12%** in teal / **▼ 3%** in crimson) when a **period-over-period %** is available — same rules as classic dashboard comparisons (e.g. one FY selected for YoY-style badges).
- A subtle **hover glow** (gold-tinted shadow) on the card.

Cards **stagger in** slightly when the strip appears (animation order by column).

**Availing Loan (clickable KPI)** — On **Finance** Zenith and **executive** Zenith (**Sales**, **Management**, **Admin**), the **Availing Loan** tile is **clickable**. It opens the **Quick Actions** drawer in **list mode** with projects that have **Availing Loan/Financing** set (excluding **Lost**), scoped to your command-bar **FY / Quarter / Month** — the same interaction model as **Explore the landscape** charts and the **Deal flow funnel** (not a direct jump to **Projects**). Use **Open in Projects →** in the drawer footer for the full **Projects** grid with the **Availing Loan** filter applied.

**YoY / comparison behaviour**

- Comparison badges appear when you select **exactly one** Financial Year (and the system can compare to the **prior FY** or the **same quarter/month in the prior FY**, matching dashboard logic).
- If you select **multiple FYs**, those badges are hidden so the comparison stays unambiguous.
- If the prior period was **zero**, the % change may not show (to avoid misleading divides).

Metrics and labels are **role-specific** (see below). **Sales** sees data **scoped to you**; **Management**, **Admin**, **Operations**, and **Finance** see **company-wide** views where applicable.

### Your Focus (role-specific)

**Your Focus** sits in the **Pipeline and priorities** area **below** the **Deal flow funnel** (executive layout: after **The Board** leaderboard when your role has it). It surfaces actionable context **by role**.

**Collapsible panels (all roles that see Your Focus)** — Each block starts **collapsed** when you open Zenith so the page stays scannable. **Click the panel header** (title + chevron) to expand **only** the sections you need. A short subtitle under the **Your focus** heading reminds you: expand each section to work inside it.

| Role | What you see (each in its own collapsible panel when applicable) |
| :-- | :-- |
| **Sales** | **Your pipeline today** — a compact table of **your** leads/deals (assigned to you): **customer**, **stage**, **sales person**, **deal value**, **last activity** (*N*d ago, **green / amber / red** pill by recency), and a **Deal Health** badge (0–100). A **Follow-up needed** count calls out the oldest activity band; **Log activity** opens a short remark modal (saved on the project). **Open →** on a row opens **Quick Actions** for that project. **Proposal Engine** — same **PE readiness buckets** as the classic dashboard (**PE Ready**, **PE Draft**, **PE Not Yet Created**, **Rest**). **In Zenith**, each PE row opens the **Quick Actions** drawer with the **same project set** the server used for that row’s counts; use **Open in Projects →** in the drawer to open the **Projects** list with the matching **PE bucket** and command-bar dates. (On the classic Dashboard Quick Access card, those rows still link straight to **Projects**.) |
| **Finance** | **Payment radar** — see [Payment radar (Finance)](#payment-radar-finance) below. |
| **Operations** | **Installation pulse** — see [Installation pulse (Operations)](#installation-pulse-operations) below. |
| **Management / Admin** | **Company pipeline today**, **Payment radar**, and **Installation pulse** in sequence, then **Proposal Engine** — all collapsible under **Your focus** (company-wide where applicable). **Proposal Engine** rows behave like **Sales**: click a bucket → **Quick Actions** list + **Open in Projects →** with the same filters as **Projects** for that bucket. |

If there is nothing to show for the current filters, **Your Focus** may be hidden. Expanded panels use the same **left accent** colours as before (gold-leaning for pipeline, teal for payment radar, cool accent for installation).

#### Payment radar (Finance)

**KPI strip (three tiles)** — **Total outstanding**, **Avg collection days** (average days from **order confirmation** to **last payment** among **settled** projects in scope — balance zero and amount received &gt; 0; helps benchmark how long full collection typically takes), and **Subsidy pending** (count of projects in **Submitted for subsidy**).

**Payment ageing** — Four buckets (**0–30**, **31–60**, **61–90**, **90+** days overdue) show **project count**, **₹ outstanding** in that band, and a bar proportional to share of total outstanding. **Click a bucket** to filter the **Top overdue** table to rows whose days overdue fall in that band; click again (or **Reset ageing filter**) to clear. Colours escalate from neutral to amber, coral, and red for older debt.

**Top overdue** — A short hint under the **Top overdue** heading explains: **click the project name** (under the **Projects** column) to open the project and work on **payment status**; use **Remind** to send a customer reminder. **Sales person** filter and **Filter customer…** narrow the table; **Reset filters** clears customer text, salesperson selection, and ageing. Sortable columns: **Projects** (customer / project name links), **Sales person**, **Amt**, **Since**, **Days**. Row **Remind** opens a small **Reminder** panel with **WhatsApp** and **Email** options using prefilled copy from the project’s outstanding amount and customer contact fields (opens your device’s apps or `wa.me` / `mailto:` — nothing is sent from Rayenna’s servers).

**Right-hand column (wide layouts)** — **Collected vs outstanding** donut (teal / gold / violet for subsidy pending when present) and **Collections — last 6 months** stacked-style bars (collected vs outstanding per month). A short line under the chart compares **last month’s collected** to the **prior month** (up / down / steady).

#### Installation pulse (Operations)

**Summary** — **Avg install days** and **Delayed** count (installations past expected completion that are not yet marked complete).

**Overdue only** — Toggles the table to rows flagged **overdue** (same rule as the red row tint and progress treatment).

**Table** — **Customer** (with link to Project detail), **kW**, **Sales person** (assigned salesperson), **Start** and **Expected** dates, **Last note** (latest project remark, two-line clamp on medium+ widths), **Progress** (visual bar and % from timeline logic), and **+ Log update** (opens the **Quick Actions** drawer on that project with the **note** area focused so you can log activity without leaving Zenith).

**Sorting** — Click **Customer**, **kW**, **Sales person**, **Start**, **Expected**, or **Progress** to sort; click again to reverse.

**Narrow screens** — The table is **wider than the phone** by design: **scroll horizontally** in the installation region to see all columns. The **Last note** column is **hidden on small viewports** to keep the layout usable; open the project or use **+ Log update** for full context.

**Footnote** — The block explains data sources: **Expected** prefers **expected commissioning** on the project, otherwise **installation completion**; **Start** uses installation start, then stage-entered or order-confirmation dates; **Progress** is driven by elapsed time to the target (or 100% when install-complete).

#### Sorting and filtering inside Zenith tables

In Zenith, some tables can be refined **without changing your dashboard filters**:

- **Sort**: click a column heading (e.g. Deal value, Health, Last activity, Alert, Confirmation) **where the table offers it** — **Your pipeline today** under Your Focus, and **Today’s Hit List** beside the KPI band (same click-to-toggle pattern, with **↑ / ↓** indicators).
- **Filter**: use **Filter customer…**, **All stages**, and **All salespeople** (where shown) — **Your pipeline today** and **Today’s Hit List** both use this pattern. On the Hit List, filters apply only to the **up to seven** urgent rows already chosen for the day; if some rows are hidden, a small **“X of N shown”** hint may appear.

**Today’s Hit List vs Your pipeline today** — The Hit List is still a **prioritised slice** (server-ranked, capped at **seven** deals) from the same zenith-focus pipeline data. **Your pipeline today** is the **full** pipeline table for your filters (with its own sort/filter). Use **Your Focus → Your pipeline today** when you need the complete list beyond the Hit List cap.

These controls work on the rows already loaded for your current FY / Quarter / Month filters (no extra API calls for the Hit List slice beyond the focus payload you already have).

#### Deal Health Score (Zenith)

**Deal Health** is the same **0–100** score as on the **Projects** list: it summarises how “healthy” an **open** deal looks from **Activity**, **Momentum**, **Deal value** (bands tuned for typical **3–5 kW** / **₹1.75L–₹3L** sweet spot), **Close date** (confirmation date + advance vs order value), and **Lead source**. Those five parts add up (with caps per part) to the number on the badge; **hover** any badge to see each part and how it scored.

**Where it shows in Zenith**

- **Your pipeline today** (in **Your Focus**): one badge per row for your deals, plus **Log activity** when you need to record a touchpoint.
- **Today’s Hit List** (beside the KPI strip on wide layouts for Sales / Management / Admin): the **same column style** as **Your pipeline today** — including **last activity** (*N*d ago), **confirmation date**, and the badge; use **Open →** to open **Quick Actions** for that project (then **Open full project** if you need **Project detail**).

**Why it helps**

You can **spot cold or stuck deals** in context with the rest of Zenith (KPIs, funnel, filters) without exporting to a spreadsheet. **Management / Admin** see the same badge semantics when they review pipeline rows in **Your Focus**.

**Not shown** for **Completed**, **Subsidy Credited** (including combined/loan variants where applicable), or **Lost** — same rule as elsewhere.

For the **full explanation** of weights, sort behaviour, and sales tips, open the **Projects** module help and the section **Deal Health Score**.

### Executive (Sales, Management & Admin)

**KPI strip** — Typically includes **Total Capacity**, **Total Pipeline**, **Total Revenue**, **Total Profit**, **Pipeline Conversion**, and **Availing Loan** (definitions match the classic dashboard and the sections above). **Availing Loan** is **clickable** → **Quick Actions** list + **Open in Projects →**, like charts and the funnel ([KPI strip](#kpi-strip-and-year-on-year)).

**Your Focus** — See [Your Focus](#your-focus-role-specific); **Sales** sees own pipeline, **Management/Admin** see the combined focus layout.

**Today’s Hit List** — On wide screens, Sales / Management / Admin also see **Today’s Hit List** beside the KPI strip. It is built from the **same zenith-focus pipeline rows** as **Your pipeline today**, but **scored and capped** (up to **seven** deals) for what needs attention **today** — for example **expected commissioning** overdue or within a week (**Overdue** / **Closing soon**), **stalled** proposals, **nudge needed** on site survey, or **going cold** leads (exact rules are role- and data-dependent).

**Layout (desktop / tablet)** — A **filter bar** above the table (**Filter customer…**, **All stages**, **All salespeople** — same controls as **Company pipeline today**), then a **scrollable table** with **sortable** column headers: **Customer**, **Stage**, **Sales person**, **Deal value**, **Last activity** (*N*d ago, coloured pill), **Alert** (the hit-list reason), **Confirmation** (order **confirmation date**, or **—** if not set), **Deal Health** (badge + hover breakdown), and **Open →**. When there are deals on the list, a short line under the title may remind you to **scroll horizontally** on tight widths and use **Open →** for the **Quick Actions** drawer.

**Narrow screens** — The same **filters** wrap in the Hit List header area; **stacked cards** show the same deal facts (no wide multi-column row).

**Open →** — Opens **Quick Actions** for that project (stage, log activity, dates, etc., per your permissions — same entry point as **Open →** on **Your pipeline today**). Management remains **view-only** where that rule already applies.

If a day has no qualifying deals, the card shows **All clear**.

**The Board** — Full-width **sales leaderboard** (**Sales**, **Management**, **Admin** only) sits **below** the **KPI / Hit List / Revenue forecast** band and **above** the **Deal flow funnel**. See [The Board (leaderboard)](#the-board-leaderboard).

**Deal flow funnel** — See [Deal flow funnel (Zenith)](#deal-flow-funnel-zenith): stage rows and **payment status** pills open the **Quick Actions** list for that slice; counts and lists use the **same rules** as the funnel tile.

**Your Focus** — Collapsible role panels **below** the funnel (pipeline / payment radar / installation pulse / Proposal Engine — see [Your Focus](#your-focus-role-specific)).

**Charts and panels** — Then **Explore the landscape**: **Revenue by lead source**, **Pipeline by lead source**, **Revenue vs pipeline by sales team**, **segment donuts** (revenue and pipeline), **Revenue & profit by financial year**, **Projects by stage**, **Projects availing loans by bank**, **Customer projects profitability** (word cloud / Top 10). **Proposal Engine** for executive roles is under **Your focus**, not in the chart grid.

**Links** — Chart drill-downs, **The Board** totals, **funnel** stages and payment pills, **Proposal Engine** rows under Your Focus, and the **Availing Loan** KPI tile (Finance + executive Zenith) open the **Quick Actions** drawer with a **filtered project list** and **Open in Projects →** where applicable (see [Explore charts & drill-down](#explore-charts-and-drill-down-zenith), [The Board](#the-board-leaderboard), [Deal flow funnel](#deal-flow-funnel-zenith), [KPI strip](#kpi-strip-and-year-on-year), and [Quick Actions drawer](#quick-actions-drawer-zenith)).

### The Board (leaderboard)

**Who sees it** — **Sales**, **Management**, and **Admin** on the **executive** Zenith layout.

**Where** — Full-width card **below** the KPI / Hit List / forecast row and **above** the **Deal flow funnel**.

**What it shows** — Rankings by **assigned salesperson** for **won-path** projects (Confirmed, Under Installation, Completed, Subsidy Credited) counted in a **calendar period** you choose on the board itself:

- **Month** — current calendar month  
- **Quarter** — Indian FY quarters (**Q1** Apr–Jun, **Q2** Jul–Sep, **Q3** Oct–Dec, **Q4** Jan–Mar)  
- **FY** — Indian financial year (Apr–Mar)

Deal credit uses **stage entered** and **confirmation** dates from CRM when present (not “any save” on the project), so **Month**, **Quarter**, and **FY** can show different totals.

**Collapsible** — Like other Zenith panels, the board can be collapsed from the header (**collapsed by default on small phones**, **expanded by default on wider screens**). The header still shows the period label and summary totals when collapsed.

**Transparency — open the deals** — **Click** the **period total** (revenue and deal count in the header on desktop, or **View N deals** on mobile) or **click a row’s revenue / deal count** to open the same **Quick Actions** drawer **list mode** used for **Explore** chart drill-downs. The list is filtered to the deals that make up that total or that salesperson’s slice for the selected **Month / Quarter / FY** (not the command-bar FY alone). From the list, use **Open →** to jump to **Project detail** or drill into **Quick Actions** for a single project. Use **Open in Projects →** in the drawer footer when you want the full **Projects** page with the same slice and filters.

### Deal flow funnel (Zenith)

**Where** — **Below** [The Board](#the-board-leaderboard) (when your role has it) and **above** [Your Focus](#your-focus-role-specific) in **Pipeline and priorities**. **Operations** and **Finance** Zenith layouts also include a funnel tailored to their metrics; the same **click → list** idea applies.

**What you can click**

- **Stage rows** (e.g. Lead, Site Survey, Proposal, Confirmed, execution stages — labels depend on role) — Opens **Quick Actions** in **list mode** with projects in that **stage mix** for your **command-bar** FY / Quarter / Month scope. The **count and value** on the row are built with the **same rules** as the list.
- **Payment status pills** (e.g. Pending, Partial, Fully Paid — where shown) — Opens the drawer for projects in that **payment bucket**, again aligned with the funnel tile.

**Open in Projects →** — The drawer footer links to **Projects** with query parameters that match that slice (stage, payment status, and your Zenith date filters) so the main list should **match the drawer cohort** from the server’s perspective.

**Not a separate page** — The funnel stays on Zenith; it does not navigate away until you choose **Open in Projects →**, **Open →** on a row, or another explicit link.

### Victory toast (stage wins)

When a project **enters** **Confirmed**, **Under Installation**, **Completed**, or **Completed — Subsidy Credited** (for example from **Quick Actions** on Zenith or when saving **Project** edit), a short **Victory** celebration toast may appear: customer, order value (with a quick count-up), who it’s assigned to, and a **Dismiss** control. It **auto-dismisses** after a few seconds.

**Layout** — Bottom-right on desktop; on narrow screens it spans the width with side insets so it does not cover the command bar.

**Who sees it** — Any logged-in user who completes an eligible stage change while using the app (toast is tied to the action, not only Zenith).

### Operations (Zenith)

**KPI strip** — Focus on execution: e.g. **Pending Installation**, **Completed Installation**, **Subsidy Credited**, and **Confirmed Revenue** (order value for confirmed / in-progress / completed revenue-eligible projects, respecting your date filters).

**Your Focus** — **Installation pulse** for **Operations** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Execution-oriented funnel (installation, subsidy, etc.). **Click** a **stage row** or **payment pill** to open the **Quick Actions** list for that slice; use **Open in Projects →** for the full filtered **Projects** page ([Deal flow funnel](#deal-flow-funnel-zenith)).

**Charts** — **Revenue & Profit by FY** (axis respects selected FYs; [details](#revenue-and-profit-by-fy-chart-zenith)), **Projects by stage**, **segment** views, and **sales team** style charts where shown.

Use **Reset** when you want a fresh, unscoped overview before drilling into a single FY or quarter.

### Finance (Zenith)

**KPI strip** — **Total Revenue** (confirmed-order value), **Amount Received**, **Outstanding**, **Total Profit** (gross profit on revenue-eligible projects in scope), and **Availing Loan** count. **Click Availing Loan** to open the **Quick Actions** list for that cohort (then **Open in Projects →** if you need the full **Projects** page), same idea as chart drill-down and the funnel — see [KPI strip](#kpi-strip-and-year-on-year).

**Your Focus** — **Payment radar** for **Finance** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Built from project statuses relevant to finance oversight. **Stage** and **payment** rows are **clickable** → **Quick Actions** list + **Open in Projects →**, same pattern as the executive funnel ([Deal flow funnel](#deal-flow-funnel-zenith)).

**Charts** — **Revenue & Profit by FY** ([filtered years](#revenue-and-profit-by-fy-chart-zenith)), **Payment / segment** views, **customer profitability**, **lead source** revenue, and **loan by bank** where applicable.

### Charts, funnels, and shortcuts

- **Hover** tooltips show exact values where the chart supports them.
- **Click to explore** — Where you see that hint, use the interactions described in [Explore charts & drill-down](#explore-charts-and-drill-down-zenith); lists open in the **Quick Actions** drawer with totals aligned to the chart metric. The **Deal flow funnel** and **Proposal Engine** (under Your Focus) use the same drawer pattern with **Open in Projects →** where applicable.
- **Loading** — Skeleton placeholders while data loads; use **Retry** or refresh if an error banner appears.

---

### Revenue Forecast (wide KPI tile)

**Where** — Spans the width of the KPI band on **Sales**, **Management**, and **Admin** (executive Zenith).

**What the big number is** — A **weighted pipeline forecast**, not raw pipeline value. Each **open** deal (not Completed, not Subsidy Credited, not Lost) contributes **order value × a win probability for its current stage** (for example Lead 10%, Proposal 45%, Confirmed Order 85%, Under Installation 90%, Submitted for Subsidy 95%). Early-stage deals count for less so the headline reflects **expected** revenue, not “every deal at 100%.”

**Subtitle** — **Expected from N open deals** is the count of those weighted deals.

**Tabs: Source, Sales, Segment, Stage** — The **total** does not change when you switch tabs; tabs only **split the same weighted total** by lead source, assigned salesperson, customer segment, or stage. Each row shows that slice’s **weighted** sum; bars are relative to the **largest row in the current tab**. **+N more** means there are more categories than the three rows shown — click it to open the drawer with **all open deals** (sorted by weighted contribution).

**Layout** — The tile uses a **fixed height** so switching tabs does not resize the KPI row (that keeps **Today’s Hit List** and the funnel from jumping on large screens).

**Info line** — **Stage-weighted probability** — hover or refer here for the full idea.

---

### Revenue and profit by FY chart (Zenith)

**What it shows** — **Total Revenue** (orange line / points) and **Total Profit** (teal bars) per **financial year**, for deals that match CRM **revenue** rules (confirmed-path statuses, same logic as the classic dashboard). **Profit** is **gross profit** summed for projects that have it recorded.

**Filters** — When you pick **one or more FYs** in the command bar, the chart **only shows those years** on the axis (so hover and tooltips stay on the filtered period). With **no** FY selected, you see the full series returned for Zenith.

**How to drill down**

- **Orange point (Total Revenue)** — Opens the drawer: **FY … — Revenue** with projects in that year that count toward revenue; list **totals use order value** and should match the revenue point for that FY.
- **Teal bar (Total Profit)** — Opens **FY … — Profit Projects** with projects that have **gross profit** in that year; the drawer shows **gross profit** per row and in the **Total** (teal accent), not order value — so the total matches the **profit** bar.

**Small or zero profit bars** — You can still open the **profit** drill-down: there is an invisible hit area along the bar baseline so **every year** on the chart is tappable.

**Tooltip** — Hover shows **Total Revenue** and **Total Profit** once each (no duplicate lines). The footer reminds you which target is which.

---

### Customer projects profitability (Zenith)

**What it is** — Same idea as the **Customer Profitability** word cloud on the classic **Sales / Management / Finance** dashboards: up to **50 projects** with **profitability** filled in on the project (**Sales & Commercial**), ordered by profitability, labelled with the **customer** name (primary name, with a fallback).

**Word Cloud vs Top 10** — **Word Cloud**: **larger text = higher profitability** on that project (relative to others in the list). **Top 10**: a readable ranked list. **Font size** in the cloud is proportional to profitability; colours indicate tiers.

**Reading it** — Each entry is **one project**, not lifetime customer totals. The same customer name can appear more than once if several of their projects rank in the top set.

**Filters** — Respects Zenith **FY / Quarter / Month** like other tiles.

---

### Explore charts and drill-down (Zenith)

**Section title** — **Explore the landscape**. Many panels show **Click to explore →** in the header.

**Behaviour** — Clicking a bar, slice, stage, FY point, or bank (where implemented) opens the **Quick Actions** drawer in **list mode**: a **filter label** at the top (e.g. lead source, segment, stage, FY revenue or profit, loan bank) and a **scrollable project list** with **Open →** to jump to **Project detail**. The projects are the same cohort the chart used for that slice, with **Zenith date filters** applied. The **Availing Loan** KPI tile (**Finance** and **executive** Zenith) uses the same **list mode** for its cohort ([KPI strip](#kpi-strip-and-year-on-year)).

**Open in Projects →** — When the footer link is shown, it opens the **Projects** page with URL parameters aligned to that drill-down (same slice definitions the server uses for **Projects** list filters — e.g. **zenithSlice** for revenue vs pipeline, **zenithFyProfit** for FY profit rows, **peBucket** for Proposal Engine buckets, stage and payment params for the funnel). Use it when you need the full grid, export context, or columns beyond the drawer.

**The Board** — Uses the **same drawer and list pattern**: click **header totals** or a **salesperson’s revenue / deal count** to see every deal included in that figure for the board’s **Month / Quarter / FY** selection (see [The Board (leaderboard)](#the-board-leaderboard)).

**FY revenue vs FY profit** — For **Revenue & profit by FY**, revenue and profit use **different** list metrics (order value vs gross profit); see [Revenue and profit by FY chart](#revenue-and-profit-by-fy-chart-zenith). The **Open in Projects →** link carries the matching filter so the **Projects** total lines up with the chart point you clicked.

**Revenue forecast “+N more”** — Opens the list of **all open deals** included in the forecast (not a single tab slice).

**Segment donuts** — **Revenue** and **Pipeline** are separate charts; each drill-down uses the matching definition (revenue-eligible vs open pipeline).

**Proposal Engine (Your Focus)** — Not in this grid; see [Your Focus](#your-focus-role-specific). Row click → drawer list built from the **same bucket IDs** the summary API used for counts; **Open in Projects →** uses **peBucket** + command-bar dates.

---

### Quick Actions drawer (Zenith)

**List mode** — Header shows **how many projects** match and a **Total** that matches the **metric of the chart** you came from (for FY **profit**, totals use **gross profit**; otherwise **order value**). **The Board** lists use **order value** for the footer total. **Availing Loan** (KPI tile on **Finance** and **executive** Zenith) opens the same list mode with **order value** totals. Sort with **Order value / Gross profit**, **Health Score**, or **Last Activity** where offered.

**Open in Projects →** (footer, when shown) — Opens **Projects** in a new navigation context with filters that **match the current list** (same rules the server applies for that slice). Prefer this when you need the complete paginated list, bulk actions, or every column.

**Single project** — From a list row, **Open →** loads quick actions for that project (stage advance where allowed, log activity, payments/dates by role, etc.) without losing your place — use **Back** to return to the list. Advancing a project into a **confirmed / install / completed** winning stage can trigger the [Victory toast](#victory-toast-stage-wins).

**Recent remarks (context before you log activity)** — In **single-project** view, Zenith shows a **Recent remarks** panel (gold left accent) above **Log activity** where that section exists: **newest first**, author name and role, timestamp, **(edited)** when applicable, and the same remark text stored under **Project detail → Remarks**. It uses the **same read API** as the project page; permissions are unchanged (if you can open the drawer for the project, you see the same remark history the API allows). The panel shows a **limited number** of recent entries; use **Open full project** for the full remarks list and to edit or delete remarks on the project page. This appears in the **Sales / executive Quick Actions** drawer, **Operations** quick drawer, and **Finance** quick drawer (including read-only finance views — remarks are read-only context there).

**Closing** — **Close** or click the backdrop; the yellow **Viewing: …** strip (when shown) reflects the active list filter.

---

### Layout stability and Hit List (Zenith)

On **wide screens**, **Today’s Hit List** and the **KPI + Revenue forecast** row sit side by side. The Hit List column height is matched to the KPI band so the row looks balanced. **Fixed-height** tiles (including **Revenue forecast** and the **FY chart** panel) avoid **layout shift** when you switch forecast tabs or when charts redraw.

The Hit List body **scrolls vertically** when there are several rows (below the sticky **filter** row), and the **table** can **scroll horizontally** on narrower widths so columns stay readable — same pattern as other wide Zenith tables.

---

### Explorer batch limit (Zenith)

Zenith loads a **batch** of lightweight project rows for **charts**, **The Board** drill-downs, **funnel** lists, the **Availing Loan** KPI list, and related drawer views (same FY / Quarter / Month as the command bar). The server returns **up to 5,000** projects per load (most recently **updated** first), so **extremely large** portfolios may not place every project in that batch.

- **Drawer and chart lists** only include projects that appear in that batch **and** match the slice you clicked. **Counts on tiles** (aggregates from the server) can still reflect **all** projects in scope.
- **Open in Projects →** uses **Projects** list API filters, **not** the 5,000 batch, so the **Projects** page can show **more rows** than the drawer when you are over the batch limit.

For typical portfolios this makes **no practical difference**; it matters only when many thousands of projects share the same date filter.

---

### Help and tips (Zenith)

- **Tip of the Day** rotates through dozens of hints, including **The Board**, **Deal flow funnel** and **payment** drill-downs, **Availing Loan** KPI → drawer, **Payment radar** (**Top overdue** hints and **Remind**), **Proposal Engine** rows under Your Focus, **Open in Projects →**, **collapsible Your Focus**, **Victory toast**, **Revenue forecast**, **FY chart drill-down**, **Customer profitability**, **Explore** lists, **Today’s Hit List** (filters + sortable table, **Alert** + **confirmation date**, scroll-right + **Open →** hint when deals list), **Recent remarks** in quick drawers, and the rest of Zenith — use **Next tip** in the modal to browse more.
- Optional **Help** tooltips (`zenith.*` keys) exist for reuse in the UI; the full narrative is in the sections above.

**Facilitator / end-user training:** A **presentation-style training guide** for Zenith (all roles, **Sales-first**), with exercises and permission notes, lives under **[Training](/help/training)** in Help.

For module basics (Customers, Projects, Proposal Engine), see [Modules](/help/modules) and [Getting Started](/help/getting-started).

---

## Keyboard shortcuts

Use **Ctrl+Shift+**_letter_ on Windows/Linux or **⌘⇧**_letter_ on Mac. They do nothing while focus is in a text field, **select**, or contenteditable (same rule as **?** for Help). The same shortcuts are also listed under [Getting Started → Keyboard shortcuts](/help/getting-started#keyboard-shortcuts).

- **?** — Open **Help** for the current area. From **Dashboard**, opens **Analytics**. From **Zenith**, opens **Analytics** with **Zenith Command Center** in view.

| Shortcut | Action |
| :-- | :-- |
| ⌘⇧D / Ctrl+Shift+D | **Dashboard** |
| ⌘⇧C / Ctrl+Shift+C | **Customers** (Admin, Sales, Operations, Finance, Management) |
| ⌘⇧P / Ctrl+Shift+P | **Projects** (same roles as Customers) |
| ⌘⇧K / Ctrl+Shift+K | **Support Tickets** (Admin, Sales, Operations, Management — not Finance) |
| ⌘⇧Z / Ctrl+Shift+Z | **Zenith** (roles that see Zenith under the Dashboard menu) |
| ⌘⇧M / Ctrl+Shift+M | **New customer** — opens the create form (Sales, Management, Admin) |
| ⌘⇧E / Ctrl+Shift+E | **New project** — opens the new-project screen (Admin, Sales). Route: projects/new |

**Esc** on a **Help** page returns you to the **Dashboard**. A three-column version (Win/Linux · Mac · Action) is under [Getting Started → Keyboard shortcuts](/help/getting-started#keyboard-shortcuts).
