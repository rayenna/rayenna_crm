# Common Actions Guide

This guide covers the most frequently performed actions in Rayenna Energy CRM. These are tasks you'll likely perform daily as part of your workflow.

## Creating Records

### Creating a New Customer

**Who can create**: Sales users and Administrators

**Steps**:
1. Navigate to **Customers** page from the top menu
2. Click the **New Customer** button (top right)
3. Fill in the customer form:
   - **Required fields**:
     - Customer Name or Individual Name fields (Prefix, First Name, Last Name)
     - Customer Type (Residential, Apartment, Commercial)
     - At least one contact number
   - **Optional fields**:
     - Middle Name
     - Email address
     - Address details (Country, State, City, Pin Code)
     - Consumer Number
     - Map coordinates (for location mapping)
4. Click **Save** to create the customer
5. You'll see a success message confirming the customer was created

**Tips**:
- Customer ID is automatically generated
- You can add multiple contact numbers
- Use the map selector to set location coordinates
- Save frequently to avoid losing data

### Creating a New Project

**Who can create**: Sales users and Administrators

**Steps**:
1. Navigate to **Projects** page from the top menu
2. Click the **Create Project** button (top right)
3. Fill in the project form:
   - **Select Customer**: Choose from existing customers or create new
   - **Project Details**:
     - Project Type (Residential Subsidy, Residential Non-Subsidy, Commercial/Industrial)
     - Project Service Type (EPC Project, Panel Cleaning, Maintenance, etc.)
     - System Capacity (in kW)
     - Project Value
     - Lead Source
   - **Sales & Commercial**:
     - Project Status (Lead, Site Survey, Proposal, etc.)
     - Assign Salesperson (if you're Admin)
   - **Project Lifecycle Dates** (optional):
     - Installation dates
     - Completion dates
     - Subsidy dates
4. Upload documents if needed (Photos/Videos, Documents, Sheets)
5. Click **Save** to create the project
6. You'll be redirected to the project detail page

**Tips**:
- Project ID is automatically generated
- You can upload multiple files during creation
- Set initial status based on project stage
- Link to customer is required

### Creating a Support Ticket

**Who can create**: Sales users, Operations users, and Administrators

**From Project Detail Page**:
1. Navigate to a project's detail page
2. Scroll to the **Support / Service Tickets** section
3. Click **Create Ticket** button
4. Fill in the ticket form:
   - **Title**: Brief description of the issue (required)
   - **Description**: Detailed explanation (optional)
5. Click **Create** to create the ticket
6. Ticket number is automatically generated (format: RE########)

**Tips**:
- Tickets are linked to the project
- You can add follow-ups after creation
- Ticket status starts as "Open"
- Only tickets for your projects are visible (Sales users)

### Creating a User (Admin Only)

**Who can create**: Administrators only

**Steps**:
1. Navigate to **Users** page from the top menu
2. Click **Create User** button
3. Fill in user details:
   - **Email**: User's email address (used for login)
   - **Name**: Full name
   - **Password**: Temporary password (user will change on first login)
   - **Role**: Select from Sales, Operations, Finance, Management, or Admin
4. Click **Save** to create the user
5. Share login credentials with the new user

**Tips**:
- Email must be unique
- Password must be at least 6 characters
- User will be prompted to change password on first login
- Role determines what features the user can access

## Editing Data

### Editing Customer Information

**Who can edit**: Sales users and Administrators

**Steps**:
1. Navigate to **Customers** page
2. Find the customer using search or filters
3. Click the **Edit** button next to the customer
4. Modify the fields you need to update
5. Click **Save** to apply changes
6. You'll see a success message confirming the update

**What can be edited**:
- Customer name and contact information
- Address details
- Contact numbers
- Map coordinates
- Consumer number

**Restrictions**:
- Customer ID cannot be changed (auto-generated)
- Some fields may be read-only based on your role

### Editing Project Information

**Who can edit**: Varies by role and project status

**Steps**:
1. Navigate to **Projects** page
2. Find the project using search or filters
3. Click on the project or click **View** button
4. On the project detail page, click **Edit** button
5. Modify the fields you need to update
6. Click **Save** to apply changes

**Role-Based Editing**:
- **Sales users**: Can edit their own projects (not in Lost status)
- **Operations users**: Can edit projects in installation/completion stages
- **Admin users**: Can edit all projects
- **Finance users**: Read-only access
- **Management users**: Read-only access

**What can be edited**:
- Project status and details
- Financial information
- Project lifecycle dates
- Salesperson assignment
- Lead source
- Documents (upload/delete)

**Restrictions**:
- Projects in "Lost" status cannot be edited (except by Admin for deletion)
- Some fields are role-specific
- Project ID cannot be changed

### Editing Support Tickets

**Who can edit**: Sales users, Operations users, and Administrators

**Adding Follow-ups**:
1. Open the ticket (from project detail page or Support Tickets Dashboard)
2. Scroll to **Activities** section
3. Enter a note in the "Add Follow-up" form
4. Optionally set a follow-up date
5. Click **Add Follow-up** to save

**Updating Ticket Status**:
1. Open the ticket
2. Click **Close Ticket** button to mark as resolved
3. Ticket status changes to "Closed"
4. Only Admin can add follow-ups to closed tickets

**What can be edited**:
- Ticket status (Open → In Progress → Closed)
- Follow-up notes and dates
- Ticket cannot be reopened once closed

### Editing User Information (Admin Only)

**Who can edit**: Administrators only

**Steps**:
1. Navigate to **Users** page
2. Find the user in the list
3. Click **Edit** button
4. Modify user details:
   - Name
   - Email
   - Role
   - Password (optional - leave blank to keep current)
5. Click **Save** to apply changes

**Tips**:
- Email must remain unique
- Changing role affects user permissions immediately
- Password changes require new login

## Applying Filters

### Using Search

**Where available**: Customers page, Projects page

**Steps**:
1. Locate the search bar (top of filter section)
2. Type your search term
3. Results update automatically after 500ms (debounce)
4. Search works across multiple fields:
   - Customer name, ID, consumer number
   - Project ID, customer information
5. Clear search by deleting all text

**Search Tips**:
- Search is case-insensitive
- Partial matches work (e.g., "solar" finds "Solar Energy")
- Multiple words are searched independently
- Search combines with other filters

### Applying Project Filters

**Available Filters**:
- **Status**: Filter by project status (Lead, Proposal, Confirmed, etc.)
- **Type**: Filter by project type (Residential Subsidy, Commercial, etc.)
- **Project Service Type**: Filter by service category
- **Support Ticket Status**: Filter projects with/without tickets
- **Sales User**: Filter by assigned salesperson (non-Sales users)

**Steps**:
1. Navigate to **Projects** page
2. Locate filter dropdowns in the filter section
3. Click on a filter dropdown
4. Select one or more options (multi-select)
5. Filters apply immediately
6. Table updates to show filtered results
7. Pagination resets to page 1

**Filter Behavior**:
- Multiple selections allowed in each filter
- All filters use AND logic (all must match)
- Filters persist during navigation
- Clear individual filters by deselecting options

### Applying Customer Filters

**Available Filters**:
- **Sales User Filter** (non-Sales users): Filter by salesperson
- **My Customers** (Sales users): Toggle between "My Customers" and "All Customers"
- **Search**: Text search across customer fields

**Steps**:
1. Navigate to **Customers** page
2. Use search bar for text search
3. For Sales users: Toggle "My Customers" / "All Customers"
4. For other users: Select salesperson(s) from dropdown
5. Results update automatically

### Applying Dashboard Filters

**Available Filters**:
- **Financial Year (FY)**: Select one or more financial years
- **Month**: Select one or more months

**Steps**:
1. Navigate to **Dashboard**
2. Locate filter dropdowns at the top
3. Select FY and/or Month options
4. Metrics and charts update automatically
5. Filters persist during your session

**Tips**:
- Select multiple FYs to compare periods
- Combine FY and Month for precise filtering
- Clear filters to see all data

### Clearing Filters

**Methods**:
1. **Individual Filters**: Deselect options in dropdown
2. **Search**: Delete text in search bar
3. **Clear All**: Use "Clear Filters" button (where available)
4. **Support Tickets Dashboard**: Green "Clear Filters" button in header

**Tips**:
- Filters reset pagination to page 1
- Clearing filters shows all records
- Some pages remember last filter state

## Downloading Documents

### Downloading Project Documents

**Who can download**: All users with project access

**Steps**:
1. Navigate to a project's detail page
2. Scroll to **Documents** section
3. Find the document you want to download
4. Click the **Download** button (download icon) next to the document
5. File downloads to your default download folder
6. You'll see a success message

**Supported File Types**:
- PDF documents
- Images (JPG, PNG, GIF, WebP, BMP)
- Videos (MP4, MPEG, QuickTime, AVI)
- Office documents (Word, Excel, PowerPoint)
- Text files (TXT, CSV)

**Tips**:
- Large files may take time to download
- Check your browser's download settings
- Documents are stored securely in the cloud

### Exporting Data to Excel/CSV

**Who can export**: Administrators (Projects and Customers)

**Exporting Projects**:
1. Navigate to **Projects** page
2. Apply any filters you want to include in export
3. Click **Export to Excel** or **Export to CSV** button
4. Read and accept the export confirmation dialog
5. Click **Confirm Export**
6. File downloads automatically
7. File name format: `projects-export-[timestamp].xlsx` or `.csv`

**Exporting Customers**:
1. Navigate to **Customers** page
2. Apply any filters you want to include
3. Click **Export to Excel** or **Export to CSV** button
4. Read and accept the export confirmation dialog
5. Click **Confirm Export**
6. File downloads automatically
7. File name format: `customers-export-[timestamp].xlsx` or `.csv`

**Export Confirmation**:
- You must confirm that:
  - You are authorized to export the data
  - You have management approval
  - You understand data is company property
- Export includes all currently filtered data
- Large exports may take time to generate

**Tips**:
- Apply filters before exporting to get specific data
- Excel format preserves formatting better
- CSV is better for data analysis tools
- Exports respect your role-based data access

### Tally Export (Finance Users)

**Who can export**: Finance users and Administrators

**Steps**:
1. Navigate to **Tally Export** from the top menu
2. Review the financial data displayed
3. Click **Export to Tally** button
4. File downloads in Tally-compatible format
5. Import into Tally accounting software

**Tips**:
- Tally export includes all financial project data
- Format is compatible with Tally software
- Use for accounting and financial reporting

## Logging Out Securely

### Standard Logout Process

**Steps**:
1. Click on your name in the top right corner of the navigation bar
2. Click **Logout** button
3. You'll be redirected to the login page
4. Your session is ended securely

**Desktop View**:
- Logout button is visible in the top navigation bar
- Located next to "Change Password"

**Mobile View**:
- Open hamburger menu (☰)
- Tap **Logout** option
- Session ends and redirects to login

### Security Best Practices

**Always Log Out When**:
- You've finished your work session
- Using a shared or public computer
- Stepping away from your workstation
- Switching between user accounts
- At the end of your workday

**Session Security**:
- Sessions may timeout after inactivity
- Logging out immediately ends your session
- No one else can access your account after logout
- All unsaved work should be saved before logging out

**Tips**:
- Save your work before logging out
- Close browser tabs after logout on shared computers
- Don't leave your computer logged in unattended
- Use strong passwords and change them regularly

### What Happens When You Log Out

- Your authentication session is terminated
- You're redirected to the login page
- Any unsaved form data may be lost (save first!)
- You must log in again to access the system
- Your role and permissions are cleared from the session

## Best Practices for Daily Actions

### Data Entry

- **Save frequently**: Don't wait until the end to save
- **Verify information**: Double-check important data before saving
- **Use required fields**: Ensure all mandatory fields are filled
- **Review before submitting**: Check forms for accuracy

### Searching and Filtering

- **Use search first**: Quick way to find specific records
- **Combine filters**: Use multiple filters for precise results
- **Clear filters**: Reset when switching contexts
- **Save common filters**: Remember frequently used filter combinations

### Document Management

- **Organize uploads**: Use appropriate categories (Photos, Documents, Sheets)
- **Add descriptions**: Help others understand document purpose
- **Download before deleting**: Keep backups of important documents
- **Check file sizes**: Large files may take time to upload/download

### Security

- **Log out when done**: Always end your session securely
- **Don't share credentials**: Keep your password private
- **Report suspicious activity**: Contact administrator immediately
- **Use secure networks**: Avoid public Wi-Fi for sensitive work

### Efficiency Tips

- **Use keyboard shortcuts**: Tab to navigate, Enter to submit
- **Bookmark common pages**: Save frequently accessed pages
- **Use Help (F1)**: Quick access to context-sensitive help
- **Learn your role's features**: Focus on tools available to you

## Troubleshooting Common Issues

### Cannot Create Record

- **Check permissions**: Verify your role allows creation
- **Required fields**: Ensure all mandatory fields are filled
- **Validation errors**: Check for error messages
- **Contact admin**: If permissions seem incorrect

### Cannot Edit Record

- **Check ownership**: Sales users can only edit own projects
- **Check status**: Some statuses prevent editing (e.g., Lost)
- **Check role**: Verify your role has edit permissions
- **Refresh page**: Try refreshing if edit button doesn't appear

### Filters Not Working

- **Clear and reapply**: Remove all filters and try again
- **Check selections**: Ensure options are actually selected
- **Refresh page**: Reload if filters seem stuck
- **Check search**: Clear search if combined with filters

### Download Not Working

- **Check browser settings**: Verify downloads are allowed
- **Check file size**: Large files may take time
- **Try different format**: Use CSV if Excel fails
- **Check permissions**: Verify you have access to the data

### Cannot Log Out

- **Try browser back**: Navigate away from the page
- **Close browser**: Force close if logout button doesn't work
- **Clear cache**: Clear browser cache and cookies
- **Contact support**: If logout consistently fails

## Getting Help

- Press **F1** from any page for context-sensitive help
- Click **Help** in the navigation menu
- Review role-specific guides
- Contact your administrator for access issues
- Check troubleshooting sections in help documentation
