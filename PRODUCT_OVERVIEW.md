# Rayenna CRM – Functional & Architectural Overview

## Functional Overview

**What it is**  
Rayenna CRM is a **CRM and project operations system** for Rayenna Energy, a solar EPC company (mainly India). It covers the full lifecycle: **Lead → Sale → Execution → Subsidy → Payments → Profitability**.

**Who uses it**  
- **Admin** – Full access, user management, master data  
- **Sales** – Leads, customers, commercial details, view payments (read-only)  
- **Operations** – Execution milestones, compliance docs, installation/subsidy tracking  
- **Finance** – Payments, Tally export, profitability view  
- **Management** – Dashboards and reports (read-only)

**Main capabilities**

| Area | What it does |
|------|-------------------------------|
| **Customers** | Customer master (contacts, consumer numbers, address, salesperson). Lead source and type. “My customers” filter for Sales. |
| **Projects** | One project per customer (or more). Status flow: Lead → Site Survey → Proposal → Confirmed → Under Installation → Subsidy → Completed / Lost. Tracks capacity (kW), cost, confirmation date, loan, expected profit. |
| **Execution** | MNRE/KSEB dates, feasibility, registration, installation completion, subsidy request/credited. Panel/inverter brands, site address. |
| **Payments** | Advance, Payment 1–3, Last Payment with dates. Auto total received, balance, payment status (Pending/Partial/Fully Paid). Finance can edit; others read-only. |
| **Documents** | Upload per project (photos, documents, sheets). Stored locally or in Cloudinary. |
| **Remarks** | Internal remarks and notes on projects (e.g. sales-only visibility). |
| **Dashboards** | Role-based: Sales (leads, pipeline, revenue by lead source, value/profit by FY); Operations (pending installation, subsidy); Finance (revenue, received, outstanding, payment status); Management/Admin (all of the above + revenue by salesperson, payment status tile). Filters: FY, quarter, month. YoY metrics where relevant. |
| **Tally export** | Export projects/payments to Excel/XML/JSON for Tally. |
| **Support tickets** | Support ticket list and workflow. |
| **Users & security** | User CRUD (Admin). JWT login, change password, forgot-password flow. Audit log and security/access log (Admin). Rate limiting on login and reset-password. |

**Notable behaviours**  
- **Revenue** in dashboards = confirmed/completed projects only (excludes Lead/Survey/Proposal).  
- **Sl No** on projects is manual sequence (max + 1), kept in sync with DB.  
- **Lost** projects can record lost reason (e.g. lost to competition) and optional lost revenue.  
- **Help** – Markdown-based help sections (getting started, roles, modules, analytics, security, FAQ) loaded from `/help/...` static files.

---

## Architectural Overview

**High-level**  
- **Backend**: Node.js + Express + TypeScript, REST API, JWT auth, Prisma → PostgreSQL.  
- **Frontend**: React + TypeScript, Vite, Tailwind, React Query, React Router.  
- **Storage**: PostgreSQL (Neon or similar), optional Cloudinary for documents.  
- **Deploy**: Backend (e.g. Render), frontend (e.g. Vercel/Render). No Git push of this overview.

### Backend (`/src`)

| Layer | Contents |
|-------|----------|
| **Entry** | `server.ts` – Express app, CORS, JSON/urlencoded, route mount, health (`/health`, `/api/health`), global error handler, Prisma disconnect on exit. Validates `JWT_SECRET`, `DATABASE_URL`; warns if `FRONTEND_URL` missing in production. |
| **Auth** | `middleware/auth.ts` – JWT verify, load user, `authenticate` and `authorize(roles)`. `middleware/rateLimit.ts` – in-memory rate limit by path + IP/user. |
| **Routes** | `auth`, `users`, `customers`, `projects`, `documents`, `remarks`, `dashboard`, `dashboard-enhanced`, `wordcloud`, `salesTeamPerformance`, `tally`, `leads`, `siteSurveys`, `proposals`, `installations`, `invoices`, `amc`, `serviceTickets`, `supportTickets`, `adminAudit`, plus `back end upload handler` for project uploads. APIs under `/api/*`. |
| **Data** | Prisma schema in `/prisma/schema.prisma` – User, Customer, Project, Lead, Document, ProjectRemark, audit/password-reset tables, enums (UserRole, ProjectStatus, PaymentStatus, etc.). Migrations in `/prisma/migrations`. |
| **Utils** | `prisma.ts` (singleton client), `audit`, `auditLogger`, `passwordResetAudit`, `calculations` (payments), `customerId`, `projectLifecycle`, `proposalGenerator`, `pdfGenerator`, `ai` (OpenAI), etc. |

### Frontend (`/client/src`)

| Layer | Contents |
|-------|----------|
| **Entry** | `main.tsx` → `App.tsx` – BrowserRouter, AuthProvider, Toaster, ErrorBoundary, routes. |
| **Routes** | Login, ResetPassword (public); under Layout: Dashboard, CustomerMaster, Projects, ProjectForm, ProjectDetail, Users, AuditSecurity, TallyExport, SupportTicketsDashboard, ChangePassword, Help, About. PrivateRoute enforces auth. |
| **State** | AuthContext (user, login, logout). React Query for server state (dashboard, projects, customers, etc.). |
| **UI** | Layout (sidebar/nav, Help menu), dashboard components (filters, key metrics, role-specific dashboards, charts – Recharts, word cloud). Forms (e.g. React Hook Form), Tailwind. |
| **Help** | Markdown in `/client/public/help/...`, fetched by Help page and rendered (e.g. ReactMarkdown). |

### Security & production

- **Secrets**: Env only (JWT_SECRET, DATABASE_URL, FRONTEND_URL, Cloudinary, OpenAI if used). No secrets in repo.  
- **CORS**: Allowed origins include localhost and production frontend URLs.  
- **Auth**: JWT in `Authorization: Bearer <token>`. Role checks on sensitive routes.  
- **Logging**: Debug logs guarded with `NODE_ENV === 'development'`.  
- **Rate limiting**: Login (e.g. 15/15 min), reset-password (e.g. 5/hour) by IP.

### Data flow (simplified)

1. User logs in → POST `/api/auth/login` → JWT returned → stored (e.g. localStorage) and sent as Bearer on requests.  
2. App loads dashboard/projects/customers via React Query → GET `/api/dashboard/<role>`, `/api/projects`, `/api/customers` with filters.  
3. Project create/update → POST/PATCH `/api/projects` with role-based field rules.  
4. Documents → upload to `/api/documents` or project upload route → stored (Cloudinary or local) and linked to project.  
5. Tally export → GET `/api/tally/...` → Excel/XML/JSON downloaded.

---

*This file is for internal reference. Do not push to Git if you want to keep it local only.*
