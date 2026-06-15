# Administrator Role Guide

**Administrators** run the platform: users, security, full data access, and exports. Use this guide for day-one admin tasks and guardrails.

## At a glance

| You can | Typical guardrails |
| :-- | :-- |
| **Everything** other roles can do, without ownership limits | Prefer least privilege — most staff should not be Admin |
| **Users** — create, edit role, reset password, delete | Delete users only when offboarding is final |
| **Audit & Security** — review security log | Investigate anomalies; do not share logs externally |
| **Edit / delete any project**; **export** Excel/CSV | Exports require management approval per in-app notice |
| **All form sections** including payments and closed-ticket follow-ups | Document why when overriding normal workflow |

→ [Permission matrix](#permission-matrix) · [Security](/help/security)

## User management

### Create a user

1. **Users** → **New User**.  
2. Email (login), name, temporary password, **role** (Sales, Operations, Finance, Management, Admin).  
3. Save and share credentials securely — users must **change password** on first login.

### Maintain accounts

- **Reset password** — generate link or set temporary password.  
- **Change role** when job function changes (e.g. Sales → Management).  
- **Delete** only when the account must be removed entirely.

Only **Admin** sees **Users** in the menu. Direct URLs show access denied for others.

Details: [Security → Users](/help/security)

## Audit & Security

Review the **security audit log** for logins, exports, status changes, and sensitive actions.

Only **Admin** has this menu item. Use it for compliance questions and troubleshooting “who changed this?”

## Data stewardship

### Projects

- Open and **edit any** project regardless of salesperson or status.  
- **Delete** projects when policy allows (irreversible — confirm first).  
- **Export** Projects to Excel/CSV from the Projects page filters.

### Customers

- Full create/edit/delete.  
- Bulk **customer export** (Excel/CSV) from Customer Master.

### Support tickets

- Full ticket lifecycle.  
- **Only Admin** may add follow-ups on **closed** tickets.

### Tally export

Same access as **Finance** — you can run exports for troubleshooting; Finance should own routine accounting exports.

## Dashboards and Zenith

You may use any dashboard view; Zenith loads the **management-style** executive layout for Admin (same endpoint as Management). Use this for company-wide checks without impersonating another user.

## Role assignment guide

| Role | Assign when |
| :-- | :-- |
| **Sales** | Front-line revenue, own pipeline |
| **Operations** | Installations, lifecycle, field execution |
| **Finance** | Payments and Tally |
| **Management** | Executive visibility, customer reassignment, no project edits |
| **Admin** | IT / system owner — keep count small |

See [Permission matrix](#permission-matrix) before elevating someone to Admin.

## Security practices

- Enforce **strong passwords** and timely offboarding (disable/delete users).  
- Do not share Admin credentials.  
- Review [Security help](/help/security) — passwords, session, data privacy.  
- Production API secrets (maps, Cloudinary, etc.) live on the **hosting environment** — redeploy after env changes; do not commit secrets to git.

## Daily / weekly rhythm

1. Process **new user** requests and role changes.  
2. Spot-check **audit log** for unusual exports or deletes.  
3. Help users with **access denied** issues (wrong role vs wrong assignment).  
4. Coordinate with Finance on **export** policy.  
5. Point users to [Getting Started](/help/getting-started) and role guides for self-service.

## Shortcuts

Admins have the widest shortcut set — same as other roles where applicable, plus **Users** via menu:

| Keys | Action |
| :-- | :-- |
| **Ctrl+Shift+E** / **⌘⇧E** | New project |
| **Ctrl+Shift+N** / **⌘⇧N** | New customer |
| **Ctrl+Shift+Z** / **⌘⇧Z** | Zenith |
| **?** | Context help |

## Getting help

- [Security](/help/security) — authoritative admin policies  
- [Training guide](/help/training) — onboarding facilitators  
- Internal runbooks for deploy and Neon DB are outside Help — use your team’s ops docs for infrastructure
