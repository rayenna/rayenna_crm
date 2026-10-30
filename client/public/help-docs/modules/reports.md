# Reports

**Reports** (`/reports`) is a growing library of weekly-call and review packs: **Sales Review**, **Funnel Velocity**, **Delivery Control**, **Collections & Cash**, and **Margin & Mix**.

| Report | Who | Use it for |
| :-- | :-- | :-- |
| **Sales Review** | Admin, Management, Sales (own book) | Weekly seller call — achievement, forecast, open deals |
| **Funnel Velocity** | Admin, Management, Sales (own book) | Pipeline hygiene — days in stage, SLA colour, FY conversion |
| **Delivery Control** | Admin, Management, Operations, Sales (own book) | Weekly ops standup — commissioning, blockers, subsidy clock |
| **Collections & Cash** | Admin, Management, Finance, Sales (own book) | Confirmed orders only — staged collections, aging, loan-stuck, subsidy in flight |
| **Margin & Mix** | Admin, Management, Finance | Won-book GP, missing cost, PE vs CRM, mix by seller / segment / system / kW |

## Sales Review

Open **Reports → Sales Review** (`/reports/sales-review`) before the weekly seller call. Pick a salesperson at the top (Admin / Management). Sales users always see their own accounts.

### Achievement

Confirmed-and-beyond order value — same definition as Dashboard **revenue** (Confirmed, Under Installation, Completed, Completed — Subsidy Credited). Columns are the last two full Indian FYs plus **current FY year-to-date**.

| Row | Meaning |
| :-- | :-- |
| **Revenue** | Sum of order value |
| **Profit** | Gross profit (falls back to expected profit) |
| **Avg. profitability** | Profit ÷ revenue |
| **Year on year** | Vs previous FY. On the YTD column, vs the same Apr–today window last year |
| **Deals won** | Count of those revenue deals |
| **Capacity** | Sum of system kW |

### Forecast

Open pipeline (Lead through Submitted for Subsidy) bucketed by **expected commissioning date** into **CQ, NQ, NQ+1, NQ+2**. Overdue dates sit in CQ. Deals with no date are **unscheduled** (shown under the table, not in TOTAL).

| Row | Meaning |
| :-- | :-- |
| **Pipeline** | Raw order value |
| **Forecast (weighted)** | Order value × Sales Probability |
| **Closed in period** | Revenue already confirmed in that quarter |
| **Last year actual** | Closed revenue in the same quarter last year (the bar to beat) |
| **Year on year** | (Closed + remaining weighted) vs last year actual |
| **Qtr on qtr** | Current quarter pace vs the previous quarter’s closed revenue |

**Expand quarters** splits each quarter into months.

### Deal list

Open pipeline only. Columns: customer, stage, probability, customer type, system type, subsidy segment, close date, quarter, FY, bank loan, order value.

**Quick view:** **Open** = Lead, Site Survey, Proposal. **Closed** = Confirmed Order, Under Installation. Submitted for Subsidy stays in the full list. Tap the active view again (or **Clear filters**) to show every open deal.

On **laptop / full screen**, click a column heading to **filter** (multi-select where it applies) and **sort** ascending or descending. On **phones** the list is **cards** with the same filters above the list. **Tap a row** to open the project. Coming back keeps the seller picker and list filters until you click **Clear filters**.

**Print** hides chrome and keeps the tables for a call handout. **Export** downloads the same pack as **Excel**, **PDF**, or **PowerPoint** (respects the salesperson picker; deal-list on-screen filters stay in the browser).

### What this report does not include (yet)

Targets / quota, activity-since-last-call, and next follow-up. Stage aging and stuck deals live on **Funnel Velocity**.

## Funnel Velocity

Open **Reports → Funnel Velocity** (`/reports/funnel-velocity`) before the weekly seller hygiene call. Pick a salesperson at the top (Admin / Management). Sales users always see their own accounts.

### Open funnel

