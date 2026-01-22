# Modules

## Overview

The Rayenna CRM consists of several key modules designed to manage different aspects of your business.

## Core Modules

### Dashboard
- Role-based dashboards
- Key performance indicators
- Visual analytics
- Quick access to important data

### Customers
- Customer master data
- Contact information
- Customer history
- Relationship management

### Projects
- Project lifecycle management
- Status tracking
- Financial tracking
- Document management
- Support ticket integration

### Support Tickets
- Ticket creation and management
- Follow-up tracking
- Status monitoring
- Activity logs

### Tally Export
- Financial data export
- Integration with Tally software
- Report generation

### Users
- User management (Admin only)
- Role assignment
- Access control

## Module Features

Each module includes:
- Search and filtering
- Sorting capabilities
- Export functionality
- Detailed views
- Action buttons based on permissions

---

# Support Tickets Module

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
4. Click the **Create Ticket** button
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
- **Admin** users have full access to create tickets

## Managing Follow-ups

Follow-ups allow you to document progress, communications, and next steps for each ticket.

### Adding a Follow-up

1. Open the ticket by clicking on the ticket number or **View** button
2. In the ticket detail drawer, scroll to the **Follow-up Timeline** section
3. Click **Add Follow-up** (if the form is not visible)
4. Enter your notes in the **Note** field (required)
5. Optionally set a **Follow-up Date** if you need to schedule a future action
6. Click **Add Follow-up** to save

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
- Shown in blue on the dashboard

### In Progress
- Automatically set when you add the first follow-up
- Indicates active work is being done on the ticket
- Shown in yellow/orange on the dashboard

### Closed
- Set when the issue is resolved
- Tickets can be reopened if needed (Admin only)
- Shown in gray on the dashboard

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

- **Sales** users can close tickets
- **Operations** users can close tickets
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
3. Use the metrics cards to filter tickets by status
4. View the **Ticket Status Breakdown** chart for visual insights
5. Review the **Open Support Tickets** table for active tickets

### Filtering Tickets

- Click on any metric card (Open, In Progress, Closed, Overdue) to filter the table
- Click on a slice in the status chart to filter by that status
- Use the **Clear Filters** button to reset to the default view

### From Project Details

1. Navigate to a specific project
2. Scroll to the **Support / Service Tickets** section
3. View all tickets associated with that project
4. See ticket status, creation date, and latest follow-up information

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

## Best Practices

1. **Create tickets promptly** when customer issues arise
2. **Use clear, descriptive titles** that summarize the issue
3. **Add detailed descriptions** to provide context
4. **Update follow-ups regularly** to show progress
5. **Set follow-up dates** for time-sensitive items
6. **Close tickets promptly** when issues are resolved
7. **Review overdue tickets** daily to ensure timely responses

## Permissions Summary

| Action | Sales | Operations | Admin |
|--------|-------|------------|-------|
| Create Tickets | ✓ (Own projects) | ✓ (All projects) | ✓ (All projects) |
| Add Follow-ups | ✓ | ✓ | ✓ |
| Close Tickets | ✓ | ✓ | ✓ |
| View Tickets | ✓ (Own projects) | ✓ (All projects) | ✓ (All projects) |
| Delete Tickets | ✗ | ✗ | ✓ |
| Add to Closed Tickets | ✗ | ✗ | ✓ |

## Getting Help

If you need assistance with the Support Tickets module:
- Press **F1** or click **Help** in the navigation menu
- Review the **FAQ** section for common questions
- Contact your system administrator for access or permission issues
