# Security & Privacy

## Overview

Security and privacy are top priorities in the Rayenna CRM system.

## Authentication

### Login
- Email and password authentication
- Secure session management
- Automatic logout on inactivity

### Password Management
- Change password functionality
- Password strength requirements
- Secure password storage

## Authorization

### Role-Based Access Control
- Users can only access features based on their role
- Data filtering based on user permissions
- Action restrictions based on role

## Data Security

### Data Protection
- Encrypted data transmission (HTTPS)
- Secure database storage
- Regular backups

### Access Control
- User-specific data access
- Project-level permissions
- Document access control

## Privacy

### Data Privacy
- Customer data protection
- Confidential information handling
- Compliance with privacy regulations

### Best Practices
- Use strong passwords
- Log out when finished
- Don't share credentials
- Report security issues immediately

## Compliance

The system follows industry best practices for:
- Data security
- Privacy protection
- Access control
- Audit logging

---

# Audit and Security Module

## Purpose

The **Audit and Security** page gives Administrators visibility into login activity, audit events, and system usage. Use it for accountability, traceability, and security monitoring. You can view summary metrics, charts, recent failed logins, and a detailed activity timeline, and export audit logs in CSV, PDF, or signed PDF format for compliance and official use.

## Who Can Access

- **Administrators only.** Other roles do not see **Audit & Security** in the menu. If a non-admin opens the page directly, they see an “Access denied” message.

## Using Audit and Security

### Opening the Page

1. Navigate to **Audit & Security** from the top menu (under Admin or main navigation).
2. The page shows security summary tiles, Security insights charts, Export audit logs, Recent failed logins, and the Activity timeline.

### Security Summary Tiles (last 7 days)

At the top of the page, four tiles show:

- **Failed logins** – Number of failed login attempts in the last 7 days.
- **Successful logins** – Number of successful logins in the last 7 days.
- **Audit events** – Total audit events (e.g. user created, project created, status changed) in the last 7 days.
- **Access events** – Total access-related events in the last 7 days.

### Security Insights

Two charts appear under **Security insights**:

- **Login activity trend** – Line chart of successful logins vs failed logins over time. Use the **Range** dropdown to choose **Last 7 days**, **Last 30 days**, or **Last 90 days**.
- **Action distribution** – Stacked bar chart of audit actions by entity type (User, Project, Support ticket, Proposal, Other). Uses the same range as the login trend. Action types match the list in the Activity timeline filters.

### Export Audit Logs

Exports use the **date range and filters** set in the **Activity timeline** section below. Set the filters you want (action type, entity type, date from, date to), then choose a format:

- **Export CSV** – Downloads audit logs as a CSV file (e.g. `audit-logs-YYYY-MM-DD.csv`). Use for analysis in spreadsheets.
- **Export PDF** – Downloads audit logs as a PDF. Use for internal review.
- **Signed audit export** – Downloads a PDF that includes a footer with the generation date and the exporter’s email. Use for official or compliance purposes.

If no date range or filters are set, the export includes all matching logs (subject to system limits).

### Recent Failed Logins

A table lists the **most recent failed login attempts** (e.g. last 10). Columns include **Time**, **Email**, and **IP**. Use this to spot repeated failures or suspicious access attempts. If there are no recent failures, the section shows “No failed logins in recent access logs.”

### Activity Timeline

The **Activity timeline** is a paginated table of audit logs. Each row shows:

- **Time** – When the action occurred.
- **User / Role** – User identifier and role.
- **E-mail id** – User email.
- **Action** – Type of action (see list below).
- **IP / Location** – IP address and, when available, location.
- **Entity** – Entity type and short ID (e.g. Project, Support ticket) if applicable.
- **Summary** – Short description of the action.

**Filters** (above the table):

- **Action type** – All actions, Login, Password reset initiated, Password reset completed, User created, User role changed, Project created, Project status changed, Support ticket created, Support ticket closed, Proposal generated.
- **Entity type** – All entities, User, Project, Support ticket, Proposal.
- **Date from** and **Date to** – Optional date range to narrow the list.

