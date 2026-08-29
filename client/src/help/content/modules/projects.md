# Projects Module

## At a glance

| Role | See in list | Edit |
| :-- | :-- | :-- |
| **Sales** | Own projects only | Sales & commercial; not lifecycle / payments |
| **Operations** | Confirmed → Subsidy Credited | Lifecycle + sales & commercial on those |
| **Finance** | All | Payment fields only |
| **Management** | All | View only |
| **Admin** | All | Full |

→ [Roles → Permission matrix](/help/roles#permission-matrix) · [Deal Health](#deal-health-score) · [Key Artifacts](#key-artifacts-module)

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
   - **Segment** (required): **Subsidy** or **Non-Subsidy** (customer type — Residential, Apartment, Commercial — is set on the **Customer** record)
   - **Project Type** (required): EPC Project, Panel Cleaning, Maintenance, Repair, Consulting, Resale, or Other Services
5. Complete **Sales & Commercial Information**:
   - **Lead Source**: Website, Referral, Google, Channel Partner, Digital Marketing, Sales, Management Connect, or Other (additional details required for some options)
   - **System Capacity (kW)**: Enter the DC system size as a **whole number** (integer kW only — e.g. `5`, not `5.5`).
   - **Order Value (₹)**, **Confirmation Date** (required), **Project Status**
   - **Availing Loan/Financing?**: Check if the customer is availing loan/financing. If **Yes**, select **Financing Bank** (required) from the dropdown (e.g. SBI, HDFC Bank, Other). If you select **Other**, enter **Other Bank Name** (required, alphanumeric).
   - **Roof Type** and **System Type** (technical details)
6. If status is **Lost**, enter **Lost Date** and **Reason for Loss** (required).
7. Click **Create**. The project is saved, assigned a Project Number, and you are redirected to the Projects list.

**Inverter Brand** and **Inverter Capacity (kW)** (whole kW) live under **Project Lifecycle** when you **Edit** a project. **Inverter Capacity** **defaults from System Capacity** until you type a different value — change it when the inverter rating differs from the array size.

### Who Can Create Projects

- **Sales** users can create projects for their assigned customers
- **Admin** users can create projects for any customer

**Operations** and **Finance** users do not create projects; they work with projects created by Sales or Admin.

### Required Fields

- **Customer** (must be selected)
- **Segment** and **Project Type**
- **Confirmation Date**

If **Lead Source** is **Referral**, **Channel Partner**, or **Other**, the corresponding detail field (**Referral Name**, **Channel Partner Name**, or **Other Details**) is **required** — marked **\*** on the form and blocked on save if empty (create and update). If **Availing Loan/Financing** is Yes, **Financing Bank** is required; if the bank is **Other**, **Other Bank Name** is required. If status is **Lost**, **Lost Date** and **Reason for Loss** are required.

## Project Status Stages

**Sales** typically update status from Lead through Confirmed Order. **Operations** update status from Installation onward and manage execution milestones. **Finance** can view all statuses but cannot change them.

## Managing Projects

### Status and Lifecycle

- Update **Project Status** as the project progresses. Keep it current so the rest of the team and reports reflect reality.
- **Operations** (and **Admin**) use the **Project Lifecycle** section to record: MNRE Portal Registration Date, DISCOM Feasibility/Registration dates, Installation Completion Date, Completion Report Submission Date, Net Meter Installation Date, Total Project Cost, **Panel Type** (DCR/Non-DCR), **Panel Capacity (W)** (per-panel watts), **Panel Brand**, **Inverter Brand**, and **Inverter Capacity (kW)** (integer kW; defaults from **System Capacity** until overridden on the form).

### Financial Tracking

- **Finance** (and **Admin**) manage **Payment Tracking**: Advance Received, Payment 1–3, and Last Payment (each with amount and date).
- **Total Amount Received**, **Balance Amount**, and **Payment Status** (Pending, Partial, Fully Paid) are calculated automatically.
- Update payments as soon as they are received to keep cash flow and reporting accurate.

### Sales & Commercial

- **Sales**, **Operations**, and **Admin** can **edit** the Sales & Commercial section: **Lead Source**, **Order Value**, **Confirmation Date**, **System Capacity**, **Availing Loan/Financing** (checkbox, financing bank, other bank name when Other), **Roof Type**, **System Type**, and related non-payment financial details (e.g. loan details, incentive eligibility).
- **Finance** and **Management** can **view** Sales & Commercial but cannot edit it.
- Use **Remarks** for internal notes and decisions. Remarks are versioned and visible to users with project access.

### Support Tickets and Documents

- Create **Support Tickets** from the project’s **Support / Service Tickets** section to track customer issues and follow-ups.
- Upload **documents** in **[Key Artifacts](#key-artifacts-module)** on project detail / edit.

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
   - **Pipeline** (status): Lead, Site Survey, Proposal, Confirmed, Installation, Completed, etc.
   - **Customer type**: Residential, Apartment, Commercial (from **Customer Master** — not the same as **Segment**)
   - **Segment**: Subsidy or Non-Subsidy (on the project)
   - **Project Types** (service): EPC, Panel Cleaning, Maintenance, etc.
   - **Payment Status**, **Lead source**, **Ticket status**, **Sales users** (non-Sales), **Has Artifacts**, **Availing Loan**, **Needs review**
4. **Active filters** chips appear under the search bar when anything is applied; click **×** on a chip to remove that slice only.
5. Use **Clear All** to reset search, filters, sort, and dates. Works even when arriving from a dashboard or Zenith chart link.
6. **Admins**: **Export to Excel/CSV** downloads the **same filtered list** (see full Projects help for columns).
7. Sort by creation date, confirmation date, order value, customer name, profitability, system capacity, or **Deal Health Score**. Default is confirmation date (newest first).
8. Click a **project row** or **project number** to open the **Project Detail** page.

Filters are remembered when you navigate to a project and use **Back** to return.

**Needs review** (filter checkbox, list **Review** pill, and detail banner) flags dates, payments, or capacity that do not match the current stage. Full rules, Zenith, My Day, and **Save anyway**: [Needs review (Data Sense)](#needs-review-data-sense).

### Subtotals, payment balance, financing bank, and lead source (list)

- **Subtotals**: Select multiple projects using the checkboxes. The bottom of the list shows subtotals for Order Value, Amount Received, and Outstanding.
- **Payment status (Pending / Partial)** — When there is a **positive outstanding balance**, open a **popover** from the status pill: **hover** on **laptop / mouse**, or **tap** on **touch** (phone or tablet). The card uses the **same dark “Deal Health” look** (navy panel, teal accent for the **₹** balance, short footer note) so it matches the **Deal Health** badge popover on the same page.
- **Financing bank icon** — A small **bank** icon under the salesperson appears only when **Availing Loan/Financing** is **Yes** **and** a **financing bank** is set (dropdown or **Other** name). **Hover** or **tap** the icon for the **full bank name** in the **same popover style** as Deal Health. On mobile, tapping the icon does **not** open the project row (tap outside to dismiss).
- **Lead source column** — From **tablet width** up, each project shows a **color-coded pill** (Website blue, Referral green, Google gold, Channel Partner red, Digital Marketing purple, Sales pink, Management Connect cyan, Other lime). For **Referral**, **Channel Partner**, or **Other**, when a detail name is saved, **hover** or **tap** the pill to see **Referral Name**, **Channel Partner Name**, or **Other Details** in the **same popover style**. Tapping the pill does not open the project row.

### Project Detail Page

The read-only **Individual Project** view groups information into **cards** with a consistent **label / value** layout: on **phones**, each field stacks vertically; from **tablet and desktop** widths, labels and values align in a clear **two-column** row pattern so sections are easier to scan. **Payment Tracking** lists **installments** (Payment 1–3, Last Payment) each in its **own block** with amount and date.

**Your open My Day tasks** — A full-width strip (gold accent) appears **above** Deal Health / Payment / Remarks when you have (or want to add) personal follow-ups **pinned to this project**:

- Lists your **incomplete My Day tasks** for this project only (private to your login).
- **Complete** inline or use **Open My Day** for the full drawer.
- **Quick-add** a follow-up and **Add to My Day** (always pins this project).
- Optional **Log completions to project remarks** — when enabled, marking a task done appends **`[My Day ✓] {task text}`** to **Remarks** below (same permission rules as manual remarks).

The detail page also shows:

- **Needs review** banner when dates, payments, or capacity do not match stage — same rules as the list filter; **Fix →** opens Edit when you can edit. See [Needs review (Data Sense)](#needs-review-data-sense).
- **Customer** information, **Project** and **Sales & Commercial** details (including **System Capacity** in whole kW where set)
- **Project Lifecycle** (execution dates, costs, equipment — including **Panel / Inverter** brands, **Panel Capacity (W)**, and **Inverter Capacity (kW)** when captured)
- **Deal Health Score** (0–100) — full **illustration and calculation tables** are in [Deal Health Score](#deal-health-score) (this help section) (hidden for completed / subsidy-credited / lost projects).
- **Payment Tracking** (status, amounts, balance)
- **Remarks** (versioned history)
- **Support / Service Tickets** (create, view, manage)
- **Key Artifacts** (view, download, manage documents)

From here you can **Edit** the project (within your role’s permissions), open **Proposals (New)** / **Proposal Engine** where your role allows (**Proposal** or **Confirmed** stages; **Sales**, **Management**, **Admin** on dashboard PE buckets), or use **Back** to return to the Projects list.

Full **My Day** behaviour (Hit List pin, CRM suggestions, journal nudges): [Zenith → My Day](/help/zenith#my-day-personal-productivity-drawer).

## Project Information at a Glance

Each project displays:

- **Project Number (SL No)**, **Customer**, **Segment**, **Project Type**
- **Order Value**, **Payment Status**, **Balance**
- **Confirmation Date**, **Financial Year**
- **Project Status**, **Lead Source**
- **Availing Loan/Financing** (Yes/No) and **Financing Bank** when applicable
- **System Capacity**, **Roof Type**, **System Type**
- **Support tickets** (count and status) and **documents** (in Key Artifacts)

## Needs review (Data Sense)

**Needs review** is the in-app name for **Data Sense**: a small set of rules that flag project records whose **dates, payments, or system size** do not match the current stage. It is **not** a new module and it does **not** replace Hit List urgency or Deal Health.

**Who it is for:** **Sales** (own projects), **Management** and **Admin** (team-wide). **Finance** does not see the Zenith card; they still see the **Projects** filter and detail banner when they open a project.

### Where it appears

| Surface | What you see |
| :-- | :-- |
| **Projects** list | **Needs review** filter; active-filter chip; amber **Review** pill on matching rows |
| **Project detail** | Banner with each reason and **Fix →** (Edit) when you can edit |
| **New / Edit Project** | Most flags are reminders only. **Commissioning before confirmation** or **advance greater than order value** opens a warning: **Go back** or **Save anyway** (the save is not rejected) |
| **Zenith → Things needing attention** | Card beside **Today's plan** (Today / KPIs). Count chips filter the card **in place**. **Projects →** opens the list with the same slice. Incomplete **Lost** rows are **not** listed here |
| **Zenith → by salesperson** | **Management** and **Admin** only — counts that open Projects for that person (or unassigned) |
| **Today's plan / My Day** | Suggested follow-ups for the more urgent flags (overdue commissioning, missing confirmation, reversed dates, no/late advance, advance over order, fully paid with a balance) |
| **Smart daily briefing** | A **Needs review** line for Sales, Admin, and Management when the explorer slice has hits |

### What the flags mean

| Flag | Meaning |
| :-- | :-- |
| **Overdue commissioning** | Expected commissioning date is already past and the project is still open (not Completed, Subsidy Credited, or Lost) |
| **Missing confirmation** | Status is Confirmed or later, but confirmation date is empty |
| **Incomplete Lost** | Status is Lost, but lost date and/or reason is missing — on **detail** and when the Projects list includes **Lost**; not on the Zenith attention card |
| **Dates reversed** | Expected commissioning is **before** confirmation — **Save anyway** on save |
| **Confirm date too early** | A confirmation date is set while status is still Lead, Site Survey, or Proposal |
| **Stuck in stage** | Time in the current stage is past Deal Health expected days (Lead 7, Site Survey 14, Proposal 21, Confirmed 30, Under Installation 60, Subsidy submitted 21) |
| **No advance** | Confirmed or later, order value above ₹0, payment still Pending, advance ₹0 |
| **Advance overdue** | Same as no advance, and more than **14 days** after confirmation |
| **Advance over order** | Advance received is greater than order value — **Save anyway** on save |
| **Done, still pending** | Completed or Subsidy Credited, payment still Pending, balance greater than ₹0 |
| **Paid but balance** | Payment status is Fully Paid but outstanding balance is greater than ₹0 |
| **No system size** | Confirmed or later with missing or invalid system capacity (kW) |

Late-stage **panel / inverter brand** gaps stay on the **same** Zenith attention card for Sales, Operations, and Admin — they are lifecycle specs, not Data Sense flags.

**Hit List OVERDUE** still uses past expected commissioning for *what to work today*. **Needs review** is *the record does not add up*. Both can apply to the same deal.

### How to act

1. Open the project (**Open →** or the list row).
2. Read the banner; use **Fix →** if you can edit.
3. Update the date, stage, payment, or capacity — or, only for reversed dates / advance over order, confirm **Save anyway** if the values are intentional.

Related: [Things needing attention](/help/dashboard#things-needing-attention-dashboard) · [Pipeline and Hit List](/help/zenith#pipeline-and-hit-list) · [FAQ](/help/faq#what-is-needs-review)

## Best Practices

1. **Create projects promptly** when a lead converts or an order is confirmed.
2. **Keep status up to date** so pipeline, dashboards, and reports stay accurate.
3. **Enter complete commercial and technical details** at creation and update as needed.
4. **Keep status, dates, and payments consistent** — **Needs review** highlights mismatches; reversed commissioning vs confirmation, or advance above order value, asks you to confirm on save ([Needs review](#needs-review-data-sense)).
5. **Use remarks** for important decisions, handoffs, and context.
6. **Create support tickets** for customer issues and **add follow-ups** regularly.
7. **Upload and categorize documents** clearly so the team can find them easily.
8. **Respect role boundaries**: edit only the sections you are permitted to change.

## Permissions

See [Roles → Permission matrix](/help/roles#permission-matrix). Summary: **Sales** (own projects, commercial fields), **Operations** (gated statuses + lifecycle + commercial), **Finance** (payments), **Management** (view), **Admin** (full; delete Lost).

## Related help

- [Needs review (Data Sense)](#needs-review-data-sense) · [Deal Health](#deal-health-score) · [Key Artifacts](#key-artifacts-module) · [Support Tickets](#support-tickets-module) · [Dashboard](/help/dashboard) · [Zenith](/help/zenith#zenith-command-center)
- Zenith **Things needing attention**: [Today's plan](/help/dashboard#todays-plan-dashboard)
