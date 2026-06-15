# Quick Actions drawer

Zenith's primary drill-down: filtered **lists** and **single-project** actions before **Open in Projects →**.


## Quick Actions drawer (Zenith)

**List mode** — Header shows **how many projects** match and a **Total** that matches the **metric of the chart** you came from (for FY **profit**, totals use **gross profit**; otherwise **order value**). **The Board** lists use **order value** for the footer total. **Availing Loan** (KPI tile on **Finance** and **executive** Zenith) opens the same list mode with **order value** totals. Sort with **Order value / Gross profit**, **Health Score**, or **Last Activity** where offered. Each row includes a **Sales** line under the customer name (assigned salesperson or **Unassigned**).

**Open in Projects →** (footer, when shown) — Opens **Projects** in a new navigation context with filters that **match the current list** (same rules the server applies for that slice). Prefer this when you need the complete paginated list, bulk actions, or every column.

**Single project** — The drawer **title row** shows the **customer / project name** and, on the same band, **Sales** plus the **assigned salesperson** (or **Unassigned**) in compact type — same data as **Project detail**, without extra vertical space. From a list row, **Open →** loads quick actions for that project (stage advance where allowed, log activity, payments/dates by role, etc.) without losing your place — use **Back** to return to the list. Advancing a project into a **confirmed / install / completed** winning stage can trigger the [Victory toast](#victory-toast-stage-wins). **Operations** and **Finance** quick drawers use the same **Sales** label next to the project name in the header.

**Recent remarks (context before you log activity)** — In **single-project** view, Zenith shows a **Recent remarks** panel (gold left accent) above **Log activity** where that section exists: **newest first**, author name and role, timestamp, **(edited)** when applicable, and the same remark text stored under **Project detail → Remarks**. It uses the **same read API** as the project page; permissions are unchanged (if you can open the drawer for the project, you see the same remark history the API allows). The panel shows a **limited number** of recent entries; use **Open full project** for the full remarks list and to edit or delete remarks on the project page. This appears in the **Sales / executive Quick Actions** drawer, **Operations** quick drawer, and **Finance** quick drawer (including read-only finance views — remarks are read-only context there).

**Payment snapshot (single project)** — In **Quick Actions** (Sales / Management / Admin) and the **Operations** quick drawer, **after Deal value** you’ll see a **Payment** card: **Payment status** (e.g. **Pending**, **Partial**, **Fully paid**), **Total amount received**, and **Balance pending**, aligned with **Project detail → Payment tracking**. When the CRM treats payment as not applicable — **no positive order value** or the project is in an **early / Lost** stage — the card shows **N/A** for status and for the two amount lines. **Who can change payments** is unchanged (still **Project detail** / Finance workflows). **Payment radar** on **Finance** Zenith opens the **Finance quick drawer**, which **already** includes its own payment summary for that path, so this card is the extra context on **pipeline / chart / Hit List** drawers.

**Closing** — **Close** or click the backdrop; the yellow **Viewing: …** strip (when shown) reflects the active list filter.

**Mobile** — Quick Action, **Finance**, and **Operations** drawers **slide in from the right** at **full width** on phones (reliable on mobile browsers and installed PWA). Use the large **close** control (top-right) or the backdrop.

**Offline changes** — When you are offline, allowed updates in these drawers (for example **Log activity**, stage changes, payment fields where your role can edit) are **queued on this device** and replay when the server is reachable again. You’ll see a short **queued** confirmation in the drawer. See [Working offline](#working-offline-zenith-pwa).

---
