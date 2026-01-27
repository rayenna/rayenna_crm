# Rayenna CRM - Training Guide & Launch Presentation
**Version 1.0 | Launch Date: January 26, 2026**

---

## Table of Contents
1. [Welcome & System Overview](#1-welcome--system-overview)
2. [Getting Started](#2-getting-started)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Core Modules & Features](#4-core-modules--features)
5. [Dashboard Guide](#5-dashboard-guide)
6. [Step-by-Step Workflows](#6-step-by-step-workflows)
7. [Advanced Features](#7-advanced-features)
8. [Best Practices](#8-best-practices)
9. [Troubleshooting](#9-troubleshooting)
10. [Support & Resources](#10-support--resources)

---

## 1. Welcome & System Overview

### What is Rayenna CRM?

**Rayenna CRM** is a comprehensive Customer Relationship Management and Project Operations system designed specifically for **Rayenna Energy Private Limited**, a solar EPC company. The system manages the entire project lifecycle from **Lead Capture → Sale → Project Execution → Subsidy Processing → Payment Tracking → Profitability Analysis**.

### Key Benefits

✅ **Centralized Data Management** - All customer and project information in one place  
✅ **Role-Based Access** - Secure access based on job function  
✅ **Real-Time Dashboards** - Instant insights into sales, operations, and finance  
✅ **Automated Calculations** - Profit, payments, and status updates calculated automatically  
✅ **Complete Audit Trail** - Track every change made to projects  
✅ **Tally Integration** - Export financial data for accounting  
✅ **AI-Powered Proposals** - Generate professional proposals automatically  
✅ **Support Ticket System** - Track and resolve customer issues  

### System Architecture

- **Frontend**: Modern React application with responsive design (works on laptop, tablet, mobile)
- **Backend**: Secure REST API with role-based authentication
- **Database**: PostgreSQL with comprehensive data relationships
- **Security**: JWT authentication, password encryption, audit logging

---

## 2. Getting Started

### First-Time Login

1. **Access the System**
   - Open your web browser
   - Navigate to: `https://rayenna-crm.onrender.com` (or your organization's URL)
   - You will see the login page with the Rayenna Energy logo

2. **Login Credentials**
   - Your administrator will provide your email and initial password
   - Enter your **Email** and **Password**
   - Click **"Sign in"**

3. **Change Your Password** (Recommended on first login)
   - After logging in, click on **"Change Password"** in the top menu
   - Enter your current password
   - Enter your new password (minimum 6 characters)
   - Confirm your new password
   - Click **"Change Password"**

### Password Reset

If you forget your password:
- **Contact your administrator** to request a password reset link
- Administrators can generate reset links from the **Users** page
- The reset link will be valid for **24 hours**
- Click the link to set a new password

### Navigation

The top navigation bar provides access to:
- **Dashboard** - Your role-specific dashboard
- **Customers** - Customer Master database
- **Projects** - All projects and leads
- **Support Tickets** - Customer support management
- **Tally Export** - Financial data export (Finance role only)
- **Users** - User management (Admin only)
- **Help** - Press `?` key or click Help menu for documentation

---

## 3. User Roles & Permissions

### ADMIN
**Full System Access**
- ✅ Create, edit, and delete users
- ✅ Reset user passwords
- ✅ Full access to all projects and customers
- ✅ Delete projects (with confirmation)
- ✅ Access all dashboards
- ✅ Export data to Tally
- ✅ Manage support tickets
- ⚠️ **Only one ADMIN user allowed in the system**

### SALES
**Lead & Customer Management**
- ✅ Create new customers and projects
- ✅ Edit projects in early stages (Lead, Site Survey, Proposal)
- ✅ Update sales & commercial details
- ✅ Add remarks and internal notes
- ✅ View payment information (read-only)
- ✅ Generate AI proposals
- ✅ Access Sales Dashboard
- ❌ Cannot edit projects after confirmation
- ❌ Cannot update payment information

### OPERATIONS
**Project Execution & Compliance**
- ✅ Update project lifecycle stages
- ✅ Upload compliance documents (MNRE, KSEB)
- ✅ Update installation and subsidy dates
- ✅ Edit projects in execution stages
- ✅ Manage support tickets
- ✅ Access Operations Dashboard
- ❌ Cannot update sales/commercial details
- ❌ Cannot update payment information

### FINANCE
**Payment & Financial Management**
- ✅ Update payment information (Advance, Payment 1-3, Last Payment)
- ✅ Export data to Tally (Excel, XML, JSON)
- ✅ View profitability metrics
- ✅ Access Finance Dashboard
- ✅ View all project financial data
- ❌ Cannot edit sales/commercial details
- ❌ Cannot update project execution milestones

### MANAGEMENT
**Read-Only Analytics**
- ✅ View comprehensive Management Dashboard
- ✅ Access all analytics and reports
- ✅ View project and customer data
- ❌ Cannot edit any data
- ❌ Cannot create new records

---

## 4. Core Modules & Features

### 4.1 Customer Master

**Purpose**: Centralized database of all customers

**Key Features**:
- Auto-generated 6-digit customer ID
- Complete contact information (name, address, phone, email)
- Location coordinates (latitude/longitude) with map selector
- ID Proof tracking (Aadhaar, PAN, etc.)
- Company details (for commercial customers)
- Salesperson assignment
- View all projects linked to a customer

**Access**: All roles can view; Sales, Operations, Finance, and Admin can create/edit

**How to Use**:
1. Navigate to **Customers** from the main menu
2. Click **"New Customer"** to create a new entry
3. Fill in customer details (required fields marked with *)
4. Use **Map Selector** to set location coordinates
5. Click **"Save Customer"**
6. To edit, click on a customer from the list

### 4.2 Projects Module

**Purpose**: Manage the complete project lifecycle

**Project Lifecycle Stages**:
1. **LEAD** - Initial inquiry
2. **SITE_SURVEY** - Site survey completed
3. **PROPOSAL** - Proposal sent to customer
4. **CONFIRMED** - Order confirmed
5. **UNDER_INSTALLATION** - Installation in progress
6. **SUBMITTED_FOR_SUBSIDY** - Subsidy application submitted
7. **COMPLETED** - Installation completed
8. **COMPLETED_SUBSIDY_CREDITED** - Subsidy received
9. **LOST** - Project lost (with reason tracking)

**Key Sections**:

#### A. Customer & Project Details
- Customer selection (link to Customer Master)
- Project Type: Residential Subsidy, Residential Non-Subsidy, Commercial Industrial
- Service Type: EPC Project, Panel Cleaning, Maintenance, Repair, etc.
- Lead Source: Website, Referral, Google, Channel Partner, etc.
- Salesperson assignment
- Auto-generated Serial Number (SL No)

#### B. Sales & Commercial
- System Capacity (kW)
- Project Cost
- Confirmation Date
- Loan Details
- Rooftop Type
- System Type: On-Grid, Off-Grid, Hybrid
- **Auto-calculated**: Expected Profit, Gross Profit, Profitability

#### C. Project Lifecycle
- Project Status (workflow stages)
- Panel Brand, Inverter Brand
- Panel Type: DCR, Non-DCR (auto-selected based on Project Type)
- MNRE Portal Registration Date
- KSEB Feasibility Date
- KSEB Registration Date
- Installation Completion Date
- Completion Report Submission Date
- Subsidy Request Date
- Subsidy Credited Date

#### D. Payment Tracking
- Advance Payment & Date
- Payment 1, 2, 3 & Dates
- Last Payment & Date
- **Auto-calculated**: Total Amount Received, Balance Amount, Payment Status

#### E. Key Artifacts
- Document uploads (categorized)
- Remarks section (internal notes)
- Support tickets linked to project

**Access Control**:
- **Sales**: Can edit projects in LEAD, SITE_SURVEY, PROPOSAL stages
- **Operations**: Can edit projects in execution stages
- **Finance**: Can only update payment information
- **Admin**: Full access to all projects

### 4.3 Support Tickets

**Purpose**: Track and resolve customer support issues

**Features**:
- Auto-generated ticket numbers
- Link tickets to specific projects
- Status tracking: OPEN → IN_PROGRESS → CLOSED
- Activity log with notes and follow-up dates
- Overdue ticket identification
- Status-based filtering

**How to Use**:
1. Navigate to **Support Tickets** from the main menu
2. Click **"Create New Ticket"**
3. Select the project, enter title and description
4. Add activities/notes as you work on the ticket
5. Set follow-up dates for reminders
6. Update status as you progress
7. Close ticket when resolved

**Access**: Admin, Sales, Operations can create and manage tickets

### 4.4 Tally Export

**Purpose**: Export financial data for accounting integration

**Export Formats**:
- **Excel** (.xlsx) - For manual import
- **JSON** - For API integration
- **XML** - For Tally direct import

**Export Data Includes**:
- Serial Number
- Customer Name
- Invoice Amount (Project Cost)
- Payment Received (Total Amount Received)
- Outstanding Balance

**Filters Available**:
- Date Range (From Date, To Date)
- Project Status
- Payment Status

**How to Use**:
1. Navigate to **Tally Export** (Finance role only)
2. Select export format (Excel/JSON/XML)
3. Apply filters if needed
4. Click **"Export"**
5. Download the file

**Access**: Finance and Admin roles only

### 4.5 Users Management

**Purpose**: Manage system users and access

**Features**:
- Create new users
- Assign roles (ADMIN, SALES, OPERATIONS, FINANCE, MANAGEMENT)
- Reset user passwords
- Delete users (with confirmation)
- **Single ADMIN Constraint**: Only one ADMIN user allowed

**How to Use**:
1. Navigate to **Users** (Admin only)
2. Click **"New User"** to create a user
3. Enter email, name, password, and select role
4. Click **"Create User"**
5. To reset password: Click **"Reset Password"** next to user
6. Copy the reset link and share with the user
7. To delete: Click **"Delete"** (with confirmation)

**Access**: Admin only

---

## 5. Dashboard Guide

### 5.1 Sales Dashboard

**Purpose**: Track sales performance and pipeline

**Key Metrics**:
- **Total Leads** - All leads in the system
- **Total Capacity** - Total kW capacity sold
- **Total Revenue** - Revenue from confirmed/completed projects
- **Total Pipeline** - Value of all active projects
- **Total Profit** - Expected profit from all projects

**Charts & Analytics**:
- **Project Value by Customer Segment** - Pie chart showing Residential Subsidy, Residential Non-Subsidy, Commercial Industrial breakdown
- **Project Value & Profit by Financial Year** - Bar chart with multi-year filtering
- **Customer Profitability Word Cloud** - Visual representation of profitable customers
- **Total Order Value by Sales Team Member** - Treemap showing salesperson performance
- **Revenue by Lead Source** - Bar chart showing revenue by lead source

**Filters**:
- Financial Year (multi-select)
- Month (active when single year selected)
- Clear selection option available

**Access**: Sales, Management, Admin

### 5.2 Operations Dashboard

**Purpose**: Track project execution and compliance

**Key Metrics**:
- **Pending Installation** - Projects awaiting installation
- **Pending Subsidy** - Projects with subsidy pending
- **Subsidy Credited** - Projects with subsidy received

**Charts**:
- **Project Value & Profit by Financial Year** - Track execution progress
- **Project Value by Customer Segment** - Segment-wise execution status

**Access**: Operations, Management, Admin

### 5.3 Finance Dashboard

**Purpose**: Financial overview and payment tracking

**Key Metrics**:
- **Total Revenue** - Total project value
- **Amount Received** - Total payments received
- **Outstanding Balance** - Total pending payments

**Features**:
- **Projects by Payment Status** - Breakdown of PENDING, PARTIAL, FULLY_PAID projects
- **Project Value & Profit by Financial Year** - Financial year analysis

**Filters**:
- Financial Year (multi-select)
- Month (active when single year selected)

**Access**: Finance, Management, Admin

### 5.4 Management Dashboard

**Purpose**: Comprehensive view of all business metrics

**Key Metrics** (5 cards):
- Total Leads
- Total Capacity (kW)
- Total Revenue
- Total Pipeline
- Total Profit

**Operations Metrics** (3 cards):
- Pending Installation
- Pending Subsidy
- Subsidy Credited

**Charts**:
- Project Value & Profit by Financial Year
- Project Value by Customer Segment (Pie Chart)
- Customer Profitability Word Cloud
- Total Order Value by Sales Team Member (Treemap)
- Revenue by Lead Source

**Filters**: All charts have independent filters for Financial Year and Month

**Access**: Management, Admin

---

## 6. Step-by-Step Workflows

### Workflow 1: Creating a New Lead (Sales)

1. **Navigate to Projects**
   - Click **"Projects"** in the main menu

2. **Create New Project**
   - Click **"New Project"** button

3. **Select or Create Customer**
   - If customer exists: Search and select from dropdown
   - If new customer: Click **"Create New Customer"** → Fill details → Save

4. **Fill Project Details**
   - **Project Type**: Select (Residential Subsidy/Non-Subsidy/Commercial)
   - **Service Type**: EPC Project (default)
   - **Lead Source**: Select source (Website, Referral, Google, etc.)
   - **Salesperson**: Auto-filled (your user)

5. **Update Sales & Commercial** (when available)
   - System Capacity (kW)
   - Project Cost
   - Confirmation Date (when order confirmed)
   - Rooftop Type
   - System Type

6. **Save Project**
   - Click **"Save Project"**
   - Project status will be **LEAD**

### Workflow 2: Moving Project Through Stages (Sales → Operations)

**Sales Stage (LEAD → CONFIRMED)**:
1. Update project status to **SITE_SURVEY** after survey
2. Generate **AI Proposal** (if in PROPOSAL stage)
3. Update status to **CONFIRMED** when order received
4. Fill in **Confirmation Date** and **Project Cost**

**Operations Stage (CONFIRMED → COMPLETED)**:
1. Update **MNRE Portal Registration Date**
2. Update **KSEB Feasibility Date** and **Registration Date**
3. Update **Installation Completion Date** when installation done
4. Update **Completion Report Submission Date**
5. Update **Subsidy Request Date**
6. Update status to **SUBMITTED_FOR_SUBSIDY**
7. Update **Subsidy Credited Date** when subsidy received
8. Update status to **COMPLETED_SUBSIDY_CREDITED**

### Workflow 3: Recording Payments (Finance)

1. **Navigate to Project**
   - Go to **Projects** → Click on project

2. **Update Payment Information**
   - Scroll to **Payment Tracking** section
   - Enter **Advance Payment** amount and date
   - Enter **Payment 1, 2, 3** amounts and dates as received
   - Enter **Last Payment** amount and date

3. **System Auto-Calculates**
   - Total Amount Received
   - Balance Amount
   - Payment Status (PENDING/PARTIAL/FULLY_PAID)

4. **Save Changes**
   - Click **"Save"** button
   - Payment information is updated

### Workflow 4: Generating AI Proposal (Sales)

1. **Navigate to Project**
   - Go to **Projects** → Click on project in **LEAD** or **PROPOSAL** stage

2. **Generate Proposal**
   - Click **"Proposal"** button (visible for Sales users)
   - System generates proposal using AI

3. **Review Proposal**
   - Preview the generated proposal
   - Check all details are correct

4. **Download/Share**
   - Download as PDF
   - Share with customer

**Note**: Requires OpenAI API key configured (optional feature)

### Workflow 5: Creating Support Ticket

1. **Navigate to Support Tickets**
   - Click **"Support Tickets"** in main menu

2. **Create New Ticket**
   - Click **"Create New Ticket"** button

3. **Fill Ticket Details**
   - Select **Project** (required)
   - Enter **Title** (required)
   - Enter **Description** (optional)
   - Click **"Create Ticket"**

4. **Manage Ticket**
   - Add **Activities** with notes and follow-up dates
   - Update **Status** (OPEN → IN_PROGRESS → CLOSED)
   - View **Activity History**

5. **Close Ticket**
   - When resolved, update status to **CLOSED**
   - Add final activity note

### Workflow 6: Exporting to Tally (Finance)

1. **Navigate to Tally Export**
   - Click **"Tally Export"** in main menu (Finance role only)

2. **Select Export Format**
   - Choose: **Excel**, **JSON**, or **XML**

3. **Apply Filters** (Optional)
   - Select **From Date** and **To Date**
   - Filter by **Project Status**
   - Filter by **Payment Status**

4. **Export**
   - Click **"Export"** button
   - File will download automatically

5. **Import to Tally**
   - Use the exported file in your Tally accounting system

---

## 7. Advanced Features

### 7.1 AI Proposal Generation

**What it does**: Automatically generates professional project proposals using AI

**When to use**: 
- After site survey is completed
- When sending proposal to customer
- Projects in LEAD or PROPOSAL stage

**How it works**:
1. System extracts project and customer details
2. Sends data to AI service (OpenAI)
3. Generates formatted proposal
4. Returns proposal for review and download

**Requirements**: OpenAI API key must be configured (optional)

### 7.2 Map Selector

**Purpose**: Set precise location coordinates for customers

**Features**:
- Interactive map interface
- Search by address
- Click to set coordinates
- Manual coordinate entry
- View existing locations

**How to use**:
1. In Customer Master, click **"Set Location on Map"**
2. Search for address or click on map
3. Coordinates auto-populate
4. Click **"Save Location"**

### 7.3 Remarks & Internal Notes

**Purpose**: Add internal comments and notes to projects

**Features**:
- **Remarks**: Visible to all users with project access
- **Internal Notes**: Sales-only, not visible to other roles
- Timestamp and user tracking
- Edit/delete own remarks only

**How to use**:
1. Navigate to project detail page
2. Scroll to **Remarks** section
3. Enter remark in text box
4. Click **"Add Remark"**
5. View all remarks with timestamps

### 7.4 Document Management

**Purpose**: Upload and organize project documents

**Supported File Types**:
- Images: JPEG, PNG, GIF
- Documents: PDF, Word, Excel
- Size Limit: 10MB per file

**Categories**:
- Proposal
- Contract
- Invoice
- Compliance (MNRE, KSEB)
- Installation Photos
- Other

**How to use**:
1. Navigate to project detail page
2. Scroll to **Key Artifacts** section
3. Click **"Upload Document"**
4. Select file, choose category, add description
5. Click **"Upload"**
6. View/download documents from list

### 7.5 Audit Trail

**Purpose**: Track all changes made to projects

**Features**:
- Automatic logging of all field changes
- User identification
- Timestamp for each change
- Old value and new value tracking
- Field-level change history

**How to view**:
1. Navigate to project detail page
2. Scroll to **Audit Log** section (if available)
3. View complete change history

### 7.6 Project Status Indicators

**Visual Status Indicators**:
- 🟢 **GREEN** - On track, no issues
- 🟡 **AMBER** - Attention needed, minor delays
- 🔴 **RED** - Critical, immediate action required

**Auto-calculated based on**:
- Project stage vs. expected timeline
- Payment status
- Subsidy status
- Installation progress

---

## 8. Best Practices

### Data Entry Best Practices

1. **Complete Customer Information**
   - Always fill in complete customer details
   - Use Map Selector for accurate location
   - Include ID Proof information

2. **Update Project Status Regularly**
   - Move projects through stages promptly
   - Update dates as milestones are completed
   - Keep payment information current

3. **Use Remarks Effectively**
   - Add notes for important decisions
   - Document customer communications
   - Note any special requirements

4. **Organize Documents**
   - Upload documents immediately after receipt
   - Use appropriate categories
   - Add descriptions for easy identification

5. **Lead Source Tracking**
   - Always select accurate lead source
   - Add details for Channel Partner/Referral/Other
   - Helps with marketing ROI analysis

### Dashboard Usage Tips

1. **Use Filters Effectively**
   - Filter by Financial Year for period analysis
   - Use Month filter for detailed monthly views
   - Clear filters to see overall picture

2. **Regular Monitoring**
   - Check dashboards daily
   - Monitor key metrics weekly
   - Review trends monthly

3. **Export Data**
   - Export dashboard data for presentations
   - Use Tally export for accounting
   - Keep backups of important reports

### Security Best Practices

1. **Password Management**
   - Use strong passwords (minimum 6 characters, but longer recommended)
   - Change password regularly
   - Never share passwords

2. **Role-Based Access**
   - Only access features relevant to your role
   - Don't attempt to edit restricted fields
   - Report access issues to Admin

3. **Data Privacy**
   - Don't share customer data outside system
   - Log out when finished
   - Use secure networks

### Collaboration Tips

1. **Support Tickets**
   - Create tickets for customer issues immediately
   - Add activities as you work on tickets
   - Set follow-up dates for reminders
   - Close tickets when resolved

2. **Remarks**
   - Use remarks to communicate with team
   - Add context for status changes
   - Document important decisions

3. **Project Updates**
   - Update project status promptly
   - Keep all dates current
   - Notify team of critical changes

---

## 9. Troubleshooting

### Common Issues & Solutions

#### Issue 1: Cannot Login
**Symptoms**: Login fails, error message appears

**Solutions**:
- Verify email and password are correct
- Check for caps lock
- Contact administrator for password reset
- Clear browser cache and cookies

#### Issue 2: Cannot Edit Project
**Symptoms**: Edit button not visible or fields disabled

**Solutions**:
- Check your role permissions
- Verify project is in editable stage (Sales can only edit early stages)
- Check if project is in LOST status (cannot be edited)
- Contact Admin if you believe you should have access

#### Issue 3: Dashboard Not Loading
**Symptoms**: Dashboard shows loading or no data

**Solutions**:
- Check internet connection
- Refresh the page
- Clear browser cache
- Check if filters are too restrictive
- Contact IT support if issue persists

#### Issue 4: Document Upload Fails
**Symptoms**: Error when uploading document

**Solutions**:
- Check file size (must be under 10MB)
- Verify file type is supported (images, PDF, Word, Excel)
- Try a different file
- Check internet connection
- Contact IT support if issue persists

#### Issue 5: Chart Disappears on Zoom
**Symptoms**: Pie chart or other charts disappear when zooming

**Solutions**:
- Refresh the page
- This issue has been fixed in latest version
- If persists, contact IT support

#### Issue 6: Password Reset Link Not Working
**Symptoms**: Reset link shows "Invalid or Expired Token"

**Solutions**:
- Check if link is older than 24 hours (expired)
- Verify link was copied completely
- Request new reset link from administrator
- Check if link was already used

#### Issue 7: Cannot See Certain Menu Items
**Symptoms**: Menu items missing from navigation

**Solutions**:
- Check your user role
- Some features are role-specific:
  - Tally Export: Finance and Admin only
  - Users: Admin only
  - Support Tickets: Admin, Sales, Operations only
- Contact Admin if you need access

#### Issue 8: Data Not Saving
**Symptoms**: Changes not persisting after save

**Solutions**:
- Check for validation errors (red text)
- Verify required fields are filled
- Check internet connection
- Try refreshing and re-entering data
- Contact IT support if issue persists

### Getting Help

1. **Help Section**
   - Press `?` key anywhere in the system
   - Or click **Help** in the menu
   - Browse documentation and FAQs

2. **Contact Administrator**
   - For access issues
   - For password resets
   - For role/permission questions

3. **IT Support**
   - For technical issues
   - For system errors
   - For feature requests

---

## 10. Support & Resources

### Quick Reference

**System URL**: `https://rayenna-crm.onrender.com` (or your organization's URL)

**Default Roles**:
- ADMIN: Full system access
- SALES: Lead and customer management
- OPERATIONS: Project execution tracking
- FINANCE: Payment and financial management
- MANAGEMENT: Read-only analytics

**Key Shortcuts**:
- Press `?` - Open Help
- Press `Esc` (on Help page) - Return to Dashboard

### Important Contacts

- **System Administrator**: [Your Admin Contact]
- **IT Support**: [Your IT Contact]
- **Training Support**: [Your Training Contact]

### Additional Resources

- **User Manual**: Available in Help section (`?` key)
- **Video Tutorials**: [If available]
- **FAQ**: Available in Help section

### System Information

- **Version**: 1.0
- **Launch Date**: January 26, 2026
- **Browser Support**: Chrome, Firefox, Edge, Safari (latest versions)
- **Mobile Support**: Responsive design works on tablets and mobile phones

---

## Appendix A: Project Status Workflow

```
LEAD
  ↓
SITE_SURVEY
  ↓
PROPOSAL
  ↓
CONFIRMED
  ↓
UNDER_INSTALLATION
  ↓
SUBMITTED_FOR_SUBSIDY
  ↓
COMPLETED
  ↓
COMPLETED_SUBSIDY_CREDITED

Alternative Path:
LEAD → LOST (with reason tracking)
```

---

## Appendix B: Payment Status Logic

**PENDING**: No payments received  
**PARTIAL**: Some payments received, but not full amount  
**FULLY_PAID**: Total payments equal or exceed project cost  

**Auto-calculated from**:
- Advance Payment
- Payment 1, 2, 3
- Last Payment

---

## Appendix C: Panel Type Auto-Selection

**Residential Subsidy** → **DCR** (Default)  
**Residential Non-Subsidy** → **Non-DCR** (Default)  
**Commercial Industrial** → **Non-DCR** (Default)  

*Note: Can be changed manually after creation*

---

## Appendix D: Financial Year

**Indian Financial Year**: April to March

**Example**:
- FY 2024-25: April 2024 to March 2025
- FY 2025-26: April 2025 to March 2026

All financial reports and filters use this format.

---

## Launch Checklist

### For Administrators

- [ ] All users created with appropriate roles
- [ ] Initial passwords set and shared securely
- [ ] Users trained on their role-specific features
- [ ] Test data loaded (if needed)
- [ ] Backup procedures in place
- [ ] Support contact information shared

### For Users

- [ ] Login credentials received
- [ ] First login successful
- [ ] Password changed
- [ ] Role-specific training completed
- [ ] Help section reviewed
- [ ] Test project created (if applicable)

---

## Questions & Answers Session

**Prepare for launch by reviewing**:
1. Your role and permissions
2. Key workflows for your job function
3. Dashboard metrics relevant to you
4. How to get help when needed

**Common Launch Questions**:

**Q: What if I can't access a feature I need?**  
A: Contact your administrator to verify your role and permissions.

**Q: Can I use the system on my phone?**  
A: Yes, the system is responsive and works on mobile devices.

**Q: What happens if I make a mistake?**  
A: Most fields can be edited. Check audit logs to see change history. Contact Admin for critical corrections.

**Q: How often should I update project status?**  
A: Update status as soon as milestones are completed to keep data current.

**Q: Can I export my dashboard data?**  
A: Yes, use browser print/save features or contact Finance for Tally exports.

---

## Conclusion

**Rayenna CRM** is designed to streamline your workflow and provide real-time insights into your business operations. 

**Key Takeaways**:
- ✅ System is role-based - use features relevant to your job
- ✅ Data is centralized - all information in one place
- ✅ Automation handles calculations - focus on data entry
- ✅ Dashboards provide insights - monitor performance regularly
- ✅ Help is available - press `?` or contact support

**Welcome to Rayenna CRM!** 🚀

---

**Document Version**: 1.0  
**Last Updated**: January 25, 2026  
**Prepared for**: Rayenna Energy Private Limited Launch  
**Contact**: [Your Contact Information]
