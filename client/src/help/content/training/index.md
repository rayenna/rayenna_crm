# Zenith Command Center — Comprehensive training & presentation guide

**Rayenna CRM** · Facilitator-led workshops, self-study, and **slide-deck production** · **Primary audience: Sales** · Operations, Finance, Management, and Admin covered in depth where their layout differs.

**In-app:** Help → **Training** (`/help/training`) · **Deep reference:** Help → **Analytics** → **Zenith Command Center**

---

## How to use this document

| Use case | How to use it |
| :-- | :-- |
| **Build a PowerPoint / Google Slides deck** | Use **[Suggested slide sequence](#suggested-slide-sequence-presentation-outline)** — each row is one or two slides. Copy **Key points** bullets under each module into slide bodies; use **Speaker notes** as presenter notes. |
| **Live workshop (60 min)** | Modules **1–7** + **9** + abbreviated **8**; skip deep FY chart if time is tight. |
| **Live workshop (90 min)** | Full **Modules 1–10** + **Hands-on lab** + Q&A. |
| **Self-study** | Read in order; complete the **Hands-on lab checklist**. |
| **Executive briefing (15 min)** | Use **[Executive summary](#executive-summary-stakeholder-brief)** + slide outline rows 1–4 and 25–28. |

**Convention in this file**

- **SLIDE (title)** — suggested slide title for your deck.
- **Speaker notes:** — paste into the “Notes” pane below the slide.
- **Key points:** — bullet list for the slide face.

---

## Executive summary (stakeholder brief)

**What is Zenith?** A full-screen **command center** inside Rayenna CRM. It uses the **same data and date rules** as the classic Dashboard, but adds **click-through analytics**: charts, leaderboard, funnel, **Availing Loan** KPI (Finance + executive Zenith), and Proposal Engine rows open a **Quick Actions** drawer with filtered project lists. Users can jump to the full **Projects** page with matching filters via **Open in Projects →**.

**Why it matters:** Faster prioritisation (**Today’s Hit List** mirrors **Your pipeline today** for columns, **filters**, **sort**, and **Quick Actions** — including **Recent remarks** before you log activity), plus Deal Health and AI Insights; **transparency** (The Board drill-down); **mobility** (compact **mobile** header with FY / Qtr / Mo dropdowns).

**Who gets it:** Sales, Operations, Finance, Management, Admin — **layout and scope differ by role** (Sales sees own pipeline on executive Zenith; Management/Admin see company-wide).

**Risks / limits:** Drawer lists use a **large server batch** of projects; **Open in Projects →** is authoritative for full counts at very high volume. **Management** is **view-only** in quick edits.

---

## Suggested slide sequence (presentation outline)

Use this table as your **master deck outline**. Duplicate or merge rows if you want more than one slide per topic.

| # | Slide title (suggested) | Module / section | Time (cumulative) |
| :--: | :-- | :-- | :-- |
| 1 | Zenith Command Center — Training | Cover | 0:00 |
| 2 | Learning objectives | Objectives | 2:00 |
| 3 | Who sees what — roles | Roles | 5:00 |
| 4 | How to open Zenith | Module 1 | 7:00 |
| 5 | Command bar — filters (desktop) | Module 2 | 12:00 |
| 6 | **Mobile:** compact header & dropdowns | Module 2B | 17:00 |
| 7 | AI Insights ticker | Module 3 | 20:00 |
| 8 | KPI strip — what the numbers mean | Module 4 | 25:00 |
| 9 | Today’s Hit List | Module 4 | 30:00 |
| 10 | Revenue forecast — weighted pipeline | Module 4 | 38:00 |
| 11 | The Board — leaderboard | Module 5 | 45:00 |
| 12 | Your Focus — collapsible panels | Module 6 | 50:00 |
| 13 | Proposal Engine in Zenith | Module 6 | 55:00 |
| 14 | Deal flow funnel | Module 7 | 60:00 |
| 15 | Explore the landscape — overview | Module 8 | 65:00 |
| 16 | FY revenue vs profit drill-down | Module 8 | 72:00 |
| 17 | Quick Actions — list mode | Module 9 | 78:00 |
| 18 | Open in Projects → | Module 9 | 82:00 |
| 19 | Permissions & view-only | Module 9 | 86:00 |
| 20 | Operations / Finance Zenith | Module 10 | 92:00 |
| 21 | Hands-on lab | Lab | 95:00 |
| 22 | FAQ & resources | FAQ | 110:00 |

*Adjust times for your audience depth and breaks.*

---

## Learning objectives

By the end of this session, participants should be able to:

1. **Open Zenith** and set **Financial Year**, **Quarter**, and **Month** using **desktop chips** or **mobile dropdowns**, consistent with the classic Dashboard rules.
2. **Interpret** the **AI Insights** ribbon and jump to the related section.
3. **Read** the **KPI strip**, **Today’s Hit List** (where shown), and **Revenue forecast** — including **stage-weighted** forecast logic, and how the Hit List **matches the pipeline table** (same columns, filters, and sort pattern, on the urgent **seven-deal** slice).
4. Use **The Board**, **Your Focus**, **Deal flow funnel**, the **Availing Loan** KPI tile, and **Proposal Engine** rows to open **Quick Actions** lists and **Open in Projects →** where needed.
5. **Explore** charts, drill down with correct **metric** (order value vs **gross profit** on FY profit), and use **Open in Projects →** for full-grid work.
6. **Recognise** role differences (company-wide vs own deals, **view-only** drawer for Management) and when **Victory** toast appears.

---

## Prerequisites & materials

- **Accounts:** Training or sandbox logins for **Sales** and at least one of **Management** / **Operations** / **Finance** if you run breakouts.
- **Devices:** One **phone** or narrow browser window to demo **mobile** command bar; one **desktop** for charts.
- **Optional:** Printed **Hands-on lab checklist** or shared doc link.
- **Keyboard card:** `?` Help · `Ctrl+Shift+Z` / `⌘⇧Z` Zenith (see Appendix).

---

## Roles and what you see

| Role | Scope in Zenith | Quick Actions drawer |
| :-- | :-- | :-- |
| **Sales** | **Your** pipeline, capacity, revenue, profit (assigned to you). | **Edit** when project is **yours**: stage, log activity, deal value, **confirmation date** (order confirmation), and related fields — same idea as Project detail. |
| **Management** | **Company-wide** executive view; combined **Your Focus**. | **View-only** quick edits (lists and drill-down work). |
| **Admin** | Same executive layout as Management. | **Full edit** where Project detail allows. |
| **Operations** | Execution KPIs, **Installation pulse**, funnel, charts. | **Edit** per project permissions. |
| **Finance** | Financial KPIs, **Payment radar**, charts. | **Edit** per project permissions. |

**Lost** projects cannot be advanced from the drawer for anyone.

---

# Module 1 — Navigation and first launch

**SLIDE: Opening Zenith**

**Key points:**

- **Dashboard** menu → **Zenith ✦**
- Same **FY / Quarter / Month** rules as classic Dashboard (not a different database).
- **`?`** opens Help on **Analytics** (Zenith section).

**Speaker notes:** Emphasise Zenith is an **analytics layer**, not a replacement for Projects or Customers. Flow: set filters → scan KPIs → Board → funnel → Your Focus → charts.

**Demonstration (2 min):** Open Zenith; point at command bar; press `?` once.

**Check question:** *If you select two financial years, what happens to Quarter and Month?* → **Disabled** (same as Dashboard).

---

# Module 2 — Command bar and filters (desktop)

**SLIDE: Date filters — three rules**

**Key points:**

1. **FY** — One or more April–March years (e.g. `2024-25`).
2. **Quarter** — Only when **exactly one** FY is selected (Q1 Apr–Jun … Q4 Jan–Mar).
3. **Month** — Only when **exactly one** FY; if quarters are selected, months are limited to those quarters.

**Reset** clears FY, quarter, and month (broad “all periods” style view).

**Sales nuance:** Executive Zenith for Sales = **your** deals; filters narrow **time**, not other people’s pipelines.

**Exercise (3 min):** One FY → Q3 → one month; compare to **Reset**; optionally cross-check Dashboard.

---

# Module 2B — Mobile command bar (phones & narrow screens)

**SLIDE: Zenith on mobile — thin header**

**Key points:**

- Below the **`lg`** breakpoint (large tablet / desktop), the command bar uses a **two-row layout**:
  - **Row 1:** **Zenith** title (left) + **✦ Briefing** and **Live · time** (right).
  - **Row 2:** **One line** of **three dropdowns** — **FY**, **Qtr**, **Mo** — plus **Reset** when any filter is set.
- **Desktop / large screens:** Original **pill** filters (chips) remain; layout is three zones: title | filters | briefing.
- Mobile dropdowns use **single selection** per control (multi-select from desktop is shown as a short “N FYs” style placeholder until the user picks one value).

**Speaker notes:** This is for **field usage** and **landscape phone** — maximises space for Hit List, charts, and tables. Train users to use **Open in Projects →** when they need the full grid on a small screen.

**Demo (2 min):** Resize browser or use device toolbar; show dropdown row and top-right briefing.

---

# Module 3 — AI Insights ticker

**SLIDE: AI Insights — not a chatbot**

**Key points:**

- Short highlights from **data already loaded** for your filters.
- **Hover** (mouse) pauses scroll; **tap** an insight **jumps** the page to a related block.
- On touch-only devices there is no hover pause — tap to navigate.

**Demo:** Click one insight that lands in **Your Focus** or **Explore**.

---

# Module 4 — KPI strip, Hit List, Revenue forecast

## KPI strip

**SLIDE: KPI cards**

**Key points:**

- Animated numbers on filter change; **sparkline** (last ~7 FY buckets); **trend badge** when **exactly one** FY and comparison exists.
- Multiple FYs → comparison badges hidden (clarity).
- **Finance** and **executive** Zenith (**Sales**, **Management**, **Admin**): **Availing Loan** is a **clickable** tile → **Quick Actions** list (same pattern as **Explore** charts and **Deal flow**), then **Open in Projects →** for the full **Projects** list with the availing-loan filter — not a direct navigation shortcut past the drawer.

## Today’s Hit List

**SLIDE: Hit List — same mental model as Your pipeline today**

**Key points:**

- **Wide layout** (desktop / tablet band) — beside the KPI + **Revenue forecast** row; **narrow phones** show a **stacked card** per deal (same facts, no wide table).
- **Same server rows** as **Your pipeline today** (zenith-focus pipeline), but **filtered and ranked** to the **top deals that need attention today** (up to **seven**). **Sales** see **their** deals; **Management / Admin** see **company** pipeline in that band.
- **Desktop:** **Filter customer…**, **All stages**, and **All salespeople** above the table — same idea as **Company pipeline today**. **Click column headers** to sort (including **Alert**, **Confirmation**, **Health**); arrows show **↑ / ↓**. Filters only affect the **up to seven** deals already on the Hit List for the day (**X of N shown** when filters hide some).
- **Desktop table columns** align with **Your pipeline today**: **Customer**, **Stage**, **Sales person**, **Deal value**, **Last activity** (*N*d ago, green / amber / red pill), **Alert** (why it landed on the list — e.g. **Overdue**, **Closing soon**, **Stalled**, **Nudge needed**, **Going cold**), **Confirmation** (order **confirmation date** or **—**), **Deal Health** badge, **Open →**.
- **Overdue** / **Closing soon** use the project’s **expected commissioning** date when set; **stalled** / **nudge** / **going cold** rules use **stage + recency** (see Analytics help for detail).
- **Open →** opens the **Quick Actions** drawer for that project (not a raw jump past the drawer). Use **Open full project** inside the drawer when you need the full **Project detail** page.
- When deals are listed, a **short hint** under the Hit List title may ask users to **scroll right** (on tight widths) and tap **Open →** for **Quick Actions**.
- **Horizontal scroll** inside the Hit List body if the viewport is tight — same idea as other Zenith tables.
- **All clear** when nothing qualifies for the list; header may still show **at risk** value context when deals are listed.

**Speaker notes:** Train users to read **Alert** + **Last activity** together, then **Confirmation** for closure hygiene. Demo **filter + sort** on the Hit List, then contrast with **Your pipeline today** for the **full** list beyond seven rows.

## Revenue forecast

**SLIDE: Weighted forecast — critical concept**

**Key points:**

- **Not** sum of every open deal at 100%.
- **Order value × stage win probability** per open deal; early stages contribute less.
- **Tabs** (Source, Sales, Segment, Stage) **split the same total**; **+N more** → full drawer list.

**Exercise (5 min):** Read headline + N deals; switch **Stage** tab; open **+N more** if visible.

---

# Module 5 — The Board

**SLIDE: The Board — transparency**

**Key points:**

- Below KPI / forecast; **above** Deal flow funnel.
- **Month / Quarter / FY** on the **card** — uses **stage entered / confirmation** (can differ from command-bar FY).
- **Click** header total or row value → **Quick Actions** list → **Open in Projects →** optional.

**Exercise (3 min):** Switch periods; open a drill-down list.

---

# Module 6 — Your Focus

**SLIDE: Your Focus — expand to work**

**Key points:**

- **Below** Deal flow funnel; panels **start collapsed**.
- **Sales:** Your pipeline today + **Proposal Engine** (when shown).
- **Management / Admin:** Company pipeline, Payment radar, Installation pulse, Proposal Engine.
- **Proposal Engine rows:** **Quick Actions** list → **Open in Projects →** with **PE bucket** + dates. (Dashboard PE card **links** straight to Projects — same filters.)

**Pairing:** Hit List = **urgent, server-ranked slice** (up to **seven** deals) with **local** filters + sort like the pipeline table; **Your pipeline today** = **full** pipeline for your date filters (same controls, **no** seven-deal cap).

---

# Module 7 — Deal flow funnel

**SLIDE: Funnel — same rules as lists**

**Key points:**

- **Stage rows** and **payment pills** (where shown) → **Quick Actions** list.
- **Open in Projects →** matches stage / payment + command-bar dates.
- **One mental model** with charts and The Board.

---

# Module 8 — Explore the landscape

**SLIDE: Chart drill-down**

**Key points:**

- Bars, slices, FY points, banks → drawer **list mode**.
- **FY chart:** **Orange** = revenue (order value totals); **Teal** = profit (**gross profit** totals).
- **Segment donuts:** Revenue vs pipeline = **different** definitions.
- **Explorer batch:** up to **~5,000** recently updated projects in Zenith’s explorer; **Open in Projects →** uses full Projects API — rare mismatch at huge volume.

**Exercise (5 min):** Projects by stage → list → **Open →** one project → **Back**; optional **Open in Projects →**.

---

# Module 9 — Quick Actions drawer

**SLIDE: List mode & footer**

**Key points:**

- **Viewing:** strip; sort by value / profit / health / activity as offered.
- **Open in Projects →** — same logical filters as the list (peBucket, zenithSlice, zenithFyProfit, stage, payment, etc.).

**SLIDE: Single project & permissions**

**Key points:**

- **Open →** → quick edits; **Open full project** → detail.
- **Recent remarks** — Above **Log activity** (where shown): **newest-first** thread from **Project → Remarks** (read-only in the drawer). Same API as the project page; use **Open full project** for the full history and to edit/delete remarks. Shown in **Quick Actions** (sales/executive), **Operations**, and **Finance** drawers (finance read-only users still see remarks as **context**).
- **Management** view-only; **Sales** non-owner view-only; **Admin** per `canEdit`.

---

# Module 10 — Other roles (summary)

**SLIDE: Operations**

- Installation pulse; **+ Log update**; horizontal scroll on phone; funnel drill-down.

**SLIDE: Finance**

- **KPI strip:** **Availing Loan** tile → **Quick Actions** list → **Open in Projects →** (same drill-down model as charts).
- **Payment radar:** ageing buckets filter **Top overdue**; hint text under **Top overdue** explains **project name** (opens project / payment work) vs **Remind** (WhatsApp / Email helpers).

**SLIDE: Management & Admin**

- Full executive path; Management **read-only** in drawer; Admin full edit where allowed.

---

# Chronological demo script (90-minute workshop)

| Time | Activity |
| :-- | :-- |
| 0:00 | Welcome, objectives, roles table |
| 5:00 | Open Zenith, command bar desktop + **mobile** resize |
| 15:00 | AI Insights click-through |
| 20:00 | KPIs + Hit List (**filters**, **sort** a column, **Alert** + **Confirmation**) + Forecast tab demo |
| 35:00 | The Board drill-down |
| 45:00 | Your Focus expand → pipeline → PE row → drawer |
| 55:00 | Deal flow funnel click |
| 60:00 | Explore: Projects by stage + FY revenue vs profit |
| 75:00 | Quick Actions permissions (switch user or explain) |
| 80:00 | **Hands-on lab** (see checklist) |
| 105:00 | FAQ, keyboard shortcuts, Help → Analytics |
| 110:00 | Close |

---

# Hands-on lab checklist (Sales — 15–20 min)

| # | Task | Pass criteria |
| :-- | :-- | :-- |
| 1 | Open Zenith; set **one FY + one quarter** (desktop or mobile dropdowns) | Q/M rules behave |
| 2 | **Mobile:** confirm **Briefing** top-right; **three dropdowns** one line | Layout matches training |
| 3 | Click one **AI Insight** | Scroll lands correctly |
| 4 | **Revenue forecast:** switch two tabs | Total unchanged |
| 4b | **Hit List:** filters + sort; **Open →** → Quick Actions → **Recent remarks** above **Log activity** | Matches talking points |
| 5 | Expand **Your pipeline**; sort by **Deal Health** | Order updates |
| 6 | **The Board:** row value → drawer | **Open →** works |
| 7 | Optional: **Open in Projects →** | Projects URL matches slice |
| 8 | **Projects by stage** drill-down | List plausible |
| 9 | **Proposal Engine** row | Drawer + optional Projects link |
| 10 | **Funnel** stage row | Drawer opens |
| 11 | Log activity on **your** project (if allowed) | Remark on project |
| 12 | **Reset** filters | Broader KPIs |
| 13 | Optional: `Ctrl+Shift+Z` from Dashboard | Zenith opens |

**Facilitator:** Management trainees — steps 1–8; confirm **no** drawer edits on others’ projects.

---

# Visual / screenshot checklist (for slide designers)

If you are building slides with screenshots, capture these **labeled** views:

1. Full **desktop** Zenith with command bar + KPI row.
2. **Mobile** command bar: title + briefing row; **FY / Qtr / Mo** dropdown row.
3. **AI Insights** ribbon (hover paused if possible).
4. **Revenue forecast** with **Stage** tab selected.
4b. **Today’s Hit List** with **filter** row and **sort** indicator on a column header.
5. **Quick Actions** single-project view showing **Recent remarks** above **Log activity**.
6. **The Board** expanded with drill-down drawer **open**.
7. **Your Focus** expanded — **Proposal Engine** row.
8. **Explore** chart with tooltip + **Quick Actions** list.
9. **FY chart** with orange point and teal bar called out.
10. **Quick Actions** footer showing **Open in Projects →**.
11. **View-only** banner (Management user).

---

# Frequently asked questions

**Q: Zenith vs Dashboard — which is correct?**  
A: Same rules and data; different **layout**. Check **filters** and **scope** (Sales = yours on executive Zenith).

**Q: Forecast dropped when a deal moved Proposal → Lead?**  
A: **Lower stage weight** in the weighted total.

**Q: Edit payments from Zenith?**  
A: Use **Project detail** / Finance areas.

**Q: Management cannot edit in drawer — bug?**  
A: **Intentional view-only.**

**Q: Stale data?**  
A: Refresh; Zenith is **server-backed** after login.

**Q: Drawer count vs Open in Projects?**  
A: Drawer uses Zenith **explorer batch**; **Open in Projects** uses full list API — see Help → **Explorer batch limit**.

**Q: Zenith PE vs Dashboard PE card?**  
A: Same buckets. Zenith → **drawer first**; Dashboard card → **direct Projects link**.

**Q: Zenith Availing Loan vs Dashboard Quick Access Availing Loan?**  
A: Same filter semantics, different **first step**. On **Finance** and **executive** Zenith (**Sales**, **Management**, **Admin**), **Availing Loan** opens **Quick Actions** (like chart drill-down); use **Open in Projects →** for the full grid. The classic **Dashboard** **Availing Loan** metric tile still links **straight to Projects** with the filter.

**Q: Hit List looks different from “before” — what changed?**  
A: It uses the **same column pattern** as **Your pipeline today** (including **confirmation date** and **last activity** as *N*d ago), plus an **Alert** column, **filter** row (**customer / stage / salesperson**), and **sortable** headers. **Open →** still goes to **Quick Actions**, which now shows **Recent remarks** above **Log activity** for context.

**Q: Mobile: why dropdowns instead of chips?**  
A: **Space** — one thin filter row so charts and tables stay usable on small screens.

---

# Deal Health score (training summary)

**Deal Health** is a **0–100** score for **open** pipeline deals (not Completed, Subsidy Credited, or Lost). It is the **sum of five factors** (each has a max); total capped at **100**.

| Factor | Max | One-line meaning |
| :-- | --: | :-- |
| Activity | 30 | How recently the project was updated |
| Momentum | 25 | Time in current stage vs typical for that stage |
| Deal value | 20 | Order value **bands** — top band **₹1.75L–₹3L** (typical **3–5 kW** sweet spot); very large orders score lower on this factor by design |
| Close date | 15 | **Confirmation date** (Sales & Commercial) + **Advance received** vs **order value** (Payment tracking); the UI still labels this row “Close date” |
| Lead source | 10 | Referral / partner sources score higher than unknown |

**Illustration:**

```text
Deal Health = Activity(≤30) + Momentum(≤25) + Deal value(≤20) + Close date(≤15) + Source(≤10)  →  0–100
```

For **exact point tables** (activity days, momentum multiples, every rupee band, advance rules, lead source points), open **Help → Modules** and find **Deal Health Score**, or go directly to **`/help/modules#deal-health-score`**.

---

# Glossary

| Term | Meaning |
| :-- | :-- |
| **FY** | Financial year April–March (e.g. `2024-25`). |
| **Command bar** | Sticky top area: branding, date filters, Briefing, Live clock. |
| **Weighted forecast** | Σ (order value × stage win probability) for open deals. |
| **Deal Health** | 0–100: five factors (activity, momentum, deal value bands, confirmation + advance vs order, lead source). Full tables in Help → Projects. |
| **Drill-down** | Chart / Board / funnel / PE row / **Availing Loan** KPI → **Quick Actions** list. |
| **Quick Actions** | Side drawer: list mode or single-project quick edits; **Recent remarks** (read-only) above **Log activity** where applicable. |
| **Open in Projects →** | Footer link → **Projects** with matching URL filters. |
| **PE bucket** | PE Ready, PE Draft, PE Not Yet Created, Rest. |
| **Explorer batch** | Large cap of project rows loaded for Zenith drill-downs (see Analytics help). |
| **Today’s Hit List** | Up to **seven** urgent pipeline deals; **filters + sort** like **Your pipeline today**; **Alert** column; **Open →** = **Quick Actions** (with **Recent remarks** above log activity). |
| **Won-path** (The Board) | Confirmed → Subsidy Credited stages counted for leaderboard credit rules. |

---

# Appendix — Keyboard shortcuts (Zenith-relevant)

| Shortcut | Action |
| :-- | :-- |
| `?` | Help (Zenith → Analytics) |
| `Ctrl+Shift+Z` / `⌘⇧Z` | Open **Zenith** |
| `Ctrl+Shift+D` / `⌘⇧D` | **Dashboard** |
| `Ctrl+Shift+P` / `⌘⇧P` | **Projects** |
| `Esc` | From Help → **Dashboard** |

Full list: **Help → Getting Started → Keyboard shortcuts**.

---

# Optional: Post-training check (3 questions)

1. Name **two** places you can open a **filtered project list** from Zenith (e.g. a chart slice, funnel row, **Availing Loan** KPI, or **The Board**).  
2. What is the difference between **orange** and **teal** on the **Revenue & profit by FY** chart (drawer totals)?  
3. Who gets **view-only** Quick Actions on projects?

---

## Document control

| Field | Value |
| :-- | :-- |
| **Product** | Rayenna CRM — Zenith Command Center |
| **Audience** | End-user training (Sales-primary); facilitators; slide authors |
| **Companion** | Help → **Analytics** → **Zenith Command Center** |
| **Version note** | Includes **mobile** command bar (dropdown filters, briefing top-right). Hit List: pipeline-style **filters + sort**, optional **scroll right / Open →** hint; **Availing Loan** KPI opens drawer; Payment radar **Top overdue** helper text; quick drawers: **Recent remarks** before **Log activity**. |

---

*End of training guide*
