# Zenith modules 6-10

# Module 6 — Your Focus

**SLIDE: Your Focus — expand to work**

**Key points:**

- **Below** Deal flow funnel; panels **start collapsed**.
- **Sales:** Your pipeline today + **Proposal Engine** (when shown).
- **Management / Admin:** Company pipeline, Payment radar, Installation pulse, Proposal Engine.
- **Company / Your pipeline today:** leading **Sl No.** / **Prj #** matches **Projects** when one customer has several sites.
- **Payment radar (Finance + Management/Admin):** **Top overdue** + **Latest payments received** (wide layout); **click project name** → **Finance quick drawer** where wired; **Remind** for WhatsApp / Email helpers; **shared legend** under the grid for **payment status** colours on project names.
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
- **Customer Type donuts** (**Revenue by Customer Type** / **Pipeline by Customer Type**): slices = **Residential**, **Apartment**, **Commercial** from Customer Master — **not** project Subsidy/Non-Subsidy. Revenue vs pipeline = **different** cohort definitions.
- **Panel / inverter brand** horizontal bars: tooltip shows **Order value (sum)**, **System capacity (sum)** (kW), then estimated cost; each bar only includes projects with **both** lifecycle brands filled. **Sales** (and other roles with these charts) can use them on the **classic Dashboard** (**click** → **Projects**) and in **Zenith** (**click** → drawer).
- **Classic Dashboard:** Other clickable charts (stage, lead source, FY revenue vs profit, **customer type** pies, sales team bars, availing loan by bank, profitability cloud / Top 10) also jump to **Projects** with matching URL filters — train users who live on Dashboard to **hover for the hint**, then **click**.
- **Explorer batch:** up to **~5,000** recently updated projects in Zenith’s explorer; **Open in Projects →** uses full Projects API — rare mismatch at huge volume.

**Exercise (5 min):** Projects by stage → list → **Open →** one project → **Back**; optional **Open in Projects →**.

---

# Module 9 — Quick Actions drawer

**SLIDE: List mode & footer**

**Key points:**

- **Viewing:** strip; sort by value / profit / health / activity as offered.
- Each row: **Sales** line under the customer name (who owns the deal, or **Unassigned**).
- **Open in Projects →** — same logical filters as the list (peBucket, zenithSlice, zenithFyProfit, stage, payment, etc.).

**SLIDE: Single project & permissions**

**Key points:**

- Drawer **header:** customer / project name **+** compact **Sales** + salesperson (or **Unassigned**) — **Quick Actions**, **Operations**, and **Finance** drawers.
- **Open →** → quick edits; **Open full project** → detail.
- **Recent remarks** — Above **Log activity** (where shown): **newest-first** thread from **Project → Remarks** (read-only in the drawer). Same API as the project page; use **Open full project** for the full history and to edit/delete remarks. Shown in **Quick Actions** (sales/executive), **Operations**, and **Finance** drawers (finance read-only users still see remarks as **context**).
- **Payment** — On **Quick Actions** (Sales / Management / Admin) and **Operations** single-project view, **after Deal value**: **Payment status**, **Total amount received**, **Balance pending** (same idea as **Project detail → Payment tracking**). **N/A** for status and amounts when there is no positive order value or the project is in an **early / Lost** stage. **Payment radar → Finance** drawer already has its own payment summary — no duplicate block there.
- **Management** view-only; **Sales** non-owner view-only; **Admin** per `canEdit`.

---

# Module 10 — Other roles (summary)

**SLIDE: Operations**

- Installation pulse; **+ Log update**; horizontal scroll on phone; funnel drill-down.

**SLIDE: Finance**

- **KPI strip:** **Availing Loan** tile → **Quick Actions** list → **Open in Projects →** (same drill-down model as charts).
- **Payment radar:** ageing buckets filter **Top overdue**; **Latest payments received** beside it on desktop; **Sl No.** on both tables; **click project name** → **Finance quick drawer** (same path as other finance drill-downs when available); **Remind** for WhatsApp / Email helpers; **legend** under the tables for **payment status** name colours.

**SLIDE: Management & Admin**

- Full executive path; Management **read-only** in drawer; Admin full edit where allowed.

---
