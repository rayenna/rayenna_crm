# Dashboard

> **Note:** The **Dashboard** is your main analytics view. Use the filter bar at the top to choose **Financial Year**, **Quarter**, and **Month**; Quick Access counts, the **Payment Status** and **Proposal Engine** summaries, and most KPI tiles follow those filters. Charts may have their own controls where noted. A **scrolling announcement** under the page title highlights **My Day** and **Zenith**.

**Jump to:** [Scrolling announcements](#scrolling-announcements-dashboard) · [Today's plan](#todays-plan-dashboard) · [Dashboard filters](#dashboard-filters) · [Things needing attention](#things-needing-attention-dashboard) · [Quick Access tiles](#quick-access-tiles) · [Payment Status](#payment-status-card) · [Proposal Engine](#proposal-engine-card) · [Layout by role](#layout-by-role) · [Charts](#charts-and-visualizations) · [Dashboard chart click-through](#classic-dashboard-chart-click-through-to-projects) · [Zenith Command Center](/help/zenith#zenith-command-center) (full-screen analytics)

---

## Scrolling announcements (Dashboard)

Below the **Dashboard** title, a **marquee** scrolls product updates. It currently alternates:

1. **My Day** — CRM-linked personal **Tasks**, **Journal**, and **Reminders**. Open with **Ctrl+Shift+M** (**⌘⇧M** on Mac) or the **sunrise ☀** icon (badge = incomplete tasks). Pin follow-ups from Zenith **Hit List** with **+ My Day**.
2. **Zenith** — Full-screen **Command Center** under **Dashboard** menu → **Zenith ✦** (same FY / Quarter / Month rules as this page).

Full **My Day** behaviour: [Zenith help → My Day](/help/zenith#my-day-personal-productivity-drawer) (also available from every role, not only in Zenith).

---

## Today's plan (Dashboard)

Below the scrolling marquee, the classic Dashboard shows a **Today's plan** card (sun icon):

- **Summary** — Short lines from your **My Day** snapshot (open tasks, reminders, whether you started today’s journal).
- **Suggested from CRM** — Follow-ups from **Zenith focus** (Hit List–style pipeline, payment overdue, delayed installs, and **lifecycle brand gaps** where your role receives them). One-tap **+ My Day** per suggestion. After pinning, the row **stays visible** and the button shows **✓ My Day** (teal); clicking again does **not** create a duplicate (one open task per project). **Scroll** inside the card to see every suggestion.
- **Tasks** / **Open My Day** — Opens the ☀ drawer on the **Tasks** tab (your pinned and manual tasks only — not a duplicate CRM suggestion list).

**Layout with Things needing attention:** On **Sales**, **Operations**, and **Admin**, when late-stage projects are missing **panel and/or inverter brand**, **Today's plan** appears **beside** the **Things Needing Attention** card on **laptop / wide screens** (two equal columns). On **phone and narrow tablets** the cards **stack** — plan first, then attention. **Finance** always sees **Today's plan** only (full width). **Management** sees **Today's plan** only (no attention card).

Pinned tasks and journal/reminder summaries are **server-backed** and sync across devices after login. CRM suggestions appear on this card (and on Zenith **Hit List** / **Things needing attention**) — **not** repeated inside the My Day drawer.

---

## Dashboard filters

Use the filter bar at the top of the Dashboard to focus on a period. **All Quick Access tiles** (metric cards plus **Payment Status** and **Proposal Engine**), **Year-on-Year** KPIs, and most charts respect these filters.

- **Financial Year (FY)** — One or more years in **April–March** format (e.g. 2024-25).
- **Quarter** — Only when **exactly one** FY is selected: Q1 (Apr–Jun) through Q4 (Jan–Mar).
- **Month** — Only when **exactly one** FY is selected; months follow FY order (April through March). If quarters are selected, only months inside those quarters are listed.

If you select **multiple FYs**, Quarter and Month are disabled. Use **Clear Filter** (or clear FY) to reset and see all periods.

**Tip:** Open **Projects** from a Quick Access row or tile; the address bar keeps the same FY / quarter / month query parameters so the list matches what you saw on the Dashboard.

---

## Things needing attention (Dashboard)

**Who sees it:** **Sales**, **Operations**, and **Admin** on the classic Dashboard. **Management** and **Finance** do **not** see this card (**Management** may still see a matching **briefing line** in Zenith for lifecycle brands; **Finance** does not).

**When it appears:** At least one project in **Under Installation**, **Completed**, or **Completed – Subsidy Credited** is missing **panel brand**, **inverter brand**, or **both** in **Project Lifecycle**, within your dashboard **FY / Quarter / Month** scope.

**Where it sits:** Directly under the marquee, **next to Today's plan** on wide screens (see [Today's plan](#todays-plan-dashboard)). The card title is **Things Needing Attention**.

### What each row shows

- **#SL No. Customer name** — clickable link to **Project detail**.
- **Missing badge** — **Panel brand**, **Inverter brand**, or **Panel & inverter** (gold badge).
- **+ My Day** — Pins a follow-up to your personal task list for that project (prefilled text such as “Enter panel brand — …”). After pinning, the button shows **✓ My Day**; clicking again does **not** create a duplicate (one open task per project).
- **Open →** — Same project in **Project detail**.

Up to **three** rows show in the paired layout; if more projects qualify, a **+N more — view all** link appears at the bottom.

### Header actions

- **Projects →** (top right) — Opens **Projects** with:
  - **Status** = Under Installation, Completed, and Completed – Subsidy Credited
  - **Lifecycle specs incomplete** filter (only projects missing panel and/or inverter brand)
  - The same **FY / Quarter / Month** as the Dashboard

This replaces the older behaviour where **Projects** listed every late-stage job and you had to scan lifecycle fields manually.

### My Day integration

- Use **+ My Day** on a suggestion row to track the follow-up personally; open ☀ to complete it under **Today**.
- **Things Needing Attention** uses the same **+ My Day** / **✓ My Day** pattern (one open task per project).
- Completing a project-pinned task can optionally log **`[My Day ✓] …`** to **Project remarks** (see [Zenith → My Day](/help/zenith#my-day-personal-productivity-drawer)).

### Zenith parity

**Sales**, **Admin**, and **Operations** may see a **briefing reminder line** at the top of the **Smart daily briefing** with the same cohort (count + names). **Management** does not see that lifecycle line in the briefing.

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

**Zenith (Your Focus)** — The **same four buckets** appear under collapsible **Your Focus** for those roles. **Click a row** to open the **Quick Actions** drawer with the matching project list, then **Open in Projects →** for the full **Projects** page with the same **PE bucket** and command-bar dates ([Zenith Command Center](/help/zenith#zenith-command-center)).

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

- **Sales** — Year-on-Year summary, Quick Access (above), Projects by Stage and Revenue & Profit by FY, Revenue by Lead Source, Pipeline by Lead Source, Revenue by Customer Type, Pipeline by Customer Type, Customer Profitability word cloud, Projects Availing Loans by Bank, **Projects by panel brand** and **Projects by inverter brand** (lifecycle cohort — both brands required per project). Data is **scoped to the logged-in salesperson**.
- **Operations** — Quick Access, optional Pending Subsidy list, Projects by Stage, Revenue by Sales Team, Project Value and Profit by FY, Revenue by Customer Type, **Projects by panel brand** and **Projects by inverter brand**. **Company-wide** execution view.
- **Finance** — Top KPIs (Total Revenue, Amount Received, Outstanding Balance), Quick Access row (above), Revenue by Lead Source, Revenue by Sales Team, Project Value and Profit by FY, Revenue by Customer Type, Customer Profitability word cloud, Projects Availing Loans by Bank. **Company-wide**.
- **Management / Admin** — Year-on-Year summary, Quick Access (above), Projects by Stage and Revenue & Profit by FY, Revenue by Lead Source, Pipeline by Lead Source, Revenue by Sales Team, Sales Team treemap, Revenue by Customer Type, Pipeline by Customer Type, Customer Profitability word cloud, Projects Availing Loans by Bank, **Projects by panel brand** and **Projects by inverter brand**. **Company-wide**.

---

## Charts and visualizations

- **Year-on-Year** — Capacity, pipeline, revenue, profit vs same period last year (**Sales**, **Management**).
- **Projects by Stage / Execution Status** — Bar chart beside **Revenue & Profit by FY** (**Sales**, **Management**).
- **Revenue & Profit by Financial Year** — Grouped columns (**Sales**, **Management**; other roles in their own layout).
- **Revenue by Lead Source** / **Pipeline by Lead Source** — Where shown on your role’s dashboard.
- **Revenue by Sales Team** — **Operations**, **Finance**, **Management**.
- **Sales Team Performance (treemap)** — **Management** only.
- **Revenue by Customer Type** — Pie chart.
- **Pipeline by Customer Type** — Pie chart (**Sales**, **Management**).
- **Customer Profitability word cloud** — **Sales**, **Finance**, **Management**.
- **Projects Availing Loans by Bank** — **Sales**, **Finance**, **Management** (not **Operations**).
- **Projects by panel brand** / **Projects by inverter brand** — Horizontal bar charts (**Sales**, **Management**, **Admin**, **Operations**; not **Finance**). Same cohort as Zenith: only projects with **both** panel and inverter brands saved in Project Lifecycle.

Data refreshes when you load the Dashboard or change filters. If numbers look stale, refresh the page.

### Classic Dashboard — chart click-through to Projects

On the **classic Dashboard** (not Zenith), most **charts are clickable**: clicking a **bar**, **FY column** (revenue vs profit separately), **pie slice**, **word** in the profitability cloud, or **Top 10** row opens the **Projects** page with filters that **match the slice** you clicked, plus your dashboard **FY / Quarter / Month** where applicable.

- **Tooltips** often include a line such as **Click to open Projects →** (or **Click slice** / **Click bar**) as a hint.
- **Semantics** align with **Zenith** drill-downs where the same slice exists (e.g. stage, lead source with revenue vs pipeline, **customer type** on donut charts, FY revenue vs FY profit, availing loan by bank, panel/inverter brand with lifecycle completeness). The classic Dashboard goes **straight to Projects**; Zenith usually opens the **Quick Actions** drawer first, with **Open in Projects →** in the footer.
- **Customer profitability** — On the **classic Dashboard** and in **Zenith** (**Customer projects profitability**), clicking a **word** or a **Top 10** row opens **Projects** with a **search** term (customer name text) and the **revenue** analytics slice, plus date filters — same behaviour in both places. Zenith detail: [Customer projects profitability](/help/zenith#customer-projects-profitability-zenith).

If your role does not see a given chart, that click path is not available on your dashboard.

---

**See also:** [Zenith](/help/zenith) — full-screen command center (Solar News, AI Insights, The Board, Your Focus, charts, Quick Actions).

---

## Keyboard shortcuts

Use **Ctrl+Shift+**_letter_ on Windows/Linux or **⌘⇧**_letter_ on Mac. They do nothing while focus is in a text field, **select**, or contenteditable (same rule as **?** for Help). The same shortcuts are also listed under [Getting Started → Keyboard shortcuts](/help/getting-started#keyboard-shortcuts).

- **?** — Open **Help** for the current area. From **Dashboard**, opens this **Dashboard** help page. From **Zenith**, opens **[Zenith](/help/zenith)** help.

| Shortcut | Action |
| :-- | :-- |
| ⌘⇧D / Ctrl+Shift+D | **Dashboard** |
| ⌘⇧C / Ctrl+Shift+C | **Customers** (Admin, Sales, Operations, Finance, Management) |
| ⌘⇧P / Ctrl+Shift+P | **Projects** (same roles as Customers) |
| ⌘⇧K / Ctrl+Shift+K | **Support Tickets** (Admin, Sales, Operations, Management — not Finance) |
| ⌘⇧Z / Ctrl+Shift+Z | **Zenith** (roles that see Zenith under the Dashboard menu) |
| ⌘⇧M / Ctrl+Shift+M | **My Day** — personal **Tasks**, **Journal** & **Reminders** (all roles). Pin from **Today's plan**, **Things needing attention**, or Zenith **Hit List** with **+ My Day**. Project-pinned tasks: optional **Log to project remarks when done**. **Edit** / **Delete** via **⋯**. Journal: **Load more**. Reminders: **overdue** = any past due date. |
| ⌘⇧N / Ctrl+Shift+N | **New customer** — opens the create form (Sales, Management, Admin) |
| ⌘⇧E / Ctrl+Shift+E | **New project** — opens the new-project screen (Admin, Sales). Route: projects/new |

**Esc** on a **Help** page returns you to the **Dashboard**. A three-column version (Win/Linux · Mac · Action) is under [Getting Started → Keyboard shortcuts](/help/getting-started#keyboard-shortcuts).
