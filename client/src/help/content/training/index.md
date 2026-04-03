# Zenith Command Center — End-user training guide

**Rayenna CRM** · Facilitator-led and self-study material · **Primary audience: Sales** · Also covers Operations, Finance, Management, and Admin at a summary level.

---

## How to use this document

| Use case | Suggestion |
| :-- | :-- |
| **Live workshop (60–90 min)** | Follow **Modules 1–9** for Sales; use **Module 10** as breakout or appendix. |
| **Self-study** | Read in order; complete **Hands-on lab (Sales)** with a test account. |
| **Slides** | Each top-level `##` section maps cleanly to one or two presentation slides. |
| **In-app** | Open **Help → Training** (or go to `/help/training` in the CRM). |

**Related reference:** In-app **Help → Analytics** contains the full **Zenith Command Center** reference (filters, charts, drill-down, drawer). This training guide adds **pedagogy, exercises, and role context**.

---

## Learning objectives

By the end of this session, participants should be able to:

1. **Open Zenith** and set **Financial Year**, **Quarter**, and **Month** filters consistently with the classic Dashboard.
2. **Interpret** the **AI Insights** ribbon and jump to the relevant section on the page.
3. **Read** the **KPI strip**, **Today’s Hit List** (where shown), and the **Revenue forecast** tile — including what “weighted” forecast means.
4. Use **The Board** (Month / Quarter / FY) and **click-through lists** for transparency; expand **collapsible Your Focus** panels and use **Your pipeline today** to prioritise deals, **Deal Health**, and **Log activity** (Sales).
5. **Explore** charts under **Explore the landscape**, open the **Quick Actions** drawer in **list** mode (including from **The Board**), and open a **single project** for quick updates **when their role allows**.
6. **Recognise** what **Management** and other roles see differently (company-wide vs own pipeline, view-only drawer) and when a **Victory** toast may appear after a winning stage change.

---

## Prerequisites

- Active Rayenna CRM login with a role that includes **Zenith** (Sales, Operations, Finance, Management, or Admin).
- Basic familiarity with **Projects** (stages, order value, assigned salesperson).
- Optional: read **Help → Getting Started → Keyboard shortcuts** for `Ctrl+Shift+Z` / `⌘⇧Z`.

---

## Agenda at a glance

| Block | Topic | Sales depth | Other roles |
| :-- | :-- | :-- | :-- |
| A | What is Zenith? | ✓ | ✓ |
| B | Command bar & filters | ✓ Deep | ✓ |
| C | AI Insights | ✓ | ✓ |
| D | KPIs, Hit List, Revenue forecast | ✓ Deep | Overview |
| E | The Board (leaderboard + drill-down lists) | ✓ | Overview |
| F | Your Focus (collapsible panels) | ✓ Pipeline | Role panels |
| G | Deal flow funnel | ✓ | ✓ |
| H | Explore charts & drill-down | ✓ Deep | ✓ |
| I | Quick Actions drawer & permissions | ✓ Deep | View vs edit |
| J | Role-specific summary | — | ✓ |

---

## What is Zenith?

**Zenith** is Rayenna CRM’s **command center** analytics view:

- **Same trusted numbers** as the classic **Dashboard**, with a full-screen, dark layout optimised for scanning and exploration.
- **Sticky command bar** for date filters — KPIs, funnel, forecast, **Explore** charts, and drill-down lists **all follow** those filters.
- **Clickable analytics**: **Explore** charts and **The Board** open a **Quick Actions** side drawer with a **filtered project list** (and optional quick edits for permitted roles).
- **Server-backed data** after login — aligned with CRM when you switch devices (not “only on this browser”).

**Open Zenith:** top navigation → **Dashboard** menu → **Zenith ✦**.  
**Keyboard:** `Ctrl+Shift+Z` (Windows/Linux) or `⌘⇧Z` (Mac) when not typing in a field.  
**Help while in Zenith:** press **`?`** — opens Analytics help with the Zenith section.

---

## Roles and what you see

