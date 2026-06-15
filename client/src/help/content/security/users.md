# Users

**Administrators only.** Create accounts, assign roles, send password reset links, and remove access.

## Who can access

- **Admin** role only — **Users** in the top menu.
- Other roles do not see the menu item; direct navigation shows **Access denied**.

## Open the page

1. Top menu → **Users**.
2. The page shows a **Users** heading, **New User**, and a table (**Name**, **Email**, **Role**, **Actions**).

If no users exist yet, the empty state invites you to tap **New User** to add the first account.

## Create a new user

1. Click **New User**. The **Create new user** form opens.
2. Required fields:
   - **Email** — login address (valid email format).
   - **Name** — display name.
   - **Password** — minimum **6 characters** (user can change later via [Change password](#change-password) or a reset link).
   - **Role** — **Sales**, **Operations**, **Finance**, **Management**, or **Admin**.
3. Click **Create user**. The list refreshes; the user can log in immediately.
4. Click **Cancel** to close without saving.

Assign the **least privilege** role that fits the job. Use **Admin** only for system administrators. What each role can do: [Roles → Permission matrix](/help/roles#permission-matrix) and [per-role guides](/help/roles).

## Users list

| Column | Meaning |
| :-- | :-- |
| **Name** | Display name |
| **Email** | Login email |
| **Role** | Current role |
| **Actions** | **Reset password** · **Delete** |

On mobile, users appear as cards with the same actions.

## Reset password

When a user forgot their password or you want them to set a new one:

1. Click **Reset password** on their row.
2. A modal shows a **one-time link** for that user (name and email shown).
3. **Copy Link** — share through a **secure channel** (direct message or email to the user only).
4. The token expires in **24 hours** — generate a new link if needed.
5. **Close** dismisses the modal.

The user opens the link to set a new password. Do not post reset links in shared channels.

## Delete a user

When someone should no longer have access (e.g. left the company):

1. Click **Delete** on their row.
2. Confirm the **WARNING** — deletion cannot be undone.
3. Click **YES** to remove the account, or **Cancel** to abort.

Deleting a user **removes login access only** — historical projects, customers, and **audit log** entries remain.

## Admin best practices

- Create accounts only when access is required.
- Prefer **Reset password** over emailing a temporary password in plain text.
- Review the user list periodically; delete departed staff promptly.
- Give each administrator their **own** Admin account — do not share credentials.
- Document role assignments and removals for audit (exports: [Audit and Security](#audit-and-security)).

## Permissions

| Role | Access |
| :-- | :-- |
| **Admin** | Create users, reset passwords, delete users |
| **All other roles** | No access |
