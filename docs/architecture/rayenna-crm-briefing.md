# Rayenna CRM — Briefing Document

**Audience:** Leadership, operations, onboarding, and technical stakeholders  
**Product:** Rayenna Energy CRM — custom CRM and project operations platform for solar EPC  
**Last updated:** June 2026

---

## Executive summary

Rayenna CRM is Rayenna Energy’s **single source of truth** for customers, solar projects, payments, support, and executive reporting. It replaces scattered spreadsheets and disconnected tools with one web application that teams can use from office PCs, shared workstations, and home laptops.

The system is built for a **solar EPC workflow**: lead → site survey → proposal → installation → subsidy/completion → payments and after-sales support. Role-based dashboards give each team the view they need; management gets pipeline, revenue, and profitability analytics through **Dashboard** and **Zenith**.

Rayenna CRM runs as a **modern web app** (no desktop install). Production is hosted on **Render** and **Vercel** (dual frontend for resilience), backed by one **API** and one **PostgreSQL database** (Neon). A separate **Proposal Engine** product shares the same API and database for costing, BOM, ROI, and customer proposals.

---

## What problems it solves

| Challenge | How CRM addresses it |
|-----------|----------------------|
| Customer and project data in silos | **Customer master** linked to **Projects**, documents, payments, and tickets |
| Pipeline visibility | Project status lifecycle, role dashboards, Zenith analytics |
| Payment and profitability tracking | Recorded payments, milestones, Tally export, finance views |
| Accountability | Per-project field history + admin **Audit & Security** (logins, exports, sensitive actions) |
| Support follow-through | **Support tickets** with activities, reminders, and closure audit |
| Cross-device staff | Server-authoritative data; JWT session; no “this PC only” truth |
| Proposal and roof work | Proposal Engine + roof layout modules on shared API (see architecture doc) |

---

## Who uses it

Five roles control access across the application:

| Role | Typical focus |
|------|----------------|
| **Admin** | Users, audit & security, full data access, Tally export |
| **Sales** | Customers, own pipeline/projects, lead source tracking |
| **Operations** | Installations, milestones, site surveys, support tickets |
| **Finance** | Payments, profitability, Tally export |
| **Management** | Dashboards, Zenith, cross-team visibility |

Authentication is **email + password** with **JWT** stored in the browser session. Sessions idle out after **10 minutes** with a warning. Password reset is **admin-initiated** (reset link; no automated email provider in the stack today).

---

## Core modules (CRM UI)

| Module | Route | Purpose |
|--------|-------|---------|
| **Dashboard** | `/dashboard` | Role-specific KPIs, charts, pipeline snapshots |
| **Zenith** | `/zenith` | Executive analytics: deals, finance drawer, word cloud, solar news |
| **Customers** | `/customers` | Customer master: contacts, GPS, type, lead source, linked projects |
| **Projects** | `/projects` | Full project lifecycle, payments, documents, remarks, PE links |
| **Support tickets** | `/support-tickets` | Customer service workflow |
| **My Day** | Global drawer | Personal tasks, journal, reminders (per-user, server-backed) |
| **Tally export** | `/tally-export` | Accounting export (Admin / Finance) |
| **Users** | `/users` | User administration (Admin) |
| **Audit & Security** | `/audit-security` | Security timeline, failed logins, exports (Admin) |
| **Help** | `/help` | In-app documentation; **?** opens context-sensitive topics |

**Proposal Engine** is a **separate frontend** (own URL) used for detailed costing, BOM, ROI, and proposal PDFs. Linked CRM projects sync artifacts through the shared API (`/api/proposal-engine`).

---

## Project lifecycle (business view)

Projects move through defined statuses:

```
LEAD → SITE_SURVEY → PROPOSAL → CONFIRMED → UNDER_INSTALLATION
  → SUBMITTED_FOR_SUBSIDY → COMPLETED / COMPLETED_SUBSIDY_CREDITED
  (or LOST at any stage)
```

Each project ties to a **customer**, optional **lead source**, **payment status** (pending / partial / fully paid), service type (EPC, maintenance, etc.), and subsidy vs non-subsidy type. Documents (contracts, surveys, AI proposals) attach to the project; uploads are stored in **Cloudinary**.

---

## Deployment and operations (non-technical)

| Component | Where it runs | Notes |
|-----------|---------------|-------|
| CRM website | Render **and** Vercel | Same build; two URLs for continuity |
| CRM API | Render Web Service | `rayenna-crm.onrender.com` |
| Database | Neon PostgreSQL | Shared dev/prod discipline; migrations on deploy |
| Files / images | Cloudinary | Documents + roof layout imagery |
| Errors (optional) | Sentry | Backend + frontend when DSN configured |

**Typical release:** push to `main` → Render/Vercel rebuild frontends → API service redeploys → `prisma migrate deploy` on API build. No separate database per environment in current setup.

**Cold start:** Free-tier API may sleep after idle; the UI shows friendly timeout messaging. First request after idle can take ~30–60s.

For technical topology, integrations, and API surface, see **[rayenna-crm-architecture.md](./rayenna-crm-architecture.md)**.

---

## Security and compliance highlights

- **HTTPS** everywhere in production  
- **Helmet** security headers on API  
- **CORS** restricted to known Render/Vercel/local origins  
- **Rate limiting** on login  
- **Audit & Security** (Admin): login trends, failed logins, action timeline, CSV/PDF/signed PDF export  
- **Project field history**: who changed what field on which project  
- **PII-aware Sentry scrubbing** when monitoring is enabled  

---

## Related products in this repository

| Product | Path | Relationship to CRM |
|---------|------|---------------------|
| **Rayenna CRM** | `client/`, `src/`, `prisma/` | This briefing |
| **Proposal Engine** | `proposal-engine/` | Separate UI; shared API + DB |
| **In-app Help** | `client/src/help/` | User-facing docs mirrored to `client/public/help-docs/` |

Git isolation rule: CRM and Proposal Engine changes are committed separately to avoid cross-product contamination.

---

## Local development (quick reference)

| Service | URL | Command |
|---------|-----|---------|
| CRM UI | http://localhost:5173 | `npm run dev` (repo root) |
| API | http://localhost:3000 | Same |
| Proposal Engine UI | http://localhost:5174 | `cd proposal-engine/frontend && npm run dev` |

---

## Document map

| Document | Contents |
|----------|----------|
| **This file** | Business briefing, modules, roles, operations |
| [rayenna-crm-architecture.md](./rayenna-crm-architecture.md) | System diagrams, API map, data model, integrations |
| [crm-smoke-checklist.md](../operations/crm-smoke-checklist.md) | Post-deploy verification |
| [vercel-parallel-deployment-plan.md](../deployment/vercel-parallel-deployment-plan.md) | Dual-frontend deployment |

---

*Rayenna Energy — internal briefing. For end-user guidance, use **Help** inside the application.*
