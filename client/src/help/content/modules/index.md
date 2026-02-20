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

# Customer Master Module

## Purpose

The **Customer Master** (Customers) module is your central database for all customer information. It is the foundation for projects, support, and business operations in the CRM. Every project is linked to a customer—you create or select a customer before creating a project. The module helps you manage contact details, addresses, location mapping, salesperson assignment, and customer–project relationships. Keeping the Customer Master accurate and up to date is essential for effective sales, operations, and customer service.

## Understanding Customer IDs

Each customer is assigned a unique **Customer ID** when created. This ID:

- Is **automatically generated** by the system (sequential, SL No)
- **Cannot be changed** after creation
- Uniquely identifies the customer across the CRM
- Is used when searching for customers, creating projects, and in exports

## Creating Customers

### From the Customers Page

1. Navigate to **Customers** from the top menu (Customer Master).
2. Click the **New Customer** button (top right).
3. Fill in **name**:
   - **Individual**: Use **Prefix** (Mr., Ms., etc.), **First Name** (required), **Middle Name**, **Last Name**.
   - **Business**: Use **Customer Name** for company name.
   - You must provide either **Customer Name** or **First Name**.
4. Enter **address**: Address Line 1 & 2, **Country** (required for state/city), **State**, **City**, **Pin Code**.
5. **Location**: Use the **Map Selector** to set customer location coordinates; they are saved automatically.
6. Add **Contact Information**:
   - **Contact Numbers**: At least one required. Use "+ Add Contact Number" for more.
   - **Email IDs**: Optional. Use "+ Add E-mail ID" for more.
7. Optionally add **Business** details: **DISCOM Consumer Number**, **Company Name**, **Company GST#**.
8. **Identification**: If you enter **Id Proof#**, select **Type of Id Proof** (Aadhaar, PAN, Voters Card, DL, Passport, Others).
9. **Salesperson** (Management and Admin only): Assign the customer to a sales team member.
10. Click **Create**. The customer is saved and assigned a Customer ID.

### Who Can Create Customers

- **Sales** users can create customers for their own use.
- **Admin** users can create customers for any salesperson.

**Operations**, **Finance**, and **Management** users do not create customers; they work with customers created by Sales or Admin.

### Required Fields

- **Name**: Either **Customer Name** (business) or **First Name** (individual).
- **At least one Contact Number**.

If **Id Proof#** is provided, **Type of Id Proof** is required. **Country** must be selected before **State**; **State** before **City**.

## Managing Customers

### Editing Customers

- **Sales** users can edit **their own** customers (in **My Customers** view).
- **Admin** users can edit any customer.
- **Management** can view but not edit.

**How to edit**: Open the **Customers** page → find the customer (search/filters) → click the 3-dot **Actions** menu → **Edit** → update fields → click **Update**.

**Salesperson** assignment can be changed only by **Management** or **Admin**.

### My Customers vs All Customers (Sales)

- **My Customers**: Customers you created or are assigned to. You can create, edit, and manage them.
- **All Customers**: View-only list of all customers. You cannot edit others’ customers.

Use the **Filter** radio buttons on the Customers page to switch between **My Customers** and **All Customers**.

### Deleting Customers

- **Admin** only can delete customers.
- Customers with existing projects **cannot be deleted**. Delete or reassign projects first.
- Use the 3-dot **Actions** menu on a customer row → **Delete** → confirm in the warning dialog.

## Viewing and Finding Customers

### Customers List

1. Navigate to **Customers** from the top menu.
2. Use the **search bar** to find customers by **customer name**, **Customer ID**, or **consumer number** (real-time, case-insensitive).
3. Apply **filters**:
   - **Sales users**: Choose **My Customers** or **All Customers** (radio buttons).
   - **Other users**: Use **Sales Person** dropdown to filter by one or more salespersons. Leave as "All Sales Persons" to see all customers.
4. The list shows customer cards with ID, name, address, contact info, **project count** badge, and creation date.
5. Use **Previous** and **Next** for pagination (25 customers per page).

### Customer Row Actions

Each customer row has a 3-dot **Actions** menu:

- **Edit** (Admin, Management, or Sales in My Customers): Open the customer form to update details.
- **Delete** (Admin only): Remove the customer. Not available if the customer has projects.
- **Open in Google Maps**: Shown when location coordinates are set. Opens the customer location in Google Maps in a new tab.