| Role | Scope in Zenith | Quick Actions drawer |
| :-- | :-- | :-- |
| **Sales** | **Your** pipeline, capacity, revenue, and profit metrics (assigned to you). | **Edit** when the project is **yours** (assigned salesperson): stage advance (where applicable), log activity, deal value, expected close date — same idea as **Project detail → Edit**. |
| **Management** | **Company-wide** executive view; sees combined **Your Focus** blocks. | **View-only** for project quick edits (no stage / value / date changes). Charts and lists still work. |
| **Admin** | Same executive layout as Management; full administration elsewhere in CRM. | **Full edit** in drawer (same pattern as Project detail permissions). |
| **Operations** | Execution KPIs, **Installation pulse**, stage and team charts. | **Edit** where CRM allows operations-style updates (aligned with project permissions). |
| **Finance** | Financial KPIs, **Payment radar**, revenue / outstanding views. | **Edit** where CRM allows (aligned with Project detail — finance users who can edit projects get drawer actions). |

**Lost projects** cannot be advanced from the drawer for anyone (same as project edit rules).

---

# Module 1 — Navigation and first launch

**Talking points**

1. Zenith is **not** a replacement for **Projects** or **Customers** — it is the **analytics layer** to prioritise work.
2. Encourage users to set **filters first**, then read KPIs → **The Board** → Funnel → **Your Focus** → Explore.

**Demonstration (2 min)**

1. From **Dashboard**, open **Zenith ✦**.
2. Point out the **command bar** (logo area + **FY** chips + **Quarter** / **Month** + **Reset**).
3. Press **`?`** once to show Help opening on **Analytics**.

**Check question:** *“If you select two financial years, what happens to Quarter and Month?”* — **Answer:** They are disabled (same as Dashboard).

---

# Module 2 — Command bar and filters (deep for Sales)

**Rules (memorise these three)**

1. **FY** — One or more April–March years (e.g. `2024-25`).
2. **Quarter** — Only when **exactly one** FY is selected (Q1 Apr–Jun … Q4 Jan–Mar).
3. **Month** — Only when **exactly one** FY is selected; if quarters are chosen, months are limited to those quarters.

**Reset** clears FY, quarter, and month — useful for an “all periods” style view (same concept as clearing filters on the classic dashboard).

**Sales nuance:** All numbers in the **executive** Zenith layout for Sales are **scoped to the logged-in salesperson**. Filters further narrow **time**, not “other people’s deals.”

**Exercise (3 min) — Sales**

1. Select **one FY** → enable **Q3** → pick one **month**.
2. Note how KPI values change vs **Reset**.
3. Open **Projects** from the main nav and confirm you can still navigate; (optional) compare counts with Dashboard for the same FY if needed.

---

# Module 3 — AI Insights ticker

**What it is**

- A **scrolling ribbon** of short, plain-English highlights built from **data already loaded** for your filters — **not** an external chatbot.
- **Click an insight** → the page **scrolls** to a related block (KPIs, The Board, funnel, Your Focus, charts).

**Interaction tips**

- **Hover** (mouse) **pauses** the scroll so people can read.
- On **touch devices**, there is no hover pause — read while it moves or tap an insight to jump.

**Trainer note:** Use one live click to demonstrate smooth scroll — pick an insight that lands in **Your Focus** or **Explore**.

---

# Module 4 — KPI strip, Today’s Hit List, and Revenue forecast (Sales core)

## KPI strip

- Large **animated numbers** on filter change (short animation for emphasis).
- **Mini sparkline** (last seven FY buckets where available) — gold when trending up, crimson when down.
- **Trend badge** (e.g. ▲ 12%) when **exactly one** FY is selected and a prior-period comparison exists.

## Today’s Hit List (Sales, Management, Admin — wide layout)

- Appears **beside** the KPI / forecast band on **large screens**.
- Surfaces a small set of deals needing attention: overdue close, stalled proposal, going cold, etc.
- Each row: stage, value, **urgency label**, **Deal Health** (0–100), **Open →** to **Project detail**.
- **Deal Health** hover shows the same breakdown as on the **Projects** list (activity, momentum, value, close date, lead source).
- If nothing is urgent: **All clear**.