Use **Previous** and **Next** to move between pages (e.g. 20 rows per page). The total count and current page are shown.

If no logs match the filters, the message explains that activity includes logins, user creation/role changes, project creation/status changes, support ticket create/close, and proposal generation. Clear filters or widen the date range to see more entries.

## Best Practices

- Review **Failed logins** and **Recent failed logins** regularly to detect unauthorised access attempts.
- Use **Security insights** (login trend and action distribution) to spot patterns over 7, 30, or 90 days.
- Set **Action type** and **Entity type** in the Activity timeline before exporting, so exports contain only the data you need.
- Use **Signed audit export** when you need an official record (e.g. for compliance or management).
- Store exported files securely and in line with company data and retention policies.

## Permissions Summary

- **Admin**: Full access to Audit & Security; can view all tiles, charts, recent failed logins, and the activity timeline; can export CSV, PDF, and signed PDF.
- **All other roles**: No access; **Audit & Security** does not appear in the menu.

## Getting Help

If you need assistance with the Audit and Security module:

- Press **?** or click **Help** in the navigation menu for context-sensitive help (Security section).
- Review the **FAQ** section for common questions.
- Contact your system administrator for access or security policies.

---

# Users Module

## Purpose

The **Users** page allows Administrators to manage user accounts and access control. You can create new users (with email, name, password, and role), view all users in a list, generate password reset links for users who forget their password, and delete users when they no longer need access. User management is a core part of security: the right roles and timely removal of access help protect data and comply with company policies.

## Who Can Access

- **Administrators only.** Other roles do not see **Users** in the menu. If a non-admin opens the page directly, they see “Access denied.”

## Using the Users Page

### Opening the Page

1. Navigate to **Users** from the top menu.
2. The page shows a **Users** heading, a **New User** button, and a table of existing users (Name, Email, Role, Actions).

### Creating a New User

1. Click **New User**. A **Create New User** form appears.
2. Fill in the required fields:
   - **Email** (required) – Must be a valid email address; used for login.
   - **Name** (required) – Display name for the user.
   - **Password** (required) – Minimum 6 characters. The user can change it later via **Change Password** or a reset link.
   - **Role** (required) – Select **Sales**, **Operations**, **Finance**, **Management**, or **Admin**. The role determines what the user can see and do in the CRM.
3. Click **Create User**. On success, the user is created and the list refreshes. The new user can log in with the email and password you set.
4. Click **Cancel** to close the form without saving.

Role is assigned at creation. Assign the role that matches the user’s job and data access needs (e.g. Sales for sales staff, Finance for accounting, Admin only for system administrators).

### Users List

The table shows all users with:

- **Name** – User’s display name.
- **Email** – Login email.
- **Role** – Current role (Sales, Operations, Finance, Management, Admin).
- **Actions** – **Reset Password** and **Delete** for each row.

If there are no users, the message says “No users found. Click ‘New User’ to create one.”

### Reset Password

When a user forgets their password or you need to send them a secure reset link:

1. Find the user in the list and click **Reset Password**.
2. The system generates a one-time reset link. A modal appears with the link for that user (name and email shown).
3. **Copy Link** copies the link to the clipboard so you can share it securely (e.g. by email or chat). The user opens the link to set a new password.
4. The token expires in **24 hours**. After that, generate a new link if needed.
5. Click **Close** to dismiss the modal.

Share the link only with the intended user through a secure channel. Do not post it in public or shared spaces.

### Deleting a User

When a user should no longer have access (e.g. left the company):

1. Find the user in the list and click **Delete**.
2. A **WARNING** modal appears: “User Details once deleted cannot be recovered” and “Are you sure to Proceed?”
3. Click **YES** to permanently delete the user, or **Cancel** to abort.
4. On success, the user is removed from the list and can no longer log in.

Deleting a user does not delete their historical data (e.g. projects, audit logs) from the system; it only removes their account and access.

