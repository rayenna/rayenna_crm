# Finance User Guide

## Welcome

This guide is designed specifically for Finance users of Rayenna Energy CRM. It covers everything you need to know to effectively track payments, manage financial data, export to accounting software, and monitor financial performance.

## Your Dashboard

### Overview

Your dashboard provides a comprehensive view of financial metrics and helps you monitor revenue, payments, and outstanding balances.

### Key Metrics

**Top Row Metrics**:
- **Total Revenue**: Combined value of all projects in the system
- **Amount Received**: Total payments received across all projects
- **Outstanding Balance**: Total amount still pending from customers

**Projects by Payment Status**:
- Shows breakdown of projects by payment status:
  - **Pending**: No payments received yet
  - **Partial**: Some payments received, balance remaining
  - **Fully Paid**: All payments received
- Displays count of projects and total outstanding amount for each status

### Charts and Visualizations

- **Project Value and Profit by Financial Year**: See financial performance trends over time
- Visual representation of revenue and profitability
- Helps identify trends and patterns

### Using Dashboard Filters

- Select **Financial Year** to view data for specific periods
- Select **Month** to narrow down to specific months
- Filters help you analyze financial trends and generate reports
- Use filters to compare different time periods

## Payment Tracking

### Understanding Payment Structure

**Payment Milestones**:
Projects can have multiple payment milestones:
- **Advance Payment**: Initial payment received
- **Payment 1**: First milestone payment
- **Payment 2**: Second milestone payment
- **Payment 3**: Third milestone payment
- **Last Payment**: Final payment

**Payment Status**:
- **Pending**: No payments received
- **Partial**: Some payments received, balance remaining
- **Fully Paid**: All payments received

### Viewing Payment Information

**From Project Detail Page**:
1. Navigate to **Projects** page
2. Find the project you want to view
3. Click on the project or click **View**
4. Scroll to **Payment Tracking** section
5. View:
   - Payment status (color-coded badge)
   - Total amount received
   - Balance amount
   - Individual payment amounts and dates

**From Dashboard**:
- View overall payment metrics
- See projects by payment status
- Monitor outstanding balances
- Track payment trends

### Updating Payments

**Who Can Update**:
- Finance users and Administrators can update payments
- Other users can only view payment information

**How to Update**:
1. Navigate to **Projects** page
2. Find the project for which you received payment
3. Click on the project to open detail page
4. Click **Edit** button
5. Scroll to **Payment Tracking** section
6. Enter payment information:
   - **Advance Received**: Enter amount and date
   - **Payment 1**: Enter amount and date (if applicable)
   - **Payment 2**: Enter amount and date (if applicable)
   - **Payment 3**: Enter amount and date (if applicable)
   - **Last Payment**: Enter amount and date (if applicable)
7. Click **Save**

**Important Rules**:
- **Both amount and date required**: If you enter an amount, you must enter the date, and vice versa
- **Cannot enter date without amount**: Date fields require corresponding amount
- **System calculates totals**: Total amount received and balance are calculated automatically
- **Payment status updates automatically**: Status changes based on payments received

### Payment Entry Best Practices

**Accuracy**:
- Enter exact payment amounts received
- Use actual payment dates (not entry dates)
- Double-check amounts before saving
- Verify dates are correct

**Completeness**:
- Enter all payments received
- Don't skip payment milestones
- Update payments promptly when received
- Ensure all payment dates are entered

**Timeliness**:
- Update payments immediately when received
- Don't batch update - enter as payments come in
- Keep payment information current
- Review outstanding balances regularly

### Payment Status Calculation

**How Status is Determined**:
- **Pending**: No payments entered (total received = 0)
- **Partial**: Some payments entered but balance remains (total received < project cost)
- **Fully Paid**: All payments received (total received = project cost)

**Automatic Updates**:
- Status updates automatically when you save payment information
- No need to manually change status
- System calculates based on amounts entered

### Tracking Outstanding Balances

**Viewing Outstanding Balances**:
- **Dashboard**: See total outstanding balance across all projects
- **Project Detail**: See balance for individual project
- **Projects List**: Filter by payment status to see pending/partial projects

**Monitoring Outstanding**:
- Check dashboard daily for total outstanding
- Review projects with "Partial" status
- Identify projects with large outstanding balances
- Follow up on overdue payments

**Best Practices**:
- Review outstanding balances weekly
- Identify projects needing follow-up
- Track payment trends
- Report to management regularly

## Financial Data Management

### Viewing Financial Information

**Project Financials**:
- **Project Value**: Total value of the project
- **Project Cost**: Cost to complete the project
- **Total Amount Received**: Sum of all payments
- **Balance Amount**: Outstanding balance
- **Expected Profit**: Calculated profit (Project Value - Project Cost)
- **Final Profit**: Actual profit after all costs

**Customer Financials**:
- View all projects for a customer
- See total value across customer's projects
- Track payment history
- Monitor outstanding balances

### Financial Reporting

**Dashboard Reports**:
- Total revenue by period
- Payment received trends
- Outstanding balance analysis
- Profitability metrics

