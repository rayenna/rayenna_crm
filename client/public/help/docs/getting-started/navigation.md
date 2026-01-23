# Navigation Guide

## Overview

Rayenna Energy CRM uses a top navigation bar layout that adapts to your screen size and user role. This guide explains how to navigate the system efficiently.

## Top Navigation Bar

### Layout Structure

The navigation bar is located at the top of every page and contains:

- **Left Side**: 
  - Company logo (clickable, returns to Dashboard)
  - Main menu items (role-based visibility)

- **Right Side**:
  - Help dropdown menu (visible to all users)
  - Your name and role badge
  - User actions menu (Change Password, Logout)

### Main Menu Items

Menu items are displayed based on your user role:

- **Dashboard**: Your personalized overview page
- **Customers**: Customer database and management
- **Projects**: Project management and tracking
- **Support Tickets**: Customer service ticket management (Sales, Operations, Admin only)
- **Tally Export**: Financial data export (Finance and Admin only)
- **Users**: User management (Admin only)

### Active Page Indicator

- The current page is highlighted with a white background and border
- Active menu items have increased opacity and shadow
- Inactive items are slightly transparent and become more visible on hover

### Help Menu

Located in the top navigation bar:

- **Help (?)**: Opens context-sensitive help documentation
  - Automatically shows relevant help based on your current page
  - Press ? from any page for quick help access
- **About**: System information and version details

### User Actions Menu

Click on your name in the top right to access:

- **Change Password**: Update your account password
- **Logout**: Sign out of the system securely

## Responsive Navigation

### Desktop/Laptop View (Large Screens)

- All menu items are visible in a horizontal row
- Menu items have adequate spacing to prevent clutter
- Help menu appears as a dropdown on hover
- User actions are visible in the top right

### Tablet/Mobile View (Small Screens)

- Navigation collapses into a hamburger menu (☰)
- Click the hamburger icon to expand the menu
- All features remain accessible through the mobile menu
- Help and About links are included in the mobile menu
- User actions are moved into the mobile menu

### Landscape Mobile View

- Hamburger menu is used even in landscape orientation
- Prevents menu items from becoming cluttered
- Ensures consistent navigation experience

## Dashboards

### Dashboard Overview

Each role has a customized dashboard showing relevant metrics and insights.

### Dashboard Components

- **Metric Cards**: 
  - Key performance indicators at the top
  - Color-coded with icons
  - Clickable for detailed views
  - Examples: Total Leads, Total Capacity, Revenue, Projects

- **Charts and Visualizations**:
  - Interactive charts showing trends
  - Pie charts for distribution
  - Bar/line charts for comparisons
  - Word clouds for insights

- **Filters**:
  - Financial Year (FY) filter
  - Month filter
  - Apply filters to update metrics and charts
  - Filters persist during your session

### Role-Specific Dashboards

- **Sales Dashboard**: 
  - Sales metrics (leads, capacity, revenue)
  - Project value breakdown
  - Sales team performance
  - Profitability analysis

- **Operations Dashboard**:
  - Installation metrics
  - Project completion rates
  - Operational KPIs
  - Installation progress tracking

- **Finance Dashboard**:
  - Revenue and payment metrics
  - Financial summaries
  - Outstanding balances
  - Financial trends

- **Management Dashboard**:
  - Company-wide metrics
  - Executive insights
  - Strategic KPIs
  - Comprehensive analytics

- **Admin Dashboard**:
  - System-wide overview
  - All metrics and analytics
  - User activity insights
  - Complete system visibility

### Navigating from Dashboard

- Click metric cards to drill down into details
- Use filters to analyze specific time periods
- Navigate to specific modules using the top menu
- Export data when available

## Project Pages

### Projects List Page

The main projects page displays all projects you have access to.

#### Page Layout

- **Top Section**:
  - Page title: "Projects"
  - Export buttons (Excel, CSV) - visible to authorized users
  - "Create Project" button (Sales and Admin only)

- **Filter Section** (Three-row layout on desktop):
  - **Row 1**: Search bar (full width)
  - **Row 2**: Primary filters (Status, Type, Project Service Type)
  - **Row 3**: Secondary filters (Support Ticket Status, Sales Users)