## Revenue forecast (wide tile)

**Critical concept for Sales training:** The headline is **not** “sum of every open deal at full value.”

- It is a **stage-weighted expected revenue**: each open deal contributes **order value × win probability for its current stage** (early stages count less; later stages count more).
- Subtitle: **Expected from N open deals** = count of deals in that forecast.

**Tabs — Source, Sales, Segment, Stage**

- The **total forecast number does not change** when you switch tabs.
- Tabs **split the same weighted total** across dimensions; bars are relative to the **largest row in that tab**.
- **+N more** → opens the drawer with **all** contributing open deals (sorted by weighted contribution).

**Exercise (5 min) — Sales**

1. With one FY selected, read the **forecast** number and **N deals**.
2. Switch **Stage** tab — explain why large pipeline in *Lead* does not move the needle as much as the same rupees in *Proposal*.
3. Click **+N more** (if visible) and skim the drawer list.

---

# Module 5 — The Board (Sales, Management, Admin)

**Location:** Full-width **below** the KPI / Hit List / **Revenue forecast** band and **above** the **Deal flow funnel**.

**What it is**

- **Sales leaderboard** by **assigned salesperson** for **won-path** stages (Confirmed through Subsidy Credited).
- **Month**, **Quarter** (Indian FY definition), or **FY** — chosen **on the card** (independent labels from the command bar; rankings use **stage entered / confirmation** dates so periods can differ meaningfully).
- **Collapsed by default on phones**, **open on desktop** — tap the header to expand.

**Transparency exercise (3 min)**

1. Expand **The Board** and switch **Month** → **Quarter** → **FY**; discuss why totals can change.
2. **Click** the **header total** or a **row’s rupees / deal count** → same **Quick Actions** **list** pattern as **Explore** charts → pick **Open →** on one project.

---

# Module 6 — Your Focus (collapsible panels)

**Location:** **Below** the **Deal flow funnel** in **Pipeline and priorities**.

**Interaction (all roles that see Your Focus)**

- Sections start **collapsed** — **click the panel title** to expand **Company pipeline** / **Payment radar** / **Installation pulse** / **Proposal Engine** (mix depends on role).
- Subtitle under **Your focus**: expand each section to work inside it.

**What Sales sees when expanded**

- **Your pipeline today** — table of **your** open deals: customer, stage, deal value, **last activity**, **Deal Health**.
- **Colour cues** for recency; **Follow-up needed** count for the oldest activity band.
- **Log activity** on a row opens a short flow to attach a **remark** to the project (same family of action as elsewhere in CRM).
- **Proposal Engine** panel — PE readiness buckets (when shown).

**Management / Admin** — Expand **Company pipeline**, **Payment radar**, **Installation pulse**, then **Proposal Engine** in order.

**Table skills** (inside an expanded panel)

- **Sort** by column headers (e.g. deal value, health).
- **Filter** controls near the title (where present) refine **already-loaded** rows — no extra date filter change.

**Pair with Hit List:** Hit List = **urgent**; Your Focus table = **fuller pipeline** for the same filters.

**Optional:** Mention **Victory** toast when someone advances a deal to **Confirmed** or later from **Quick Actions** or **Project** save — reinforces celebration and transparency.

---

# Module 7 — Deal flow funnel

- Visual **stage mix** from leads through execution (exact tiles depend by role).
- **Placement:** **Below The Board**, **above** collapsible **Your Focus**.
- **Sales:** use it to see **where deals pile up** for **you** under the current filters.
- Click-through behaviour: align with your **Explore** charts session — many paths lead to the same **Quick Actions** drawer pattern.

---

# Module 8 — Explore the landscape (charts and drill-down)

**Section title:** **Explore the landscape**. Many panels show **Click to explore →**.

**Typical charts (executive / Sales layout)**

