# Sales User Guide

## Welcome

This guide is designed specifically for Sales users of Rayenna Energy CRM. It covers everything you need to know to effectively manage your leads, projects, and customer relationships.

## Your Dashboard

### Overview

Your dashboard is your command center. It shows key metrics about your sales performance at a glance.

### Key Metrics

**Top Row Metrics**:
- **Total Leads**: Number of potential customers you're working with
- **Total Capacity**: Combined system capacity (in kilowatts) across all your projects
- **Total Revenue**: Total value of all your confirmed and completed projects
- **Total Pipeline**: Combined value of all projects in progress (from Lead to Confirmed stages)
- **Approved Projects**: Number of projects that have been confirmed by customers

**Second Row Metrics**:
- **Site Survey Stage**: Projects currently in site survey phase
- **Proposal Stage**: Projects where proposals have been sent
- **At Risk**: Projects that may be at risk of being lost

### Charts and Visualizations

- **Project Value and Profit by Financial Year**: See how your sales performance has changed over time
- **Project Value by Segment**: Visual breakdown of your projects by type (Residential Subsidy, Commercial, etc.)
- **Customer Profitability**: Word cloud showing your most profitable customers

### Using Dashboard Filters

- Select **Financial Year** to view data for specific periods
- Select **Month** to narrow down to specific months
- Filters help you analyze trends and plan your sales strategy

## Lead Creation and Management

### What is a Lead?

A lead is a potential customer who has shown interest in solar energy solutions. Leads are the starting point of your sales process.

### Creating a New Lead

**Step 1: Create the Customer**
1. Go to **Customers** page from the top menu
2. Click **New Customer** button
3. Fill in customer information:
   - Customer name (or individual name with prefix, first name, last name)
   - Customer type (Residential, Apartment, or Commercial)
   - Contact information (at least one phone number is required)
   - Address details (optional but recommended)
4. Click **Save**

**Step 2: Create the Project (Lead)**
1. Go to **Projects** page
2. Click **Create Project** button
3. Select the customer you just created (or choose existing customer)
4. Fill in project details:
   - **Project Type**: Choose Residential Subsidy, Residential Non-Subsidy, or Commercial/Industrial
   - **Project Service Type**: Select EPC Project, Panel Cleaning, Maintenance, etc.
   - **System Capacity**: Enter the capacity in kilowatts (kW)
   - **Project Value**: Enter the total project value
   - **Lead Source**: Select where this lead came from (Website, Referral, Google, etc.)
   - **Project Status**: Set to "Lead" for new leads
5. Click **Save**

### Managing Your Leads

**Viewing Your Leads**:
- Go to **Projects** page
- Filter by status: Select "Lead" from the Status filter
- You'll see all your leads in the table

**Updating Lead Information**:
1. Find the lead in your projects list
2. Click on the project or click **View**
3. Click **Edit** button
4. Update any information as needed
5. Click **Save**

**Moving Leads Forward**:
- Update the **Project Status** as the lead progresses:
  - **Lead** → **Site Survey** (when you visit the customer)
  - **Site Survey** → **Proposal** (when you send a proposal)
  - **Proposal** → **Confirmed Order** (when customer approves)

### Lead Source Tracking

Always select the correct **Lead Source** when creating a project. This helps the company understand which marketing channels are most effective:
- **Website**: Customer found us through our website
- **Referral**: Existing customer or partner referred them
- **Google**: Found us through Google search or ads
- **Channel Partner**: Came through a business partner
- **Digital Marketing**: Social media or online campaigns
- **Sales**: Direct sales effort
- **Management Connect**: Management team connection
- **Other**: Any other source

### Best Practices for Lead Management

- **Create leads immediately**: Don't wait - enter leads as soon as you get them
- **Keep information accurate**: Update customer contact details regularly
- **Track lead source**: Always select the correct lead source
- **Update status promptly**: Move leads through stages as they progress
- **Follow up regularly**: Use the system to track when you last contacted each lead

## Project Lifecycle

### Understanding Project Stages

Projects move through several stages from initial lead to completion. Here's what each stage means:

**1. Lead**
- Initial contact with potential customer
- Customer has shown interest
- No commitment yet

**2. Site Survey**
- You've visited the customer's location
- Assessed feasibility
- Discussed requirements

**3. Proposal**
- You've sent a formal proposal to the customer
- Waiting for customer decision
- Proposal includes pricing and specifications

**4. Confirmed Order**
- Customer has approved the proposal
- Order is confirmed
- Project moves to installation phase

**5. Installation**
- Installation work has begun
- System is being installed at customer site
- Operations team takes over

**6. Completed**
- Installation is finished
- System is operational
- Waiting for subsidy processing (if applicable)

**7. Completed - Subsidy Credited**
- Subsidy has been received
- Project is fully complete
- All payments and subsidies processed

**8. Lost**
- Customer decided not to proceed
- Project will not move forward
- Record kept for reporting purposes

### Updating Project Status

**When to Update Status**:
- Move to **Site Survey** when you complete the site visit
- Move to **Proposal** when you send the proposal document
- Move to **Confirmed Order** when customer approves
- Move to **Lost** if customer decides not to proceed

