## Bug & Feature Tracker Excel Template

This repository includes a simple CSV template you can use as a **Bug / Feature / Enhancement tracker** and host in a shared folder.

### 1. Where the template is

- File: `bug_feature_tracker_template.csv`

You can open this directly in **Excel** or **Google Sheets**.

### 2. Recommended column meanings

- **ID**: Unique ID for the item (e.g. `BUG-001`, `FEAT-012`). You can generate this manually or with an Excel formula.
- **Type**: `Bug`, `Feature`, or `Change Request`.
- **Title / Summary**: Short one-line description.
- **Detailed Description**: Steps to reproduce, expected vs actual behaviour, impact, etc.
- **Module / Area**: Part of the CRM affected (e.g. `Leads`, `Projects`, `Dashboard`, `Invoices`, `Customer Master`).
- **Priority**: `Critical`, `High`, `Medium`, `Low`.
- **Severity**: Optional classification such as `S1 - Showstopper`, `S2 - Major`, `S3 - Minor`.
- **Status**: `New`, `In Analysis`, `In Progress`, `On Hold`, `Resolved`, `Closed`, `Rejected`.
- **Reported By**: Person who raised the bug/feature.
- **Assigned To**: Current owner responsible for fixing/implementing.
- **Customer / Project ID**: Reference to the affected customer or project in Rayenna CRM.
- **Date Reported**: When the item was logged.
- **Target Fix Version / Release**: Planned version or sprint (e.g. `v1.0.1`, `Sprint 5`).
- **Due Date**: Target date for resolution.
- **Actual Fix Date**: Date the fix actually went live.
- **Resolution / Notes**: What was done to resolve it; any relevant notes.
- **Verification Status**: `Pending`, `Verified`, or `Reopened`.
- **Comments / Discussion**: Free-form notes and follow-ups.

### 3. Converting CSV into a shared Excel with dropdowns

1. Open `bug_feature_tracker_template.csv` in **Excel**.
2. Save it as an **Excel Workbook**: `File → Save As → Excel Workbook (*.xlsx)`.
3. (Optional but recommended) Add dropdowns via **Data Validation**:
   - Create a hidden sheet called `Lists`.
   - Enter lists in columns, for example:
     - `Lists!A1:A3`: `Bug`, `Feature`, `Change Request`
     - `Lists!B1:B4`: `Critical`, `High`, `Medium`, `Low`
     - `Lists!C1:C7`: `New`, `In Analysis`, `In Progress`, `On Hold`, `Resolved`, `Closed`, `Rejected`
     - `Lists!D1:D3`: `Pending`, `Verified`, `Reopened`
   - Select the cells under **Type**, go to **Data → Data Validation → List**, and point to `=Lists!$A$1:$A$3`.
   - Repeat for **Priority**, **Status**, and **Verification Status` using the appropriate ranges.

### 4. Sharing with your team

1. Upload the `.xlsx` file to your chosen shared location (OneDrive, SharePoint, Google Drive, or a network share).
2. Give your team access and agree on some simple rules:
   - Who can add new rows (bugs/features)?
   - Who is responsible for triage & assignment?
   - When you will review the sheet (e.g. weekly bug review).
3. (Optional) Add a link to this file in the Rayenna CRM UI (e.g. a “Bug & Feature Tracker” menu item pointing to the shared URL) so it’s easy for everyone to find.

