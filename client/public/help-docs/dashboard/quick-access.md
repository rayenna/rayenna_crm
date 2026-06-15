# Quick Access tiles

**Quick Access** mixes **metric tiles** (gradient cards with a single count) and **list cards** (**Payment Status**; **Proposal Engine** on Sales / Management / Admin).

**Placement:** Below the YoY band on **Sales** and **Management**; at the top of the main content on **Operations** (no YoY band). **Finance** shows top KPIs then Quick Access.

## How to use

1. Set **FY** (and optionally **Quarter** or **Month**) — [Dashboard filters](#dashboard-filters).
2. Click a **metric tile** or a **row** inside Payment / Proposal Engine.
3. Land on **Projects** with Dashboard dates **plus** the tile’s filter (status, payment, loan, or PE bucket).

Hover a metric tile for a **“View projects”** hint.

Tile **layout by role**: [Layout by role](#layout-by-role).

---

## Payment Status card

Indigo header strip, white card body (same shell as **Proposal Engine**). Each row is a **link**:

- **Label** — Pending, Partial, Fully Paid, N/A (colour-coded).
- **Count** and **outstanding amount (₹)** for that bucket.

Clicking opens **Projects** filtered by **payment status** and your Dashboard dates. Only statuses with data in the selected period appear.

**Who sees it:** Sales, Operations, Finance, Management (Admin uses Management layout).

---

## Proposal Engine card

On **Sales**, **Management**, and **Admin** dashboards. Groups CRM projects by **saved Proposal Engine activity** — **not** the same as CRM pipeline stage alone.

**Zenith:** The same four buckets appear under collapsible **Your Focus** — row click opens **Quick Actions**, then **Open in Projects →** ([Zenith](/help/zenith#zenith-command-center)).

### PE Ready

All four saved in PE: **Costing**, **BOM**, **ROI**, and **Proposal**.

### PE Draft

At least one PE part saved, but **not all four**.

### PE Not Yet Created

Linked in PE but **nothing** saved yet.

### Rest

Not opened in PE yet; CRM status **Proposal** or **Confirmed** — ready to start PE work.

Each row shows **project count** and **CRM order value (₹)**. **PE Ready**, **PE Draft**, and **PE Not Yet Created** may show **PE ex GST** when costing exists (**Rest** uses CRM order value only).

> **Tip:** Rows open **Projects** with the right PE filter. To edit costing/BOM/ROI/document, open **Proposal Engine** from the project.

**Who does not see it:** Operations, Finance.
