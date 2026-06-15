# Your Focus

Collapsible panels under **Pipeline and priorities** — expand only what you need.


## Your Focus (role-specific)

**Your Focus** sits in the **Pipeline and priorities** area **below** the **Deal flow funnel** (executive layout: after **The Board** leaderboard when your role has it). It surfaces actionable context **by role**.

**Collapsible panels (all roles that see Your Focus)** — Each block starts **collapsed** when you open Zenith so the page stays scannable. **Click the panel header** (title + chevron) to expand **only** the sections you need. A short subtitle under the **Your focus** heading reminds you: expand each section to work inside it.

| Role | What you see (each in its own collapsible panel when applicable) |
| :-- | :-- |
| **Sales** | **Your pipeline today** (full table) and **Proposal Engine** buckets. [Column list, actions, and PE drill-down →](#sales-pipeline-activity-and-proposal-engine) |
| **Finance** | **Payment radar** — see [Payment radar (Finance)](#payment-radar-finance) below. |
| **Operations** | **Installation pulse** — see [Installation pulse (Operations)](#installation-pulse-operations) below. |
| **Management / Admin** | **Company pipeline today**, **Payment radar**, and **Installation pulse** in sequence, then **Proposal Engine** — all collapsible under **Your focus** (company-wide where applicable). **Proposal Engine** rows behave like **Sales**: click a bucket → **Quick Actions** list + **Open in Projects →** with the same filters as **Projects** for that bucket. |

If there is nothing to show for the current filters, **Your Focus** may be hidden. Expanded panels use the same **left accent** colours as before (gold-leaning for pipeline, teal for payment radar, cool accent for installation).

## Sales: pipeline, activity, and Proposal Engine

For **Sales**, expand **Your pipeline today** and **Proposal Engine** under **Your focus** when you need detail beyond the KPI strip and **Today’s Hit List**.

**Your pipeline today**

- Compact table of **your** leads/deals (assigned to you).
- Columns include **Sl No.** / **Prj #** (project serial number, aligned with **Projects**), **customer**, **stage**, **sales person**, **deal value**, **last activity** (*N*d ago with **green / amber / red** pill by recency), and **Deal Health** (0–100).
- **Follow-up needed** highlights the oldest activity band.
- **Log activity** opens a short remark modal (saved on the project).
- **Open →** on a row opens **Quick Actions** for that project.

**Proposal Engine**

- Same **PE readiness buckets** as the classic dashboard: **PE Ready**, **PE Draft**, **PE Not Yet Created**, **Rest**.
- **In Zenith**, each PE row opens **Quick Actions** with the **same project set** the server used for that row’s counts; use **Open in Projects →** for the **Projects** list with the matching **PE bucket** and command-bar dates. (On the classic Dashboard Quick Access card, those rows still link straight to **Projects**.)

## Payment radar (Finance)

**KPI strip (three tiles)** — **Total outstanding**, **Avg collection days** (average days from **order confirmation** to **last payment** among **settled** projects in scope — balance zero and amount received &gt; 0; helps benchmark how long full collection typically takes), and **Subsidy pending** (count of projects in **Submitted for subsidy**).

**Payment ageing** — Four buckets (**0–30**, **31–60**, **61–90**, **90+** days overdue) show **project count**, **₹ outstanding** in that band, and a bar proportional to share of total outstanding. **Click a bucket** to filter the **Top overdue** table to rows whose days overdue fall in that band; click again (or **Reset ageing filter**) to clear. Colours escalate from neutral to amber, coral, and red for older debt.

**Top overdue** — A short hint under the **Top overdue** heading explains: **click the project name** (under the **Projects** column) to open the **Finance quick drawer** for that project on **Finance** Zenith and on **Management / Admin** Zenith (same payment context as other finance paths); if the drawer is not wired for your view, the name behaves as a normal link to **Project detail**. Use **Remind** to send a customer reminder. Leading **Sl No.** / **Prj #** is the **project serial number** (aligned with the **Projects** list). **Sales person** filter and **Filter customer…** narrow the table; **Reset filters** clears customer text, salesperson selection, and ageing. Sortable columns: **Projects** (customer / project name), **Sales person**, **Amt**, **Since**, **Days**. Row **Remind** opens a small **Reminder** panel with **WhatsApp** and **Email** options using prefilled copy from the project’s outstanding amount and customer contact fields (opens your device’s apps or `wa.me` / `mailto:` — nothing is sent from Rayenna’s servers).

**Latest payments received** — Beside **Top overdue** on wide layouts: up to **10** most recent **payment receipt** events for the current command-bar filters. Columns include **Sl No.** / **Prj #**, **Project** (sortable; **click** opens the **Finance quick drawer** where that path is available), **Sales person**, **Amt**, **Received** date, and **Type** (e.g. **Advance**, **Payment 1–3**, **Last**). **Filter project…** and **All salespeople** are **local** to this table (**Reset filters** clears only this table’s text and salesperson — **Top overdue** keeps its own customer / salesperson / ageing filters). Sorting is independent of **Top overdue**.

**Payment status legend** — A single legend **below** the two tables explains **project name colours** by **payment status** (**Pending**, **Partial**, **Fully paid**) for **both** **Top overdue** and **Latest payments received**.

**Right-hand column (wide layouts)** — **Collected vs outstanding** donut (teal / gold / violet for subsidy pending when present) and **Collections — last 6 months** stacked-style bars (collected vs outstanding per month). A short line under the chart compares **last month’s collected** to the **prior month** (up / down / steady).

## Installation pulse (Operations)

**Summary** — **Avg install days** and **Delayed** count (installations past expected completion that are not yet marked complete).

**Overdue only** — Toggles the table to rows flagged **overdue** (same rule as the red row tint and progress treatment).

**Table** — **Customer** (with link to Project detail), **kW**, **Sales person** (assigned salesperson), **Start** and **Expected** dates, **Last note** (latest project remark, two-line clamp on medium+ widths), **Progress** (visual bar and % from timeline logic), and **+ Log update** (opens the **Quick Actions** drawer on that project with the **note** area focused so you can log activity without leaving Zenith).

**Sorting** — Click **Customer**, **kW**, **Sales person**, **Start**, **Expected**, or **Progress** to sort; click again to reverse.

**Narrow screens** — The table is **wider than the phone** by design: **scroll horizontally** in the installation region to see all columns. The **Last note** column is **hidden on small viewports** to keep the layout usable; open the project or use **+ Log update** for full context.

**Footnote** — The block explains data sources: **Expected** prefers **expected commissioning** on the project, otherwise **installation completion**; **Start** uses installation start, then stage-entered or order-confirmation dates; **Progress** is driven by elapsed time to the target (or 100% when install-complete).
