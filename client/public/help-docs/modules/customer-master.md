# Customer Master Module

## At a glance

| Role | Create | Edit | Export |
| :-- | :-- | :-- | :-- |
| **Sales** | ✓ | Assigned customers only | — |
| **Management** | ✓ | Any customer; reassign salesperson | — |
| **Admin** | ✓ | Any | Excel / CSV |
| **Operations / Finance** | — | View only | — |

→ [Roles → Permission matrix](/help/roles#permission-matrix)

## Purpose

The **Customer Master** (Customers) module is your central database for all customer information. It is the foundation for projects, support, and business operations in the CRM. Every project is linked to a customer—you create or select a customer before creating a project. The module helps you manage contact details, addresses, location mapping, salesperson assignment, and customer–project relationships. Keeping the Customer Master accurate and up to date is essential for effective sales, operations, and customer service.

## Understanding Customer IDs

Each customer is assigned a unique **Customer ID** when created. This ID:

- Is **automatically generated** by the system (sequential, SL No)
- **Cannot be changed** after creation
- Uniquely identifies the customer across the CRM
- Is used when searching for customers, creating projects, and in exports

## Customer type

Every customer has a **Customer type** on the record (not only on projects):

| Type | Use for | Name on form |
|------|---------|----------------|
| **Residential** (default) | Individual homeowners | **Prefix**, **First Name** (required), **Middle Name**, **Last Name** |
| **Apartment** | Housing society / apartment complex | **Society / apartment name** (required) |
| **Commercial** | Business or commercial establishment | **Company name** (required) |

The customer list shows a **type badge** for Apartment and Commercial customers.

## Creating Customers

### From the Customers Page

**Shortcut / deep link:** **Ctrl+Shift+N** (Windows/Linux) or **⌘⇧N** (Mac), or **`/customers?new=1`** after login, opens **Customers** with **New Customer** when your role allows (see [Keyboard shortcuts](/help/getting-started#keyboard-shortcuts)).

1. Navigate to **Customers** from the top menu (Customer Master).
2. Click **New Customer** (top right).
3. Select **Customer type** (Residential, Apartment, or Commercial).
4. Fill in **name** (depends on type — see table above).
5. Enter **address**: Address Line 1 & 2, **Country** (required for state/city), **State**, **City**, **Pin Code**.
6. **Location**: Use the **Map Selector** to set coordinates; they save when you confirm on the map.
7. **Contact information** (depends on type):
   - **Residential**: **Contact Numbers** (at least one required) and optional **Email IDs** on the main form. Use **+ Add Contact Number** / **+ Add E-mail ID** for more.
   - **Apartment** or **Commercial**: Use the **Contacts** section — add one or more people (prefix, first/middle/last name, phones, emails). At least **one phone number** is required across all contacts. There is no separate “contact person” field beside the society/company name.
8. Optional **DISCOM Consumer Number** and **GSTIN** (single field for business types; stored for invoicing and Tally).
9. **Identification**: If you enter **Id Proof#**, choose **Type of Id Proof**. Options depend on customer type:
   - **Residential**: Aadhaar, PAN, Voters Card, DL, Passport, Others
   - **Apartment**: PAN, Society Registration, RERA Registration, Occupancy Certificate
   - **Commercial**: PAN, CIN, TAN
10. **Salesperson** (Management and Admin only): Assign or change the owning sales user.
11. Click **Create**. The system assigns a **Customer ID**.

Phone numbers and emails from all contacts are combined for the customer list, projects, and exports.

### Who Can Create Customers

- **Sales** users can create customers (typically assigned to themselves on save).
- **Management** and **Admin** can create customers and assign any salesperson.
- **Operations** and **Finance** do not create customers from Customer Master; they use customer data via projects and other modules.

### Required Fields

- **Customer type**
- **Residential**: **First Name** and at least one **contact number**
- **Apartment / Commercial**: **Society / company name**, at least one **contact** with a **phone number**, and valid **contacts** entries
- If **Id Proof#** is provided, **Type of Id Proof** is required and must match the customer type
- **Country** before **State**; **State** before **City**

## Managing Customers

### Customer detail page

Click a customer card on the list (or open **`/customers/{id}`**) to view the **customer detail** page. From there:

- **Edit** — when your role allows (see below)
- **Delete** — **Admin** only, and only if the customer has **no projects**
- **Back** — return to the list

### Editing Customers

| Role | Can edit |
|------|----------|
| **Admin** | Any customer |
| **Management** | Any customer |
| **Sales** | Customers where **you are the assigned salesperson** (`salespersonId` matches your user) |

**How to edit**: **Customers** → open the customer → **Edit** → change fields → **Update**. You do not need to be on **My Customers** to edit if you are the assigned salesperson (including when you open the customer by bookmark or direct link).

**Salesperson** on the form can be changed only by **Management** or **Admin**. On the detail page, other roles see the assigned salesperson as read-only text until options load in edit mode.

### My Customers vs All Customers (Sales)

- **My Customers**: Customers **assigned to you** (`salespersonId`). You can edit these when you open their detail page.
- **All Customers**: Full directory (read-only for others’ records). Use this to look up any customer; you cannot edit customers assigned to someone else.

Use the **Filter** radio buttons on the Customers page to switch between **My Customers** and **All Customers**. This filter also applies to **export** (Admin).

### Deleting Customers

- **Admin** only, from the customer **detail** page.
- Customers with existing projects **cannot be deleted**. Remove or reassign projects first.
- Confirm in the warning dialog.

### If the list fails to load

If the customer list cannot reach the server, an error message appears with **Try again** to reload the same search and filters.

## Viewing and Finding Customers

### Customers List

1. Navigate to **Customers** from the top menu.
2. Use the **search bar** for **customer name**, **Customer ID**, or **consumer number** (debounced, case-insensitive).
3. Apply **filters**:
   - **Sales users**: **My Customers** or **All Customers** (radio buttons).
   - **Other users**: **Sales Person** dropdown (one or more). Leave as “All Sales Persons” for everyone.
4. Each card shows **Customer ID**, display name, **type badge** (when not Residential), address, contacts, **project count**, and **Google Maps** when coordinates exist.
5. **Previous** / **Next** — 25 customers per page.

### Customer Information Displayed

- **Customer ID**, display name (residential name, or company/society with primary contact where relevant)
- **Customer type** badge on the list for Apartment / Commercial
- **Address**, **Pin Code**, **Google Maps** (when location set)
- **Contact numbers**, **Email IDs**
- **DISCOM Consumer Number**, company/society name, **GSTIN** when set
- **Project count** badge

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

## Permissions

See [Roles → Permission matrix](/help/roles#permission-matrix). Summary: **Sales** (assigned edit), **Management** (create + edit any + salesperson), **Admin** (full + export), **Operations / Finance** (view).

## Related help

- [Projects module](#projects-module) · [Getting Started → Common actions](/help/getting-started#common-actions-guide) · [FAQ](/help/faq)

---
