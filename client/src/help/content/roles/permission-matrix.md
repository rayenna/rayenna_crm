# Permission Matrix

Authoritative quick reference for **menu access**, **actions**, and **project visibility**. Symbols match the live app (navigation, forms, and API).

## Legend

| Symbol | Meaning |
| :-- | :-- |
| **✓** | Full access for that role |
| **◐** | Partial or scoped (see footnotes) |
| **👁** | View / read only |
| **—** | Not available — menu hidden and API denied |

Roles: **ADMIN** · **SALES** · **OPS** (Operations) · **FINANCE** · **MGMT** (Management)

## Menu and modules

| Module / feature | ADMIN | SALES | OPS | FINANCE | MGMT |
| :-- | :--: | :--: | :--: | :--: | :--: |
| **Dashboard** (role-specific layout) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Zenith ✦** (role-specific layout) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **My Day** (tasks, journal, reminders) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Customers** | ✓ | ◐ | 👁 | 👁 | ◐ |
| **Projects** | ✓ | ◐ | ◐ | ◐ | 👁 |
| **Support tickets** | ✓ | ✓ | ✓ | — | ✓ |
| **Tally export** | ✓ | — | — | ✓ | — |
| **Users** | ✓ | — | — | — | — |
| **Audit & Security** | ✓ | — | — | — | — |
| **Help** | ✓ | ✓ | ✓ | ✓ | ✓ |

**Customers — partial (◐):**

- **Sales:** create customers; edit when you are the **assigned salesperson**; view all customers (optional “my customers” filter).
- **Management:** create and edit **any** customer; change **salesperson** assignment.

**Projects — partial (◐):**

- **Sales:** only projects where you are **assigned salesperson** (list, open, edit, create).
- **Operations:** only statuses **Confirmed, Installation, Completed, Completed — Subsidy Credited**; edit **lifecycle / execution** and **Sales & Commercial** on those projects.
- **Finance:** view all; edit **payment fields only** (amounts + dates).

## Action permissions

| Action | ADMIN | SALES | OPS | FINANCE | MGMT |
| :-- | :--: | :--: | :--: | :--: | :--: |
| Create project | ✓ | ✓ | — | — | — |
| Edit project — sales & commercial | ✓ | ◐ own | ◐ gated | — | — |
| Edit project — lifecycle / execution | ✓ | ◐ own | ◐ gated | — | — |
| Edit project — payments | ✓ | — | — | ✓ | — |
| Delete project | ✓ | — | — | — | — |
| Create customer | ✓ | ✓ | — | — | ✓ |
| Edit customer | ✓ | ◐ assigned | — | — | ✓ |
| Reassign customer salesperson | ✓ | — | — | — | ✓ |
| Create support ticket | ✓ | ✓ | ✓ | — | ✓ |
| Add follow-up on open / in-progress ticket | ✓ | ✓ | ✓ | — | ✓ |
| Close support ticket | ✓ | ✓ | ✓ | — | ✓ |
| Add follow-up on **closed** ticket | ✓ | — | — | — | — |
| Delete support ticket | ✓ | — | — | — | — |
| Projects export (Excel / CSV) | ✓ | — | — | — | — |
| Customers export (Excel / CSV) | ✓ | — | — | — | — |
| Tally export | ✓ | — | — | ✓ | — |
| Manage users | ✓ | — | — | — | — |
| View audit & security log | ✓ | — | — | — | — |
| Proposal Engine card / PE buckets (dashboard) | ✓ | ✓ | — | — | ✓ |

**Own** = assigned salesperson on that project or customer. **Gated** = Operations status rules above.

## Project visibility by status

Who can **see** a project in the list and open its detail page (edit rules are stricter for some roles).

| Project status | ADMIN | SALES | OPS | FINANCE | MGMT |
| :-- | :--: | :--: | :--: | :--: | :--: |
| Lead | ✓ | ◐ own | — | ✓ | ✓ |
| Site survey | ✓ | ◐ own | — | ✓ | ✓ |
| Proposal | ✓ | ◐ own | — | ✓ | ✓ |
| Confirmed | ✓ | ◐ own | ✓ | ✓ | ✓ |
| Installation | ✓ | ◐ own | ✓ | ✓ | ✓ |
| Completed | ✓ | ◐ own | ✓ | ✓ | ✓ |
| Completed — subsidy credited | ✓ | ◐ own | ✓ | ✓ | ✓ |
| Lost | ✓ | ◐ own | — | ✓ | ✓ |

**Sales “own”:** only rows where you are the assigned salesperson.

**Operations:** early-stage and **Lost** projects are excluded from the default list; opening a disallowed project returns access denied.

## Project form sections (edit mode)

When **Edit** is available, which sections are writable:

| Form section | ADMIN | SALES | OPS | FINANCE | MGMT |
| :-- | :--: | :--: | :--: | :--: | :--: |
| Sales & commercial (incl. lead source) | ✓ | ◐ own | ◐ gated | — | — |
| Financing (loan / bank) | ✓ | ◐ own | ◐ gated | — | — |
| Lifecycle / execution dates | ✓ | ◐ own | ◐ gated | — | — |
| Payment tracking | ✓ | — | — | ✓ | — |
| Lost reason (Lost status) | ✓ | ◐ | ◐ | — | — |
| Documents & remarks | ✓ | ◐ own | ◐ gated | — | — |

> **Note:** **Lost** projects are not editable except for allowed **lost** fields and Admin overrides. Finance payment edits apply only on non-Lost projects.

## Keyboard shortcuts (by role)

| Shortcut | Action | Roles |
| :-- | :-- | :-- |
| **Ctrl+Shift+C** / **⌘⇧C** | Customers | All except none — all five + Admin |
| **Ctrl+Shift+P** / **⌘⇧P** | Projects | Same as Customers |
| **Ctrl+Shift+K** / **⌘⇧K** | Support tickets | ADMIN, SALES, OPS, MGMT |
| **Ctrl+Shift+N** / **⌘⇧N** | New customer | ADMIN, SALES, MGMT |
| **Ctrl+Shift+E** / **⌘⇧E** | New project | ADMIN, SALES |
| **Ctrl+Shift+Z** / **⌘⇧Z** | Zenith | All roles with Dashboard menu |
| **Ctrl+Shift+M** / **⌘⇧M** | My Day | All roles |

Full list: [Getting Started → Shortcuts](/help/getting-started#keyboard-shortcuts).

## Requesting access changes

Administrators manage roles on **Users**. For temporary elevation (e.g. export for a report), ask Admin — do not share login credentials.

See also [Security → Users](/help/security) and [Administrator role guide](#administrator-role-guide).
