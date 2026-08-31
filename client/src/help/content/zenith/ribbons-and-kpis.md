# Ribbons and KPIs

Below the sticky command bar: **Solar News**, then the **KPI strip**, then **AI Insights**, then the rest of the overview (including **Weighted open pipeline** on executive roles).

## Solar News ticker

**Where** — Full-width strip **below** the command bar and **above** the KPI tiles.

**What** — Short **headlines** from a fixed set of **solar / energy RSS feeds** (no HTML scraping). The CRM server fetches and normalises feeds on a **~30 minute** cache (`/api/solar-news`); the browser loads the ticker from that API after login.

**Use** — **Click a headline** to open the source article in a **new browser tab**. **Hover** the marquee strip (desktop) to **pause** scrolling — same affordance as AI Insights.

**Colour tags** — Small badges such as **policy**, **grid**, **market**, **tech**, and **agri** help you scan topics; they do not affect CRM data.

**When feeds fail** — Zenith may show **curated fallback** lines until the next successful refresh.

## AI Insights ticker

Directly **below** the **KPI tiles**, Zenith shows an **AI Insights** ribbon: a **horizontal scrolling strip** of short, plain-English highlights derived from the **same dashboard data** already loaded for your filters (no external AI service). The KPI strip sits **between** Solar News (above) and AI Insights (below) for every role.

- **Content** — Examples include conversion vs a simple benchmark, top pipeline or revenue by salesperson, stale pipeline signals, revenue vs a prior period, loan concentration by bank, and role-relevant finance or operations notes. The exact lines change with your **role** and **filters**.
- **Motion** — Text scrolls continuously; **hover** over the strip to **pause** scrolling.
- **Click an insight** — The page **smooth-scrolls** to a related section (KPIs, **The Board**, funnel, **Your Focus**, charts, etc.). If a target section does not exist for your role, Zenith scrolls to the nearest sensible anchor.

## KPI strip and year-on-year

The **top row of KPI cards** summarises key metrics for your role. Each card includes:

- A **large value** that **animates from zero** when the page loads or when you **change date filters** (about 1.2 seconds, ease-out), for a quick read of the current number.
- A **mini sparkline** (line chart, no axes) using the **last seven financial-year buckets** available for that metric in the payload — the line is **gold** when the series trends up and **crimson** when it trends down. Sparklines are **hidden on phones, tablets, and short laptop screens** so the value and badge stay primary.
- A **trend badge** in the **top-right** (e.g. **▲ 12%** in teal / **▼ 3%** in crimson) when a **period-over-period %** is available — same rules as classic dashboard comparisons (e.g. one FY selected for YoY-style badges).
- A subtle **hover glow** (gold-tinted shadow) on the card.

Cards **stagger in** slightly when the strip appears (animation order by column).

**Availing Loan (clickable KPI)** — On **Finance** Zenith and **executive** Zenith (**Sales**, **Management**, **Admin**), the **Availing Loan** tile is **clickable**. It opens the **Quick Actions** drawer in **list mode** with projects that have **Availing Loan/Financing** set (excluding **Lost**), scoped to your command-bar **FY / Quarter / Month** — the same interaction model as **Explore the landscape** charts and the **Deal flow funnel** (not a direct jump to **Projects**). Use **Open in Projects →** in the drawer footer for the full **Projects** grid with the **Availing Loan** filter applied.

**YoY / comparison behaviour**

- Comparison badges appear when you select **exactly one** Financial Year (and the system can compare to the **prior FY** or the **same quarter/month in the prior FY**, matching dashboard logic).
- If you select **multiple FYs**, those badges are hidden so the comparison stays unambiguous.
- If the prior period was **zero**, the % change may not show (to avoid misleading divides).

Metrics and labels are **role-specific** (see below). **Sales** sees data **scoped to you**; **Management**, **Admin**, **Operations**, and **Finance** see **company-wide** views where applicable.

## Weighted open pipeline (Revenue Forecast tile)

**Where** — On **Sales / Management / Admin**: below the full-width KPI grid, beside **Things needing attention**. On **Finance / Operations**: beside **Today’s plan**.

**What the big number is** — A **weighted open pipeline** total, **not** cash or collections. Each **open** deal (not Completed, not Subsidy Credited, not Lost) contributes **order value × a win probability for its current stage**. **Early** stages are discounted (Lead 10% … Proposal 45%); **Confirmed+** count at **100%** for scheduling.

**Adjust (progressive disclosure)** — By default the tile shows the **hero ₹**, breakdown **tabs**, the **top three rows**, and **+N more**. Tap **Adjust** to open band (**All / Early / Committed**), when (**Any time / Month / Quarter / Rest of FY**), **Weights** (stage win %), raw/win-rate context, concentration, and role accent lines. Your last **Adjust** open/closed state and filter choices are remembered per user on this device.

**Dual context** — Under the headline when Adjust is open: **Raw** = sum of order values for the same open cohort; **Win rate** = weighted ÷ raw (implied blend of stage mix).

**Band: All / Early / Committed** — **All** = every open stage. **Early** = Lead, Site Survey, Proposal. **Committed** = Confirmed Order, Under Installation, Submitted for Subsidy.

**When: Any time / Month / Quarter / Rest of FY** — Timing uses **expected commissioning date only** (IST). Confirmation / stage-entered are **not** used (they are history, not a due date). Deals **without** commissioning appear only under **Any time** (subtitle shows **unscheduled** count). **Month** = commissioning this month or overdue. **Quarter** = through end of the current Indian FY quarter. **Rest of FY** = after this quarter through 31 Mar of the current Indian FY.

**Subtitle** — **Expected from N open deals** reflects the active band + when filters. If the explorer hit its scan cap, a **Based on explorer cohort (max N)** note appears.

**Concentration** — **Top 3 = X% of forecast** (click to open those deals). Always shown when the forecast is non-zero.

**Role accent** (one thin line under concentration):
- **Sales** — commissioning / past-due nudge on your scoped book
- **Management / Admin** — warning if one lead source is ≥ 50% of the weighted forecast
- **Finance** — weighted value of deals with open balance (PENDING/PARTIAL or balance > 0)
- **Operations** — Confirmed+ weighted value and kW in the current filter

**Tabs: Source, Sales, Customer type, Stage** — Tabs only **split the same weighted total** for the active band + when. Each row is **clickable** and opens the drawer for that slice. Bars are relative to the **largest row in the current tab**. **+N more** opens a floating list of **remaining categories**; pick one to open its deals.

---
