# Audit and Security

**Administrators only.** Review login activity, audit events, and export logs for accountability and compliance.

## Who can access

- **Admin** role only — **Audit & Security** appears in the top menu.
- Other roles do not see the menu item; direct navigation shows **Access denied**.

## Open the page

1. Top menu → **Audit & Security**.
2. The page includes: **summary tiles**, **Security insights** charts, **Security events** / **Project field history** tabs, **Recent failed logins**, and the **Activity timeline**.

## Security summary tiles (last 7 days)

Four tiles at the top:

| Tile | Meaning |
| :-- | :-- |
| **Failed logins** | Failed login attempts in the last 7 days |
| **Successful logins** | Successful logins in the last 7 days |
| **Audit events** | Audit actions (user/customer/project/document/ticket/proposal changes, etc.) |
| **Access events** | Access-related events in the last 7 days |

## Security insights

Two charts under **Security insights**:

- **Login activity trend** — successful vs failed logins over time. **Range:** Last **7**, **30**, or **90** days.
- **Action distribution** — stacked bars by entity type (**User**, **Customer**, **Project**, **Document**, **Support ticket**, **Proposal**, **Other**). Uses the same range as the login trend. Action labels match the Activity timeline **Action type** filter.

## Records tabs

Below the charts, choose:

| Tab | Content |
| :-- | :-- |
| **Security events** | Recent failed logins and the security **Activity timeline** (logins, user changes, customers, documents, payments, tickets, proposals, PE events). |
| **Project field history** | Per-field project edits from the CRM audit log (field name, old/new values, actor). Filter by project id, date range, or search text. |

## Export audit logs

Export controls live in the **Activity timeline** header (same filters as the table below).

1. Set **Summary search**, **Action type**, **Entity type**, **User (actor)**, **From date**, and **To date** on the timeline.
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

**User agent** — Expand a row (desktop: **User agent** under IP; mobile: **Show user agent**) to see the browser/client string when recorded.

**Sort** — Use **Sort by** (Time, Email, IP) and **Order** (ascending / descending) to investigate patterns.

If there are no recent failures: *No failed logins in recent access logs.*

## Activity timeline

Paginated audit log table (**20 rows per page**). Each row includes:

- **Time**, **User / Role**, **E-mail id**, **Action**, **IP / Location** (location when available), **Entity**, **Summary**

**Filters** (above the table):

- **Summary search** — text search within the summary column (exports use the same filter).
- **Action type** — All, Login, Password reset initiated/completed, User created/role changed/deleted, Project created/status changed, Payment updated, Customer created/updated/deleted, Document uploaded/deleted, Support ticket created/closed, Proposal generated, PE costing template and payload-limit events.
- **Entity type** — All, User, Customer, Project, Document, Support ticket, Proposal, PE costing template.
- **User (actor)** — filter timeline and exports to actions performed by one account.
- **From date** / **To date** — optional range. Quick presets: **Today**, **7 days**, **30 days**, **90 days**. Use **Clear filters** to reset.

**Sort** — Click column headers (Time, User / role, Email, Action, IP / location, Entity, Summary) to sort; toggle ascending / descending. **Entity** links open the project, customer, or filter audit by user where available.

**Pagination** — **Previous** / **Next**; total count and current page are shown.

If nothing matches, widen the date range or clear filters.

## Project field history

On the **Project field history** tab, review CRM field-level changes (separate from the security timeline):

- **Project id** — optional filter to one project.
- **From date** / **To date** — optional range with the same presets as the timeline.
- **Search** — matches action, field name, old/new values, or remarks.

Each row shows time, project link (by serial number when available), actor, action, field, old/new values, and remarks.

## Admin best practices

- Review **Failed logins** tile and **Recent failed logins** regularly.
- Use **7 / 30 / 90 day** charts to spot trends before they become incidents.
- Set timeline filters **before** export so files contain only what you need.
- Prefer **Signed audit export** for management or compliance handoffs.
- Store exports per company retention policy; do not email unsigned exports to personal accounts.

## Permissions

| Role | Access |
| :-- | :-- |
| **Admin** | Full page: tiles, charts, failed logins, both record tabs, all export formats |
| **All other roles** | No access |
