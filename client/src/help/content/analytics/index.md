# Analytics and Reports

> **Note:** The Dashboard is your main analytics view. Use the filter bar at the top to choose **Financial Year**, **Quarter**, and **Month**; Quick Access counts, the **Payment Status** and **Proposal Engine** summaries, and most KPI tiles follow those filters. Charts may have their own controls where noted.

**Jump to:** [Dashboard filters](#dashboard-filters) · [Quick Access tiles](#quick-access-tiles) · [Payment Status](#payment-status-card) · [Proposal Engine](#proposal-engine-card) · [Layout by role](#layout-by-role) · [Charts](#charts-and-visualizations) · [Zenith Command Center](#zenith-command-center)

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

> **Zenith** is a full-screen analytics experience for the same business data as the classic **Dashboard**, with a focused layout, dark theme, and role-specific panels. Use the **sticky command bar** to filter by **Financial Year**, **Quarter**, and **Month**; **AI Insights** (plain-English highlights from your current data), **Your Focus** (role-specific actions and tables), KPIs, funnels, and charts all respect those filters. (Zenith is documented here, under **Analytics and Reports** — there is no separate top-level Help topic.)

**In this section:** [Opening Zenith](#opening-zenith) · [Filters and reset](#filters-and-reset) · [AI Insights ticker](#ai-insights-ticker) · [KPI strip and YoY](#kpi-strip-and-year-on-year) · [Your Focus](#your-focus-role-specific) · [Executive](#executive-sales-management--admin) · [Operations (Zenith)](#operations-zenith) · [Finance (Zenith)](#finance-zenith) · [Charts and shortcuts](#charts-funnels-and-shortcuts) · [Help and tips](#help-and-tips-zenith)

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
| **Sales** | **Your pipeline today** — a compact table of **your** leads/deals (assigned to you): customer, stage, deal value, and **last activity** (days since update or last project remark). **Green / amber / red** styling by recency; a **Follow-up needed** count for the oldest band; **Log activity** opens a short remark modal (saved on the project). |
| **Finance** | **Payment radar** — finance KPIs (e.g. outstanding, collection timing, subsidy pending), a short **overdue** list with actions, and a small **collected vs outstanding vs subsidy** chart. |
| **Operations** | **Installation pulse** — projects **under installation**: customer, kW, **sales person**, start / expected dates, progress, and quick stats (e.g. delayed count). |
| **Management / Admin** | **All** of the above blocks in one view (company-wide where applicable). |

If there is nothing to show for the current filters, **Your Focus** may be hidden. Each block has a **subtle coloured left border** to distinguish Sales (gold-leaning), Finance (teal-leaning), and Operations (cool accent) content.

### Executive (Sales, Management & Admin)

**KPI strip** — Typically includes **Total Capacity**, **Total Pipeline**, **Total Revenue**, **Total Profit**, and **Pipeline Conversion** (definitions match the classic dashboard and the sections above).

**Your Focus** — See [Your Focus](#your-focus-role-specific); **Sales** sees own pipeline, **Management/Admin** see the combined focus layout.

**Funnel** — Deal-flow style view of stages from leads through execution (layout varies slightly by role).

**Charts and panels** — May include **Revenue by lead source**, **Sales team performance**, **segment donuts**, **customer profitability**, **Revenue & Profit by FY**, and **Projects by stage**. **Proposal Engine** summary appears where your role has access on the classic dashboard.

**Links** — Many tiles and chart actions open **Projects** (or related views) with **filters aligned** to your Zenith FY / quarter / month — same pattern as Quick Access on the Dashboard.

### Operations (Zenith)

**KPI strip** — Focus on execution: e.g. **Pending Installation**, **Completed Installation**, **Subsidy Credited**, and **Confirmed Revenue** (order value for confirmed / in-progress / completed revenue-eligible projects, respecting your date filters).

**Your Focus** — **Installation pulse** for **Operations** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Execution-oriented funnel (installation, subsidy, etc.).

**Charts** — **Revenue & Profit by FY**, **Projects by stage**, **segment** views, and **sales team** style charts where shown.

Use **Reset** when you want a fresh, unscoped overview before drilling into a single FY or quarter.

### Finance (Zenith)

**KPI strip** — **Total Revenue** (confirmed-order value), **Amount Received**, **Outstanding**, **Total Profit** (gross profit on revenue-eligible projects in scope), and **Availing Loan** count.

**Your Focus** — **Payment radar** for **Finance** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Built from project statuses relevant to finance oversight.

**Charts** — **Revenue & Profit by FY**, **Payment / segment** views, **customer profitability**, **lead source** revenue, and **loan by bank** where applicable.

### Charts, funnels, and shortcuts

- **Hover** tooltips on charts explain series and values.
- **Click-through** where offered — opens **Projects** (or the app route documented on the tile) with **query parameters** carrying your Zenith dates so lists match what you saw.
- **Loading states** — Skeleton placeholders appear while data loads; if an error banner appears, use **Retry** or refresh the page.

### Help and tips (Zenith)

- **Tip of the Day** includes tips for **AI Insights**, **Your Focus**, **KPI animations**, and other Zenith behaviour; use **Next tip** in the modal to browse more.

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
