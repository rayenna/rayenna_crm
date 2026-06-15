# Board and funnel

**The Board** leaderboard and **Deal flow funnel** — click through to **Quick Actions** lists.


## The Board (leaderboard)

**Who sees it** — **Sales**, **Management**, and **Admin** on the **executive** Zenith layout.

**Where** — Full-width card **below** the KPI / Hit List / forecast row and **above** the **Deal flow funnel**.

**What it shows** — Rankings by **assigned salesperson** for **won-path** projects (Confirmed, Under Installation, Completed, Subsidy Credited) counted in a **calendar period** you choose on the board itself:

- **Month** — current calendar month  
- **Quarter** — Indian FY quarters (**Q1** Apr–Jun, **Q2** Jul–Sep, **Q3** Oct–Dec, **Q4** Jan–Mar)  
- **FY** — Indian financial year (Apr–Mar)

Deal credit uses **stage entered** and **confirmation** dates from CRM when present (not “any save” on the project), so **Month**, **Quarter**, and **FY** can show different totals.

**Collapsible** — Like other Zenith panels, the board can be collapsed from the header (**collapsed by default on small phones**, **expanded by default on wider screens**). The header still shows the period label and summary totals when collapsed.

**Transparency — open the deals** — **Click** the **period total** (revenue and deal count in the header on desktop, or **View N deals** on mobile) or **click a row’s revenue / deal count** to open the same **Quick Actions** drawer **list mode** used for **Explore** chart drill-downs. The list is filtered to the deals that make up that total or that salesperson’s slice for the selected **Month / Quarter / FY** (not the command-bar FY alone). From the list, use **Open →** to jump to **Project detail** or drill into **Quick Actions** for a single project. Use **Open in Projects →** in the drawer footer when you want the full **Projects** page with the same slice and filters.

## Deal flow funnel (Zenith)

**Where** — **Below** [The Board](#the-board-leaderboard) (when your role has it) and **above** [Your Focus](#your-focus-role-specific) in **Pipeline and priorities**. **Operations** and **Finance** Zenith layouts also include a funnel tailored to their metrics; the same **click → list** idea applies.

**What you can click**

- **Stage rows** (e.g. Lead, Site Survey, Proposal, Confirmed, execution stages — labels depend on role) — Opens **Quick Actions** in **list mode** with projects in that **stage mix** for your **command-bar** FY / Quarter / Month scope. The **count and value** on the row are built with the **same rules** as the list.
- **Payment status pills** (e.g. Pending, Partial, Fully Paid — where shown) — Opens the drawer for projects in that **payment bucket**, again aligned with the funnel tile.

**Open in Projects →** — The drawer footer links to **Projects** with query parameters that match that slice (stage, payment status, and your Zenith date filters) so the main list should **match the drawer cohort** from the server’s perspective.

**Not a separate page** — The funnel stays on Zenith; it does not navigate away until you choose **Open in Projects →**, **Open →** on a row, or another explicit link.

## Victory toast (stage wins)

When a project **enters** **Confirmed**, **Under Installation**, **Completed**, or **Completed — Subsidy Credited** (for example from **Quick Actions** on Zenith or when saving **Project** edit), a short **Victory** celebration toast may appear: customer, order value (with a quick count-up), who it’s assigned to, and a **Dismiss** control. It **auto-dismisses** after a few seconds.

**Layout** — Bottom-right on desktop; on narrow screens it spans the width with side insets so it does not cover the command bar.

**Who sees it** — Any logged-in user who completes an eligible stage change while using the app (toast is tied to the action, not only Zenith).

## Operations (Zenith)

**KPI strip** — Focus on execution: e.g. **Pending Installation**, **Completed Installation**, **Subsidy Credited**, and **Confirmed Revenue** (order value for confirmed / in-progress / completed revenue-eligible projects, respecting your date filters).

**Your Focus** — **Installation pulse** for **Operations** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Execution-oriented funnel (installation, subsidy, etc.). **Click** a **stage row** or **payment pill** to open the **Quick Actions** list for that slice; use **Open in Projects →** for the full filtered **Projects** page ([Deal flow funnel](#deal-flow-funnel-zenith)).

**Charts** — **Revenue & Profit by FY** (axis respects selected FYs; [details](#revenue-and-profit-by-fy-chart-zenith)), **Projects by stage**, **Revenue by Customer Type** (where shown), and **sales team** style charts where shown.

Use **Reset** when you want a fresh, unscoped overview before drilling into a single FY or quarter.

## Finance (Zenith)

**KPI strip** — **Total Revenue** (confirmed-order value), **Amount Received**, **Outstanding**, **Total Profit** (gross profit on revenue-eligible projects in scope), and **Availing Loan** count. **Click Availing Loan** to open the **Quick Actions** list for that cohort (then **Open in Projects →** if you need the full **Projects** page), same idea as chart drill-down and the funnel — see [KPI strip](#kpi-strip-and-year-on-year).

**Your Focus** — **Payment radar** for **Finance** (see [Your Focus](#your-focus-role-specific)).

**Funnel** — Built from project statuses relevant to finance oversight. **Stage** and **payment** rows are **clickable** → **Quick Actions** list + **Open in Projects →**, same pattern as the executive funnel ([Deal flow funnel](#deal-flow-funnel-zenith)).

**Charts** — **Revenue & Profit by FY** ([filtered years](#revenue-and-profit-by-fy-chart-zenith)), **Revenue by Customer Type** donut, **customer profitability**, **lead source** revenue, and **loan by bank** where applicable.