- Revenue / pipeline by **lead source**
- **Segment** donuts (revenue vs pipeline — different definitions)
- **Revenue & profit by financial year** (orange revenue line / points, teal profit bars)
- **Projects by stage**
- **Loans by bank**
- **Customer projects profitability** (word cloud and Top 10 list)
- **Proposal Engine** for executive roles lives under **collapsible Your Focus**, not in this chart grid.

**Drill-down behaviour**

- Click a **bar**, **slice**, **stage**, **FY point**, or **bank** (where implemented) → **Quick Actions** drawer opens in **list mode**:
  - Header shows **filter label** and **how many projects**.
  - **Total** matches the **chart metric** (important: FY **profit** drill-down uses **gross profit** in the list and total — not order value).

**FY chart special case (train this explicitly)**

- **Orange (revenue)** → drawer list uses **order value**; total should match the revenue point.
- **Teal (profit)** → drawer list uses **gross profit**; total matches the profit bar.
- Small or **zero** profit bars: the chart still supports opening the **profit** drill-down via the chart hit targets.

**Exercise (5 min) — Sales**

1. From **Projects by stage**, click **your** stage → drawer list.
2. Click **Open →** on one row → **single-project** drawer (same flow as **Module 9 — Quick Actions** below).
3. Use **Back** to return to the list without losing the chart context.

**The Board** — Same list pattern: from **The Board**, click **header totals** or a **row’s value** → drawer → **Open →** on a project.

---

# Module 9 — Quick Actions drawer (list and single project)

## List mode

- Yellow **Viewing: …** strip (when shown) reminds you of the active filter.
- **Sort** options may include **Order value / Gross profit**, **Health**, **Last activity** (depending on context).
- **Totals** align with the **metric of the chart** you came from.

## Single project mode

- From a list row, open a project → **Advance stage** (when next stage exists and role allows), **Log activity**, **Deal value**, **Expected close date**.
- **Open full project →** goes to **Project detail**; **Close** or backdrop click exits.

## Permissions (must demo for mixed audiences)

| User | Drawer edits |
| :-- | :-- |
| **Sales** (owner) | Can use quick edits when CRM allows (not **Lost**). |
| **Sales** (not owner) | **View-only** in the drawer — sees values, no stage / value / date / log actions. |
| **Management** | **View-only** — full read, no quick edits (aligned with **no project edit** in CRM). |
| **Admin / Operations / Finance** | Follow **Project detail** edit rules (same composite check as the main app). |

**View-only banner:** The drawer shows a short **view-only** message when quick edits are disabled.

---

# Module 10 — Zenith for other roles (summary)

## Operations

- KPIs emphasise **installation**, **completed**, **subsidy**, **confirmed revenue** (definitions respect filters).
- **Your Focus — Installation pulse:** **Expand the panel** first (sections start collapsed). Table: under-installation projects with **kW**, **Sales person**, **Start** / **Expected**, a **Progress** bar (%, with overdue / not-started labels when relevant), **Last note** (medium+ screens), and **+ Log update** (opens Quick Actions with the note field ready). **Overdue only** narrows the list; column headers sort the loaded rows. On phones, **scroll the table sideways**; **Last note** is hidden on very narrow widths — use project detail or **Log update** for remarks.
- Charts: stage views, FY revenue/profit, segments, sales-team style views as shown.

## Finance

- KPIs: **Total revenue**, **Amount received**, **Outstanding**, **Total profit**, **Availing loan** count (filter-scoped).
- **Your Focus — Payment radar:** **Expand the panel** first. Three KPI tiles (**Total outstanding**, **Avg collection days**, **Subsidy pending**); **Payment ageing** buckets (0–30 … 90+ days) you can **click** to filter **Top overdue**; table sort by customer, amount, days; **Filter customer…** and **Reset filters**. **Remind** on a row opens **WhatsApp / Email** helpers with prefilled text. Beside the table (wide layout): **Collected vs outstanding** donut, **Collections — last 6 months** bars, and a **vs last month** collections trend line.
- Charts: FY, segments, profitability, lead-source revenue, loans by bank as applicable.

