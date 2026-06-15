# User Roles & Permissions

Rayenna CRM uses **role-based access control (RBAC)**. Your role decides which menu items you see, which projects and customers you can change, and which dashboard or Zenith layout you get.

Use this section to confirm **what you can do**, pick a **role-specific guide**, or open the full **[Permission matrix](#permission-matrix)**.

> **Tip:** Press **?** on any screen (when you are not typing in a field) to open context-sensitive Help for that page.

## The five roles

| Role | Best for | Guide |
| :-- | :-- | :-- |
| **Sales** | Leads, proposals, own pipeline, customer relationships | [Sales role guide](#sales-role-guide) |
| **Operations** | Installation, lifecycle dates, execution after confirmation | [Operations role guide](#operations-role-guide) |
| **Finance** | Payments, outstanding balances, Tally export | [Finance role guide](#finance-role-guide) |
| **Management** | Company-wide view, analytics, customer oversight (limited edits) | [Management role guide](#management-role-guide) |
| **Administrator** | Users, security, full data access, exports | [Administrator role guide](#administrator-role-guide) |

## Permission matrix (quick view)

Legend: **✓** full · **◐** partial / scoped · **👁** view only · **—** no access

| Area | ADMIN | SALES | OPS | FINANCE | MGMT |
| :-- | :--: | :--: | :--: | :--: | :--: |
| Dashboard (your layout) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Zenith ✦ | ✓ | ✓ | ✓ | ✓ | ✓ |
| My Day | ✓ | ✓ | ✓ | ✓ | ✓ |
| Customers | ✓ | ◐ | 👁 | 👁 | ◐ |
| Projects | ✓ | ◐ own | ◐ gated | ◐ pay | 👁 |
| Support tickets | ✓ | ✓ | ✓ | — | ✓ |
| Tally export | ✓ | — | — | ✓ | — |
| Users / Audit & Security | ✓ | — | — | — | — |

**Partial access in plain language:**

- **Sales — projects:** list and edit only projects where you are the **assigned salesperson**; create new projects.
- **Operations — projects:** see and edit **Confirmed → Subsidy Credited** (not Lead, Survey, Proposal, or Lost); includes **lifecycle** and **Sales & Commercial** fields on those projects.
- **Finance — projects:** view all; **edit payment amounts and dates only**.
- **Management — customers:** create and edit any customer; **reassign salesperson**; projects remain view-only.

→ **[Full permission matrix](#permission-matrix)** (menu, actions, project status visibility, footnotes)

## Choose your role guide

| If you are… | Start here |
| :-- | :-- |
| New to CRM | [Getting Started](/help/getting-started) then your role guide below |
| **Sales** | [Sales role guide](#sales-role-guide) · [Modules → Projects](/help/modules#projects-module) |
| **Operations** | [Operations role guide](#operations-role-guide) · lifecycle in [Modules](/help/modules#projects-module) |
| **Finance** | [Finance role guide](#finance-role-guide) · [Dashboard](/help/dashboard) · Tally in [Modules](/help/modules#tally-export-module) |
| **Management** | [Management role guide](#management-role-guide) · [Zenith](/help/zenith#zenith-command-center) |
| **Admin** | [Administrator role guide](#administrator-role-guide) · [Security](/help/security) |

## Changing roles or access

Only **Administrators** can create users, assign roles, reset passwords, and deactivate accounts (**Users** in the top menu).

To request a different role, contact your administrator with your current role, what you need, and manager approval if required.

> **Note:** Access is enforced in the app and API. If a menu item is missing, your role does not include it — do not rely on direct URLs for restricted pages.

## Related help

- [Getting Started](/help/getting-started) — login, navigation, common actions
- [Modules](/help/modules) — Customers, Projects, Support Tickets, Tally Export
- [Dashboard](/help/dashboard) and [Zenith](/help/zenith#zenith-command-center) — metrics and command center
- [Security](/help/security) — passwords, audit log, Users (admin)
- [Training guide](/help/training) — facilitator session outline