**Custom Reports**:
- Filter by Financial Year
- Filter by Month
- Compare periods
- Export data for analysis

### Data Accuracy

**Your Responsibilities**:
- Ensure payment amounts are accurate
- Verify payment dates are correct
- Keep financial data current
- Review data for errors

**Quality Checks**:
- Verify amounts match payment receipts
- Check dates are correct
- Ensure all payments are entered
- Review calculations

## Tally Export

### Understanding Tally Export

Tally export allows you to export financial data from the CRM to Tally accounting software for bookkeeping and financial reporting.

### Accessing Tally Export

**How to Access**:
1. Go to **Tally Export** from the top menu
2. You'll see the export interface
3. Select export type, format, and filters
4. Export the data

**Who Can Export**:
- Finance users and Administrators only
- Export is monitored and requires authorization

### Export Types

**Projects Export**:
- Exports all project financial data
- Includes customer information
- Includes payment details
- Includes project costs and values

**Invoices Export**:
- Exports invoice data
- Includes invoice amounts
- Includes payment information
- Includes customer details

**Payments Export**:
- Exports payment transactions
- Includes payment amounts and dates
- Includes project and customer information
- Includes payment status

### Export Formats

**Excel (.xlsx)**:
- Most commonly used format
- Easy to import into Tally
- Preserves formatting
- Recommended for most users

**CSV (.csv)**:
- Compatible with Tally CSV import
- Simple text format
- Works with various accounting software
- Good for data analysis

**Tally XML**:
- Native Tally format
- Direct import into Tally
- Preserves data structure
- Best for Tally integration

### Exporting Data

**Step-by-Step Process**:
1. Go to **Tally Export** page
2. Select **Export Data Type**:
   - Projects
   - Invoices
   - Payments
3. Select **Export Format**:
   - Excel (.xlsx)
   - CSV (.csv)
   - Tally XML
4. (Optional) Set **Date Filters**:
   - Start Date
   - End Date
5. Click **Export** button
6. Read and accept the export confirmation
7. Click **Yes** to confirm
8. File downloads automatically

**Export Confirmation**:
- You must confirm that:
  - You are authorized to export the data
  - You have management approval
  - You understand data is company property
- Export is monitored and logged

### Importing into Tally

**For Excel/CSV Format**:
1. Open Tally and go to Gateway of Tally
2. Select F11 (Features) → Set "Allow Excel Import" to Yes
3. Go to Gateway of Tally → Import → Excel/CSV
4. Select the exported file
5. Map the columns to Tally fields
6. Complete the import process

**For Tally XML Format**:
1. Open Tally and go to Gateway of Tally
2. Press F11 (Features) → Enable "Import from Tally XML"
3. Go to Gateway of Tally → Import → Tally XML
4. Select the exported XML file
5. Tally will automatically import ledgers/vouchers

### Export Best Practices

**Before Exporting**:
- Verify you have management approval
- Ensure data is current and accurate
- Check date filters are correct
- Confirm export type and format

**After Exporting**:
- Verify file downloaded successfully
- Check file contains expected data
- Store file securely
- Import into Tally promptly

**Security**:
- Export only when authorized
- Store exported files securely
- Don't share exported files
- Follow company data policies

## Viewing Projects and Customers

### Project Access

**What You Can View**:
- All projects in the system
- All project stages (Lead through Completed)
- Financial information for all projects
- Payment details for all projects

**What You Cannot Do**:
- Cannot create new projects
- Cannot edit project details (except payments)
- Cannot delete projects
- Cannot change project status

### Viewing Projects

**From Projects Page**:
1. Go to **Projects** from top menu
2. View all projects in the system
3. Use filters to find specific projects:
   - Filter by status
   - Filter by type
   - Search by customer name or project ID
4. Click on project to view details

**From Project Detail Page**:
- View complete project information
- See financial details
- View payment tracking
- See customer information
- View project lifecycle dates

### Viewing Customers

**From Customers Page**:
1. Go to **Customers** from top menu
2. View all customers in the system
3. Use search to find specific customers
4. Click on customer to view details

**Customer Financial View**:
- See all projects for a customer
- View total project value
- See payment status
- Track outstanding balances

## Workflow Best Practices

### Daily Workflow

**Start of Day**:
1. Check dashboard for financial metrics
2. Review outstanding balances
3. Check for new payments received
4. Review projects by payment status
5. Plan payment updates for the day

**During the Day**:
1. Update payments as they are received
2. Verify payment amounts and dates
3. Review outstanding balances
4. Monitor payment trends
5. Prepare financial reports as needed
6. Export data to Tally when required

**End of Day**:
1. Review all payment updates made
2. Verify dashboard metrics are current
3. Check for any outstanding items
4. Plan next day's activities
5. Ensure all data is accurate

### Payment Update Workflow

**When Payment is Received**:
1. Receive payment notification or receipt
2. Open the project in CRM
3. Click Edit
4. Navigate to Payment Tracking section
5. Enter payment amount and date
6. Save the update
7. Verify status updated correctly
8. Check balance amount is correct

