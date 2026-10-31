# Support Tickets Module

## At a glance

| Role | Menu access | Create / close |
| :-- | :-- | :-- |
| **Sales** | ✓ | Own projects |
| **Operations** | ✓ | All tickets, every project stage |
| **Management** | ✓ | Any project |
| **Admin** | ✓ | Full (+ closed-ticket follow-ups) |
| **Finance** | — | No access |

→ [Roles → Permission matrix](/help/roles#permission-matrix) · [Projects](#projects-module)

## Purpose

The Support Tickets module helps you track and manage customer service requests, technical issues, and follow-up activities related to your projects. This module ensures that all customer inquiries and support needs are properly documented, tracked, and resolved in a timely manner.

## Understanding Ticket Numbers

Each support ticket is assigned a unique ticket number for easy identification and tracking. The ticket number format is:

**RE + 8 digits** (e.g., RE12345678)

- **RE** prefix identifies it as a Rayenna Energy support ticket
- **8-digit number** provides a unique identifier
- Ticket numbers are automatically generated when you create a new ticket
- Use the ticket number when referencing specific support requests in communications

## Creating Support Tickets

### From Support Tickets

1. Open **Support Tickets** from the top bar (between **Projects** and **Reports**) or **Ctrl+Shift+K** / **⌘⇧K**
2. Click **Create ticket**
3. Search for the project by **customer name** or **project number**, then select it
4. Enter a **title**, optional description, and a **next follow-up date** (defaults to 3 days from today)
5. Click **Create Ticket**

### From a Project

1. Navigate to the **Projects** page
2. Click on the project for which you need to create a support ticket
3. Scroll to the **Support / Service Tickets** section
4. Click the **Create Ticket** button (disabled for projects in **Lost** status)
5. Fill in the required information:
   - **Title**: A brief, descriptive title for the ticket (required)
   - **Description**: Detailed information about the issue or request (optional)
   - **Next follow-up date**: when you will next act (required; defaults to +3 days)
6. Click **Create** to save the ticket

The system will automatically:
- Generate a unique ticket number
- Link the ticket to the project
- Set the initial status to "Open"
- Record who created the ticket and when
- Add a **system** “Ticket opened” event on the timeline when a next follow-up date is set (this is not a staff comment)

### Who Can Create Tickets

- **Sales** users can create tickets for their projects
- **Operations** users can create tickets for any project (every stage except **Lost**) — they own the company-wide open-ticket queue
- **Management** users can create tickets for any project
- **Admin** users have full access to create tickets

**Note**: You cannot create tickets for projects in **Lost** status.

## Managing Follow-ups

Follow-ups allow you to document progress, communications, and next steps for each ticket.

### Adding a Follow-up

1. Open the ticket by tapping the row or card (project name still opens **Project detail**)
2. The **Ticket Detail Drawer** opens from the right (slide-in panel)
3. In the drawer, scroll to the **Follow-up Timeline** section
4. Click **Add Follow-up** (if the form is not visible)
5. Enter your notes in the **Note** field (required)
6. Set a **next follow-up date** (required on open tickets; defaults to 3 days from today). **Overdue** uses only this latest date — older dates do not keep the ticket overdue
7. Click **Add Follow-up** to save
8. Use **Add to My Day** on the ticket to pin a follow-up on your personal list
9. **Admin** can still add a note after the ticket is closed (no next follow-up date required)

### Follow-up Best Practices

- Document all customer communications
- Include action items and next steps
- Set follow-up dates for time-sensitive items
- Be clear and concise in your notes
- Update follow-ups regularly to show progress

### Follow-up Date Reminders

- A ticket is **Overdue** when its **latest** next follow-up date has passed, or when it has had **no next date for 7 days**
- Older follow-up dates do not keep a ticket overdue after you log a newer one
- The Support Tickets page defaults to your **open queue** (overdue and Solar Hub first)
- **Zenith → Your Focus** shows open / overdue / Solar Hub counts that open this page filtered
- Use follow-up dates so customers do not wait in silence

## Ticket Status

Support tickets have three possible statuses:

### Open
- Newly created tickets start in this status
- Indicates the ticket needs initial attention
- In lists and on the **Support Tickets** dashboard, **Open** appears as its own **status chip** (distinct cool tint) so it is easy to scan next to other states

### In Progress
- Automatically set when you add the first follow-up
- Indicates active work is being done on the ticket
- **In Progress** uses an amber-style chip in the same UI

### Closed
- Set when the issue is resolved
- Closing **requires a resolution note**, which is saved on the follow-up timeline
- **Closed** uses a neutral dark chip (still readable on the Zenith-style dark surfaces)

## Resolving and Closing Tickets

When a support issue has been resolved:

1. Open the ticket from the Support Tickets Dashboard or Project page (tap the row or card — there is no Close on the list, so comments cannot be skipped)
2. Review the ticket details and follow-up history
3. Click **Close ticket** (or **Save note & close** if you already typed a note)
4. Enter a **resolution note** in the confirm dialog (pre-filled from any unsaved follow-up note). A next follow-up date is **not** required
5. Click **Save and close**. The system will:
   - Save the resolution note on the timeline
   - Change the status to "Closed" and record the closure date and time
   - Show the ticket under the **Closed** filter so it does not disappear from the queue
   - Prevent further follow-ups except **Admin**, who can still add a note on a closed ticket

If you type a follow-up and close the drawer without saving, you will be asked to discard or keep editing.

### Who Can Close Tickets

- **Sales** users can close tickets on their own projects
- **Operations** and **Management** users can close tickets on any stage (Operations owns all open tickets)
- **Admin** users can close any ticket

**Note**: Once closed, only Admin users can add follow-ups to the ticket. Tickets cannot be reopened.

## Viewing Tickets

### Support Tickets Dashboard

The Support Tickets page is a **daily queue** for open work:

1. Navigate to **Support Tickets** from the main menu
2. View the KPI strip at the top (**Opens list →**):
   - **Open**: Number of new tickets
   - **In Progress**: Tickets being actively worked on
   - **Closed**: Resolved tickets
   - **Overdue**: Latest next follow-up passed, or no next date for 7 days
3. Use the KPI tiles or **By status** chart slices to filter the queue
4. Search by ticket number, customer, title, or project number; click a project name to open **Project detail** (Operations can open project detail only for Confirmed → Subsidy Credited — work early-stage tickets from this page)
5. Review the **Open queue** list (desktop table or stacked cards). Tap a row or card to open the ticket. Overdue tickets sort first, then Solar Hub. **Last updated** reflects follow-ups and other ticket changes (sort the column to see most recently touched tickets)
6. On a phone, **Insights** holds the status chart so the queue stays above the fold

### Filtering Tickets

- Click any **KPI tile** (Open, In Progress, Closed, Overdue) to filter the queue; click again to toggle that filter off
- Click a **chart slice** in **By status** to filter by that status; click again to toggle off
- **Overdue** uses the latest next follow-up date (or 7 days with no next date)
- Search, **Create ticket**, and project name links are on the same page
- **Clear Filters** appears when filters are active; use it to reset to the default open queue

### From Project Details

1. Navigate to a specific project (Operations: Confirmed → Subsidy Credited only)
2. Scroll to the **Support / Service Tickets** section
3. View all tickets associated with that project
4. Tap a ticket row or card to open the **Ticket Detail Drawer** (slide-in panel from the right)
5. See ticket status, creation date, and latest follow-up information

Early-stage tickets (Lead / Survey / Proposal) are worked from **Support Tickets**, not project detail, for Operations.

## Ticket Information

Each ticket displays:

- **Ticket Number**: Unique identifier (RE########)
- **Title**: Brief description of the issue
- **Description**: Detailed information (if provided)
- **Status**: Current state (Open, In Progress, or Closed)
- **Project**: Associated project and customer information
- **Created By**: User who created the ticket
- **Created Date**: When the ticket was created
- **Closed Date**: When the ticket was resolved (if closed)
- **Follow-up Timeline**: Complete history of all activities. The auto “Ticket opened” stub is shown as a **system** event (Opened), distinct from staff follow-ups

## Permissions

See [Roles → Permission matrix](/help/roles#permission-matrix). **Finance** has no Support Tickets menu. **Operations** sees and works **all** open tickets (every project stage); **Sales** is limited to own projects. Only **Admin** adds follow-ups on **closed** tickets or deletes tickets.

## Related help

- [Projects module](#projects-module) · [FAQ](/help/faq)

---
