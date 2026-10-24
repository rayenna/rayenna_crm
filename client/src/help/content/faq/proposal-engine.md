# Proposal Engine

### What is the Proposal Engine?
A companion app for consistent, auditable proposals: **Costing Sheet**, **BOM Sheet**, **ROI Calculator**, and **Proposal**. Integrated with **Projects** and logged in **Audit & Security**. Opens from CRM via **Proposals** on Project detail, or **More → Proposal Engine** for the list (SSO — no extra login).

### How do I open the Proposal Engine for a project?
**Project detail** → yellow **Proposals** (not labelled New) on **Proposal** or **Confirmed**, and on later stages (**Under Installation**, **Completed**, **Completed - Subsidy Credited**, **Lost**) when a proposal is already stored. Opens in a new tab with your CRM login. [Projects → Proposal Engine](/help/modules#proposal-engine).

### How do I open Proposal Engine with no project selected?
**More → Proposal Engine** (desktop) or the same item in the hamburger menu, **above Dashboard (Old)**. Command palette **Go to Proposal Engine** does the same. Lands on PE **Customers / Projects** with nothing pre-selected.

### Why do some stages ask me to confirm before opening?
**Proposal** and **Confirmed** may show a quality warning if project data is incomplete — you can continue or cancel. **Under Installation**, **Completed**, and **Completed - Subsidy Credited** only mention **This is a closed project that is [stage]**. **Lost** shows **This is a Lost Project.**

### Who can use the Proposal Engine?
The **Proposals** button appears for **Sales**, **Operations**, **Management**, **Finance**, and **Admin** on **Proposal** or **Confirmed**, and on later stages when a proposal is already stored (including **Lost**). **Sales** and **Admin** typically create and save all four artifacts; other roles usually **review** in read-only mode inside Proposal Engine. Dashboard **Proposal Engine** card: **Sales**, **Management**, and **Admin**.

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