**Lead**, **Site survey**, and **Proposal** only. Confirmed-and-beyond jobs are on Delivery Control, not this board.

Days in stage uses **stage entered**. If that date is missing, the report uses **created date** and flags the row **Stage date estimated**. Future dates clamp to 0 days.

| KPI | Meaning |
| :-- | :-- |
| **Open pipeline** | Sum of order value on open funnel deals |
| **Median days** | Median days in the current stage (all open deals) |
| **SLA red / amber** | Deals at ≥90% / 70–90% of stage SLA |
| **Win rate** | Confirmed YTD ÷ (confirmed YTD + lost YTD) for the current Indian FY |
| **Days to confirm / lose** | Median created date → confirmation or lost date for YTD outcomes |

### SLA

Same thresholds as Data Sense: **Lead 7 days**, **Site survey 14**, **Proposal 21**. Under 70% of SLA is on track, 70–90% amber, 90%+ red.

Aging buckets are **0–7 / 8–14 / 15–21 / 22–30 / 30+ / Undated**.

### Conversion

Win rate and days-to-confirm/lose are **FY outcomes**, not a full stage-history funnel. There is no stored history of every stage a deal passed through.

On **laptop / full screen**, click a column heading to **filter** and **sort**. On **phones** the list is **cards**. **Tap a row** to open the project. Coming back keeps the seller picker and list filters until you click **Clear filters**. **Print** and **Export** follow the salesperson picker; list filters stay in the browser.

## Delivery Control

Open **Reports → Delivery Control** (`/reports/delivery-control`) before the weekly ops standup. Pick an ops person at the top (Admin / Management / Operations). Sales users always see their own confirmed jobs.

### In delivery

Jobs in **Confirmed**, **Under Installation**, and **Submitted for Subsidy**. Completed and subsidy-credited jobs are off this board.

| KPI | Meaning |
| :-- | :-- |
| **In delivery** | Sum of order value and job count |
| **Capacity** | Sum of system kW |
| **By stage** | Confirmed / Installation / Submitted for subsidy |
| **Overdue** | Expected commissioning date before today |
| **No date** | No expected commissioning date |
| **Blockers** | Jobs with a KSEB / MNRE / completion-report / missing-doc exception; hint shows unassigned ops |

### Commissioning board

Same CQ / NQ / NQ+1 / NQ+2 windows as Sales Review, by **expected commissioning date**. Overdue dates sit in CQ. Unscheduled jobs are called out under the table, not in TOTAL. **Expand quarters** splits each quarter into months.

### Ops load

Jobs, kW, order value, overdue, and blocked counts by assigned ops person. **Unassigned** is its own row.

### Job list and blockers

Blockers are exceptions, not a second status:

- Overdue commissioning / no commissioning date / unassigned ops
- Subsidy: no KSEB feasibility, or feasibility done with registration still pending
- After install starts: MNRE portal pending, completion report pending, missing KSEB / MNRE documents

On **laptop / full screen**, click a column heading to **filter** and **sort**. On **phones** the list is **cards**. **Tap a row** to open the project. Coming back keeps the ops picker and list filters until you click **Clear filters**. **Print** and **Export** (Excel / PDF / PowerPoint) follow the ops picker; job-list on-screen filters stay in the browser.

### Subsidy clock

A section on the same pack (not a separate report yet). **Subsidy-segment** jobs from **Confirmed** until **credit**. Lead / Site survey / Proposal are pipeline — they are not on this clock. Completed jobs that are not yet credited **stay here**; they are off the factory board.

Current step is the first missing date:

1. KSEB feasibility
2. KSEB registration
3. Installing
4. MNRE portal (after install complete)
5. Completion report
6. Request not filed
7. Awaiting credit (request filed)

| KPI | Meaning |
| :-- | :-- |
| **On clock** | Order value / jobs / kW still waiting on a subsidy step |
| **Awaiting credit** | Request filed, not credited — scheme money in flight |
| **Completed, not credited** | On-site complete, credit not landed |
| **90+ days in step** | Sitting in the current step for 90 days or more |
| **Exceptions** | Dates out of order, submitted/completed without a request, or status ahead of the dates |

