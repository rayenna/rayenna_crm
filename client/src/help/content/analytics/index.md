# Analytics and Reports

> **Note:** The Dashboard is your main analytics view. Use the filter bar at the top to choose **Financial Year**, **Quarter**, and **Month**; Quick Access counts, the **Payment Status** and **Proposal Engine** summaries, and most KPI tiles follow those filters. Charts may have their own controls where noted.

**Jump to:** [Dashboard filters](#dashboard-filters) · [Quick Access tiles](#quick-access-tiles) · [Payment Status](#payment-status-card) · [Proposal Engine](#proposal-engine-card) · [Layout by role](#layout-by-role) · [Charts](#charts-and-visualizations) · [Zenith Command Center](#zenith-command-center) · [Zenith Revenue Forecast](#revenue-forecast-wide-kpi-tile) · [Zenith FY revenue & profit chart](#revenue-and-profit-by-fy-chart-zenith) · [Zenith drill-down](#explore-charts-and-drill-down-zenith)

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

Quick Access **layout** depends on your role. **Payment Status** appears for **Sales**, **Operations**, **Finance**, and **Management**. **Proposal Engine** appears for **Sales** and **Management** only.

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

> **Zenith** is Rayenna CRM’s **command center analytics** experience: the same trusted numbers as the classic **Dashboard**, presented full-screen with a dark theme, **AI Insights**, role-specific **Your Focus** panels, and **clickable charts** that open a **Quick Actions** drawer so you can jump straight to projects. Use the **sticky command bar** for **Financial Year**, **Quarter**, and **Month** — KPIs, the funnel, **Revenue forecast**, **Explore the landscape** charts, and project lists loaded for drill-down **all follow those filters**. Data is loaded from the server for your session (not “this browser only”), so what you see stays aligned with CRM after login. Zenith is documented here under **Analytics and Reports** (no separate top-level Help topic).

**In this section:** [Opening Zenith](#opening-zenith) · [Filters and reset](#filters-and-reset) · [AI Insights ticker](#ai-insights-ticker) · [KPI strip and YoY](#kpi-strip-and-year-on-year) · [Your Focus](#your-focus-role-specific) · [Executive](#executive-sales-management--admin) · [Operations (Zenith)](#operations-zenith) · [Finance (Zenith)](#finance-zenith) · [Revenue Forecast tile](#revenue-forecast-wide-kpi-tile) · [Revenue & profit by FY chart](#revenue-and-profit-by-fy-chart-zenith) · [Customer projects profitability](#customer-projects-profitability-zenith) · [Explore charts & drill-down](#explore-charts-and-drill-down-zenith) · [Quick Actions drawer](#quick-actions-drawer-zenith) · [Layout & Hit List](#layout-stability-and-hit-list-zenith) · [Charts overview](#charts-funnels-and-shortcuts) · [Help and tips](#help-and-tips-zenith)

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
- **Click an insight** — The page **smooth-scrolls** to a related section (KPIs, **Your Focus**, funnel, charts, etc.). If a target section does not exist for your role, Zenith scrolls to the nearest sensible anchor.

### KPI strip and year-on-year

The **top row of KPI cards** summarises key metrics for your role. Each card includes:

- A **large value** that **animates from zero** when the page loads or when you **change date filters** (about 1.2 seconds, ease-out), for a quick read of the current number.
- A **mini sparkline** (line chart, no axes) using the **last seven financial-year buckets** available for that metric in the payload — the line is **gold** when the series trends up and **crimson** when it trends down.
- A **trend badge** in the **top-right** (e.g. **▲ 12%** in teal / **▼ 3%** in crimson) when a **period-over-period %** is available — same rules as classic dashboard comparisons (e.g. one FY selected for YoY-style badges).
- A subtle **hover glow** (gold-tinted shadow) on the card.

Cards **stagger in** slightly when the strip appears (animation order by column).

**YoY / comparison behaviour**

- Comparison badges appear when you select **exactly one** Financial Year (and the system can compare to the **prior FY** or the **same quarter/month in the prior FY**, matching dashboard logic).
- If you select **multiple FYs**, those badges are hidden so the comparison stays unambiguous.
- If the prior period was **zero**, the % change may not show (to avoid misleading divides).

Metrics and labels are **role-specific** (see below). **Sales** sees data **scoped to you**; **Management**, **Admin**, **Operations**, and **Finance** see **company-wide** views where applicable.

### Your Focus (role-specific)

Between the **KPI strip** and the **funnel**, **Your Focus** surfaces actionable context **by role**. The table below summarises what each role sees.

| Role | What you see |
| :-- | :-- |
| **Sales** | **Your pipeline today** — a compact table of **your** leads/deals (assigned to you): customer, stage, deal value, **last activity**, and a **Deal Health** badge (0–100). **Green / amber / red** styling by recency; a **Follow-up needed** count for the oldest band; **Log activity** opens a short remark modal (saved on the project). |
| **Finance** | **Payment radar** — finance KPIs (e.g. outstanding, collection timing, subsidy pending), a sortable **Top overdue** table, and a small **collected vs outstanding vs subsidy** chart. |
| **Operations** | **Installation pulse** — projects **under installation**: customer, kW, **sales person**, start / expected dates, progress, and quick stats (e.g. delayed count). Table headers can be sorted; use **Overdue only** to focus on delayed installs. |
| **Management / Admin** | **All** of the above blocks in one view (company-wide where applicable). |

If there is nothing to show for the current filters, **Your Focus** may be hidden. Each block has a **subtle coloured left border** to distinguish Sales (gold-leaning), Finance (teal-leaning), and Operations (cool accent) content.

#### Sorting and filtering inside Zenith tables

In Zenith, some tables can be refined **without changing your dashboard filters**:

- **Sort**: click a column heading (e.g. Deal value, Health, Days).
- **Filter**: use the small filter controls near the table title (where available).

These controls work on the rows already loaded for your current FY / Quarter / Month filters (no extra API calls).

#### Deal Health Score (Zenith)

**Deal Health** is the same **0–100** score as on the **Projects** list: it summarises how “healthy” an **open** deal looks from **Activity** (recency of updates), **Momentum** (time in stage vs expected), **Deal value**, **Close date**, and **Lead source**. Those five parts add up (with caps per part) to the number on the badge; **hover** any badge to see each part and how it scored.

**Where it shows in Zenith**

- **Your pipeline today** (in **Your Focus**): one badge per row for your deals, plus **Log activity** when you need to record a touchpoint.
- **Today’s Hit List** (beside the KPI strip on wide layouts for Sales / Management / Admin): urgent deals also show the badge; use **Open →** to jump to **Project Detail** for the full card.

**Why it helps**

You can **spot cold or stuck deals** in context with the rest of Zenith (KPIs, funnel, filters) without exporting to a spreadsheet. **Management / Admin** see the same badge semantics when they review pipeline rows in **Your Focus**.

**Not shown** for **Completed**, **Subsidy Credited** (including combined/loan variants where applicable), or **Lost** — same rule as elsewhere.

For the **full explanation** of weights, sort behaviour, and sales tips, open the **Projects** module help and the section **Deal Health Score**.

### Executive (Sales, Management & Admin)

**KPI strip** — Typically includes **Total Capacity**, **Total Pipeline**, **Total Revenue**, **Total Profit**, and **Pipeline Conversion** (definitions match the classic dashboard and the sections above).

**Your Focus** — See [Your Focus](#your-focus-role-specific); **Sales** sees own pipeline, **Management/Admin** see the combined focus layout.

**Today’s Hit List** — On wide screens, Sales / Management / Admin also see **Today’s Hit List** beside the KPI strip. It highlights a small set of deals that need attention (e.g. overdue close dates, stalled proposals, deals going cold), with:

- **Stage** and **deal value**
- An **urgency label** (e.g. Overdue, Closing soon, Stalled)
- A compact **Deal Health** badge (0–100) with hover breakdown
- A **days counter** showing how long it has been overdue / stalled
- **Open →** to jump straight to the Project Detail page

If a day has no urgent deals, the card shows **All clear**.

**Funnel** — Deal-flow style view of stages from leads through execution (layout varies slightly by role).

**Charts and panels** — Includes the wide **Revenue forecast** tile (below the KPI row), **Deal flow funnel**, **Your Focus**, then **Explore the landscape**: **Revenue by lead source**, **Pipeline by lead source**, **Revenue vs pipeline by sales team**, **segment donuts** (revenue and pipeline), **Revenue & profit by financial year**, **Projects by stage**, **Projects availing loans by bank**, **Customer projects profitability** (word cloud / Top 10), and **Proposal Engine** where your role has it on the classic dashboard.

**Links** — Chart drill-downs open the **Quick Actions** drawer with a **filtered project list** (see [Explore charts & drill-down](#explore-charts-and-drill-down-zenith)). Other links follow the same date rules as **Quick Access** on the Dashboard.

### Operations (Zenith)

**KPI strip** — Focus on execution: e.g. **Pending Installation**, **Completed Installation**, **Subsidy Credited**, and **Confirmed Revenue** (order value for confirmed / in-progress / completed revenue-eligible projects, respecting your date filters).

**Your Focus** — **Installation pulse** for **Operations** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Execution-oriented funnel (installation, subsidy, etc.).

**Charts** — **Revenue & Profit by FY** (axis respects selected FYs; [details](#revenue-and-profit-by-fy-chart-zenith)), **Projects by stage**, **segment** views, and **sales team** style charts where shown.

Use **Reset** when you want a fresh, unscoped overview before drilling into a single FY or quarter.

### Finance (Zenith)

**KPI strip** — **Total Revenue** (confirmed-order value), **Amount Received**, **Outstanding**, **Total Profit** (gross profit on revenue-eligible projects in scope), and **Availing Loan** count.

**Your Focus** — **Payment radar** for **Finance** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Built from project statuses relevant to finance oversight.

**Charts** — **Revenue & Profit by FY** ([filtered years](#revenue-and-profit-by-fy-chart-zenith)), **Payment / segment** views, **customer profitability**, **lead source** revenue, and **loan by bank** where applicable.

### Charts, funnels, and shortcuts

- **Hover** tooltips show exact values where the chart supports them.
- **Click to explore** — Where you see that hint, use the interactions described in [Explore charts & drill-down](#explore-charts-and-drill-down-zenith); lists open in the **Quick Actions** drawer with totals aligned to the chart metric.
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

**Behaviour** — Clicking a bar, slice, stage, FY point, or bank (where implemented) opens the **Quick Actions** drawer in **list mode**: a **filter label** at the top (e.g. lead source, segment, stage, FY revenue or profit, loan bank) and a **scrollable project list** with **Open →** to jump to **Project detail**. The projects are the same cohort the chart used for that slice, with **Zenith date filters** applied.

**FY revenue vs FY profit** — For **Revenue & profit by FY**, revenue and profit use **different** list metrics (order value vs gross profit); see [Revenue and profit by FY chart](#revenue-and-profit-by-fy-chart-zenith).

**Revenue forecast “+N more”** — Opens the list of **all open deals** included in the forecast (not a single tab slice).

**Segment donuts** — **Revenue** and **Pipeline** are separate charts; each drill-down uses the matching definition (revenue-eligible vs open pipeline).

---

### Quick Actions drawer (Zenith)

**List mode** — Header shows **how many projects** match and a **Total** that matches the **metric of the chart** you came from (for FY **profit**, totals use **gross profit**; otherwise **order value**). Sort with **Order value / Gross profit**, **Health Score**, or **Last Activity** where offered.

**Single project** — From a list row, **Open →** loads quick actions for that project (stage advance where allowed, log activity, etc.) without losing your place — use **Back** to return to the list.

**Closing** — **Close** or click the backdrop; the yellow **Viewing: …** strip (when shown) reflects the active list filter.

---

### Layout stability and Hit List (Zenith)

On **wide screens**, **Today’s Hit List** and the **KPI + Revenue forecast** row sit side by side. The Hit List column height is matched to the KPI band so the row looks balanced. **Fixed-height** tiles (including **Revenue forecast** and the **FY chart** panel) avoid **layout shift** when you switch forecast tabs or when charts redraw.

---

### Help and tips (Zenith)

- **Tip of the Day** rotates through dozens of hints, including **Revenue forecast**, **FY chart drill-down**, **Customer profitability**, **Explore** lists, **Hit List** layout, and the rest of Zenith — use **Next tip** in the modal to browse more.
- Optional **Help** tooltips (`zenith.*` keys) exist for reuse in the UI; the full narrative is in the sections above.

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
