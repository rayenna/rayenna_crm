# Zenith modules 1-5

# Module 1 — Navigation and first launch

**SLIDE: Opening Zenith**

**Key points:**

- **Dashboard** menu → **Zenith ✦**
- Same **FY / Quarter / Month** rules as classic Dashboard (not a different database).
- **`?`** opens Help on **Zenith** when you are in Zenith (and **Dashboard** help from the classic dashboard).

**Speaker notes:** Emphasise Zenith is an **analytics layer**, not a replacement for Projects or Customers. Flow: set filters → scan KPIs → Board → funnel → Your Focus → charts.

**Demonstration (2 min):** Open Zenith; point at command bar; press `?` once.

**Check question:** *If you select two financial years, what happens to Quarter and Month?* → **Disabled** (same as Dashboard).

---

# Module 1B — Lifecycle data hygiene (Dashboard + briefing)

**SLIDE: Things needing attention**

**Key points:**

- **Classic Dashboard** — **Sales**, **Operations**, and **Admin** see **Things Needing Attention** **beside Today's plan** on laptop when projects in **Under Installation**, **Completed**, or **Completed – Subsidy Credited** miss **panel and/or inverter brand**.
- **Rows:** **#SL** + customer, **missing** badge (panel / inverter / both), **+ My Day** (one open task per project — **✓ My Day** after pin), **Open →**.
- **Projects →** uses **Lifecycle specs incomplete** + late statuses + dashboard **FY / Quarter / Month** — list shows **gaps only**.
- **Management** does not see the dashboard card; **Finance** sees **Today's plan** only.
- **Zenith briefing** — The **Smart daily briefing** can surface the **same reminder** for **Sales**, **Admin**, and **Operations** (not **Management** or **Finance**). **Don’t show again today** is **browser-only** for that day.
- **Charts** — **Sales**, **Management**, and **Admin** see **Projects by panel brand** / **Projects by inverter brand** on the **classic Dashboard** and again under Zenith **Explore the landscape** (**Operations** see them on Dashboard + Zenith Ops). Tooltips include **System capacity (sum)** (kW) between order value and the cost estimate; bars only include projects that already have **both** brands filled. **Dashboard:** click a bar → **Projects**. **Zenith:** click a bar → **Quick Actions** → **Open in Projects →**.

**Demo (2 min):** Show **Today's plan** + **Things Needing Attention** side by side; pin **+ My Day** on one row (second click → **Already in My Day**); **Projects →** and confirm **Lifecycle specs incomplete** chip; optional briefing line in Zenith.

**Check question:** *Which dashboard role sees the Management-style KPI layout but not the classic “Things needing attention” lifecycle card?* → **Management** (**Admin** sees the card; **Management** does not). *Does **Finance** get the lifecycle line in the Zenith briefing?* → **No**.

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

# Module 2D — Mobile layout, bottom tabs & offline (PWA)

**SLIDE: Zenith on phone — tabs, not one long scroll**

**Key points:**

- **Bottom tab bar** (below **`lg` ~1024px**). Only **one section** is visible at a time; switching tabs scrolls to that block. Labels **vary by role**:

| Role | Tab labels (left → right) |
| :-- | :-- |
| **Sales**, **Management**, **Admin** | **Today** (or **KPIs** if no Hit List) · **Pipeline** · **Charts** · **More** |
| **Operations** | **KPIs** · **Ops** · **Charts** |
| **Finance** | **KPIs** · **Payments** · **Charts** · **More** |

- **Today / KPIs:** Hit List (where shown) + KPI strip + Revenue forecast + The Board (executive roles).
- **Pipeline / Ops / Payments:** Deal flow funnel + **Your Focus** (role panels).
- **Charts:** **Explore the landscape** (panel / inverter bars at bottom where shown).
- **More** (Sales/Mgmt/Admin/Finance): extra segments (e.g. customer type / profitability on Finance).

Full detail: [Zenith → Mobile, offline, and limits](/help/zenith#mobile-pwa-and-limits).
- **Floating actions:** **✦ Briefing** and **back to top** above the tab bar (mobile only).
- **Live / Offline** on the command bar — API health, not only `navigator.onLine`. Gold banner when showing **saved dashboard data**; red strip when offline; **Sync** when drawer actions are **queued**.
- **Quick Actions** on mobile: drawer **slides from the right**, full width. Supported edits queue until reconnect.
- **My Day** needs live network — not part of the offline queue. **Today’s plan** on the classic Dashboard shows CRM suggestions (scroll for all); **+ My Day** on **Hit List**, **Things needing attention**, and **Project detail** pins follow-ups that appear as tasks in the drawer. One open pin per project (**✓ My Day** after pin). Optional **`[My Day ✓]`** remark when completing project-pinned tasks.

**Speaker notes:** Install CRM as **Add to Home Screen** before a site visit. Open Zenith online once with usual FY filters. Demo one queued **Log activity** offline if your sandbox allows.

**Demo (3 min):** Narrow viewport → switch tabs → open chart drill-down → optional airplane mode + cached banner.

---

# Module 2C — Solar News ticker

**SLIDE: Solar News — industry context, not CRM data**

**Key points:**

- **Above** **AI Insights**, under the command bar: **horizontal marquee** of **RSS** headlines (solar / energy sources). Server-backed cache (~**30 minutes**); not the same as your pipeline numbers.
- **Click** a headline → **new tab** to the article. **Hover** (desktop) pauses the marquee.
- **Colour tags** (policy, grid, market, tech, agri) are for scanning only.

**Demo (1 min):** Pause on hover; open one headline; contrast with **AI Insights** (CRM data).

---

# Module 3 — AI Insights ticker

**SLIDE: AI Insights — not a chatbot**

**Key points:**

- Short highlights from **data already loaded** for your filters (**below** **Solar News**).
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
- **Desktop table columns** align with **Your pipeline today**: **Sl No.** / **Prj #** (project serial), **Customer**, **Stage**, **Sales person**, **Deal value**, **Last activity** (*N*d ago, green / amber / red pill), **Alert** (why it landed on the list — e.g. **Overdue**, **Closing soon**, **Stalled**, **Nudge needed**, **Going cold**), **Confirmation** (order **confirmation date** or **—**), **Deal Health** badge, **Open →**.
- **Overdue** / **Closing soon** use the project’s **expected commissioning** date when set; **stalled** / **nudge** / **going cold** rules use **stage + recency** (see **Zenith** help for detail).
- **Open →** opens the **Quick Actions** drawer for that project (not a raw jump past the drawer). Use **Open full project** inside the drawer when you need the full **Project detail** page.
- On **tablet / laptop** widths, when deals are listed, a **short hint** under the Hit List title may ask users to **scroll right** and use **Open →**; on **small phones** the hint is hidden (stacked cards already show **Open →** clearly).
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