**How to Update**:
1. Open the project detail page
2. Click **Edit**
3. Find **Project Status** in the Sales & Commercial section
4. Select the new status
5. Click **Save**

### Project Lifecycle Dates

The system tracks important dates throughout the project lifecycle. Some dates are updated by you, others by Operations team:

**Sales Team Updates**:
- Confirmation date (when customer confirmed)
- Lost date (if project is lost)

**Operations Team Updates**:
- MNRE Portal Registration date
- Feasibility Date (DISCOM)
- Registration Date (DISCOM)
- Installation Completion date
- Completion Report Submission date
- Net Meter Installation date
- Subsidy Credited date

**Viewing Lifecycle Dates**:
- Go to project detail page
- Scroll to **Project Lifecycle** section
- All dates are displayed there

### Managing Lost Projects

If a customer decides not to proceed:
1. Open the project
2. Click **Edit**
3. Change status to **Lost**
4. Select **Lost Reason**:
   - Lost to Competition
   - No Budget
   - Indefinitely Delayed
   - Other
5. Enter **Lost Date**
6. Click **Save**

**Important**: Once a project is marked as Lost, you cannot edit it further. Only Administrators can delete lost projects.

## Revenue and Profit Visibility

### Viewing Project Financials

**On Project Detail Page**:
- **Project Value**: Total value of the project
- **Total Project Cost**: Cost to complete the project
- **Expected Profit**: Calculated profit (Project Value - Total Project Cost)
- **Final Profit**: Actual profit after all costs

**On Dashboard**:
- **Total Revenue**: Sum of all your project values
- **Total Pipeline**: Combined value of active projects
- **Project Value by Financial Year**: See revenue trends over time

### Understanding Profit Calculations

**Expected Profit**:
- Calculated automatically when you enter Project Value and Total Project Cost
- Formula: Project Value - Total Project Cost
- This is the estimated profit before project completion

**Final Profit**:
- Calculated after project completion
- Includes all actual costs and payments
- More accurate than expected profit

### Payment Information

**What You Can See**:
- Payment status (Pending, Partial, Fully Paid)
- Total amount received
- Outstanding balance
- Payment milestones (Advance, Payment 1, Payment 2, Payment 3, Last Payment)

**What You Cannot Do**:
- You cannot update payment information (Finance team handles this)
- You can only view payment details

**Viewing Payments**:
1. Open any project
2. Scroll to **Financial Information** section
3. View payment status and amounts

### Revenue Tracking

**On Your Dashboard**:
- See total revenue across all your projects
- Filter by Financial Year to see revenue by period
- Compare revenue across different time periods

**In Projects List**:
- Each project shows its value
- Sort by value to see highest value projects
- Filter to see projects in specific value ranges

### Best Practices for Financial Tracking

- **Enter accurate project values**: This affects revenue calculations
- **Update project costs**: Help Operations team with accurate cost tracking
- **Monitor payment status**: Keep track of which customers have paid
- **Review dashboard regularly**: Track your revenue performance

## Support Ticket Visibility

### What are Support Tickets?

Support tickets are used to track customer service requests and issues. They help ensure customer problems are resolved promptly.

### Creating Support Tickets

**When to Create a Ticket**:
- Customer reports an issue
- Customer requests service or support
- Follow-up is needed on a customer concern
- You need to track a customer service request

**How to Create**:
1. Open the project for which you need to create a ticket
2. Scroll to **Support / Service Tickets** section
3. Click **Create Ticket** button
4. Enter:
   - **Title**: Brief description of the issue (required)
   - **Description**: Detailed explanation (optional)
5. Click **Create**

**Ticket Number**:
- Each ticket gets a unique number (format: RE followed by 8 digits)
- Use this number when discussing tickets with Operations team

### Viewing Your Support Tickets

**From Project Detail Page**:
- Scroll to **Support / Service Tickets** section
- See all tickets for that project
- View ticket status (Open, In Progress, Closed)

**From Support Tickets Dashboard**:
1. Go to **Support Tickets** from top menu
2. View all tickets for all your projects
3. See ticket statistics and status breakdown

### Ticket Status

**Open**:
- Ticket just created
- Issue not yet addressed
- Needs attention

**In Progress**:
- Someone is working on the issue
- Ticket is being actively handled

**Closed**:
- Issue has been resolved
- Ticket is complete
- No further action needed

### Adding Follow-ups

**When to Add Follow-ups**:
- You have an update on the issue
- Customer provided more information
- You need to schedule a follow-up date
- You want to add notes about progress

**How to Add**:
1. Open the ticket (from project page or Support Tickets Dashboard)
2. Scroll to **Activities** section
3. Enter your note in the "Add Follow-up" form
4. Optionally set a **Follow-up Date** if action is needed later
5. Click **Add Follow-up**

### Closing Tickets

**When to Close**:
- Customer confirms issue is resolved
- Problem has been fixed
- No further action needed