## Management and Admin

- **Company-wide** executive KPIs, **The Board**, then **all** Your Focus blocks (**expand** each: Sales pipeline + Finance radar + Operations installation + Proposal Engine) in one scroll.
- **Hit List** and **Explore** charts behave like executive Sales/Management analytics.
- **Management:** treat Zenith as **read-only analytics** for quick project actions; use **full project** for any process that requires edit (Management typically **cannot** edit projects in CRM).

## Admin

- Same Zenith experience as Management for analytics; Admin retains **full CRM** powers elsewhere — in the drawer, quick edits follow **Project detail** `canEdit` logic.

---

# Hands-on lab checklist (Sales — 15–20 min)

Use a **training FY** or sandbox data if available.

| # | Task | Pass criteria |
| :-- | :-- | :-- |
| 1 | Open Zenith, set **one FY + one quarter** | Quarter/month chips behave as expected |
| 2 | Click one **AI Insight** | Page scrolls to a sensible section |
| 3 | Read **Revenue forecast** and switch two tabs | Total unchanged; bars change |
| 4 | Expand **Your pipeline today**, sort by **Deal Health** | Order updates |
| 5 | Expand **The Board**, click a **row value** → drawer list | List opens; **Open →** works |
| 6 | Drill from **Projects by stage** | Drawer list count looks plausible |
| 7 | Open one project from list, **log activity** (if your project) | Success; remark visible on project (optional **Victory** toast if stage advanced) |
| 8 | **Reset** filters | KPIs reflect broader scope |
| 9 | Optional: `Ctrl+Shift+Z` from Dashboard | Zenith opens |

**Facilitator:** For **Management** trainees, repeat steps 1–6 only; confirm step 7 **cannot** edit in drawer (view-only).

---

# Frequently asked questions

**Q: Zenith vs Dashboard — which is “correct”?**  
A: Both use the same filter rules and CRM data; Zenith is a **different layout** for exploration and drill-down. If numbers differ, check **filters** and **scope** (Sales = yours only on executive Zenith).

**Q: Why does my forecast drop when I move a deal from Proposal back to Lead?**  
A: **Weights by stage** — earlier stages carry lower probability in the weighted total.

**Q: Can I edit payments from Zenith?**  
A: Not from this drawer — use **Project detail** and the **Finance** sections as usual.

**Q: Management clicked a chart but cannot change the deal in the drawer — bug?**  
A: No — **intentional view-only** for roles without project edit rights.

**Q: Data looks stale**  
A: Refresh the page; ensure you are online. Zenith loads from the **server** after login.

---

# Glossary

| Term | Meaning |
| :-- | :-- |
| **FY** | Financial year April–March (label e.g. `2024-25`). |
| **Weighted forecast** | Sum of (deal value × stage win probability) over open deals. |
| **Deal Health** | 0–100 score from activity, momentum, value, close date, lead source. |
| **Drill-down** | From chart or **The Board** → drawer **list** of projects behind that slice. |
| **Quick Actions** | Right-hand drawer for list + quick project updates. |

---

# Appendix — Keyboard shortcuts (Zenith-relevant)

| Shortcut | Action |
| :-- | :-- |
| `?` | Help (from Zenith → Analytics / Zenith section) |
| `Ctrl+Shift+Z` / `⌘⇧Z` | Open **Zenith** |
| `Ctrl+Shift+D` / `⌘⇧D` | **Dashboard** |
| `Ctrl+Shift+P` / `⌘⇧P` | **Projects** |
| `Esc` | From Help, returns to **Dashboard** (CRM behaviour) |

Full table: **Help → Getting Started → Keyboard shortcuts**.

---

## Document control

- **Product:** Rayenna CRM — Zenith Command Center  
- **Audience:** End-user training (Sales-primary, all roles)  
- **Companion doc:** Help → **Analytics** → **Zenith Command Center**

---

*End of training guide*