- **Table Section**:
  - Project list with sortable columns
  - Pagination controls at the bottom
  - 25 projects per page

#### Project Table Columns

- **Project ID**: Unique project identifier
- **Customer Name**: Linked to customer details
- **Status**: Color-coded status badge
- **Type**: Project type (EPC, Resale, etc.)
- **Service Type**: Service category
- **Capacity**: System capacity in kW
- **Value**: Project value in ₹
- **Salesperson**: Assigned sales user
- **Created Date**: Project creation date
- **Actions**: View/Edit buttons

#### Project Detail Page

Click on a project to view detailed information:

- **Project Information Section**:
  - Basic project details
  - Customer information
  - Financial details
  - Project lifecycle dates

- **Sales & Commercial Section**:
  - Project status
  - Lead source
  - Project type and service type
  - Salesperson assignment
  - Proposal details

- **Project Lifecycle Section**:
  - Installation dates
  - Completion dates
  - Subsidy submission dates
  - Milestone tracking

- **Remarks Section**:
  - Project notes and comments
  - Activity timeline
  - Add new remarks

- **Support Tickets Section**:
  - List of support tickets for the project
  - Create new tickets
  - View ticket details
  - Manage ticket activities

#### Project Actions

- **View**: Open project details (all roles)
- **Edit**: Modify project information (role-based permissions)
- **Delete**: Remove project (Admin only)
- **Create**: Add new project (Sales and Admin)

## Support Modules

### Support Tickets Dashboard

Accessible from the top navigation menu (Sales, Operations, Admin only).

#### Dashboard Layout

- **Header Section**:
  - Page title: "Support Tickets Dashboard"
  - Subtitle: "Monitor and manage all support tickets across projects"
  - "Clear Filters" button (appears when filters are active)

- **KPI Cards Section**:
  - Four clickable metric cards:
    - **Open**: Number of open tickets
    - **In Progress**: Tickets being worked on
    - **Closed**: Completed tickets
    - **Overdue**: Tickets with past follow-up dates
  - Clicking a card filters the table below

- **Middle Section** (Two-column layout):
  - **Left Column**: Ticket Status Breakdown (Donut Chart)
    - Visual representation of ticket statuses
    - Clickable slices to filter table
    - Color-coded (Blue: Open, Yellow: In Progress, Gray: Closed)
  
  - **Right Column**: Open Support Tickets Table
    - Displays OPEN and IN_PROGRESS tickets
    - Columns: Ticket Number, Project Name, Status, Created Date, Last Follow-up Date, View action
    - Clickable ticket numbers open detail drawer

- **Ticket Detail Drawer**:
  - Opens from the right side when viewing a ticket
  - Shows complete ticket information
  - Displays activity timeline
  - Actions: Add follow-up, Close ticket, Delete (Admin only)

#### Support Ticket Features

- **Create Ticket**: From project detail page
- **View Ticket**: Click ticket number or View button
- **Add Follow-up**: Add activity notes with optional follow-up date
- **Close Ticket**: Mark ticket as resolved
- **Filter Tickets**: Use KPI cards or chart slices

### Support Tickets in Project Details

- **Support Tickets Section**:
  - Located at the bottom of project detail page
  - Lists all tickets for the project
  - "Create Ticket" button
  - Table showing ticket number, title, status, created date
  - Actions: View, Close, Delete (Admin only)

## Filters and Search

### Search Functionality

#### Global Search (Projects Page)

- **Location**: Top row of filters section
- **Functionality**:
  - Real-time search with 500ms debounce
  - Searches across multiple fields:
    - Project ID
    - Customer name
    - Customer contact information
    - Project details
  - Automatically resets to page 1 when search changes
  - Clear search by deleting text

#### Search Tips

- Use partial matches (e.g., "solar" finds "Solar Energy")
- Search is case-insensitive
- Multiple words are searched independently
- Search works across related data (customer info, project details)

### Filter Options

#### Projects Page Filters