### Customer Information Displayed

- **Customer ID**, **Name** (or individual name components)
- **Address**, **Pin Code**, **Google Maps link** (if location set)
- **Contact numbers**, **Email IDs** (clickable mailto links)
- **DISCOM Consumer Number**, **Company Name** (if provided)
- **Project count** badge (number of projects linked to the customer)

## Relationship to Projects

- **Every project is linked to a customer.** Projects cannot exist without a customer.
- When **creating a project**, you must select an existing customer or create one first from Customer Master.
- **One customer** can have **multiple projects**. The project count badge on each customer shows how many projects they have.
- From **Projects**, you can search by customer name, ID, or consumer number to link the right customer.

**Typical workflow**: Create customer in Customer Master → Create project and select that customer → Project is linked. For repeat customers, search and select the existing customer when creating a new project.

## Exporting Customer Data

- **Who can export**: **Administrators** only.
- **Formats**: **Excel (.xlsx)** or **CSV (.csv)**.
- **How**: Apply any filters (e.g. Sales Person, My/All) → click **Export to Excel** or **Export to CSV** → read and confirm the authorization notice → click **YES** → file downloads.

Exports include all customer information and respect current filters and search. You must confirm that you are authorized to export data before the file is generated.

## Best Practices

1. **Create customers** before creating projects; use **Customer Master** as the single source of truth.
2. **Use consistent naming**: Individual vs business format, standard address style.
3. **Add complete contact and address** details to support operations and follow-up.
4. **Set location coordinates** via the map for service planning and geographic analysis.
5. **Keep data current**: Update contact details, address, and business info when they change.
6. **Use DISCOM Consumer Number** and **GST** where relevant for utility and compliance.
7. **Assign salesperson** (Management/Admin) so **My Customers** / **All Customers** and reporting work correctly.

## Permissions Summary

A quick reference for Customer Master access:

![Permission Matrix](/help/docs/overview/access_matrix.jpg)

- **Sales**: Create customers, edit own customers (My Customers), view All Customers (read-only). Cannot change salesperson or delete.
- **Operations / Finance**: View customers (via filters). Cannot create, edit, or delete.
- **Management**: View all customers, assign/change salesperson, edit customer details. Cannot create or delete.
- **Admin**: Full access; create, edit, delete (when no projects), export.

## Getting Help

If you need assistance with the Customer Master module:

- Press **?** or click **Help** in the navigation menu for context-sensitive help
- Review the **FAQ** section for common questions
- Contact your system administrator for access or permission issues

---

# Projects Module

## Purpose

The Projects module is the **core** of Rayenna CRM. It manages the complete lifecycle of solar energy projects—from initial lead to final completion—and serves as the central hub for coordinating sales, operations, finance, and customer service. Every customer engagement, installation, payment, and support ticket ties back to a project. Understanding and using the Projects module effectively is essential for running your business.

## Understanding Project Numbers and the Lifecycle

Each project is assigned a unique **Project Number (SL No)** when created. This number:

- Is **automatically generated** by the system (sequential)
- **Cannot be changed** after creation
- Uniquely identifies the project across the CRM
- Is used when referencing projects in reports, exports, and communications

Projects move through a **status lifecycle**. The typical flow is:

**Lead** → **Site Survey** → **Proposal** → **Confirmed Order** → **Installation** → **Submitted for Subsidy** → **Completed** → **Completed - Subsidy Credited**

At any stage, a project may be marked **Lost** if the customer does not proceed. Lost projects cannot be edited; only Admin can delete them.

## Creating Projects

### From the Projects Page

1. Navigate to the **Projects** page from the top menu
2. Click the **New Project** button (top right)
3. **Select the customer** (required): Search by name, ID, or consumer number. The customer cannot be changed after creation. If the customer does not exist, create them first from **Customer Master**.
4. Fill in **Customer & Project Details**:
   - **Segment** (required): Residential Subsidy, Residential Non-Subsidy, or Commercial Industrial
   - **Project Type** (required): EPC Project, Panel Cleaning, Maintenance, Repair, Consulting, Resale, or Other Services
