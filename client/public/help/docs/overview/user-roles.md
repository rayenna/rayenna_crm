# User Roles

## Overview

Rayenna Energy CRM uses role-based access control to ensure users have appropriate access to features and data based on their responsibilities. Each role is designed to support specific business functions while maintaining data security and operational efficiency.

## Available Roles

### Sales

**Primary Responsibilities:**
- Manage customer relationships and leads
- Create and track projects from lead to confirmation
- Monitor sales pipeline and opportunities
- Generate proposals and quotes
- Create support tickets for customer issues
- Track sales performance and metrics

**Key Permissions:**
- Full access to customer management
- Create and manage own projects only
- View and edit projects assigned to them
- Create support tickets for their projects
- Access sales-specific dashboard
- Cannot delete records
- Cannot access other users' projects

**Typical Daily Usage:**
1. Review sales dashboard for leads and pipeline metrics
2. Check for new customer inquiries or leads
3. Create new projects when orders are confirmed
4. Update project status as sales progress
5. Create support tickets for customer service requests
6. Monitor sales performance and revenue metrics
7. Follow up on pending proposals and quotes

**Data Access:**
- Can view all customers
- Can only view and edit projects assigned to them
- Can create projects and link them to customers
- Cannot view projects assigned to other sales users

---

### Operations

**Primary Responsibilities:**
- Track project installations and progress
- Update project milestones and dates
- Manage installation schedules
- Handle customer service requests
- Monitor operational metrics
- Ensure projects progress smoothly

**Key Permissions:**
- View projects in installation and completion stages
- Update installation and completion dates
- Create and manage support tickets for any project
- Access operations-specific dashboard
- Cannot view early-stage projects (Lead, Site Survey, Proposal)
- Cannot delete records
- Cannot access financial exports

**Typical Daily Usage:**
1. Review operations dashboard for pending installations
2. Check projects requiring installation updates
3. Update installation dates and milestones
4. Track subsidy submission and credit status
5. Create support tickets for operational issues
6. Monitor installation completion rates
7. Update project status as work progresses

**Data Access:**
- Can view projects with status: Confirmed, Installation, Completed, Completed - Subsidy Credited
- Cannot view projects in early stages (Lead, Site Survey, Proposal)
- Can create support tickets for any project
- Can update project lifecycle dates

---

### Administrator (ADMIN)

**Primary Responsibilities:**
- Manage all system users and permissions
- Configure system settings
- Oversee all business operations
- Maintain data integrity
- Provide technical support
- Monitor system usage and security

**Key Permissions:**
- Full access to all modules and features
- User management (create, edit, delete users)
- Can view and edit all projects regardless of owner
- Can delete records when necessary
- Can add follow-ups to closed tickets
- Access to all dashboards and reports
- System configuration access

**Typical Daily Usage:**
1. Review system-wide metrics and performance
2. Manage user accounts and permissions
3. Monitor all projects and business operations
4. Handle escalated support tickets
5. Review and maintain data quality
6. Configure system settings as needed
7. Provide support to other users

**Data Access:**
- Full access to all data in the system
- Can view and edit all projects
- Can access all customer information
- Can manage all support tickets
- Can export all data

---

### Finance

**Primary Responsibilities:**
- Track revenue and payments
- Monitor outstanding balances
- Generate financial reports
- Export data for accounting software
- Analyze financial performance
- Manage payment status

**Key Permissions:**
- View financial data across all projects
- Access Tally export functionality
- View payment status and outstanding balances
- Access finance-specific dashboard
- Cannot create or edit projects
- Cannot manage support tickets
- Cannot delete records

**Typical Daily Usage:**
1. Review finance dashboard for revenue metrics
2. Check payment status and outstanding balances
3. Export financial data for accounting software
4. Generate financial reports
5. Track payment receipts
6. Monitor profitability metrics
7. Prepare data for accounting integration

**Data Access:**
- Can view all projects for financial information
- Can view payment and revenue data
- Can export financial data
- Cannot edit project details
- Cannot create projects or tickets

---

### Management

**Primary Responsibilities:**
- Monitor company-wide performance
- Analyze business trends and metrics
- Make strategic decisions
- Review executive dashboards
- Track key performance indicators
- Oversee business operations