**Status Filter**:
- Multi-select dropdown
- Options: Lead, Site Survey, Proposal, Confirmed Order, Installation, Completed, Completed - Subsidy Credited, Lost
- Select multiple statuses to filter
- Shows count of selected items

**Type Filter**:
- Multi-select dropdown
- Options: EPC_PROJECT, RESALE, etc.
- Filter by project type
- Multiple selections allowed

**Project Service Type Filter**:
- Multi-select dropdown
- Options: EPC Project, Panel Cleaning, Maintenance, Repair, Consulting, Resale, Other Services
- Filter by service category
- Multiple selections allowed

**Support Ticket Status Filter**:
- Multi-select dropdown
- Options:
  - Has Tickets (Any Status)
  - Has Open Tickets
  - Has In-Progress Tickets
  - Has Closed Tickets
  - No Tickets
- Filter projects based on ticket status
- Available to all users

**Sales User Filter**:
- Multi-select dropdown (non-Sales users only)
- Lists all sales team members
- Filter projects by assigned salesperson
- Sales users see only their own projects automatically

#### Filter Behavior

- **Multiple Selections**: All filters support multiple selections
- **Combined Logic**: Filters use AND logic (all selected filters must match)
- **Persistence**: Filters remain active during navigation
- **Reset**: Clear individual filters or use "Clear All" option
- **Pagination**: Filters reset to page 1 when changed

#### Dashboard Filters

- **Financial Year (FY) Filter**:
  - Dropdown with available financial years
  - Multiple selections allowed
  - Updates metrics and charts

- **Month Filter**:
  - Dropdown with months
  - Multiple selections allowed
  - Filters data by month

### Sorting

#### Projects Table Sorting

- **Sortable Columns**: Most columns are sortable
- **Sort Indicators**: Arrows show sort direction
- **Default Sort**: Usually by creation date (newest first)
- **Multi-level Sort**: Click column header to sort
- **Sort Persistence**: Sort order maintained during navigation

### Filter Management

#### Applying Filters

1. Select filter options from dropdowns
2. Filters apply immediately
3. Table/data updates automatically
4. Pagination resets to page 1

#### Clearing Filters

- **Individual Filters**: Remove selections from dropdown
- **Clear All**: Reset all filters at once (if available)
- **Search**: Delete text to clear search
- **Support Tickets Dashboard**: Green "Clear Filters" button

#### Filter Tips

- Use multiple filters together for precise results
- Combine search with filters for targeted queries
- Save common filter combinations mentally for quick access
- Filters work together (AND logic)

## Navigation Tips

### Quick Navigation

- **Logo Click**: Always returns to Dashboard
- **Menu Items**: Direct access to main modules
- **Breadcrumbs**: Use browser back button to return
- **Keyboard**: Tab through elements, Enter to activate

### Efficient Workflow

1. Start at Dashboard for overview
2. Use filters to narrow down data
3. Click items to view details
4. Use browser back button to return to lists
5. Keep filters active while navigating details

### Keyboard Shortcuts

- **?**: Open Help documentation
- **Tab**: Navigate between form fields and buttons
- **Enter/Space**: Activate buttons and links
- **Esc**: Close modals and drawers (where applicable)

### Best Practices

- **Use Filters Early**: Apply filters before scrolling through long lists
- **Search First**: Use search to quickly find specific items
- **Bookmark Common Views**: Use browser bookmarks for frequently accessed pages
- **Clear Filters**: Reset filters when switching contexts
- **Check Permissions**: Understand what you can access based on your role

## Getting Help

- Press **?** from any page for context-sensitive help
- Click **Help** in the navigation menu
- Review role-specific guides
- Contact your administrator for access issues

## Troubleshooting Navigation

### Menu Items Missing

- Check your user role has necessary permissions
- Some items are role-specific
- Contact administrator if you need additional access

### Filters Not Working

- Clear all filters and reapply
- Check that you've selected valid options
- Refresh the page if filters seem stuck
- Contact support if issues persist

### Page Not Loading

- Check your internet connection
- Refresh the page
- Clear browser cache
- Try a different browser
- Contact administrator if problem continues