5. Complete **Sales & Commercial Information**:
   - **Lead Source**: Website, Referral, Google, Channel Partner, Digital Marketing, Sales, Management Connect, or Other (additional details required for some options)
   - **System Capacity (kW)**, **Order Value (₹)**, **Confirmation Date** (required), **Project Status**
   - **Availing Loan/Financing?**: Check if the customer is availing loan/financing. If **Yes**, select **Financing Bank** (required) from the dropdown (e.g. SBI, HDFC Bank, Other). If you select **Other**, enter **Other Bank Name** (required, alphanumeric).
   - **Roof Type** and **System Type** (technical details)
6. If status is **Lost**, enter **Lost Date** and **Reason for Loss** (required).
7. Click **Create**. The project is saved, assigned a Project Number, and you are redirected to the Projects list.

### Who Can Create Projects

- **Sales** users can create projects for their assigned customers
- **Admin** users can create projects for any customer

**Operations** and **Finance** users do not create projects; they work with projects created by Sales or Admin.

### Required Fields

- **Customer** (must be selected)
- **Segment** and **Project Type**
- **Confirmation Date**

If **Lead Source** is Referral, Channel Partner, or Other, the corresponding detail field is required. If **Availing Loan/Financing** is Yes, **Financing Bank** is required; if the bank is **Other**, **Other Bank Name** is required. If status is **Lost**, **Lost Date** and **Reason for Loss** are required.

## Project Status Stages

![Project Status Workflow](/help/docs/overview/CRM_Workflow.jpg)

**Sales** typically update status from Lead through Confirmed Order. **Operations** update status from Installation onward and manage execution milestones. **Finance** can view all statuses but cannot change them.

## Managing Projects

### Status and Lifecycle

- Update **Project Status** as the project progresses. Keep it current so the rest of the team and reports reflect reality.
- **Operations** use the **Project Lifecycle** section to record: MNRE Portal Registration Date, DISCOM Feasibility/Registration dates, Installation Completion Date, Completion Report Submission Date, Net Meter Installation Date, Total Project Cost, Panel and Inverter brands.

### Financial Tracking

- **Finance** (and **Admin**) manage **Payment Tracking**: Advance Received, Payment 1–3, and Last Payment (each with amount and date).
- **Total Amount Received**, **Balance Amount**, and **Payment Status** (Pending, Partial, Fully Paid) are calculated automatically.
- Update payments as soon as they are received to keep cash flow and reporting accurate.

### Sales & Commercial

- **Sales** and **Admin** can **edit** the Sales & Commercial section: **Lead Source**, **Order Value**, **Confirmation Date**, **System Capacity**, **Availing Loan/Financing** (checkbox, financing bank, other bank name when Other), **Roof Type**, and **System Type**.
- **Finance**, **Operations**, and **Management** can **view** Sales & Commercial but cannot edit it.
- Use **Remarks** for internal notes and decisions. Remarks are versioned and visible to users with project access.

### Support Tickets and Documents

- Create **Support Tickets** from the project’s **Support / Service Tickets** section to track customer issues and follow-ups.
- Upload **documents** (photos, videos, PDFs, spreadsheets) in **Key Artifacts**, and choose the appropriate category (e.g. Photos/Videos, Documents, Sheets). Use descriptions to help others find and understand files.

## Viewing Projects

### Opening Projects from the Dashboard

You can jump to a filtered Projects view from your dashboard:

1. On your dashboard, find the **Quick Access** section (tiles showing counts like Total Leads, Open Deals, Payment Status).
2. Click any tile. The Projects page opens with filters already applied (e.g. status, payment status, availing loan, FY, Quarter, Month).
3. Use **Clear All** on the Projects page to remove all filters and see the full list.

The tile counts and filters match the dashboard filters (FY, Quarter, Month) you have set.

### Projects List

1. Navigate to **Projects** from the top menu (or click a dashboard Quick Access tile).
2. Use the **search bar** to find projects by customer name, customer ID, or consumer number.
3. Apply **filters** (click **Show Filters** to expand):
   - **FY, Quarter, Month**: Same dashboard-style date filters. Tile counts and Quick Access links use these.
   - **Status**: Lead, Site Survey, Proposal, Confirmed, Installation, Completed, etc.
   - **Payment Status**: Pending, Partial, Fully Paid, N/A (Finance, Sales, Management, Admin, Operations)
   - **Availing Loan**: Check to show only projects where Availing Loan/Financing is Yes
   - **Segment**: Residential Subsidy, Residential Non-Subsidy, Commercial Industrial
   - **Service Type**: EPC Project, Panel Cleaning, Maintenance, etc.
   - **Support Ticket Status**: Has Tickets, Open, In Progress, Closed, No Tickets
   - **Salesperson** (for non-Sales users): Filter by assigned salesperson
