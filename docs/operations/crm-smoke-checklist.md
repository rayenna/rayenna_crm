# Rayenna CRM — smoke checklist (post-change / post-deploy)

Use after CRM modernization batches or any change touching `client/`, `src/`, or `prisma/`.

**Prerequisites:** Backend deployed and migrations applied; CRM frontend points at correct `VITE_API_BASE_URL`.

---

## 1. Auth & shell

- [ ] Login with each role you care about (at least Admin, Sales, Operations, Finance, Management).
- [ ] Navigation loads; no blank screen / 404 on refresh on deep routes.
- [ ] Help opens and search finds “Customer type” / “Segment” articles.

---

## 2. Customer Master

- [ ] List loads with filters; create/edit Residential customer (single contact fields).
- [ ] Create or edit **Apartment** or **Commercial** customer — **Contacts** editor: add second contact, save, reload — contacts persist.
- [ ] Customer type badge/label displays correctly on list and detail.
- [ ] ID proof type options change when customer type changes.
- [ ] Google Maps link opens when URL present (if used on your data).

---

## 3. Projects — list & export

- [ ] Projects list loads with default filters for your role.
- [ ] **Segment** filter: Subsidy / Non-Subsidy returns expected rows (not confused with customer type).
- [ ] **Customer type** filter: Residential / Apartment / Commercial works independently of Segment.
- [ ] Active filter chips show; message indicates export uses same filters.
- [ ] Excel and CSV export download; row count roughly matches filtered list.
- [ ] Open project from list → detail loads; back navigation OK.

---

## 4. Projects — detail & form

- [ ] Project detail shows **customer type** (from linked customer), **segment** (Subsidy/Non-Subsidy), **service type** where applicable.
- [ ] Sales & Commercial section shows lead source; access banner if role cannot edit.
- [ ] Edit project: segment and service type save; linked customer panel shows customer type.
- [ ] Role without edit access sees notice, not silent failure.

---

## 5. Dashboard (classic)

- [ ] Role-appropriate dashboard loads (Sales / Ops / Finance / Management).
- [ ] **Revenue by Customer Type** pie: slices Residential / Apartment / Commercial (not Subsidy/Non-Subsidy).
- [ ] **Pipeline by Customer Type** pie (if shown): different totals OK vs revenue pie.
- [ ] Click slice → **Projects** opens with **Customer type** (+ analytics slice) in URL/filters.
- [ ] FY / lead source / stage charts still drill to Projects where documented.

---

## 6. Zenith

- [ ] Zenith loads for executive / finance / operations roles.
- [ ] Donut titles: **Revenue by Customer Type**, **Pipeline by Customer Type**.
- [ ] Click donut slice → Quick Actions drawer list; **Open in Projects →** applies customer type filter.
- [ ] Revenue Forecast widget: **Customer type** tab (not “Segment”) splits weighted pipeline correctly.
- [ ] Date/FY filters still affect chart cohorts.

---

## 7. Support Tickets

- [ ] **Support Tickets** dashboard: list loads; filter by status; error state retry if API down (optional test).
- [ ] Open ticket → **Ticket Detail Drawer** (not old modal); follow-up, close (as permitted role).
- [ ] **Management** user can create ticket and close (if Management account available).
- [ ] Project detail → Support section: table on desktop; **cards on narrow viewport** (resize browser).
- [ ] Same drawer behaviour from project detail and dashboard.
- [ ] Finance role: no create/close where restricted (read-only path).

---

## 8. Cross-device / data (spot check)

- [ ] Save customer contacts or project edit on one browser → visible after login on another (or incognito) for same user.
- [ ] No reliance on stale `localStorage` for CRM master data (PE is separate).

---

## 9. API / migrations (deploy only)

- [ ] Render (or host) logs: `prisma migrate deploy` succeeded on deploy.
- [ ] Existing projects show Subsidy/Non-Subsidy labels (migrated from legacy types).
- [ ] CORS: CRM loads from Render frontend URL and Vercel preview/production URL.

---

## Automated (run locally before push)

```bash
npm test
npx tsc --noEmit
cd client && npm run lint && npm run build
```

---

## If something fails

| Symptom | Likely cause |
|---------|----------------|
| Charts empty after deploy | Backend not redeployed; migration pending |
| Export ≠ list | Filter query mismatch — check `projectsListWhere` |
| 403 on tickets for Management | Frontend permissions out of sync with API |
| CORS error on Vercel | `FRONTEND_URL` / allowed origins on API |
| Wrong slice on Projects click | Confused segment vs customer type URL params |

Log issue with role, URL, and filter chip screenshot. Resume work from [MODERNIZATION_PROGRESS.md](./MODERNIZATION_PROGRESS.md).