**How to Close**:
1. Open the ticket
2. Click **Close Ticket** button
3. Ticket status changes to "Closed"
4. Ticket cannot be reopened (only Admin can add notes to closed tickets)

### Best Practices for Support Tickets

- **Create tickets promptly**: Don't delay when customer reports issues
- **Use clear titles**: Make it easy to understand the issue
- **Add detailed descriptions**: Provide context and background
- **Set follow-up dates**: Schedule when action is needed
- **Close tickets promptly**: Mark resolved when customer confirms
- **Monitor ticket status**: Check regularly for updates

## Best Practices

### Daily Workflow

**Start of Day**:
1. Check your dashboard for new metrics
2. Review projects that need attention
3. Check for any new support tickets
4. Plan your day based on priorities

**During the Day**:
1. Create new leads as you get them
2. Update project status as leads progress
3. Create support tickets for customer issues
4. Add follow-ups to existing tickets
5. Update customer information as needed

**End of Day**:
1. Review your dashboard metrics
2. Update any project statuses
3. Close any resolved support tickets
4. Ensure all customer information is current

### Data Entry Best Practices

**Accuracy**:
- Double-check all numbers (capacity, project value, costs)
- Verify customer contact information
- Ensure dates are correct
- Review before saving

**Completeness**:
- Fill in all required fields
- Add optional information when available
- Include lead source for every project
- Add descriptions to support tickets

**Timeliness**:
- Enter leads immediately after contact
- Update project status promptly
- Create support tickets as soon as issues arise
- Update information regularly

### Customer Relationship Management

**Keep Information Current**:
- Update customer contact details when they change
- Add notes about customer preferences
- Record important conversations in remarks
- Track customer communication history

**Follow Up Regularly**:
- Use project status to track follow-up needs
- Set follow-up dates in support tickets
- Monitor projects that haven't moved forward
- Reach out to leads that are stuck

**Document Everything**:
- Create projects for all leads
- Add remarks for important conversations
- Create support tickets for all customer issues
- Keep project information up to date

### Sales Performance Tracking

**Monitor Your Metrics**:
- Check dashboard daily
- Track your lead conversion rate
- Monitor revenue trends
- Review pipeline value regularly

**Identify Opportunities**:
- Look for leads stuck in one stage
- Identify high-value projects
- Track which lead sources perform best
- Monitor projects at risk

**Plan Your Strategy**:
- Use dashboard data to plan activities
- Focus on high-converting lead sources
- Prioritize high-value projects
- Address at-risk projects quickly

### Working with Other Teams

**Operations Team**:
- Update project status when customer confirms
- Create support tickets for installation issues
- Provide accurate project information
- Communicate customer requirements clearly

**Finance Team**:
- Ensure project values are accurate
- Update project costs when known
- Monitor payment status
- Provide payment-related information when needed

**Administrators**:
- Report access issues immediately
- Request help with system features
- Provide feedback on system usability
- Follow company data entry guidelines

### Common Mistakes to Avoid

**Don't**:
- Wait to enter leads (enter immediately)
- Skip required fields
- Forget to update project status
- Ignore support tickets
- Enter incorrect financial information
- Forget to select lead source
- Leave customer information incomplete

**Do**:
- Enter leads as soon as you get them
- Fill in all required information
- Update status regularly
- Create tickets for all issues
- Verify numbers before saving
- Always select lead source
- Keep customer data current

## Getting Help

### Using Help Features

**Context-Sensitive Help**:
- Press **?** from any page for relevant help
- Help automatically shows information for your current page
- Use this for quick answers

**Help Menu**:
- Click **Help** in the top navigation
- Browse help topics
- Find detailed guides for each feature

**Role-Specific Guides**:
- This guide is specifically for Sales users
- Other guides available in Help section
- Review guides for features you use

### When to Contact Administrator

**Contact Administrator For**:
- Cannot access features you should have
- Need additional permissions
- System errors or technical problems
- Password reset or account issues
- Questions about user roles
- Data access problems

**How to Contact**:
- Use contact information provided by your organization
- Include your name, email, and description of issue
- Provide screenshots if possible
- Explain what you were trying to do

### Training and Support

**If You're New**:
- Review the "First Login" guide
- Read the "Navigation" guide
- Practice with test data
- Ask for training if needed

**Ongoing Support**:
- Use Help (?) for quick questions
- Review help documentation regularly
- Attend training sessions when offered
- Share feedback with administrators

## Summary

As a Sales user, you have access to:
- **Dashboard**: Track your sales performance and metrics
- **Customers**: Create and manage customer information
- **Projects**: Manage leads and projects through their lifecycle
- **Support Tickets**: Track and manage customer service requests

**Key Responsibilities**:
- Create and manage leads
- Update project status as they progress
- Track customer relationships
- Create support tickets for customer issues
- Monitor your sales performance

**Remember**:
- You can only view and edit your own projects
- Update information promptly and accurately
- Use the system to track all customer interactions
- Monitor your dashboard regularly
- Create support tickets for all customer issues

This system is designed to help you succeed. Use it regularly, keep information current, and don't hesitate to ask for help when needed.