**Key Permissions:**
- View all dashboards and analytics
- Access comprehensive reports
- View all projects and customers
- Read-only access to most modules
- Cannot create or edit records
- Cannot delete records
- Strategic insights and analytics

**Typical Daily Usage:**
1. Review executive dashboard for company metrics
2. Analyze business performance trends
3. Review project status and completion rates
4. Monitor revenue and profitability
5. Review customer and project data
6. Generate strategic reports
7. Make data-driven business decisions

**Data Access:**
- Can view all data for analysis
- Read-only access to projects and customers
- Full access to analytics and reports
- Cannot create, edit, or delete records

---

## Role Permissions Comparison

### Permission Matrix

A quick reference showing which features each role can access:

![Permission Matrix](/help/docs/overview/access_matrix.jpg)

### Module Access

| Module | ADMIN | SALES | OPERATIONS | FINANCE | MANAGEMENT |
|--------|-------|-------|------------|---------|------------|
| Dashboard | ✓ (All) | ✓ (Sales) | ✓ (Operations) | ✓ (Finance) | ✓ (Management) |
| Customers | ✓ (Full) | ✓ (Full) | ✓ (View) | ✓ (View) | ✓ (View) |
| Projects | ✓ (All) | ✓ (Own only) | ✓ (Limited statuses) | ✓ (View) | ✓ (View) |
| Support Tickets | ✓ (All) | ✓ (Own projects) | ✓ (All) | - | - |
| Tally Export | ✓ | - | - | ✓ | - |
| Users | ✓ | - | - | - | - |

### Action Permissions

| Action | ADMIN | SALES | OPERATIONS | FINANCE | MANAGEMENT |
|--------|-------|-------|------------|---------|------------|
| Create Projects | ✓ | ✓ (Own) | - | - | - |
| Edit Projects | ✓ (All) | ✓ (Own) | ✓ (Limited) | - | - |
| Delete Projects | ✓ | - | - | - | - |
| Create Tickets | ✓ | ✓ | ✓ | - | - |
| Close Tickets | ✓ | ✓ | ✓ | - | - |
| Add to Closed Tickets | ✓ | - | - | - | - |
| Export Data | ✓ | ✓ (Limited) | - | ✓ (Financial) | ✓ (Reports) |
| Manage Users | ✓ | - | - | - | - |

### Project Status Access

| Project Status | ADMIN | SALES | OPERATIONS | FINANCE | MANAGEMENT |
|----------------|-------|-------|------------|---------|------------|
| Lead | ✓ | ✓ | - | ✓ | ✓ |
| Site Survey | ✓ | ✓ | - | ✓ | ✓ |
| Proposal | ✓ | ✓ | - | ✓ | ✓ |
| Confirmed | ✓ | ✓ | ✓ | ✓ | ✓ |
| Installation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Completed | ✓ | ✓ | ✓ | ✓ | ✓ |
| Completed - Subsidy | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lost | ✓ | ✓ | - | ✓ | ✓ |

## Role Selection Guide

**Choose Sales if you:**
- Manage customer relationships
- Handle leads and proposals
- Create and track sales projects
- Need to monitor your sales pipeline

**Choose Operations if you:**
- Manage project installations
- Track installation progress
- Handle operational activities
- Update project milestones

**Choose Finance if you:**
- Manage financial records
- Track payments and revenue
- Export data for accounting
- Monitor financial performance

**Choose Management if you:**
- Need executive insights
- Review company performance
- Make strategic decisions
- Analyze business trends

**Choose Admin if you:**
- Manage system users
- Configure system settings
- Need full system access
- Provide technical support

## Changing Roles

Only Administrators can:
- Create new users
- Assign roles to users
- Modify user permissions
- Change existing user roles
- Activate or deactivate user accounts

**To Request Role Changes:**
Contact your system administrator with:
- Your current role
- Desired role or permissions
- Business justification
- Approval from your manager (if required)

## Security and Access

- Each role has specific permissions designed for job functions
- Access is automatically restricted based on your role
- You cannot access features outside your role's permissions
- Contact your administrator if you need additional access
- All access is logged for security and audit purposes

## Getting Help

If you have questions about your role or permissions:
- Press **?** or click **Help** for role-specific guidance
- Review the role-specific guides in the Help section
- Contact your system administrator for access issues
- Request training if you're new to your role
