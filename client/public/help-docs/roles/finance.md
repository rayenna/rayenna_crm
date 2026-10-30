# Finance Role Guide

You track **money in**: payments received, outstanding balances, and handoff to accounting via **Tally export**. You see **all projects** for financial context but only **edit payment fields**.

## At a glance

| You can | You cannot |
| :-- | :-- |
| View **all projects** and payment status | Create projects or customers |
| **Edit payment amounts and dates** on non-Lost projects | Edit sales, lifecycle, or commercial fields |
| **Finance** dashboard, **Zenith**, and **Reports → Collections & Cash** / **Margin & Mix** | **Support tickets** module |
| **Tally export** (with Admin) | **Users**, **Audit & Security**, or project/customer bulk export |
| Filter projects by **payment status** | Delete records |

→ [Permission matrix](#permission-matrix) · [Modules → Tally Export](/help/modules#tally-export-module)

## Your dashboard

**Typical metrics:** total revenue, amount received, outstanding balance, projects by payment status (pending / partial / fully paid).

**Charts:** revenue and profit by financial year; use FY/month filters for reporting periods.

**Zenith:** finance-oriented KPIs including payment radar and overdue views where configured. [Zenith help](/help/zenith#zenith-command-center)

## Payment tracking

### View payments

1. **Projects** → open a project.  
2. **Payment tracking** section shows status badge, received total, balance, and milestone lines.
3. If **Needs review** appears (for example advance greater than order value), fix the amounts or confirm **Save anyway**. Guide: [Needs review](/help/modules#needs-review-data-sense).

Payment status on the list uses the same **Pending / Partial / Fully paid** logic (and **N/A** when not applicable).

### Record a payment

1. Open project → **Edit**.  
2. Only **Payment tracking** fields are editable for Finance.  
3. Enter **amount and date together** for each milestone (advance, payment 1–3, last payment).  
4. **Save** — totals and status recalculate automatically.

> **Tip:** If amount and date must pair, leaving one blank blocks save — enter both or clear both.

**Who else can edit payments:** **Administrator** only (full form access).

## Project visibility

You see projects in **every status**, including early pipeline and **Lost**, for reporting. You still **cannot** change non-payment fields.

**Proposal Engine:** you can open **Proposals** on Project detail (Proposal / Confirmed, and later stages with stored PE, including **Lost**) to **review** costing, BOM, ROI, and the proposal. Closed stages show a short notice first; **Lost** shows **This is a Lost Project.** **More → Proposal Engine** opens the PE list with no project selected. You do not see the Dashboard **Proposal Engine** card. [Projects → Proposal Engine](/help/modules#proposal-engine)

## Tally export

1. **Tally Export** in the top menu (Finance and Admin only).  
2. Choose period and options per the on-screen form.  
3. Download and import into Tally per your accounting SOP.

Details: [Modules → Tally Export](/help/modules#tally-export-module)

## Customers

**View only** in Customer Master — use project links and exports for financial context. Customer edits go to **Sales** (assigned) or **Management** / **Admin**.

## Support tickets

No menu entry — operational issues stay with **Sales**, **Operations**, or **Management**.

## Exports

- **Tally export** — yes (primary finance export).  
- **Projects Excel/CSV** and **customer export** — **Admin only**.

## Daily rhythm

1. Open **dashboard** / **Zenith** for outstanding and recent receipts.  
2. Check **Reports → Collections & Cash** (confirmed outstanding, aging, loan-stuck) and **Margin & Mix** (missing cost, thin margin). [Reports](/help/modules#reports).  
3. Update **payments** the same day money hits the bank.  
4. Reconcile **partial** vs **fully paid** before month-end.  
5. Run **Tally export** on your schedule.  
6. Flag data issues to **Admin** (wrong order value) or **Sales** (wrong assignment).

## Shortcuts

| Keys | Action |
| :-- | :-- |
| **Ctrl+Shift+C** / **⌘⇧C** | Customers (view) |
| **Ctrl+Shift+P** / **⌘⇧P** | Projects |
| **Ctrl+Shift+Z** / **⌘⇧Z** | Zenith |
| **Ctrl+Shift+M** / **⌘⇧M** | My Day |
| **?** | Context help |

## Getting help

- [Dashboard help](/help/dashboard) — payment status card and filters  
- [Reports → Collections & Cash](/help/modules#collections-cash) · [Margin & Mix](/help/modules#margin-mix)  
- [Modules → Projects](/help/modules#projects-module) — payment fields on the form  
- [Training guide](/help/training) — Finance segment in facilitator outline
