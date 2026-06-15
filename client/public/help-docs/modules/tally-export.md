# Tally Export Module

## At a glance

| Role | Access |
| :-- | :-- |
| **Finance** | Full export (Projects, Invoices, Payments) |
| **Admin** | Same as Finance |
| **All other roles** | Menu hidden |

→ [Roles → Permission matrix](/help/roles#permission-matrix) · [Projects payments](#projects-module)

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

## Permissions

**Finance** and **Admin** only. See [Roles → Permission matrix](/help/roles#permission-matrix).

## Related help

- [Finance role guide](/help/roles#finance-role-guide) · [FAQ](/help/faq)