4. Use **Clear All** to reset search, filters, and sort. Works even when arriving from a dashboard tile.
5. Sort by creation date, confirmation date, order value, customer name, profitability, or system capacity. Default is confirmation date (newest first).
6. Click a **project row** or **project number** to open the **Project Detail** page.

Filters are remembered when you navigate to a project and use **Back** to return.

### Subtotals and Payment Status

- **Subtotals**: Select multiple projects using the checkboxes. The bottom of the list shows subtotals for Order Value, Amount Received, and Outstanding.
- **Payment Status tooltip**: Hover over **Pending** or **Partial** in the Payment Status column to see the outstanding balance amount.

### Project Detail Page

The detail page shows:

- **Customer** information, **Project** and **Sales & Commercial** details
- **Project Lifecycle** (execution dates, costs, equipment)
- **Payment Tracking** (status, amounts, balance)
- **Remarks** (versioned history)
- **Support / Service Tickets** (create, view, manage)
- **Key Artifacts** (view, download, manage documents)

From here you can **Edit** the project (within your role’s permissions), **Generate AI Proposal** (for Lead, Site Survey, or Proposal stages), or use **Back** to return to the Projects list.

## Project Information at a Glance

Each project displays:

- **Project Number (SL No)**, **Customer**, **Segment**, **Project Type**
- **Order Value**, **Payment Status**, **Balance**
- **Confirmation Date**, **Financial Year**
- **Project Status**, **Lead Source**
- **Availing Loan/Financing** (Yes/No) and **Financing Bank** when applicable
- **System Capacity**, **Roof Type**, **System Type**
- **Support tickets** (count and status) and **documents** (in Key Artifacts)

## Best Practices

1. **Create projects promptly** when a lead converts or an order is confirmed.
2. **Keep status up to date** so pipeline, dashboards, and reports stay accurate.
3. **Enter complete commercial and technical details** at creation and update as needed.
4. **Update payments** as soon as they are received.
5. **Use remarks** for important decisions, handoffs, and context.
6. **Create support tickets** for customer issues and **add follow-ups** regularly.
7. **Upload and categorize documents** clearly so the team can find them easily.
8. **Respect role boundaries**: edit only the sections you are permitted to change.

## Permissions Summary

A quick reference for project-related access:

![Permission Matrix](/help/docs/overview/access_matrix.jpg)

- **Sales**: Create projects (own customers), edit Sales & Commercial (including Availing Loan/Financing), update status through Confirmed, add remarks, create tickets, upload documents. Cannot edit Lifecycle or Payments.
- **Operations**: View all projects, edit Project Lifecycle, update status from Installation onward, add remarks, create tickets, upload documents. Can view Sales & Commercial but cannot edit it or Payments.
- **Finance**: View all projects, edit Payment Tracking only. Can view Sales & Commercial but cannot edit it or other sections.
- **Management**: View all projects and all sections; cannot edit Sales & Commercial, Lifecycle, or Payments.
- **Admin**: Full access; can delete Lost projects.

## Getting Help

If you need assistance with the Projects module:

- Press **?** or click **Help** in the navigation menu for context-sensitive help
- Review the **FAQ** section for common questions
- Contact your system administrator for access or permission issues

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
3. Use the metric cards or chart slices to filter the table
4. View the **Ticket Status Breakdown** donut chart for visual insights
5. Review the **All Support Tickets** table

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

## Permissions Summary

- **Admin**: Full access; can create, close, add follow-ups, delete tickets, and add follow-ups to closed tickets.
- **Sales**: Can create tickets (own projects), add follow-ups, close tickets. Cannot delete.
- **Operations**: Can create tickets (any project), add follow-ups, close tickets. Cannot delete.
- **Management**: Can view the Support Tickets dashboard. Create, close, and follow-up access via API; UI may vary.
- **Finance**: No access to the Support Tickets module.

**Navigation access**: Admin, Sales, Operations, Management (Finance does not see Support Tickets in the menu).

## Best Practices

