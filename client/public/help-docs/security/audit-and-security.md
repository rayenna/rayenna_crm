# Audit and Security

**Administrators only.** Review login activity, audit events, and export logs for accountability and compliance.

## Who can access

- **Admin** role only — **Audit & Security** appears in the top menu.
- Other roles do not see the menu item; direct navigation shows **Access denied**.

## Open the page

1. Top menu → **Audit & Security**.
2. The page includes: **summary tiles**, **Security insights** charts, **Export audit logs**, **Recent failed logins**, and the **Activity timeline**.

## Security summary tiles (last 7 days)

Four tiles at the top:

| Tile | Meaning |
| :-- | :-- |
| **Failed logins** | Failed login attempts in the last 7 days |
| **Successful logins** | Successful logins in the last 7 days |
| **Audit events** | Audit actions (user/project/ticket/proposal changes, etc.) |
| **Access events** | Access-related events in the last 7 days |

## Security insights

Two charts under **Security insights**:

- **Login activity trend** — successful vs failed logins over time. **Range:** Last **7**, **30**, or **90** days.
- **Action distribution** — stacked bars by entity type (**User**, **Project**, **Support ticket**, **Proposal**, **Other**). Uses the same range as the login trend. Action labels match the Activity timeline **Action type** filter.

## Export audit logs

The **Export audit logs** card (above the timeline) uses the **same date range and filters** as **Activity timeline** below.

1. Set **Action type**, **Entity type**, **From date**, and **To date** on the timeline.
2. Choose a format:
   - **Export CSV** — spreadsheet analysis (e.g. `audit-logs-YYYY-MM-DD.csv`).
   - **Export PDF** — internal review.
   - **Signed audit export** — PDF with footer: generation date and **exporter email** (official / compliance use).

If filters are empty, exports include all matching logs (subject to system limits).

## Recent failed logins

Shows up to the **10 most recent** failed login attempts.

| Column | Content |
| :-- | :-- |
| **Time** | When the attempt occurred |
| **Email** | Login email used |
| **IP** | Source IP address |

**Sort** — Use **Sort by** (Time, Email, IP) and **Order** (ascending / descending) to investigate patterns.

If there are no recent failures: *No failed logins in recent access logs.*

## Activity timeline

Paginated audit log table (**20 rows per page**). Each row includes:

- **Time**, **User / Role**, **E-mail id**, **Action**, **IP / Location** (location when available), **Entity**, **Summary**

**Filters** (above the table):

- **Action type** — All, Login, Password reset initiated, Password reset completed, User created, User role changed, Project created, Project status changed, Support ticket created, Support ticket closed, Proposal generated.
- **Entity type** — All, User, Project, Support ticket, Proposal.
- **From date** / **To date** — optional range.

**Sort** — Click column headers (Time, User / role, E-mail, Action, IP / location, Entity, Summary) to sort; toggle ascending / descending.

**Pagination** — **Previous** / **Next**; total count and current page are shown.

If nothing matches, widen the date range or clear filters. Logged activity includes logins, user creation/role changes, project creation/status changes, support ticket create/close, and proposal generation.

## Admin best practices

- Review **Failed logins** tile and **Recent failed logins** regularly.
- Use **7 / 30 / 90 day** charts to spot trends before they become incidents.
- Set timeline filters **before** export so files contain only what you need.
- Prefer **Signed audit export** for management or compliance handoffs.
- Store exports per company retention policy; do not email unsigned exports to personal accounts.

## Permissions

| Role | Access |
| :-- | :-- |
| **Admin** | Full page: tiles, charts, failed logins, timeline, all export formats |
| **All other roles** | No access |