## Roles and Access Control

Roles determine what each user can do:

- **Sales** – Create and manage own customers and projects; create support tickets for own projects.
- **Operations** – Update installation and execution; create support tickets for any project; upload documents.
- **Finance** – View financial data; export to Tally; manage payments. Cannot create or edit projects.
- **Management** – Read-only access to dashboards and data; analytics and reports.
- **Admin** – Full access; user management; Audit & Security; can delete records and manage all data.

Assign the least privilege needed for the user’s job. Use **Admin** only for system administrators.

## Best Practices

- Create users only when they need access; set a strong initial password and share it securely, or use **Reset Password** after creation so the user sets their own.
- Review the user list regularly; remove users who no longer need access (e.g. after leaving the company).
- Use **Reset Password** to help users who are locked out; share the link through a secure channel and remind them the link expires in 24 hours.
- Document role assignments and removals for audit and compliance.
- Do not share admin credentials; each administrator should have their own Admin account.

## Permissions Summary

- **Admin**: Full access to the Users page; can create users, reset passwords, and delete users.
- **All other roles**: No access; **Users** does not appear in the menu.

## Getting Help

If you need assistance with the Users module:

- Press **?** or click **Help** in the navigation menu for context-sensitive help (Security section).
- Review the **FAQ** section for common questions.
- Contact your system administrator for access or user management policies.

---

# Change Password Module

## Purpose

The **Change Password** page lets you update your own account password. You must enter your current password and then set a new password (with confirmation). Changing your password regularly or after any security concern helps keep your account secure. Only you can change your password from this page; Administrators use **Reset Password** on the Users page to send you a reset link if you forget it.

## Who Can Access

- **All logged-in users.** Every role can open **Change Password** (e.g. from the user menu or profile) and update their own password. You cannot change another user’s password here; that is done by an Admin via the Users page (**Reset Password**).

## Using Change Password

### Opening the Page

1. Navigate to **Change Password** from the user menu (top right, your name or profile) or the link provided in the application.
2. The page shows the heading **Change Password**, the account you are updating (your name and email), and a form with **Current Password**, **New Password**, and **Confirm New Password**.

### Changing Your Password

1. Enter your **Current Password** (required). This confirms your identity before allowing a change. Use the show/hide (eye) button next to the field if you want to check what you typed.
2. Enter your **New Password** (required). It must be at least **6 characters**. Use a strong password that you do not use elsewhere. Use the show/hide button if needed.
3. Enter the same value in **Confirm New Password** (required). It must match the new password exactly, or the form will show an error.
4. Click **Change Password**. The system validates your current password and updates to the new one. On success, you see a success message and are taken to the **Dashboard**. You will stay logged in with the new password.
5. To leave without changing, click **Cancel**. You are taken back to the Dashboard.

If your current password is wrong, you will see an error and the password will not change. If you have forgotten your current password, ask an Administrator to use **Reset Password** on the Users page to send you a reset link.

### After Changing Password

- You remain logged in; no need to log in again unless you log out or your session expires.
- Use the new password the next time you log in (e.g. on another device or after logout).
- Do not share your new password with anyone. Log out on shared computers when finished.

## Best Practices

- Use a strong password: at least 6 characters, and consider a mix of letters, numbers, and symbols.
- Do not reuse passwords from other sites or from old CRM passwords if they may have been exposed.
- Change your password if you suspect someone else knows it or if you are required to by company policy.
- Log out when using a shared or public computer after changing your password.

## Permissions Summary

- **All roles**: Can open Change Password and change their own password only.
- **Admin**: Same as above for their own account; to set or reset another user’s password, use the **Users** page and **Reset Password**.

## Getting Help

If you need assistance with changing your password:

- Press **?** or click **Help** in the navigation menu for context-sensitive help (Security section).
- If you forgot your current password, contact an Administrator to generate a **Reset Password** link from the Users page.
- Review the **FAQ** section for common questions.