1. **Create tickets promptly** when customer issues arise
2. **Use clear, descriptive titles** that summarize the issue
3. **Add detailed descriptions** to provide context
4. **Update follow-ups regularly** to show progress
5. **Set follow-up dates** for time-sensitive items
6. **Close tickets promptly** when issues are resolved
7. **Review overdue tickets** daily to ensure timely responses

## Permissions Summary

A quick reference showing which features each role can access:

![Permission Matrix](/help/docs/overview/access_matrix.jpg)

## Getting Help

If you need assistance with the Support Tickets module:
- Press **?** or click **Help** in the navigation menu
- Review the **FAQ** section for common questions
- Contact your system administrator for access or permission issues

---

# Tally Export Module

## Purpose

The **Tally Export** module lets you export financial data from the CRM in formats compatible with Tally accounting software. Use it to move project, invoice, and payment data into Tally for bookkeeping and financial reporting. Access is restricted to **Finance** and **Admin** users; exports are monitored and require you to confirm that you are authorised and have management approval.

## Who Can Access

- **Finance** users and **Administrators** only. Other roles do not see **Tally Export** in the menu and cannot access the page.
- Export is monitored and logged. You must confirm authorisation and management approval before the file is generated.

## Using Tally Export

### Opening the Page

1. Navigate to **Tally Export** from the top menu.
2. The page shows **Export Data Type**, **Export Format**, optional **Start Date** and **End Date**, and the **Export** button.
3. If you do not have permission, you will see a message that you cannot access the page.

### Export Data Type

Choose what to export:

- **Projects** – Project financial data (customer, order value, payments, costs). For Tally XML this is exported as ledgers.
- **Invoices** – Invoice data (amounts, payments, customer details).
- **Payments** – Payment transactions (amounts, dates, project and customer information, payment status). For Tally XML this is exported as vouchers.

### Export Format

- **Excel (.xlsx)** – Import into Tally using the Excel import feature. Recommended for most users.
- **CSV (.csv)** – Compatible with Tally CSV import; useful for other tools as well.
- **Tally XML** – Native Tally format. Import via Gateway of Tally → Import → Tally XML. Projects export as ledgers; Invoices/Payments as vouchers.

### Date Filters (Optional)

- **Start Date** and **End Date** – Limit the export to a date range. Leave both blank to export all data for the selected type.

### Export Steps

1. Select **Export Data Type** (Projects, Invoices, or Payments).
2. Select **Export Format** (Excel, CSV, or Tally XML).
3. Optionally set **Start Date** and **End Date**.
4. Click the **Export** button (e.g. “Export Projects as Excel”).
5. Read the **WARNING** and confirmation text. It states that data is company property, unauthorised export is prohibited, and you must be authorised and have written management approval.
6. Click **YES** to confirm. The file downloads automatically (e.g. `tally-export-projects-1234567890.xlsx`).
7. Click **CANCEL** to abort.

If an error appears, check your connection and try again; contact your administrator if the problem continues.

### Importing into Tally

**For Excel or CSV:**

1. Open Tally and go to **Gateway of Tally**.
2. Press **F11** (Features) → set **Allow Excel Import** to **Yes**.
3. Go to **Gateway of Tally** → **Import** → **Excel/CSV**.
4. Select the exported file and map columns to Tally fields.
5. Complete the import.

**For Tally XML:**

1. Open Tally and go to **Gateway of Tally**.
2. Press **F11** (Features) → enable **Import from Tally XML**.
3. Go to **Gateway of Tally** → **Import** → **Tally XML**.
4. Select the exported XML file. Tally imports ledgers/vouchers as per the export type.

## Best Practices

- Export only when you are authorised and have management approval.
- Verify **Export Data Type** and **Format** before confirming.
- Use **Start Date** and **End Date** when you need a specific period.
- Store exported files securely and do not share them outside authorised use.
- Import into Tally promptly and follow company data policies.

## Permissions Summary

- **Finance**: Full access to Tally Export; can export Projects, Invoices, and Payments in Excel, CSV, or Tally XML.
- **Admin**: Same as Finance; full access to Tally Export.
- **Sales, Operations, Management**: No access; **Tally Export** does not appear in the menu.

## Getting Help

If you need assistance with the Tally Export module:

- Press **?** or click **Help** in the navigation menu for context-sensitive help
- Review the **FAQ** section for common questions
- Contact your system administrator for access or permission issues
