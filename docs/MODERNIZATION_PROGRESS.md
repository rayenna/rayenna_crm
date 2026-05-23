# Rayenna CRM — modernization progress

**Purpose:** Resume structural and product-clarity work without re-discovering context.  
**Last updated:** 2026-05-22  
**Status:** **Batch 1** shipped (`09e4838` on `main`) — Customer Master, Projects, Dashboard/Zenith terminology, Support Tickets, help, and list safety net. **Zenith stabilization & performance** shipped May 2026 (`55e4f22` → `400cd9a`). **Batch 2** not started (see [Not started](#not-started-planned)).

---

## Goal

Improve **maintainability**, **terminology consistency**, and **cross-device correctness** while keeping production behaviour predictable on **Render + Vercel** (single API, dual static frontends).

This batch deliberately separated three concepts that were often conflated in UI and docs:

| Term | Field / source | Values (examples) | Used for |
|------|----------------|-------------------|----------|
| **Customer type** | Customer Master `customerType` | Residential, Apartment, Commercial | Donut charts, Zenith drill-downs, Projects **Customer type** filter |
| **Segment** | Project `type` (Prisma `ProjectType`) | Subsidy, Non-Subsidy | Projects **Segment** filter, panel DCR defaults, subsidy workflow |
| **Service type** | Project `projectServiceType` | EPC, Maintenance, … | Operations/commercial classification (unchanged enum) |

Reference commit: `feat(crm): customer contacts, project segment, and dashboard modernization` (`09e4838`).

---

## Completed — Batch 1 (May 2026)

### Data model & migrations

| Item | Location / notes |
|------|------------------|
| **Customer contacts** (JSONB) for Apartment/Commercial multi-contact records | `prisma/migrations/20260521120000_customer_contacts_json/` |
| **Project segment** enum: `RESIDENTIAL_SUBSIDY` / `RESIDENTIAL_NON_SUBSIDY` / `COMMERCIAL_INDUSTRIAL` → `SUBSIDY` / `NON_SUBSIDY` | `prisma/migrations/20260522120000_project_segment_subsidy_non_subsidy/` |
| Schema | `prisma/schema.prisma` — `ProjectType`, `customers.contacts` |

Legacy API values are still accepted in places via `getProjectSegmentLabel()` / mapping helpers.

### Phase 1 — Customer Master

| Item | Path |
|------|------|
| Shared customer type + ID proof rules | `client/src/utils/customerRecord.ts`, `src/utils/customerRecord.ts` |
| Structured contacts editor | `client/src/components/customers/CustomerContactsEditor.tsx` |
| Contacts API normalization | `src/utils/customerContacts.ts` |
| List query helpers | `client/src/utils/customerListQuery.ts` |
| Permissions helper | `client/src/utils/customerPermissions.ts` |
| Google Maps link button | `client/src/components/customers/GoogleMapsIconButton.tsx` |
| Detail skeleton | `client/src/components/customers/CustomerDetailSkeleton.tsx` |
| Form + list UX | `client/src/components/customers/CustomerForm.tsx`, `client/src/pages/CustomerMaster.tsx`, `CustomerDetail.tsx` |
| API routes | `src/routes/customers.ts` |

### Phase 2 — Projects (list, detail, form, export)

| Item | Path |
|------|------|
| **List filter → Prisma `where`** (single source for list + export) | `src/utils/projectsListWhere.ts` |
| Export column mapping | `src/utils/projectsListExport.ts` |
| Segment labels & legacy mapping | `src/utils/projectSegment.ts`, `client/src/utils/projectSegment.ts` |
| Filter chips + export hint | `client/src/components/projects/ProjectsActiveFilterChips.tsx`, `client/src/utils/projectFilterChips.ts` |
| List URL/query sync | `client/src/utils/projectListQuery.ts` |
| Access denied messaging | `client/src/utils/projectAccessMessages.ts`, `ProjectAccessNotice.tsx` |
| Permissions | `client/src/utils/projectPermissions.ts` |
| Detail skeleton | `client/src/components/projects/ProjectDetailSkeleton.tsx` |
| Pages | `client/src/pages/Projects.tsx`, `ProjectDetail.tsx`, `ProjectForm.tsx` |
| Routes refactor (where builder) | `src/routes/projects.ts` |

**Export parity:** Excel/CSV export uses the same filters as the on-screen list (documented on filter chips and in help).

### Phase 3 — Dashboard & Zenith (customer type charts)

| Item | Notes |
|------|--------|
| Chart titles | **Revenue by Customer Type**, **Pipeline by Customer Type** (classic Dashboard + Zenith bodies) |
| Donut component labels | `client/src/components/zenith/SegmentDonut.tsx` (name retained; data = customer type) |
| Dashboard pies | `ProjectValuePieChart.tsx`, `PipelineByCustomerSegmentPieChart.tsx` (file names legacy; slices = customer type) |
| Backend aggregation | `src/utils/customerTypeCharts.ts`, `src/routes/dashboard.ts`, `dashboard-enhanced.ts` |
| Drill-down deep links | `client/src/utils/zenithListProjectsDeepLink.ts`, `zenithChartDrilldown.ts`, `dashboardTileLinks.ts` |
| Forecast KPI tab | `ForecastKPI.tsx` — tab label **Customer type** (was “Segment”) |
| Segment colors | `segmentColors.ts` — keyed by customer type |

### Phase 4 — Support Tickets

| Item | Notes |
|------|--------|
| Unified **Ticket Detail Drawer** (project detail + dashboard) | `client/src/components/supportTickets/TicketDetailDrawer.tsx` |
| Removed duplicate modal | `ViewTicketModal.tsx` deleted |
| Project section: drawer, list error/retry, mobile cards | `SupportTicketsSection.tsx` |
| Dashboard: list error panel, open-ticket toast | `SupportTicketsDashboard.tsx` |
| **Management** can create / follow-up / close (aligned with API) | `client/src/utils/supportTicketPermissions.ts` |

### Phase 5 — Help (in-app)

| Item | Notes |
|------|--------|
| Source of truth | `client/src/help/content/` |
| Built copy served to app | `client/public/help-docs/` (keep in sync when editing help) |
| Updated modules | `zenith/index.md`, `projects.md`, `support-tickets.md`, `dashboard.md`, `customers.md`, `charts-explained.md`, role guides, `training/index.md`, navigation |

User-facing **Help** in the CRM app reads from `public/help-docs/`.

### Phase 6 — Safety net

| Item | Notes |
|------|--------|
| **Vitest** at repo root | `npm test`, `vitest.config.ts` |
| Unit tests (17) | `src/utils/projectsListWhere.test.ts` (14), `projectsListExport.test.ts` (3) |
| `tsconfig.json` | Excludes `*.test.ts` from server build |
| ESLint fix | `MyDayButton.tsx` — removed blocking `no-extra-semi` errors |

---

## Completed — Zenith stability & performance (May 2026)

Work focused on **Zenith** (`/zenith`) after production reports of drawer flicker, hard-refresh blank body, and perceived slowness. Performance audit (DevTools) showed admin dashboard API waits ~0.6–1.1s server-side; Tier C (smaller explorer payload) remains **not started**.

### Commits (newest first)

| Commit | Message | Deploy |
|--------|---------|--------|
| `400cd9a` | `fix(crm): Zenith crash — keep SolarNewsTicker hooks above defer return` | **Frontend only** — hotfix for React #310 |
| `3a8e7ce` | `perf(crm): Zenith Tier B — defer solar news, scoped chart reset, lazy word cloud` | **Frontend only** |
| `fb58d6e` | `perf(crm): Zenith Tier A — cap avg-days query, cache, stable body memo` | **API + frontend** |
| `55e4f22` | `fix(crm): Zenith hard-refresh load race and quick drawer stability` | **Frontend only** |

### Bug fixes

| Issue | Cause | Fix |
|-------|--------|-----|
| Quick drawer opens then closes; console focus errors | `Zenith.tsx` effect cleanup depended on unstable `quickAction` object refs; backdrop received opening click | Stable `closeDrawer` callbacks only; split bfcache vs unmount effects; drawer backdrop 400ms guard; panel `tabIndex={-1}` + safe focus (`QuickActionDrawer`, `FinanceQuickDrawer`, `OperationsQuickDrawer`) |
| Hard refresh → black body under tickers; sometimes forced re-login | Empty offline seed treated as valid → main query skipped fetch; any 401 clears auth | Seed only when `dashboardData != null`; `awaitingFySeedForExec` loading state; `useZenithMainQuery` rejects empty seed |
| Production crash after Tier B deploy (React **#310**) | `SolarNewsTicker` early return before `useEffect` / `useMemo` when `fetchEnabled` was false | All hooks run every render; defer placeholder return moved below hooks |

### Tier A — backend + frontend

| # | Item | Location |
|---|------|----------|
| 1 | Cap Zenith funnel / avg-days project scan | `src/routes/dashboard.ts` — `ZENITH_FUNNEL_METRICS_PROJECT_CAP = 5000` on `computeAvgDaysByProjectStatus` + explorer load |
| 2 | React Query stale window (2 min) for Zenith | `client/src/constants/zenithQueryStale.ts` — `ZENITH_QUERY_STALE_MS = 120_000`; wired in `useZenithMainQuery`, `Zenith.tsx` FY query, `ZenithYourFocus`, role bodies |
| 3 | Stable drawer drill callback (fewer body re-renders) | `Zenith.tsx` passes `onOpenDrawerListMode` only; `ZenithExecutiveBody`, `ZenithFinanceBody`, `ZenithOperationsBody` |

### Tier B — frontend only

| # | Item | Location |
|---|------|----------|
| 4 | Defer Solar News fetch 2s after paint | `SolarNewsTicker.tsx` (`deferLoadMs`), `Zenith.tsx` |
| 7 | Scoped Recharts remount after drawer close | `zenithChartGroups.ts`, `ZenithChartTouchReset.tsx` (`chartGroup`), `useQuickAction.ts` (`chartResetGroup`), `zenithChartResetGroup.ts`, role bodies + `ZenithYourFocus` (`FOCUS`); removed global reset from drawer `wasOpenRef` effects |
| 8 | Word cloud in viewport only | `useInViewOnce.ts`, `CustomerProfitabilityRank.tsx` |

### Not done (performance roadmap)

| Tier | Item | Notes |
|------|------|--------|
| **C** | Shrink Zenith explorer API payload / slimmer DTO | Largest remaining win if Zenith still feels slow after A+B |
| — | Vercel CRM frontend | Confirm same commit as Render when using dual static hosts |

### Verify Zenith after deploy

See [CRM_SMOKE_CHECKLIST.md](./CRM_SMOKE_CHECKLIST.md) §6 (Zenith): hard refresh loads KPIs/charts (not black); chart drill → drawer → close (tooltips clear; only matching chart group remounts); Solar News ~2s after load; profitability word cloud initializes on scroll into view.

---

## Key file map (quick navigation)

```
prisma/
  schema.prisma
  migrations/20260521120000_customer_contacts_json/
  migrations/20260522120000_project_segment_subsidy_non_subsidy/

src/
  routes/customers.ts
  routes/projects.ts          # list/export uses projectsListWhere
  routes/dashboard.ts
  routes/dashboard-enhanced.ts
  utils/projectsListWhere.ts
  utils/projectsListExport.ts
  utils/projectSegment.ts
  utils/customerTypeCharts.ts
  utils/customerContacts.ts

client/src/
  pages/CustomerMaster.tsx | CustomerDetail.tsx
  pages/Projects.tsx | ProjectDetail.tsx | ProjectForm.tsx
  pages/SupportTicketsDashboard.tsx
  components/supportTickets/TicketDetailDrawer.tsx
  components/zenith/Zenith*Body.tsx | SegmentDonut.tsx | ForecastKPI.tsx
  components/zenith/SolarNewsTicker.tsx | ZenithChartTouchReset.tsx
  constants/zenithQueryStale.ts | zenithChartGroups.ts
  hooks/useZenithMainQuery.ts | useQuickAction.ts | useInViewOnce.ts
  utils/zenithChartResetGroup.ts | zenithEvents.ts
  help/content/   → sync to public/help-docs/
```

---

## Not started (planned)

| Item | Scope | Notes |
|------|--------|--------|
| **Split `Projects.tsx`** | Large page → filters table / export / hooks modules | Deferred; list logic partly extracted to utils already |
| **Split `ProjectForm.tsx` / `ProjectDetail.tsx`** | Section components by domain | Lower priority than PE splits |
| **E2E / Playwright** | Critical flows: login, projects filter export, ticket drawer | Optional; unit tests cover `where` builder only today |
| **Rename legacy filenames** | e.g. `PipelineByCustomerSegmentPieChart.tsx` → `*CustomerType*` | Cosmetic; avoid churn unless touching files anyway |
| **Management role doc** | README still says Management is read-only | Update root `README.md` when doing a docs pass |
| **Cloudinary for PE images** | Not CRM | See `docs/pe-image-storage-migration-plan.md` |
| **Zenith Tier C** | Slimmer explorer payload / API | After A+B; see [Completed — Zenith stability & performance](#completed--zenith-stability--performance-may-2026) |

---

## How to verify after any CRM change

```bash
# From repo root
npm test
npx tsc --noEmit

cd client
npm run lint          # 0 errors required; warnings OK
npm run build         # must produce dist/ and dist/404.html
```

Manual regression: [CRM_SMOKE_CHECKLIST.md](./CRM_SMOKE_CHECKLIST.md).

Local dev (authoritative):

| Piece | URL | Start |
|-------|-----|--------|
| API + CRM UI | http://localhost:5173 + :3000 | `npm run dev` from repo root |
| Proposal Engine UI | http://localhost:5174 | `cd proposal-engine/frontend && npm run dev` |

Do **not** set `VITE_API_BASE_URL` locally for CRM when using the Vite proxy to port 3000.

---

## Deploy impact (CRM modernization batches)

| Service | Platform | Redeploy? | Why |
|---------|----------|-----------|-----|
| **CRM API** (Web Service, e.g. `rayenna-crm.onrender.com`) | Render | **Yes** | `src/`, `prisma/` migrations |
| **rayenna-crm-frontend** | Render static (`client/`) | **Yes** | UI + help |
| **rayenna-proposal-engine** | Render static | **No** | Unless `proposal-engine/` changed in same batch |
| **CRM Vercel** (root dir `client`) | Vercel | **Yes** | Same as Render CRM frontend |
| **PE Vercel** | Vercel | **No** | Unless PE paths committed |

**Order:** deploy **backend first** (migrations), then CRM frontend(s). Confirm `VITE_API_BASE_URL` on static hosts matches the live API URL.

---

## Git

CRM-only commits: stage `client/`, `src/`, `prisma/`, root `package.json`, `vitest.config.ts`, `docs/` — **never** `proposal-engine/` in the same commit.

```bash
git diff --cached --name-only
# No line should start with proposal-engine/
```

Commit prefix: `feat(crm):`, `fix(crm):`, `docs(crm):`, etc.

When resuming in Cursor: *“Continue CRM modernization from `docs/MODERNIZATION_PROGRESS.md`.”*

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [CRM_SMOKE_CHECKLIST.md](./CRM_SMOKE_CHECKLIST.md) | Post-deploy manual checks |
| [../VERCEL_PARALLEL_DEPLOYMENT_PLAN.md](../VERCEL_PARALLEL_DEPLOYMENT_PLAN.md) | Render + Vercel env and CORS |
| [../.cursor/rules/rayenna-deploy-neon.mdc](../.cursor/rules/rayenna-deploy-neon.mdc) | Local ports, single API, Neon |
| [../proposal-engine/docs/MODERNIZATION_PROGRESS.md](../proposal-engine/docs/MODERNIZATION_PROGRESS.md) | Proposal Engine (separate product) |

---

## User-facing documentation (May 2026)

In-app **Help** documents:

- Customer type vs project Segment vs service type
- Projects list filters, export parity, project detail/form fields
- Zenith **Customer Type** donuts and forecast **Customer type** tab
- Support Tickets drawer, Management permissions, mobile project ticket list

Edit `client/src/help/content/`, then copy to `client/public/help-docs/` before release.
