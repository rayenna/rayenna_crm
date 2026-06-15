# Support Tickets Module

## At a glance

| Role | Menu access | Create / close |
| :-- | :-- | :-- |
| **Sales** | ✓ | Own projects |
| **Operations** | ✓ | Any project you can open |
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

### From a Project

1. Navigate to the **Projects** page
2. Click on the project for which you need to create a support ticket
3. Scroll to the **Support / Service Tickets** section
4. Click the **Create Ticket** button (disabled for projects in **Lost** status)
5. Fill in the required information:
   - **Title**: A brief, descriptive title for the ticket (required)
   - **Description**: Detailed information about the issue or request (optional)
6. Click **Create** to save the ticket

The system will automatically:
- Generate a unique ticket number
- Link the ticket to the project
- Set the initial status to "Open"
- Record who created the ticket and when

### Who Can Create Tickets

- **Sales** users can create tickets for their projects
- **Operations** users can create tickets for any project
- **Management** users can create tickets for any project
- **Admin** users have full access to create tickets

**Note**: You cannot create tickets for projects in **Lost** status.

## Managing Follow-ups

Follow-ups allow you to document progress, communications, and next steps for each ticket.

### Adding a Follow-up

1. Open the ticket by clicking the ticket number or **View** in the table
2. The **Ticket Detail Drawer** opens from the right (slide-in panel)
3. In the drawer, scroll to the **Follow-up Timeline** section
4. Click **Add Follow-up** (if the form is not visible)
5. Enter your notes in the **Note** field (required)
6. Optionally set a **Follow-up Date** if you need to schedule a future action
7. Click **Add Follow-up** to save

### Follow-up Best Practices

- Document all customer communications
- Include action items and next steps
- Set follow-up dates for time-sensitive items
- Be clear and concise in your notes
- Update follow-ups regularly to show progress

### Follow-up Date Reminders

- Tickets with follow-up dates that have passed are marked as **Overdue**
- The Support Tickets Dashboard highlights overdue tickets
- Use follow-up dates to ensure timely responses to customers

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
- Tickets can be reopened if needed (Admin only)
- **Closed** uses a neutral dark chip (still readable on the Zenith-style dark surfaces)

## Resolving and Closing Tickets

When a support issue has been resolved:

1. Open the ticket from the Support Tickets Dashboard or Project page
2. Review the ticket details and follow-up history
3. Ensure all necessary actions have been completed
4. Click the **Close Ticket** button
5. The system will:
   - Change the status to "Closed"
   - Record the closure date and time
   - Prevent further follow-ups (unless you're an Admin)

### Who Can Close Tickets

- **Sales**, **Operations**, and **Management** users can close tickets
- **Admin** users can close any ticket

**Note**: Once closed, only Admin users can add follow-ups to the ticket.

## Viewing Tickets

### Support Tickets Dashboard

The Support Tickets Dashboard provides a comprehensive view of all tickets:

1. Navigate to **Support Tickets** from the main menu
2. View key metrics at the top:
   - **Open**: Number of new tickets
   - **In Progress**: Tickets being actively worked on
   - **Closed**: Resolved tickets
   - **Overdue**: Tickets with past follow-up dates
3. Use the metric cards or chart slices to filter the table
4. View the **Ticket Status Breakdown** donut chart for visual insights
5. Review the **All Support Tickets** table (desktop) or the stacked **card list** on small screens; both respect the same filters

### Filtering Tickets

- Click any **KPI card** (Open, In Progress, Closed, Overdue) to filter the table; click again to toggle that filter off
- Click a **chart slice** in the Ticket Status Breakdown to filter by that status; click again to toggle off
- **Overdue** shows tickets with past follow-up dates
- **Clear Filters** appears when filters are active; use it to reset to the default view

### From Project Details

1. Navigate to a specific project
2. Scroll to the **Support / Service Tickets** section
3. View all tickets associated with that project
4. Click a ticket number or **View** to open the **Ticket Detail Drawer** (slide-in panel from the right)
5. See ticket status, creation date, and latest follow-up information

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
- **Follow-up Timeline**: Complete history of all activities

## Permissions

See [Roles → Permission matrix](/help/roles#permission-matrix). **Finance** has no Support Tickets menu. Only **Admin** adds follow-ups on **closed** tickets or deletes tickets.

## Related help

- [Projects module](#projects-module) · [FAQ](/help/faq)

---
