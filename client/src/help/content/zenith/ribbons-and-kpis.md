# Ribbons and KPIs

Below the sticky command bar: **Solar News**, **AI Insights**, then the **KPI strip** and **Revenue forecast** (executive roles).


## Solar News ticker

**Where** — Full-width strip **below** the command bar and **above** [AI Insights](#ai-insights-ticker).

**What** — Short **headlines** from a fixed set of **solar / energy RSS feeds** (no HTML scraping). The CRM server fetches and normalises feeds on a **~30 minute** cache (`/api/solar-news`); the browser loads the ticker from that API after login.

**Use** — **Click a headline** to open the source article in a **new browser tab**. **Hover** the marquee strip (desktop) to **pause** scrolling — same affordance as AI Insights.

**Colour tags** — Small badges such as **policy**, **grid**, **market**, **tech**, and **agri** help you scan topics; they do not affect CRM data.

**When feeds fail** — Zenith may show **curated fallback** lines until the next successful refresh.

## AI Insights ticker

Directly **below** **Solar News**, Zenith shows an **AI Insights** ribbon: a **horizontal scrolling strip** of short, plain-English highlights derived from the **same dashboard data** already loaded for your filters (no external AI service).

- **Content** — Examples include conversion vs a simple benchmark, top pipeline or revenue by salesperson, stale pipeline signals, revenue vs a prior period, loan concentration by bank, and role-relevant finance or operations notes. The exact lines change with your **role** and **filters**.
- **Motion** — Text scrolls continuously; **hover** over the strip to **pause** scrolling.
- **Click an insight** — The page **smooth-scrolls** to a related section (KPIs, **The Board**, funnel, **Your Focus**, charts, etc.). If a target section does not exist for your role, Zenith scrolls to the nearest sensible anchor.

## KPI strip and year-on-year

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

## Revenue Forecast (wide KPI tile)

**Where** — Spans the width of the KPI band on **Sales**, **Management**, and **Admin** (executive Zenith).

**What the big number is** — A **weighted pipeline forecast**, not raw pipeline value. Each **open** deal (not Completed, not Subsidy Credited, not Lost) contributes **order value × a win probability for its current stage** (for example Lead 10%, Proposal 45%, Confirmed Order 85%, Under Installation 90%, Submitted for Subsidy 95%). Early-stage deals count for less so the headline reflects **expected** revenue, not “every deal at 100%.”

**Subtitle** — **Expected from N open deals** is the count of those weighted deals.

**Tabs: Source, Sales, Customer type, Stage** — The **total** does not change when you switch tabs; tabs only **split the same weighted total** by lead source, assigned salesperson, **customer type** (Residential, Apartment, Commercial from Customer Master), or stage. Each row shows that slice’s **weighted** sum; bars are relative to the **largest row in the current tab**. **+N more** means there are more categories than the three rows shown — click it to open the drawer with **all open deals** (sorted by weighted contribution).

**Layout** — The tile uses a **fixed height** so switching tabs does not resize the KPI row (that keeps **Today’s Hit List** and the funnel from jumping on large screens).

**Info line** — **Stage-weighted probability** — hover or refer here for the full idea.

---
