# Proposal Engine

### What is the Proposal Engine?
A companion app for consistent, auditable proposals: **Costing Sheet**, **BOM Sheet**, **ROI Calculator**, and **Proposal**. Integrated with **Projects** and logged in **Audit & Security**. Opens from CRM via **Proposals** on Project detail (SSO).

### How do I open the Proposal Engine for a project?
**Project detail** → **Proposals** when status is **Proposal** or **Confirmed**. Opens Proposal Engine in a new tab with your login. [Projects module](/help/modules#projects-module).

### Who can use the Proposal Engine?
The **Proposals** button appears for **Sales**, **Operations**, **Management**, **Finance**, and **Admin** on eligible projects. **Sales** and **Admin** typically create and save all four artifacts; other roles usually **review** in read-only mode inside Proposal Engine. Dashboard **Proposal Engine** card: **Sales**, **Management**, and **Admin**.

### When does a project show as Proposal Ready?
Only when **all four** artifacts are saved in Proposal Engine:

- Costing Sheet  
- BOM Sheet  
- ROI  
- Proposal  

Otherwise CRM shows **Draft** for proposal status on Projects and PE screens.

### Why does my project still show Draft even though I see a proposal?
You may have saved only some artifacts (e.g. Proposal without Costing/BOM/ROI). All **four** must be saved before **Proposal Ready**.

### How are Costing templates shared?
**Save as Template** on the Costing Sheet stores the template on the server for **all Sales and Admin** users — shared across devices and sessions.

### Who can delete Costing templates in Proposal Engine?
**Admin** only. Sales can create and use templates but not delete shared ones.

### Does clicking “Proposals” affect audit logs?
Yes. Opening **Proposals** from Project detail logs **Proposal generated** for that project in [Audit & Security](/help/security#audit-and-security) (**Proposal** entity).