**Payment Verification**:
- Verify amount matches receipt
- Confirm date is correct
- Check payment milestone is appropriate
- Ensure both amount and date are entered
- Review calculated totals

### Monthly Workflow

**Month-End Tasks**:
1. Review all projects for payment updates
2. Verify all payments received are entered
3. Check outstanding balances
4. Generate financial reports
5. Export data to Tally
6. Reconcile with accounting records
7. Report to management

**Monthly Reporting**:
- Total revenue for the month
- Payments received during month
- Outstanding balances
- Projects by payment status
- Financial trends and analysis

### Quarterly Workflow

**Quarter-End Tasks**:
1. Comprehensive financial review
2. Analyze payment trends
3. Review outstanding balances
4. Generate quarterly reports
5. Export comprehensive data
6. Financial analysis and insights
7. Management reporting

### Data Entry Best Practices

**Accuracy**:
- Enter exact payment amounts (no rounding unless necessary)
- Use actual payment dates
- Double-check all entries
- Verify calculations

**Completeness**:
- Enter all payments received
- Don't skip payment milestones
- Ensure dates are entered with amounts
- Keep all information current

**Timeliness**:
- Update payments immediately when received
- Don't delay payment entries
- Keep data current daily
- Review regularly

### Financial Reporting Best Practices

**Regular Reporting**:
- Daily: Review dashboard metrics
- Weekly: Review outstanding balances
- Monthly: Generate monthly reports
- Quarterly: Comprehensive analysis

**Report Preparation**:
- Use dashboard filters for specific periods
- Export data for detailed analysis
- Verify data accuracy before reporting
- Include trends and insights

**Communication**:
- Share reports with management
- Highlight important metrics
- Identify areas needing attention
- Provide financial insights

### Quality Assurance

**Data Verification**:
- Verify payment amounts match receipts
- Check dates are accurate
- Ensure all payments are entered
- Review calculations

**Regular Reviews**:
- Review payment entries weekly
- Check for missing payments
- Verify outstanding balances
- Identify discrepancies

**Error Correction**:
- Correct errors immediately when found
- Verify corrections are accurate
- Document significant corrections
- Review impact of corrections

## Common Tasks

### Updating a Payment

1. Go to Projects page
2. Find the project
3. Click to open project detail
4. Click Edit
5. Scroll to Payment Tracking
6. Enter payment amount and date
7. Click Save
8. Verify update

### Checking Outstanding Balance

1. Go to Dashboard
2. View "Outstanding Balance" metric
3. Or go to Projects page
4. Filter by "Partial" payment status
5. Review individual project balances

### Exporting to Tally

1. Go to Tally Export page
2. Select export type (Projects/Invoices/Payments)
3. Select format (Excel/CSV/Tally XML)
4. Set date filters if needed
5. Click Export
6. Confirm export
7. Download file
8. Import into Tally

### Generating Financial Report

1. Go to Dashboard
2. Select Financial Year filter
3. Select Month filter if needed
4. Review metrics and charts
5. Export data if needed
6. Prepare report

## Troubleshooting

### Payment Not Updating

**Issue**: Payment amount entered but status not updating

**Solutions**:
- Ensure both amount and date are entered
- Check that amount is a valid number
- Verify date is in correct format
- Refresh page and try again
- Contact administrator if issue persists

### Outstanding Balance Incorrect

**Issue**: Outstanding balance doesn't match expected amount

**Solutions**:
- Verify all payments are entered
- Check payment amounts are correct
- Review project cost is accurate
- Calculate manually to verify
- Contact administrator if discrepancy found

### Export Not Working

**Issue**: Export fails or file doesn't download

**Solutions**:
- Check internet connection
- Verify you have authorization
- Try different export format
- Clear browser cache
- Contact administrator if issue persists

### Cannot View Projects

**Issue**: Cannot see projects or financial data

**Solutions**:
- Verify you're logged in as Finance user
- Check your role permissions
- Refresh the page
- Clear browser cache
- Contact administrator

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

### When to Contact Administrator

**Contact Administrator For**:
- Cannot access financial data
- Payment updates not saving
- Export functionality not working
- Data appears incorrect
- Need additional permissions
- Technical issues

**How to Contact**:
- Use contact information provided by your organization
- Include your name, email, and description of issue
- Provide screenshots if possible
- Explain what you were trying to do

## Summary

As a Finance user, you have access to:
- **Dashboard**: Financial metrics and payment status overview
- **Projects**: View all projects and financial information
- **Payment Tracking**: Update payments for all projects
- **Tally Export**: Export financial data to accounting software
- **Customers**: View customer financial information

**Key Responsibilities**:
- Track and update payments
- Monitor outstanding balances
- Export data to Tally
- Generate financial reports
- Ensure data accuracy

**Remember**:
- You can view all projects but only edit payment information
- Update payments immediately when received
- Both amount and date are required for payments
- Export requires management authorization
- Keep financial data accurate and current

This system is designed to help you manage financial data efficiently. Use it regularly, keep information current, and don't hesitate to ask for help when needed.
