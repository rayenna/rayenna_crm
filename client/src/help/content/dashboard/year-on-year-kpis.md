# Year-on-Year KPIs

On **Sales**, **Management**, and **Admin** classic dashboards, a full-width **Year-on-Year** band appears near the top (after the marquee). It summarizes five metrics for your current filter period.

**Finance** and **Operations** do not show this band on the classic Dashboard (they use other KPI rows instead).

## The five metrics

| Metric | Meaning |
| :-- | :-- |
| **Total Capacity** | Sum of system capacity (kW) in scope |
| **Total Pipeline** | Combined value of pipeline-stage projects (**excludes Lost**) |
| **Total Revenue** | Revenue from confirmed-path deals in scope |
| **Total Profit** | Gross profit total (shows **—** when not available) |
| **Pipeline Conversion** | **Total Revenue ÷ (Total Pipeline + Lost order value) × 100%**. Lost rupees are in the denominator only; they are **not** added to the Total Pipeline tile. |

Each tile shows a **YoY badge** in the top-right when a comparison is possible.

## When YoY badges appear

| Filter state | YoY behaviour |
| :-- | :-- |
| **No FY** selected (default) | Badges show **N/A** |
| **Multiple FYs** selected | **N/A** (comparison needs one period) |
| **Exactly one FY** selected | Compare to **previous financial year** (e.g. 2024-25 vs 2023-24) |
| **One FY + Quarter or Month** | Compare to the **same quarter/month in the prior FY** when the API has data |

If the prior period is missing or zero, the badge may show **N/A** even with one FY selected.

## Reading the badge

- **▲** teal — increase vs comparison period (percentage shown).  
- **▼** crimson — decrease vs comparison period.  
- **N/A** — no valid comparison for this metric.

**Pipeline Conversion** YoY compares conversion **percentages**, not raw rupee totals.

## Relation to charts

The **Revenue & Profit by Financial Year** chart below uses related FY data but is a separate view (grouped columns per year). The YoY band is your **at-a-glance** period comparison for the **currently selected** filter.

## Zenith

Executive Zenith layouts use the same metric definitions on the **KPI strip** ([Zenith → KPI strip](/help/zenith#kpi-strip-and-year-on-year)). Filter rules match [Dashboard filters](#dashboard-filters).

## Sales scope

On the **Sales** dashboard, all five metrics are **scoped to your projects** (assigned salesperson). Management and Admin see **company-wide** totals.
