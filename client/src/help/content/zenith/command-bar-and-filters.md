# Command bar and filters

Open Zenith, set **FY / Quarter / Month**, use **Live/Offline** and the **daily briefing**. Filter rules match the [classic Dashboard](/help/dashboard#dashboard-filters).


## Opening Zenith

1. Open the **Dashboard** menu in the top navigation (next to **Dashboard**).
2. Choose **Zenith ✦**.

Zenith is available to **Sales**, **Operations**, **Finance**, **Management**, and **Admin**. If your role does not include it, ask your administrator.

## Filters and reset

The **command bar** and **offline / sync status** strip stay pinned at the top as you scroll (together in one sticky block). **Financial Year**, **Quarter**, and **Month** apply to **KPIs**, the funnel, **Revenue forecast**, **Explore the landscape** charts, and the project batches used for drill-downs. Data is **server-backed** from the **CRM for your session** after login; when you use Zenith as an installed **PWA**, the app can also show the **last successful load** while offline (see [Working offline](#working-offline-zenith-pwa)).

**Live / Offline** — Next to **✦ Briefing**, the command bar shows **Live · …** when the API is reachable, or **Offline** when the browser or network cannot reach the server. This is more reliable on mobile than the browser’s online indicator alone.

- **Financial Year (FY)** — Select one or more years (April–March labels). FY options come from the same source as the main dashboard.
- **Quarter** — Available when **exactly one** FY is selected. Quarters follow the CRM definition: **Q1** Apr–Jun, **Q2** Jul–Sep, **Q3** Oct–Dec, **Q4** Jan–Mar.
- **Month** — Available when **exactly one** FY is selected. If you pick quarters first, month choices narrow to months inside those quarters.
- **Reset** — Clears all FY, quarter, and month selections. With filters empty, Zenith can show **unfiltered** summary data (same idea as clearing filters on the classic dashboard).

**Tip:** Filter rules match the [Dashboard filters](/help/dashboard#dashboard-filters) section on the **Dashboard** help page so numbers stay comparable between **Dashboard** and **Zenith**.

**Phones and narrow screens (below the `lg` breakpoint, ~1024px)** — The command bar uses a **compact two-row layout**: **Zenith** title and **✦ Briefing** / **Live** on the first row; **FY**, **Qtr**, **Mo** **dropdowns** and **Reset** on the second (touch-friendly **44px** targets). Desktop keeps the **pill-style** multi-select filters. See [Mobile navigation](#mobile-navigation-and-layout-zenith) for the bottom tab bar.

## Daily briefing (Zenith)

Shortly after you open **Zenith**, a **Smart daily briefing** dialog may appear (use **✦ Briefing** in the command bar to open it again where shown). Close it any time, or tick **Don’t show again today** — that preference is stored **in this browser** for the current day only (it does not sync across devices).

The briefing may include a **Your My Day** block (above CRM pipeline lines) with a short summary of open tasks and a link to open the ☀ drawer — same cross-device **My Day** data as the nav icon and classic **Dashboard → Today’s plan** card.

For **Sales**, **Admin**, and **Operations** — not **Management** or **Finance** — if any projects in **Under Installation**, **Completed**, or **Completed – Subsidy Credited** are missing **panel and/or inverter brand**, the briefing can add a **top reminder line** with a **count** and **customer names**, using the same server-backed **Zenith explorer** slice as your command-bar **FY / Quarter / Month**. This mirrors the [Things needing attention](/help/dashboard#things-needing-attention-dashboard) idea on the classic Dashboard (Management users do not see the dashboard strip; they also do not see this lifecycle line in the briefing).