When this list grows, Subsidy Clock can split into its own report.

## Collections & Cash

Open **Reports → Collections & Cash** (`/reports/collections-cash`) before the weekly collections call. Pick a salesperson at the top (Admin / Management / Finance). Sales users always see their own outstanding book.

### Outstanding

Customer **balance** on **confirmed-and-beyond** jobs only (Confirmed, Installation, Submitted for subsidy, Completed). Lead / Site survey / Proposal are **pipeline** — they are not collectible until the order is confirmed. Lost jobs are excluded.

After confirmation, money is due **in stages** (advance, then later installments).

| KPI | Meaning |
| :-- | :-- |
| **Outstanding** | Sum of customer balance on confirmed jobs |
| **90+ days** | Balance aged over 90 days since last payment (or since confirmation if advance is still due) |
| **Advance due** | Confirmed, nothing received yet |
| **Cash** | Outstanding where the job is **not** on a bank loan |
| **Loan stuck** | Outstanding where **Availing loan** is yes |
| **Subsidy in flight** | Confirmed subsidy jobs requested or submitted/completed, not yet credited — uses **order value**, not customer balance |

Cash + loan outstanding = Outstanding. Subsidy in flight is a separate chase list (the customer may already have paid in full).

### Aging

Buckets **0–30 / 31–60 / 61–90 / 90+ / Undated**. **Advance due** clocks from confirmation. **Next installment** (Partial) clocks from last payment.

### Seller load

Jobs, outstanding, 90+, loan outstanding, and advance-due count by salesperson.

On **laptop / full screen**, click a column heading to **filter** and **sort**. On **phones** the list is **cards**. **Tap a row** to open the project. Coming back keeps the seller picker and list filters until you click **Clear filters**. **Print** and **Export** follow the salesperson picker; list filters stay in the browser.

## Margin & Mix

Open **Reports → Margin & Mix** (`/reports/margin-mix`) for the weekly finance / management commercial review. Pick a salesperson, **FY**, and **quarter** at the top. Sales and Operations do not see this pack.

### Won book

Confirmed-and-beyond for the selected Indian FY (confirmation date, or project FY if that date is missing): Confirmed, Installation, Submitted for subsidy, Completed, Completed — subsidy credited. **Quarter** (Q1 Apr–Jun … Q4 Jan–Mar) uses confirmation date; jobs with no confirmation date appear only in **All quarters**. Lead / Survey / Proposal / Lost stay off this pack. **Submitted for subsidy** is included here even though Sales Review achievement excludes it.

### Gross profit

| KPI | Meaning |
| :-- | :-- |
| **Revenue** | Sum of order value on the won book |
| **Gross profit** | CRM GP, then expected profit (flagged estimated), then order value minus total project cost |
| **GP %** | Profit ÷ order value, **weighted** in mix tables (not an average of percents) |
| **Missing cost** | Jobs with no CRM total project cost |
| **Thin / loss** | GP under 10% / below zero |
| **Revenue YoY** | Vs the same period last FY (full year, or the same quarter) |

Bands: **Loss** · **Under 10%** · **10–20%** · **20%+** · **Unknown**. kW bands are 0–3 / 3–5 / 5–10 / 10–20 / 20+ (typical Kerala residential).

**PE vs CRM** flags a latest Proposal Engine costing sheet 10%+ away from CRM cost, or PE cost with no CRM cost yet.

On **laptop / full screen**, click a column heading to **filter** and **sort**. On **phones** the list is **cards**. **Tap a row** to open the project. Coming back keeps the seller, FY, quarter, and list filters until you click **Clear filters**. **Print** and **Export** follow the salesperson, FY, and quarter pickers; list filters stay in the browser.

→ [Projects](#projects-module) · [Permission matrix](/help/roles#permission-matrix)
